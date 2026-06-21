import { config } from "dotenv";
import path from "path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { ensureDefaultShifts } from "../src/lib/shifts";

config({ path: path.join(process.cwd(), ".env.local") });
config({ path: path.join(process.cwd(), ".env") });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  await ensureDefaultShifts();
  const shifts = await prisma.workSchedule.findMany({ orderBy: { name: "asc" } });
  console.log("Shifts:", shifts.map((s) => s.name).join(", "));
}

main()
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
