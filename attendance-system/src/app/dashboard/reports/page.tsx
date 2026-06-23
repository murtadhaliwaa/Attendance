import { ReportsManager } from "@/components/dashboard/reports/reports-manager";
import { requirePagePermission } from "@/lib/page-auth";
import { getWeeklyReport } from "@/lib/reports";
import { getShiftOptions } from "@/lib/shifts";

export default async function ReportsPage() {
  await requirePagePermission("reports:read");
  const [data, shifts] = await Promise.all([
    getWeeklyReport(),
    getShiftOptions(),
  ]);

  return <ReportsManager initialData={data} shifts={shifts} />;
}
