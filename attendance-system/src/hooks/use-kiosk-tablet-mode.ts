"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getFullscreenSupported,
  getWakeLockSupported,
  isFullscreenActive,
  isKioskTabletModeEnabled,
  releaseScreenWakeLock,
  requestFullscreen,
  requestScreenWakeLock,
  setKioskTabletModeEnabled,
} from "@/lib/kiosk-tablet-mode";

export function useKioskTabletMode() {
  const [enabled, setEnabled] = useState(() =>
    typeof window !== "undefined" ? isKioskTabletModeEnabled() : false
  );
  const [fullscreen, setFullscreen] = useState(false);
  const [wakeLock, setWakeLock] = useState(false);
  const [wakeLockSupported] = useState(getWakeLockSupported);
  const [fullscreenSupported] = useState(getFullscreenSupported);

  useEffect(() => {
    setEnabled(isKioskTabletModeEnabled());
    setFullscreen(isFullscreenActive());

    const onFullscreenChange = () => setFullscreen(isFullscreenActive());
    document.addEventListener("fullscreenchange", onFullscreenChange);
    document.addEventListener("webkitfullscreenchange", onFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", onFullscreenChange);
    };
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const reacquireWakeLock = () => {
      if (document.visibilityState === "visible") {
        void requestScreenWakeLock().then(setWakeLock);
      }
    };

    document.addEventListener("visibilitychange", reacquireWakeLock);
    return () => document.removeEventListener("visibilitychange", reacquireWakeLock);
  }, [enabled]);

  const enableTabletMode = useCallback(async () => {
    setKioskTabletModeEnabled(true);
    setEnabled(true);

    const [fs, wl] = await Promise.all([
      requestFullscreen(),
      requestScreenWakeLock(),
    ]);
    setFullscreen(fs || isFullscreenActive());
    setWakeLock(wl);
    return { fullscreen: fs || isFullscreenActive(), wakeLock: wl };
  }, []);

  const disableTabletMode = useCallback(async () => {
    setKioskTabletModeEnabled(false);
    setEnabled(false);
    await releaseScreenWakeLock();
    setWakeLock(false);
  }, []);

  const activateSession = useCallback(async () => {
    if (!isKioskTabletModeEnabled()) return;

    const [fs, wl] = await Promise.all([
      isFullscreenActive() ? Promise.resolve(true) : requestFullscreen(),
      requestScreenWakeLock(),
    ]);
    setFullscreen(fs || isFullscreenActive());
    setWakeLock(wl);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    if (isFullscreenActive()) {
      setFullscreen(true);
      return true;
    }
    const ok = await requestFullscreen();
    setFullscreen(ok || isFullscreenActive());
    return ok || isFullscreenActive();
  }, []);

  const toggleWakeLock = useCallback(async () => {
    const ok = await requestScreenWakeLock();
    setWakeLock(ok);
    return ok;
  }, []);

  return {
    enabled,
    fullscreen,
    wakeLock,
    wakeLockSupported,
    fullscreenSupported,
    enableTabletMode,
    disableTabletMode,
    activateSession,
    toggleFullscreen,
    toggleWakeLock,
  };
}
