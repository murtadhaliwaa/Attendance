"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Camera,
  CheckCircle2,
  KeyRound,
  Loader2,
  LogIn,
  LogOut,
  ScanFace,
  UserPlus,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { parseJsonResponse } from "@/lib/api-utils";
import { kioskRequestHeaders } from "@/lib/kiosk-auth";
import { KIOSK_MODE_LABELS, type KioskMode } from "@/lib/kiosk-types";
import { cn } from "@/lib/utils";
import {
  captureEnrollmentDescriptor,
  detectFaceForScan,
  findBestMatch,
  loadScanFaceModels,
  loadEnrollmentFaceModels,
  descriptorToArray,
  type EmployeeFaceData,
} from "@/lib/face-recognition";

type KioskState =
  | "loading"
  | "scanning"
  | "verifying"
  | "processing"
  | "success"
  | "error";

type BlockReason = "already_checkin" | "no_checkin" | "already_done";

const UNKNOWN_FACE_MESSAGE =
  "ربما أنك موظف جديد وغير مسجّل، أو أن النظام لم يتعرف عليك — حاول مجدداً، أو سجّل عبر «موظف جديد».";

const UNKNOWN_FACE_HOLD_MS = 5000;

type AttendanceAction =
  | "checkin"
  | "checkout"
  | "already_checkin"
  | "no_checkin"
  | "already_done";

interface AttendanceResult {
  message: string;
  employeeName: string;
  action: AttendanceAction;
  time: string;
  status: string;
  department: string;
}

interface TodayStatus {
  hasCheckIn: boolean;
  hasCheckOut: boolean;
  checkInTime: string | null;
  checkOutTime: string | null;
  employeeName: string;
}

interface MatchStreak {
  employeeId: string;
  count: number;
  name: string;
}

function getBlockReason(
  mode: KioskMode,
  today: TodayStatus
): BlockReason | null {
  if (mode === "checkin") {
    if (today.hasCheckIn) return "already_checkin";
    return null;
  }
  if (!today.hasCheckIn) return "no_checkin";
  if (today.hasCheckOut) return "already_done";
  return null;
}

function blockMessage(
  mode: KioskMode,
  reason: BlockReason,
  employeeName: string,
  today: TodayStatus
): string {
  if (reason === "already_checkin") {
    return `أنت ${employeeName}، حضورك مسجّل مسبقاً (${today.checkInTime ?? ""})`;
  }
  if (reason === "no_checkin") {
    return `أنت ${employeeName}، سجّل حضورك أولاً من صفحة الحضور`;
  }
  return `أنت ${employeeName}، انصرافك مسجّل مسبقاً (${today.checkOutTime ?? ""})`;
}

interface KioskScannerProps {
  mode: KioskMode;
  kioskApiKey: string;
}

function ResultSidePanel({
  result,
  isCheckin,
}: {
  result: AttendanceResult;
  isCheckin: boolean;
}) {
  const isWarning =
    result.action !== "checkin" && result.action !== "checkout";

  return (
    <aside
      className={`hidden shrink-0 flex-col items-center justify-center rounded-lg border p-4 text-center lg:flex lg:w-52 ${
        isWarning
          ? "border-amber-500/35 bg-amber-500/10"
          : "border-bg-border bg-bg-elevated"
      }`}
    >
      <p className="text-base font-bold text-text-primary">
        {result.employeeName}
      </p>
      <p
        className={`mt-2 text-sm leading-snug ${
          result.action === "checkin" || result.action === "checkout"
            ? isCheckin
              ? "text-emerald-200"
              : "text-sky-200"
            : "text-amber-200"
        }`}
      >
        {result.action === "checkin" && "قام بتسجيل الحضور"}
        {result.action === "checkout" && "قام بتسجيل الانصراف"}
        {result.action === "already_checkin" && "الحضور مسجّل مسبقاً"}
        {result.action === "no_checkin" &&
          "يجب تسجيل الحضور أولاً"}
        {result.action === "already_done" && "الانصراف مسجّل مسبقاً"}
      </p>
      {result.time && (
        <div className="mt-2 flex items-center justify-center gap-2 text-sm text-text-secondary">
          {result.action === "checkout" ? (
            <LogOut className="size-4 shrink-0" />
          ) : (
            <LogIn className="size-4 shrink-0" />
          )}
          <span dir="ltr">{result.time}</span>
        </div>
      )}
    </aside>
  );
}

