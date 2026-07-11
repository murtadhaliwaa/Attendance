import type { Method } from "@prisma/client";
import { cn } from "@/lib/utils";
import { formatAttendanceMethodLabel } from "@/lib/attendance-method";

interface AttendanceMethodBadgeProps {
  method: Method | null;
  className?: string;
}

/** شارة صغيرة بجانب وقت الحضور/الانصراف توضّح طريقة التسجيل */
export function AttendanceMethodBadge({
  method,
  className,
}: AttendanceMethodBadgeProps) {
  const label = formatAttendanceMethodLabel(method);
  if (!label) return null;

  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1 rounded-full bg-bg-elevated px-2 py-0.5 text-[10px] leading-snug text-text-muted",
        className
      )}
    >
      {label}
    </span>
  );
}
