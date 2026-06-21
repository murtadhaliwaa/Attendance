import { Loader2 } from "lucide-react";

export default function DashboardLoading() {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-text-muted">
      <Loader2 className="size-8 animate-spin text-blue-primary" />
      <p className="text-sm">جاري تحميل الصفحة...</p>
    </div>
  );
}
