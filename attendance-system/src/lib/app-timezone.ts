/** توقيت التطبيق الافتراضي — يُستخدم لتوحيد تاريخ/وقت الحضور والتقارير */
export const APP_TIMEZONE = "Asia/Riyadh";

type ZonedParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

export function getZonedParts(
  date: Date,
  timeZone: string = APP_TIMEZONE
): ZonedParts {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);

  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
    second: get("second"),
  };
}

export function toDateKey(date: Date, timeZone: string = APP_TIMEZONE): string {
  const { year, month, day } = getZonedParts(date, timeZone);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** تاريخ آمن لحقل Prisma @db.Date بدون انزياح يوم بسبب UTC */
export function parseDateKey(dateKey: string): Date {
  return new Date(`${dateKey}T12:00:00.000Z`);
}

export function toPrismaDate(
  date: Date,
  timeZone: string = APP_TIMEZONE
): Date {
  return parseDateKey(toDateKey(date, timeZone));
}

export function getTodayDate(timeZone: string = APP_TIMEZONE): Date {
  return toPrismaDate(new Date(), timeZone);
}

export function getTodayDateKey(timeZone: string = APP_TIMEZONE): string {
  return toDateKey(new Date(), timeZone);
}

export function isFutureDateKey(
  dayKey: string,
  timeZone: string = APP_TIMEZONE
): boolean {
  return dayKey > getTodayDateKey(timeZone);
}

export function isTodayDateKey(
  dayKey: string,
  timeZone: string = APP_TIMEZONE
): boolean {
  return dayKey === getTodayDateKey(timeZone);
}

export function getZonedTimeMinutes(
  date: Date,
  timeZone: string = APP_TIMEZONE
): number {
  const { hour, minute } = getZonedParts(date, timeZone);
  return hour * 60 + minute;
}
