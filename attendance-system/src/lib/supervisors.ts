import { prisma } from "@/lib/prisma";
import type { SupervisorRow } from "@/lib/supervisor-types";

export async function getSupervisorRows(): Promise<SupervisorRow[]> {
  const supervisors = await prisma.shiftSupervisor.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, emergencyCode: true, isActive: true },
  });
  return supervisors;
}

/** يقترح رمزاً طارئاً جديداً غير مستخدم (6 أرقام) لمشرف جديد. */
export async function nextSupervisorCode(): Promise<string> {
  const result = await prisma.$queryRaw<{ max: number | null }[]>`
    SELECT MAX(CAST("emergencyCode" AS INTEGER)) AS max FROM "ShiftSupervisor"
  `;
  const max = result[0]?.max ?? 900_000;
  return String(max + 1);
}
