import type { KioskMode } from "@/lib/kiosk-types";

export type KioskState =
  | "loading"
  | "scanning"
  | "verifying"
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
}

export interface TodayStatus {
  hasCheckIn: boolean;
  hasCheckOut: boolean;
  checkInTime: string | null;
  checkOutTime: string | null;
  employeeName: string;
}

export interface MatchStreak {
  employeeId: string;
  count: number;
  name: string;
}

export type ScanPhase = "idle" | "detecting" | "matching" | "unknown";

export const UNKNOWN_FACE_MESSAGE =
  "ربما أنك موظف جديد وغير مسجّل، أو أن النظام لم يتعرف عليك — حاول مجدداً، أو سجّل عبر «موظف جديد».";

export const UNKNOWN_FACE_HOLD_MS = 5000;

export function getBlockReason(
  mode: KioskMode,
  today: TodayStatus
): BlockReason | null {
  if (mode === "checkin") {
    if (today.hasCheckIn) return "already_checkin";
    return null;
  }
  if (!today.hasCheckIn) return "no_checkin";
  if (today.hasCheckOut) return "already_done";
  return null;
}

export function blockMessage(
  mode: KioskMode,
  reason: BlockReason,
  employeeName: string,
  today: TodayStatus
): string {
  if (reason === "already_checkin") {
    return `أنت ${employeeName}، حضورك مسجّل مسبقاً (${today.checkInTime ?? ""})`;
  }
  if (reason === "no_checkin") {
    return `أنت ${employeeName}، سجّل حضورك أولاً من صفحة الحضور`;
  }
  return `أنت ${employeeName}، انصرافك مسجّل مسبقاً (${today.checkOutTime ?? ""})`;
}