export function KioskScanner({ mode, kioskApiKey }: KioskScannerProps) {
  const labels = KIOSK_MODE_LABELS[mode];
  const isCheckin = mode === "checkin";

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<ReturnType<typeof setInterval>>();
  const matchStreakRef = useRef<MatchStreak | null>(null);
  const scanPhaseRef = useRef<"idle" | "detecting" | "matching" | "unknown">(
    "idle"
  );
  const isProcessingRef = useRef(false);
  const isScanningFrameRef = useRef(false);
  const todayStatusCacheRef = useRef<
    Map<string, { data: TodayStatus; ts: number }>
  >(new Map());
  const unknownHoldUntilRef = useRef(0);

  const [state, setState] = useState<KioskState>("loading");
  const [statusText, setStatusText] = useState("جاري تحميل النماذج...");
  const [verifyProgress, setVerifyProgress] = useState(0);
  const [employees, setEmployees] = useState<EmployeeFaceData[]>([]);
  const [result, setResult] = useState<AttendanceResult | null>(null);
  const [showEmergency, setShowEmergency] = useState(false);
  const [showEnroll, setShowEnroll] = useState(false);
  const [emergencyCode, setEmergencyCode] = useState("");
  const [enrollName, setEnrollName] = useState("");
  const [currentTime, setCurrentTime] = useState("");
  const [scanPhase, setScanPhaseState] = useState<
    "idle" | "detecting" | "matching" | "unknown"
  >("idle");
  const [recognizedName, setRecognizedName] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);

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
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
    setCameraReady(false);
  }, []);

  const attachStreamToVideo = useCallback(async (stream: MediaStream) => {
    streamRef.current = stream;

    for (let attempt = 0; attempt < 30; attempt++) {
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        video.muted = true;
        try {
          await video.play();
        } catch (playError) {
          if (
            playError instanceof DOMException &&
            playError.name === "NotAllowedError"
          ) {
            throw new Error(
              "المتصفح منع تشغيل الكاميرا. اضغط على الصفحة ثم اسمح بالكاميرا"
            );
          }
          throw playError;
        }

        if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
          setCameraReady(true);
          return;
        }

        await new Promise<void>((resolve, reject) => {
          const onReady = () => {
            cleanup();
            setCameraReady(true);
            resolve();
          };
          const onError = () => {
            cleanup();
            reject(new Error("تعذر عرض بث الكاميرا"));
          };
          const cleanup = () => {
            video.removeEventListener("loadeddata", onReady);
            video.removeEventListener("error", onError);
          };
          video.addEventListener("loadeddata", onReady, { once: true });
          video.addEventListener("error", onError, { once: true });
        });
        return;
      }
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }

    throw new Error("تعذر ربط الكاميرا بالواجهة. حدّث الصفحة وحاول مرة أخرى");
  }, []);

  const startCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("المتصفح لا يدعم الكاميرا. استخدم Chrome أو Edge");
    }

    stopCamera();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      await attachStreamToVideo(stream);
    } catch (error) {
      if (error instanceof Error && error.message.includes("تعذر")) {
        throw error;
      }

      const name =
        error instanceof DOMException ? error.name : "UnknownError";
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        throw new Error(
          "تم رفض صلاحية الكاميرا. اضغط على أيقونة القفل في شريط العنوان واسمح بالكاميرا"
        );
      }
      if (name === "NotFoundError" || name === "DevicesNotFoundError") {
        throw new Error("لم يُعثر على كاميرا متصلة بالجهاز");
      }
      if (name === "NotReadableError" || name === "TrackStartError") {
        throw new Error(
          "الكاميرا مستخدمة من برنامج آخر. أغلقه ثم اضغط إعادة المحاولة"
        );
      }
      throw new Error("فشل تشغيل الكاميرا. تأكد أنها غير مستخدمة من برنامج آخر");
    }
  }, [attachStreamToVideo, stopCamera]);

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
  }, [labels.subtitle, startCamera]);

  const loadEmployees = useCallback(async () => {
    const res = await fetch("/api/employees/descriptors", {
      headers: kioskRequestHeaders(kioskApiKey),
    });
    const data = await res.json();
    setEmployees(
      data.map(
        (e: {
          id: string;
          name: string;
          employeeCode: string;
          descriptor: number[];
        }) => ({
          id: e.id,
          name: e.name,
          employeeCode: e.employeeCode,
          descriptor: e.descriptor,
        })
      )
    );
    return data;
  }, [kioskApiKey]);

  const resetScanner = useCallback(() => {
    matchStreakRef.current = null;
    scanPhaseRef.current = "idle";
    isProcessingRef.current = false;
    unknownHoldUntilRef.current = 0;
    setVerifyProgress(0);
    setResult(null);
    setRecognizedName(null);
    setState("scanning");
    setStatusText(idleStatus);
  }, [idleStatus]);

  const getTodayStatus = useCallback(async (employeeId: string) => {
    const cached = todayStatusCacheRef.current.get(employeeId);
    if (cached && Date.now() - cached.ts < 8000) {
      return cached.data;
    }

    const todayRes = await fetch(
      `/api/attendance/today?employeeId=${employeeId}`,
      { headers: kioskRequestHeaders(kioskApiKey) }
    );
    const todayData = await parseJsonResponse<TodayStatus & { error?: string }>(
      todayRes
    );
    if (!todayRes.ok) {
      throw new Error(todayData.error ?? "فشل التحقق من حالة اليوم");
    }

    todayStatusCacheRef.current.set(employeeId, {
      data: todayData,
      ts: Date.now(),
    });
    return todayData;
  }, [kioskApiKey]);

  const showBlockedMessage = useCallback(
    (
      employeeName: string,
      reason: BlockReason,
      today: TodayStatus
    ) => {
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
      setTimeout(resetScanner, 5000);
    },
    [mode, resetScanner]
  );

  const recordAttendance = useCallback(
    async (employeeId: string, descriptor: number[]) => {
      const endpoint =
        mode === "checkout"
          ? "/api/attendance/checkout"
          : "/api/attendance/checkin";

      const res = await fetch(endpoint, {
        method: "POST",
        headers: kioskRequestHeaders(kioskApiKey),
        body: JSON.stringify({ employeeId, descriptor }),
      });

      const data = await parseJsonResponse<AttendanceResult & { error?: string }>(
        res
      );
      if (!res.ok) throw new Error(data.error ?? "فشل التسجيل");

      todayStatusCacheRef.current.delete(employeeId);
      return data;
    },
    [mode, kioskApiKey]
  );

  const setScanPhase = useCallback(
    (phase: "idle" | "detecting" | "matching" | "unknown") => {
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
      setTimeout(resetScanner, 3000);
    } catch (error) {
      setState("error");
      setStatusText(error instanceof Error ? error.message : "حدث خطأ");
      setTimeout(resetScanner, 3000);
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
    getTodayStatus,
    showBlockedMessage,
    recordAttendance,
    resetScanner,
    setScanPhase,
    showUnknownFaceFeedback,
  ]);

  const handleEmergency = async () => {
    if (!emergencyCode) return;
    setState("processing");
    try {
      const res = await fetch("/api/attendance/emergency", {
        method: "POST",
        headers: kioskRequestHeaders(kioskApiKey),
        body: JSON.stringify({ emergencyCode, mode }),
      });
      const data = await parseJsonResponse<AttendanceResult & { error?: string }>(
        res
      );
      if (!res.ok) throw new Error(data.error);
      setResult(data);
      setState("success");
      setShowEmergency(false);
      setEmergencyCode("");
      setTimeout(resetScanner, 4000);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "رمز غير صحيح");
      setState("scanning");
    }
  };

  const handleEnroll = async () => {
    if (!enrollName.trim() || !videoRef.current) return;
    if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
    setState("processing");
    setStatusText(`جاري تسجيل ${enrollName.trim()} — ثبّت وجهك داخل الإطار...`);
    try {
      const descriptor = await captureEnrollmentDescriptor(
        videoRef.current,
        (current, total) => {
          setStatusText(
            `تسجيل ${enrollName.trim()} — العينة ${current}/${total}`
          );
        }
      );

      const res = await fetch("/api/employees/descriptors", {
        method: "PUT",
        headers: kioskRequestHeaders(kioskApiKey),
        body: JSON.stringify({
          name: enrollName.trim(),
          descriptor: descriptorToArray(descriptor),
        }),
      });
      const data = await parseJsonResponse<{ message: string; error?: string }>(
        res
      );
      if (!res.ok) throw new Error(data.error ?? "فشل حفظ بصمة الوجه");

      toast.success(data.message);
      setShowEnroll(false);
      setEnrollName("");
      await loadEmployees();
      setState("scanning");
      setStatusText("تم التسجيل! في المرات القادمة قف أمام الكاميرا فقط");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "فشل التسجيل");
      setState("scanning");
      setStatusText(idleStatus);
    }
  };

  useEffect(() => {
    updateClock();
    const clock = setInterval(updateClock, 1000);
    let cancelled = false;

    async function init() {
      try {
        setStatusText("جاري التحضير...");
        const [, employeesData] = await Promise.all([
          loadScanFaceModels(),
          loadEmployees(),
        ]);
        if (cancelled) return;

        setStatusText("جاري تشغيل الكاميرا...");
        await startCamera();
        if (cancelled) return;

        setState("scanning");

        const enrolledCount = employeesData.filter(
          (employee: { hasFace: boolean }) => employee.hasFace
        ).length;

        setStatusText(
          enrolledCount === 0
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
  }, [loadEmployees, mode, startCamera, stopCamera, updateClock, labels.subtitle]);

  useEffect(() => {
    if (state !== "scanning" && state !== "verifying") return;

    scanIntervalRef.current = setInterval(handleFaceScan, 200);
    return () => {
      if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
    };
  }, [state, handleFaceScan]);

  const accentBorder = isCheckin
    ? "border-emerald-500/40"
    : "border-sky-500/40";
  const accentRing = isCheckin
    ? "border-emerald-500/60"
    : "border-sky-500/60";
  const accentClockClass = isCheckin
    ? "border-emerald-500/45 bg-emerald-500/15 text-emerald-100"
    : "border-sky-500/45 bg-sky-500/15 text-sky-100";
  const accentActionClass = isCheckin
    ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 hover:text-emerald-200"
    : "border-sky-500/40 bg-sky-500/15 text-sky-300 hover:bg-sky-500/25 hover:text-sky-200";

  const isBlockedStatus =
    result?.action === "already_checkin" ||
    result?.action === "already_done" ||
    result?.action === "no_checkin";

  const statusDescriptionClass = cn(
    "text-center text-sm font-medium sm:text-base",
    scanPhase === "unknown" ? "line-clamp-3" : "line-clamp-2",
    result?.action === "already_checkin" && "font-semibold text-emerald-200",
    result?.action === "already_done" && "font-semibold text-sky-200",
    result?.action === "no_checkin" && "font-semibold text-amber-200",
    !isBlockedStatus &&
      (scanPhase === "matching" || state === "verifying") &&
      (isCheckin ? "text-emerald-200" : "text-sky-200"),
    !isBlockedStatus &&
      scanPhase === "unknown" &&
      "font-medium text-amber-200",
    !isBlockedStatus &&
      scanPhase !== "matching" &&
      scanPhase !== "unknown" &&
      state !== "verifying" &&
      "text-text-primary"
  );

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden px-3 py-2">
      <div className="mx-auto mb-2 w-full max-w-4xl shrink-0">
        <div
          dir="ltr"
          className="grid w-full grid-cols-[1fr_auto_1fr] items-center gap-2 py-1 sm:gap-3"
        >
          <div className="flex justify-start">
            <Link
              href="/kiosk"
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "h-8 shrink-0 px-3 text-sm hover:no-underline",
                accentActionClass
              )}
            >
            الحضور والانصراف
            </Link>
          </div>

          <div className="flex justify-center">
            <p
              dir="ltr"
              className={cn(
                "truncate rounded-xl border px-4 py-1.5 text-center font-mono text-lg font-bold tracking-wide tabular-nums shadow-sm sm:px-5 sm:py-2 sm:text-xl",
                accentClockClass
              )}
            >
              {currentTime}
            </p>
          </div>

          <div className="flex w-full min-w-0 justify-end">
            <div
              dir="rtl"
              className="flex min-w-0 items-center gap-2 sm:gap-2.5"
            >
              <div
                className={`flex size-9 shrink-0 items-center justify-center rounded-lg sm:size-10 ${isCheckin ? "bg-emerald-500/15" : "bg-sky-500/15"}`}
              >
                {isCheckin ? (
                  <LogIn className="size-4 text-emerald-300 sm:size-5" />
                ) : (
                  <LogOut className="size-4 text-sky-300 sm:size-5" />
                )}
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-base font-bold text-text-primary sm:text-lg">
                  {labels.title}
                </h1>
                <p className="truncate text-xs text-text-secondary sm:text-sm">
                  {labels.subtitle}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Card
        size="sm"
        className={`mx-auto flex min-h-0 w-full max-w-4xl flex-1 flex-col gap-1 py-2 ${accentBorder}`}
      >
        <CardHeader className="shrink-0 gap-0.5 px-3 py-0">
          <CardTitle className="flex items-center justify-center gap-2 text-base font-semibold sm:text-lg">
            {state === "loading" && (
              <Loader2 className="size-5 animate-spin" />
            )}
            {(state === "scanning" || state === "verifying") && (
              <ScanFace className="size-5 text-blue-primary" />
            )}
            {state === "processing" && (
              <Loader2 className="size-5 animate-spin" />
            )}
            {state === "success" && (
              <CheckCircle2
                className={cn(
                  isBlockedStatus ? "size-5" : "size-4",
                  "text-status-present"
                )}
              />
            )}
            {state === "error" && (
              <XCircle className="size-5 text-status-absent" />
            )}
            {state === "success" && result
              ? recognizedName ?? "تم التعرف"
              : state === "verifying"
                ? recognizedName
                  ? `جاري التعرف على ${recognizedName}...`
                  : "جاري التعرف..."
                : scanPhase === "unknown"
                  ? "لم يتم التعرف على الوجه"
                  : showEnroll
                  ? "تسجيل موظف جديد"
                  : labels.action}
          </CardTitle>
          <CardDescription className={statusDescriptionClass}>
            {statusText}
          </CardDescription>
        </CardHeader>

        <CardContent
          className={`flex min-h-0 flex-1 flex-col gap-1.5 px-3 pb-2 ${
            showEnroll || showEmergency ? "overflow-y-auto" : "overflow-hidden"
          }`}
        >
          <div className="flex min-h-0 flex-1 gap-2 lg:flex-row lg:items-stretch">
            <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-1.5">
              <div
                dir="ltr"
                className={`relative min-h-0 flex-1 overflow-hidden rounded-xl border-2 bg-black ${accentRing}`}
              >
                <video
                  ref={videoRef}
                  className="size-full object-cover [transform:scaleX(-1)]"
                  autoPlay
                  playsInline
                  muted
                />
                {!cameraReady && state !== "error" && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/80">
                    <Loader2 className="size-8 animate-spin text-blue-primary" />
                    <span className="text-xs text-text-secondary">
                      جاري تشغيل الكاميرا...
                    </span>
                  </div>
                )}
                {(state === "scanning" || state === "verifying") && (
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2">
                    <div
                      className={`aspect-square w-[min(55%,13rem)] rounded-full border-2 border-dashed ${
                        state === "verifying" || scanPhase === "matching"
                          ? `${accentRing} animate-pulse`
                          : scanPhase === "unknown"
                            ? "border-amber-500/80"
                            : "border-blue-primary/60"
                      }`}
                    />
                    {scanPhase === "matching" && (
                      <span className="rounded-full bg-black/60 px-3 py-1 text-xs text-emerald-200">
                        جاري التعرف...
                      </span>
                    )}
                  </div>
                )}
                {state === "loading" && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                    <Loader2 className="size-10 animate-spin text-blue-primary" />
                  </div>
                )}
              </div>

              {verifyProgress > 0 && state !== "success" && (
                <div className="shrink-0 space-y-0.5">
                  <Progress value={verifyProgress} className="h-1.5" />
                  <p className="text-center text-[10px] text-text-secondary">
                    التحقق: {verifyProgress}%
                  </p>
                </div>
              )}

              {scanPhase === "unknown" && state === "scanning" && (
                <div
                  role="alert"
                  className="shrink-0 rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-center"
                >
                  <p className="text-xs font-semibold text-amber-200">
                    لم يتم التعرف على الوجه
                  </p>
                  <p className="mt-1 text-[11px] leading-relaxed text-amber-100/90">
                    {UNKNOWN_FACE_MESSAGE}
                  </p>
                </div>
              )}

              {(state === "error" || (state === "scanning" && !cameraReady)) && (
                <div className="flex shrink-0 justify-center">
                  <Button size="sm" onClick={retryCamera}>
                    <ScanFace className="size-4" />
                    إعادة تشغيل الكاميرا
                  </Button>
                </div>
              )}

              <div className="flex shrink-0 flex-wrap justify-center gap-2">
                <Button
                  variant="outline"
                  className={cn("h-9 px-3 text-sm", accentActionClass)}
                  onClick={() => setShowEmergency(!showEmergency)}
                >
                  <KeyRound className="size-4" />
                  رمز طارئ
                </Button>
                {isCheckin && (
                  <Button
                    variant="outline"
                    className="h-9 px-3 text-sm"
                    onClick={() => {
                      void loadEnrollmentFaceModels();
                      setShowEnroll(!showEnroll);
                      setShowEmergency(false);
                    }}
                  >
                    <UserPlus className="size-4" />
                    موظف جديد
                  </Button>
                )}
              </div>
            </div>

            {state === "success" && result && (
              <ResultSidePanel result={result} isCheckin={isCheckin} />
            )}
          </div>

          {showEmergency && (
            <div className="flex shrink-0 items-center gap-2">
              <Input
                placeholder="أدخل الرمز الطارئ"
                value={emergencyCode}
                onChange={(e) => setEmergencyCode(e.target.value)}
                dir="ltr"
                className="h-10 text-center focus:placeholder:text-transparent"
              />
              <Button
                variant="outline"
                className={cn(
                  "h-10 shrink-0 rounded-lg px-5",
                  accentActionClass
                )}
                onClick={handleEmergency}
              >
                تأكيد
              </Button>
            </div>
          )}

          {showEnroll && isCheckin && (
            <div className="shrink-0 space-y-1 rounded-lg border border-bg-border bg-bg-elevated p-2">
              <p className="text-[10px] leading-snug text-text-secondary">
                <strong>للمرة الأولى فقط:</strong> اكتب اسمك ثم اضغط تسجيل.
              </p>
              <div className="flex gap-2">
                <Input
                  placeholder="مثال: محمد العتيبي"
                  value={enrollName}
                  onChange={(e) => setEnrollName(e.target.value)}
                  className="text-right"
                />
                <Button
                  variant="outline"
                  className={cn(
                    "h-10 shrink-0 rounded-lg px-4",
                    accentActionClass
                  )}
                  onClick={handleEnroll}
                >
                  <Camera className="size-4" />
                  تسجيل
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
