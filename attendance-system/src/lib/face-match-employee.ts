import { hasRealFaceDescriptor } from "@/lib/face-descriptor-utils";
import {
  CURRENT_FACE_DESCRIPTOR_VERSION,
  getDescriptorSize,
} from "@/lib/face-descriptor-version";
import {
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
 * تحقق دفاعي صارم 1:N على الخادم قبل تسجيل الحضور/الانصراف.
 *
 * لا يكتفي بسؤال «هل يطابق الموظف المُدّعى؟» (الذي قد يقبل موظفاً مشابهاً)،
 * بل يتأكد أن الموظف المُدّعى هو **أقرب تطابق غير ملتبس** بين كل الموظفين
 * النشطين — أي يطبّق حارس الفجوة (minGap) نفسه الموجود في الكشك.
 *
 * هذا يمنع: لو أخطأ الكشك في الهوية لموظف مشابه، يرفضه الخادم.
 *
 * الأداء: O(n) لكنه سريع لأعداد متوسطة (≈150 موظف = استعلام واحد + 150 عملية
 * مسافة لا تتجاوز أجزاء من الملّي ثانية). مقايضة مقصودة لصالح الدقة.
 */
export async function verifyAttendanceFaceMatch(
  employeeId: string,
  descriptor: number[],
  version = CURRENT_FACE_DESCRIPTOR_VERSION
): Promise<boolean> {
  if (!isValidFaceDescriptor(descriptor, version)) return false;

  const expectedSize = getDescriptorSize(version);

  const employees = await prisma.employee.findMany({
    where: {
      isActive: true,
      hasFaceRegistered: true,
      faceDescriptorVersion: version,
    },
    select: { id: true, faceDescriptor: true, faceDescriptorVersion: true },
  });

  const candidates: Array<{ id: string; distance: number }> = [];
  let claimedExists = false;

  for (const employee of employees) {
    if (employee.id === employeeId) claimedExists = true;

    if (
      !hasRealFaceDescriptor(
        employee.faceDescriptor,
        employee.faceDescriptorVersion
      )
    ) {
      continue;
    }
    if (employee.faceDescriptor.length !== expectedSize) continue;

    const distance = computeFaceMatchDistance(
      employee.faceDescriptor,
      descriptor,
      version
    );
    if (distance === null) continue;

    candidates.push({ id: employee.id, distance });
  }

  // الموظف المُدّعى يجب أن يكون نشطاً ومسجّلاً أصلاً.
  if (!claimedExists) return false;

  const best = selectBestFaceMatch(candidates, "recognize", version);
  return best?.id === employeeId;
}
