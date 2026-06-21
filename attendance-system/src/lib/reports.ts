import { eachDayOfInterval, format } from "date-fns";
import { arSA } from "date-fns/locale";
import type { Status } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { toDateKey, isFutureDateKey, isTodayDateKey } from "@/lib/app-timezone";
import { formatTimeAr } from "@/lib/attendance-utils";
import { parseDateRangeStrings } from "@/lib/report-week";
import type {
  EmployeeDayRecord,
  EmployeeDayStatus,
  EmployeeReportData,
  EmployeeReportSummary,
  ReportFilters,
  WeeklyEmployeeSummary,
  WeeklyReportData,
} from "@/lib/report-types";

function resolveDateRange(filters: ReportFilters) {
  return parseDateRangeStrings(filters.from, filters.to);
}

function resolveDayWithoutRecord(dayKey: string): EmployeeDayStatus {
  if (isFutureDateKey(dayKey)) return "UPCOMING";
  if (isTodayDateKey(dayKey)) return "PENDING";
  return "ABSENT";
}

function summarizeEmployeeWeek(
  employeeId: string,
  employee: {
    employeeCode: string;
    name: string;
    department: string;
  },
  days: Date[],
  attendanceByDate: Map<string, { status: Status }>
): WeeklyEmployeeSummary {
  let present = 0;
  let late = 0;
  let earlyLeave = 0;
  let absent = 0;
  let workingDays = 0;

  for (const day of days) {
    const dayKey = toDateKey(day);

    if (isFutureDateKey(dayKey)) {
      continue;
    }

    workingDays += 1;
    const record = attendanceByDate.get(dayKey);

    if (!record) {
      if (!isTodayDateKey(dayKey)) {
        absent += 1;
      }
      continue;
    }

    if (record.status === "PRESENT") present += 1;
    else if (record.status === "LATE") late += 1;
    else if (record.status === "EARLY_LEAVE") earlyLeave += 1;
    else if (record.status === "ABSENT") absent += 1;
  }

  return {
    employeeId,
    employeeCode: employee.employeeCode,
    employeeName: employee.name,
    department: employee.department,
    present,
    late,
    earlyLeave,
    absent,
    workingDays,
  };
}

export async function getWeeklyReport(
  filters: Pick<ReportFilters, "from" | "to" | "shiftId"> = {}
): Promise<WeeklyReportData> {
  const { from, to } = resolveDateRange(filters);
  const days = eachDayOfInterval({ start: from, end: to });
  const shiftId = filters.shiftId?.trim() || undefined;

  const [employees, shift] = await Promise.all([
    prisma.employee.findMany({
      where: {
        isActive: true,
        ...(shiftId ? { shiftId } : {}),
      },
      select: {
        id: true,
        name: true,
        employeeCode: true,
        department: true,
      },
      orderBy: { name: "asc" },
    }),
    shiftId
      ? prisma.workSchedule.findUnique({
          where: { id: shiftId },
          select: { name: true, startTime: true, endTime: true },
        })
      : Promise.resolve(null),
  ]);

  if (employees.length === 0) {
    return {
      from: toDateKey(from),
      to: toDateKey(to),
      shiftId: shiftId ?? null,
      shiftName: shift?.name ?? null,
      shiftStartTime: shift?.startTime ?? null,
      shiftEndTime: shift?.endTime ?? null,
      employees: [],
    };
  }

  const attendances = await prisma.attendance.findMany({
    where: {
      date: { gte: from, lte: to },
      employeeId: { in: employees.map((e) => e.id) },
    },
    select: {
      employeeId: true,
      date: true,
      status: true,
    },
  });

  const attendanceByEmployee = new Map<string, Map<string, { status: Status }>>();

  for (const record of attendances) {
    const dayKey = toDateKey(record.date);
    if (!attendanceByEmployee.has(record.employeeId)) {
      attendanceByEmployee.set(record.employeeId, new Map());
    }
    attendanceByEmployee
      .get(record.employeeId)!
      .set(dayKey, { status: record.status });
  }

  const summaries = employees.map((employee) =>
    summarizeEmployeeWeek(
      employee.id,
      employee,
      days,
      attendanceByEmployee.get(employee.id) ?? new Map()
    )
  );

  const shiftName: string | null = shift?.name ?? null;
  const shiftStartTime: string | null = shift?.startTime ?? null;
  const shiftEndTime: string | null = shift?.endTime ?? null;

  return {
    from: toDateKey(from),
    to: toDateKey(to),
    shiftId: shiftId ?? null,
    shiftName,
    shiftStartTime,
    shiftEndTime,
    employees: summaries,
  };
}

function buildEmployeeSummary(days: EmployeeDayRecord[]): EmployeeReportSummary {
  const present = days.filter((d) => d.status === "PRESENT").length;
  const late = days.filter((d) => d.status === "LATE").length;
  const earlyLeave = days.filter((d) => d.status === "EARLY_LEAVE").length;
  const absent = days.filter((d) => d.status === "ABSENT").length;
  const attended = present + late + earlyLeave;
  const accountableDays = days.filter(
    (d) => d.status !== "UPCOMING" && d.status !== "PENDING"
  );
  const attendanceRate =
    accountableDays.length > 0
      ? Math.round((attended / accountableDays.length) * 100)
      : 0;

  return {
    workingDays: accountableDays.length,
    present,
    late,
    earlyLeave,
    absent,
    weekends: 0,
    attendanceRate,
  };
}

export async function getEmployeeReport(
  employeeId: string,
  filters: ReportFilters = {}
): Promise<EmployeeReportData> {
  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, isActive: true },
    select: {
      id: true,
      name: true,
      employeeCode: true,
      department: true,
      position: true,
    },
  });

  if (!employee) {
    throw new Error("الموظف غير موجود");
  }

  const { from, to } = resolveDateRange(filters);

  const attendances = await prisma.attendance.findMany({
    where: {
      employeeId,
      date: { gte: from, lte: to },
    },
    select: {
      date: true,
      status: true,
      checkIn: true,
      checkOut: true,
    },
    orderBy: { date: "asc" },
  });

  const attendanceByDate = new Map(
    attendances.map((a) => [toDateKey(a.date), a])
  );

  const days: EmployeeDayRecord[] = eachDayOfInterval({ start: from, end: to }).map(
    (day) => {
      const dayKey = toDateKey(day);
      const record = attendanceByDate.get(dayKey);

      if (record) {
        return {
          date: dayKey,
          dayName: format(day, "EEEE", { locale: arSA }),
          status: record.status,
          checkIn: record.checkIn ? formatTimeAr(record.checkIn) : null,
          checkOut: record.checkOut ? formatTimeAr(record.checkOut) : null,
          isWorkingDay: true,
        };
      }

      return {
        date: dayKey,
        dayName: format(day, "EEEE", { locale: arSA }),
        status: resolveDayWithoutRecord(dayKey),
        checkIn: null,
        checkOut: null,
        isWorkingDay: true,
      };
    }
  );

  return {
    from: toDateKey(from),
    to: toDateKey(to),
    employee,
    summary: buildEmployeeSummary(days),
    days,
  };
}
