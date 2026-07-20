import { eachDayOfInterval, format } from "date-fns";
import { arSA } from "date-fns/locale";
import type { Status } from "@prisma/client";
import { getShiftTimingsBundle } from "@/lib/attendance-reconcile";
import {
  isCheckInCounted,
  isCheckOutCounted,
} from "@/lib/attendance-verification";
import { formatTimeAr } from "@/lib/attendance-utils";
import { employeeShiftSelect } from "@/lib/employee-shift";
import { prisma } from "@/lib/prisma";
import { toDateKey, isFutureDateKey, isTodayDateKey } from "@/lib/app-timezone";
import { parseDateRangeStrings } from "@/lib/report-week";
import {
  computeLateMinutes,
  formatLateDetails,
  sumLateMinutes,
  type EmployeeShiftInfo,
  type LateDayDetail,
} from "@/lib/report-late-details";
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
  employee: EmployeeShiftInfo & {
    employeeCode: string;
    name: string;
    department: string;
  },
  days: Date[],
  attendanceByDate: Map<
    string,
    { kind: "counted" | "awaiting"; status?: Status; checkIn: Date | null }
  >,
  shiftContext: Awaited<ReturnType<typeof getShiftTimingsBundle>>
): WeeklyEmployeeSummary {
  let present = 0;
  let late = 0;
  let earlyLeave = 0;
  let absent = 0;
  let awaitingReview = 0;
  let workingDays = 0;
  const lateDays: LateDayDetail[] = [];

  for (const day of days) {
    const dayKey = toDateKey(day);

    if (isFutureDateKey(dayKey)) {
      continue;
    }

    const record = attendanceByDate.get(dayKey);

    if (record?.kind === "awaiting") {
      // أيام بانتظار التأكيد لا تُحسب غياباً ولا حضورًا
      awaitingReview += 1;
      continue;
    }

    workingDays += 1;

    if (!record) {
      if (!isTodayDateKey(dayKey)) {
        absent += 1;
      }
      continue;
    }

    if (record.status === "PRESENT") present += 1;
    else if (record.status === "LATE") {
      late += 1;
      if (record.checkIn) {
        const lateMinutes = computeLateMinutes(
          employee,
          record.checkIn,
          shiftContext
        );
        if (lateMinutes > 0) {
          lateDays.push({
            date: dayKey,
            dayName: format(day, "EEEE", { locale: arSA }),
            lateMinutes,
          });
        }
      }
    } else if (record.status === "EARLY_LEAVE") earlyLeave += 1;
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
    awaitingReview,
    workingDays,
    lateDetails: formatLateDetails(lateDays),
    lateDays,
    totalLateMinutes: sumLateMinutes(lateDays),
  };
}

