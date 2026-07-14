import { Method, Status, VerificationStatus, Prisma } from "@prisma/client";
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
import {
  attemptsMessage,
  resolveCheckInMode,
  resolveCheckOutMode,
  PhotoAttendanceModeError,
} from "@/lib/photo-attendance-mode";

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

function toPhotoAttendanceError(error: unknown): never {
  if (error instanceof PhotoAttendanceModeError) {
    throw new PhotoAttendanceError(error.message, error.status);
  }
  throw error;
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

  if (!employee.shiftId) {
    throw new PhotoAttendanceError(
      "لم يُعيَّن شفت لهذا الموظف — عيّن الشفت من إدارة الموظفين أولاً",
      400
    );
  }

  if (employee.shiftId !== shiftId) {
    throw new PhotoAttendanceError(
      "هذا الموظف غير مسجّل في الشفت المختار",
      400
    );
  }

  return { employee, shift };
}

/** حذف آمن بعد نجاح الحفظ فقط — لا يُستدعى قبل كتابة قاعدة البيانات */
async function deletePreviousPhotoSafe(
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

async function deleteUploadedPhotoSafe(path: string) {
  try {
    await deleteEmployeePhoto(path);
  } catch {
    // أفضل جهد لتنظيف رفع فاشل
  }
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

  let mode;
  try {
    mode = resolveCheckInMode(existing);
  } catch (error) {
    toPhotoAttendanceError(error);
  }
  const previousPhotoUrl = existing?.checkInPhotoUrl ?? null;

  const employeeWithShift = { ...employee, shift };
  const resolvedShift = await resolveEmployeeShiftAsync(employeeWithShift, now);
  const freshStatus = resolvedShift
    ? getAttendanceStatus(
        now,
        resolvedShift.startTime,
        resolvedShift.lateAfter,
        resolvedShift.endTime
      )
    : Status.PRESENT;

  const photoPath = await uploadEmployeePhoto(
    employee.id,
    "checkin",
    input.imageDataUrl,
    dateKey
  );

  let nextAttempts = 1;
  let displayTime = now;
  let status = freshStatus;

  try {
    if (mode === "create") {
      try {
        const created = await prisma.attendance.create({
          data: {
            employeeId: employee.id,
            date: today,
            checkIn: now,
            status: freshStatus,
            checkInMethod: Method.PHOTO,
            checkInPhotoUrl: photoPath,
            checkInPhotoAttempts: 1,
            checkInShiftId: input.shiftId,
            checkInVerificationStatus: VerificationStatus.PENDING,
          },
        });
        nextAttempts = 1;
        displayTime = created.checkIn ?? now;
        status = created.status;
      } catch (error) {
        await deleteUploadedPhotoSafe(photoPath);
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          throw new PhotoAttendanceError(
            "تعذر إكمال التسجيل بسبب طلب متزامن — أعد المحاولة",
            409
          );
        }
        throw error;
      }
    } else if (mode === "retry_pending") {
      // تحديث ذري: لن يتجاوز الحد حتى مع طلبات متزامنة
      const updated = await prisma.attendance.updateMany({
        where: {
          id: existing!.id,
          checkInVerificationStatus: VerificationStatus.PENDING,
          checkInPhotoAttempts: { lt: MAX_PHOTO_SUBMIT_ATTEMPTS },
        },
        data: {
          checkInMethod: Method.PHOTO,
          checkInPhotoUrl: photoPath,
          checkInPhotoAttempts: { increment: 1 },
          checkInShiftId: input.shiftId,
          checkInRejectionReason: null,
          checkInReviewedAt: null,
          checkInReviewedById: null,
          checkInReviewedByName: null,
          // نُبقي checkIn والـ status من أول حضور
        },
      });

      if (updated.count === 0) {
        await deleteUploadedPhotoSafe(photoPath);
        throw new PhotoAttendanceError(
          `وصلت للحد الأقصى (${MAX_PHOTO_SUBMIT_ATTEMPTS} صور) — انتظر مراجعة موظف الاستعلامات`,
          409
        );
      }

      const row = await prisma.attendance.findUniqueOrThrow({
        where: { id: existing!.id },
      });
      nextAttempts = row.checkInPhotoAttempts;
      displayTime = row.checkIn ?? now;
      status = row.status;
    } else {
      // بعد رفض أو إعادة تسجيل كاملة
      const updated = await prisma.attendance.updateMany({
        where: {
          id: existing!.id,
          OR: [
            { checkInVerificationStatus: VerificationStatus.REJECTED },
            { checkInVerificationStatus: null },
          ],
        },
        data: {
          checkIn: now,
          status: freshStatus,
          checkInMethod: Method.PHOTO,
          checkInPhotoUrl: photoPath,
          checkInPhotoAttempts: 1,
          checkInShiftId: input.shiftId,
          checkInVerificationStatus: VerificationStatus.PENDING,
          checkInRejectionReason: null,
          checkInReviewedAt: null,
          checkInReviewedById: null,
          checkInReviewedByName: null,
        },
      });

      if (updated.count === 0) {
        await deleteUploadedPhotoSafe(photoPath);
        throw new PhotoAttendanceError(
          "تعذر إكمال التسجيل بسبب طلب متزامن — أعد المحاولة",
          409
        );
      }

      nextAttempts = 1;
      displayTime = now;
      status = freshStatus;
    }
  } catch (error) {
    if (error instanceof PhotoAttendanceError) throw error;
    await deleteUploadedPhotoSafe(photoPath);
    throw error;
  }

  await deletePreviousPhotoSafe(previousPhotoUrl, photoPath);

  return {
    message: `${employee.name}: ${attemptsMessage("الحضور", nextAttempts)}`,
    employeeName: employee.name,
    action: "checkin" as const,
    time: formatTimeAr(displayTime),
    status,
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
  const { employee } = await getEmployeeForPhoto(
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

  let mode;
  try {
    mode = resolveCheckOutMode(existing);
  } catch (error) {
    toPhotoAttendanceError(error);
  }
  const previousPhotoUrl = existing.checkOutPhotoUrl ?? null;

  // لا نغيّر الحالة إلى انصراف مبكر قبل تأكيد المراجعة
  const pendingStatus = existing.status;

  const photoPath = await uploadEmployeePhoto(
    employee.id,
    "checkout",
    input.imageDataUrl,
    dateKey
  );

  let nextAttempts = 1;
  let displayTime = now;
  let status = pendingStatus;

  try {
    if (mode === "create") {
      const updated = await prisma.attendance.updateMany({
        where: {
          id: existing.id,
          checkOut: null,
        },
        data: {
          checkOut: now,
          checkOutMethod: Method.PHOTO,
          checkOutPhotoUrl: photoPath,
          checkOutPhotoAttempts: 1,
          checkOutShiftId: input.shiftId,
          checkOutVerificationStatus: VerificationStatus.PENDING,
          checkOutRejectionReason: null,
          checkOutReviewedAt: null,
          checkOutReviewedById: null,
          checkOutReviewedByName: null,
        },
      });

      if (updated.count === 0) {
        await deleteUploadedPhotoSafe(photoPath);
        throw new PhotoAttendanceError(
          "تعذر إكمال التسجيل بسبب طلب متزامن — أعد المحاولة",
          409
        );
      }

      nextAttempts = 1;
      displayTime = now;
      status = pendingStatus;
    } else if (mode === "retry_pending") {
      const updated = await prisma.attendance.updateMany({
        where: {
          id: existing.id,
          checkOutVerificationStatus: VerificationStatus.PENDING,
          checkOutPhotoAttempts: { lt: MAX_PHOTO_SUBMIT_ATTEMPTS },
        },
        data: {
          checkOutMethod: Method.PHOTO,
          checkOutPhotoUrl: photoPath,
          checkOutPhotoAttempts: { increment: 1 },
          checkOutShiftId: input.shiftId,
          checkOutRejectionReason: null,
          checkOutReviewedAt: null,
          checkOutReviewedById: null,
          checkOutReviewedByName: null,
          // نُبقي checkOut والـ status من أول انصراف
        },
      });

      if (updated.count === 0) {
        await deleteUploadedPhotoSafe(photoPath);
        throw new PhotoAttendanceError(
          `وصلت للحد الأقصى (${MAX_PHOTO_SUBMIT_ATTEMPTS} صور) — انتظر مراجعة موظف الاستعلامات`,
          409
        );
      }

      const row = await prisma.attendance.findUniqueOrThrow({
        where: { id: existing.id },
      });
      nextAttempts = row.checkOutPhotoAttempts;
      displayTime = row.checkOut ?? now;
      status = row.status;
    } else {
      const updated = await prisma.attendance.updateMany({
        where: {
          id: existing.id,
          OR: [
            { checkOutVerificationStatus: VerificationStatus.REJECTED },
            { checkOutVerificationStatus: null },
          ],
        },
        data: {
          checkOut: now,
          checkOutMethod: Method.PHOTO,
          checkOutPhotoUrl: photoPath,
          checkOutPhotoAttempts: 1,
          checkOutShiftId: input.shiftId,
          checkOutVerificationStatus: VerificationStatus.PENDING,
          checkOutRejectionReason: null,
          checkOutReviewedAt: null,
          checkOutReviewedById: null,
          checkOutReviewedByName: null,
        },
      });

      if (updated.count === 0) {
        await deleteUploadedPhotoSafe(photoPath);
        throw new PhotoAttendanceError(
          "تعذر إكمال التسجيل بسبب طلب متزامن — أعد المحاولة",
          409
        );
      }

      nextAttempts = 1;
      displayTime = now;
      status = pendingStatus;
    }
  } catch (error) {
    if (error instanceof PhotoAttendanceError) throw error;
    await deleteUploadedPhotoSafe(photoPath);
    throw error;
  }

  await deletePreviousPhotoSafe(previousPhotoUrl, photoPath);

  return {
    message: `${employee.name}: ${attemptsMessage("الانصراف", nextAttempts)}`,
    employeeName: employee.name,
    action: "checkout" as const,
    time: formatTimeAr(displayTime),
    status,
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
        select: { name: true, department: true, customEndTime: true },
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

  let statusUpdate: Status | undefined;

  if (
    !isCheckIn &&
    input.action === "approve" &&
    attendance.checkOut &&
    attendance.checkIn
  ) {
    const checkInShift = attendance.checkInShiftId
      ? await prisma.workSchedule.findUnique({
          where: { id: attendance.checkInShiftId },
          select: employeeShiftSelect,
        })
      : null;
    const resolvedShift = await resolveEmployeeShiftAsync(
      {
        customEndTime: attendance.employee.customEndTime,
        shift: checkInShift,
      },
      attendance.checkIn
    );
    if (resolvedShift) {
      const earlyStatus = getCheckoutStatus(
        attendance.checkOut,
        resolvedShift
      );
      if (earlyStatus === Status.EARLY_LEAVE) {
        statusUpdate = Status.EARLY_LEAVE;
      }
    }
  }

  const data = isCheckIn
    ? {
        checkInVerificationStatus: newStatus,
        checkInRejectionReason:
          input.action === "reject" ? input.reason?.trim() || null : null,
        checkInReviewedAt: new Date(),
        checkInReviewedById: input.reviewerId,
        checkInReviewedByName: input.reviewerName,
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
        ...(statusUpdate ? { status: statusUpdate } : {}),
      };

  const updated = await prisma.attendance.updateMany({
    where: {
      id: attendance.id,
      ...(isCheckIn
        ? {
            checkInMethod: Method.PHOTO,
            checkInVerificationStatus: VerificationStatus.PENDING,
          }
        : {
            checkOutMethod: Method.PHOTO,
            checkOutVerificationStatus: VerificationStatus.PENDING,
          }),
    },
    data,
  });

  if (updated.count === 0) {
    throw new PhotoAttendanceError("تمت مراجعة هذا السجل مسبقاً", 409);
  }

  const eventLabel = isCheckIn ? "الحضور" : "الانصراف";
  const actionLabel = input.action === "approve" ? "تأكيد" : "رفض";

  return {
    message: `تم ${actionLabel} ${eventLabel} لـ ${attendance.employee.name}`,
    employeeName: attendance.employee.name,
  };
}
