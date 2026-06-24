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
import { KIOSK_MODE_LABELS, type KioskMode } from "@/lib/kiosk-types";
import {
  type AttendanceResult,
  type BlockReason,
  type KioskState,
  type ScanPhase,
  UNKNOWN_FACE_HOLD_MS,
  UNKNOWN_FACE_MESSAGE,
  getBlockReason,
  blockMessage,
  type MatchStreak,
  type AttendanceAction,
  type TodayStatus,
} from "@/lib/kiosk-scanner-types";
import { useKioskCamera } from "@/hooks/use-kiosk-camera";
import { useKioskAttendanceApi } from "@/hooks/use-kiosk-attendance-api";
import { KioskResultPanel } from "@/components/kiosk/kiosk-result-panel";
import { KioskTabletExitButton } from "@/components/kiosk/kiosk-tablet-exit";
import { useKioskTabletMode } from "@/hooks/use-kiosk-tablet-mode";
import { cn } from "@/lib/utils";
import {
  captureEnrollmentDescriptor,
  CONSECUTIVE_MATCHES_REQUIRED,
  detectFaceForScan,
  findBestMatch,
  findStrictDuplicateMatch,
  loadScanFaceModels,
  loadEnrollmentFaceModels,
  descriptorToArray,
  type EmployeeFaceData,
} from "@/lib/face-recognition";

interface KioskScannerProps {
  mode: KioskMode;
}

export function KioskScanner({ mode }: KioskScannerProps) {
  const labels = KIOSK_MODE_LABELS[mode];
  const isCheckin = mode === "checkin";
  const { enabled: tabletMode } = useKioskTabletMode();

  const {
    videoRef,
    cameraReady,
    setCameraReady,
    stopCamera: releaseCamera,
    startCamera,
  } = useKioskCamera();
  const {
    loadEmployees,
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

  const [state, setState] = useState<KioskState>("loading");
  const [statusText, setStatusText] = useState("جاري طلب صلاحية الكاميرا...");
  const [verifyProgress, setVerifyProgress] = useState(0);
  const [employees, setEmployees] = useState<EmployeeFaceData[]>([]);
  const [result, setResult] = useState<AttendanceResult | null>(null);
  const [showEmergency, setShowEmergency] = useState(false);
  const [showEnroll, setShowEnroll] = useState(false);
  const [emergencyCode, setEmergencyCode] = useState("");
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
    setVerifyProgress(0);
    setResult(null);
    setRecognizedName(null);
    setState("scanning");
    setStatusText(idleStatus);
  }, [idleStatus]);

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
    videoRef,
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
      const data = await submitEmergency(emergencyCode);
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
      const message =
        error instanceof Error ? error.message : "فشل التسجيل";
      toast.error(message);
      setShowEnroll(false);
      setEnrollName("");
      setState("scanning");
      setStatusText(message);
    }
  };

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
            {tabletMode ? (
              <KioskTabletExitButton className={accentActionClass} />
            ) : (
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
            )}
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
                {state === "loading" && !cameraReady && (
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
              <KioskResultPanel result={result} isCheckin={isCheckin} />
            )}
          </div>

          {showEmergency && (
            <div className="flex shrink-0 items-center gap-2">
              <Input
                id="kiosk-emergency-code"
                aria-label="الرمز الطارئ"
                name="emergencyCode"
                autoComplete="one-time-code"
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
                  id="kiosk-enroll-name"
                  aria-label="الاسم الكامل"
                  name="employeeName"
                  autoComplete="name"
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
