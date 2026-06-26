"use client";

import type { RefObject } from "react";
import { Loader2, ScanFace } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  UNKNOWN_FACE_MESSAGE,
  type KioskState,
  type ScanPhase,
} from "@/lib/kiosk-scanner-types";

interface KioskCameraViewProps {
  videoRef: RefObject<HTMLVideoElement>;
  state: KioskState;
  scanPhase: ScanPhase;
  cameraReady: boolean;
  verifyProgress: number;
  accentRing: string;
  onRetryCamera: () => void;
}

export function KioskCameraView({
  videoRef,
  state,
  scanPhase,
  cameraReady,
  verifyProgress,
  accentRing,
  onRetryCamera,
}: KioskCameraViewProps) {
  const isScanningLike = state === "scanning" || state === "verifying";

  return (
    <>
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
        {isScanningLike && (
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
          <Button size="sm" onClick={onRetryCamera}>
            <ScanFace className="size-4" />
            إعادة تشغيل الكاميرا
          </Button>
        </div>
      )}
    </>
  );
}
