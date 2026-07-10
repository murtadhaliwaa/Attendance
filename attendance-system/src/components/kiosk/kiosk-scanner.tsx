"use client";

import {
  CheckCircle2,
  Camera,
  Loader2,
  XCircle,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { KioskMode } from "@/lib/kiosk-types";
import { useKioskPhotoScanner } from "@/hooks/use-kiosk-photo-scanner";
import { KioskResultPanel } from "@/components/kiosk/kiosk-result-panel";
import { KioskScannerHeader } from "@/components/kiosk/kiosk-scanner-header";
import { KioskCameraView } from "@/components/kiosk/kiosk-camera-view";
import { KioskScannerControls } from "@/components/kiosk/kiosk-scanner-controls";
import { cn } from "@/lib/utils";

interface KioskScannerProps {
  mode: KioskMode;
}

export function KioskScanner({ mode }: KioskScannerProps) {
  const scanner = useKioskPhotoScanner(mode);
  const {
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
    handleCapturePreview,
    handleSubmitPhoto,
    handleEmergency,
    toggleEmergency,
    retryCamera,
  } = scanner;

  const accentBorder = isCheckin ? "border-emerald-500/40" : "border-sky-500/40";
  const accentRing = isCheckin ? "border-emerald-500/60" : "border-sky-500/60";
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

  const cardTitle =
    state === "success" && result
      ? result.employeeName
      : state === "processing"
        ? "جاري الإرسال..."
        : labels.action;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden px-3 py-2">
      <KioskScannerHeader
        isCheckin={isCheckin}
        labels={labels}
        currentTime={currentTime}
        accentClockClass={accentClockClass}
        accentActionClass={accentActionClass}
      />

      <Card
        size="sm"
        className={`mx-auto flex min-h-0 w-full max-w-4xl flex-1 flex-col gap-1 py-2 ${accentBorder}`}
      >
        <CardHeader className="shrink-0 gap-0.5 px-3 py-0">
          <CardTitle className="flex items-center justify-center gap-2 text-base font-semibold sm:text-lg">
            {state === "loading" && <Loader2 className="size-5 animate-spin" />}
            {state === "scanning" && <Camera className="size-5 text-blue-primary" />}
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
            {cardTitle}
          </CardTitle>
          <CardDescription className="text-center text-sm font-medium text-text-primary">
            {statusText}
          </CardDescription>
        </CardHeader>

        <CardContent
          className={`flex min-h-0 flex-1 flex-col gap-1.5 px-3 pb-2 ${
            showEmergency ? "overflow-y-auto" : "overflow-hidden"
          }`}
        >
          <div className="flex min-h-0 flex-1 flex-col gap-2 lg:flex-row lg:items-stretch">
            <div className="flex min-h-[min(38vh,240px)] shrink-0 flex-col gap-1.5 lg:min-h-0 lg:min-w-0 lg:flex-1 lg:shrink">
              <KioskCameraView
                videoRef={videoRef}
                state={state}
                cameraReady={cameraReady}
                accentRing={accentRing}
                facingMode={facingMode}
                previewUrl={previewUrl}
                onRetryCamera={retryCamera}
              />
            </div>

            <div className="flex min-h-0 min-w-0 flex-col gap-1.5 overflow-y-auto lg:max-w-md lg:flex-1 lg:shrink-0">
              <KioskScannerControls
                isCheckin={isCheckin}
                accentActionClass={accentActionClass}
                showEmergency={showEmergency}
                emergencyCode={emergencyCode}
                onEmergencyCodeChange={setEmergencyCode}
                emergencyEmployeeId={emergencyEmployeeId}
                onEmergencyEmployeeChange={setEmergencyEmployeeId}
                roster={roster}
                shifts={shifts}
                rosterLoading={rosterLoading}
                selectedEmployeeId={selectedEmployeeId}
                onEmployeeChange={setSelectedEmployeeId}
                selectedShiftId={selectedShiftId}
                onShiftChange={setSelectedShiftId}
                onCapturePreview={handleCapturePreview}
                onSubmitPhoto={handleSubmitPhoto}
                submitting={state === "processing"}
                onToggleEmergency={toggleEmergency}
                onSubmitEmergency={handleEmergency}
              />
            </div>

            {state === "success" && result && (
              <KioskResultPanel result={result} isCheckin={isCheckin} />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
