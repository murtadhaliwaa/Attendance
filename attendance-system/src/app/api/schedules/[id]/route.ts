import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { invalidateShiftTimingsCache } from "@/lib/attendance-reconcile";
import { prisma } from "@/lib/prisma";
import {
  isValidTimeValue,
  parseGraceMinutes,
} from "@/lib/schedule-utils";

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const existing = await prisma.workSchedule.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "الشفت غير موجود" }, { status: 404 });
    }

    const body = await request.json();
    const name = String(body.name ?? existing.name).trim();
    const startTime = String(body.startTime ?? existing.startTime).trim();
    const endTime = String(body.endTime ?? existing.endTime).trim();
    const isDefault =
      body.isDefault !== undefined
        ? Boolean(body.isDefault)
        : existing.isDefault;

    if (!name) {
      return NextResponse.json({ error: "اسم الشفت مطلوب" }, { status: 400 });
    }
    if (!isValidTimeValue(startTime) || !isValidTimeValue(endTime)) {
      return NextResponse.json(
        { error: "صيغة الوقت غير صحيحة. استخدم HH:MM مثل 07:00" },
        { status: 400 }
      );
    }

    const lateAfter = parseGraceMinutes(
      body.lateAfter ?? existing.lateAfter,
      "سماح التأخير"
    );
    const earlyLeaveBefore = parseGraceMinutes(
      body.earlyLeaveBefore ?? existing.earlyLeaveBefore,
      "سماح الانصراف المبكر"
    );

    if (isDefault) {
      await prisma.workSchedule.updateMany({
        where: { id: { not: params.id } },
        data: { isDefault: false },
      });
    }

    const updated = await prisma.workSchedule.update({
      where: { id: params.id },
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

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PUT /api/schedules/[id]:", error);
    const message =
      error instanceof Error ? error.message : "فشل تحديث الشفت";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
