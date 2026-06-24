import { hasRealFaceDescriptor } from "@/lib/face-descriptor-utils";
import {
  selectBestFaceMatch,
  type FaceMatchPurpose,
} from "@/lib/face-match-config";
import {
  euclideanDistance,
  isValidFaceDescriptor,
} from "@/lib/face-verify-server";
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
  purpose: FaceMatchPurpose = "duplicate"
): Promise<FaceMatchEmployee | null> {
  if (!isValidFaceDescriptor(descriptor)) return null;

  const employees = await prisma.employee.findMany({
    where: {
      hasFaceRegistered: true,
      ...(excludeEmployeeId ? { NOT: { id: excludeEmployeeId } } : {}),
    },
    select: {
      id: true,
      name: true,
      employeeCode: true,
      faceDescriptor: true,
    },
  });

  const candidates: Array<FaceMatchEmployee & { distance: number }> = [];

  for (const employee of employees) {
    if (!hasRealFaceDescriptor(employee.faceDescriptor)) continue;

    const distance = euclideanDistance(employee.faceDescriptor, descriptor);
    candidates.push({
      id: employee.id,
      name: employee.name,
      employeeCode: employee.employeeCode,
      distance,
    });
  }

  const best = selectBestFaceMatch(candidates, purpose);
  if (!best) return null;

  return {
    id: best.id,
    name: best.name,
    employeeCode: best.employeeCode,
  };
}
