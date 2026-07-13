import { Method, Status, VerificationStatus } from "@prisma/client";
import { getTodayDate, toDateKey } from "@/lib/app-timezone";
import {
  formatTimeAr,
  getAttendanceStatus,
  getCheckoutStatus,
} from "@/lib/attendance-utils";
import { resolveEmployeeShiftAsync } from "@/lib/attendance-shift";
import { employeeShiftSelect } from "@/lib/employee-shift";
import {
  deleteEmployeePhoto,
  uploadEmployeePhoto,
} from "@/lib/photo-storage";
import { prisma } from "@/lib/prisma";
import { MAX_PHOTO_SUBMIT_ATTEMPTS } from "@/lib/photo-attendance-limits";

export { MAX_PHOTO_SUBMIT_ATTEMPTS };

export class PhotoAttendanceError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = "PhotoAttendanceError";
  }
}

async function getEmployeeForPhoto(employeeId: string, shiftId: string) {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId, isActive: true },
    include: {
      shift: { select: employeeShiftSelect },
    },
  });

  if (!employee) {
    throw new PhotoAttendanceError("الموظف غير موجود", 404);
  }

  if (!employee.hasReferencePhoto || !employee.referencePhotoUrl) {
    throw new PhotoAttendanceError(
      "لم تُسجَّل صورة مرجعية لهذا الموظف — راجع مسؤول الاستعلامات",
      400
    );
  }

  const shift = await prisma.workSchedule.findUnique({
    where: { id: shiftId },
    select: employeeShiftSelect,
  });

  if (!shift) {
    throw new PhotoAttendanceError("الشفت المختار غير موجود", 400);
  }

  return { employee, shift };
}

async function replaceStoredPhoto(
  previousPath: string | null | undefined,
  nextPath: string
) {
  if (!previousPath || previousPath === nextPath) return;
  try {
    await deleteEmployeePhoto(previousPath);
  } catch {
    // تجاهل فشل حذف الصورة القديمة — لا يمنع الإرسال الجديد
  }
}

function attemptsMessage(
  eventLabel: string,
  attempt: number
): string {
  const remaining = MAX_PHOTO_SUBMIT_ATTEMPTS - attempt;
  if (remaining <= 0) {
    return `تم إرسال طلب ${eventLabel} (المحاولة ${attempt} من ${MAX_PHOTO_SUBMIT_ATTEMPTS}) — بانتظار التأكيد، ولا يمكن إرسال صورة إضافية`;
  }
  return `تم إرسال طلب ${eventLabel} (المحاولة ${attempt} من ${MAX_PHOTO_SUBMIT_ATTEMPTS}) — يمكنك إعادة الإرسال ${remaining} مرة قبل انتهاء المراجعة`;
}

