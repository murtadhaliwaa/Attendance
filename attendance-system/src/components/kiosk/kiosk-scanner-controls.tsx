"use client";

import { Camera, KeyRound, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CameraFacingSelector } from "@/components/kiosk/camera-facing-selector";
import { KioskEmployeePicker } from "@/components/kiosk/kiosk-employee-picker";
import { KioskShiftPicker } from "@/components/kiosk/kiosk-shift-picker";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
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
  return (
    <>
      <CameraFacingSelector compact className="mx-auto max-w-xs shrink-0" />

      {!showEmergency && (
        <div className="shrink-0 space-y-3 rounded-xl border border-bg-border bg-bg-elevated/80 p-3">
          <div className="space-y-1">
            <p className="text-xs font-medium text-text-primary">١. اختر اسمك</p>
            <KioskEmployeePicker
              roster={roster}
              value={selectedEmployeeId}
              onChange={onEmployeeChange}
              loading={rosterLoading}
              isCheckin={isCheckin}
            />
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-medium text-text-primary">٢. اختر الشفت</p>
            <KioskShiftPicker
              shifts={shifts}
              value={selectedShiftId}
              onChange={onShiftChange}
              isCheckin={isCheckin}
            />
          </div>

          <div className="space-y-1.5 pt-1">
            <p className="text-xs font-medium text-text-primary">
              ٣. التقط صورتك وأرسلها
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                className="h-11 rounded-xl"
                onClick={onCapturePreview}
                disabled={submitting}
              >
                <Camera className="size-4" />
                التقاط صورة
              </Button>
              <Button
                className={cn("h-11 rounded-xl", accentActionClass)}
                onClick={onSubmitPhoto}
                disabled={submitting}
              >
                <Send className="size-4" />
                إرسال للمراجعة
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex shrink-0 justify-center">
        <Button
          variant="outline"
          className={cn("h-9 rounded-xl px-3 text-sm", accentActionClass)}
          onClick={onToggleEmergency}
        >
          <KeyRound className="size-4" />
          رمز طارئ
        </Button>
      </div>

      {showEmergency && (
        <div className="shrink-0 space-y-3 rounded-xl border border-bg-border bg-bg-elevated/80 p-3">
          <p className="text-[11px] leading-snug text-text-secondary">
            <strong>الرمز الطارئ:</strong> يختار مسؤول الشفت اسم الموظف ويُدخل
            رمزه الخاص لتسجيل {isCheckin ? "حضور" : "انصراف"} الموظف.
          </p>

          <KioskEmployeePicker
            roster={roster}
            value={emergencyEmployeeId}
            onChange={onEmergencyEmployeeChange}
            loading={rosterLoading}
            placeholder="ابحث عن اسم الموظف..."
            compact
            isCheckin={isCheckin}
          />

          <div className="flex items-center gap-2">
            <Input
              aria-label="الرمز الطارئ لمسؤول الشفت"
              placeholder="رمز مسؤول الشفت"
              value={emergencyCode}
              onChange={(e) => onEmergencyCodeChange(e.target.value)}
              dir="ltr"
              className="h-11 rounded-xl text-center"
            />
            <Button
              variant="outline"
              className={cn(
                "h-11 shrink-0 rounded-xl px-5",
                accentActionClass
              )}
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
