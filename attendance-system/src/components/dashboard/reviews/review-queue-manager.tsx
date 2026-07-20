"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, History, Loader2, Trash2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { parseJsonResponse } from "@/lib/api-utils";
import { formatVerificationLabel } from "@/lib/attendance-verification";
import { invalidatePendingReviewCount } from "@/hooks/use-pending-review-count";
import { usePermission } from "@/components/dashboard/role-context";
import type { VerificationStatus } from "@prisma/client";
import { cn } from "@/lib/utils";

type ReviewItem = {
  id: string;
  attendanceId: string;
  event: "checkin" | "checkout";
  date: string;
  isToday: boolean;
  time: string | null;
  verificationStatus: VerificationStatus;
  rejectionReason: string | null;
  reviewedByName: string | null;
  employee: {
    id: string;
    name: string;
    employeeCode: string;
    department: string;
  };
  referencePhotoUrl: string | null;
  eventPhotoUrl: string | null;
};

type ReviewTab = "pending" | "history";

function statusBadgeClass(status: VerificationStatus): string {
  if (status === "PENDING") return "bg-amber-500/15 text-amber-200";
  if (status === "APPROVED") return "bg-emerald-500/15 text-emerald-200";
  return "bg-rose-500/15 text-rose-200";
}

export function ReviewQueueManager() {
  const canViewHistory = usePermission("attendance:review-history");
  const canDelete = usePermission("attendance:review-delete");

  const [tab, setTab] = useState<ReviewTab>("pending");
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<ReviewItem | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<ReviewItem | null>(null);

  useEffect(() => {
    if (!canViewHistory && tab === "history") {
      setTab("pending");
    }
  }, [canViewHistory, tab]);

  const loadQueue = useCallback(async (scope: ReviewTab) => {
    setLoading(true);
    try {
      const query = scope === "pending" ? "pending" : "all";
      const res = await fetch(`/api/attendance/reviews?scope=${query}`);
      const data = await parseJsonResponse<{
        pendingCount: number;
        items: ReviewItem[];
        error?: string;
      }>(res);
      if (!res.ok) throw new Error(data.error ?? "فشل تحميل قائمة المراجعة");

      const nextItems =
        scope === "history"
          ? data.items.filter((item) => item.verificationStatus !== "PENDING")
          : data.items;

      setItems(nextItems);
      setPendingCount(data.pendingCount);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "فشل تحميل القائمة"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadQueue(tab);
  }, [tab, loadQueue]);

  async function handleReview(
    item: ReviewItem,
    action: "approve" | "reject",
    reason?: string
  ) {
    setActionId(item.id);
    try {
      const res = await fetch(`/api/attendance/reviews/${item.attendanceId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: item.event,
          action,
          reason,
        }),
      });
      const data = await parseJsonResponse<{ message?: string; error?: string }>(
        res
      );
      if (!res.ok) throw new Error(data.error ?? "فشل تنفيذ المراجعة");
      toast.success(data.message ?? "تمت المراجعة");
      setRejectTarget(null);
      setRejectReason("");
      invalidatePendingReviewCount();
      await loadQueue(tab);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "فشل تنفيذ المراجعة"
      );
    } finally {
      setActionId(null);
    }
  }

  async function handleDelete(item: ReviewItem) {
    setActionId(item.id);
    try {
      const res = await fetch(`/api/attendance/reviews/${item.attendanceId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event: item.event }),
      });
      const data = await parseJsonResponse<{ message?: string; error?: string }>(
        res
      );
      if (!res.ok) throw new Error(data.error ?? "فشل حذف الصورة");
      toast.success(data.message ?? "تم حذف الصورة");
      setDeleteTarget(null);
      invalidatePendingReviewCount();
      await loadQueue(tab);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "فشل حذف الصورة");
    } finally {
      setActionId(null);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <TabButton
            active={tab === "pending"}
            onClick={() => setTab("pending")}
            label="معلّقة"
            count={pendingCount}
          />
          {canViewHistory && (
            <TabButton
              active={tab === "history"}
              onClick={() => setTab("history")}
              label="السجل"
              icon={History}
            />
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void loadQueue(tab)}
          disabled={loading}
        >
          تحديث
        </Button>
      </div>

      <p className="text-sm text-text-secondary">
        {tab === "pending"
          ? pendingCount > 0
            ? `${pendingCount} طلب بانتظار المراجعة`
            : "لا توجد طلبات معلّقة حالياً"
          : "آخر المراجعات المؤكدة والمرفوضة"}
      </p>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-text-secondary">
          <Loader2 className="size-6 animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <Card className="border-bg-border bg-bg-card">
          <CardContent className="py-12 text-center text-text-secondary">
            <CheckCircle2 className="mx-auto mb-2 size-8 text-emerald-400" />
            {tab === "pending"
              ? "كل الطلبات مُراجَعة — لا يوجد شيء معلّق"
              : "لا يوجد سجل مراجعات بعد"}
          </CardContent>
        </Card>
      ) : (
        items.map((item) => (
          <Card key={item.id} className="border-bg-border bg-bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                <span>{item.employee.name}</span>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs",
                    statusBadgeClass(item.verificationStatus)
                  )}
                >
                  {item.event === "checkin" ? "حضور" : "انصراف"} ·{" "}
                  {formatVerificationLabel(item.verificationStatus)}
                </span>
              </CardTitle>
              <p className="text-xs text-text-muted">
                {item.employee.department} · {item.date}
                {item.time ? ` · ${item.time}` : ""}
              </p>
              {tab === "history" && item.reviewedByName && (
                <p className="text-xs text-text-secondary">
                  راجعها: {item.reviewedByName}
                </p>
              )}
              {tab === "history" &&
                item.verificationStatus === "REJECTED" &&
                item.rejectionReason && (
                  <p className="text-xs text-rose-300">
                    سبب الرفض: {item.rejectionReason}
                  </p>
                )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <PhotoCompare
                  title="الصورة المرجعية"
                  url={item.referencePhotoUrl}
                />
                <PhotoCompare
                  title={
                    item.event === "checkin"
                      ? "صورة الحضور"
                      : "صورة الانصراف"
                  }
                  url={item.eventPhotoUrl}
                />
              </div>

              {tab === "pending" && (
                <>
                  {rejectTarget?.id === item.id ? (
                    <div className="space-y-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3">
                      <Input
                        placeholder="سبب الرفض (مطلوب)"
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                      />
                      <div className="flex gap-2">
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={
                            !rejectReason.trim() || actionId === item.id
                          }
                          onClick={() =>
                            void handleReview(item, "reject", rejectReason)
                          }
                        >
                          تأكيد الرفض
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setRejectTarget(null);
                            setRejectReason("");
                          }}
                        >
                          إلغاء
                        </Button>
                      </div>
                    </div>
                  ) : deleteTarget?.id === item.id ? (
                    <div className="space-y-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3">
                      <p className="text-sm text-rose-200">
                        حذف صورة{" "}
                        {item.event === "checkin" ? "الحضور" : "الانصراف"} ومسح
                        هذا الطلب؟
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={actionId === item.id}
                          onClick={() => void handleDelete(item)}
                        >
                          تأكيد الحذف
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeleteTarget(null)}
                        >
                          إلغاء
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        disabled={actionId === item.id}
                        onClick={() => void handleReview(item, "approve")}
                      >
                        <CheckCircle2 className="size-4" />
                        تأكيد المطابقة
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={actionId === item.id}
                        onClick={() => setRejectTarget(item)}
                      >
                        <XCircle className="size-4" />
                        رفض
                      </Button>
                      {canDelete && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={actionId === item.id}
                          onClick={() => setDeleteTarget(item)}
                          className="text-rose-300 hover:text-rose-200"
                        >
                          <Trash2 className="size-4" />
                          حذف الصورة
                        </Button>
                      )}
                    </div>
                  )}
                </>
              )}

              {tab === "history" && canDelete && (
                <>
                  {deleteTarget?.id === item.id ? (
                    <div className="space-y-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3">
                      <p className="text-sm text-rose-200">
                        حذف صورة{" "}
                        {item.event === "checkin" ? "الحضور" : "الانصراف"} من
                        السجل؟
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={actionId === item.id}
                          onClick={() => void handleDelete(item)}
                        >
                          تأكيد الحذف
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeleteTarget(null)}
                        >
                          إلغاء
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={actionId === item.id}
                      onClick={() => setDeleteTarget(item)}
                      className="text-rose-300 hover:text-rose-200"
                    >
                      <Trash2 className="size-4" />
                      حذف الصورة
                    </Button>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  label,
  count,
  icon: Icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count?: number;
  icon?: typeof History;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition-colors",
        active
          ? "border-blue-primary/40 bg-blue-primary/10 text-text-primary"
          : "border-bg-border bg-bg-elevated/40 text-text-muted hover:text-text-secondary"
      )}
    >
      {Icon && <Icon className="size-4" />}
      {label}
      {typeof count === "number" && count > 0 && (
        <span className="rounded-full bg-amber-500 px-1.5 text-[10px] font-bold text-black">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </button>
  );
}

function PhotoCompare({ title, url }: { title: string; url: string | null }) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-text-secondary">{title}</p>
      <div className="overflow-hidden rounded-xl border border-bg-border bg-black/40">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={title} className="aspect-[4/3] w-full object-cover" />
        ) : (
          <div className="flex aspect-[4/3] items-center justify-center text-xs text-text-muted">
            لا توجد صورة
          </div>
        )}
      </div>
    </div>
  );
}
