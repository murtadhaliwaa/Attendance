import { ReviewQueueManager } from "@/components/dashboard/reviews/review-queue-manager";
import { requirePagePermission } from "@/lib/page-auth";

export const metadata = {
  title: "مراجعة الصور | نظام الحضور والانصراف",
};

export default async function ReviewsPage() {
  await requirePagePermission("attendance:review");

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <div>
        <h1 className="text-xl font-bold text-text-primary">مراجعة صور الحضور</h1>
        <p className="mt-1 text-sm text-text-secondary">
          طابق الصورة المرجعية مع صورة الحضور أو الانصراف، ثم أكّد أو ارفض.
          لا يُحسب الحضور في التقارير إلا بعد التأكيد.
        </p>
      </div>
      <ReviewQueueManager />
    </div>
  );
}
