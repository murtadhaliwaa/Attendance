"use client";

import { useMemo, useState, type FocusEvent } from "react";
import { Camera, Check, Search, X } from "lucide-react";
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
  onFormFocusChange?: (focused: boolean) => void;
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
  onFormFocusChange,
}: KioskScannerControlsProps) {
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);

  function scrollFieldIntoView(target: HTMLElement) {
    // انتظر فتح الكيبورد ثم حرّك الحقل ليظهر فوقه
    window.setTimeout(() => {
      target.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "nearest",
      });
    }, 150);
    window.setTimeout(() => {
      target.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "nearest",
      });
    }, 350);
  }

  function handleSearchFocus(event: FocusEvent<HTMLInputElement>) {
    setSuggestionsOpen(true);
    onFormFocusChange?.(true);
    scrollFieldIntoView(event.currentTarget);
  }

  function handleSearchBlur() {
    // تأخير قصير حتى يمكن الضغط على اقتراح قبل إغلاق القائمة
    window.setTimeout(() => {
      setSuggestionsOpen(false);
      onFormFocusChange?.(false);
    }, 180);
  }

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

  const selectedEmployee = useMemo(
    () =>
      shiftEmployees.find((employee) => employee.id === selectedEmployeeId) ??
      null,
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
    setSuggestionsOpen(false);
  }

  function handleSearchChange(value: string) {
    setEmployeeSearch(value);
    setSuggestionsOpen(true);

    if (
      selectedEmployeeId &&
      shiftEmployees.find((employee) => employee.id === selectedEmployeeId)
        ?.name !== value
    ) {
      onEmployeeChange("");
    }
  }

  function selectEmployee(employee: RosterEmployee) {
    onEmployeeChange(employee.id);
    setEmployeeSearch(employee.name);
    setSuggestionsOpen(false);
  }

  function clearSelection() {
    onEmployeeChange("");
    setEmployeeSearch("");
    setSuggestionsOpen(true);
  }

  const showSuggestions =
    suggestionsOpen && !!selectedShiftId && !rosterLoading;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-bg-border bg-bg-elevated/80">
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain p-2 sm:space-y-3 sm:p-3 [@media(max-height:700px)]:space-y-1.5 [@media(max-height:700px)]:p-1.5">
        <div className="space-y-1">
          <p className="text-[11px] font-medium text-text-primary sm:text-xs">
            ١. اختر الشفت
          </p>
          <Select
            value={selectedShiftId}
            onValueChange={handleShiftChange}
            disabled={shifts.length === 0}
          >
            <SelectTrigger className="h-10 w-full rounded-lg text-xs sm:h-11 sm:rounded-xl sm:text-sm [@media(max-height:700px)]:h-9">
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
            <Search className="pointer-events-none absolute top-1/2 right-2.5 z-10 size-3.5 -translate-y-1/2 text-text-muted sm:right-3 sm:size-4" />
            <Input
              aria-label="ابحث عن اسمك"
              aria-autocomplete="list"
              aria-expanded={showSuggestions}
              type="text"
              name="kiosk-employee-filter"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              inputMode="search"
              enterKeyHint="search"
              data-1p-ignore
              data-lpignore="true"
              data-form-type="other"
              placeholder={
                !selectedShiftId
                  ? "اختر الشفت أولاً"
                  : rosterLoading
                    ? "جاري تحميل الموظفين..."
                    : "اكتب اسمك..."
              }
              value={employeeSearch}
              onChange={(event) => handleSearchChange(event.target.value)}
              onFocus={handleSearchFocus}
              onBlur={handleSearchBlur}
              disabled={!selectedShiftId || rosterLoading}
              className="h-10 rounded-lg border-bg-border bg-bg-card/80 pr-9 pl-9 text-xs sm:h-10 sm:rounded-xl sm:pr-10 sm:pl-10 sm:text-sm [@media(max-height:700px)]:h-9"
            />
            {(employeeSearch || selectedEmployeeId) && (
              <button
                type="button"
                aria-label="مسح الاسم"
                className="absolute top-1/2 left-2.5 z-10 -translate-y-1/2 rounded-md p-0.5 text-text-muted hover:text-text-primary"
                onMouseDown={(event) => event.preventDefault()}
                onClick={clearSelection}
              >
                <X className="size-3.5 sm:size-4" />
              </button>
            )}
          </div>

          {selectedEmployee && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-500/35 bg-emerald-500/10 px-2.5 py-2 text-xs text-emerald-100 sm:text-sm">
              <Check className="size-4 shrink-0" />
              <span className="min-w-0 truncate font-medium">
                {selectedEmployee.name}
              </span>
              <span className="shrink-0 text-[10px] text-emerald-200/80 sm:text-xs">
                {selectedEmployee.department}
              </span>
            </div>
          )}

          {showSuggestions && (
            <div
              role="listbox"
              aria-label="اقتراحات الأسماء"
              className="max-h-44 overflow-y-auto overscroll-contain rounded-lg border border-bg-border bg-bg-card shadow-lg sm:max-h-56"
            >
              {filteredRoster.length === 0 ? (
                <p className="px-3 py-3 text-center text-xs text-text-muted sm:text-sm">
                  {employeeSearch.trim()
                    ? "لا توجد نتائج للبحث"
                    : "لا يوجد موظف لهذا الشفت"}
                </p>
              ) : (
                filteredRoster.map((employee) => (
                  <button
                    key={employee.id}
                    type="button"
                    role="option"
                    aria-selected={selectedEmployeeId === employee.id}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 border-b border-bg-border/60 px-3 py-2.5 text-right text-xs last:border-b-0 hover:bg-bg-elevated active:bg-bg-elevated sm:text-sm",
                      selectedEmployeeId === employee.id &&
                        "bg-emerald-500/10 text-emerald-100"
                    )}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => selectEmployee(employee)}
                  >
                    <span className="min-w-0 truncate font-medium text-text-primary">
                      {employee.name}
                    </span>
                    <span className="shrink-0 text-[10px] text-text-muted sm:text-xs">
                      {employee.department}
                    </span>
                  </button>
                ))
              )}
            </div>
          )}

          {selectedShiftId && !rosterLoading && (
            <div className="space-y-0.5 text-[10px] text-text-muted sm:text-[11px]">
              <p>
                {employeeSearch.trim() && !selectedEmployeeId
                  ? `${filteredRoster.length} نتيجة من ${shiftEmployees.length}`
                  : `${shiftEmployees.length} موظف في هذا الشفت`}
              </p>
              {unassignedCount > 0 && (
                <p className="text-amber-200/90">
                  {unassignedCount} بلا شفت معيّن — عيّن الشفت من إدارة
                  الموظفين ليظهروا هنا
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="shrink-0 border-t border-bg-border bg-bg-elevated/95 p-2 sm:p-3 [@media(max-height:700px)]:p-1.5">
        <p className="mb-1 text-[11px] font-medium text-text-primary sm:text-xs">
          ٣. التقط وأرسل
        </p>
        <Button
          className={cn(
            "h-11 w-full rounded-lg text-sm sm:h-12 sm:rounded-xl sm:text-base",
            "[@media(max-height:700px)]:h-10 [@media(max-height:700px)]:text-sm",
            accentActionClass
          )}
          onClick={onCaptureAndSubmit}
          disabled={submitting || !selectedShiftId || !selectedEmployeeId}
        >
          <Camera className="size-4 sm:size-5" />
          التقاط وإرسال للمراجعة
        </Button>
      </div>
    </div>
  );
}
