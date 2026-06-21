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
  const updated = await prisma.$executeRaw`
    UPDATE "Employee"
    SET "hasFaceRegistered" = true
    WHERE cardinality("faceDescriptor") = 128
      AND "hasFaceRegistered" = false
  `;

  console.log(`تم تحديث ${updated} موظفاً بعلامة hasFaceRegistered`);
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