export async function submitPhotoCheckIn(input: {
  employeeId: string;
  shiftId: string;
  imageDataUrl: string;
}) {
  const { employee, shift } = await getEmployeeForPhoto(
    input.employeeId,
    input.shiftId
  );
  const today = getTodayDate();
  const dateKey = toDateKey(today);
  const now = new Date();

  const existing = await prisma.attendance.findUnique({
    where: { employeeId_date: { employeeId: employee.id, date: today } },
  });

  let nextAttempts = 1;

  if (existing?.checkIn) {
    const verification = existing.checkInVerificationStatus;
    if (verification === VerificationStatus.APPROVED) {
      throw new PhotoAttendanceError("تم تأكيد حضورك لهذا اليوم", 409);
    }
    if (verification === VerificationStatus.PENDING) {
      const used = Math.max(existing.checkInPhotoAttempts, 1);
      if (used >= MAX_PHOTO_SUBMIT_ATTEMPTS) {
        throw new PhotoAttendanceError(
          `وصلت للحد الأقصى (${MAX_PHOTO_SUBMIT_ATTEMPTS} صور) — انتظر مراجعة موظف الاستعلامات`,
          409
        );
      }
      nextAttempts = used + 1;
    }
    // REJECTED أو بدون تحقق → إعادة من المحاولة 1
  }

  const photoPath = await uploadEmployeePhoto(
    employee.id,
    "checkin",
    input.imageDataUrl,
    dateKey
  );

  await replaceStoredPhoto(existing?.checkInPhotoUrl, photoPath);

  const employeeWithShift = { ...employee, shift };
  const resolvedShift = await resolveEmployeeShiftAsync(employeeWithShift, now);
  const status = resolvedShift
    ? getAttendanceStatus(
        now,
        resolvedShift.startTime,
        resolvedShift.lateAfter,
        resolvedShift.endTime
      )
    : Status.PRESENT;

  const attendance = await prisma.attendance.upsert({
    where: { employeeId_date: { employeeId: employee.id, date: today } },
    create: {
      employeeId: employee.id,
      date: today,
      checkIn: now,
      status,
      checkInMethod: Method.PHOTO,
      checkInPhotoUrl: photoPath,
      checkInPhotoAttempts: nextAttempts,
      checkInShiftId: input.shiftId,
      checkInVerificationStatus: VerificationStatus.PENDING,
    },
    update: {
      checkIn: now,
      status,
      checkInMethod: Method.PHOTO,
      checkInPhotoUrl: photoPath,
      checkInPhotoAttempts: nextAttempts,
      checkInShiftId: input.shiftId,
      checkInVerificationStatus: VerificationStatus.PENDING,
      checkInRejectionReason: null,
      checkInReviewedAt: null,
      checkInReviewedById: null,
      checkInReviewedByName: null,
    },
  });

  return {
    message: `${employee.name}: ${attemptsMessage("الحضور", nextAttempts)}`,
    employeeName: employee.name,
    action: "checkin" as const,
    time: formatTimeAr(now),
    status: attendance.status,
    department: employee.department,
    pending: true,
    attempt: nextAttempts,
    maxAttempts: MAX_PHOTO_SUBMIT_ATTEMPTS,
  };
}

export async function submitPhotoCheckOut(input: {
  employeeId: string;
  shiftId: string;
  imageDataUrl: string;
}) {
  const { employee, shift } = await getEmployeeForPhoto(
    input.employeeId,
    input.shiftId
  );
  const today = getTodayDate();
  const dateKey = toDateKey(today);
  const now = new Date();

  const existing = await prisma.attendance.findUnique({
    where: { employeeId_date: { employeeId: employee.id, date: today } },
  });

  if (!existing?.checkIn) {
    throw new PhotoAttendanceError("لم يُسجَّل حضور لهذا اليوم", 400);
  }

  if (
    existing.checkInMethod === Method.PHOTO &&
    existing.checkInVerificationStatus !== VerificationStatus.APPROVED
  ) {
    if (existing.checkInVerificationStatus === VerificationStatus.PENDING) {
      throw new PhotoAttendanceError(
        "انتظر تأكيد حضورك أولاً قبل تسجيل الانصراف",
        400
      );
    }
    throw new PhotoAttendanceError(
      "حضورك مرفوض — سجّل حضوراً جديداً أولاً",
      400
    );
  }

  let nextAttempts = 1;

  if (existing.checkOut) {
    const verification = existing.checkOutVerificationStatus;
    if (verification === VerificationStatus.APPROVED) {
      throw new PhotoAttendanceError("تم تأكيد انصرافك لهذا اليوم", 409);
    }
    if (verification === VerificationStatus.PENDING) {
      const used = Math.max(existing.checkOutPhotoAttempts, 1);
      if (used >= MAX_PHOTO_SUBMIT_ATTEMPTS) {
        throw new PhotoAttendanceError(
          `وصلت للحد الأقصى (${MAX_PHOTO_SUBMIT_ATTEMPTS} صور) — انتظر مراجعة موظف الاستعلامات`,
          409
        );
      }
      nextAttempts = used + 1;
    }
  }

  const photoPath = await uploadEmployeePhoto(
    employee.id,
    "checkout",
    input.imageDataUrl,
    dateKey
  );

  await replaceStoredPhoto(existing.checkOutPhotoUrl, photoPath);

  let status = existing.status;
  const checkInShift = existing.checkInShiftId
    ? await prisma.workSchedule.findUnique({
        where: { id: existing.checkInShiftId },
        select: employeeShiftSelect,
      })
    : null;
  const employeeWithShift = { ...employee, shift: checkInShift ?? shift };
  const resolvedShift = await resolveEmployeeShiftAsync(
    employeeWithShift,
    existing.checkIn
  );

  if (resolvedShift) {
    const earlyStatus = getCheckoutStatus(now, resolvedShift);
    if (earlyStatus === Status.EARLY_LEAVE) {
      status = Status.EARLY_LEAVE;
    }
  }

  const attendance = await prisma.attendance.update({
    where: { id: existing.id },
    data: {
      checkOut: now,
      status,
      checkOutMethod: Method.PHOTO,
      checkOutPhotoUrl: photoPath,
      checkOutPhotoAttempts: nextAttempts,
      checkOutShiftId: input.shiftId,
      checkOutVerificationStatus: VerificationStatus.PENDING,
      checkOutRejectionReason: null,
      checkOutReviewedAt: null,
      checkOutReviewedById: null,
      checkOutReviewedByName: null,
    },
  });

  return {
    message: `${employee.name}: ${attemptsMessage("الانصراف", nextAttempts)}`,
    employeeName: employee.name,
    action: "checkout" as const,
    time: formatTimeAr(now),
    status: attendance.status,
    department: employee.department,
    pending: true,
    attempt: nextAttempts,
    maxAttempts: MAX_PHOTO_SUBMIT_ATTEMPTS,
  };
}

