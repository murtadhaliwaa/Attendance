"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, CheckCircle2, Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CameraFacingSelector } from "@/components/kiosk/camera-facing-selector";
import { useKioskCameraPreference } from "@/hooks/use-kiosk-camera-preference";
import { getCameraMirrorClass } from "@/lib/kiosk-camera-preference";
import { captureVideoFrame } from "@/lib/photo-capture";
import { parseJsonResponse } from "@/lib/api-utils";
import { cn } from "@/lib/utils";

interface ReferencePhotoPanelProps {
  active: boolean;
  hasExistingPhoto: boolean;
  existingPhotoPath?: string | null;
  photoDataUrl: string | null;
  onCaptured: (dataUrl: string | null) => void;
  /** طلب مسح الصورة المرجعية المحفوظة (وضع التعديل فقط) */
  onClearExisting?: () => void;
  canClearExisting?: boolean;
}

export function ReferencePhotoPanel({
  active,
  hasExistingPhoto,
  existingPhotoPath,
  photoDataUrl,
  onCaptured,
  onClearExisting,
  canClearExisting = false,
}: ReferencePhotoPanelProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { facingMode } = useKioskCameraPreference();
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [existingPreviewUrl, setExistingPreviewUrl] = useState<string | null>(
    null
  );
  const [previewLoading, setPreviewLoading] = useState(false);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraReady(false);
  }, []);

  const startCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("المتصفح لا يدعم الكاميرا");
    }
    stopCamera();
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false,
    });
    streamRef.current = stream;
    const video = videoRef.current;
    if (!video) throw new Error("تعذر تهيئة الكاميرا");
    video.srcObject = stream;
    await video.play();
    setCameraReady(true);
  }, [facingMode, stopCamera]);

  useEffect(() => {
    if (!active || !showCamera) {
      stopCamera();
      return;
    }
    let cancelled = false;
    void startCamera().catch((error) => {
      if (!cancelled) {
        setCameraError(
          error instanceof Error ? error.message : "فشل تشغيل الكاميرا"
        );
      }
    });
    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [active, showCamera, startCamera, stopCamera]);

  useEffect(() => {
    if (!active || photoDataUrl || !existingPhotoPath) {
      setExistingPreviewUrl(null);
      setPreviewLoading(false);
      return;
    }

    let cancelled = false;
    setPreviewLoading(true);

    void (async () => {
      try {
        const res = await fetch(
          `/api/photos/url?path=${encodeURIComponent(existingPhotoPath)}`
        );
        const data = await parseJsonResponse<{ url?: string; error?: string }>(
          res
        );
        if (!res.ok) throw new Error(data.error ?? "تعذر تحميل الصورة");
        if (!cancelled) setExistingPreviewUrl(data.url ?? null);
      } catch (error) {
        if (!cancelled) {
          setExistingPreviewUrl(null);
          setCameraError(
            error instanceof Error ? error.message : "تعذر تحميل الصورة المرجعية"
          );
        }
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [active, existingPhotoPath, photoDataUrl]);

  function handleCapture() {
    if (!videoRef.current) return;
    const frame = captureVideoFrame(videoRef.current);
    if (!frame) {
      setCameraError("تعذر التقاط الصورة");
      return;
    }
    onCaptured(frame);
    setShowCamera(false);
    stopCamera();
  }

  const registered = hasExistingPhoto || photoDataUrl !== null;
  const previewUrl = photoDataUrl ?? existingPreviewUrl;

  return (
    <div className="space-y-3">
      {registered && (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5">
          <div className="flex items-center gap-2 text-sm text-emerald-200">
            <CheckCircle2 className="size-4 shrink-0" />
            <span>
              {photoDataUrl
                ? "تم التقاط الصورة المرجعية — ستُحفظ مع بيانات الموظف"
                : "الصورة المرجعية مسجّلة مسبقاً"}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {canClearExisting && hasExistingPhoto && !photoDataUrl && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs text-rose-300 hover:text-rose-200"
                onClick={() => {
                  onCaptured(null);
                  onClearExisting?.();
                }}
              >
                مسح
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs"
              onClick={() => {
                onCaptured(null);
                setShowCamera(true);
              }}
            >
              <RotateCcw className="size-3.5" />
              إعادة التقاط
            </Button>
          </div>
        </div>
      )}

      {photoDataUrl && (
        <div className="overflow-hidden rounded-xl border border-bg-border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photoDataUrl}
            alt="الصورة المرجعية"
            className="aspect-[4/3] w-full object-cover"
          />
        </div>
      )}

      {!photoDataUrl && previewUrl && (
        <div className="overflow-hidden rounded-xl border border-bg-border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="الصورة المرجعية الحالية"
            className="aspect-[4/3] w-full object-cover"
          />
        </div>
      )}

      {!photoDataUrl && previewLoading && (
        <div className="flex aspect-[4/3] items-center justify-center rounded-xl border border-bg-border bg-bg-elevated/40">
          <Loader2 className="size-5 animate-spin text-text-muted" />
        </div>
      )}

      {!registered && !showCamera && (
        <Button
          type="button"
          variant="outline"
          className="w-full justify-center gap-2"
          onClick={() => setShowCamera(true)}
        >
          <Camera className="size-4" />
          التقاط الصورة المرجعية
        </Button>
      )}

      {showCamera && (
        <div className="space-y-2">
          <CameraFacingSelector compact className="max-w-xs" />
          <div
            dir="ltr"
            className="relative aspect-[4/3] overflow-hidden rounded-xl border border-bg-border bg-black"
          >
            <video
              ref={videoRef}
              className={cn(
                "size-full object-cover",
                getCameraMirrorClass(facingMode)
              )}
              autoPlay
              playsInline
              muted
            />
            {!cameraReady && !cameraError && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                <Loader2 className="size-6 animate-spin text-blue-primary" />
              </div>
            )}
          </div>
          {cameraError && (
            <p className="text-xs text-rose-300">{cameraError}</p>
          )}
          <Button
            type="button"
            className="w-full"
            disabled={!cameraReady}
            onClick={handleCapture}
          >
            <Camera className="size-4" />
            التقاط الصورة المرجعية
          </Button>
        </div>
      )}
    </div>
  );
}
