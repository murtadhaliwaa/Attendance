"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, Loader2, ScanFace, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  captureEnrollmentDescriptor,
  descriptorToArray,
  loadEnrollmentFaceModels,
} from "@/lib/face-recognition";
import { dashboardFetch } from "@/lib/api-utils";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface FaceEnrollmentPanelProps {
  active: boolean;
  hasExistingFace: boolean;
  allowManageExisting: boolean;
  captured: number[] | null;
  cleared: boolean;
  excludeEmployeeId?: string;
  onCaptured: (descriptor: number[] | null, forced?: boolean) => void;
  onClearExisting: () => void;
  onUndoClear: () => void;
}

export function FaceEnrollmentPanel({
  active,
  hasExistingFace,
  allowManageExisting,
  captured,
  cleared,
  excludeEmployeeId,
  onCaptured,
  onClearExisting,
  onUndoClear,
}: FaceEnrollmentPanelProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [progress, setProgress] = useState("");
  const [showCamera, setShowCamera] = useState(false);
  const [duplicateMatch, setDuplicateMatch] = useState<{
    name: string;
    employeeCode: string;
  } | null>(null);
  // البصمة الملتقطة المعلّقة عند ظهور تشابه — تُستخدم لو اختار المشرف التجاوز.
  const [pendingDescriptor, setPendingDescriptor] = useState<number[] | null>(
    null
  );

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraReady(false);
  }, []);

  const startCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("المتصفح لا يدعم الكاميرا. استخدم Chrome أو Safari");
    }

    stopCamera();

    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "user",
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: false,
    });

    streamRef.current = stream;
    const video = videoRef.current;
    if (!video) {
      stream.getTracks().forEach((track) => track.stop());
      throw new Error("تعذر تهيئة الكاميرا");
    }

    video.srcObject = stream;
    await video.play();

    await new Promise<void>((resolve, reject) => {
      if (video.readyState >= 2) {
        resolve();
        return;
      }
      video.addEventListener("loadeddata", () => resolve(), { once: true });
      video.addEventListener("error", () => reject(new Error("فشل تشغيل الكاميرا")), {
        once: true,
      });
    });

    setCameraReady(true);
  }, [stopCamera]);

  useEffect(() => {
    if (!active || !showCamera) {
      stopCamera();
      return;
    }

    let cancelled = false;

    async function init() {
      setCameraError(null);
      setCameraReady(false);
      try {
        await loadEnrollmentFaceModels();
        if (cancelled) return;
        await startCamera();
      } catch (error) {
        if (cancelled) return;
        setCameraError(
          error instanceof Error ? error.message : "فشل تشغيل الكاميرا"
        );
      }
    }

    void init();

    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [active, showCamera, startCamera, stopCamera]);

  useEffect(() => {
    if (!active) {
      setShowCamera(false);
      setProgress("");
      setCapturing(false);
      setDuplicateMatch(null);
      setPendingDescriptor(null);
    }
  }, [active]);

  async function handleCapture() {
    if (!videoRef.current || capturing) return;

    setCapturing(true);
    setProgress("ثبّت وجهك داخل الإطار...");
    try {
      const descriptor = await captureEnrollmentDescriptor(
        videoRef.current,
        (current, total) => {
          setProgress(`جاري التقاط العينة ${current} من ${total}...`);
        }
      );
      const arr = descriptorToArray(descriptor);

      setProgress("جاري التحقق من البصمة...");

      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        throw new Error(
          "انتهت جلسة الدخول — أعد تسجيل الدخول ثم حاول مرة أخرى"
        );
      }

      const res = await dashboardFetch("/api/employees/face-match", {
        method: "POST",
        body: JSON.stringify({
          descriptor: arr,
          excludeEmployeeId: excludeEmployeeId ?? undefined,
        }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        if (res.status === 401) {
          throw new Error(
            data.error ??
              "انتهت جلسة الدخول — أعد تسجيل الدخول ثم حاول مرة أخرى"
          );
        }
        throw new Error(data.error || "فشل التحقق من بصمة الوجه");
      }

      const data = (await res.json()) as {
        match: { name: string; employeeCode: string } | null;
      };

      if (data.match) {
        setDuplicateMatch(data.match);
        setPendingDescriptor(arr);
        setProgress("");
        setShowCamera(false);
        stopCamera();
        return;
      }

      setDuplicateMatch(null);
      setPendingDescriptor(null);
      onCaptured(arr);
      setProgress("");
      setShowCamera(false);
      stopCamera();
    } catch (error) {
      setProgress(
        error instanceof Error ? error.message : "فشل التقاط بصمة الوجه"
      );
    } finally {
      setCapturing(false);
    }
  }

  const registered =
    (hasExistingFace && !cleared && !captured) || captured !== null;

  return (
    <div className="space-y-3">
      {duplicateMatch && (
        <div className="space-y-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2.5 text-sm text-rose-200">
          <p>
            بصمة الوجه تشبه الموظف{" "}
            <span className="font-medium text-rose-100">
              {duplicateMatch.name}
            </span>{" "}
            ({duplicateMatch.employeeCode}). إن كان هذا شخصاً مختلفاً فعلاً،
            يمكنك التسجيل رغم التشابه.
          </p>
          {pendingDescriptor && (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 border-rose-400/40 px-2 text-xs text-rose-100 hover:bg-rose-500/20"
                onClick={() => {
                  onCaptured(pendingDescriptor, true);
                  setDuplicateMatch(null);
                  setPendingDescriptor(null);
                }}
              >
                هذا شخص مختلف — سجّل البصمة
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-8 px-2 text-xs"
                onClick={() => {
                  setDuplicateMatch(null);
                  setPendingDescriptor(null);
                  setShowCamera(true);
                }}
              >
                إعادة المحاولة
              </Button>
            </div>
          )}
        </div>
      )}

      {registered && (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5">
          <div className="flex items-center gap-2 text-sm text-emerald-200">
            <CheckCircle2 className="size-4 shrink-0" />
            <span>
              {captured
                ? "تم التقاط بصمة الوجه — ستُحفظ مع بيانات الموظف"
                : "بصمة الوجه مسجّلة مسبقاً"}
            </span>
          </div>
          <div className="flex shrink-0 gap-1">
            {(captured || allowManageExisting) && (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-xs"
                  onClick={() => {
                    onCaptured(null);
                    setDuplicateMatch(null);
                    setShowCamera(true);
                  }}
                >
                  إعادة التقاط
                </Button>
                {(hasExistingFace || captured) && allowManageExisting && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-xs text-rose-300 hover:text-rose-200"
                    onClick={() => {
                      onCaptured(null);
                      onClearExisting();
                      setShowCamera(false);
                    }}
                  >
                    <Trash2 className="size-3.5" />
                    حذف
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {cleared && hasExistingFace && (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-200">
          <span>سيتم حذف بصمة الوجه عند الحفظ</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs"
            onClick={onUndoClear}
          >
            تراجع
          </Button>
        </div>
      )}

      {!registered && !cleared && !showCamera && (
        <Button
          type="button"
          variant="outline"
          className="w-full justify-center gap-2"
          onClick={() => {
            setDuplicateMatch(null);
            setShowCamera(true);
          }}
        >
          <ScanFace className="size-4" />
          تسجيل بصمة الوجه من الكاميرا
        </Button>
      )}

      {showCamera && (
        <div className="space-y-2">
          <div
            dir="ltr"
            className="relative aspect-[4/3] overflow-hidden rounded-xl border border-bg-border bg-black"
          >
            <video
              ref={videoRef}
              className="size-full object-cover [transform:scaleX(-1)]"
              autoPlay
              playsInline
              muted
            />
            {!cameraReady && !cameraError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/80">
                <Loader2 className="size-6 animate-spin text-blue-primary" />
                <span className="text-xs text-text-secondary">
                  جاري تشغيل الكاميرا...
                </span>
              </div>
            )}
            {cameraReady && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div
                  className={cn(
                    "aspect-square w-[min(55%,10rem)] rounded-full border-2 border-dashed",
                    capturing
                      ? "border-emerald-400/80 animate-pulse"
                      : "border-blue-primary/60"
                  )}
                />
              </div>
            )}
          </div>

          {cameraError && (
            <p className="text-xs text-rose-300">{cameraError}</p>
          )}

          {progress && (
            <p className="text-xs text-text-secondary">{progress}</p>
          )}

          <div className="flex gap-2">
            <Button
              type="button"
              className="flex-1 gap-2"
              disabled={!cameraReady || capturing || !!cameraError}
              onClick={() => void handleCapture()}
            >
              {capturing ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <ScanFace className="size-4" />
              )}
              {capturing ? "جاري التقاط..." : "التقاط بصمة الوجه"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={capturing}
              onClick={() => {
                setShowCamera(false);
                setProgress("");
              }}
            >
              إلغاء
            </Button>
          </div>

          <p className="text-[11px] leading-relaxed text-text-muted">
            قرّب وجهك داخل الإطار الدائري بإضاءة جيدة، وابقَ ثابتاً حتى ينتهي
            التقاط 7 عينات.
          </p>
        </div>
      )}
    </div>
  );
}