export async function reviewPhotoAttendance(input: {
  attendanceId: string;
  event: "checkin" | "checkout";
  action: "approve" | "reject";
  reason?: string;
  reviewerId: string;
  reviewerName: string;
}) {
  const attendance = await prisma.attendance.findUnique({
    where: { id: input.attendanceId },
    include: {
      employee: {
        select: { name: true, department: true },
      },
    },
  });

  if (!attendance) {
    throw new PhotoAttendanceError("سجل الحضور غير موجود", 404);
  }

  const isCheckIn = input.event === "checkin";
  const method = isCheckIn ? attendance.checkInMethod : attendance.checkOutMethod;
  const verification = isCheckIn
    ? attendance.checkInVerificationStatus
    : attendance.checkOutVerificationStatus;

  if (method !== Method.PHOTO) {
    throw new PhotoAttendanceError("هذا السجل ليس بتسجيل بالصورة", 400);
  }

  if (verification !== VerificationStatus.PENDING) {
    throw new PhotoAttendanceError("تمت مراجعة هذا السجل مسبقاً", 409);
  }

  const newStatus =
    input.action === "approve"
      ? VerificationStatus.APPROVED
      : VerificationStatus.REJECTED;

  const data = isCheckIn
    ? {
        checkInVerificationStatus: newStatus,
        checkInRejectionReason:
          input.action === "reject" ? input.reason?.trim() || null : null,
        checkInReviewedAt: new Date(),
        checkInReviewedById: input.reviewerId,
        checkInReviewedByName: input.reviewerName,
        // بعد الرفض يمكن البدء بمحاولات جديدة
        ...(input.action === "reject" ? { checkInPhotoAttempts: 0 } : {}),
      }
    : {
        checkOutVerificationStatus: newStatus,
        checkOutRejectionReason:
          input.action === "reject" ? input.reason?.trim() || null : null,
        checkOutReviewedAt: new Date(),
        checkOutReviewedById: input.reviewerId,
        checkOutReviewedByName: input.reviewerName,
        ...(input.action === "reject" ? { checkOutPhotoAttempts: 0 } : {}),
      };

  await prisma.attendance.update({
    where: { id: attendance.id },
    data,
  });

  const eventLabel = isCheckIn ? "الحضور" : "الانصراف";
  const actionLabel = input.action === "approve" ? "تأكيد" : "رفض";

  return {
    message: `تم ${actionLabel} ${eventLabel} لـ ${attendance.employee.name}`,
    employeeName: attendance.employee.name,
  };
}
