import { VerificationStatus } from "@prisma/client";
import { MAX_PHOTO_SUBMIT_ATTEMPTS } from "@/lib/photo-attendance-limits";

export type PhotoSubmitMode = "create" | "retry_pending" | "restart";

export class PhotoAttendanceModeError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = "PhotoAttendanceModeError";
  }
}

export function resolveCheckInMode(
  existing: {
    checkIn: Date | null;
    checkInVerificationStatus: VerificationStatus | null;
    checkInPhotoAttempts: number;
  } | null
): PhotoSubmitMode {
  if (!existing?.checkIn) return "create";

  const verification = existing.checkInVerificationStatus;
  if (verification === VerificationStatus.APPROVED) {
    throw new PhotoAttendanceModeError("تم تأكيد حضورك لهذا اليوم", 409);
  }
  if (verification === VerificationStatus.PENDING) {
    const used = Math.max(existing.checkInPhotoAttempts, 1);
    if (used >= MAX_PHOTO_SUBMIT_ATTEMPTS) {
      throw new PhotoAttendanceModeError(
        `وصلت للحد الأقصى (${MAX_PHOTO_SUBMIT_ATTEMPTS} صور) — انتظر مراجعة موظف الاستعلامات`,
        409
      );
    }
    return "retry_pending";
  }
  return "restart";
}

export function resolveCheckOutMode(
  existing: {
    checkOut: Date | null;
    checkOutVerificationStatus: VerificationStatus | null;
    checkOutPhotoAttempts: number;
  } | null
): PhotoSubmitMode {
  if (!existing?.checkOut) return "create";

  const verification = existing.checkOutVerificationStatus;
  if (verification === VerificationStatus.APPROVED) {
    throw new PhotoAttendanceModeError("تم تأكيد انصرافك لهذا اليوم", 409);
  }
  if (verification === VerificationStatus.PENDING) {
    const used = Math.max(existing.checkOutPhotoAttempts, 1);
    if (used >= MAX_PHOTO_SUBMIT_ATTEMPTS) {
      throw new PhotoAttendanceModeError(
        `وصلت للحد الأقصى (${MAX_PHOTO_SUBMIT_ATTEMPTS} صور) — انتظر مراجعة موظف الاستعلامات`,
        409
      );
    }
    return "retry_pending";
  }
  return "restart";
}

export function attemptsMessage(eventLabel: string, attempt: number): string {
  const remaining = MAX_PHOTO_SUBMIT_ATTEMPTS - attempt;
  if (remaining <= 0) {
    return `تم إرسال طلب ${eventLabel} (المحاولة ${attempt} من ${MAX_PHOTO_SUBMIT_ATTEMPTS}) — بانتظار التأكيد، ولا يمكن إرسال صورة إضافية`;
  }
  return `تم إرسال طلب ${eventLabel} (المحاولة ${attempt} من ${MAX_PHOTO_SUBMIT_ATTEMPTS}) — يمكنك إعادة الإرسال ${remaining} مرة قبل انتهاء المراجعة`;
}
