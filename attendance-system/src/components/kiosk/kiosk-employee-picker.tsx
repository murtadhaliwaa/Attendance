"use client";

import { useMemo, useState } from "react";
import { Check, Loader2, Search, UserRound } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { RosterEmployee } from "@/hooks/use-kiosk-photo-scanner";

type KioskEmployeePickerProps = {
  roster: RosterEmployee[];
  value: string;
  onChange: (employeeId: string) => void;
  loading?: boolean;
  placeholder?: string;
  compact?: boolean;
  isCheckin?: boolean;
};

export function KioskEmployeePicker({
  roster,
  value,
  onChange,
  loading = false,
  placeholder = "ابحث عن اسمك...",
  compact = false,
  isCheckin = true,
}: KioskEmployeePickerProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const selected = roster.find((employee) => employee.id === value);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const sorted = [...roster].sort((a, b) =>
      a.name.localeCompare(b.name, "ar")
    );

    if (!normalized) return sorted;

    return sorted.filter(
      (employee) =>
        employee.name.toLowerCase().includes(normalized) ||
        employee.department.toLowerCase().includes(normalized)
    );
  }, [query, roster]);

  function handleSelect(employeeId: string) {
    onChange(employeeId);
    setQuery("");
    setOpen(false);
  }

  const accentSelected = isCheckin
    ? "border-emerald-500/35 bg-emerald-500/10 hover:bg-emerald-500/15"
    : "border-sky-500/35 bg-sky-500/10 hover:bg-sky-500/15";
  const accentIcon = isCheckin
    ? "bg-emerald-500/20 text-emerald-200"
    : "bg-sky-500/20 text-sky-200";
  const accentChange = isCheckin ? "text-emerald-300" : "text-sky-300";
  const accentList = isCheckin ? "bg-emerald-500/10" : "bg-sky-500/10";
  const accentListIcon = isCheckin
    ? "bg-emerald-500/20 text-emerald-200"
    : "bg-sky-500/20 text-sky-200";

  if (loading) {
    return (
      <div className="flex h-11 items-center justify-center gap-2 rounded-xl border border-bg-border bg-bg-card/60 text-sm text-text-muted">
        <Loader2 className="size-4 animate-spin" />
        جاري تحميل الموظفين...
      </div>
    );
  }

  if (selected && !open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-start transition-colors",
          accentSelected,
          compact && "py-2"
        )}
      >
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-full",
            accentIcon
          )}
        >
          <Check className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-text-primary">
            {selected.name}
          </span>
          {!compact && (
            <span className="block truncate text-xs text-text-muted">
              {selected.department}
            </span>
          )}
        </span>
        <span className={cn("shrink-0 text-xs font-medium", accentChange)}>
          تغيير
        </span>
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-text-muted" />
        <Input
          aria-label="بحث عن موظف"
          placeholder={placeholder}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          className={cn(
            "h-11 rounded-xl border-bg-border bg-bg-card/80 pr-10 text-base",
            compact && "h-10 text-sm"
          )}
          autoComplete="off"
        />
        {open && selected && (
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setQuery("");
            }}
            className="absolute top-1/2 left-2 -translate-y-1/2 rounded-md px-2 py-1 text-xs text-text-muted hover:bg-bg-elevated hover:text-text-secondary"
          >
            إلغاء
          </button>
        )}
      </div>

      {open && (
        <div className="overflow-hidden rounded-xl border border-bg-border bg-bg-card/90 shadow-sm">
          <div className="max-h-32 overflow-y-auto overscroll-contain">
            {filtered.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-text-muted">
                {query.trim()
                  ? "لا يوجد موظف بهذا الاسم"
                  : "لا يوجد موظفون مسجّلون"}
              </p>
            ) : (
              <ul className="divide-y divide-bg-border/70">
                {filtered.map((employee) => {
                  const isSelected = employee.id === value;

                  return (
                    <li key={employee.id}>
                      <button
                        type="button"
                        onClick={() => handleSelect(employee.id)}
                        className={cn(
                          "flex w-full items-center gap-3 px-3 py-3 text-start transition-colors hover:bg-bg-elevated active:bg-bg-elevated",
                          isSelected && accentList
                        )}
                      >
                        <span
                          className={cn(
                            "flex size-8 shrink-0 items-center justify-center rounded-full",
                            isSelected
                              ? accentListIcon
                              : "bg-bg-elevated text-text-muted"
                          )}
                        >
                          {isSelected ? (
                            <Check className="size-4" />
                          ) : (
                            <UserRound className="size-4" />
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-text-primary">
                            {employee.name}
                          </span>
                          <span className="block truncate text-xs text-text-muted">
                            {employee.department}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          {filtered.length > 6 && (
            <p className="border-t border-bg-border/70 px-3 py-1.5 text-center text-[10px] text-text-muted">
              {filtered.length} موظف — مرّر للمزيد
            </p>
          )}
        </div>
      )}
    </div>
  );
}
