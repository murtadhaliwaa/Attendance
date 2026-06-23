import type { EmployeeReportData, WeeklyReportData } from "@/lib/report-types";
import {
  buildEmployeeReportFilename,
  buildEmployeeReportRows,
  buildEmployeeReportTitleLines,
  buildWeeklyReportFilename,
  buildWeeklyReportRows,
  buildWeeklyReportTitleLines,
  EMPLOYEE_REPORT_HEADERS,
  rowsToMatrix,
  WEEKLY_REPORT_HEADERS,
} from "@/lib/report-export-data";

const WEEKLY_WIDE_COLUMNS = [6, 7];
const EMPLOYEE_WIDE_COLUMNS = [5];

export async function exportWeeklyReportPdf(data: WeeklyReportData) {
  const { exportTableToPdf } = await import("@/lib/export-pdf");
  const rows = buildWeeklyReportRows(data, "pdf");

  await exportTableToPdf({
    filename: buildWeeklyReportFilename(data, "pdf"),
    titleLines: buildWeeklyReportTitleLines(data),
    headers: WEEKLY_REPORT_HEADERS,
    rows: rowsToMatrix(rows, WEEKLY_REPORT_HEADERS),
    landscape: true,
    wideColumnIndexes: WEEKLY_WIDE_COLUMNS,
  });
}

export async function exportEmployeeReportPdf(data: EmployeeReportData) {
  const { exportTableToPdf } = await import("@/lib/export-pdf");
  const rows = buildEmployeeReportRows(data, "pdf");

  await exportTableToPdf({
    filename: buildEmployeeReportFilename(data, "pdf"),
    titleLines: buildEmployeeReportTitleLines(data),
    headers: EMPLOYEE_REPORT_HEADERS,
    rows: rowsToMatrix(rows, EMPLOYEE_REPORT_HEADERS),
    wideColumnIndexes: EMPLOYEE_WIDE_COLUMNS,
  });
}
