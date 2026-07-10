"use client";

import { useMemo, useState } from "react";
import { Camera, KeyRound, Search, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CameraFacingSelector } from "@/components/kiosk/camera-facing-selector";
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
  isCheckin: boolean;
  accentActionClass: string;
  showEmergency: boolean;
  emergencyCode: string;
  onEmergencyCodeChange: (value: string) => void;
  emergencyEmployeeId: string;
  onEmergencyEmployeeChange: (value: string) => void;
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
  onToggleEmergency: () => void;
  onSubmitEmergency: () => void;
}

export function KioskScannerControls({
  isCheckin,
  accentActionClass,
  showEmergency,
  emergencyCode,
  onEmergencyCodeChange,
  emergencyEmployeeId,
  onEmergencyEmployeeChange,
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
  onToggleEmergency,
  onSubmitEmergency,
}: KioskScannerControlsProps) {
  const [employeeSearch, setEmployeeSearch] = useState("");

  const filteredRoster = useMemo(() => {
    const query = employeeSearch.trim().toLowerCase();
    if (!query) return roster;
    return roster.filter(
      (e) =>
        e.name.toLowerCase().includes(query) ||
        e.department.toLowerCase().includes(query)
    );
  }, [roster, employeeSearch]);

  return (
    <>
      <CameraFacingSelector compact className="mx-auto max-w-xs shrink-0" />

      {!showEmergency && (
        <div className="shrink-0 space-y-2 rounded-lg border border-bg-border bg-bg-elevated p-2">
          <p className="text-[11px] leading-snug text-text-secondary">
            اختر اسمك والشفت، ثم التقط صورتك وأرسلها لمراجعة موظف الاستعلامات.
          </p>

          <div className="relative">
            <Search className="absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-text-muted" />
            <Input
              aria-label="بحث عن موظف"
              placeholder="ابحث بالاسم..."
              value={employeeSearch}
              onChange={(e) => setEmployeeSearch(e.target.value)}
              className="h-9 pr-9 text-right"
            />
          </div>

          <Select
            value={selectedEmployeeId}
            onValueChange={(value) => onEmployeeChange(value ?? "")}
            disabled={rosterLoading}
          >
            <SelectTrigger className="h-10 w-full">
              <SelectValue
                placeholder={
                  rosterLoading ? "جاري تحميل الموظفين..." : "اختر اسمك"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {filteredRoster.map((employee) => (
                <SelectItem key={employee.id} value={employee.id}>
                  {employee.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={selectedShiftId}
            onValueChange={(value) => onShiftChange(value ?? "")}
            disabled={shifts.length === 0}
          >
            <SelectTrigger className="h-10 w-full">
              <SelectValue placeholder="اختر الشفت" />
            </SelectTrigger>
            <SelectContent>
              {shifts.map((shift) => (
                <SelectItem key={shift.id} value={shift.id}>
                  {shift.name} ({formatShiftRangeLabel(shift.startTime, shift.endTime)})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              className="h-10"
              onClick={onCapturePreview}
              disabled={submitting}
            >
              <Camera className="size-4" />
              التقاط صورة
            </Button>
            <Button
              className={cn("h-10", accentActionClass)}
              onClick={onSubmitPhoto}
              disabled={submitting}
            >
              <Send className="size-4" />
              إرسال للمراجعة
            </Button>
          </div>
        </div>
      )}

      <div className="flex shrink-0 justify-center">
        <Button
          variant="outline"
          className={cn("h-9 px-3 text-sm", accentActionClass)}
          onClick={onToggleEmergency}
        >
          <KeyRound className="size-4" />
          رمز طارئ
        </Button>
      </div>

      {showEmergency && (
        <div className="shrink-0 space-y-2 rounded-lg border border-bg-border bg-bg-elevated p-2">
          <p className="text-[11px] leading-snug text-text-secondary">
            <strong>الرمز الطارئ:</strong> يختار مسؤول الشفت اسم الموظف ويُدخل
            رمزه الخاص لتسجيل {isCheckin ? "حضور" : "انصراف"} الموظف.
          </p>

          <Select
            value={emergencyEmployeeId}
            onValueChange={(value) => onEmergencyEmployeeChange(value ?? "")}
            disabled={rosterLoading}
          >
            <SelectTrigger className="h-10 w-full">
              <SelectValue placeholder="اختر اسم الموظف" />
            </SelectTrigger>
            <SelectContent>
              {roster.map((employee) => (
                <SelectItem key={employee.id} value={employee.id}>
                  {employee.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2">
            <Input
              aria-label="الرمز الطارئ لمسؤول الشفت"
              placeholder="رمز مسؤول الشفت"
              value={emergencyCode}
              onChange={(e) => onEmergencyCodeChange(e.target.value)}
              dir="ltr"
              className="h-10 text-center"
            />
            <Button
              variant="outline"
              className={cn("h-10 shrink-0 rounded-lg px-5", accentActionClass)}
              onClick={onSubmitEmergency}
            >
              تأكيد
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
