import { format, parseISO } from "date-fns";
import { arSA } from "date-fns/locale";
import { formatLateDuration, getEffectiveCheckInStatus } from "@/lib/attendance-utils";
import {
  resolveEmployeeShift,
  type ShiftTimingsContext,
} from "@/lib/attendance-shift";
import type { LateDayDetail } from "@/lib/report-excel-format";

export type { LateDayDetail } from "@/lib/report-excel-format";

export type EmployeeShiftInfo = {
  customEndTime: string | null;
  shift: {
    startTime: string;
    endTime: string;
    lateAfter: number;
    earlyLeaveBefore?: number | null;
  } | null;
};

export function computeLateMinutes(
  employee: EmployeeShiftInfo,
  checkIn: Date,
  context: ShiftTimingsContext
): number {
  const shift = resolveEmployeeShift(employee, checkIn, context);
  return getEffectiveCheckInStatus(checkIn, shift).lateMinutes;
}

export function formatLateDetails(days: LateDayDetail[]): string {
  if (days.length === 0) return "—";

  return days
    .map((day) => {
      const dateLabel = format(parseISO(day.date), "d/M/yyyy", { locale: arSA });
      return `${day.dayName} ${dateLabel}: ${formatLateDuration(day.lateMinutes)}`;
    })
    .join("\n");
}

export function sumLateMinutes(days: LateDayDetail[]): number {
  return days.reduce((sum, day) => sum + day.lateMinutes, 0);
}
