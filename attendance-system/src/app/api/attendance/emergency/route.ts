import { NextResponse } from "next/server";
import { Method, Status } from "@prisma/client";
import { requireKioskAuth } from "@/lib/kiosk-auth";
import { prisma } from "@/lib/prisma";
import { getTodayDate } from "@/lib/app-timezone";
import {
  formatTimeAr,
  getAttendanceStatus,
  getCheckoutStatus,
} from "@/lib/attendance-utils";
import { resolveEmployeeShiftAsync } from "@/lib/attendance-shift";
import { employeeShiftSelect } from "@/lib/employee-shift";
import type { KioskMode } from "@/lib/kiosk-types";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const kioskError = requireKioskAuth(request);
  if (kioskError) return kioskError;

  const clientIp = getClientIp(request);
  if (!checkRateLimit(`emergency:${clientIp}`, 5, 60_000)) {
    return NextResponse.json(
      { error: "محاولات كثيرة — انتظر دقيقة ثم حاول مجدداً" },
      { status: 429 }
    );
  }

  let body: { emergencyCode?: string; mode?: KioskMode };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "بيانات الطلب غير صالحة" }, { status: 400 });
  }

  const emergencyCode = String(body.emergencyCode ?? "").trim();
  const mode = body.mode === "checkout" ? "checkout" : "checkin";

  if (!emergencyCode) {
    return NextResponse.json({ error: "الرمز مطلوب" }, { status: 400 });
  }

  const employee = await prisma.employee.findFirst({
    where: { emergencyCode, isActive: true },
    include: {
      shift: { select: employeeShiftSelect },
    },
  });

  if (!employee) {
    return NextResponse.json({ error: "رمز غير صحيح" }, { status: 404 });
  }

  const today = getTodayDate();
  const now = new Date();

  const existing = await prisma.attendance.findUnique({
    where: { employeeId_date: { employeeId: employee.id, date: today } },
  });

  if (mode === "checkin") {
    if (existing?.checkIn) {
      return NextResponse.json(
        { error: "تم تسجيل الحضور مسبقاً" },
        { status: 409 }
      );
    }

    const shift = await resolveEmployeeShiftAsync(employee, now);
    const status = shift
      ? getAttendanceStatus(now, shift.startTime, shift.lateAfter, shift.endTime)
      : Status.PRESENT;

    await prisma.attendance.upsert({
      where: {
        employeeId_date: { employeeId: employee.id, date: today },
      },
      create: {
        employeeId: employee.id,
        date: today,
        checkIn: now,
        status,
        method: Method.EMERGENCY_CODE,
      },
      update: {
        checkIn: now,
        status,
        method: Method.EMERGENCY_CODE,
      },
    });

    return NextResponse.json({
      message: `مرحباً ${employee.name}، تم تسجيل حضورك`,
      employeeName: employee.name,
      action: "checkin",
      time: formatTimeAr(now),
      status,
      department: employee.department,
    });
  }

  if (!existing?.checkIn) {
    return NextResponse.json(
      { error: "لم يتم تسجيل الحضور اليوم — استخدم كشك الحضور أولاً" },
      { status: 400 }
    );
  }

  if (existing.checkOut) {
    return NextResponse.json(
      { error: "تم تسجيل الانصراف مسبقاً" },
      { status: 409 }
    );
  }

  let status = existing.status;
  const shift = await resolveEmployeeShiftAsync(employee, existing.checkIn);
  if (shift) {
    const earlyStatus = getCheckoutStatus(now, shift);
    if (earlyStatus === Status.EARLY_LEAVE) status = Status.EARLY_LEAVE;
  }

  await prisma.attendance.update({
    where: {
      employeeId_date: { employeeId: employee.id, date: today },
    },
    data: { checkOut: now, status, method: Method.EMERGENCY_CODE },
  });

  return NextResponse.json({
    message: `إلى اللقاء ${employee.name}، تم تسجيل انصرافك`,
    employeeName: employee.name,
    action: "checkout",
    time: formatTimeAr(now),
    status,
    department: employee.department,
  });
}
