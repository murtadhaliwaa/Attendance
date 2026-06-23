import { format, parseISO } from "date-fns";
import { arSA } from "date-fns/locale";
import { formatLateDuration } from "@/lib/attendance-utils";

export type LateDayDetail = {
  date: string;
  dayName: string;
  lateMinutes: number;
};

export function formatLateDetailsForPdf(days: LateDayDetail[]): string {
  if (days.length === 0) return "—";

  return days
    .map((day) => {
      const dateLabel = format(parseISO(day.date), "d/M/yyyy", { locale: arSA });
      return `${day.dayName} ${dateLabel}: ${formatLateDuration(day.lateMinutes)}`;
    })
    .join("\n");
}

const EXCEL_LTR_MARK = "\u200E";

export function formatLateDurationForExcel(minutes: number): string {
  if (minutes <= 0) return "";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0 && mins > 0) {
    return `${EXCEL_LTR_MARK}${hours} ساعة و ${mins} دقيقة`;
  }
  if (hours > 0) return `${EXCEL_LTR_MARK}${hours} ساعة`;
  return `${EXCEL_LTR_MARK}${mins} دقيقة`;
}

export function formatLateDetailsForExcel(days: LateDayDetail[]): string {
  if (days.length === 0) return "—";

  return days
    .map((day) => {
      const dateLabel = format(parseISO(day.date), "d/M/yyyy", { locale: arSA });
      return `${day.dayName} ${dateLabel}: ${formatLateDurationForExcel(day.lateMinutes)}`;
    })
    .join("\n");
}
