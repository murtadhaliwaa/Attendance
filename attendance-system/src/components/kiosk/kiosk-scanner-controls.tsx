"use client";

import { useMemo, useState } from "react";
import { Camera, KeyRound, Search, UserPlus } from "lucide-react";
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
import type { RosterEmployee } from "@/hooks/use-kiosk-scanner";

interface KioskScannerControlsProps {
  isCheckin: boolean;
  accentActionClass: string;
  showEmergency: boolean;
  emergencyCode: string;
  onEmergencyCodeChange: (value: string) => void;
  emergencyEmployeeId: string;
  onEmergencyEmployeeChange: (value: string) => void;
  roster: RosterEmployee[];
  rosterLoading: boolean;
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
  emergencyEmployeeId,
  onEmergencyEmployeeChange,
  roster,
  rosterLoading,
  onToggleEmergency,
  onSubmitEmergency,
  showEnroll,
  enrollName,
  onEnrollNameChange,
  onOpenEnroll,
  onSubmitEnroll,
}: KioskScannerControlsProps) {
  const [employeeSearch, setEmployeeSearch] = useState("");

  const filteredRoster = useMemo(() => {
    const query = employeeSearch.trim().toLowerCase();
    if (!query) return roster;
    return roster.filter(
      (e) =>
        e.name.toLowerCase().includes(query) ||
        e.employeeCode.toLowerCase().includes(query) ||
        e.department.toLowerCase().includes(query)
    );
  }, [roster, employeeSearch]);
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
        <div className="shrink-0 space-y-2 rounded-lg border border-bg-border bg-bg-elevated p-2">
          <p className="text-[11px] leading-snug text-text-secondary">
            <strong>الرمز الطارئ:</strong> يختار مسؤول الشفت اسم الموظف ويُدخل
            رمزه الخاص لتسجيل {isCheckin ? "حضور" : "انصراف"} الموظف.
          </p>

          <div className="relative">
            <Search className="absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-text-muted" />
            <Input
              aria-label="بحث عن موظف"
              placeholder="ابحث عن الموظف بالاسم أو الرقم..."
              value={employeeSearch}
              onChange={(e) => setEmployeeSearch(e.target.value)}
              className="h-9 pr-9 text-right"
            />
          </div>

          <Select
            value={emergencyEmployeeId}
            onValueChange={(value) => onEmergencyEmployeeChange(value ?? "")}
            disabled={rosterLoading}
          >
            <SelectTrigger className="h-10 w-full">
              <SelectValue
                placeholder={
                  rosterLoading
                    ? "جاري تحميل الموظفين..."
                    : "اختر اسم الموظف"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {filteredRoster.length === 0 ? (
                <div className="px-3 py-2 text-center text-xs text-text-muted">
                  لا توجد نتائج
                </div>
              ) : (
                filteredRoster.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id}>
                    {employee.name} ({employee.employeeCode})
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2">
            <Input
              id="kiosk-emergency-code"
              aria-label="الرمز الطارئ لمسؤول الشفت"
              name="emergencyCode"
              autoComplete="one-time-code"
              inputMode="numeric"
              placeholder="رمز مسؤول الشفت"
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
