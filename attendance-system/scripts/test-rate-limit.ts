/**
 * اختبار حدّ المعدّل المدعوم بقاعدة البيانات (serverless-safe).
 * يستدعي checkRateLimit مباشرة دون طبقة HTTP أو مفتاح الكشك.
 */
import { config } from "dotenv";
import path from "path";

const projectRoot = path.resolve(__dirname, "..");
config({ path: path.join(projectRoot, ".env.local") });
config({ path: path.join(projectRoot, ".env") });

async function main() {
  const { checkRateLimit } = await import("../src/lib/rate-limit");
  const { prisma } = await import("../src/lib/prisma");

  const key = `test:${Date.now()}`;
  const limit = 60;
  const windowMs = 60_000;

  let allowed = 0;
  let blocked = 0;

  for (let i = 0; i < 70; i++) {
    const ok = await checkRateLimit(key, limit, windowMs);
    if (ok) allowed += 1;
    else blocked += 1;
  }

  console.log("=== اختبار حدّ المعدّل (DB) ===");
  console.log(`المفتاح: ${key}`);
  console.log(`الحدّ: ${limit} / دقيقة`);
  console.log(`مسموح: ${allowed} — توقع ${limit}`);
  console.log(`محظور: ${blocked} — توقع ${70 - limit}`);

  const persisted = await prisma.$queryRaw<{ count: number }[]>`
    SELECT "count" FROM "RateLimit" WHERE "key" = ${key}
  `;
  const dbCount = Number(persisted[0]?.count ?? 0);
  console.log(`العدّاد في القاعدة: ${dbCount} (يثبت الاستمرارية عبر serverless)`);

  await prisma.$executeRaw`DELETE FROM "RateLimit" WHERE "key" = ${key}`;

  const pass = allowed === limit && blocked === 70 - limit && dbCount >= limit;
  console.log(pass ? "\n✓ نجح — الحدّ يعمل ويُخزَّن في القاعدة" : "\n✗ فشل");

  await prisma.$disconnect();
  process.exit(pass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
