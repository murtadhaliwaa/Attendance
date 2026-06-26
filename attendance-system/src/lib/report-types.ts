import type { Status, Method } from "@prisma/client";

export type ReportFilters = {
  from?: string;
  to?: string;
  department?: string;
  status?: string;
  search?: string;
  shiftId?: string;
};

export type WeeklyEmployeeSummary = {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  department: string;
  present: number;
  late: number;
  earlyLeave: number;
  absent: number;
  workingDays: number;
  lateDetails: string;
  lateDays: {
    date: string;
    dayName: string;
    lateMinutes: number;
  }[];
  totalLateMinutes: number;
};

export type WeeklyReportData = {
  from: string;
  to: string;
  shiftId: string | null;
  shiftName: string | null;
  shiftStartTime: string | null;
  shiftEndTime: string | null;
  employees: WeeklyEmployeeSummary[];
};

export type EmployeeDayStatus = Status | "WEEKEND" | "UPCOMING" | "PENDING";

export type EmployeeDayRecord = {
  date: string;
  dayName: string;
  status: EmployeeDayStatus;
  checkIn: string | null;
  checkOut: string | null;
  isWorkingDay: boolean;
  lateMinutes: number | null;
  checkInMethod: Method | null;
  checkOutMethod: Method | null;
  checkInSupervisorName: string | null;
  checkOutSupervisorName: string | null;
};

export type EmployeeReportSummary = {
  workingDays: number;
  present: number;
  late: number;
  earlyLeave: number;
  absent: number;
  weekends: number;
  attendanceRate: number;
};

export type EmployeeReportData = {
  from: string;
  to: string;
  employee: {
    id: string;
    name: string;
    employeeCode: string;
    department: string;
    position: string;
  };
  summary: EmployeeReportSummary;
  days: EmployeeDayRecord[];
};
