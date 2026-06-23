"use client";

import { Fragment, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  Search,
  X,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { arSA } from "date-fns/locale";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { parseJsonResponse } from "@/lib/api-utils";
import { formatLateDuration } from "@/lib/attendance-utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  exportEmployeeReportExcel,
  exportEmployeeReportPdf,
  exportWeeklyReportExcel,
  exportWeeklyReportPdf,
} from "@/lib/report-export";
import type { ReportFileFormat } from "@/lib/report-export-data";
import { formatReportPeriod, getWeekStringsByOffset } from "@/lib/report-week";
import type { EmployeeReportData, WeeklyReportData } from "@/lib/report-types";
import type { ShiftOption } from "@/lib/employee-types";
import { formatShiftRangeLabel } from "@/lib/schedule-utils";
import { DayStatusBadge } from "@/components/dashboard/day-status-badge";
import { SelectionCard } from "@/components/dashboard/selection-card";
import { TimeCell } from "@/components/dashboard/time-cell";
import { cn } from "@/lib/utils";
import { usePermission } from "@/components/dashboard/role-context";

async function fetchEmployeeReport(
  employeeId: string,
  from: string,
  to: string
): Promise<EmployeeReportData> {
  const params = new URLSearchParams({ employeeId, from, to });
  const res = await fetch(`/api/reports/employee?${params}`);
  const result = await parseJsonResponse<
    EmployeeReportData & { error?: string }
  >(res);

  if (!res.ok) {
    throw new Error(result.error ?? "فشل تحميل تقرير الموظف");
  }

  return result;
}

