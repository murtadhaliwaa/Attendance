import { config } from "dotenv";
import path from "path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Status } from "@prisma/client";
import { Pool } from "pg";
import { startOfDay } from "date-fns";
import {
  getAttendanceStatus,
  getEffectiveCheckInStatus,
  resolveShiftTiming,
} from "../src/lib/attendance-utils";

config({ path: path.join(process.cwd(), ".env.local") });
config({ path: path.join(process.cwd(), ".env") });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const shifts = await prisma.workSchedule.findMany();
  if (shifts.length === 1 && !shifts[0].isDefault) {
    await prisma.workSchedule.update({
      where: { id: shifts[0].id },
      data: { isDefault: true },
    });
    console.log("Marked single shift as default:", shifts[0].name);
  }

  const defaultShift =
    (await prisma.workSchedule.findFirst({
      where: { isDefault: true },
      select: {
        startTime: true,
        endTime: true,
        lateAfter: true,
        earlyLeaveBefore: true,
      },
    })) ??
    (await prisma.workSchedule.findFirst({
      orderBy: { createdAt: "asc" },
      select: {
        startTime: true,
        endTime: true,
        lateAfter: true,
        earlyLeaveBefore: true,
      },
    }));

  console.log("defaultShift", defaultShift);

  const today = startOfDay(new Date());
  const records = await prisma.attendance.findMany({
    where: { date: today, checkIn: { not: null } },
    include: {
      employee: {
        include: {
          shift: {
            select: {
              startTime: true,
              endTime: true,
              lateAfter: true,
              earlyLeaveBefore: true,
            },
          },
        },
      },
    },
  });

  for (const record of records) {
    if (!record.checkIn) continue;
    const shift = resolveShiftTiming(record.employee.shift, defaultShift);
    if (!shift) continue;

    const nextStatus = getEffectiveCheckInStatus(record.checkIn, shift).status;
    if (nextStatus !== record.status) {
      await prisma.attendance.update({
        where: { id: record.id },
        data: { status: nextStatus },
      });
      console.log(
        `Updated ${record.employee.name}: ${record.status} -> ${nextStatus}`
      );
    }
  }

  const attendance = await prisma.attendance.findMany({
    where: { date: today },
    include: { employee: { select: { name: true } } },
  });
  console.log(
    "attendance after reconcile",
    attendance.map((a) => ({
      name: a.employee.name,
      status: a.status,
      checkIn: a.checkIn?.toISOString(),
    }))
  );
}

main()
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
