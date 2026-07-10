"use client";

import { cn } from "@/lib/utils";
import { formatShiftRangeLabel } from "@/lib/schedule-utils";
import type { ShiftOption } from "@/hooks/use-kiosk-photo-scanner";

type KioskShiftPickerProps = {
  shifts: ShiftOption[];
  value: string;
  onChange: (shiftId: string) => void;
  isCheckin?: boolean;
};

export function KioskShiftPicker({
  shifts,
  value,
  onChange,
  isCheckin = true,
}: KioskShiftPickerProps) {
  const accentSelected = isCheckin
    ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-100"
    : "border-sky-500/40 bg-sky-500/15 text-sky-100";
  if (shifts.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-bg-border px-3 py-4 text-center text-sm text-text-muted">
        لا توجد شفتات متاحة
      </p>
    );
  }

  if (shifts.length === 1) {
    const shift = shifts[0]!;
    return (
      <div className="rounded-xl border border-bg-border bg-bg-card/60 px-3 py-2.5 text-sm">
        <span className="font-medium text-text-primary">{shift.name}</span>
        <span className="mx-1.5 text-text-muted">·</span>
        <span className="text-text-secondary">
          {formatShiftRangeLabel(shift.startTime, shift.endTime)}
        </span>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {shifts.map((shift) => {
        const selected = shift.id === value;

        return (
          <button
            key={shift.id}
            type="button"
            onClick={() => onChange(shift.id)}
            className={cn(
              "rounded-xl border px-3 py-2.5 text-start transition-colors",
              selected
                ? accentSelected
                : "border-bg-border bg-bg-card/60 text-text-secondary hover:border-bg-border hover:bg-bg-elevated"
            )}
          >
            <span className="block text-sm font-medium">{shift.name}</span>
            <span className="mt-0.5 block text-xs opacity-80">
              {formatShiftRangeLabel(shift.startTime, shift.endTime)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
