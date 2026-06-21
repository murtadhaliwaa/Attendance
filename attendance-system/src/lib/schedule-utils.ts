const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export function isValidTimeValue(value: string): boolean {
  return TIME_PATTERN.test(value.trim());
}

export function parseGraceMinutes(value: unknown, fieldName: string): number {
  const minutes = Number(value);
  if (!Number.isInteger(minutes) || minutes < 0 || minutes > 180) {
    throw new Error(`${fieldName} يجب أن يكون بين 0 و 180 دقيقة`);
  }
  return minutes;
}

export function formatTimeLabel(time: string): string {
  const [hours, minutes] = time.split(":").map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date.toLocaleTimeString("ar-SA", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export function formatShiftTimeAr(time: string): string {
  const [hours, minutes] = time.split(":").map(Number);

  if (hours === 0 && minutes === 0) return "12 منتصف الليل";
  if (hours === 12 && minutes === 0) return "12 ظهراً";

  const displayHour = hours % 12 === 0 ? 12 : hours % 12;
  const period = hours >= 12 ? "مساءً" : "صباحاً";
  const minutePart =
    minutes === 0 ? "" : `:${String(minutes).padStart(2, "0")}`;

  return `${displayHour}${minutePart} ${period}`;
}

export function formatShiftRangeLabel(startTime: string, endTime: string): string {
  return `من ${formatShiftTimeAr(startTime)} إلى ${formatShiftTimeAr(endTime)}`;
}

export function minutesToTime(totalMinutes: number) {
  const normalized = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function getLateDeadlineLabel(startTime: string, lateAfter: number) {
  const [hours, minutes] = startTime.split(":").map(Number);
  const total = hours * 60 + minutes + lateAfter;
  const deadlineHours = Math.floor(total / 60) % 24;
  const deadlineMinutes = total % 60;
  const deadline = `${String(deadlineHours).padStart(2, "0")}:${String(deadlineMinutes).padStart(2, "0")}`;
  return formatTimeLabel(deadline);
}

export function getEarlyLeaveDeadlineLabel(
  endTime: string,
  earlyLeaveBefore: number
) {
  const [hours, minutes] = endTime.split(":").map(Number);
  const total = Math.max(0, hours * 60 + minutes - earlyLeaveBefore);
  const deadlineHours = Math.floor(total / 60) % 24;
  const deadlineMinutes = total % 60;
  const deadline = `${String(deadlineHours).padStart(2, "0")}:${String(deadlineMinutes).padStart(2, "0")}`;
  return formatTimeLabel(deadline);
}
