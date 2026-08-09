"use client";

import { useCallback, useRef } from "react";
import { kioskJson } from "@/lib/kiosk-client";
import type { AttendanceResult, TodayStatus } from "@/lib/kiosk-scanner-types";
import type { KioskMode } from "@/lib/kiosk-types";

export function useKioskAttendanceApi(mode: KioskMode) {
  const todayStatusCacheRef = useRef<
    Map<string, { data: TodayStatus; ts: number }>
  >(new Map());

  // الخادم يبقى مرجع الحقيقة؛ هذه النافذة فقط لتجنّب طلب مكرر أثناء نفس التسجيل
  const TODAY_STATUS_TTL_MS = 15_000;

  const getTodayStatus = useCallback(async (employeeId: string) => {
    const cached = todayStatusCacheRef.current.get(employeeId);
    if (cached && Date.now() - cached.ts < TODAY_STATUS_TTL_MS) {
      return cached.data;
    }

    const { res, data } = await kioskJson<TodayStatus & { error?: string }>(
      `/api/attendance/today?employeeId=${employeeId}`
    );

    if (!res.ok) {
      throw new Error(data.error ?? "فشل التحقق من حالة اليوم");
    }

    todayStatusCacheRef.current.set(employeeId, {
      data,
      ts: Date.now(),
    });
    return data;
  }, []);

  /** تسخين الكاش عند اختيار الاسم — يتجاهل الأخطاء لأن الإرسال سيعيد المحاولة */
  const prefetchTodayStatus = useCallback(
    async (employeeId: string) => {
      try {
        await getTodayStatus(employeeId);
      } catch {
        // لا شيء: الفحص الحقيقي يحدث عند الإرسال
      }
    },
    [getTodayStatus]
  );

  const loadRoster = useCallback(async (options?: { photoOnly?: boolean }) => {
    const path = options?.photoOnly
      ? "/api/employees/roster?for=photo"
      : "/api/employees/roster";
    const { res, data } = await kioskJson<
      Array<{
        id: string;
        name: string;
        employeeCode: string;
        department: string;
        shiftId: string | null;
      }>
    >(path);

    if (!res.ok) {
      throw new Error("فشل تحميل قائمة الموظفين");
    }
    return data;
  }, []);

  const submitPhotoAttendance = useCallback(
    async (employeeId: string, shiftId: string, imageDataUrl: string) => {
      const { res, data } = await kioskJson<
        AttendanceResult & { error?: string; pending?: boolean }
      >("/api/attendance/photo", {
        method: "POST",
        body: JSON.stringify({ employeeId, shiftId, imageDataUrl, mode }),
      });

      if (!res.ok) throw new Error(data.error ?? "فشل التسجيل");

      todayStatusCacheRef.current.delete(employeeId);
      return data;
    },
    [mode]
  );

  const loadShifts = useCallback(async () => {
    const { res, data } = await kioskJson<
      Array<{ id: string; name: string; startTime: string; endTime: string }>
    >("/api/schedules/kiosk");

    if (!res.ok) {
      throw new Error("فشل تحميل الشفتات");
    }
    return data;
  }, []);

  return {
    loadRoster,
    loadShifts,
    getTodayStatus,
    prefetchTodayStatus,
    submitPhotoAttendance,
    todayStatusCacheRef,
  };
}
