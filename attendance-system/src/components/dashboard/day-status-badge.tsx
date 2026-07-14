import type { EmployeeDayStatus } from "@/lib/report-types";
import type { VerificationStatus } from "@prisma/client";
import { dayStatusLabels } from "@/lib/report-labels";
import { getStatusBadgeClass } from "@/lib/status-labels";

const mutedBadgeClass =
  "inline-flex shrink-0 items-center rounded-md border border-bg-border bg-bg-elevated px-2.5 py-0.5 text-xs font-semibold text-text-muted";

const rejectedBadgeClass =
  "inline-flex shrink-0 items-center rounded-md border border-rose-500/30 bg-rose-500/10 px-2.5 py-0.5 text-xs font-semibold text-rose-200";

export function DayStatusBadge({
  status,
  checkInVerification,
}: {
  status: EmployeeDayStatus;
  checkInVerification?: VerificationStatus | null;
}) {
  if (status === "WEEKEND") {
    return <span className={mutedBadgeClass}>عطلة أسبوعية</span>;
  }

  if (status === "UPCOMING" || status === "PENDING" || status === "AWAITING_REVIEW") {
    return <span className={mutedBadgeClass}>{dayStatusLabels[status]}</span>;
  }

  if (status === "ABSENT" && checkInVerification === "REJECTED") {
    return <span className={rejectedBadgeClass}>غائب — محاولة مرفوضة</span>;
  }

  return (
    <span className={getStatusBadgeClass(status)}>
      {dayStatusLabels[status]}
    </span>
  );
}
