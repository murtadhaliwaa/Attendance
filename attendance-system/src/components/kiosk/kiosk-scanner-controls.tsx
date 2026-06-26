"use client";

import { Camera, KeyRound, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface KioskScannerControlsProps {
  isCheckin: boolean;
  accentActionClass: string;
  showEmergency: boolean;
  emergencyCode: string;
  onEmergencyCodeChange: (value: string) => void;
  onToggleEmergency: () => void;
  onSubmitEmergency: () => void;
  showEnroll: boolean;
  enrollName: string;
  onEnrollNameChange: (value: string) => void;
  onOpenEnroll: () => void;
  onSubmitEnroll: () => void;
}

export function KioskScannerControls({
  isCheckin,
  accentActionClass,
  showEmergency,
  emergencyCode,
  onEmergencyCodeChange,
  onToggleEmergency,
  onSubmitEmergency,
  showEnroll,
  enrollName,
  onEnrollNameChange,
  onOpenEnroll,
  onSubmitEnroll,
}: KioskScannerControlsProps) {
  return (
    <>
      <div className="flex shrink-0 flex-wrap justify-center gap-2">
        <Button
          variant="outline"
          className={cn("h-9 px-3 text-sm", accentActionClass)}
          onClick={onToggleEmergency}
        >
          <KeyRound className="size-4" />
          رمز طارئ
        </Button>
        {isCheckin && (
          <Button
            variant="outline"
            className="h-9 px-3 text-sm"
            onClick={onOpenEnroll}
          >
            <UserPlus className="size-4" />
            موظف جديد
          </Button>
        )}
      </div>

      {showEmergency && (
        <div className="flex shrink-0 items-center gap-2">
          <Input
            id="kiosk-emergency-code"
            aria-label="الرمز الطارئ"
            name="emergencyCode"
            autoComplete="one-time-code"
            placeholder="أدخل الرمز الطارئ"
            value={emergencyCode}
            onChange={(e) => onEmergencyCodeChange(e.target.value)}
            dir="ltr"
            className="h-10 text-center focus:placeholder:text-transparent"
          />
          <Button
            variant="outline"
            className={cn("h-10 shrink-0 rounded-lg px-5", accentActionClass)}
            onClick={onSubmitEmergency}
          >
            تأكيد
          </Button>
        </div>
      )}

      {showEnroll && isCheckin && (
        <div className="shrink-0 space-y-1 rounded-lg border border-bg-border bg-bg-elevated p-2">
          <p className="text-[10px] leading-snug text-text-secondary">
            <strong>للمرة الأولى فقط:</strong> اكتب اسمك ثم اضغط تسجيل.
          </p>
          <div className="flex gap-2">
            <Input
              id="kiosk-enroll-name"
              aria-label="الاسم الكامل"
              name="employeeName"
              autoComplete="name"
              placeholder="مثال: محمد العتيبي"
              value={enrollName}
              onChange={(e) => onEnrollNameChange(e.target.value)}
              className="text-right"
            />
            <Button
              variant="outline"
              className={cn("h-10 shrink-0 rounded-lg px-4", accentActionClass)}
              onClick={onSubmitEnroll}
            >
              <Camera className="size-4" />
              تسجيل
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
