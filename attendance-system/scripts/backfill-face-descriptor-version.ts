import { config } from "dotenv";
import path from "path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";

const projectRoot = path.resolve(__dirname, "..");
config({ path: path.join(projectRoot, ".env.local") });
config({ path: path.join(projectRoot, ".env") });

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const v1 = await prisma.$executeRaw`
    UPDATE "Employee"
    SET "faceDescriptorVersion" = 1
    WHERE cardinality("faceDescriptor") = 128
      AND "hasFaceRegistered" = true
  `;

  const v2 = await prisma.$executeRaw`
    UPDATE "Employee"
    SET "faceDescriptorVersion" = 2
    WHERE cardinality("faceDescriptor") = 1024
      AND "hasFaceRegistered" = true
  `;

  console.log(`تم تعيين إصدار v1 لـ ${v1} موظفاً (128-d — يحتاج إعادة تسجيل)`);
  console.log(`تم تعيين إصدار v2 لـ ${v2} موظفاً (1024-d)`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
