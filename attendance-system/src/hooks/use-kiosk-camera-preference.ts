"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getKioskCameraFacing,
  KIOSK_CAMERA_FACING_CHANGED_EVENT,
  setKioskCameraFacing,
  type CameraFacingMode,
} from "@/lib/kiosk-camera-preference";

export function useKioskCameraPreference() {
  const [facingMode, setFacingModeState] = useState<CameraFacingMode>(() =>
    typeof window !== "undefined" ? getKioskCameraFacing() : "user"
  );

  useEffect(() => {
    const sync = () => setFacingModeState(getKioskCameraFacing());
    window.addEventListener(KIOSK_CAMERA_FACING_CHANGED_EVENT, sync);
    return () =>
      window.removeEventListener(KIOSK_CAMERA_FACING_CHANGED_EVENT, sync);
  }, []);

  const setFacingMode = useCallback((mode: CameraFacingMode) => {
    setKioskCameraFacing(mode);
    setFacingModeState(mode);
  }, []);

  return { facingMode, setFacingMode };
}
