import type { EmployeeReportData, WeeklyReportData } from "@/lib/report-types";
import {
  buildEmployeeReportFilename,
  buildEmployeeReportRows,
  buildWeeklyReportFilename,
  buildWeeklyReportRows,
  buildWeeklyReportTitleRows,
} from "@/lib/report-export-data";

export async function exportWeeklyReportExcel(data: WeeklyReportData) {
  const { exportRowsToExcel } = await import("@/lib/export-excel");
  const rows = buildWeeklyReportRows(data, "excel");

  await exportRowsToExcel(
    rows,
    buildWeeklyReportFilename(data, "xlsx"),
    data.shiftName ?? "Weekly",
    {
      titleRows: buildWeeklyReportTitleRows(data),
      wideColumns: ["تفاصيل التأخير", "إجمالي التأخير"],
    }
  );
}

export async function exportEmployeeReportExcel(data: EmployeeReportData) {
  const { exportRowsToExcel } = await import("@/lib/export-excel");
  const rows = buildEmployeeReportRows(data, "excel");

  await exportRowsToExcel(
    rows,
    buildEmployeeReportFilename(data, "xlsx"),
    "Employee",
    {
      wideColumns: ["التأخير"],
    }
  );
}

export {
  exportEmployeeReportPdf,
  exportWeeklyReportPdf,
} from "@/lib/report-export-pdf";
