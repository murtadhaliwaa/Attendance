import { config } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import path from "path";

const projectRoot = path.resolve(__dirname, "..");
config({ path: path.join(projectRoot, ".env.local") });
config({ path: path.join(projectRoot, ".env") });

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("لم يُعثر على DATABASE_URL أو DIRECT_URL في ملف البيئة");
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🗑️  جاري حذف جميع البيانات من النظام...\n");

  const alerts = await prisma.alert.deleteMany();
  const attendances = await prisma.attendance.deleteMany();
  const employees = await prisma.employee.deleteMany();
  const schedules = await prisma.workSchedule.deleteMany();
  const departments = await prisma.department.deleteMany();
  const users = await prisma.systemUser.deleteMany();

  console.log(`   التنبيهات:        ${alerts.count}`);
  console.log(`   سجلات الحضور:     ${attendances.count}`);
  console.log(`   الموظفون:         ${employees.count}`);
  console.log(`   الشفتات:          ${schedules.count}`);
  console.log(`   الأقسام:          ${departments.count}`);
  console.log(`   مستخدمو النظام:   ${users.count}`);
  console.log("\n✅ تم حذف جميع البيانات بنجاح — النظام فارغ الآن");
}

main()
  .catch((error) => {
    console.error("❌ فشل حذف البيانات:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
