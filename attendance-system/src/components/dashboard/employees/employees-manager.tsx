"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  UserPlus,
  Search,
  MoreHorizontal,
  Pencil,
  UserX,
  UserCheck,
  RotateCcw,
  UserMinus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { parseJsonResponse } from "@/lib/api-utils";
import { usePermission } from "@/components/dashboard/role-context";
import { cn } from "@/lib/utils";
import { formatTimeLabel } from "@/lib/schedule-utils";
import type { EmployeeRow, ShiftOption } from "@/lib/employee-types";

const EmployeeFormDialog = dynamic(
  () =>
    import("@/components/dashboard/employees/employee-form-dialog").then(
      (module) => module.EmployeeFormDialog
    ),
  { ssr: false }
);

const PAGE_SIZE = 15;

interface EmployeesManagerProps {
  initialEmployees: EmployeeRow[];
  shifts: ShiftOption[];
  departments: string[];
  departmentOptions: string[];
  positionOptions: string[];
  suggestedCode: string;
  suggestedEmergencyCode: string;
}

export function EmployeesManager({
  initialEmployees,
  shifts,
  departments,
  departmentOptions,
  positionOptions,
  suggestedCode,
  suggestedEmergencyCode,
}: EmployeesManagerProps) {
  const router = useRouter();
  const canCreate = usePermission("employees:create");
  const canUpdate = usePermission("employees:update");
  const canDelete = usePermission("employees:delete");
  const showActions = canUpdate || canDelete;
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("all");
  const [status, setStatus] = useState<"all" | "active" | "inactive">("active");
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<EmployeeRow | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<EmployeeRow | null>(
    null
  );
  const [deleteTarget, setDeleteTarget] = useState<EmployeeRow | null>(null);
  const [clearFaceTarget, setClearFaceTarget] = useState<EmployeeRow | null>(
    null
  );
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const stats = useMemo(() => {
    const active = initialEmployees.filter((e) => e.isActive).length;
    const withFace = initialEmployees.filter(
      (e) => e.isActive && e.hasFace
    ).length;
    const withoutFace = initialEmployees.filter(
      (e) => e.isActive && !e.hasFace
    ).length;
    return {
      total: initialEmployees.length,
      active,
      withFace,
      withoutFace,
    };
  }, [initialEmployees]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return initialEmployees.filter((employee) => {
      if (status === "active" && !employee.isActive) return false;
      if (status === "inactive" && employee.isActive) return false;
      if (department !== "all" && employee.department !== department) return false;

      if (!query) return true;

      return (
        employee.name.toLowerCase().includes(query) ||
        employee.employeeCode.toLowerCase().includes(query) ||
        (employee.phone?.includes(query) ?? false) ||
        employee.department.toLowerCase().includes(query)
      );
    });
  }, [initialEmployees, search, department, status]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  function refresh() {
    router.refresh();
  }

  function openCreate() {
    setEditingEmployee(null);
    setFormOpen(true);
  }

  function openEdit(employee: EmployeeRow) {
    setEditingEmployee(employee);
    setFormOpen(true);
  }

  async function runAction(
    id: string,
    action: () => Promise<void>,
    loadingKey: string
  ) {
    setActionLoading(loadingKey);
    try {
      await action();
      refresh();
    } finally {
      setActionLoading(null);
    }
  }

  async function toggleActive(employee: EmployeeRow) {
    await runAction(employee.id, async () => {
      const res = await fetch(`/api/employees/${employee.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !employee.isActive }),
      });
      const data = await parseJsonResponse<{ message?: string; error?: string }>(
        res
      );
      if (!res.ok) throw new Error(data.error ?? "فشل تحديث الحالة");
      toast.success(data.message);
    }, `toggle-${employee.id}`);
  }

  async function clearFace(employee: EmployeeRow) {
    await runAction(employee.id, async () => {
      const res = await fetch(`/api/employees/${employee.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clearFace: true }),
      });
      const data = await parseJsonResponse<{ message?: string; error?: string }>(
        res
      );
      if (!res.ok) throw new Error(data.error ?? "فشل مسح بصمة الوجه");
      toast.success(`تم مسح بصمة وجه ${employee.name}. سجّل الوجه من صفحة الحضور والانصراف`);
      setClearFaceTarget(null);
    }, `face-${employee.id}`);
  }

  async function deactivateEmployee(employee: EmployeeRow) {
    await runAction(employee.id, async () => {
      const res = await fetch(`/api/employees/${employee.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: false }),
      });
      const data = await parseJsonResponse<{ message?: string; error?: string }>(
        res
      );
      if (!res.ok) throw new Error(data.error ?? "فشل إيقاف الموظف");
      toast.success(data.message ?? `تم إيقاف ${employee.name}`);
      setDeactivateTarget(null);
    }, `deactivate-${employee.id}`);
  }

  async function deleteEmployee(employee: EmployeeRow) {
    await runAction(employee.id, async () => {
      const res = await fetch(`/api/employees/${employee.id}`, {
        method: "DELETE",
      });
      const data = await parseJsonResponse<{ message?: string; error?: string }>(
        res
      );
      if (!res.ok) throw new Error(data.error ?? "فشل حذف الموظف");
      toast.success(data.message);
      setDeleteTarget(null);
    }, `delete-${employee.id}`);
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-text-muted">
          {stats.active} نشط · {stats.withFace} مسجّل الوجه
        </p>
        {canCreate && (
          <Button
            onClick={openCreate}
            className="w-full shrink-0 border-transparent bg-blue-primary text-white shadow-sm hover:bg-blue-dark sm:w-auto"
          >
            <UserPlus className="size-4" />
            إضافة موظف
          </Button>
        )}
      </div>

      <Card className="border border-bg-border bg-bg-card">
        <CardHeader className="space-y-3 pb-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-text-muted" />
              <Input
                placeholder="بحث بالاسم، الرقم، أو الجوال..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pr-9"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Select
                value={department}
                onValueChange={(value) => {
                  setDepartment(value ?? "all");
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="القسم" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل الأقسام</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={status}
                onValueChange={(value) => {
                  setStatus(value as typeof status);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="الحالة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  <SelectItem value="active">نشط</SelectItem>
                  <SelectItem value="inactive">موقوف</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-center">الرقم</TableHead>
                <TableHead className="text-center">الاسم</TableHead>
                <TableHead className="text-center">القسم</TableHead>
                <TableHead className="text-center">المسمى</TableHead>
                <TableHead className="text-center">الشفت</TableHead>
                <TableHead className="text-center">الوجه</TableHead>
                <TableHead className="text-center">الحالة</TableHead>
                {showActions && (
                  <TableHead className="w-12 text-center">إجراءات</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={showActions ? 8 : 7}
                    className="py-12 text-center text-text-secondary"
                  >
                    <UserMinus className="mx-auto mb-2 size-8 opacity-50" />
                    لا توجد نتائج مطابقة
                  </TableCell>
                </TableRow>
              ) : (
                paginated.map((employee) => (
                  <TableRow
                    key={employee.id}
                    className={cn(!employee.isActive && "opacity-60")}
                  >
                    <TableCell
                      dir="ltr"
                      className="text-center font-mono text-sm text-text-secondary"
                    >
                      {employee.employeeCode}
                    </TableCell>
                    <TableCell className="text-center font-medium text-text-primary">
                      {employee.name}
                    </TableCell>
                    <TableCell className="text-center text-text-secondary">
                      {employee.department}
                    </TableCell>
                    <TableCell className="text-center text-text-secondary">
                      {employee.position}
                    </TableCell>
                    <TableCell className="text-center text-text-secondary">
                      <div className="flex flex-col items-center gap-0.5">
                        <span>{employee.shiftName ?? "—"}</span>
                        {employee.customEndTime && (
                          <span className="text-xs text-text-muted">
                            انصراف {formatTimeLabel(employee.customEndTime)}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center text-sm text-text-muted">
                      {employee.hasFace ? "مسجّل" : "—"}
                    </TableCell>
                    <TableCell className="text-center text-sm text-text-muted">
                      {employee.isActive ? "نشط" : "موقوف"}
                    </TableCell>
                    {showActions && (
                      <TableCell className="text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                disabled={
                                  actionLoading?.includes(employee.id) ?? false
                                }
                              />
                            }
                          >
                            <MoreHorizontal className="size-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {canUpdate && (
                              <>
                                <DropdownMenuItem
                                  onClick={() => openEdit(employee)}
                                >
                                  <Pencil />
                                  تعديل البيانات
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => toggleActive(employee)}
                                >
                                  {employee.isActive ? <UserX /> : <UserCheck />}
                                  {employee.isActive ? "إيقاف مؤقت" : "تفعيل"}
                                </DropdownMenuItem>
                                {employee.hasFace && (
                                  <DropdownMenuItem
                                    onClick={() => setClearFaceTarget(employee)}
                                  >
                                    <RotateCcw />
                                    مسح بصمة الوجه
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                {employee.isActive && (
                                  <DropdownMenuItem
                                    onClick={() => setDeactivateTarget(employee)}
                                  >
                                    <UserX />
                                    إيقاف الموظف
                                  </DropdownMenuItem>
                                )}
                              </>
                            )}
                            {canDelete && (
                              <DropdownMenuItem
                                variant="destructive"
                                onClick={() => setDeleteTarget(employee)}
                              >
                                <Trash2 />
                                حذف الموظف
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {filtered.length > PAGE_SIZE && (
            <div className="flex items-center justify-between border-t border-bg-border px-4 py-3">
              <p className="text-sm text-text-secondary">
                عرض {(currentPage - 1) * PAGE_SIZE + 1}–
                {Math.min(currentPage * PAGE_SIZE, filtered.length)} من{" "}
                {filtered.length}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  السابق
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  التالي
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <EmployeeFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        employee={editingEmployee}
        employees={initialEmployees}
        shifts={shifts}
        departments={departmentOptions}
        positions={positionOptions}
        suggestedCode={suggestedCode}
        suggestedEmergencyCode={suggestedEmergencyCode}
        onSuccess={refresh}
      />

      <Dialog
        open={!!clearFaceTarget}
        onOpenChange={(open) => !open && setClearFaceTarget(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>مسح بصمة الوجه</DialogTitle>
            <DialogDescription>
              هل تريد مسح بصمة وجه {clearFaceTarget?.name}؟ سيحتاج الموظف إلى
              تسجيل وجهه من جديد في الحضور والانصراف.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mx-0 mb-0 shrink-0 flex-row justify-end gap-2 border-t-0 bg-transparent p-0 pt-4">
            <Button
              variant="outline"
              onClick={() => setClearFaceTarget(null)}
              disabled={!!actionLoading}
            >
              إلغاء
            </Button>
            <Button
              variant="destructive"
              disabled={!!actionLoading}
              onClick={() =>
                clearFaceTarget && clearFace(clearFaceTarget)
              }
            >
              تأكيد المسح
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!deactivateTarget}
        onOpenChange={(open) => !open && setDeactivateTarget(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>إيقاف الموظف</DialogTitle>
            <DialogDescription>
              هل تريد إيقاف {deactivateTarget?.name}؟ سيُحتفظ بسجلات الحضور
              السابقة ولن يتمكن من التسجيل في الحضور والانصراف.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mx-0 mb-0 shrink-0 flex-row justify-end gap-2 border-t-0 bg-transparent p-0 pt-4">
            <Button
              variant="outline"
              onClick={() => setDeactivateTarget(null)}
              disabled={!!actionLoading}
            >
              إلغاء
            </Button>
            <Button
              variant="destructive"
              disabled={!!actionLoading}
              onClick={() =>
                deactivateTarget && deactivateEmployee(deactivateTarget)
              }
            >
              تأكيد الإيقاف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>حذف الموظف</DialogTitle>
            <DialogDescription>
              هل تريد حذف {deleteTarget?.name} نهائياً؟ سيتم حذف جميع سجلات
              حضوره وتنبيهاته ولا يمكن التراجع عن هذا الإجراء.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mx-0 mb-0 shrink-0 flex-row justify-end gap-2 border-t-0 bg-transparent p-0 pt-4">
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={!!actionLoading}
            >
              إلغاء
            </Button>
            <Button
              variant="destructive"
              disabled={!!actionLoading}
              onClick={() => deleteTarget && deleteEmployee(deleteTarget)}
            >
              تأكيد الحذف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
