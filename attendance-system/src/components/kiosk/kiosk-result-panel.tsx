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
    if (result.action === "no_checkin") return "يجب تسجيل الحضور أولاً";
    return "الانصراف مسجّل مسبقاً";
  })();

  return (
    <aside
      className={cn(
        "flex w-full shrink-0 flex-col items-center justify-center rounded-lg border p-3 text-center sm:p-4",
        "lg:w-52",
        isWarning
          ? "border-amber-500/35 bg-amber-500/10"
          : "border-bg-border bg-bg-elevated"
      )}
    >
      {isPending && (
        <Clock className="mb-1 size-4 text-amber-200 sm:mb-2 sm:size-5" />
      )}
      <p className="text-sm font-bold text-text-primary sm:text-base">
        {result.employeeName}
      </p>
      <p
        className={cn(
          "mt-1 text-xs leading-snug sm:mt-2 sm:text-sm",
          isWarning
            ? "text-amber-200"
            : isCheckin
              ? "text-emerald-200"
              : "text-sky-200"
        )}
      >
        {statusLabel}
      </p>
      {result.time && (
        <div className="mt-1.5 flex items-center justify-center gap-2 text-xs text-text-secondary sm:mt-2 sm:text-sm">
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
