export const KIOSK_TABLET_MODE_KEY = "attendance-kiosk-tablet-mode";

export function isKioskTabletModeEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(KIOSK_TABLET_MODE_KEY) === "1";
}

export function setKioskTabletModeEnabled(enabled: boolean): void {
  localStorage.setItem(KIOSK_TABLET_MODE_KEY, enabled ? "1" : "0");
}

export function isFullscreenActive(): boolean {
  if (typeof document === "undefined") return false;
  return !!(
    document.fullscreenElement ||
    (document as Document & { webkitFullscreenElement?: Element })
      .webkitFullscreenElement
  );
}

export async function requestFullscreen(): Promise<boolean> {
  const root = document.documentElement as HTMLElement & {
    webkitRequestFullscreen?: () => Promise<void>;
  };

  try {
    if (root.requestFullscreen) {
      await root.requestFullscreen();
      return true;
    }
    if (root.webkitRequestFullscreen) {
      await root.webkitRequestFullscreen();
      return true;
    }
  } catch {
    return false;
  }
  return false;
}

export async function exitFullscreen(): Promise<void> {
  const doc = document as Document & {
    webkitExitFullscreen?: () => Promise<void>;
  };
  try {
    if (doc.fullscreenElement && doc.exitFullscreen) {
      await doc.exitFullscreen();
    } else if (doc.webkitExitFullscreen) {
      await doc.webkitExitFullscreen();
    }
  } catch {
    // تجاهل — قد يكون المستخدم خرج يدوياً
  }
}

export async function requestScreenWakeLock(): Promise<boolean> {
  if (!("wakeLock" in navigator)) return false;
  try {
    const lock = await navigator.wakeLock.request("screen");
    lock.addEventListener("release", () => {
      if (wakeLockRef === lock) wakeLockRef = null;
    });
    wakeLockRef = lock;
    return true;
  } catch {
    return false;
  }
}

export async function releaseScreenWakeLock(): Promise<void> {
  try {
    await wakeLockRef?.release();
  } catch {
    // no-op
  }
  wakeLockRef = null;
}

let wakeLockRef: WakeLockSentinel | null = null;

export function getWakeLockSupported(): boolean {
  return typeof navigator !== "undefined" && "wakeLock" in navigator;
}

export function getFullscreenSupported(): boolean {
  if (typeof document === "undefined") return false;
  const root = document.documentElement as HTMLElement & {
    webkitRequestFullscreen?: () => Promise<void>;
  };
  return !!(root.requestFullscreen || root.webkitRequestFullscreen);
}
