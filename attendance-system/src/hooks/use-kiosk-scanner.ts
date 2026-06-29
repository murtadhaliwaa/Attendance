"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { KIOSK_MODE_LABELS, type KioskMode } from "@/lib/kiosk-types";
import {
  type AttendanceResult,
  type BlockReason,
  type KioskState,
  type ScanPhase,
  UNKNOWN_FACE_HOLD_MS,
  UNKNOWN_FACE_MESSAGE,
  SPOOF_FACE_MESSAGE,
  SPOOF_FACE_HOLD_MS,
  getBlockReason,
  blockMessage,
  type MatchStreak,
  type AttendanceAction,
  type TodayStatus,
} from "@/lib/kiosk-scanner-types";
import { useKioskCamera } from "@/hooks/use-kiosk-camera";
import { useKioskAttendanceApi } from "@/hooks/use-kiosk-attendance-api";
import {
  captureEnrollmentDescriptor,
  CONSECUTIVE_MATCHES_REQUIRED,
  detectFaceForScan,
  findBestMatch,
  findStrictDuplicateMatch,
  loadScanFaceModels,
  loadEnrollmentFaceModels,
  descriptorToArray,
  wasRecentLivenessRejection,
  wasRecentMotionRejection,
  type EmployeeFaceData,
} from "@/lib/face-recognition";
import { getFaceEngine, markMotionRejection } from "@/lib/face-engine";
import {
  DescriptorStabilityTracker,
  FaceMotionTracker,
} from "@/lib/face-motion-liveness";

const SCAN_INTERVAL_MS = 200;
const SUCCESS_RESET_MS = 3000;
const BLOCKED_RESET_MS = 5000;
const EMERGENCY_RESET_MS = 4000;

export type RosterEmployee = {
  id: string;
  name: string;
  employeeCode: string;
  department: string;
};

/**
 * كل منطق آلة حالة الكشك (الكاميرا، المسح، التعرف، التسجيل، الرمز الطارئ).
 * المكوّن المرئي يستهلك القيم فقط دون منطق.
 */
