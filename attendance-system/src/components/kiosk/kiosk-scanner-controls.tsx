"use client";

import { useMemo, useState } from "react";
import { Camera, Search } from "lucide-react";
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
  onCaptureAndSubmit: () => void;
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
  onCaptureAndSubmit,
  submitting,
}: KioskScannerControlsProps) {
  const [employeeSearch, setEmployeeSearch] = useState("");

  const shiftEmployees = useMemo(() => {
    if (!selectedShiftId) return [];
    return roster
      .filter((employee) => employee.shiftId === selectedShiftId)
      .sort((a, b) => a.name.localeCompare(b.name, "ar"));
  }, [roster, selectedShiftId]);

  const unassignedCount = useMemo(
    () => roster.filter((employee) => !employee.shiftId).length,
    [roster]
  );

  const filteredRoster = useMemo(() => {
    const query = employeeSearch.trim().toLowerCase();
    if (!query) return shiftEmployees;
    return shiftEmployees.filter(
      (employee) =>
        employee.name.toLowerCase().includes(query) ||
        employee.department.toLowerCase().includes(query)
    );
  }, [employeeSearch, shiftEmployees]);

  const selectedEmployeeLabel = useMemo(
    () =>
      shiftEmployees.find((employee) => employee.id === selectedEmployeeId)
        ?.name,
    [shiftEmployees, selectedEmployeeId]
  );

  const selectedShiftLabel = useMemo(() => {
    const shift = shifts.find((item) => item.id === selectedShiftId);
    if (!shift) return undefined;
    return `${shift.name} (${formatShiftRangeLabel(shift.startTime, shift.endTime)})`;
  }, [shifts, selectedShiftId]);

  function handleShiftChange(value: string | null) {
    onShiftChange(value ?? "");
    onEmployeeChange("");
    setEmployeeSearch("");
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-hidden sm:gap-1.5">
      <div className="flex min-h-0 flex-1 flex-col gap-1.5 rounded-xl border border-bg-border bg-bg-elevated/80 p-2 sm:gap-3 sm:p-3">
        <div className="space-y-1">
          <p className="text-[11px] font-medium text-text-primary sm:text-xs">
            ١. اختر الشفت
          </p>
          <Select
            value={selectedShiftId}
            onValueChange={handleShiftChange}
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

        <div className="space-y-1">
          <p className="text-[11px] font-medium text-text-primary sm:text-xs">
            ٢. اختر اسمك
          </p>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2 text-text-muted sm:right-3 sm:size-4" />
            <Input
              aria-label="تصفية قائمة الموظفين"
              placeholder={
                selectedShiftId ? "ابحث..." : "اختر الشفت أولاً"
              }
              value={employeeSearch}
              onChange={(event) => setEmployeeSearch(event.target.value)}
              disabled={!selectedShiftId}
              className="h-9 rounded-lg border-bg-border bg-bg-card/80 pr-9 text-xs sm:h-10 sm:rounded-xl sm:pr-10 sm:text-sm"
            />
          </div>
          <Select
            value={selectedEmployeeId}
            onValueChange={(value) => onEmployeeChange(value ?? "")}
            disabled={rosterLoading || !selectedShiftId}
          >
            <SelectTrigger className="h-9 w-full rounded-lg text-xs sm:h-11 sm:rounded-xl sm:text-sm">
              <SelectValue
                placeholder={
                  !selectedShiftId
                    ? "اختر الشفت أولاً"
                    : rosterLoading
                      ? "جاري تحميل الموظفين..."
                      : "اختر اسمك"
                }
              >
                {selectedEmployeeLabel}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {!selectedShiftId ? (
                <p className="px-2 py-3 text-center text-sm text-text-muted">
                  اختر الشفت أولاً
                </p>
              ) : filteredRoster.length === 0 ? (
                <p className="px-2 py-3 text-center text-sm text-text-muted">
                  {employeeSearch.trim()
                    ? "لا توجد نتائج للبحث"
                    : "لا يوجد موظف لهذا الشفت"}
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
          {selectedShiftId && !rosterLoading && (
            <div className="space-y-0.5 text-[10px] text-text-muted sm:text-[11px]">
              <p>{shiftEmployees.length} موظف في هذا الشفت</p>
              {unassignedCount > 0 && (
                <p className="text-amber-200/90">
                  {unassignedCount} بلا شفت معيّن — عيّن الشفت من إدارة
                  الموظفين ليظهروا هنا
                </p>
              )}
            </div>
          )}
        </div>

        <div className="shrink-0 space-y-1 pt-0.5">
          <p className="text-[11px] font-medium text-text-primary sm:text-xs">
            ٣. التقط وأرسل
          </p>
          <Button
            className={cn(
              "h-11 w-full rounded-lg text-sm sm:h-12 sm:rounded-xl sm:text-base",
              accentActionClass
            )}
            onClick={onCaptureAndSubmit}
            disabled={
              submitting || !selectedShiftId || !selectedEmployeeId
            }
          >
            <Camera className="size-4 sm:size-5" />
            التقاط وإرسال للمراجعة
          </Button>
        </div>
      </div>
    </div>
  );
}
