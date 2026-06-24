/**
 * اختبار ترحيل Human 1024-d — منطق المطابقة + API الكiosk + قاعدة البيانات
 */
import { config } from "dotenv";
import path from "path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import {
  CURRENT_FACE_DESCRIPTOR_VERSION,
  FACE_DESCRIPTOR_V2_SIZE,
  getDescriptorSize,
} from "../src/lib/face-descriptor-version";
import {
  computeFaceMatchDistance,
  humanMatchDistance,
} from "../src/lib/face-match-distance";
import { getFaceMatchThresholds, selectBestFaceMatch } from "../src/lib/face-match-config";
import { hasRealFaceDescriptor, needsFaceReEnrollment } from "../src/lib/face-descriptor-utils";
import { isValidFaceDescriptor, verifyFaceDescriptor } from "../src/lib/face-verify-server";

const projectRoot = path.resolve(__dirname, "..");
config({ path: path.join(projectRoot, ".env.local") });
config({ path: path.join(projectRoot, ".env") });

const BASE = process.env.TEST_BASE_URL ?? "http://localhost:3000";
const KIOSK_KEY = process.env.KIOSK_API_KEY?.trim() ?? "";

type Check = { name: string; ok: boolean; detail?: string };

const checks: Check[] = [];

function pass(name: string, detail?: string) {
  checks.push({ name, ok: true, detail });
  console.log(`  ✓ ${name}${detail ? ` — ${detail}` : ""}`);
}

function fail(name: string, detail?: string) {
  checks.push({ name, ok: false, detail });
  console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
}

function makeV2Descriptor(seed = 1): number[] {
  const d: number[] = [];
  for (let i = 0; i < FACE_DESCRIPTOR_V2_SIZE; i++) {
    d.push(Math.sin(seed * (i + 1) * 0.017) * 0.5);
  }
  const mag = Math.sqrt(d.reduce((s, v) => s + v * v, 0));
  return d.map((v) => v / mag);
}

function testFaceLogic() {
  console.log("\n[1] منطق بصمة الوجه (1024-d)");

  const a = makeV2Descriptor(1);
  const b = makeV2Descriptor(1);
  const c = a.map((v, i) => (i % 2 === 0 ? -v : v * 0.7));

  if (!isValidFaceDescriptor(a, 2)) {
    fail("isValidFaceDescriptor v2");
  } else {
    pass("isValidFaceDescriptor v2");
  }

  if (isValidFaceDescriptor(a.slice(0, 128), 2)) {
    fail("يرفض 128 عنصراً كـ v2");
  } else {
    pass("يرفض 128 عنصراً كـ v2");
  }

  const selfDist = computeFaceMatchDistance(a, b, 2);
  if (selfDist === null || selfDist > 0.01) {
    fail("مسافة الذات ≈ 0", `حصلت ${selfDist}`);
  } else {
    pass("مسافة الذات ≈ 0", String(selfDist));
  }

  const diffDist = computeFaceMatchDistance(a, c, 2);
  const vectorsDiffer = c.some((v, i) => Math.abs(v - a[i]!) > 1e-6);
  if (!vectorsDiffer) {
    fail("بصمتان اصطناعيتان مختلفتان");
  } else if (diffDist === null) {
    fail("computeFaceMatchDistance يعيد null لبصمات مختلفة");
  } else {
    pass("computeFaceMatchDistance لبصمات مختلفة", String(diffDist.toFixed(4)));
  }

  const thresholds = getFaceMatchThresholds(2);
  const best = selectBestFaceMatch(
    [
      { distance: 0.3, id: "x" },
      { distance: 0.7, id: "y" },
    ],
    "recognize",
    2
  );
  if (!best || best.distance !== 0.3) {
    fail("selectBestFaceMatch v2");
  } else {
    pass("selectBestFaceMatch v2", `عتبة=${thresholds.match}`);
  }

  const identical = humanMatchDistance(a, b);
  pass("humanMatchDistance متسق", `1-sim=${identical.toFixed(4)}`);
}

