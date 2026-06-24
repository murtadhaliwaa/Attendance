import { LogIn, LogOut } from "lucide-react";
import type { AttendanceResult } from "@/lib/kiosk-scanner-types";

export function KioskResultPanel({
  result,
  isCheckin,
}: {
  result: AttendanceResult;
  isCheckin: boolean;
}) {
  const isWarning =
    result.action !== "checkin" && result.action !== "checkout";

  return (
    <aside
      className={`hidden shrink-0 flex-col items-center justify-center rounded-lg border p-4 text-center lg:flex lg:w-52 ${
        isWarning
          ? "border-amber-500/35 bg-amber-500/10"
          : "border-bg-border bg-bg-elevated"
      }`}
    >
      <p className="text-base font-bold text-text-primary">
        {result.employeeName}
      </p>
      <p
        className={`mt-2 text-sm leading-snug ${
          result.action === "checkin" || result.action === "checkout"
            ? isCheckin
              ? "text-emerald-200"
              : "text-sky-200"
            : "text-amber-200"
        }`}
      >
        {result.action === "checkin" && "قام بتسجيل الحضور"}
        {result.action === "checkout" && "قام بتسجيل الانصراف"}
        {result.action === "already_checkin" && "الحضور مسجّل مسبقاً"}
        {result.action === "no_checkin" && "يجب تسجيل الحضور أولاً"}
        {result.action === "already_done" && "الانصراف مسجّل مسبقاً"}
      </p>
      {result.time && (
        <div className="mt-2 flex items-center justify-center gap-2 text-sm text-text-secondary">
          {result.action === "checkout" ? (
            <LogOut className="size-4 shrink-0" />
          ) : (
            <LogIn className="size-4 shrink-0" />
          )}
          <span dir="ltr">{result.time}</span>
        </div>
      )}
    </aside>
  );
}
