import { Clock, LogIn, LogOut } from "lucide-react";
import type { AttendanceResult } from "@/lib/kiosk-scanner-types";
import { cn } from "@/lib/utils";

export function KioskResultPanel({
  result,
  isCheckin,
}: {
  result: AttendanceResult;
  isCheckin: boolean;
}) {
  const isSubmit =
    result.action === "checkin" || result.action === "checkout";
  const isPending = isSubmit && result.pending !== false;
  const isWarning = !isSubmit || isPending;

  const statusLabel = (() => {
    if (result.action === "checkin") {
      return isPending
        ? "طُلب الحضور — بانتظار التأكيد"
        : "تم تأكيد الحضور";
    }
    if (result.action === "checkout") {
      return isPending
        ? "طُلب الانصراف — بانتظار التأكيد"
        : "تم تأكيد الانصراف";
    }
    if (result.action === "already_checkin") return "الحضور مسجّل مسبقاً";
    return "الانصراف مسجّل مسبقاً";
  })();

  return (
    <aside
      className={cn(
        "flex w-full shrink-0 items-center gap-3 rounded-lg border p-2.5 text-start sm:flex-col sm:items-center sm:justify-center sm:gap-0 sm:p-3 sm:text-center lg:w-52 lg:p-4",
        isWarning
          ? "border-amber-500/35 bg-amber-500/10"
          : "border-bg-border bg-bg-elevated"
      )}
    >
      {isPending && (
        <Clock className="size-4 shrink-0 text-amber-200 sm:mb-2 sm:size-5" />
      )}
      <div className="min-w-0 flex-1 sm:flex-none">
        <p className="truncate text-sm font-bold text-text-primary sm:text-base">
          {result.employeeName}
        </p>
        <p
          className={cn(
            "mt-0.5 text-xs leading-snug sm:mt-2 sm:text-sm",
            isWarning
              ? "text-amber-200"
              : isCheckin
                ? "text-emerald-200"
                : "text-sky-200"
          )}
        >
          {statusLabel}
        </p>
      </div>
      {result.time && (
        <div className="flex shrink-0 items-center gap-1.5 text-xs text-text-secondary sm:mt-2 sm:justify-center sm:text-sm">
          {result.action === "checkout" ? (
            <LogOut className="size-3.5 shrink-0 sm:size-4" />
          ) : (
            <LogIn className="size-3.5 shrink-0 sm:size-4" />
          )}
          <span dir="ltr">{result.time}</span>
        </div>
      )}
    </aside>
  );
}
