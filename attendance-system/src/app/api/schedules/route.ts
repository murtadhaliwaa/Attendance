import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/api-auth";
import { invalidateShiftTimingsCache } from "@/lib/attendance-reconcile";
import { DEFAULT_SHIFT_COUNT, ensureDefaultShifts } from "@/lib/shifts";
import { prisma } from "@/lib/prisma";
import {
  isValidTimeValue,
  parseGraceMinutes,
} from "@/lib/schedule-utils";

export async function GET() {
  const auth = await requirePermission("settings:read");
  if (auth.error) return auth.error;

  try {
    let shifts = await prisma.workSchedule.findMany({
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
      include: { _count: { select: { employees: true } } },
    });

    if (shifts.length < DEFAULT_SHIFT_COUNT) {
      await ensureDefaultShifts(shifts);
      shifts = await prisma.workSchedule.findMany({
        orderBy: [{ isDefault: "desc" }, { name: "asc" }],
        include: { _count: { select: { employees: true } } },
      });
    }

    return NextResponse.json(
      shifts.map((shift) => ({
        id: shift.id,
        name: shift.name,
        startTime: shift.startTime,
        endTime: shift.endTime,
        lateAfter: shift.lateAfter,
        earlyLeaveBefore: shift.earlyLeaveBefore,
        isDefault: shift.isDefault,
        employeeCount: shift._count.employees,
      }))
    );
  } catch (error) {
    console.error("GET /api/schedules:", error);
    return NextResponse.json(
      { error: "فشل تحميل الشفتات" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const auth = await requirePermission("settings:write");
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const name = String(body.name ?? "").trim();
    const startTime = String(body.startTime ?? "").trim();
    const endTime = String(body.endTime ?? "").trim();

    if (!name) {
      return NextResponse.json({ error: "اسم الشفت مطلوب" }, { status: 400 });
    }
    if (!isValidTimeValue(startTime) || !isValidTimeValue(endTime)) {
      return NextResponse.json(
        { error: "صيغة الوقت غير صحيحة. استخدم HH:MM مثل 07:00" },
        { status: 400 }
      );
    }

    const lateAfter = parseGraceMinutes(body.lateAfter ?? 0, "سماح التأخير");
    const earlyLeaveBefore = parseGraceMinutes(
      body.earlyLeaveBefore ?? 0,
      "سماح الانصراف المبكر"
    );

    const existingCount = await prisma.workSchedule.count();
    const isDefault = Boolean(body.isDefault) || existingCount === 0;

    if (isDefault) {
      await prisma.workSchedule.updateMany({ data: { isDefault: false } });
    }

    const created = await prisma.workSchedule.create({
      data: {
        name,
        startTime,
        endTime,
        lateAfter,
        earlyLeaveBefore,
        isDefault,
      },
    });

    invalidateShiftTimingsCache();

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("POST /api/schedules:", error);
    const message =
      error instanceof Error ? error.message : "فشل إنشاء الشفت";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
