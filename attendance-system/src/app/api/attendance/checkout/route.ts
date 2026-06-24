import { NextResponse } from "next/server";
import { Method, Status } from "@prisma/client";
import { requireKioskAuth } from "@/lib/kiosk-auth";
import { prisma } from "@/lib/prisma";
import { getTodayDate } from "@/lib/app-timezone";
import { formatTimeAr, getCheckoutStatus } from "@/lib/attendance-utils";
import { resolveEmployeeShiftAsync } from "@/lib/attendance-shift";
import { employeeShiftSelect } from "@/lib/employee-shift";
import { isValidFaceDescriptor } from "@/lib/face-verify-server";
import { hasRealFaceDescriptor } from "@/lib/face-descriptor-utils";
import { verifyAttendanceFaceMatch } from "@/lib/face-match-employee";

export async function POST(request: Request) {
  const kioskError = await requireKioskAuth(request);
  if (kioskError) return kioskError;

  try {
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

    const existing = await prisma.attendance.findUnique({
      where: { employeeId_date: { employeeId, date: today } },
    });

    if (!existing?.checkIn) {
      return NextResponse.json(
        { error: "لم يتم تسجيل الحضور اليوم" },
        { status: 400 }
      );
    }

    if (existing.checkOut) {
      return NextResponse.json(
        { error: "تم تسجيل الانصراف مسبقاً", checkOut: existing.checkOut },
        { status: 409 }
      );
    }

    const now = new Date();
    let status = existing.status;

    const shift = await resolveEmployeeShiftAsync(employee, existing.checkIn);

    if (shift) {
      const earlyStatus = getCheckoutStatus(now, shift);
      if (earlyStatus === Status.EARLY_LEAVE) {
        status = Status.EARLY_LEAVE;
      }
    }

    const attendance = await prisma.attendance.update({
      where: { id: existing.id },
      data: {
        checkOut: now,
        status,
        method: Method.FACE,
      },
    });

    return NextResponse.json({
      message: `${employee.name} قام بتسجيل الانصراف`,
      employeeName: employee.name,
      action: "checkout",
      time: formatTimeAr(now),
      status: attendance.status,
      department: employee.department,
    });
  } catch (error) {
    console.error("POST /api/attendance/checkout:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء تسجيل الانصراف" },
      { status: 500 }
    );
  }
}
