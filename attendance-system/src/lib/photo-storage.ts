import { createClient } from "@supabase/supabase-js";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Pool } from "pg";

export const PHOTO_BUCKET = "attendance-photos";

const SIGNED_URL_TTL_SEC = 60 * 60;

const globalForS3 = globalThis as unknown as {
  client?: S3Client;
  cacheKey?: string;
};

function projectRefFromUrl(url: string): string {
  const match = url.match(/https:\/\/([^.]+)\.supabase\.co/);
  if (!match) {
    throw new Error("تعذر استخراج معرّف مشروع Supabase من الرابط");
  }
  return match[1]!;
}

function isNewSupabaseSecretKey(key: string): boolean {
  return key.startsWith("sb_secret_");
}

function isLegacyServiceRoleJwt(key: string): boolean {
  return key.startsWith("eyJ");
}

function getStorageConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL غير مُعد");
  }

  const projectRef = projectRefFromUrl(url);
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || null;

  if (hasS3Credentials()) {
    return { url, key, projectRef };
  }

  if (!key) {
    throw new Error(
      "تخزين الصور غير مُعد — أضف مفاتيح S3 (SUPABASE_S3_ACCESS_KEY_ID و SUPABASE_S3_SECRET_ACCESS_KEY) في ملف البيئة"
    );
  }

  return { url, key, projectRef };
}

function hasS3Credentials(): boolean {
  return Boolean(
    process.env.SUPABASE_S3_ACCESS_KEY_ID &&
      process.env.SUPABASE_S3_SECRET_ACCESS_KEY
  );
}

function getS3Client(projectRef: string): S3Client {
  const accessKeyId = process.env.SUPABASE_S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.SUPABASE_S3_SECRET_ACCESS_KEY;
  if (!accessKeyId || !secretAccessKey) {
    throw new Error(
      "مفاتيح S3 غير مُعدّة — من Supabase → Storage → S3 Access Keys أنشئ مفتاحاً وأضف SUPABASE_S3_ACCESS_KEY_ID و SUPABASE_S3_SECRET_ACCESS_KEY في .env.local"
    );
  }

  const region = process.env.SUPABASE_S3_REGION?.trim() || "eu-central-1";
  const cacheKey = `${projectRef}:${region}:${accessKeyId}`;

  // إعادة استخدام العميل عبر الطلبات يقلّل تأخير الإنشاء على serverless
  if (
    globalForS3.client &&
    globalForS3.cacheKey === cacheKey
  ) {
    return globalForS3.client;
  }

  const client = new S3Client({
    forcePathStyle: true,
    region,
    endpoint: `https://${projectRef}.storage.supabase.co/storage/v1/s3`,
    credentials: { accessKeyId, secretAccessKey },
  });
  globalForS3.client = client;
  globalForS3.cacheKey = cacheKey;
  return client;
}

function getStorageAdmin() {
  const { url, key } = getStorageConfig();

  if (!key) {
    throw new Error(
      "مفاتيح S3 غير مُعدّة — من Supabase → Storage → S3 Access Keys أنشئ مفتاحاً وأضف SUPABASE_S3_ACCESS_KEY_ID و SUPABASE_S3_SECRET_ACCESS_KEY في .env.local"
    );
  }

  if (isNewSupabaseSecretKey(key)) {
    throw new Error(
      "مفتاح sb_secret لا يعمل مباشرة مع Storage REST. أنشئ مفاتيح S3 من Supabase → Storage → S3 Access Keys وأضفها في .env.local"
    );
  }

  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function ensurePhotoBucketViaSql(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL غير مُعد");
  }

  const pool = new Pool({
    connectionString,
    ssl: connectionString.includes("supabase.com")
      ? { rejectUnauthorized: false }
      : undefined,
  });

  try {
    const existing = await pool.query(
      `SELECT id FROM storage.buckets WHERE id = $1`,
      [PHOTO_BUCKET]
    );

    if (existing.rowCount && existing.rowCount > 0) {
      return;
    }

    await pool.query(
      `INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
       VALUES ($1, $1, false, $2, $3::text[])`,
      [PHOTO_BUCKET, 5 * 1024 * 1024, ["image/jpeg", "image/png", "image/webp"]]
    );
  } finally {
    await pool.end();
  }
}

export function parseDataUrlImage(dataUrl: string): {
  buffer: Buffer;
  contentType: string;
} {
  const match = dataUrl.match(/^data:(image\/[a-z+]+);base64,(.+)$/i);
  if (!match) {
    throw new Error("صيغة الصورة غير صالحة");
  }
  const contentType = match[1]!.toLowerCase();
  const buffer = Buffer.from(match[2]!, "base64");
  validateImageBuffer(buffer);
  return { buffer, contentType };
}

export function parseBinaryImage(
  buffer: Buffer,
  contentType: string
): { buffer: Buffer; contentType: string } {
  const normalized = (contentType || "image/jpeg").toLowerCase();
  if (!normalized.startsWith("image/")) {
    throw new Error("صيغة الصورة غير صالحة");
  }
  validateImageBuffer(buffer);
  return { buffer, contentType: normalized };
}

function validateImageBuffer(buffer: Buffer) {
  if (buffer.length < 1024) {
    throw new Error("الصورة صغيرة جداً — أعد الالتقاط");
  }
  if (buffer.length > 5 * 1024 * 1024) {
    throw new Error("حجم الصورة كبير جداً (الحد 5 ميجابايت)");
  }
}

