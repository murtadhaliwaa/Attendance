import { hasRealFaceDescriptor } from "@/lib/face-descriptor-utils";
import {
  CURRENT_FACE_DESCRIPTOR_VERSION,
  getDescriptorSize,
} from "@/lib/face-descriptor-version";
import {
  getFaceMatchThresholds,
  selectBestFaceMatch,
  type FaceMatchPurpose,
} from "@/lib/face-match-config";
import { computeFaceMatchDistance } from "@/lib/face-match-distance";
import { isValidFaceDescriptor } from "@/lib/face-verify-server";
import { prisma } from "@/lib/prisma";

export type FaceMatchEmployee = {
  id: string;
  name: string;
  employeeCode: string;
};

export type { FaceMatchPurpose };

export async function findEmployeeByFaceDescriptor(
  descriptor: number[],
  excludeEmployeeId?: string,
  purpose: FaceMatchPurpose = "duplicate",
  version = CURRENT_FACE_DESCRIPTOR_VERSION
): Promise<FaceMatchEmployee | null> {
  if (!isValidFaceDescriptor(descriptor, version)) return null;

  const employees = await prisma.employee.findMany({
    where: {
      hasFaceRegistered: true,
      faceDescriptorVersion: version,
      ...(excludeEmployeeId ? { NOT: { id: excludeEmployeeId } } : {}),
    },
    select: {
      id: true,
      name: true,
      employeeCode: true,
      faceDescriptor: true,
      faceDescriptorVersion: true,
    },
  });

  const candidates: Array<FaceMatchEmployee & { distance: number }> = [];

  for (const employee of employees) {
    if (
      !hasRealFaceDescriptor(
        employee.faceDescriptor,
        employee.faceDescriptorVersion
      )
    ) {
      continue;
    }
    if (employee.faceDescriptor.length !== getDescriptorSize(version)) continue;

    const distance = computeFaceMatchDistance(
      employee.faceDescriptor,
      descriptor,
      version
    );
    if (distance === null) continue;

    candidates.push({
      id: employee.id,
      name: employee.name,
      employeeCode: employee.employeeCode,
      distance,
    });
  }

  const best = selectBestFaceMatch(candidates, purpose, version);
  if (!best) return null;

  return {
    id: best.id,
    name: best.name,
    employeeCode: best.employeeCode,
  };
}

/**
 * تحقق مباشر O(1) — يجلب بصمة الموظف المُدّعى فقط ويقارنها بالعتبة.
 * لا يمسح كل الموظفين (الكشك حدّد الهوية مسبقاً عبر المطابقة المحلية)،
 * ما يجعل الحضور/الانصراف ثابت التكلفة مهما زاد عدد الموظفين.
 */
export async function verifyAttendanceFaceMatch(
  employeeId: string,
  descriptor: number[],
  version = CURRENT_FACE_DESCRIPTOR_VERSION
): Promise<boolean> {
  if (!isValidFaceDescriptor(descriptor, version)) return false;

  const employee = await prisma.employee.findFirst({
    where: {
      id: employeeId,
      isActive: true,
      hasFaceRegistered: true,
      faceDescriptorVersion: version,
    },
    select: { faceDescriptor: true, faceDescriptorVersion: true },
  });

  if (!employee) return false;
  if (
    !hasRealFaceDescriptor(
      employee.faceDescriptor,
      employee.faceDescriptorVersion
    )
  ) {
    return false;
  }
  if (employee.faceDescriptor.length !== getDescriptorSize(version)) return false;

  const distance = computeFaceMatchDistance(
    employee.faceDescriptor,
    descriptor,
    version
  );
  if (distance === null) return false;

  return distance <= getFaceMatchThresholds(version).match;
}
