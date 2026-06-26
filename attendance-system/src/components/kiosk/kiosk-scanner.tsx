"use client";

import {
  CheckCircle2,
  Loader2,
  ScanFace,
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
import { useKioskScanner } from "@/hooks/use-kiosk-scanner";
import { KioskResultPanel } from "@/components/kiosk/kiosk-result-panel";
import { KioskScannerHeader } from "@/components/kiosk/kiosk-scanner-header";
import { KioskCameraView } from "@/components/kiosk/kiosk-camera-view";
import { KioskScannerControls } from "@/components/kiosk/kiosk-scanner-controls";
import { cn } from "@/lib/utils";

interface KioskScannerProps {
  mode: KioskMode;
}

export function KioskScanner({ mode }: KioskScannerProps) {
  const scanner = useKioskScanner(mode);
  const {
    isCheckin,
    labels,
    videoRef,
    cameraReady,
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

  const statusDescriptionClass = cn(
    "text-center text-sm font-medium sm:text-base",
    scanPhase === "unknown" ? "line-clamp-3" : "line-clamp-2",
    result?.action === "already_checkin" && "font-semibold text-emerald-200",
    result?.action === "already_done" && "font-semibold text-sky-200",
    result?.action === "no_checkin" && "font-semibold text-amber-200",
    !isBlockedStatus &&
      (scanPhase === "matching" || state === "verifying") &&
      (isCheckin ? "text-emerald-200" : "text-sky-200"),
    !isBlockedStatus && scanPhase === "unknown" && "font-medium text-amber-200",
    !isBlockedStatus &&
      scanPhase !== "matching" &&
      scanPhase !== "unknown" &&
      state !== "verifying" &&
      "text-text-primary"
  );

  const cardTitle =
    state === "success" && result
      ? recognizedName ?? "تم التعرف"
      : state === "verifying"
        ? recognizedName
          ? `جاري التعرف على ${recognizedName}...`
          : "جاري التعرف..."
        : scanPhase === "unknown"
          ? "لم يتم التعرف على الوجه"
          : showEnroll
            ? "تسجيل موظف جديد"
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
            {cardTitle}
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
              <KioskCameraView
                videoRef={videoRef}
                state={state}
                scanPhase={scanPhase}
                cameraReady={cameraReady}
                verifyProgress={verifyProgress}
                accentRing={accentRing}
                onRetryCamera={retryCamera}
              />

              <KioskScannerControls
                isCheckin={isCheckin}
                accentActionClass={accentActionClass}
                showEmergency={showEmergency}
                emergencyCode={emergencyCode}
                onEmergencyCodeChange={setEmergencyCode}
                emergencyEmployeeId={emergencyEmployeeId}
                onEmergencyEmployeeChange={setEmergencyEmployeeId}
                roster={roster}
                rosterLoading={rosterLoading}
                onToggleEmergency={toggleEmergency}
                onSubmitEmergency={handleEmergency}
                showEnroll={showEnroll}
                enrollName={enrollName}
                onEnrollNameChange={setEnrollName}
                onOpenEnroll={openEnroll}
                onSubmitEnroll={handleEnroll}
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
