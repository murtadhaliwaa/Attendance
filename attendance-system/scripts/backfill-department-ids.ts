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
  throw new Error("DATABASE_URL أو DIRECT_URL غير مُعد");
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function ensureDepartmentExists(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return;

  const existing = await prisma.department.findFirst({
    where: { name: { equals: trimmed, mode: "insensitive" } },
  });
  if (existing) return;

  await prisma.department.create({ data: { name: trimmed } });
}

async function main() {
  console.log("ربط departmentId من أسماء الأقسام الحالية...\n");

  const employees = await prisma.employee.findMany({
    select: { id: true, department: true, departmentId: true },
  });

  let updated = 0;

  for (const employee of employees) {
    if (employee.departmentId) continue;

    const name = employee.department?.trim() || "عام";
    await ensureDepartmentExists(name);

    const dept = await prisma.department.findFirst({
      where: { name: { equals: name, mode: "insensitive" } },
      select: { id: true, name: true },
    });

    if (!dept) continue;

    await prisma.employee.update({
      where: { id: employee.id },
      data: {
        departmentId: dept.id,
        department: dept.name,
      },
    });
    updated += 1;
  }

  console.log(`✅ تم تحديث ${updated} موظف من ${employees.length}`);
}

main()
  .catch((error) => {
    console.error("❌ فشل الربط:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