async function testDatabase() {
  console.log("\n[2] قاعدة البيانات");

  const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!connectionString) {
    fail("DATABASE_URL غير مُعد");
    return;
  }

  const pool = new Pool({ connectionString });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    const column = await prisma.$queryRaw<{ exists: boolean }[]>`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'Employee' AND column_name = 'faceDescriptorVersion'
      ) AS exists
    `;
    if (!column[0]?.exists) {
      fail("عمود faceDescriptorVersion");
    } else {
      pass("عمود faceDescriptorVersion موجود");
    }

    const employees = await prisma.employee.findMany({
      where: { hasFaceRegistered: true },
      select: {
        id: true,
        name: true,
        employeeCode: true,
        faceDescriptor: true,
        faceDescriptorVersion: true,
        hasFaceRegistered: true,
        isActive: true,
      },
    });

    const v1 = employees.filter((e) => e.faceDescriptorVersion === 1);
    const v2 = employees.filter((e) => e.faceDescriptorVersion === 2);
    pass(
      "توزيع الإصدارات",
      `${v2.length} v2 نشط للكiosk، ${v1.length} v1 يحتاج إعادة تسجيل`
    );

    for (const e of employees) {
      const size = e.faceDescriptor.length;
      const expected = getDescriptorSize(e.faceDescriptorVersion);
      if (size !== expected && size > 0) {
        fail(
          `حجم بصمة ${e.employeeCode}`,
          `v${e.faceDescriptorVersion} لكن الطول ${size}`
        );
      }
    }
    pass("أحجام البصمات متوافقة مع الإصدار");

    const needsReEnroll = employees.filter((e) =>
      needsFaceReEnrollment(e.faceDescriptorVersion, e.hasFaceRegistered)
    );
    if (needsReEnroll.length !== v1.length) {
      fail("needsFaceReEnrollment", `توقع ${v1.length} حصل ${needsReEnroll.length}`);
    } else {
      pass("needsFaceReEnrollment", `${needsReEnroll.length} موظف`);
      for (const e of needsReEnroll.slice(0, 3)) {
        console.log(`      → ${e.name} (${e.employeeCode})`);
      }
    }

    for (const e of v2) {
      if (!hasRealFaceDescriptor(e.faceDescriptor, e.faceDescriptorVersion)) {
        fail(`بصمة v2 صالحة: ${e.employeeCode}`);
      }
      if (!verifyFaceDescriptor(e.faceDescriptor, e.faceDescriptor, 2)) {
        fail(`مطابقة ذاتية v2: ${e.employeeCode}`);
      } else {
        pass(`مطابقة ذاتية v2: ${e.name}`);
      }
      const fake = makeV2Descriptor(777);
      if (verifyFaceDescriptor(e.faceDescriptor, fake, 2)) {
        fail(`يرفض بصمة عشوائية: ${e.employeeCode}`);
      } else {
        pass(`يرفض بصمة عشوائية: ${e.employeeCode}`);
      }
    }
    if (v2.length > 0) pass(`${v2.length} موظف v2 جاهز للكiosk`);

    return { v1Count: v1.length, v2Count: v2.length, v2Employees: v2 };
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

async function kioskFetch(path: string, init?: RequestInit) {
  const headers = new Headers(init?.headers);
  if (KIOSK_KEY) headers.set("x-kiosk-key", KIOSK_KEY);
  return fetch(`${BASE}${path}`, { ...init, headers });
}

