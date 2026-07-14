import { Method, Status, VerificationStatus, type Prisma } from "@prisma/client";
import { getTodayDate } from "@/lib/app-timezone";
import {
  formatTimeAr,
  getAttendanceStatus,
  getCheckoutStatus,
} from "@/lib/attendance-utils";
import { resolveEmployeeShiftAsync } from "@/lib/attendance-shift";
import { employeeShiftSelect } from "@/lib/employee-shift";
import { deleteEmployeePhoto } from "@/lib/photo-storage";
import { prisma } from "@/lib/prisma";

type EmployeeWithShift = Prisma.EmployeeGetPayload<{
  include: { shift: { select: typeof employeeShiftSelect } };
}>;

export type AdminAttendanceAction =
  | "checkin"
  | "checkout"
  | "clear_checkin"
  | "clear_checkout"
  | "clear_day";

export async function getEmployeeForAttendance(
  employeeId: string
): Promise<EmployeeWithShift | null> {
  return prisma.employee.findUnique({
    where: { id: employeeId, isActive: true },
    include: { shift: { select: employeeShiftSelect } },
  });
}

async function deletePhotosSafe(
  ...paths: Array<string | null | undefined>
) {
  for (const path of paths) {
    if (!path) continue;
    try {
      await deleteEmployeePhoto(path);
    } catch {
      // لا نمنع المسح الإداري إن فشل حذف الملف
    }
  }
}

export async function adminRecordCheckIn(employee: EmployeeWithShift) {
  const today = getTodayDate();
  const now = new Date();

  const existing = await prisma.attendance.findUnique({
    where: { employeeId_date: { employeeId: employee.id, date: today } },
  });

  if (existing?.checkIn) {
    if (existing.checkInVerificationStatus === VerificationStatus.PENDING) {
      throw new AdminAttendanceError(
        "حضور بالصورة بانتظار التأكيد — أكّد/ارفض من المراجعات أو امسح السجل أولاً",
        409
      );
    }
    if (
      existing.checkInVerificationStatus === VerificationStatus.APPROVED ||
      existing.checkInMethod === Method.MANUAL ||
      (existing.checkInMethod &&
        existing.checkInVerificationStatus !== VerificationStatus.REJECTED)
    ) {
      throw new AdminAttendanceError(
        "تم تسجيل الحضور مسبقاً لهذا الموظف اليوم",
        409
      );
    }
    // REJECTED → يُسمح بالتسجيل اليدوي مكانه
  }

  const shift = await resolveEmployeeShiftAsync(employee, now);
  const status = shift
    ? getAttendanceStatus(now, shift.startTime, shift.lateAfter, shift.endTime)
    : Status.PRESENT;

  const previousPhoto = existing?.checkInPhotoUrl;

  const attendance = await prisma.attendance.upsert({
    where: { employeeId_date: { employeeId: employee.id, date: today } },
    create: {
      employeeId: employee.id,
      date: today,
      checkIn: now,
      status,
      checkInMethod: Method.MANUAL,
    },
    update: {
      checkIn: now,
      status,
      checkInMethod: Method.MANUAL,
      checkInPhotoUrl: null,
      checkInPhotoAttempts: 0,
      checkInShiftId: employee.shiftId,
      checkInVerificationStatus: null,
      checkInRejectionReason: null,
      checkInReviewedAt: null,
      checkInReviewedById: null,
      checkInReviewedByName: null,
    },
  });

  await deletePhotosSafe(previousPhoto);

  return {
    message: `تم تسجيل حضور ${employee.name} يدوياً`,
    employeeName: employee.name,
    action: "checkin" as const,
    time: formatTimeAr(now),
    status: attendance.status,
  };
}

