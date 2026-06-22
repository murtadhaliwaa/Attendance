import { hasRealFaceDescriptor } from "@/lib/face-descriptor-utils";
import {
  euclideanDistance,
  FACE_MATCH_THRESHOLD,
  isValidFaceDescriptor,
} from "@/lib/face-verify-server";
import { prisma } from "@/lib/prisma";

export type FaceMatchEmployee = {
  id: string;
  name: string;
  employeeCode: string;
};

export async function findEmployeeByFaceDescriptor(
  descriptor: number[],
  excludeEmployeeId?: string
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

  let best: (FaceMatchEmployee & { distance: number }) | null = null;

  for (const employee of employees) {
    if (!hasRealFaceDescriptor(employee.faceDescriptor)) continue;

    const distance = euclideanDistance(employee.faceDescriptor, descriptor);
    if (distance > FACE_MATCH_THRESHOLD) continue;

    if (!best || distance < best.distance) {
      best = {
        id: employee.id,
        name: employee.name,
        employeeCode: employee.employeeCode,
        distance,
      };
    }
  }

  if (!best) return null;

  return {
    id: best.id,
    name: best.name,
    employeeCode: best.employeeCode,
  };
}
