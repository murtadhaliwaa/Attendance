import type { EmployeeRow } from "@/lib/employee-types";

import { needsFaceReEnrollment } from "@/lib/face-descriptor-utils";

export const employeeListSelect = {
  id: true,
  employeeCode: true,
  name: true,
  department: true,
  position: true,
  phone: true,
  emergencyCode: true,
  shiftId: true,
  customEndTime: true,
  isActive: true,
  hasFaceRegistered: true,
  faceDescriptorVersion: true,
  shift: { select: { name: true } },
} as const;

export type EmployeeRecordForSerialize = {
  id: string;
  employeeCode: string;
  name: string;
  department: string;
  position: string;
  phone: string | null;
  emergencyCode: string;
  shiftId: string | null;
  customEndTime: string | null;
  isActive: boolean;
  hasFaceRegistered: boolean;
  faceDescriptorVersion: number;
  shift: { name: string } | null;
};

export const employeeWithShiftInclude = {
  shift: { select: { name: true } },
} as const;

export function serializeEmployee(
  employee: EmployeeRecordForSerialize
): EmployeeRow {
  return {
    id: employee.id,
    employeeCode: employee.employeeCode,
    name: employee.name,
    department: employee.department,
    position: employee.position,
    phone: employee.phone,
    emergencyCode: employee.emergencyCode,
    shiftId: employee.shiftId,
    shiftName: employee.shift?.name ?? null,
    customEndTime: employee.customEndTime,
    isActive: employee.isActive,
    hasFace: employee.hasFaceRegistered,
    needsFaceReEnrollment: needsFaceReEnrollment(
      employee.faceDescriptorVersion,
      employee.hasFaceRegistered
    ),
  };
}
