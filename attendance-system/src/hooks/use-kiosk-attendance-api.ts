"use client";

import { useCallback, useRef } from "react";
import { kioskJson } from "@/lib/kiosk-client";
import type { AttendanceResult, TodayStatus } from "@/lib/kiosk-scanner-types";
import type { KioskMode } from "@/lib/kiosk-types";

export function useKioskAttendanceApi(mode: KioskMode) {
  const todayStatusCacheRef = useRef<
    Map<string, { data: TodayStatus; ts: number }>
  >(new Map());

  const getTodayStatus = useCallback(async (employeeId: string) => {
    const cached = todayStatusCacheRef.current.get(employeeId);
    if (cached && Date.now() - cached.ts < 2000) {
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
    submitPhotoAttendance,
    todayStatusCacheRef,
  };
}
