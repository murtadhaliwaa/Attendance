import { EmployeesManager } from "@/components/dashboard/employees/employees-manager";
import {
  employeeListSelect,
  serializeEmployee,
} from "@/lib/employee-serialize";
import { getEmployeeDepartmentLists } from "@/lib/departments";
import { getShiftOptions } from "@/lib/shifts";
import { requirePagePermission } from "@/lib/page-auth";
import { prisma } from "@/lib/prisma";
import type { ShiftOption } from "@/lib/employee-types";
import { POSITIONS } from "@/lib/employee-types";

export default async function EmployeesPage() {
  await requirePagePermission("employees:read");
  const [employees, shifts, departmentLists] = await Promise.all([
    prisma.employee.findMany({
      orderBy: { name: "asc" },
      select: employeeListSelect,
    }),
    getShiftOptions(),
    getEmployeeDepartmentLists(),
  ]);

  const employeeRows = employees.map(serializeEmployee);

  const positionOptions = Array.from(
    new Set([...POSITIONS, ...employees.map((employee) => employee.position)])
  )
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, "ar"));

  const shiftOptions: ShiftOption[] = shifts;

  return (
    <EmployeesManager
      initialEmployees={employeeRows}
      shifts={shiftOptions}
      departments={departmentLists.filters}
      departmentOptions={departmentLists.formOptions}
      positionOptions={positionOptions}
    />
  );
}