export async function adminRecordCheckOut(employee: EmployeeWithShift) {
  const today = getTodayDate();
  const now = new Date();

  const existing = await prisma.attendance.findUnique({
    where: { employeeId_date: { employeeId: employee.id, date: today } },
  });

  if (!existing?.checkIn) {
    throw new AdminAttendanceError("لم يُسجَّل حضور لهذا الموظف اليوم", 400);
  }

  if (
    existing.checkInMethod === Method.PHOTO &&
    existing.checkInVerificationStatus === VerificationStatus.PENDING
  ) {
    throw new AdminAttendanceError(
      "لا يمكن تسجيل انصراف يدوي — حضور الصورة ما زال بانتظار التأكيد",
      400
    );
  }

  if (
    existing.checkInMethod === Method.PHOTO &&
    existing.checkInVerificationStatus === VerificationStatus.REJECTED
  ) {
    throw new AdminAttendanceError(
      "الحضور بالصورة مرفوض — سجّل حضوراً جديداً أولاً",
      400
    );
  }

  if (existing.checkOut) {
    if (existing.checkOutVerificationStatus === VerificationStatus.PENDING) {
      throw new AdminAttendanceError(
        "انصراف بالصورة بانتظار التأكيد — أكّد/ارفض من المراجعات أو امسح الانصراف أولاً",
        409
      );
    }
    if (
      existing.checkOutVerificationStatus === VerificationStatus.APPROVED ||
      existing.checkOutMethod === Method.MANUAL ||
      existing.checkOutVerificationStatus !== VerificationStatus.REJECTED
    ) {
      throw new AdminAttendanceError(
        "تم تسجيل الانصراف مسبقاً لهذا الموظف اليوم",
        409
      );
    }
  }

  let status = existing.status;
  const shift = await resolveEmployeeShiftAsync(employee, existing.checkIn);

  if (shift) {
    const earlyStatus = getCheckoutStatus(now, shift);
    if (earlyStatus === Status.EARLY_LEAVE) {
      status = Status.EARLY_LEAVE;
    }
  }

  const previousPhoto = existing.checkOutPhotoUrl;

  const attendance = await prisma.attendance.update({
    where: { id: existing.id },
    data: {
      checkOut: now,
      status,
      checkOutMethod: Method.MANUAL,
      checkOutPhotoUrl: null,
      checkOutPhotoAttempts: 0,
      checkOutShiftId: employee.shiftId,
      checkOutVerificationStatus: null,
      checkOutRejectionReason: null,
      checkOutReviewedAt: null,
      checkOutReviewedById: null,
      checkOutReviewedByName: null,
    },
  });

  await deletePhotosSafe(previousPhoto);

  return {
    message: `تم تسجيل انصراف ${employee.name} يدوياً`,
    employeeName: employee.name,
    action: "checkout" as const,
    time: formatTimeAr(now),
    status: attendance.status,
  };
}

export async function adminClearCheckIn(employee: EmployeeWithShift) {
  const today = getTodayDate();

  const existing = await prisma.attendance.findUnique({
    where: { employeeId_date: { employeeId: employee.id, date: today } },
  });

  if (!existing?.checkIn) {
    throw new AdminAttendanceError("لا يوجد حضور مسجّل اليوم لهذا الموظف", 400);
  }

  if (existing.checkOut) {
    throw new AdminAttendanceError(
      "لا يمكن مسح الحضور بعد تسجيل الانصراف — امسح الانصراف أولاً",
      400
    );
  }

  await prisma.attendance.delete({ where: { id: existing.id } });
  await deletePhotosSafe(existing.checkInPhotoUrl, existing.checkOutPhotoUrl);

  return {
    message: `تم مسح حضور ${employee.name} لهذا اليوم`,
    employeeName: employee.name,
    action: "clear_checkin" as const,
  };
}

export async function adminClearCheckOut(employee: EmployeeWithShift) {
  const today = getTodayDate();

  const existing = await prisma.attendance.findUnique({
    where: { employeeId_date: { employeeId: employee.id, date: today } },
  });

  if (!existing?.checkOut) {
    throw new AdminAttendanceError("لا يوجد انصراف مسجّل اليوم لهذا الموظف", 400);
  }

  let status: Status = Status.PRESENT;
  if (existing.checkIn) {
    const shift = await resolveEmployeeShiftAsync(employee, existing.checkIn);
    status = shift
      ? getAttendanceStatus(
          existing.checkIn,
          shift.startTime,
          shift.lateAfter,
          shift.endTime
        )
      : Status.PRESENT;
  }

  const previousPhoto = existing.checkOutPhotoUrl;

  await prisma.attendance.update({
    where: { id: existing.id },
    data: {
      checkOut: null,
      checkOutMethod: null,
      checkOutPhotoUrl: null,
      checkOutPhotoAttempts: 0,
      checkOutShiftId: null,
      checkOutVerificationStatus: null,
      checkOutRejectionReason: null,
      checkOutReviewedAt: null,
      checkOutReviewedById: null,
      checkOutReviewedByName: null,
      status,
    },
  });

  await deletePhotosSafe(previousPhoto);

  return {
    message: `تم مسح انصراف ${employee.name} لهذا اليوم`,
    employeeName: employee.name,
    action: "clear_checkout" as const,
  };
}

/** يحذف سجل اليوم بالكامل (حضور وانصراف وصور المراجعة) */
export async function adminClearDay(employee: EmployeeWithShift) {
  const today = getTodayDate();

  const existing = await prisma.attendance.findUnique({
    where: { employeeId_date: { employeeId: employee.id, date: today } },
  });

  if (!existing) {
    throw new AdminAttendanceError("لا يوجد سجل حضور اليوم لهذا الموظف", 400);
  }

  await prisma.attendance.delete({ where: { id: existing.id } });
  await deletePhotosSafe(existing.checkInPhotoUrl, existing.checkOutPhotoUrl);

  return {
    message: `تم مسح سجل ${employee.name} لهذا اليوم بالكامل`,
    employeeName: employee.name,
    action: "clear_day" as const,
  };
}

export class AdminAttendanceError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = "AdminAttendanceError";
  }
}
