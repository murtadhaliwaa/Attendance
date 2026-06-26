import { NextResponse } from "next/server";
import { Method } from "@prisma/client";
import { requireKioskAuth } from "@/lib/kiosk-auth";
import { prisma } from "@/lib/prisma";
import { getTodayDate } from "@/lib/app-timezone";
import { formatTimeAr, getAttendanceStatus } from "@/lib/attendance-utils";
import { resolveEmployeeShiftAsync } from "@/lib/attendance-shift";
import { employeeShiftSelect } from "@/lib/employee-shift";
import { isValidFaceDescriptor } from "@/lib/face-verify-server";
import { hasRealFaceDescriptor } from "@/lib/face-descriptor-utils";
import { verifyAttendanceFaceMatch } from "@/lib/face-match-employee";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const kioskError = await requireKioskAuth(request);
  if (kioskError) return kioskError;

  const clientIp = getClientIp(request);
  if (!(await checkRateLimit(`checkin:${clientIp}`, 60, 60_000))) {
    return NextResponse.json(
      { error: "محاولات كثيرة — انتظر قليلاً ثم حاول مجدداً" },
      { status: 429 }
    );
  }

  let body: { employeeId?: string; descriptor?: number[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "بيانات الطلب غير صالحة" }, { status: 400 });
  }

  const employeeId = String(body.employeeId ?? "").trim();
  const { descriptor } = body;

  if (!employeeId) {
    return NextResponse.json({ error: "معرف الموظف مطلوب" }, { status: 400 });
  }

  if (!isValidFaceDescriptor(descriptor)) {
    return NextResponse.json(
      { error: "بصمة الوجه مطلوبة للتحقق" },
      { status: 400 }
    );
  }

  const employee = await prisma.employee.findUnique({
    where: { id: employeeId, isActive: true },
    include: {
      shift: { select: employeeShiftSelect },
    },
  });

  if (!employee) {
    return NextResponse.json({ error: "الموظف غير موجود" }, { status: 404 });
  }

  if (
    !hasRealFaceDescriptor(
      employee.faceDescriptor,
      employee.faceDescriptorVersion
    )
  ) {
    return NextResponse.json(
      { error: "لم يتم تسجيل وجه هذا الموظف بعد" },
      { status: 400 }
    );
  }

  if (!(await verifyAttendanceFaceMatch(employeeId, descriptor))) {
    return NextResponse.json(
      { error: "فشل التحقق من الوجه" },
      { status: 403 }
    );
  }

  const today = getTodayDate();
  const now = new Date();

  const existing = await prisma.attendance.findUnique({
    where: { employeeId_date: { employeeId, date: today } },
  });

  if (existing?.checkIn) {
    return NextResponse.json(
      { error: "تم تسجيل الحضور مسبقاً", checkIn: existing.checkIn },
      { status: 409 }
    );
  }

  const shift = await resolveEmployeeShiftAsync(employee, now);
  const status = shift
    ? getAttendanceStatus(now, shift.startTime, shift.lateAfter, shift.endTime)
    : "PRESENT";

  const attendance = await prisma.attendance.upsert({
    where: { employeeId_date: { employeeId, date: today } },
    create: {
      employeeId,
      date: today,
      checkIn: now,
      status,
      method: Method.FACE,
    },
    update: {
      checkIn: now,
      status,
      method: Method.FACE,
    },
  });

  return NextResponse.json({
    message: `${employee.name} قام بتسجيل الحضور`,
    employeeName: employee.name,
    action: "checkin",
    time: formatTimeAr(now),
    status: attendance.status,
    department: employee.department,
  });
}
