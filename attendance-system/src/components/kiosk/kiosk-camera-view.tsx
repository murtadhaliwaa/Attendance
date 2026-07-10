"use client";

import type { RefObject } from "react";
import { Camera, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { KioskState } from "@/lib/kiosk-scanner-types";
import {
  getCameraMirrorClass,
  type CameraFacingMode,
} from "@/lib/kiosk-camera-preference";
import { cn } from "@/lib/utils";

interface KioskCameraViewProps {
  videoRef: RefObject<HTMLVideoElement>;
  state: KioskState;
  cameraReady: boolean;
  accentRing: string;
  facingMode: CameraFacingMode;
  previewUrl: string | null;
  onRetryCamera: () => void;
}

export function KioskCameraView({
  videoRef,
  state,
  cameraReady,
  accentRing,
  facingMode,
  previewUrl,
  onRetryCamera,
}: KioskCameraViewProps) {
  return (
    <>
      <div
        dir="ltr"
        className={`relative min-h-0 flex-1 overflow-hidden rounded-xl border-2 bg-black ${accentRing}`}
      >
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt="معاينة الصورة"
            className="size-full object-cover"
          />
        ) : (
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
        )}
        {!cameraReady && state !== "error" && !previewUrl && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/80">
            <Loader2 className="size-8 animate-spin text-blue-primary" />
            <span className="text-xs text-text-secondary">
              جاري تشغيل الكاميرا...
            </span>
          </div>
        )}
        {state === "scanning" && cameraReady && !previewUrl && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="aspect-square w-[min(55%,13rem)] rounded-full border-2 border-dashed border-blue-primary/60" />
          </div>
        )}
        {state === "loading" && !cameraReady && !previewUrl && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80">
            <Loader2 className="size-10 animate-spin text-blue-primary" />
          </div>
        )}
      </div>

      {(state === "error" || (state === "scanning" && !cameraReady)) && (
        <div className="flex shrink-0 justify-center">
          <Button size="sm" onClick={onRetryCamera}>
            <Camera className="size-4" />
            إعادة تشغيل الكاميرا
          </Button>
        </div>
      )}
    </>
  );
}
