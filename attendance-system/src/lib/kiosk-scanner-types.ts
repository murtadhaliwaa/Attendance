import type { KioskMode } from "@/lib/kiosk-types";
import type { VerificationStatus } from "@prisma/client";
import { MAX_PHOTO_SUBMIT_ATTEMPTS } from "@/lib/photo-attendance-limits";

export type KioskState =
  | "loading"
  | "scanning"
  | "processing"
  | "success"
  | "error";

export type BlockReason = "already_checkin" | "no_checkin" | "already_done";

export type AttendanceAction =
  | "checkin"
  | "checkout"
  | "already_checkin"
  | "no_checkin"
  | "already_done";

export interface AttendanceResult {
  message: string;
  employeeName: string;
  action: AttendanceAction;
  time: string;
  status: string;
  department: string;
  pending?: boolean;
  attempt?: number;
  maxAttempts?: number;
}

export interface TodayStatus {
  hasCheckIn: boolean;
  hasCheckOut: boolean;
  checkInTime: string | null;
  checkOutTime: string | null;
  employeeName: string;
  checkInVerificationStatus?: VerificationStatus | null;
  checkOutVerificationStatus?: VerificationStatus | null;
  checkInPhotoAttempts?: number;
  checkOutPhotoAttempts?: number;
}

export function getBlockReason(
  mode: KioskMode,
  today: TodayStatus
): BlockReason | null {
  const checkInStatus = today.checkInVerificationStatus;
  const checkOutStatus = today.checkOutVerificationStatus;

  if (mode === "checkin") {
    if (!today.hasCheckIn) return null;
    if (checkInStatus === "REJECTED") return null;
    if (checkInStatus === "PENDING") {
      const used = Math.max(today.checkInPhotoAttempts ?? 1, 1);
      if (used < MAX_PHOTO_SUBMIT_ATTEMPTS) return null;
    }
    return "already_checkin";
  }

  if (!today.hasCheckIn || checkInStatus === "REJECTED") return "no_checkin";
  if (checkInStatus === "PENDING") return "no_checkin";

  if (!today.hasCheckOut) return null;
  if (checkOutStatus === "REJECTED") return null;
  if (checkOutStatus === "PENDING") {
    const used = Math.max(today.checkOutPhotoAttempts ?? 1, 1);
    if (used < MAX_PHOTO_SUBMIT_ATTEMPTS) return null;
  }
  return "already_done";
}

export function blockMessage(
  mode: KioskMode,
  reason: BlockReason,
  employeeName: string,
  today: TodayStatus
): string {
  if (reason === "already_checkin") {
    if (today.checkInVerificationStatus === "PENDING") {
      return `أنت ${employeeName}، وصلت للحد الأقصى (${MAX_PHOTO_SUBMIT_ATTEMPTS} صور) — انتظر تأكيد موظف الاستعلامات`;
    }
    return `أنت ${employeeName}، حضورك مسجّل مسبقاً (${today.checkInTime ?? ""})`;
  }
  if (reason === "no_checkin") {
    if (today.checkInVerificationStatus === "PENDING") {
      return `أنت ${employeeName}، انتظر تأكيد حضورك أولاً قبل تسجيل الانصراف`;
    }
    return `أنت ${employeeName}، سجّل حضورك أولاً من صفحة الحضور`;
  }
  if (today.checkOutVerificationStatus === "PENDING") {
    return `أنت ${employeeName}، وصلت للحد الأقصى (${MAX_PHOTO_SUBMIT_ATTEMPTS} صور) — انتظر تأكيد موظف الاستعلامات`;
  }
  return `أنت ${employeeName}، انصرافك مسجّل مسبقاً (${today.checkOutTime ?? ""})`;
}
