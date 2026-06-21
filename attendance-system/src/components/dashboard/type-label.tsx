import type { AlertType, Status } from "@prisma/client";
import { cn } from "@/lib/utils";
import {
  alertTypeLabels,
  getAlertTypeBadgeClass,
  getStatusBadgeClass,
  statusLabels,
} from "@/lib/status-labels";

export function AlertTypeLabel({ type }: { type: AlertType }) {
  return (
    <span className={cn(getAlertTypeBadgeClass(type))}>
      {alertTypeLabels[type]}
    </span>
  );
}

export function StatusLabel({ status }: { status: Status }) {
  return (
    <span className={cn(getStatusBadgeClass(status))}>
      {statusLabels[status]}
    </span>
  );
}
