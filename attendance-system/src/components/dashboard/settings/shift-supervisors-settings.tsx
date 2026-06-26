"use client";

import { useState } from "react";
import { Loader2, Pencil, Plus, ShieldCheck, Trash2 } from "lucide-react";
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
import { usePermission } from "@/components/dashboard/role-context";
import {
  validateSupervisorCode,
  type SupervisorRow,
} from "@/lib/supervisor-types";

interface ShiftSupervisorsSettingsProps {
  initialSupervisors: SupervisorRow[];
}

export function ShiftSupervisorsSettings({
  initialSupervisors,
}: ShiftSupervisorsSettingsProps) {
  const canWrite = usePermission("settings:write");
  const [supervisors, setSupervisors] =
    useState<SupervisorRow[]>(initialSupervisors);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SupervisorRow | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [emergencyCode, setEmergencyCode] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  function openCreate() {
    setEditingId(null);
    setName("");
    setEmergencyCode("");
    setDialogOpen(true);
  }

  function openEdit(supervisor: SupervisorRow) {
    setEditingId(supervisor.id);
    setName(supervisor.name);
    setEmergencyCode(supervisor.emergencyCode);
    setDialogOpen(true);
  }

  async function refreshList() {
    const res = await fetch("/api/supervisors");
    const list = await parseJsonResponse<SupervisorRow[]>(res);
    if (res.ok) setSupervisors(list);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const trimmedName = name.trim();
      const trimmedCode = emergencyCode.trim();
      if (!trimmedName) throw new Error("اسم المسؤول مطلوب");

      const codeError = validateSupervisorCode(trimmedCode);
      if (codeError) throw new Error(codeError);

      const res = await fetch(
        editingId ? `/api/supervisors/${editingId}` : "/api/supervisors",
        {
          method: editingId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: trimmedName,
            emergencyCode: trimmedCode,
          }),
        }
      );

      const data = await parseJsonResponse<{ error?: string }>(res);
      if (!res.ok) throw new Error(data.error ?? "فشل حفظ المسؤول");

      toast.success(editingId ? "تم تحديث المسؤول" : "تم إضافة المسؤول");
      setDialogOpen(false);
      await refreshList();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "فشل حفظ المسؤول");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/supervisors/${deleteTarget.id}`, {
        method: "DELETE",
      });
      const data = await parseJsonResponse<{ error?: string; message?: string }>(
        res
      );
      if (!res.ok) throw new Error(data.error ?? "فشل حذف المسؤول");

      toast.success(data.message ?? "تم حذف المسؤول");
      setDeleteTarget(null);
      await refreshList();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "فشل حذف المسؤول");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <Card className="border border-bg-border bg-bg-card">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-text-primary">
              <ShieldCheck className="size-4 text-blue-primary" />
              مسؤولو الشفتات (الرمز الطارئ)
            </CardTitle>
            <p className="mt-1 text-xs text-text-muted">
              لكل مسؤول شفت رمز طارئ خاص يعمل على جميع الموظفين. يختار المسؤول
              اسم الموظف في شاشة الحضور ويُدخل رمزه — ويظهر في التقارير مَن سجّل.
            </p>
          </div>
          {canWrite && (
            <Button
              size="sm"
              onClick={openCreate}
              className="border-transparent bg-blue-primary text-white shadow-sm hover:bg-blue-dark hover:text-white"
            >
              <Plus className="size-4" />
              مسؤول جديد
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {supervisors.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-4 py-10 text-center text-sm text-text-muted">
              <ShieldCheck className="size-8 opacity-40" />
              لا يوجد مسؤولون. أضف مسؤول شفت ليتمكن من التسجيل بالرمز الطارئ.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-center">المسؤول</TableHead>
                  <TableHead className="text-center">الرمز الطارئ</TableHead>
                  <TableHead className="text-center">الحالة</TableHead>
                  {canWrite && (
                    <TableHead className="text-center">إجراء</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {supervisors.map((supervisor) => (
                  <TableRow key={supervisor.id}>
                    <TableCell className="text-center text-text-primary">
                      {supervisor.name}
                    </TableCell>
                    <TableCell className="text-center font-mono text-text-secondary">
                      <span dir="ltr">{supervisor.emergencyCode}</span>
                    </TableCell>
                    <TableCell className="text-center text-text-muted">
                      {supervisor.isActive ? "نشط" : "موقوف"}
                    </TableCell>
                    {canWrite && (
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => openEdit(supervisor)}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setDeleteTarget(supervisor)}
                            className="hover:bg-rose-500/10"
                          >
                            <Trash2 className="size-4 text-rose-300" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
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
              {editingId ? "تعديل المسؤول" : "إضافة مسؤول شفت"}
            </DialogTitle>
            <DialogDescription>
              أدخل اسم المسؤول ورمزاً طارئاً من 6 أرقام خاصاً به.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="supervisor-name">اسم المسؤول</Label>
              <Input
                id="supervisor-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="مثال: مسؤول الشفت الأول"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="supervisor-code">الرمز الطارئ (6 أرقام)</Label>
              <Input
                id="supervisor-code"
                value={emergencyCode}
                onChange={(e) => setEmergencyCode(e.target.value)}
                placeholder="مثال: 900001"
                dir="ltr"
                inputMode="numeric"
                className="text-center"
              />
            </div>
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
              {editingId ? "حفظ التعديلات" : "إضافة المسؤول"}
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
            <DialogTitle>حذف المسؤول</DialogTitle>
            <DialogDescription>
              هل تريد حذف «{deleteTarget?.name}»؟ سجلات الحضور السابقة تحتفظ
              باسمه، لكن لن يعمل رمزه بعد الآن.
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
