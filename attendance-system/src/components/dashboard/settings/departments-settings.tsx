"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { parseJsonResponse } from "@/lib/api-utils";
import type { DepartmentRow } from "@/lib/department-types";

interface DepartmentsSettingsProps {
  initialDepartments: DepartmentRow[];
}

export function DepartmentsSettings({
  initialDepartments,
}: DepartmentsSettingsProps) {
  const router = useRouter();
  const [departments, setDepartments] =
    useState<DepartmentRow[]>(initialDepartments);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DepartmentRow | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  function openCreate() {
    setEditingId(null);
    setName("");
    setDialogOpen(true);
  }

  function openEdit(department: DepartmentRow) {
    setEditingId(department.id);
    setName(department.name);
    setDialogOpen(true);
  }

  function requestDelete(department: DepartmentRow) {
    if (department.employeeCount > 0) {
      toast.error(
        `لا يمكن حذف «${department.name}» — مرتبط بـ ${department.employeeCount} موظف. انقل الموظفين إلى قسم آخر أولاً.`
      );
      return;
    }

    setDialogOpen(false);
    setDeleteTarget(department);
  }

  async function refreshList() {
    const res = await fetch("/api/departments");
    const list = await parseJsonResponse<DepartmentRow[]>(res);
    if (res.ok) setDepartments(list);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const trimmed = name.trim();
      if (!trimmed) throw new Error("اسم القسم مطلوب");

      const res = await fetch(
        editingId ? `/api/departments/${editingId}` : "/api/departments",
        {
          method: editingId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: trimmed }),
        }
      );

      const data = await parseJsonResponse<{ error?: string }>(res);
      if (!res.ok) throw new Error(data.error ?? "فشل حفظ القسم");

      toast.success(editingId ? "تم تحديث القسم" : "تم إضافة القسم");
      setDialogOpen(false);
      router.refresh();
      await refreshList();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "فشل حفظ القسم");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/departments/${deleteTarget.id}`, {
        method: "DELETE",
      });
      const data = await parseJsonResponse<{ error?: string; message?: string }>(
        res
      );
      if (!res.ok) throw new Error(data.error ?? "فشل حذف القسم");

      toast.success(data.message ?? "تم حذف القسم");
      setDeleteTarget(null);
      router.refresh();
      await refreshList();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "فشل حذف القسم");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <Card className="border border-bg-border bg-bg-card">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-sm font-medium text-text-primary">
              الأقسام
            </CardTitle>
            <p className="mt-1 text-xs text-text-muted">
              أضف أو عدّل أو احذف الأقسام المتاحة عند إضافة الموظفين
            </p>
          </div>
          <Button
            size="sm"
            onClick={openCreate}
            className="border-transparent bg-blue-primary text-white shadow-sm hover:bg-blue-dark hover:text-white"
          >
            <Plus className="size-4" />
            قسم جديد
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {departments.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-4 py-10 text-center text-sm text-text-muted">
              <Building2 className="size-8 opacity-40" />
              لا توجد أقسام. أضف قسماً ليظهر في قائمة الموظفين.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-center">القسم</TableHead>
                  <TableHead className="text-center">الموظفون</TableHead>
                  <TableHead className="text-center">إجراء</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {departments.map((department) => (
                  <TableRow key={department.id}>
                    <TableCell className="text-center text-text-primary">
                      {department.name}
                    </TableCell>
                    <TableCell className="text-center text-text-muted">
                      {department.employeeCount}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => openEdit(department)}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => requestDelete(department)}
                          title={
                            department.employeeCount > 0
                              ? `لا يمكن حذف قسم مرتبط بـ ${department.employeeCount} موظف`
                              : "حذف القسم"
                          }
                          className={
                            department.employeeCount > 0
                              ? "opacity-50 hover:bg-transparent"
                              : "hover:bg-rose-500/10"
                          }
                        >
                          <Trash2
                            className={
                              department.employeeCount > 0
                                ? "size-4 text-text-muted"
                                : "size-4 text-rose-300"
                            }
                          />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "تعديل القسم" : "إضافة قسم جديد"}
            </DialogTitle>
            <DialogDescription>
              {editingId
                ? "سيُحدَّث اسم القسم لدى جميع الموظفين المرتبطين به"
                : "سيظهر القسم في قائمة اختيار القسم عند إضافة موظف"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="department-name">اسم القسم</Label>
            <Input
              id="department-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: الموارد البشرية"
              autoFocus
            />
          </div>

          <DialogFooter className="mx-0 mb-0 shrink-0 flex-row justify-end gap-2 border-t-0 bg-transparent p-0 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              إلغاء
            </Button>
            <Button variant="primary" onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="animate-spin" />}
              {editingId ? "حفظ التعديلات" : "إضافة القسم"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>حذف القسم</DialogTitle>
            <DialogDescription>
              هل تريد حذف «{deleteTarget?.name}»؟ لا يمكن التراجع عن هذا
              الإجراء.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mx-0 mb-0 shrink-0 flex-row justify-end gap-2 border-t-0 bg-transparent p-0 pt-4">
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
            >
              إلغاء
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting && <Loader2 className="animate-spin" />}
              حذف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
