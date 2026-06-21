import {
  endOfWeek,
  format,
  parseISO,
  startOfWeek,
  subWeeks,
} from "date-fns";
import { arSA } from "date-fns/locale";
import {
  getTodayDate,
  parseDateKey,
  toDateKey,
  toPrismaDate,
} from "@/lib/app-timezone";

/** الأسبوع يبدأ يوم الأحد (مناسب لبيئة العمل في السعودية) */
const WEEK_STARTS_ON = 0 as const;

export function getWeekRange(referenceDate = new Date(), weeksAgo = 0) {
  const ref =
    weeksAgo > 0 ? subWeeks(toPrismaDate(referenceDate), weeksAgo) : getTodayDate();
  const from = startOfWeek(ref, { weekStartsOn: WEEK_STARTS_ON });
  const to = endOfWeek(ref, { weekStartsOn: WEEK_STARTS_ON });
  return { from: toPrismaDate(from), to: toPrismaDate(to) };
}

export function formatWeekRange(from: Date, to: Date) {
  return {
    from: toDateKey(from),
    to: toDateKey(to),
  };
}

export function getCurrentWeekStrings() {
  const { from, to } = getWeekRange();
  return formatWeekRange(from, to);
}

export function getPreviousWeekStrings() {
  const { from, to } = getWeekRange(new Date(), 1);
  return formatWeekRange(from, to);
}

/** 0 = الأسبوع الحالي، 1 = الأسبوع الماضي، وهكذا */
export function getWeekStringsByOffset(weeksAgo = 0) {
  const { from, to } = getWeekRange(new Date(), weeksAgo);
  return formatWeekRange(from, to);
}

/** أقصى مدى للتقرير — 93 يوماً (~3 أشهر) */
export const MAX_REPORT_RANGE_DAYS = 93;

export function parseDateRangeStrings(from?: string, to?: string) {
  if (from && to) {
    const parsedFrom = parseDateKey(from);
    const parsedTo = parseDateKey(to);
    const start = parsedFrom <= parsedTo ? parsedFrom : parsedTo;
    const end = parsedFrom <= parsedTo ? parsedTo : parsedFrom;

    const maxEnd = new Date(start);
    maxEnd.setDate(maxEnd.getDate() + MAX_REPORT_RANGE_DAYS - 1);
    const cappedEnd = end > maxEnd ? maxEnd : end;

    return { from: start, to: cappedEnd };
  }
  return getWeekRange();
}

export function formatReportPeriod(from: string, to: string) {
  const fromDate = parseISO(from);
  const toDate = parseISO(to);
  const sameMonth = fromDate.getMonth() === toDate.getMonth();

  if (sameMonth) {
    return `${format(fromDate, "d", { locale: arSA })} – ${format(toDate, "d MMMM yyyy", { locale: arSA })}`;
  }

  return `${format(fromDate, "d MMM", { locale: arSA })} – ${format(toDate, "d MMMM yyyy", { locale: arSA })}`;
}
