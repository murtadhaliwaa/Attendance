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
  console.log("🗑️  جاري حذف بيانات الموظفين الافتراضية...\n");

  const alerts = await prisma.alert.deleteMany();
  const attendances = await prisma.attendance.deleteMany();
  const employees = await prisma.employee.deleteMany();

  console.log(`   التنبيهات:        ${alerts.count}`);
  console.log(`   سجلات الحضور:     ${attendances.count}`);
  console.log(`   الموظفون:         ${employees.count}`);
  console.log("\n✅ تم الحذف — الأقسام والشفتات وحسابات الإدارة بقيت كما هي");
}

main()
  .catch((error) => {
    console.error("❌ فشل حذف بيانات الموظفين:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
