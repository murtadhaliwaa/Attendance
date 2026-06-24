import { prisma } from "@/lib/prisma";
import { ensureDepartmentExists } from "@/lib/departments";

export type ResolvedDepartment = {
  departmentId: string | null;
  department: string;
};

/** يوحّد departmentId مع حقل department النصي */
export async function resolveEmployeeDepartment(input: {
  departmentId?: string | null;
  departmentName?: string | null;
  fallbackName?: string;
}): Promise<ResolvedDepartment> {
  const fallback = input.fallbackName?.trim() || "عام";

  if (input.departmentId) {
    const dept = await prisma.department.findUnique({
      where: { id: input.departmentId },
      select: { id: true, name: true },
    });
    if (dept) {
      return { departmentId: dept.id, department: dept.name };
    }
  }

  const name = input.departmentName?.trim();
  if (name) {
    await ensureDepartmentExists(name);
    const dept = await prisma.department.findFirst({
      where: { name: { equals: name, mode: "insensitive" } },
      select: { id: true, name: true },
    });
    if (dept) {
      return { departmentId: dept.id, department: dept.name };
    }
    return { departmentId: null, department: name };
  }

  await ensureDepartmentExists(fallback);
  const dept = await prisma.department.findFirst({
    where: { name: { equals: fallback, mode: "insensitive" } },
    select: { id: true, name: true },
  });

  return {
    departmentId: dept?.id ?? null,
    department: dept?.name ?? fallback,
  };
}
