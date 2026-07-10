"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { KIOSK_MODE_LABELS, type KioskMode } from "@/lib/kiosk-types";
import {
  type AttendanceResult,
  type BlockReason,
  type KioskState,
  getBlockReason,
  blockMessage,
  type AttendanceAction,
  type TodayStatus,
} from "@/lib/kiosk-scanner-types";
import { useKioskCamera } from "@/hooks/use-kiosk-camera";
import { useKioskAttendanceApi } from "@/hooks/use-kiosk-attendance-api";
import { captureVideoFrame } from "@/lib/photo-capture";

const SUCCESS_RESET_MS = 5000;
const BLOCKED_RESET_MS = 5000;
const EMERGENCY_RESET_MS = 4000;

export type RosterEmployee = {
  id: string;
  name: string;
  employeeCode: string;
  department: string;
};

export type ShiftOption = {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
};

export function useKioskPhotoScanner(mode: KioskMode) {
  const labels = KIOSK_MODE_LABELS[mode];
  const isCheckin = mode === "checkin";

  const {
    videoRef,
    cameraReady,
    facingMode,
    setCameraReady,
    stopCamera: releaseCamera,
    startCamera,
  } = useKioskCamera();

  const {
    loadRoster,
    loadShifts,
    getTodayStatus,
    submitPhotoAttendance,
    submitEmergency,
  } = useKioskAttendanceApi(mode);

  const [state, setState] = useState<KioskState>("loading");
  const [statusText, setStatusText] = useState("جاري تشغيل الكاميرا...");
  const [result, setResult] = useState<AttendanceResult | null>(null);
  const [showEmergency, setShowEmergency] = useState(false);
  const [emergencyCode, setEmergencyCode] = useState("");
  const [emergencyEmployeeId, setEmergencyEmployeeId] = useState("");
  const [roster, setRoster] = useState<RosterEmployee[]>([]);
  const [shifts, setShifts] = useState<ShiftOption[]>([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [selectedShiftId, setSelectedShiftId] = useState("");
  const [currentTime, setCurrentTime] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const updateClock = useCallback(() => {
    setCurrentTime(
      new Date().toLocaleTimeString("ar-SA", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      })
    );
  }, []);

  const resetScanner = useCallback(() => {
    setResult(null);
    setPreviewUrl(null);
    setState("scanning");
    setStatusText(labels.subtitle);
  }, [labels.subtitle]);

  const retryCamera = useCallback(async () => {
    setState("loading");
    setCameraReady(false);
    setStatusText("جاري تشغيل الكاميرا...");
    try {
      await startCamera();
      setState("scanning");
      setStatusText(labels.subtitle);
    } catch (error) {
      setState("error");
      setStatusText(
        error instanceof Error ? error.message : "فشل تشغيل الكاميرا"
      );
    }
  }, [labels.subtitle, setCameraReady, startCamera]);

  const showBlockedMessage = useCallback(
    (employeeName: string, reason: BlockReason, today: TodayStatus) => {
      const message = blockMessage(mode, reason, employeeName, today);
      const action: AttendanceAction =
        reason === "no_checkin" ? "no_checkin" : reason;

      setResult({
        message,
        employeeName,
        action,
        time: today.checkInTime ?? today.checkOutTime ?? "",
        status: "",
        department: "",
      });
      setState("success");
      setStatusText(message);
      setTimeout(resetScanner, BLOCKED_RESET_MS);
    },
    [mode, resetScanner]
  );

  const handleCapturePreview = useCallback(() => {
    if (!videoRef.current) return;
    const frame = captureVideoFrame(videoRef.current);
    if (!frame) {
      toast.error("تعذر التقاط الصورة — تأكد من الكاميرا");
      return;
    }
    setPreviewUrl(frame);
    setStatusText("راجع الصورة ثم اضغط «إرسال للمراجعة»");
  }, [videoRef]);

  const handleSubmitPhoto = useCallback(async () => {
    if (!selectedEmployeeId) {
      toast.error("اختر اسم الموظف");
      return;
    }
    if (!selectedShiftId) {
      toast.error("اختر الشفت");
      return;
    }

    let imageDataUrl = previewUrl;
    if (!imageDataUrl && videoRef.current) {
      imageDataUrl = captureVideoFrame(videoRef.current);
    }
    if (!imageDataUrl) {
      toast.error("التقط صورة أولاً");
      return;
    }

    setState("processing");
    setStatusText("جاري إرسال الصورة...");

    try {
      const today = await getTodayStatus(selectedEmployeeId);
      const employee = roster.find((e) => e.id === selectedEmployeeId);
      const employeeName = employee?.name ?? today.employeeName;

      const blockReason = getBlockReason(mode, today);
      if (blockReason) {
        showBlockedMessage(employeeName, blockReason, today);
        return;
      }

      const data = await submitPhotoAttendance(
        selectedEmployeeId,
        selectedShiftId,
        imageDataUrl
      );

      setResult(data);
      setState("success");
      setStatusText(data.message);
      setSelectedEmployeeId("");
      setSelectedShiftId("");
      setPreviewUrl(null);
      setTimeout(resetScanner, SUCCESS_RESET_MS);
    } catch (error) {
      setState("error");
      setStatusText(
        error instanceof Error ? error.message : "فشل إرسال الصورة"
      );
      toast.error(error instanceof Error ? error.message : "فشل الإرسال");
      setTimeout(() => {
        setState("scanning");
        setStatusText(labels.subtitle);
      }, 3000);
    }
  }, [
    selectedEmployeeId,
    selectedShiftId,
    previewUrl,
    videoRef,
    getTodayStatus,
    roster,
    mode,
    submitPhotoAttendance,
    showBlockedMessage,
    resetScanner,
    labels.subtitle,
  ]);

  const handleEmergency = useCallback(async () => {
    if (!emergencyEmployeeId) {
      toast.error("اختر اسم الموظف أولاً");
      return;
    }
    if (!emergencyCode) {
      toast.error("أدخل الرمز الطارئ الخاص بمسؤول الشفت");
      return;
    }
    setState("processing");
    try {
      const data = await submitEmergency(emergencyEmployeeId, emergencyCode);
      setResult(data);
      setState("success");
      setShowEmergency(false);
      setEmergencyCode("");
      setEmergencyEmployeeId("");
      setTimeout(resetScanner, EMERGENCY_RESET_MS);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "رمز غير صحيح");
      setState("scanning");
    }
  }, [emergencyEmployeeId, emergencyCode, resetScanner, submitEmergency]);

  const toggleEmergency = useCallback(() => {
    setShowEmergency((v) => !v);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      setRosterLoading(true);
      try {
        await startCamera();
        if (cancelled) return;

        const [rosterData, shiftData] = await Promise.all([
          loadRoster({ photoOnly: true }),
          loadShifts(),
        ]);
        if (cancelled) return;

        setRoster(rosterData);
        setShifts(shiftData);
        if (shiftData.length === 1) {
          setSelectedShiftId(shiftData[0]!.id);
        }
        setState("scanning");
        setStatusText(labels.subtitle);
      } catch (error) {
        if (cancelled) return;
        setState("error");
        setStatusText(
          error instanceof Error ? error.message : "فشل تهيئة الكشك"
        );
      } finally {
        if (!cancelled) setRosterLoading(false);
      }
    }

    void init();
    updateClock();
    const clockId = setInterval(updateClock, 1000);

    return () => {
      cancelled = true;
      clearInterval(clockId);
      releaseCamera();
    };
  }, [labels.subtitle, loadRoster, loadShifts, releaseCamera, startCamera, updateClock]);

  return {
    isCheckin,
    labels,
    videoRef,
    cameraReady,
    facingMode,
    state,
    statusText,
    result,
    currentTime,
    showEmergency,
    emergencyCode,
    setEmergencyCode,
    emergencyEmployeeId,
    setEmergencyEmployeeId,
    roster,
    shifts,
    rosterLoading,
    selectedEmployeeId,
    setSelectedEmployeeId,
    selectedShiftId,
    setSelectedShiftId,
    previewUrl,
    setPreviewUrl,
    handleCapturePreview,
    handleSubmitPhoto,
    handleEmergency,
    toggleEmergency,
    retryCamera,
  };
}

export type KioskPhotoScannerController = ReturnType<typeof useKioskPhotoScanner>;
