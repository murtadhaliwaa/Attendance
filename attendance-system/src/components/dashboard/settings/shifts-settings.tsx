"use client";

import { useMemo, useState } from "react";
import { Clock, Loader2, Pencil, Plus } from "lucide-react";
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
  formatTimeLabel,
  getEarlyLeaveDeadlineLabel,
  getLateDeadlineLabel,
} from "@/lib/schedule-utils";
import type { ShiftRow } from "@/lib/schedule-types";
import { DEFAULT_SHIFT_COUNT } from "@/lib/shift-defaults";

type ShiftFormState = {
  name: string;
  startTime: string;
  endTime: string;
  lateAfter: string;
  earlyLeaveBefore: string;
  isDefault: boolean;
};

const emptyForm: ShiftFormState = {
  name: "",
  startTime: "07:00",
  endTime: "15:00",
  lateAfter: "10",
  earlyLeaveBefore: "0",
  isDefault: false,
};

interface ShiftsSettingsProps {
  initialShifts: ShiftRow[];
}

export function ShiftsSettings({ initialShifts }: ShiftsSettingsProps) {
  const canWrite = usePermission("settings:write");
  const [shifts, setShifts] = useState(initialShifts);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ShiftFormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  const preview = useMemo(() => {
    const lateAfter = Number(form.lateAfter) || 0;
    const earlyLeaveBefore = Number(form.earlyLeaveBefore) || 0;
    return {
      lateDeadline: getLateDeadlineLabel(form.startTime, lateAfter),
      earlyDeadline: getEarlyLeaveDeadlineLabel(
        form.endTime,
        earlyLeaveBefore
      ),
    };
  }, [form]);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(shift: ShiftRow) {
    setEditingId(shift.id);
    setForm({
      name: shift.name,
      startTime: shift.startTime,
      endTime: shift.endTime,
      lateAfter: String(shift.lateAfter),
      earlyLeaveBefore: String(shift.earlyLeaveBefore),
      isDefault: shift.isDefault,
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        startTime: form.startTime,
        endTime: form.endTime,
        lateAfter: Number(form.lateAfter),
        earlyLeaveBefore: Number(form.earlyLeaveBefore),
        isDefault: form.isDefault,
      };

      const res = await fetch(
        editingId ? `/api/schedules/${editingId}` : "/api/schedules",
        {
          method: editingId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const data = await parseJsonResponse<{ error?: string }>(res);
      if (!res.ok) throw new Error(data.error ?? "فشل حفظ الشفت");

      toast.success(editingId ? "تم تحديث الشفت" : "تم إنشاء الشفت");
      setDialogOpen(false);

      const listRes = await fetch("/api/schedules");
      const list = await parseJsonResponse<ShiftRow[]>(listRes);
      if (listRes.ok) setShifts(list);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "فشل حفظ الشفت");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Card className="border border-bg-border bg-bg-card">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-sm font-medium text-text-primary">
              أوقات الحضور والانصراف
            </CardTitle>
            <p className="mt-1 text-xs text-text-muted">
              ثلاثة شفتات: صباحي 7–3، مسائي 3–11، ليلي 11–7. عدّل أوقات
              كل شفت بـ «تعديل» — تُقيَّم التأخير والانصراف حسب الشفت المُسند
              للموظف.
            </p>
          </div>
          {canWrite && shifts.length < DEFAULT_SHIFT_COUNT && (
            <Button
              size="sm"
              onClick={openCreate}
              className="border-transparent bg-blue-primary text-white shadow-sm hover:bg-blue-dark hover:text-white"
            >
              <Plus className="size-4" />
              شفت جديد
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {shifts.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-text-muted">
              لا توجد شفتات. أنشئ شفتاً افتراضياً لتحديد أوقات الحضور
              والانصراف.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-center">الشفت</TableHead>
                  <TableHead className="text-center">وقت الحضور</TableHead>
                  <TableHead className="text-center">سماح التأخير</TableHead>
                  <TableHead className="text-center">وقت الانصراف</TableHead>
                  <TableHead className="text-center">سماح الخروج المبكر</TableHead>
                  <TableHead className="text-center">الموظفون</TableHead>
                  {canWrite && (
                    <TableHead className="text-center">إجراء</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {shifts.map((shift) => (
                  <TableRow key={shift.id}>
                    <TableCell className="text-center text-text-primary">
                      {shift.name}
                      {shift.isDefault && (
                        <span className="mr-2 text-xs text-text-muted">
                          (افتراضي)
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-center text-text-secondary">
                      <span dir="ltr" className="inline-block">
                        {formatTimeLabel(shift.startTime)}
                      </span>
                    </TableCell>
                    <TableCell className="text-center text-text-muted">
                      {shift.lateAfter} د · حتى{" "}
                      <span dir="ltr" className="inline-block">
                        {getLateDeadlineLabel(shift.startTime, shift.lateAfter)}
                      </span>
                    </TableCell>
                    <TableCell className="text-center text-text-secondary">
                      <span dir="ltr" className="inline-block">
                        {formatTimeLabel(shift.endTime)}
                      </span>
                    </TableCell>
                    <TableCell className="text-center text-text-muted">
                      {shift.earlyLeaveBefore} د · من{" "}
                      <span dir="ltr" className="inline-block">
                        {getEarlyLeaveDeadlineLabel(
                          shift.endTime,
                          shift.earlyLeaveBefore
                        )}
                      </span>
                    </TableCell>
                    <TableCell className="text-center text-text-muted">
                      {shift.employeeCount}
                    </TableCell>
                    {canWrite && (
                      <TableCell className="text-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEdit(shift)}
                        >
                          <Pencil className="size-4" />
                          تعديل
                        </Button>
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="size-5 text-blue-primary" />
              {editingId ? "تعديل الشفت" : "شفت جديد"}
            </DialogTitle>
            <DialogDescription>
              {editingId
                ? "تغيير الأوقات يؤثر فوراً على الموظفين المُسندين لهذا الشفت."
                : "أضف شفتاً ناقصاً فقط. لكل موظف يُفضّل إسناده إلى شفت 1 أو 2 أو 3."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="shift-name">اسم الشفت</Label>
              <Input
                id="shift-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="مثال: الدوام الإداري"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="start-time">وقت الحضور الرسمي</Label>
                <Input
                  id="start-time"
                  type="time"
                  dir="ltr"
                  value={form.startTime}
                  onChange={(e) =>
                    setForm({ ...form, startTime: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="late-after">سماح التأخير (دقيقة)</Label>
                <Input
                  id="late-after"
                  type="number"
                  min={0}
                  max={180}
                  dir="ltr"
                  value={form.lateAfter}
                  onChange={(e) =>
                    setForm({ ...form, lateAfter: e.target.value })
                  }
                />
                <p className="text-xs text-text-muted">
                  حاضر حتى {preview.lateDeadline} — بعدها يُسجَّل متأخراً
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="end-time">وقت الانصراف الرسمي</Label>
                <Input
                  id="end-time"
                  type="time"
                  dir="ltr"
                  value={form.endTime}
                  onChange={(e) =>
                    setForm({ ...form, endTime: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="early-before">سماح الخروج المبكر (دقيقة)</Label>
                <Input
                  id="early-before"
                  type="number"
                  min={0}
                  max={180}
                  dir="ltr"
                  value={form.earlyLeaveBefore}
                  onChange={(e) =>
                    setForm({ ...form, earlyLeaveBefore: e.target.value })
                  }
                />
                <p className="text-xs text-text-muted">
                  انصراف طبيعي من {preview.earlyDeadline} — قبلها يُسجَّل
                  انصراف مبكر
                </p>
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-text-secondary">
              <input
                type="checkbox"
                checked={form.isDefault}
                onChange={(e) =>
                  setForm({ ...form, isDefault: e.target.checked })
                }
                className="size-4 rounded border-bg-border"
              />
              شفت افتراضي للموظفين الجدد
            </label>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              إلغاء
            </Button>
            <Button variant="primary" onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="animate-spin" />}
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
