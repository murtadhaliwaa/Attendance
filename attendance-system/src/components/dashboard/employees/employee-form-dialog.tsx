"use client";

import { useEffect, useState } from "react";
import { Briefcase, IdCard, Loader2, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { parseJsonResponse } from "@/lib/api-utils";
import {
  type EmployeeFormData,
  type EmployeeRow,
  type ShiftOption,
  emptyEmployeeForm,
} from "@/lib/employee-types";
import { CustomEndTimePicker } from "@/components/dashboard/employees/custom-end-time-picker";
import { SelectionCard } from "@/components/dashboard/selection-card";
import { formatShiftRangeLabel } from "@/lib/schedule-utils";

interface EmployeeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: EmployeeRow | null;
  shifts: ShiftOption[];
  departments: string[];
  positions: string[];
  suggestedCode?: string;
  suggestedEmergencyCode?: string;
  onSuccess: () => void;
}

function toFormData(employee: EmployeeRow): EmployeeFormData {
  return {
    employeeCode: employee.employeeCode,
    name: employee.name,
    department: employee.department,
    position: employee.position,
    phone: employee.phone ?? "",
    emergencyCode: employee.emergencyCode,
    shiftId: employee.shiftId ?? "",
    customEndTime: employee.customEndTime ?? "",
    isActive: employee.isActive,
  };
}

function FormSection({
  title,
  description,
  icon: Icon,
  children,
}: {
  title: string;
  description?: string;
  icon: typeof UserRound;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3 rounded-xl border border-bg-border bg-bg-elevated/40 p-4">
      <div className="space-y-0.5">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-bg-elevated text-text-secondary">
            <Icon className="size-4" />
          </div>
          <h3 className="text-sm font-medium text-text-primary">{title}</h3>
        </div>
        {description && (
          <p className="ps-10.5 text-xs leading-relaxed text-text-secondary">
            {description}
          </p>
        )}
      </div>
      {children}
    </section>
  );
}

function FieldHint({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs leading-relaxed text-text-secondary">{children}</p>
  );
}

