import type { EmployeeReportData, WeeklyReportData } from "@/lib/report-types";
import { dayStatusLabels } from "@/lib/report-labels";
import { formatShiftRangeLabel } from "@/lib/schedule-utils";
import { formatReportPeriod } from "@/lib/report-week";

function buildWeeklyReportTitleRows(data: WeeklyReportData): string[][] {
  const shiftLabel =
    data.shiftName && data.shiftStartTime && data.shiftEndTime
      ? `${data.shiftName} — ${formatShiftRangeLabel(data.shiftStartTime, data.shiftEndTime)}`
      : "جميع الشفتات";

  return [
    ["التقرير الأسبوعي للحضور"],
    [`الشفت: ${shiftLabel}`],
    [`الفترة: ${formatReportPeriod(data.from, data.to)}`],
  ];
}

export async function exportWeeklyReportExcel(data: WeeklyReportData) {
  const { exportRowsToExcel } = await import("@/lib/export-excel");

  const rows = data.employees.map((emp) => ({
    "رقم الموظف": emp.employeeCode,
    الاسم: emp.employeeName,
    القسم: emp.department,
    "أيام العمل": emp.workingDays,
    حاضر: emp.present,
    متأخر: emp.late,
    "انصراف مبكر": emp.earlyLeave,
    غائب: emp.absent,
  }));

  const shiftPart = data.shiftName
    ? `-${data.shiftName.replace(/\s+/g, "-")}`
    : "";

  await exportRowsToExcel(
    rows,
    `weekly-report${shiftPart}-${data.from}-${data.to}.xlsx`,
    data.shiftName ?? "Weekly",
    { titleRows: buildWeeklyReportTitleRows(data) }
  );
}

export async function exportEmployeeReportExcel(data: EmployeeReportData) {
  const { exportRowsToExcel } = await import("@/lib/export-excel");

  const rows = data.days.map((day) => ({
    التاريخ: day.date,
    اليوم: day.dayName,
    الحالة: dayStatusLabels[day.status],
    الحضور: day.checkIn ?? "—",
    الانصراف: day.checkOut ?? "—",
  }));

  await exportRowsToExcel(
    rows,
    `employee-${data.employee.employeeCode}-${data.from}-${data.to}.xlsx`,
    "Employee"
  );
}