export function useKioskScanner(mode: KioskMode) {
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
    loadEmployees,
    loadRoster,
    getTodayStatus,
    recordAttendance,
    submitEmergency,
    enrollEmployee,
  } = useKioskAttendanceApi(mode);

  const scanIntervalRef = useRef<ReturnType<typeof setInterval>>();
  const matchStreakRef = useRef<MatchStreak | null>(null);
  const scanPhaseRef = useRef<ScanPhase>("idle");
  const isProcessingRef = useRef(false);
  const isScanningFrameRef = useRef(false);
  const unknownHoldUntilRef = useRef(0);
  const spoofHoldUntilRef = useRef(0);
  const motionTrackerRef = useRef(new FaceMotionTracker());
  const stabilityTrackerRef = useRef(new DescriptorStabilityTracker());

  const [state, setState] = useState<KioskState>("loading");
  const [statusText, setStatusText] = useState("جاري طلب صلاحية الكاميرا...");
  const [verifyProgress, setVerifyProgress] = useState(0);
  const [employees, setEmployees] = useState<EmployeeFaceData[]>([]);
  const [result, setResult] = useState<AttendanceResult | null>(null);
  const [showEmergency, setShowEmergency] = useState(false);
  const [showEnroll, setShowEnroll] = useState(false);
  const [emergencyCode, setEmergencyCode] = useState("");
  const [emergencyEmployeeId, setEmergencyEmployeeId] = useState("");
  const [roster, setRoster] = useState<RosterEmployee[]>([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [enrollName, setEnrollName] = useState("");
  const [currentTime, setCurrentTime] = useState("");
  const [scanPhase, setScanPhaseState] = useState<ScanPhase>("idle");
  const [recognizedName, setRecognizedName] = useState<string | null>(null);

  const idleStatus =
    employees.length > 0
      ? labels.subtitle
      : "موظف جديد؟ اضغط «موظف جديد» وأدخل اسمك";

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

  const stopCamera = useCallback(() => {
    releaseCamera();
    if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
  }, [releaseCamera]);

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

  const refreshEmployees = useCallback(async () => {
    const data = await loadEmployees();
    setEmployees(data);
    return data;
  }, [loadEmployees]);

  const resetScanner = useCallback(() => {
    matchStreakRef.current = null;
    scanPhaseRef.current = "idle";
    isProcessingRef.current = false;
    unknownHoldUntilRef.current = 0;
    spoofHoldUntilRef.current = 0;
    motionTrackerRef.current.reset();
    stabilityTrackerRef.current.reset();
    setVerifyProgress(0);
    setResult(null);
    setRecognizedName(null);
    setState("scanning");
    setStatusText(idleStatus);
  }, [idleStatus]);

  const showBlockedMessage = useCallback(
    (employeeName: string, reason: BlockReason, today: TodayStatus) => {
      isProcessingRef.current = true;
      if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
      matchStreakRef.current = null;
      setVerifyProgress(0);
      setRecognizedName(employeeName);

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

  const setScanPhase = useCallback(
    (phase: ScanPhase) => {
      if (scanPhaseRef.current === phase) return;
      scanPhaseRef.current = phase;
      setScanPhaseState(phase);

      if (phase === "idle") {
        setStatusText(idleStatus);
      } else if (phase === "detecting") {
        setStatusText("جاري البحث عن وجهك...");
      } else if (phase === "matching") {
        setStatusText("تم اكتشاف الوجه — جاري التعرف عليك...");
      } else if (phase === "unknown") {
        setStatusText(UNKNOWN_FACE_MESSAGE);
      }
    },
    [idleStatus]
  );

  const showUnknownFaceFeedback = useCallback(() => {
    unknownHoldUntilRef.current = Date.now() + UNKNOWN_FACE_HOLD_MS;
    matchStreakRef.current = null;
    setVerifyProgress(0);
    setRecognizedName(null);
    setScanPhase("unknown");
  }, [setScanPhase]);

  const handleFaceScan = useCallback(async () => {
    if (
      !videoRef.current ||
      state !== "scanning" ||
      isProcessingRef.current ||
      isScanningFrameRef.current ||
      showEnroll ||
      showEmergency
    )
      return;

    isScanningFrameRef.current = true;

    try {
      const detection = await detectFaceForScan(videoRef.current);

      if (!detection) {
        if (wasRecentLivenessRejection() || wasRecentMotionRejection()) {
          spoofHoldUntilRef.current = Date.now() + SPOOF_FACE_HOLD_MS;
          matchStreakRef.current = null;
          setVerifyProgress(0);
          setRecognizedName(null);
          setScanPhase("unknown");
          setStatusText(SPOOF_FACE_MESSAGE);
          return;
        }

        if (Date.now() < spoofHoldUntilRef.current) {
          if (scanPhaseRef.current !== "unknown") {
            setScanPhase("unknown");
          }
          setStatusText(SPOOF_FACE_MESSAGE);
          return;
        }

        if (Date.now() < unknownHoldUntilRef.current) {
          if (scanPhaseRef.current !== "unknown") {
            setScanPhase("unknown");
          }
          return;
        }

        matchStreakRef.current = null;
        setVerifyProgress(0);
        setScanPhase("idle");
        return;
      }

      setScanPhase("matching");

      motionTrackerRef.current.record(
        detection.faceBox,
        detection.frameWidth,
        detection.frameHeight
      );
      stabilityTrackerRef.current.record(detection.descriptor);

      const engine = getFaceEngine();
      if (
        !motionTrackerRef.current.hasEnoughMotion() ||
        stabilityTrackerRef.current.isTooStatic(
          detection.descriptor,
          engine.euclideanDistance.bind(engine)
        )
      ) {
        markMotionRejection();
        spoofHoldUntilRef.current = Date.now() + SPOOF_FACE_HOLD_MS;
        matchStreakRef.current = null;
        setVerifyProgress(0);
        setRecognizedName(null);
        setScanPhase("unknown");
        setStatusText(SPOOF_FACE_MESSAGE);
        return;
      }

      const enrolled = employees;
      if (enrolled.length === 0) {
        showUnknownFaceFeedback();
        return;
      }

      const match = findBestMatch(detection.descriptor, enrolled);
      if (!match) {
        showUnknownFaceFeedback();
        return;
      }

      unknownHoldUntilRef.current = 0;
      setRecognizedName(match.employee.name);

      const streak = matchStreakRef.current;
      if (streak?.employeeId === match.employee.id) {
        streak.count += 1;
      } else {
        matchStreakRef.current = {
          employeeId: match.employee.id,
          count: 1,
          name: match.employee.name,
        };
      }

      const currentCount = matchStreakRef.current!.count;
      setVerifyProgress(
        Math.min(
          100,
          Math.round((currentCount / CONSECUTIVE_MATCHES_REQUIRED) * 100)
        )
      );

      if (currentCount < CONSECUTIVE_MATCHES_REQUIRED) {
        return;
      }

      matchStreakRef.current = null;
      setVerifyProgress(100);

      const today = await getTodayStatus(match.employee.id);

      const blockReason = getBlockReason(mode, today);
      if (blockReason) {
        showBlockedMessage(match.employee.name, blockReason, today);
        return;
      }

      isProcessingRef.current = true;
      setState("processing");
      setStatusText(`${labels.scanning} (${match.employee.name})`);
      if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);

      const data = await recordAttendance(
        match.employee.id,
        descriptorToArray(detection.descriptor)
      );
      setResult(data);
      setState("success");
      setTimeout(resetScanner, SUCCESS_RESET_MS);
    } catch (error) {
      setState("error");
      setStatusText(error instanceof Error ? error.message : "حدث خطأ");
      setTimeout(resetScanner, SUCCESS_RESET_MS);
    } finally {
      isScanningFrameRef.current = false;
    }
  }, [
    employees,
    state,
    showEnroll,
    showEmergency,
    mode,
    labels,
    videoRef,
    getTodayStatus,
    showBlockedMessage,
    recordAttendance,
    resetScanner,
    setScanPhase,
    showUnknownFaceFeedback,
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

  const handleEnroll = useCallback(async () => {
    if (!enrollName.trim() || !videoRef.current) return;
    if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
    setState("processing");

    const duplicateFaceMessage = (employeeName: string) =>
      `${employeeName} مسجّل مسبقاً في النظام. قف أمام الكاميرا لتسجيل الحضور فقط`;

    try {
      setStatusText(
        `جاري تسجيل ${enrollName.trim()} — ثبّت وجهك داخل الإطار...`
      );
      const descriptor = await captureEnrollmentDescriptor(
        videoRef.current,
        (current, total) => {
          setStatusText(
            `تسجيل ${enrollName.trim()} — العينة ${current}/${total}`
          );
        }
      );

      if (employees.length > 0) {
        setStatusText("جاري التحقق بدقة من بصمة الوجه...");
        const faceMatch = findStrictDuplicateMatch(descriptor, employees);
        if (faceMatch) {
          throw new Error(duplicateFaceMessage(faceMatch.employee.name));
        }
      }

      const data = await enrollEmployee(
        enrollName.trim(),
        descriptorToArray(descriptor)
      );

      toast.success(data.message ?? "تم التسجيل بنجاح");
      setShowEnroll(false);
      setEnrollName("");
      await refreshEmployees();
      setState("scanning");
      setStatusText("تم التسجيل! في المرات القادمة قف أمام الكاميرا فقط");
    } catch (error) {
      const message = error instanceof Error ? error.message : "فشل التسجيل";
      toast.error(message);
      setShowEnroll(false);
      setEnrollName("");
      setState("scanning");
      setStatusText(message);
    }
  }, [enrollName, employees, enrollEmployee, refreshEmployees, videoRef]);

  const openEnroll = useCallback(() => {
    void loadEnrollmentFaceModels();
    setShowEnroll((prev) => !prev);
    setShowEmergency(false);
  }, []);

  const toggleEmergency = useCallback(() => {
    setShowEmergency((prev) => {
      const next = !prev;
      if (next && roster.length === 0 && !rosterLoading) {
        setRosterLoading(true);
        loadRoster()
          .then(setRoster)
          .catch((error) => {
            toast.error(
              error instanceof Error
                ? error.message
                : "فشل تحميل قائمة الموظفين"
            );
          })
          .finally(() => setRosterLoading(false));
      }
      return next;
    });
    setShowEnroll(false);
  }, [roster.length, rosterLoading, loadRoster]);

  useEffect(() => {
    updateClock();
    const clock = setInterval(updateClock, 1000);
    let cancelled = false;

    async function init() {
      try {
        setStatusText("جاري طلب صلاحية الكاميرا...");

        const modelsPromise = loadScanFaceModels();
        const employeesPromise = refreshEmployees();

        await startCamera();
        if (cancelled) return;

        setStatusText("جاري تحميل نماذج التعرف...");
        const [, enrolled] = await Promise.all([
          modelsPromise,
          employeesPromise,
        ]);
        if (cancelled) return;

        setState("scanning");
        setStatusText(
          enrolled.length === 0
            ? "موظف جديد؟ اضغط «موظف جديد» وأدخل اسمك"
            : labels.subtitle
        );
      } catch (error) {
        if (cancelled) return;
        setState("error");
        setStatusText(
          error instanceof Error
            ? error.message
            : "فشل تحميل الكاميرا أو النماذج. تحقق من صلاحيات الكاميرا"
        );
      }
    }

    init();

    return () => {
      cancelled = true;
      clearInterval(clock);
      stopCamera();
    };
  }, [refreshEmployees, startCamera, stopCamera, updateClock, labels.subtitle]);

  useEffect(() => {
    if (state !== "scanning" && state !== "verifying") return;

    scanIntervalRef.current = setInterval(handleFaceScan, SCAN_INTERVAL_MS);
    return () => {
      if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
    };
  }, [state, handleFaceScan]);

  return {
    isCheckin,
    labels,
    videoRef,
    cameraReady,
    facingMode,
    state,
    statusText,
    verifyProgress,
    scanPhase,
    recognizedName,
    result,
    currentTime,
    showEmergency,
    emergencyCode,
    setEmergencyCode,
    emergencyEmployeeId,
    setEmergencyEmployeeId,
    roster,
    rosterLoading,
    handleEmergency,
    toggleEmergency,
    showEnroll,
    enrollName,
    setEnrollName,
    handleEnroll,
    openEnroll,
    retryCamera,
  };
}

export type KioskScannerController = ReturnType<typeof useKioskScanner>;
