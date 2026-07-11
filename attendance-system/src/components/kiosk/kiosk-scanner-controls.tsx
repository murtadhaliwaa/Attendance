"use client";

import { useMemo, useState } from "react";
import { Camera, Search, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { formatShiftRangeLabel } from "@/lib/schedule-utils";
import type {
  RosterEmployee,
  ShiftOption,
} from "@/hooks/use-kiosk-photo-scanner";

interface KioskScannerControlsProps {
  accentActionClass: string;
  roster: RosterEmployee[];
  shifts: ShiftOption[];
  rosterLoading: boolean;
  selectedEmployeeId: string;
  onEmployeeChange: (value: string) => void;
  selectedShiftId: string;
  onShiftChange: (value: string) => void;
  onCapturePreview: () => void;
  onSubmitPhoto: () => void;
  submitting: boolean;
}

export function KioskScannerControls({
  accentActionClass,
  roster,
  shifts,
  rosterLoading,
  selectedEmployeeId,
  onEmployeeChange,
  selectedShiftId,
  onShiftChange,
  onCapturePreview,
  onSubmitPhoto,
  submitting,
}: KioskScannerControlsProps) {
  const [employeeSearch, setEmployeeSearch] = useState("");

  const filteredRoster = useMemo(() => {
    const query = employeeSearch.trim().toLowerCase();
    const sorted = [...roster].sort((a, b) =>
      a.name.localeCompare(b.name, "ar")
    );
    if (!query) return sorted;
    return sorted.filter(
      (employee) =>
        employee.name.toLowerCase().includes(query) ||
        employee.department.toLowerCase().includes(query)
    );
  }, [employeeSearch, roster]);

  const selectedEmployeeLabel = useMemo(
    () => roster.find((employee) => employee.id === selectedEmployeeId)?.name,
    [roster, selectedEmployeeId]
  );

  const selectedShiftLabel = useMemo(() => {
    const shift = shifts.find((item) => item.id === selectedShiftId);
    if (!shift) return undefined;
    return `${shift.name} (${formatShiftRangeLabel(shift.startTime, shift.endTime)})`;
  }, [shifts, selectedShiftId]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-hidden sm:gap-1.5">
      <div className="flex min-h-0 flex-1 flex-col gap-1.5 rounded-xl border border-bg-border bg-bg-elevated/80 p-2 sm:gap-3 sm:p-3">
        <div className="space-y-1">
          <p className="text-[11px] font-medium text-text-primary sm:text-xs">
            ١. اختر اسمك
          </p>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2 text-text-muted sm:right-3 sm:size-4" />
            <Input
              aria-label="تصفية قائمة الموظفين"
              placeholder="ابحث..."
              value={employeeSearch}
              onChange={(event) => setEmployeeSearch(event.target.value)}
              className="h-9 rounded-lg border-bg-border bg-bg-card/80 pr-9 text-xs sm:h-10 sm:rounded-xl sm:pr-10 sm:text-sm"
            />
          </div>
          <Select
            value={selectedEmployeeId}
            onValueChange={(value) => onEmployeeChange(value ?? "")}
            disabled={rosterLoading}
          >
            <SelectTrigger className="h-9 w-full rounded-lg text-xs sm:h-11 sm:rounded-xl sm:text-sm">
              <SelectValue
                placeholder={
                  rosterLoading ? "جاري تحميل الموظفين..." : "اختر اسمك"
                }
              >
                {selectedEmployeeLabel}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {filteredRoster.length === 0 ? (
                <p className="px-2 py-3 text-center text-sm text-text-muted">
                  لا يوجد موظف مطابق
                </p>
              ) : (
                filteredRoster.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id}>
                    {employee.name} — {employee.department}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Select
            value={selectedShiftId}
            onValueChange={(value) => onShiftChange(value ?? "")}
            disabled={shifts.length === 0}
          >
            <SelectTrigger className="h-9 w-full rounded-lg text-xs sm:h-11 sm:rounded-xl sm:text-sm">
              <SelectValue placeholder="اختر الشفت">
                {selectedShiftLabel}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {shifts.map((shift) => (
                <SelectItem key={shift.id} value={shift.id}>
                  {shift.name} (
                  {formatShiftRangeLabel(shift.startTime, shift.endTime)})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="shrink-0 space-y-1 pt-0.5">
          <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
            <Button
              variant="outline"
              className="h-9 rounded-lg text-xs sm:h-11 sm:rounded-xl sm:text-sm"
              onClick={onCapturePreview}
              disabled={submitting}
            >
              <Camera className="size-3.5 sm:size-4" />
              التقاط صورة
            </Button>
            <Button
              className={cn(
                "h-9 rounded-lg text-xs sm:h-11 sm:rounded-xl sm:text-sm",
                accentActionClass
              )}
              onClick={onSubmitPhoto}
              disabled={submitting}
            >
              <Send className="size-3.5 sm:size-4" />
              إرسال للمراجعة
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
