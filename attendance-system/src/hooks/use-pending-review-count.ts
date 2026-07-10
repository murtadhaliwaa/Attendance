"use client";

import { useCallback, useEffect, useState } from "react";
import { usePermission } from "@/components/dashboard/role-context";
import { parseJsonResponse } from "@/lib/api-utils";

const CACHE_MS = 30_000;
const REFRESH_MS = 60_000;

let cachedCount = 0;
let cacheTs = 0;
let inflight: Promise<number> | null = null;

async function fetchPendingCount(): Promise<number> {
  if (Date.now() - cacheTs < CACHE_MS) {
    return cachedCount;
  }

  if (!inflight) {
    inflight = (async () => {
      const res = await fetch("/api/attendance/reviews?scope=pending");
      const data = await parseJsonResponse<{ pendingCount: number }>(res);
      if (!res.ok) throw new Error("فشل تحميل عدد الطلبات المعلقة");
      cachedCount = data.pendingCount;
      cacheTs = Date.now();
      return cachedCount;
    })().finally(() => {
      inflight = null;
    });
  }

  return inflight;
}

export function invalidatePendingReviewCount() {
  cacheTs = 0;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("pending-reviews-changed"));
  }
}

export function usePendingReviewCount(): number {
  const canReview = usePermission("attendance:review");
  const [count, setCount] = useState(canReview ? cachedCount : 0);

  const refresh = useCallback(async () => {
    if (!canReview) {
      setCount(0);
      return;
    }
    try {
      setCount(await fetchPendingCount());
    } catch {
      // تجاهل — الشارة اختيارية ولا تعطل الواجهة
    }
  }, [canReview]);

  useEffect(() => {
    void refresh();
    const interval = setInterval(() => void refresh(), REFRESH_MS);
    const onChanged = () => void refresh();
    window.addEventListener("pending-reviews-changed", onChanged);
    return () => {
      clearInterval(interval);
      window.removeEventListener("pending-reviews-changed", onChanged);
    };
  }, [refresh]);

  return canReview ? count : 0;
}
