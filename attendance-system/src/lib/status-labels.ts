import { AlertType, Status } from "@prisma/client";

export const statusLabels: Record<Status, string> = {
  PRESENT: "حاضر",
  LATE: "متأخر",
  ABSENT: "غائب",
  EARLY_LEAVE: "انصراف مبكر",
};

export const alertTypeLabels: Record<AlertType, string> = {
  LATE: "تأخر",
  ABSENT: "غياب",
  OVERTIME: "عمل إضافي",
};

const tagBase =
  "inline-flex shrink-0 items-center rounded-md px-2.5 py-0.5 text-xs font-semibold";

export function getAlertTypeBadgeClass(type: AlertType): string {
  switch (type) {
    case "LATE":
      return `${tagBase} border border-amber-500/35 bg-amber-500/15 text-amber-200`;
    case "ABSENT":
      return `${tagBase} border border-rose-500/35 bg-rose-500/15 text-rose-200`;
    case "OVERTIME":
      return `${tagBase} border border-violet-500/35 bg-violet-500/15 text-violet-200`;
    default:
      return `${tagBase} border border-bg-border bg-bg-elevated text-text-secondary`;
  }
}

export function getStatusBadgeClass(status: Status): string {
  switch (status) {
    case "PRESENT":
      return `${tagBase} border border-emerald-500/30 bg-emerald-500/12 text-emerald-200`;
    case "LATE":
      return `${tagBase} border border-amber-500/35 bg-amber-500/15 text-amber-200`;
    case "ABSENT":
      return `${tagBase} border border-rose-500/35 bg-rose-500/15 text-rose-200`;
    case "EARLY_LEAVE":
      return `${tagBase} border border-violet-500/30 bg-violet-500/12 text-violet-200`;
    default:
      return `${tagBase} border border-bg-border bg-bg-elevated text-text-secondary`;
  }
}
