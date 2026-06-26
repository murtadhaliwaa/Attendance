import type { Method } from "@prisma/client";
import { cn } from "@/lib/utils";
import { formatAttendanceMethodLabel, isEmergencyMethod } from "@/lib/attendance-method";

interface AttendanceMethodBadgeProps {
  method: Method | null;
  supervisorName?: string | null;
  className?: string;
}

/** شارة صغيرة بجانب وقت الحضور/الانصراف توضّح طريقة التسجيل */
export function AttendanceMethodBadge({
  method,
  supervisorName = null,
  className,
}: AttendanceMethodBadgeProps) {
  const label = formatAttendanceMethodLabel({ method, supervisorName });
  if (!label) return null;

  const emergency = isEmergencyMethod(method);

  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1 rounded-full px-2 py-0.5 text-[10px] leading-snug",
        emergency
          ? "bg-amber-500/15 text-amber-200"
          : "bg-bg-elevated text-text-muted",
        className
      )}
    >
      {label}
    </span>
  );
}
