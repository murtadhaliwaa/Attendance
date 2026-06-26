import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DepartmentsSettings } from "@/components/dashboard/settings/departments-settings";
import { ShiftsSettings } from "@/components/dashboard/settings/shifts-settings";
import { getDepartmentRows } from "@/lib/departments";
import { ensureDefaultShifts } from "@/lib/shifts";
import { requirePagePermission } from "@/lib/page-auth";
import { ROLE_LABELS } from "@/lib/permissions";
import { prisma, withDbRetry } from "@/lib/prisma";
import type { ShiftRow } from "@/lib/schedule-types";

const shiftQuery = {
  orderBy: [{ isDefault: "desc" as const }, { name: "asc" as const }],
  include: { _count: { select: { employees: true } } },
};

async function loadShiftsWithDefaults() {
  const shifts = await prisma.workSchedule.findMany(shiftQuery);
  const mutated = await ensureDefaultShifts(shifts);
  if (mutated) {
    return prisma.workSchedule.findMany(shiftQuery);
  }
  return shifts;
}

async function loadSettingsData() {
  const [shifts, users, departments] = await Promise.all([
    loadShiftsWithDefaults(),
    prisma.systemUser.findMany({ orderBy: { name: "asc" } }),
    getDepartmentRows(),
  ]);

  return { shifts, users, departments };
}

export default async function SettingsPage() {
  await requirePagePermission("settings:read");
  const { shifts, users, departments } = await withDbRetry(loadSettingsData);

  const shiftRows: ShiftRow[] = shifts.map((shift) => ({
    id: shift.id,
    name: shift.name,
    startTime: shift.startTime,
    endTime: shift.endTime,
    lateAfter: shift.lateAfter,
    earlyLeaveBefore: shift.earlyLeaveBefore,
    isDefault: shift.isDefault,
    employeeCount: shift._count.employees,
  }));

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <ShiftsSettings initialShifts={shiftRows} />
      <DepartmentsSettings initialDepartments={departments} />

      <Card className="border border-bg-border bg-bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-text-primary">
            مستخدمو النظام
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-right">الاسم</TableHead>
                <TableHead className="text-right">البريد</TableHead>
                <TableHead className="text-right">الدور</TableHead>
                <TableHead className="text-right">الحالة</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="text-text-primary">{user.name}</TableCell>
                  <TableCell className="text-text-secondary">
                    <span dir="ltr" className="inline-block">
                      {user.email}
                    </span>
                  </TableCell>
                  <TableCell className="text-text-muted">
                    {ROLE_LABELS[user.role] ?? user.role}
                  </TableCell>
                  <TableCell className="text-text-muted">
                    {user.isActive ? "نشط" : "موقوف"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