function EmployeeReportDetail({
  employeeReport,
  loading,
  weekFrom,
  weekTo,
  exportingFormat,
  canExport,
  onExport,
  onClose,
}: {
  employeeReport: EmployeeReportData | null;
  loading: boolean;
  weekFrom: string;
  weekTo: string;
  exportingFormat: ReportFileFormat | null;
  canExport: boolean;
  onExport: (format: ReportFileFormat) => void;
  onClose: () => void;
}) {
  return (
    <div className="flex max-h-[min(60vh,32rem)] flex-col overflow-hidden rounded-lg border border-bg-border bg-bg-elevated/40">
      <div className="flex shrink-0 items-start justify-between gap-3 border-b border-bg-border bg-bg-card px-4 py-3">
        <div>
          <p className="text-base font-semibold text-text-primary">
            {employeeReport
              ? `تقرير ${employeeReport.employee.name}`
              : "جاري تحميل التقرير..."}
          </p>
          {employeeReport && (
            <p className="mt-1 text-xs text-text-muted">
              {employeeReport.employee.employeeCode} ·{" "}
              {employeeReport.employee.department} ·{" "}
              {formatReportPeriod(weekFrom, weekTo)}
            </p>
          )}
        </div>

        <div className="flex gap-2">
          {employeeReport && canExport && (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!!exportingFormat}
                    className="border-transparent bg-blue-primary text-white shadow-sm hover:bg-blue-dark hover:text-white"
                  />
                }
              >
                {exportingFormat ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Download className="size-4" />
                )}
                تحميل التقرير
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onExport("excel")}>
                  <FileSpreadsheet className="size-4" />
                  تحميل Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onExport("pdf")}>
                  <FileText className="size-4" />
                  تحميل PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="size-8 shrink-0"
            onClick={onClose}
            aria-label="إغلاق"
          >
            <X className="size-4" />
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="size-6 animate-spin text-text-muted" />
          </div>
        ) : employeeReport ? (
          <Table>
            <TableHeader>
              <TableRow className="sticky top-0 z-10 bg-bg-elevated hover:bg-transparent">
                <TableHead className="bg-bg-elevated text-center">التاريخ</TableHead>
                <TableHead className="bg-bg-elevated text-center">اليوم</TableHead>
                <TableHead className="bg-bg-elevated text-center">الحالة</TableHead>
                <TableHead className="bg-bg-elevated text-center">الحضور</TableHead>
                <TableHead className="bg-bg-elevated text-center">الانصراف</TableHead>
                <TableHead className="bg-bg-elevated text-center">التأخير</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employeeReport.days.map((day) => (
                <TableRow
                  key={day.date}
                  className={
                    day.status === "ABSENT"
                      ? "bg-rose-500/5"
                      : day.status === "WEEKEND" ||
                          day.status === "UPCOMING" ||
                          day.status === "PENDING"
                        ? "bg-bg-elevated/40"
                        : undefined
                  }
                >
                  <TableCell className="text-center text-text-muted">
                    {format(parseISO(day.date), "d/M/yyyy", {
                      locale: arSA,
                    })}
                  </TableCell>
                  <TableCell className="text-center text-text-secondary">
                    {day.dayName}
                  </TableCell>
                  <TableCell className="text-center">
                    <DayStatusBadge status={day.status} />
                  </TableCell>
                  <TableCell className="text-center">
                    <TimeCell value={day.checkIn} />
                  </TableCell>
                  <TableCell className="text-center">
                    <TimeCell value={day.checkOut} />
                  </TableCell>
                  <TableCell className="text-center text-amber-200">
                    {day.lateMinutes && day.lateMinutes > 0
                      ? formatLateDuration(day.lateMinutes)
                      : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : null}
      </div>
    </div>
  );
}

interface ReportsManagerProps {
  initialData: WeeklyReportData;
  shifts: ShiftOption[];
}

export function ReportsManager({ initialData, shifts }: ReportsManagerProps) {
  const canExport = usePermission("reports:export");
  const [data, setData] = useState(initialData);
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedShiftId, setSelectedShiftId] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [exportingAll, setExportingAll] = useState<ReportFileFormat | null>(null);
  const [exportingEmployeeId, setExportingEmployeeId] = useState<string | null>(
    null
  );
  const [exportingEmployeeFormat, setExportingEmployeeFormat] =
    useState<ReportFileFormat | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(
    null
  );
  const [employeeReport, setEmployeeReport] =
    useState<EmployeeReportData | null>(null);
  const [loadingEmployee, setLoadingEmployee] = useState(false);

  const filteredEmployees = data.employees.filter((emp) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (
      emp.employeeName.toLowerCase().includes(q) ||
      emp.employeeCode.toLowerCase().includes(q) ||
      emp.department.toLowerCase().includes(q)
    );
  });

  async function loadWeek(nextOffset: number, shiftId = selectedShiftId) {
    setLoading(true);
    try {
      const week = getWeekStringsByOffset(nextOffset);
      const params = new URLSearchParams({ from: week.from, to: week.to });
      if (shiftId !== "all") {
        params.set("shiftId", shiftId);
      }
      const res = await fetch(`/api/reports?${params}`);
      const result = await parseJsonResponse<
        WeeklyReportData & { error?: string }
      >(res);

      if (!res.ok) {
        throw new Error(result.error ?? "فشل تحميل التقرير");
      }

      setWeekOffset(nextOffset);
      setSelectedShiftId(shiftId);
      setData(result);
      setSelectedEmployeeId(null);
      setEmployeeReport(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "فشل تحميل التقرير");
    } finally {
      setLoading(false);
    }
  }

  async function loadEmployeeReport(employeeId: string) {
    if (selectedEmployeeId === employeeId && employeeReport) {
      setSelectedEmployeeId(null);
      setEmployeeReport(null);
      return;
    }

    setSelectedEmployeeId(employeeId);
    setLoadingEmployee(true);
    try {
      const result = await fetchEmployeeReport(employeeId, data.from, data.to);
      setEmployeeReport(result);
    } catch (error) {
      setSelectedEmployeeId(null);
      setEmployeeReport(null);
      toast.error(
        error instanceof Error ? error.message : "فشل تحميل تقرير الموظف"
      );
    } finally {
      setLoadingEmployee(false);
    }
  }

  async function exportEmployeeReport(
    employeeId: string,
    format: ReportFileFormat,
    report?: EmployeeReportData | null
  ) {
    const exportFn =
      format === "excel" ? exportEmployeeReportExcel : exportEmployeeReportPdf;

    if (report) {
      await exportFn(report);
      return;
    }

    const result = await fetchEmployeeReport(employeeId, data.from, data.to);
    await exportFn(result);
  }

  async function downloadEmployeeReport(
    employeeId: string,
    format: ReportFileFormat
  ) {
    setExportingEmployeeId(employeeId);
    setExportingEmployeeFormat(format);
    try {
      const report =
        selectedEmployeeId === employeeId ? employeeReport : null;
      await exportEmployeeReport(employeeId, format, report);
      const name =
        report?.employee.name ??
        data.employees.find((emp) => emp.employeeId === employeeId)
          ?.employeeName ??
        "الموظف";
      toast.success(
        `تم تحميل تقرير ${name} (${format === "excel" ? "Excel" : "PDF"})`
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "فشل تحميل التقرير"
      );
    } finally {
      setExportingEmployeeId(null);
      setExportingEmployeeFormat(null);
    }
  }

  async function exportEmployeeDetail(format: ReportFileFormat) {
    if (!employeeReport) return;

    setExportingEmployeeFormat(format);
    try {
      await exportEmployeeReport(
        employeeReport.employee.id,
        format,
        employeeReport
      );
      toast.success(
        `تم تحميل تقرير ${employeeReport.employee.name} (${format === "excel" ? "Excel" : "PDF"})`
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "فشل تحميل التقرير"
      );
    } finally {
      setExportingEmployeeFormat(null);
    }
  }

  async function exportAll(format: ReportFileFormat) {
    setExportingAll(format);
    try {
      if (format === "excel") {
        await exportWeeklyReportExcel(data);
      } else {
        await exportWeeklyReportPdf(data);
      }
      toast.success(
        `تم تحميل التقرير الأسبوعي (${format === "excel" ? "Excel" : "PDF"})`
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "فشل تحميل التقرير"
      );
    } finally {
      setExportingAll(null);
    }
  }

  async function loadShift(shiftId: string) {
    if (shiftId === selectedShiftId) return;
    await loadWeek(weekOffset, shiftId);
  }

  const totals = data.employees.reduce(
    (acc, emp) => ({
      present: acc.present + emp.present,
      late: acc.late + emp.late,
      absent: acc.absent + emp.absent,
    }),
    { present: 0, late: 0, absent: 0 }
  );

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div>
        <h1 className="text-xl font-bold text-text-primary">التقارير الأسبوعية</h1>
        <p className="mt-1 text-sm text-text-muted">
          تقرير حضور الموظفين لأسبوع الراتب — حسب الشفت أو للجميع
        </p>
      </div>

      <Card className="border border-bg-border bg-bg-card">
        <CardHeader className="pb-3">
          <div className="space-y-3">
            <div>
              <p className="mb-2 text-sm font-medium text-text-primary">الشفت</p>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <SelectionCard
                  title="جميع الشفتات"
                  subtitle="كل الموظفين النشطين"
                  selected={selectedShiftId === "all"}
                  disabled={loading}
                  onClick={() => loadShift("all")}
                />
                {shifts.map((shift) => (
                  <SelectionCard
                    key={shift.id}
                    title={shift.name}
                    subtitle={formatShiftRangeLabel(
                      shift.startTime,
                      shift.endTime
                    )}
                    selected={selectedShiftId === shift.id}
                    disabled={loading}
                    onClick={() => loadShift(shift.id)}
                  />
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-bg-border pt-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center justify-center gap-2 sm:justify-start">
              <Button
                variant="outline"
                size="icon"
                disabled={loading}
                onClick={() => loadWeek(weekOffset + 1)}
                aria-label="الأسبوع السابق"
              >
                <ChevronRight className="size-4" />
              </Button>

              <div className="min-w-[180px] text-center">
                {loading ? (
                  <Loader2 className="mx-auto size-5 animate-spin text-text-muted" />
                ) : (
                  <>
                    <p className="text-sm font-semibold text-text-primary">
                      {formatReportPeriod(data.from, data.to)}
                    </p>
                    <p className="text-xs text-text-muted">
                      {weekOffset === 0 ? "الأسبوع الحالي" : `منذ ${weekOffset} أسبوع`}
                    </p>
                  </>
                )}
              </div>

              <Button
                variant="outline"
                size="icon"
                disabled={loading || weekOffset === 0}
                onClick={() => loadWeek(weekOffset - 1)}
                aria-label="الأسبوع التالي"
              >
                <ChevronLeft className="size-4" />
              </Button>
            </div>

            {canExport && (
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      size="sm"
                      disabled={!!exportingAll || data.employees.length === 0}
                      className="border-transparent bg-blue-primary text-white shadow-sm hover:bg-blue-dark hover:text-white disabled:opacity-50"
                    />
                  }
                >
                  {exportingAll ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <Download className="size-4" />
                  )}
                  تحميل تقرير الأسبوع
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => void exportAll("excel")}>
                    <FileSpreadsheet className="size-4" />
                    تحميل Excel
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => void exportAll("pdf")}>
                    <FileText className="size-4" />
                    تحميل PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            </div>
          </div>

          <p className="mt-3 text-sm text-text-secondary">
            {data.shiftName ? `${data.shiftName} · ` : ""}
            {data.employees.length} موظف · {totals.present} يوم حضور ·{" "}
            {totals.late} تأخير · {totals.absent} غياب
          </p>
        </CardHeader>
      </Card>

      <Card className="border border-bg-border bg-bg-card">
        <CardHeader className="pb-3">
          <div className="relative max-w-sm">
            <Search className="absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-text-muted" />
            <Input
              placeholder="بحث بالاسم أو الرقم..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-9"
            />
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-center">الموظف</TableHead>
                <TableHead className="text-center">القسم</TableHead>
                <TableHead className="text-center">حاضر</TableHead>
                <TableHead className="text-center">متأخر</TableHead>
                <TableHead className="text-center">غائب</TableHead>
                {canExport && (
                  <TableHead className="w-12 text-center">تحميل</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEmployees.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={canExport ? 6 : 5}
                    className="py-10 text-center text-text-muted"
                  >
                    {data.employees.length === 0
                      ? "لا يوجد موظفون مسجلون"
                      : "لا توجد نتائج للبحث"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredEmployees.map((emp) => {
                  const isSelected = selectedEmployeeId === emp.employeeId;
                  const isExporting = exportingEmployeeId === emp.employeeId;
                  const showReport = isSelected && (loadingEmployee || employeeReport);

                  return (
                    <Fragment key={emp.employeeId}>
                      <TableRow
                        className={cn(isSelected && "bg-bg-elevated/50")}
                      >
                        <TableCell className="text-center">
                          <button
                            type="button"
                            onClick={() => loadEmployeeReport(emp.employeeId)}
                            className="font-medium text-blue-primary hover:underline"
                          >
                            {emp.employeeName}
                          </button>
                          <p className="text-xs text-text-muted">
                            {emp.employeeCode}
                          </p>
                        </TableCell>
                        <TableCell className="text-center text-text-muted">
                          {emp.department}
                        </TableCell>
                        <TableCell className="text-center text-emerald-200">
                          {emp.present}
                        </TableCell>
                        <TableCell className="text-center text-amber-200">
                          {emp.late}
                        </TableCell>
                        <TableCell className="text-center text-rose-200">
                          {emp.absent}
                        </TableCell>
                        {canExport && (
                          <TableCell className="text-center">
                            <DropdownMenu>
                              <DropdownMenuTrigger
                                render={
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-8"
                                    disabled={isExporting}
                                    aria-label={`تحميل تقرير ${emp.employeeName}`}
                                  />
                                }
                              >
                                {isExporting ? (
                                  <Loader2 className="size-4 animate-spin" />
                                ) : (
                                  <Download className="size-4" />
                                )}
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() =>
                                    void downloadEmployeeReport(
                                      emp.employeeId,
                                      "excel"
                                    )
                                  }
                                >
                                  <FileSpreadsheet className="size-4" />
                                  Excel
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() =>
                                    void downloadEmployeeReport(
                                      emp.employeeId,
                                      "pdf"
                                    )
                                  }
                                >
                                  <FileText className="size-4" />
                                  PDF
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        )}
                      </TableRow>

                      {showReport && (
                        <TableRow className="hover:bg-transparent">
                          <TableCell colSpan={canExport ? 6 : 5} className="p-3">
                            <EmployeeReportDetail
                              employeeReport={
                                isSelected ? employeeReport : null
                              }
                              loading={loadingEmployee && isSelected}
                              weekFrom={data.from}
                              weekTo={data.to}
                              exportingFormat={exportingEmployeeFormat}
                              canExport={canExport}
                              onExport={(format) =>
                                void exportEmployeeDetail(format)
                              }
                              onClose={() => {
                                setSelectedEmployeeId(null);
                                setEmployeeReport(null);
                              }}
                            />
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
