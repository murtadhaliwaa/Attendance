import { config } from "dotenv";
import path from "path";

const projectRoot = path.resolve(__dirname, "..");

config({ path: path.join(projectRoot, ".env.production.local") });
config({ path: path.join(projectRoot, ".env.local") });
config({ path: path.join(projectRoot, ".env") });

const REQUIRED = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "DATABASE_URL",
  "KIOSK_API_KEY",
] as const;

const RECOMMENDED = [
  "DIRECT_URL",
  "CRON_SECRET",
  "SUPABASE_S3_ACCESS_KEY_ID",
  "SUPABASE_S3_SECRET_ACCESS_KEY",
  "SUPABASE_S3_REGION",
] as const;

const WEAK_DEFAULT = "Admin@123456";

function isPlaceholder(value: string | undefined): boolean {
  if (!value?.trim()) return true;
  return (
    value.includes("your-project") ||
    value.includes("your-anon") ||
    value.includes("change-me")
  );
}

function main() {
  const missing: string[] = [];
  const placeholders: string[] = [];

  for (const key of REQUIRED) {
    const value = process.env[key];
    if (!value?.trim()) missing.push(key);
    else if (isPlaceholder(value)) placeholders.push(key);
  }

  const warnings: string[] = [];
  for (const key of RECOMMENDED) {
    if (!process.env[key]?.trim()) warnings.push(key);
  }

  if (missing.length > 0) {
    console.error("❌ متغيرات مطلوبة ناقصة:");
    missing.forEach((k) => console.error(`   - ${k}`));
    process.exit(1);
  }

  if (placeholders.length > 0) {
    console.error("❌ متغيرات لا تزال بقيم افتراضية:");
    placeholders.forEach((k) => console.error(`   - ${k}`));
    process.exit(1);
  }

  if (warnings.length > 0) {
    console.warn("⚠️  متغيرات مُوصى بها ناقصة:");
    warnings.forEach((k) => console.warn(`   - ${k}`));
  }

  const kioskKey = process.env.KIOSK_API_KEY!;
  if (kioskKey.length < 32) {
    console.warn(
      "⚠️  KIOSK_API_KEY قصيرة — يُفضّل قيمة عشوائية ≥ 32 حرفاً (مثال: openssl rand -hex 32)"
    );
  }

  const cron = process.env.CRON_SECRET?.trim();
  if (!cron) {
    console.warn(
      "⚠️  CRON_SECRET غير مُعد — تنظيف صور الحضور على Vercel لن يعمل في الإنتاج"
    );
  } else if (isPlaceholder(cron) || cron.length < 24) {
    console.warn(
      "⚠️  CRON_SECRET ضعيف أو افتراضي — عيّن سراً طويلاً عشوائياً في Vercel"
    );
  }

  if (!process.env.DIRECT_URL?.trim()) {
    console.warn(
      "⚠️  DIRECT_URL ناقص — prisma migrate deploy على Vercel قد يفشل"
    );
  }

  const hasS3 =
    !!process.env.SUPABASE_S3_ACCESS_KEY_ID?.trim() &&
    !!process.env.SUPABASE_S3_SECRET_ACCESS_KEY?.trim();
  if (hasS3) {
    console.log("   تخزين الصور (S3): ✓");
  } else {
    console.warn(
      "⚠️  مفاتيح S3 غير مكتملة — رفع الصور (المرجعية والحضور) لن يعمل"
    );
  }

  const authPassword = process.env.AUTH_SETUP_PASSWORD?.trim();
  if (!authPassword || authPassword === WEAK_DEFAULT) {
    console.warn(
      `⚠️  غيّر كلمات مرور الإدارة إن كانت ما زالت ${WEAK_DEFAULT} — عيّن AUTH_SETUP_PASSWORD عند الإعداد وجدّد كلمة المرور من Supabase Auth`
    );
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  if (url.includes("[project-ref]")) {
    console.error("❌ NEXT_PUBLIC_SUPABASE_URL غير مُعدّ");
    process.exit(1);
  }

  const db = process.env.DATABASE_URL!;
  if (!db.includes("pgbouncer=true") && db.includes(":6543")) {
    console.warn("⚠️  DATABASE_URL: يُفضّل إضافة ?pgbouncer=true مع منفذ 6543");
  }

  console.log("✅ جميع متغيرات البيئة المطلوبة جاهزة");
  console.log(`   Supabase: ${url}`);
  console.log(`   Database: ${db.includes("supabase.com") ? "Supabase ✓" : "custom"}`);
  console.log(`   Kiosk key: ${kioskKey.slice(0, 8)}…`);
  console.log(
    "   تذكير: الكشك للشبكة الداخلية فقط — لا تنشر /kiosk على الإنترنت العام"
  );
}

main();
