import { prisma } from "@/lib/prisma";
import { DEFAULT_DEPARTMENTS } from "@/lib/department-types";
import type { DepartmentRow } from "@/lib/department-types";
import {
  areDefaultDepartmentsEnsured,
  markDefaultDepartmentsEnsured,
} from "@/lib/query-cache";

export async function ensureDefaultDepartments() {
  if (areDefaultDepartmentsEnsured()) return;

  const count = await prisma.department.count();
  if (count === 0) {
    await prisma.department.createMany({
      data: DEFAULT_DEPARTMENTS.map((name) => ({ name })),
      skipDuplicates: true,
    });
  }

  markDefaultDepartmentsEnsured();
}

export async function getDepartmentRows(): Promise<DepartmentRow[]> {
  try {
    await ensureDefaultDepartments();

    const [departments, employeeCountsById, orphanCounts] = await Promise.all([
      prisma.department.findMany({
        orderBy: { name: "asc" },
      }),
      prisma.employee.groupBy({
        by: ["departmentId"],
        _count: { departmentId: true },
        where: { departmentId: { not: null } },
      }),
      prisma.employee.groupBy({
        by: ["department"],
        _count: { department: true },
        where: { departmentId: null },
      }),
    ]);

    const countById = new Map(
      employeeCountsById.map((row) => [
        row.departmentId!,
        row._count.departmentId,
      ])
    );

    const orphanByName = new Map(
      orphanCounts.map((row) => [row.department, row._count.department])
    );

    return departments.map((department) => ({
      id: department.id,
      name: department.name,
      employeeCount:
        (countById.get(department.id) ?? 0) +
        (orphanByName.get(department.name) ?? 0),
    }));
  } catch (error) {
    console.error("getDepartmentRows failed:", error);
    return [];
  }
}

export async function ensureDepartmentExists(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return;

  const existing = await prisma.department.findFirst({
    where: { name: { equals: trimmed, mode: "insensitive" } },
  });
  if (existing) return;

  await prisma.department.create({ data: { name: trimmed } });
}

export async function getEmployeeDepartmentLists(): Promise<{
  filters: string[];
  formOptions: string[];
}> {
  await ensureDefaultDepartments();

  // ملاحظة: أسماء الأقسام المرتبطة (departmentRef.name) هي حتماً مجموعة
  // جزئية من أسماء جدول Department، لذا لا حاجة لاستعلام distinct+join منفصل.
  // نكتفي بكل أسماء الأقسام + الأقسام النصية اليتيمة (departmentId = null).
  const [departments, orphanDepartments] = await Promise.all([
    prisma.department.findMany({
      select: { name: true },
      orderBy: { name: "asc" },
    }),
    prisma.employee.groupBy({
      by: ["department"],
      where: { departmentId: null },
    }),
  ]);

  const formOptions = departments.map((department) => department.name);

  const filters = Array.from(
    new Set([
      ...formOptions,
      ...orphanDepartments.map((group) => group.department),
    ])
  )
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, "ar"));

  return { filters, formOptions };
}

export async function getDepartmentNames(): Promise<string[]> {
  const rows = await getDepartmentRows();
  return rows.map((row) => row.name);
}

export async function getAllDepartmentNames(): Promise<string[]> {
  const { filters } = await getEmployeeDepartmentLists();
  return filters;
}

