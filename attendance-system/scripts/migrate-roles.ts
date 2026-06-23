import { config } from "dotenv";
import { Pool } from "pg";
import path from "path";

const projectRoot = path.resolve(__dirname, "..");
config({ path: path.join(projectRoot, ".env.local") });
config({ path: path.join(projectRoot, ".env") });

async function main() {
  const pool = new Pool({
    connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
  });

  console.log("🔄 ترحيل أدوار المستخدمين...\n");

  await pool.query(`ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'MANAGER'`);
  await pool.query(
    `ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'INQUIRY_CLERK'`
  );

  const managerResult = await pool.query(`
    UPDATE "SystemUser"
    SET role = 'MANAGER'::"Role"
    WHERE role::text IN ('IT_ADMIN', 'HR_MANAGER', 'GENERAL_MANAGER')
       OR email = 'hr@company.com'
  `);
  console.log(`✅ ${managerResult.rowCount ?? 0} مستخدم → MANAGER`);

  await pool.query(`
    INSERT INTO "SystemUser" (id, email, name, role, "isActive", "createdAt", "updatedAt")
    VALUES (
      gen_random_uuid(),
      'inquiry@company.com',
      'فهد العنزي',
      'INQUIRY_CLERK'::"Role",
      true,
      NOW(),
      NOW()
    )
    ON CONFLICT (email) DO UPDATE SET
      name = EXCLUDED.name,
      role = 'INQUIRY_CLERK'::"Role",
      "isActive" = true
  `);
  console.log("✅ inquiry@company.com → INQUIRY_CLERK");

  await pool.query(`
    UPDATE "SystemUser"
    SET "isActive" = false
    WHERE email IN ('ahmed@company.com', 'mohammed@company.com')
  `);
  console.log("✅ تم تعطيل الحسابات القديمة غير المستخدمة");

  await pool.end();
  console.log("\n✅ اكتمل الترحيل — نفّذ prisma db push بعد ذلك");
}

main().catch((error) => {
  console.error("❌", error instanceof Error ? error.message : error);
  process.exit(1);
});
