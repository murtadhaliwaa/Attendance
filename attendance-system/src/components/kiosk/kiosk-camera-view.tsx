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
        className={cn(
          "relative w-full shrink-0 overflow-hidden rounded-xl border-2 bg-black",
          // ارتفاع مرن حسب ارتفاع الشاشة الفعلية (هواتف قصيرة/طويلة)
          "h-[clamp(8rem,30svh,16rem)]",
          "min-[400px]:h-[clamp(9rem,34svh,18rem)]",
          "sm:h-[clamp(10rem,36svh,20rem)]",
          "[@media(max-height:700px)]:h-[clamp(7rem,26svh,12rem)]",
          "[@media(max-height:600px)]:h-[clamp(6rem,22svh,10rem)]",
          "lg:aspect-[4/3] lg:h-auto lg:max-h-full lg:min-h-[220px] lg:flex-1",
          accentRing
        )}
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
            <Loader2 className="size-7 animate-spin text-blue-primary sm:size-8" />
            <span className="text-[11px] text-text-secondary sm:text-xs">
              جاري تشغيل الكاميرا...
            </span>
          </div>
        )}
        {state === "scanning" && cameraReady && !previewUrl && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="aspect-square w-[min(52%,11rem)] rounded-full border-2 border-dashed border-blue-primary/60 sm:w-[min(55%,13rem)]" />
          </div>
        )}
        {state === "loading" && !cameraReady && !previewUrl && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80">
            <Loader2 className="size-8 animate-spin text-blue-primary sm:size-10" />
          </div>
        )}
      </div>

      {(state === "error" || (state === "scanning" && !cameraReady)) && (
        <div className="flex shrink-0 justify-center">
          <Button size="sm" className="h-8 text-xs sm:h-9 sm:text-sm" onClick={onRetryCamera}>
            <Camera className="size-3.5 sm:size-4" />
            إعادة تشغيل الكاميرا
          </Button>
        </div>
      )}
    </>
  );
}
