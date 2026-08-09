"use client";

import {
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
} from "react";
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
  const selectingRef = useRef(false);
  const pointerStartRef = useRef<{
    x: number;
    y: number;
    pointerId: number;
  } | null>(null);
  const pointerMovedRef = useRef(false);
  const ignoreNextClickRef = useRef(false);

  function handleSearchFocus() {
    setSuggestionsOpen(true);
    onFormFocusChange?.(true);
  }

  function handleSearchBlur() {
    // تأخير قصير حتى لا يُلغى الاختيار بسبب blur قبل pointerdown
    window.setTimeout(() => {
      if (selectingRef.current) return;
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
    selectingRef.current = true;
    onEmployeeChange(employee.id);
    setEmployeeSearch(employee.name);
    setSuggestionsOpen(false);
    onFormFocusChange?.(false);
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    window.setTimeout(() => {
      selectingRef.current = false;
    }, 250);
  }

  const TAP_MOVE_THRESHOLD_PX = 10;

  function handleEmployeePointerDown(event: PointerEvent<HTMLButtonElement>) {
    // لا نمنع الافتراضي حتى يعمل السحب؛ فقط نتتبّع إن كانت ضغطة أم تمرير
    selectingRef.current = true;
    pointerMovedRef.current = false;
    pointerStartRef.current = {
      x: event.clientX,
      y: event.clientY,
      pointerId: event.pointerId,
    };
  }

  function handleEmployeePointerMove(event: PointerEvent<HTMLButtonElement>) {
    const start = pointerStartRef.current;
    if (!start || start.pointerId !== event.pointerId) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.hypot(dx, dy) > TAP_MOVE_THRESHOLD_PX) {
      pointerMovedRef.current = true;
    }
  }

  function handleEmployeePointerUp(
    event: PointerEvent<HTMLButtonElement>,
    employee: RosterEmployee
  ) {
    const start = pointerStartRef.current;
    pointerStartRef.current = null;
    if (!start || start.pointerId !== event.pointerId) return;

    // كان سحباً للتمرير — لا تختر اسماً
    if (pointerMovedRef.current) {
      ignoreNextClickRef.current = true;
      window.setTimeout(() => {
        selectingRef.current = false;
      }, 200);
      return;
    }

    ignoreNextClickRef.current = true;
    selectEmployee(employee);
  }

  function handleEmployeePointerCancel() {
    pointerStartRef.current = null;
    pointerMovedRef.current = true;
    ignoreNextClickRef.current = true;
    window.setTimeout(() => {
      selectingRef.current = false;
    }, 200);
  }

  function handleEmployeeClick(
    event: MouseEvent<HTMLButtonElement>,
    employee: RosterEmployee
  ) {
    // pointerup يتولى اللمس؛ click احتياطي للفأرة/إمكانية الوصول
    if (ignoreNextClickRef.current) {
      ignoreNextClickRef.current = false;
      event.preventDefault();
      return;
    }
    if (pointerMovedRef.current) {
      event.preventDefault();
      return;
    }
    selectEmployee(employee);
  }

  function handleSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    const firstMatch = filteredRoster[0];
    if (firstMatch) selectEmployee(firstMatch);
  }

  function clearSelection() {
    onEmployeeChange("");
    setEmployeeSearch("");
    setSuggestionsOpen(true);
  }

  // أظهر القائمة دائماً بعد اختيار الشفت حتى تملأ ارتفاع الشاشة
  const showEmployeeList = !!selectedShiftId && !rosterLoading;

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-bg-border bg-bg-elevated/80">
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden p-2 sm:gap-3 sm:p-3 [@media(max-height:700px)]:gap-1.5 [@media(max-height:700px)]:p-1.5">
        <div className="shrink-0 space-y-1">
          <p className="text-[11px] font-medium text-text-primary sm:text-xs">
            ١. اختر الشفت
          </p>
          <Select
            value={selectedShiftId}
            onValueChange={handleShiftChange}
            disabled={shifts.length === 0}
          >
            <SelectTrigger className="h-11 w-full rounded-lg text-sm sm:rounded-xl [@media(max-height:700px)]:h-10">
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

        <div className="flex min-h-0 flex-1 flex-col gap-1">
          <p className="shrink-0 text-[11px] font-medium text-text-primary sm:text-xs">
            ٢. اختر اسمك
          </p>
          <div className="relative shrink-0">
            <Search className="pointer-events-none absolute top-1/2 right-3 z-10 size-4 -translate-y-1/2 text-text-muted" />
            <Input
              aria-label="ابحث عن اسمك"
              aria-autocomplete="list"
              aria-expanded={showEmployeeList && suggestionsOpen}
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
              onKeyDown={handleSearchKeyDown}
              disabled={!selectedShiftId || rosterLoading}
              // 16 بكسل على الموبايل يمنع تكبير iOS التلقائي عند التركيز
              className="h-11 rounded-lg border-bg-border bg-bg-card/80 pr-10 pl-11 text-base sm:h-11 sm:rounded-xl sm:text-sm [@media(max-height:700px)]:h-10"
            />
            {(employeeSearch || selectedEmployeeId) && (
              <button
                type="button"
                aria-label="مسح الاسم"
                className="absolute top-1/2 left-0 z-10 flex size-11 -translate-y-1/2 items-center justify-center rounded-md text-text-muted hover:text-text-primary"
                onMouseDown={(event) => event.preventDefault()}
                onClick={clearSelection}
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          {selectedEmployee && (
            <div className="flex shrink-0 items-center gap-2 rounded-lg border border-emerald-500/35 bg-emerald-500/10 px-2.5 py-2 text-xs text-emerald-100 sm:text-sm">
              <Check className="size-4 shrink-0" />
              <span className="min-w-0 truncate font-medium">
                {selectedEmployee.name}
              </span>
              <span className="shrink-0 text-[10px] text-emerald-200/80 sm:text-xs">
                {selectedEmployee.department}
              </span>
            </div>
          )}

          {showEmployeeList ? (
            <div
              role="listbox"
              aria-label="اقتراحات الأسماء"
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-lg border border-bg-border bg-bg-card"
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
                      "flex min-h-11 w-full touch-pan-y items-center justify-between gap-2 border-b border-bg-border/60 px-3 py-2 text-right text-sm last:border-b-0 hover:bg-bg-elevated active:bg-bg-elevated",
                      selectedEmployeeId === employee.id &&
                        "bg-emerald-500/10 text-emerald-100"
                    )}
                    onPointerDown={handleEmployeePointerDown}
                    onPointerMove={handleEmployeePointerMove}
                    onPointerUp={(event) =>
                      handleEmployeePointerUp(event, employee)
                    }
                    onPointerCancel={handleEmployeePointerCancel}
                    onClick={(event) => handleEmployeeClick(event, employee)}
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
          ) : (
            <div className="flex min-h-0 flex-1 items-center justify-center rounded-lg border border-dashed border-bg-border bg-bg-card/40 px-3 text-center text-xs text-text-muted sm:text-sm">
              {!selectedShiftId
                ? "اختر الشفت أولاً لعرض الأسماء"
                : "جاري تحميل الموظفين..."}
            </div>
          )}

          {selectedShiftId && !rosterLoading && (
            <div className="shrink-0 space-y-0.5 text-[10px] text-text-muted sm:text-[11px]">
              <p>
                {employeeSearch.trim()
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