export async function getWeeklyReport(
  filters: Pick<ReportFilters, "from" | "to" | "shiftId"> = {}
): Promise<WeeklyReportData> {
  const { from, to } = resolveDateRange(filters);
  const days = eachDayOfInterval({ start: from, end: to });
  const shiftId = filters.shiftId?.trim() || undefined;

  const [employees, shift, shiftContext] = await Promise.all([
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
        customEndTime: true,
        shift: { select: employeeShiftSelect },
      },
      orderBy: { name: "asc" },
    }),
    shiftId
      ? prisma.workSchedule.findUnique({
          where: { id: shiftId },
          select: { name: true, startTime: true, endTime: true },
        })
      : Promise.resolve(null),
    getShiftTimingsBundle(),
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
      checkIn: true,
      checkInMethod: true,
      checkInVerificationStatus: true,
      checkOutMethod: true,
      checkOutVerificationStatus: true,
    },
  });

  const attendanceByEmployee = new Map<
    string,
    Map<
      string,
      { kind: "counted" | "awaiting"; status?: Status; checkIn: Date | null }
    >
  >();

  for (const record of attendances) {
    const dayKey = toDateKey(record.date);
    if (!attendanceByEmployee.has(record.employeeId)) {
      attendanceByEmployee.set(record.employeeId, new Map());
    }
    const byDate = attendanceByEmployee.get(record.employeeId)!;

    const checkInCounted = isCheckInCounted(
      record.checkInMethod,
      record.checkInVerificationStatus
    );

    if (!checkInCounted) {
      const awaiting =
        record.checkInVerificationStatus === "PENDING" ||
        record.checkOutVerificationStatus === "PENDING";
      if (awaiting) {
        byDate.set(dayKey, { kind: "awaiting", checkIn: record.checkIn });
      }
      continue;
    }

    const checkOutCounted = isCheckOutCounted(
      record.checkOutMethod,
      record.checkOutVerificationStatus
    );

    // حضور معتمد وانصراف صورة بانتظار التأكيد → لا يُحسب يوماً مكتملاً بعد
    if (
      record.checkOutMethod === "PHOTO" &&
      record.checkOutVerificationStatus === "PENDING"
    ) {
      byDate.set(dayKey, { kind: "awaiting", checkIn: record.checkIn });
      continue;
    }

    // لا تعتمد انصرافاً مبكراً قبل تأكيد صورة الانصراف
    let status = record.status;
    if (status === "EARLY_LEAVE" && !checkOutCounted) {
      status = "PRESENT";
    }

    byDate.set(dayKey, {
      kind: "counted",
      status,
      checkIn: record.checkIn,
    });
  }

  const summaries = employees.map((employee) =>
    summarizeEmployeeWeek(
      employee.id,
      employee,
      days,
      attendanceByEmployee.get(employee.id) ?? new Map(),
      shiftContext
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
    (d) =>
      d.status !== "UPCOMING" &&
      d.status !== "PENDING" &&
      d.status !== "AWAITING_REVIEW"
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
  const [employee, shiftContext] = await Promise.all([
    prisma.employee.findFirst({
      where: { id: employeeId, isActive: true },
      select: {
        id: true,
        name: true,
        employeeCode: true,
        department: true,
        position: true,
        customEndTime: true,
        shift: { select: employeeShiftSelect },
      },
    }),
    getShiftTimingsBundle(),
  ]);

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
      checkInMethod: true,
      checkOutMethod: true,
      checkInVerificationStatus: true,
      checkOutVerificationStatus: true,
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
        const checkInCounted = isCheckInCounted(
          record.checkInMethod,
          record.checkInVerificationStatus
        );
        const checkOutCounted = isCheckOutCounted(
          record.checkOutMethod,
          record.checkOutVerificationStatus
        );

        if (!checkInCounted) {
          const pending =
            record.checkInVerificationStatus === "PENDING" ||
            record.checkOutVerificationStatus === "PENDING";
          const checkoutPending =
            record.checkOutMethod === "PHOTO" &&
            record.checkOutVerificationStatus === "PENDING";
          const checkoutRejected =
            record.checkOutMethod === "PHOTO" &&
            record.checkOutVerificationStatus === "REJECTED";

          return {
            date: dayKey,
            dayName: format(day, "EEEE", { locale: arSA }),
            status: pending ? "AWAITING_REVIEW" : "ABSENT",
            checkIn:
              record.checkIn &&
              (pending ||
                record.checkInVerificationStatus === "REJECTED")
                ? formatTimeAr(record.checkIn)
                : null,
            checkOut:
              record.checkOut &&
              (checkOutCounted || checkoutPending || checkoutRejected)
                ? formatTimeAr(record.checkOut)
                : null,
            isWorkingDay: true,
            lateMinutes: null,
            checkInMethod: record.checkInMethod,
            checkOutMethod: record.checkOutMethod,
            checkInVerificationStatus: record.checkInVerificationStatus,
            checkOutVerificationStatus: record.checkOutVerificationStatus,
          };
        }

        let lateMinutes: number | null = null;
        let dayStatus: EmployeeDayStatus = record.status;

        const checkoutPending =
          record.checkOutMethod === "PHOTO" &&
          record.checkOutVerificationStatus === "PENDING";
        const checkoutRejected =
          record.checkOutMethod === "PHOTO" &&
          record.checkOutVerificationStatus === "REJECTED";

        // انصراف صورة معلّق أو مرفوض: اليوم ليس مكتملاً للعرض
        if (checkoutPending) {
          dayStatus = "AWAITING_REVIEW";
          if (record.checkIn) {
            const minutes = computeLateMinutes(
              employee,
              record.checkIn,
              shiftContext
            );
            lateMinutes = minutes > 0 ? minutes : null;
          }
        } else if (checkoutRejected) {
          // الحضور معتمد لكن الانصراف مرفوض — اعرض حالة الحضور مع شارة الرفض على الانصراف
          if (record.status === "EARLY_LEAVE") {
            if (record.checkIn) {
              const minutes = computeLateMinutes(
                employee,
                record.checkIn,
                shiftContext
              );
              if (minutes > 0) {
                dayStatus = "LATE";
                lateMinutes = minutes;
              } else {
                dayStatus = "PRESENT";
              }
            } else {
              dayStatus = "PRESENT";
            }
          } else if (record.status === "LATE" && record.checkIn) {
            const minutes = computeLateMinutes(
              employee,
              record.checkIn,
              shiftContext
            );
            lateMinutes = minutes > 0 ? minutes : null;
          }
        } else if (record.status === "EARLY_LEAVE" && !checkOutCounted) {
          if (record.checkIn) {
            const minutes = computeLateMinutes(
              employee,
              record.checkIn,
              shiftContext
            );
            if (minutes > 0) {
              dayStatus = "LATE";
              lateMinutes = minutes;
            } else {
              dayStatus = "PRESENT";
            }
          } else {
            dayStatus = "PRESENT";
          }
        } else if (record.status === "LATE" && record.checkIn) {
          const minutes = computeLateMinutes(
            employee,
            record.checkIn,
            shiftContext
          );
          lateMinutes = minutes > 0 ? minutes : null;
        }

        return {
          date: dayKey,
          dayName: format(day, "EEEE", { locale: arSA }),
          status: dayStatus,
          checkIn: record.checkIn ? formatTimeAr(record.checkIn) : null,
          checkOut:
            record.checkOut &&
            (checkOutCounted || checkoutPending || checkoutRejected)
              ? formatTimeAr(record.checkOut)
              : null,
          isWorkingDay: true,
          lateMinutes,
          checkInMethod: record.checkInMethod,
          checkOutMethod: record.checkOutMethod,
          checkInVerificationStatus: record.checkInVerificationStatus,
          checkOutVerificationStatus: record.checkOutVerificationStatus,
        };
      }

      return {
        date: dayKey,
        dayName: format(day, "EEEE", { locale: arSA }),
        status: resolveDayWithoutRecord(dayKey),
        checkIn: null,
        checkOut: null,
        isWorkingDay: true,
        lateMinutes: null,
        checkInMethod: null,
        checkOutMethod: null,
        checkInVerificationStatus: null,
        checkOutVerificationStatus: null,
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
