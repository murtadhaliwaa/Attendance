import type { EmployeeRow } from "@/lib/employee-types";

import { needsFaceReEnrollment } from "@/lib/face-descriptor-utils";

export const employeeListSelect = {
  id: true,
  employeeCode: true,
  name: true,
  department: true,
  position: true,
  phone: true,
  shiftId: true,
  customEndTime: true,
  isActive: true,
  hasFaceRegistered: true,
  hasReferencePhoto: true,
  referencePhotoUrl: true,
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
  shiftId: string | null;
  customEndTime: string | null;
  isActive: boolean;
  hasFaceRegistered: boolean;
  hasReferencePhoto: boolean;
  referencePhotoUrl: string | null;
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
    shiftId: employee.shiftId,
    shiftName: employee.shift?.name ?? null,
    customEndTime: employee.customEndTime,
    isActive: employee.isActive,
    hasFace: employee.hasFaceRegistered,
    hasReferencePhoto: employee.hasReferencePhoto,
    referencePhotoUrl: employee.referencePhotoUrl,
    needsFaceReEnrollment: needsFaceReEnrollment(
      employee.faceDescriptorVersion,
      employee.hasFaceRegistered
    ),
  };
}