export type PhotoUploadSource =
  | string
  | { buffer: Buffer; contentType: string };

function resolvePhotoSource(source: PhotoUploadSource): {
  buffer: Buffer;
  contentType: string;
} {
  if (typeof source === "string") {
    return parseDataUrlImage(source);
  }
  return parseBinaryImage(source.buffer, source.contentType);
}

function extensionFor(contentType: string): string {
  if (contentType.includes("png")) return "png";
  if (contentType.includes("webp")) return "webp";
  return "jpg";
}

async function uploadViaS3(
  projectRef: string,
  path: string,
  buffer: Buffer,
  contentType: string
): Promise<void> {
  const client = getS3Client(projectRef);
  await client.send(
    new PutObjectCommand({
      Bucket: PHOTO_BUCKET,
      Key: path,
      Body: buffer,
      ContentType: contentType,
    })
  );
}

async function uploadViaSupabaseRest(
  path: string,
  buffer: Buffer,
  contentType: string
): Promise<void> {
  const supabase = getStorageAdmin();
  const { error } = await supabase.storage.from(PHOTO_BUCKET).upload(path, buffer, {
    contentType,
    upsert: false,
  });

  if (error) {
    if (error.message.toLowerCase().includes("signature verification failed")) {
      throw new Error(
        "مفتاح service_role غير متوافق مع مشروعك (توقيع JWT جديد). أنشئ مفاتيح S3 من Supabase → Storage → S3 Access Keys."
      );
    }
    if (error.message.toLowerCase().includes("bucket")) {
      throw new Error(
        "حاوية الصور غير موجودة — شغّل: npm run storage:setup-photos"
      );
    }
    throw new Error(error.message);
  }
}

export async function uploadEmployeePhoto(
  employeeId: string,
  category: "reference" | "checkin" | "checkout",
  source: PhotoUploadSource,
  dateKey?: string
): Promise<string> {
  const { buffer, contentType } = resolvePhotoSource(source);
  const ext = extensionFor(contentType);
  const stamp = Date.now();
  const path =
    category === "reference"
      ? `reference/${employeeId}/${stamp}.${ext}`
      : `attendance/${employeeId}/${dateKey ?? "unknown"}/${category}_${stamp}.${ext}`;

  const { projectRef, key } = getStorageConfig();

  if (hasS3Credentials()) {
    await uploadViaS3(projectRef, path, buffer, contentType);
    return path;
  }

  if (key && isLegacyServiceRoleJwt(key)) {
    await uploadViaSupabaseRest(path, buffer, contentType);
    return path;
  }

  throw new Error(
    "إعداد تخزين الصور غير مكتمل. أضف مفاتيح S3 من Supabase → Storage → S3 Access Keys إلى .env.local"
  );
}

async function getSignedPhotoUrlViaS3(
  projectRef: string,
  path: string
): Promise<string> {
  const client = getS3Client(projectRef);
  return getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: PHOTO_BUCKET, Key: path }),
    { expiresIn: SIGNED_URL_TTL_SEC }
  );
}

export async function getSignedPhotoUrl(path: string): Promise<string> {
  const { projectRef } = getStorageConfig();

  if (hasS3Credentials()) {
    return getSignedPhotoUrlViaS3(projectRef, path);
  }

  const supabase = getStorageAdmin();
  const { data, error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SEC);

  if (error || !data?.signedUrl) {
    if (error?.message?.toLowerCase().includes("signature verification failed")) {
      throw new Error(
        "مفتاح service_role غير متوافق — أضف مفاتيح S3 في .env.local"
      );
    }
    throw new Error("تعذر إنشاء رابط الصورة");
  }
  return data.signedUrl;
}

async function deleteViaS3(projectRef: string, path: string): Promise<void> {
  const client = getS3Client(projectRef);
  await client.send(
    new DeleteObjectCommand({
      Bucket: PHOTO_BUCKET,
      Key: path,
    })
  );
}

async function deleteViaSupabaseRest(path: string): Promise<void> {
  const supabase = getStorageAdmin();
  const { error } = await supabase.storage.from(PHOTO_BUCKET).remove([path]);
  if (error) {
    const message = error.message.toLowerCase();
    // الملف غير موجود = نجاح فعلي (سبق حذفه)
    if (message.includes("not found") || message.includes("404")) {
      return;
    }
    throw new Error(error.message);
  }
}

/** حذف ملف صورة من التخزين. لا يحذف الصور المرجعية إذا مُرّر مسارها بالخطأ من منطق التنظيف. */
export async function deleteEmployeePhoto(path: string): Promise<void> {
  const cleaned = path.trim();
  if (!cleaned || cleaned.includes("..")) {
    throw new Error("مسار الصورة غير صالح");
  }

  const { projectRef, key } = getStorageConfig();

  if (hasS3Credentials()) {
    await deleteViaS3(projectRef, cleaned);
    return;
  }

  if (key && isLegacyServiceRoleJwt(key)) {
    await deleteViaSupabaseRest(cleaned);
    return;
  }

  throw new Error(
    "إعداد تخزين الصور غير مكتمل. أضف مفاتيح S3 من Supabase → Storage → S3 Access Keys إلى .env.local"
  );
}

export async function ensurePhotoBucket(): Promise<void> {
  await ensurePhotoBucketViaSql();
}
