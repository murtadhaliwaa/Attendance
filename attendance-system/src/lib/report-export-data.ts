import type { EmployeeReportData, WeeklyReportData } from "@/lib/report-types";
import { formatLateDuration } from "@/lib/attendance-utils";
import { formatAttendanceMethodLabel } from "@/lib/attendance-method";
import {
  formatLateDetailsForExcel,
  formatLateDetailsForPdf,
  formatLateDurationForExcel,
} from "@/lib/report-excel-format";
import { dayStatusLabels } from "@/lib/report-labels";
import { formatShiftRangeLabel } from "@/lib/schedule-utils";
import { formatReportPeriod } from "@/lib/report-week";

export type ReportFileFormat = "excel" | "pdf";

export const WEEKLY_REPORT_HEADERS = [
  "رقم الموظف",
  "الاسم",
  "القسم",
  "أيام العمل",
  "حاضر",
  "متأخر",
  "تفاصيل التأخير",
  "إجمالي التأخير",
  "انصراف مبكر",
  "غائب",
] as const;

export const EMPLOYEE_REPORT_HEADERS = [
  "التاريخ",
  "اليوم",
  "الحالة",
  "الحضور",
  "طريقة الحضور",
  "الانصراف",
  "طريقة الانصراف",
  "التأخير",
] as const;

export function buildWeeklyReportTitleLines(data: WeeklyReportData): string[] {
  const shiftLabel =
    data.shiftName && data.shiftStartTime && data.shiftEndTime
      ? `${data.shiftName} — ${formatShiftRangeLabel(data.shiftStartTime, data.shiftEndTime)}`
      : "جميع الشفتات";

  return [
    "التقرير الأسبوعي للحضور",
    `الشفت: ${shiftLabel}`,
    `الفترة: ${formatReportPeriod(data.from, data.to)}`,
  ];
}

export function buildWeeklyReportTitleRows(data: WeeklyReportData): string[][] {
  return buildWeeklyReportTitleLines(data).map((line) => [line]);
}

function formatTotalLate(minutes: number, format: ReportFileFormat): string {
  if (minutes <= 0) return "—";
  return format === "excel"
    ? formatLateDurationForExcel(minutes)
    : formatLateDuration(minutes);
}

export function buildWeeklyReportRows(
  data: WeeklyReportData,
  format: ReportFileFormat
) {
  return data.employees.map((emp) => ({
    "رقم الموظف": emp.employeeCode,
    الاسم: emp.employeeName,
    القسم: emp.department,
    "أيام العمل": emp.workingDays,
    حاضر: emp.present,
    متأخر: emp.late,
    "تفاصيل التأخير":
      format === "excel"
        ? formatLateDetailsForExcel(emp.lateDays)
        : formatLateDetailsForPdf(emp.lateDays),
    "إجمالي التأخير": formatTotalLate(emp.totalLateMinutes, format),
    "انصراف مبكر": emp.earlyLeave,
    غائب: emp.absent,
  }));
}

export function buildWeeklyReportFilename(
  data: WeeklyReportData,
  extension: "xlsx" | "pdf"
) {
  const shiftPart = data.shiftName
    ? `-${data.shiftName.replace(/\s+/g, "-")}`
    : "";

  return `weekly-report${shiftPart}-${data.from}-${data.to}.${extension}`;
}

export function buildEmployeeReportTitleLines(
  data: EmployeeReportData
): string[] {
  return [
    `تقرير ${data.employee.name}`,
    `${data.employee.employeeCode} · ${data.employee.department}`,
    `الفترة: ${formatReportPeriod(data.from, data.to)}`,
  ];
}

export function buildEmployeeReportRows(
  data: EmployeeReportData,
  format: ReportFileFormat
) {
  return data.days.map((day) => ({
    التاريخ: day.date,
    اليوم: day.dayName,
    الحالة: dayStatusLabels[day.status],
    الحضور: day.checkIn ?? "—",
    "طريقة الحضور":
      formatAttendanceMethodLabel({
        method: day.checkInMethod,
        supervisorName: day.checkInSupervisorName,
      }) ?? "—",
    الانصراف: day.checkOut ?? "—",
    "طريقة الانصراف":
      formatAttendanceMethodLabel({
        method: day.checkOutMethod,
        supervisorName: day.checkOutSupervisorName,
      }) ?? "—",
    التأخير:
      day.lateMinutes && day.lateMinutes > 0
        ? formatTotalLate(day.lateMinutes, format)
        : "—",
  }));
}

export function buildEmployeeReportFilename(
  data: EmployeeReportData,
  extension: "xlsx" | "pdf"
) {
  return `employee-${data.employee.employeeCode}-${data.from}-${data.to}.${extension}`;
}

export function rowsToMatrix(
  rows: Record<string, string | number>[],
  headers: readonly string[]
) {
  return rows.map((row) => headers.map((header) => row[header] ?? ""));
}
