"use client";

import { useCallback, useRef } from "react";
import { kioskJson } from "@/lib/kiosk-client";
import type { EmployeeFaceData } from "@/lib/face-recognition";
import type { AttendanceResult, TodayStatus } from "@/lib/kiosk-scanner-types";
import type { KioskMode } from "@/lib/kiosk-types";

export function useKioskAttendanceApi(mode: KioskMode) {
  const todayStatusCacheRef = useRef<
    Map<string, { data: TodayStatus; ts: number }>
  >(new Map());

  const loadEmployees = useCallback(async () => {
    const { res, data } = await kioskJson<
      Array<{
        id: string;
        name: string;
        employeeCode: string;
        descriptor: number[];
      }>
    >("/api/employees/descriptors");

    if (!res.ok) {
      throw new Error("فشل تحميل بيانات الموظفين");
    }

    return data.map(
      (e): EmployeeFaceData => ({
        id: e.id,
        name: e.name,
        employeeCode: e.employeeCode,
        descriptor: e.descriptor,
      })
    );
  }, []);

  const getTodayStatus = useCallback(async (employeeId: string) => {
    const cached = todayStatusCacheRef.current.get(employeeId);
    if (cached && Date.now() - cached.ts < 8000) {
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

  const recordAttendance = useCallback(
    async (employeeId: string, descriptor: number[]) => {
      const endpoint =
        mode === "checkout"
          ? "/api/attendance/checkout"
          : "/api/attendance/checkin";

      const { res, data } = await kioskJson<AttendanceResult & { error?: string }>(
        endpoint,
        {
          method: "POST",
          body: JSON.stringify({ employeeId, descriptor }),
        }
      );

      if (!res.ok) throw new Error(data.error ?? "فشل التسجيل");

      todayStatusCacheRef.current.delete(employeeId);
      return data;
    },
    [mode]
  );

  const submitEmergency = useCallback(
    async (emergencyCode: string) => {
      const { res, data } = await kioskJson<AttendanceResult & { error?: string }>(
        "/api/attendance/emergency",
        {
          method: "POST",
          body: JSON.stringify({ emergencyCode, mode }),
        }
      );

      if (!res.ok) throw new Error(data.error ?? "رمز غير صحيح");
      return data;
    },
    [mode]
  );

  const enrollEmployee = useCallback(
    async (name: string, descriptor: number[]) => {
      const { res, data } = await kioskJson<{ error?: string; message?: string }>(
        "/api/employees/descriptors",
        {
          method: "PUT",
          body: JSON.stringify({ name, descriptor }),
        }
      );

      if (!res.ok) throw new Error(data.error ?? "فشل التسجيل");
      return data;
    },
    []
  );

  return {
    loadEmployees,
    getTodayStatus,
    recordAttendance,
    submitEmergency,
    enrollEmployee,
    todayStatusCacheRef,
  };
}