async function testKioskApi(v2Count: number) {
  console.log("\n[3] API الكiosk (محلي)");

  if (!KIOSK_KEY) {
    fail("KIOSK_API_KEY غير مُعد — تخطي API");
    return;
  }

  for (const route of ["/kiosk/checkin", "/kiosk/checkout", "/kiosk/setup"]) {
    const res = await kioskFetch(route);
    if (res.ok) {
      pass(`صفحة ${route}`, `HTTP ${res.status}`);
    } else {
      fail(`صفحة ${route}`, `HTTP ${res.status}`);
    }
  }

  const descRes = await kioskFetch("/api/employees/descriptors");
  if (!descRes.ok) {
    fail("GET /api/employees/descriptors", `HTTP ${descRes.status}`);
    return;
  }

  const descriptors = (await descRes.json()) as Array<{
    id: string;
    descriptor: number[];
  }>;
  pass("GET descriptors", `${descriptors.length} موظف`);

  if (descriptors.length !== v2Count) {
    fail(
      "عدد descriptors = موظفي v2",
      `توقع ${v2Count} حصل ${descriptors.length}`
    );
  } else {
    pass("فقط موظفو v2 في descriptors");
  }

  for (const row of descriptors) {
    if (row.descriptor.length !== FACE_DESCRIPTOR_V2_SIZE) {
      fail(`طول بصمة ${row.id}`, String(row.descriptor.length));
    }
  }
  if (descriptors.length > 0) pass("كل البصمات 1024-d");

  const fakeV2 = makeV2Descriptor(99);
  const checkRes = await kioskFetch("/api/attendance/checkin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      employeeId: descriptors[0]?.id ?? "invalid",
      descriptor: fakeV2,
    }),
  });
  const checkBody = (await checkRes.json()) as { error?: string };

  if (descriptors.length === 0) {
    pass("checkin بدون موظفي v2", "لا يوجد موظف للاختبار الكامل");
  } else if (checkRes.status === 403) {
    pass("checkin يرفض بصمة مزيفة", checkBody.error ?? "403");
  } else {
    fail("checkin يجب أن يرفض بصمة مزيفة", `HTTP ${checkRes.status}`);
  }

  const badRes = await kioskFetch("/api/attendance/checkin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      employeeId: "x",
      descriptor: new Array(128).fill(0.1),
    }),
  });
  if (badRes.status === 400) {
    pass("checkin يرفض بصمة 128-d");
  } else {
    fail("checkin يرفض بصمة 128-d", `HTTP ${badRes.status}`);
  }

  const noKeyRes = await fetch(`${BASE}/api/employees/descriptors`);
  if (noKeyRes.status === 401 || noKeyRes.status === 403) {
    pass("descriptors محمي بدون مفتاح", `HTTP ${noKeyRes.status}`);
  } else {
    fail("descriptors يجب أن يكون محمياً", `HTTP ${noKeyRes.status}`);
  }
}

async function testHumanModelsLocal() {
  console.log("\n[4] نماذج Human (محلي)");

  const modelDir = path.join(projectRoot, "public", "models", "human");
  const required = ["blazeface", "facemesh", "faceres"];

  for (const name of required) {
    for (const ext of [".json", ".bin"]) {
      const file = path.join(modelDir, `${name}${ext}`);
      try {
        const { access } = await import("fs/promises");
        await access(file);
        pass(`ملف ${name}${ext}`, "موجود");
      } catch {
        fail(`ملف ${name}${ext}`, "غير موجود — شغّل npm run models:download");
      }
    }
  }

  const res = await fetch(`${BASE}/models/human/blazeface.json`);
  if (res.ok) {
    pass("خدمة Next.js تقدّم /models/human/", `HTTP ${res.status}`);
  } else {
    fail("خدمة Next.js تقدّم /models/human/", `HTTP ${res.status}`);
  }
}

async function main() {
  console.log("=== اختبار Human 1024-d ===");
  console.log(`الخادم: ${BASE}`);
  console.log(`إصدار البصمة الحالي: v${CURRENT_FACE_DESCRIPTOR_VERSION}`);

  testFaceLogic();
  const db = await testDatabase();
  await testKioskApi(db?.v2Count ?? 0);
  await testHumanModelsLocal();

  const failed = checks.filter((c) => !c.ok);
  console.log("\n=== النتيجة ===");
  console.log(`${checks.length - failed.length}/${checks.length} نجح`);

  if (failed.length > 0) {
    console.log("\nفشل:");
    for (const c of failed) {
      console.log(`  - ${c.name}: ${c.detail ?? ""}`);
    }
  }

  if ((db?.v1Count ?? 0) > 0 && (db?.v2Count ?? 0) === 0) {
    console.log(
      "\n⚠ لا يوجد موظفون ببصمة v2 بعد — سجّل وجهاً واحداً على الأقل من لوحة التحكم أو الكiosk لاختبار التعرف الحي."
    );
  }

  process.exit(failed.length > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
