import { Status } from "@prisma/client";
import {
  APP_TIMEZONE,
  getZonedTimeMinutes,
} from "@/lib/app-timezone";
import { parseTimeToMinutes } from "@/lib/time-utils";

export { parseTimeToMinutes };

export type ShiftTiming = {
  startTime: string;
  endTime: string;
  lateAfter: number;
  earlyLeaveBefore?: number;
};

const MINUTES_PER_DAY = 24 * 60;

export function isOvernightShift(startTime: string, endTime: string): boolean {
  return parseTimeToMinutes(endTime) <= parseTimeToMinutes(startTime);
}

function isOvernightShiftMinutes(start: number, end: number): boolean {
  return end <= start;
}

function isTimeWithinShift(minutes: number, start: number, end: number): boolean {
  if (isOvernightShiftMinutes(start, end)) {
    return minutes >= start || minutes < end;
  }
  return minutes >= start && minutes < end;
}

function shiftSpanMinutes(start: number, end: number): number {
  if (isOvernightShiftMinutes(start, end)) {
    return MINUTES_PER_DAY - start + end;
  }
  return end - start;
}

function normalizeCheckInMinutes(
  minutes: number,
  start: number,
  end: number
): number {
  if (isOvernightShiftMinutes(start, end) && minutes < end) {
    return minutes + MINUTES_PER_DAY;
  }
  return minutes;
}

export function resolveShiftTiming(
  employeeShift: ShiftTiming | null | undefined,
  defaultShift?: ShiftTiming | null
): ShiftTiming | null {
  return employeeShift ?? defaultShift ?? null;
}

/** يحدد الشفت المناسب حسب وقت التسجيل — يُستخدم فقط عندما لا يكون للموظف شفت مسند */
export function getActiveShiftAtTime(
  time: Date,
  shifts: ShiftTiming[]
): ShiftTiming | null {
  if (shifts.length === 0) return null;

  const nowMinutes = getZonedTimeMinutes(time);

  const withSpan = shifts.map((shift) => {
    const start = parseTimeToMinutes(shift.startTime);
    const end = parseTimeToMinutes(shift.endTime);
    return {
      shift,
      start,
      end,
      span: shiftSpanMinutes(start, end),
    };
  });

  const active = withSpan
    .filter(({ start, end }) => isTimeWithinShift(nowMinutes, start, end))
    .sort((a, b) => a.span - b.span);

  if (active.length > 0) {
    return active[0].shift;
  }

  const started = withSpan
    .filter(({ start, end }) =>
      isOvernightShiftMinutes(start, end)
        ? nowMinutes >= start || nowMinutes < end
        : nowMinutes >= start
    )
    .sort((a, b) => b.start - a.start);

  if (started.length > 0) {
    return started[0].shift;
  }

  return withSpan.sort((a, b) => a.start - b.start)[0]?.shift ?? null;
}

export function buildEmployeeShiftTiming(
  shift:
    | {
        startTime: string;
        endTime: string;
        lateAfter: number;
        earlyLeaveBefore?: number | null;
      }
    | null
    | undefined,
  customEndTime?: string | null
): ShiftTiming | null {
  if (!shift) return null;

  return {
    startTime: shift.startTime,
    endTime: customEndTime?.trim() || shift.endTime,
    lateAfter: shift.lateAfter,
    earlyLeaveBefore: shift.earlyLeaveBefore ?? 0,
  };
}

/** يفضّل شفت الموظف المسند (مع وقت انصراف مخصص إن وُجد)، وإلا يُحدد حسب وقت التسجيل */
export function resolveShiftForAttendance(
  assignedShift: ShiftTiming | null | undefined,
  checkInTime: Date | null | undefined,
  allShifts: ShiftTiming[],
  defaultShift: ShiftTiming | null
): ShiftTiming | null {
  if (assignedShift) return assignedShift;
  if (checkInTime) {
    return getActiveShiftAtTime(checkInTime, allShifts) ?? defaultShift;
  }
  return defaultShift;
}

export function getAttendanceStatus(
  checkIn: Date,
  startTime: string,
  lateAfter: number,
  endTime?: string
): Status {
  const checkInMinutes = getZonedTimeMinutes(checkIn);
  const shiftStart = parseTimeToMinutes(startTime);
  const shiftEnd = endTime ? parseTimeToMinutes(endTime) : shiftStart;
  const normalizedCheckIn = endTime
    ? normalizeCheckInMinutes(checkInMinutes, shiftStart, shiftEnd)
    : checkInMinutes;
  return normalizedCheckIn > shiftStart + lateAfter ? Status.LATE : Status.PRESENT;
}

export function computeLateMinutes(
  checkIn: Date,
  startTime: string,
  lateAfter: number,
  endTime?: string
): number {
  const checkInMinutes = getZonedTimeMinutes(checkIn);
  const shiftStart = parseTimeToMinutes(startTime);
  const shiftEnd = endTime ? parseTimeToMinutes(endTime) : shiftStart;
  const normalizedCheckIn = endTime
    ? normalizeCheckInMinutes(checkInMinutes, shiftStart, shiftEnd)
    : checkInMinutes;
  const deadline = shiftStart + lateAfter;
  return Math.max(0, normalizedCheckIn - deadline);
}

export function formatLateDuration(minutes: number): string {
  if (minutes <= 0) return "";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0 && mins > 0) return `${hours} ساعة و ${mins} دقيقة`;
  if (hours > 0) return `${hours} ساعة`;
  return `${mins} دقيقة`;
}

export function getEffectiveCheckInStatus(
  checkIn: Date | null,
  shift: ShiftTiming | null
): { status: Status; lateMinutes: number } {
  if (!checkIn || !shift) {
    return { status: Status.PRESENT, lateMinutes: 0 };
  }

  const status = getAttendanceStatus(
    checkIn,
    shift.startTime,
    shift.lateAfter,
    shift.endTime
  );
  const lateMinutes = computeLateMinutes(
    checkIn,
    shift.startTime,
    shift.lateAfter,
    shift.endTime
  );

  return { status, lateMinutes };
}

export function getCheckoutStatus(
  checkOut: Date,
  shift: ShiftTiming
): Status | null {
  const checkOutMinutes = getZonedTimeMinutes(checkOut);
  const shiftStart = parseTimeToMinutes(shift.startTime);
  const shiftEnd = parseTimeToMinutes(shift.endTime);
  const earlyLeaveBefore = shift.earlyLeaveBefore ?? 0;
  const earliestAllowedCheckout = shiftEnd - earlyLeaveBefore;

  if (isOvernightShiftMinutes(shiftStart, shiftEnd)) {
    if (checkOutMinutes >= shiftStart) {
      return Status.EARLY_LEAVE;
    }
    return checkOutMinutes < earliestAllowedCheckout
      ? Status.EARLY_LEAVE
      : null;
  }

  return checkOutMinutes < earliestAllowedCheckout
    ? Status.EARLY_LEAVE
    : null;
}

export function formatTimeAr(date: Date): string {
  return date.toLocaleTimeString("ar-SA", {
    timeZone: APP_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}
