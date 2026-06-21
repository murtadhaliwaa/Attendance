import { ReportsManager } from "@/components/dashboard/reports/reports-manager";
import { getWeeklyReport } from "@/lib/reports";
import { getShiftOptions } from "@/lib/shifts";

export default async function ReportsPage() {
  const [data, shifts] = await Promise.all([
    getWeeklyReport(),
    getShiftOptions(),
  ]);

  return <ReportsManager initialData={data} shifts={shifts} />;
}
