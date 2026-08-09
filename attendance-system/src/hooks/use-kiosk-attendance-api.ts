"use client";

import { useCallback, useRef } from "react";
import { kioskJson } from "@/lib/kiosk-client";
import {
  readCachedRoster,
  readCachedShifts,
  writeCachedRoster,
  writeCachedShifts,
} from "@/lib/kiosk-data-cache";
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
    const photoOnly = !!options?.photoOnly;
    type RosterRow = {
      id: string;
      name: string;
      employeeCode: string;
      department: string;
      shiftId: string | null;
    };

    const cached = readCachedRoster<RosterRow[]>(photoOnly);
    if (cached) return cached;

    const path = photoOnly
      ? "/api/employees/roster?for=photo"
      : "/api/employees/roster";
    const { res, data } = await kioskJson<RosterRow[]>(path);

    if (!res.ok) {
      throw new Error("فشل تحميل قائمة الموظفين");
    }
    writeCachedRoster(photoOnly, data);
    return data;
  }, []);

  const submitPhotoAttendance = useCallback(
    async (employeeId: string, shiftId: string, photo: Blob) => {
      const form = new FormData();
      form.set("employeeId", employeeId);
      form.set("shiftId", shiftId);
      form.set("mode", mode);
      form.set("photo", photo, "capture.jpg");

      const { res, data } = await kioskJson<
        AttendanceResult & { error?: string; pending?: boolean }
      >("/api/attendance/photo", {
        method: "POST",
        body: form,
      });

      if (!res.ok) throw new Error(data.error ?? "فشل التسجيل");

      todayStatusCacheRef.current.delete(employeeId);
      return data;
    },
    [mode]
  );

  const loadShifts = useCallback(async () => {
    type ShiftRow = {
      id: string;
      name: string;
      startTime: string;
      endTime: string;
    };

    const cached = readCachedShifts<ShiftRow[]>();
    if (cached) return cached;

    const { res, data } = await kioskJson<ShiftRow[]>("/api/schedules/kiosk");

    if (!res.ok) {
      throw new Error("فشل تحميل الشفتات");
    }
    writeCachedShifts(data);
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
