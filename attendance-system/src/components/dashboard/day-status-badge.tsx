import type { EmployeeDayStatus } from "@/lib/report-types";
import { dayStatusLabels } from "@/lib/report-labels";
import { getStatusBadgeClass } from "@/lib/status-labels";

const mutedBadgeClass =
  "inline-flex shrink-0 items-center rounded-md border border-bg-border bg-bg-elevated px-2.5 py-0.5 text-xs font-semibold text-text-muted";

export function DayStatusBadge({ status }: { status: EmployeeDayStatus }) {
  if (status === "WEEKEND") {
    return <span className={mutedBadgeClass}>عطلة أسبوعية</span>;
  }

  if (status === "UPCOMING" || status === "PENDING") {
    return <span className={mutedBadgeClass}>{dayStatusLabels[status]}</span>;
  }

  return (
    <span className={getStatusBadgeClass(status)}>
      {dayStatusLabels[status]}
    </span>
  );
}
