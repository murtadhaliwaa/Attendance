import type { EmployeeDayStatus } from "@/lib/report-types";
import { statusLabels } from "@/lib/status-labels";

export const dayStatusLabels: Record<EmployeeDayStatus, string> = {
  ...statusLabels,
  WEEKEND: "عطلة أسبوعية",
  UPCOMING: "لم يحن بعد",
  PENDING: "لم يُسجّل بعد",
};
