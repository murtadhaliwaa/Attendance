import { NextResponse } from "next/server";
import { requireKioskAuth } from "@/lib/kiosk-auth";
import { prisma } from "@/lib/prisma";
import { getTodayDate } from "@/lib/app-timezone";
import { formatTimeAr } from "@/lib/attendance-utils";
import { MAX_PHOTO_SUBMIT_ATTEMPTS } from "@/lib/photo-attendance-limits";

export async function GET(request: Request) {
  const kioskError = await requireKioskAuth(request);
  if (kioskError) return kioskError;

  const { searchParams } = new URL(request.url);
  const employeeId = searchParams.get("employeeId")?.trim();

  if (!employeeId) {
    return NextResponse.json({ error: "معرف الموظف مطلوب" }, { status: 400 });
  }

  const today = getTodayDate();

  const employee = await prisma.employee.findUnique({
    where: { id: employeeId, isActive: true },
    select: { name: true },
  });

  if (!employee) {
    return NextResponse.json({ error: "الموظف غير موجود" }, { status: 404 });
  }

  const attendance = await prisma.attendance.findUnique({
    where: {
      employeeId_date: { employeeId, date: today },
    },
  });

  const hasCheckIn = !!attendance?.checkIn;
  const hasCheckOut = !!attendance?.checkOut;

  let nextAction: "checkin" | "checkout" | "already_checkin" | "done" =
    "checkin";

  const checkInRetryable =
    attendance?.checkInVerificationStatus === "PENDING" &&
    Math.max(attendance.checkInPhotoAttempts ?? 1, 1) < MAX_PHOTO_SUBMIT_ATTEMPTS;

  const checkOutRetryable =
    attendance?.checkOutVerificationStatus === "PENDING" &&
    Math.max(attendance.checkOutPhotoAttempts ?? 1, 1) < MAX_PHOTO_SUBMIT_ATTEMPTS;

  if (hasCheckOut && attendance?.checkOutVerificationStatus !== "REJECTED") {
    nextAction = checkOutRetryable ? "checkout" : "done";
  } else if (!hasCheckIn || attendance?.checkInVerificationStatus === "REJECTED") {
    // يمكن الحضور أو الانصراف مباشرة
    nextAction = "checkin";
  } else if (checkInRetryable) {
    nextAction = "checkin";
  } else {
    nextAction = "checkout";
  }

  return NextResponse.json({
    hasCheckIn,
    hasCheckOut,
    checkIn: attendance?.checkIn,
    checkOut: attendance?.checkOut,
    checkInTime: attendance?.checkIn ? formatTimeAr(attendance.checkIn) : null,
    checkOutTime: attendance?.checkOut ? formatTimeAr(attendance.checkOut) : null,
    checkInVerificationStatus: attendance?.checkInVerificationStatus ?? null,
    checkOutVerificationStatus: attendance?.checkOutVerificationStatus ?? null,
    checkInPhotoAttempts: attendance?.checkInPhotoAttempts ?? 0,
    checkOutPhotoAttempts: attendance?.checkOutPhotoAttempts ?? 0,
    status: attendance?.status,
    employeeName: employee.name,
    nextAction,
  });
}
