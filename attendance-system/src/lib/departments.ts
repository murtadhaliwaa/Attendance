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

    const [departments, employeeCounts] = await Promise.all([
      prisma.department.findMany({
        orderBy: { name: "asc" },
      }),
      prisma.employee.groupBy({
        by: ["department"],
        _count: { department: true },
      }),
    ]);

    const countMap = new Map(
      employeeCounts.map((row) => [row.department, row._count.department])
    );

    return departments.map((department) => ({
      id: department.id,
      name: department.name,
      employeeCount: countMap.get(department.name) ?? 0,
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

  const [departments, employeeGroups] = await Promise.all([
    prisma.department.findMany({
      select: { name: true },
      orderBy: { name: "asc" },
    }),
    prisma.employee.groupBy({
      by: ["department"],
    }),
  ]);

  const formOptions = departments.map((department) => department.name);
  const filters = Array.from(
    new Set([
      ...formOptions,
      ...employeeGroups.map((group) => group.department),
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