export function EmployeeFormDialog({
  open,
  onOpenChange,
  employee,
  shifts,
  departments,
  positions,
  suggestedCode,
  suggestedEmergencyCode,
  onSuccess,
}: EmployeeFormDialogProps) {
  const isEdit = !!employee;
  const [form, setForm] = useState<EmployeeFormData>(emptyEmployeeForm());
  const [saving, setSaving] = useState(false);

  const selectedShift = shifts.find((shift) => shift.id === form.shiftId);

  useEffect(() => {
    if (!open) return;

    if (employee) {
      const data = toFormData(employee);
      setForm({
        ...data,
        shiftId: data.shiftId || shifts[0]?.id || "",
      });
    } else {
      setForm({
        ...emptyEmployeeForm(""),
        employeeCode: suggestedCode ?? "",
        emergencyCode: suggestedEmergencyCode ?? "",
        shiftId: shifts[0]?.id ?? "",
      });
    }
  }, [open, employee, suggestedCode, suggestedEmergencyCode, shifts, departments]);

  function updateField<K extends keyof EmployeeFormData>(
    key: K,
    value: EmployeeFormData[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      if (!form.shiftId) {
        throw new Error("يجب اختيار شفت للموظف");
      }

      const payload = {
        ...form,
        employeeCode: form.employeeCode.trim().toUpperCase(),
        name: form.name.trim(),
        department: form.department.trim(),
        position: form.position.trim(),
        phone: form.phone.trim(),
        emergencyCode: form.emergencyCode.trim(),
        shiftId: form.shiftId,
        customEndTime: form.customEndTime.trim() || null,
      };

      const res = await fetch(
        isEdit ? `/api/employees/${employee!.id}` : "/api/employees",
        {
          method: isEdit ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const data = await parseJsonResponse<{ message?: string; error?: string }>(
        res
      );

      if (!res.ok) {
        throw new Error(data.error ?? "فشل حفظ البيانات");
      }

      toast.success(data.message ?? "تم الحفظ بنجاح");
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "فشل حفظ البيانات");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
        <DialogHeader className="shrink-0 gap-1.5 border-b border-bg-border bg-bg-card px-5 py-4 pe-12 sm:px-6">
          <DialogTitle className="text-lg">
            {isEdit ? "تعديل بيانات الموظف" : "إضافة موظف جديد"}
          </DialogTitle>
          <DialogDescription className="text-text-secondary">
            {isEdit
              ? "عدّل بيانات الموظف واحفظ التغييرات"
              : "أدخل البيانات الأساسية الآن، وتسجيل الوجه يتم لاحقاً من الكشك"}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
          <form id="employee-form" onSubmit={handleSubmit} className="space-y-4">
            <FormSection
              title="التعريف"
              description="رقم الموظف للإدارة والرمز الطارئ للكشك عند تعذّر التعرف على الوجه"
              icon={IdCard}
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="employeeCode">رقم الموظف</Label>
                  <Input
                    id="employeeCode"
                    dir="ltr"
                    className="h-9 font-mono"
                    placeholder="EMP089"
                    value={form.employeeCode}
                    onChange={(e) =>
                      updateField("employeeCode", e.target.value.toUpperCase())
                    }
                    disabled={isEdit}
                  />
                  {!isEdit && (
                    <FieldHint>اتركه فارغاً ليُولَّد تلقائياً</FieldHint>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="emergencyCode">الرمز الطارئ</Label>
                  <Input
                    id="emergencyCode"
                    dir="ltr"
                    className="h-9 font-mono tracking-wider"
                    placeholder="100089"
                    maxLength={6}
                    inputMode="numeric"
                    value={form.emergencyCode}
                    onChange={(e) =>
                      updateField(
                        "emergencyCode",
                        e.target.value.replace(/\D/g, "")
                      )
                    }
                  />
                  <FieldHint>6 أرقام — للطوارئ في الكشك</FieldHint>
                </div>
              </div>
            </FormSection>

            <FormSection title="البيانات الشخصية" icon={UserRound}>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="name">
                    الاسم الكامل <span className="text-rose-300">*</span>
                  </Label>
                  <Input
                    id="name"
                    placeholder="محمد العتيبي"
                    value={form.name}
                    onChange={(e) => updateField("name", e.target.value)}
                    required
                    autoFocus={!isEdit}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="phone">رقم الجوال</Label>
                  <Input
                    id="phone"
                    dir="ltr"
                    className="h-9 font-mono"
                    placeholder="05xxxxxxxx"
                    inputMode="tel"
                    value={form.phone}
                    onChange={(e) => updateField("phone", e.target.value)}
                  />
                </div>
              </div>
            </FormSection>

            <FormSection
              title="بيانات العمل"
              description="اكتب قسماً أو مسمى جديداً، أو اختر من الاقتراحات أثناء الكتابة"
              icon={Briefcase}
            >
              <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="department">
                      القسم <span className="text-rose-300">*</span>
                    </Label>
                    <Input
                      id="department"
                      list="department-suggestions"
                      placeholder="مثال: المحاسبة"
                      value={form.department}
                      onChange={(e) =>
                        updateField("department", e.target.value)
                      }
                      required
                    />
                    <datalist id="department-suggestions">
                      {departments.map((dept) => (
                        <option key={dept} value={dept} />
                      ))}
                    </datalist>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="position">
                      المسمى الوظيفي <span className="text-rose-300">*</span>
                    </Label>
                    <Input
                      id="position"
                      list="position-suggestions"
                      placeholder="مثال: مدير"
                      value={form.position}
                      onChange={(e) => updateField("position", e.target.value)}
                      required
                    />
                    <datalist id="position-suggestions">
                      {positions.map((pos) => (
                        <option key={pos} value={pos} />
                      ))}
                    </datalist>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>الشفت</Label>
                  <p className="text-xs text-text-muted">
                    يحدد أوقات التأخير والانصراف المبكر لهذا الموظف في
                    الكشك والتقارير.
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {shifts.map((shift) => (
                      <SelectionCard
                        key={shift.id}
                        title={shift.name}
                        subtitle={formatShiftRangeLabel(
                          shift.startTime,
                          shift.endTime
                        )}
                        selected={form.shiftId === shift.id}
                        onClick={() => {
                          const isNewShift = form.shiftId !== shift.id;
                          updateField("shiftId", shift.id);
                          if (isNewShift) {
                            updateField("customEndTime", "");
                          }
                        }}
                      />
                    ))}
                  </div>
                  {selectedShift && (
                    <CustomEndTimePicker
                      shiftEndTime={selectedShift.endTime}
                      value={form.customEndTime}
                      onChange={(customEndTime) =>
                        updateField("customEndTime", customEndTime)
                      }
                    />
                  )}
                </div>
              </div>
            </FormSection>

            {isEdit && (
              <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-bg-border bg-bg-elevated/40 px-3 py-2.5">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => updateField("isActive", e.target.checked)}
                  className="size-4 rounded border-bg-border accent-blue-primary"
                />
                <span className="text-sm text-text-primary">موظف نشط</span>
              </label>
            )}
          </form>
        </div>

        <DialogFooter className="mx-0 mb-0 shrink-0 flex-row gap-3 rounded-b-xl border-t border-bg-border bg-bg-elevated/60 px-5 py-3.5 sm:justify-end sm:px-6">
          <Button
            type="button"
            variant="ghost"
            size="lg"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            إلغاء
          </Button>
          <Button
            type="submit"
            form="employee-form"
            disabled={saving}
            size="lg"
            className="min-w-[7.5rem] border-transparent bg-blue-primary text-white hover:bg-blue-dark"
          >
            {saving && <Loader2 className="animate-spin" />}
            {isEdit ? "حفظ التعديلات" : "إضافة الموظف"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
