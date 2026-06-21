import Link from "next/link";
import { AlertTriangle, UserX } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import {
  AlertTypeLabel,
  StatusLabel,
} from "@/components/dashboard/type-label";
import { TimeCell } from "@/components/dashboard/time-cell";
import {
  formatLateDuration,
  formatTimeAr,
  getEffectiveCheckInStatus,
} from "@/lib/attendance-utils";
import { employeeShiftSelect } from "@/lib/employee-shift";
import { resolveEmployeeShift } from "@/lib/attendance-shift";
import { getShiftTimingsBundle } from "@/lib/attendance-reconcile";
import { getTodayDate } from "@/lib/app-timezone";

export default async function DashboardPage() {
  const today = getTodayDate();

  const [
    { allShifts, defaultShift },
    employeeCount,
    statusGroups,
    recentRecords,
    recentAlerts,
  ] = await Promise.all([
    getShiftTimingsBundle(),
    prisma.employee.count({ where: { isActive: true } }),
    prisma.attendance.groupBy({
      by: ["status"],
      where: { date: today },
      _count: { _all: true },
    }),
    prisma.attendance.findMany({
      where: { date: today, checkIn: { not: null } },
      take: 5,
      orderBy: { checkIn: "desc" },
      select: {
        id: true,
        checkIn: true,
        checkOut: true,
        status: true,
        employee: {
          select: {
            name: true,
            customEndTime: true,
            shift: { select: employeeShiftSelect },
          },
        },
      },
    }),
    prisma.alert.findMany({
      where: { isRead: false },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  const todayAttendanceCount = statusGroups.reduce(
    (sum, group) => sum + group._count._all,
    0
  );
  const lateToday =
    statusGroups.find((group) => group.status === "LATE")?._count._all ?? 0;
  const unreadAlerts = recentAlerts.length;

  const attendanceRows = recentRecords.map((record) => {
    const shift = resolveEmployeeShift(
      record.employee,
      record.checkIn,
      { allShifts, defaultShift }
    );
    const { status, lateMinutes } = getEffectiveCheckInStatus(
      record.checkIn,
      shift
    );
    const displayStatus =
      record.status === "EARLY_LEAVE" ? record.status : status;

    return {
      id: record.id,
      employeeName: record.employee.name,
      checkIn: record.checkIn,
      checkOut: record.checkOut,
      status: displayStatus,
      lateMinutes:
        displayStatus === "LATE" || status === "LATE" ? lateMinutes : 0,
    };
  });

  const absentEstimate = Math.max(employeeCount - todayAttendanceCount, 0);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        <span className="text-text-secondary">
          {todayAttendanceCount} حضور من {employeeCount}
        </span>
        <span className="text-text-muted">·</span>
        <span className="font-semibold text-amber-200">
          {lateToday} متأخر
        </span>
        <span className="text-text-muted">·</span>
        <span className="font-semibold text-rose-200">
          {absentEstimate} غائب
        </span>
        <span className="text-text-muted">·</span>
        <span className="text-text-secondary">{unreadAlerts} تنبيه</span>
      </p>

      {recentAlerts.length > 0 && (
        <Card className="border border-bg-border bg-bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-text-primary">
              <AlertTriangle className="size-4 text-text-muted" />
              تنبيهات
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-0">
            {recentAlerts.map((alert) => (
              <div
                key={alert.id}
                className="border-b border-bg-border py-3 last:border-0"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <AlertTypeLabel type={alert.type} />
                  <span className="text-sm text-text-primary">
                    {alert.employeeName}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-text-muted">
                  {alert.message}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card className="border border-bg-border bg-bg-card">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-sm font-medium text-text-primary">
            آخر تسجيلات اليوم
          </CardTitle>
          <Link
            href="/dashboard/reports"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
          >
            التقارير
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-right">الموظف</TableHead>
                <TableHead className="text-center">الحضور</TableHead>
                <TableHead className="text-center">الانصراف</TableHead>
                <TableHead className="text-center">الحالة</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attendanceRows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="py-10 text-center text-text-muted"
                  >
                    <UserX className="mx-auto mb-2 size-6 opacity-40" />
                    لا توجد تسجيلات اليوم
                  </TableCell>
                </TableRow>
              ) : (
                attendanceRows.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="text-text-primary">
                      {record.employeeName}
                    </TableCell>
                    <TableCell className="text-center">
                      <TimeCell
                        value={
                          record.checkIn ? formatTimeAr(record.checkIn) : null
                        }
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <TimeCell
                        value={
                          record.checkOut
                            ? formatTimeAr(record.checkOut)
                            : null
                        }
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex flex-col items-center gap-1">
                        <StatusLabel status={record.status} />
                        {record.lateMinutes > 0 && (
                          <span className="text-xs text-amber-200">
                            تأخر {formatLateDuration(record.lateMinutes)}
                          </span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
