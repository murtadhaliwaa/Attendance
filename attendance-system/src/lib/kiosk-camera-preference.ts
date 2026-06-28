export type CameraFacingMode = "user" | "environment";

export const KIOSK_CAMERA_FACING_KEY = "attendance-kiosk-camera-facing";

export const KIOSK_CAMERA_FACING_CHANGED_EVENT =
  "attendance-kiosk-camera-facing-changed";

export const CAMERA_FACING_OPTIONS: {
  value: CameraFacingMode;
  label: string;
  hint: string;
}[] = [
  {
    value: "user",
    label: "الكاميرا الأمامية",
    hint: "مناسبة عندما ينظر الموظف إلى شاشة التابلت",
  },
  {
    value: "environment",
    label: "الكاميرا الخلفية",
    hint: "أفضل جودة — للتابلت المثبت بحيث تكون الكاميرا الخلفية موجهة للموظف",
  },
];

function isCameraFacingMode(value: string | null): value is CameraFacingMode {
  return value === "user" || value === "environment";
}

export function getKioskCameraFacing(): CameraFacingMode {
  if (typeof window === "undefined") return "user";
  const stored = localStorage.getItem(KIOSK_CAMERA_FACING_KEY);
  return isCameraFacingMode(stored) ? stored : "user";
}

export function setKioskCameraFacing(mode: CameraFacingMode): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KIOSK_CAMERA_FACING_KEY, mode);
  window.dispatchEvent(new CustomEvent(KIOSK_CAMERA_FACING_CHANGED_EVENT));
}

export function buildCameraVideoConstraints(
  facingMode?: CameraFacingMode
): MediaTrackConstraints {
  return {
    facingMode: facingMode ?? getKioskCameraFacing(),
    width: { ideal: 1280 },
    height: { ideal: 720 },
  };
}

export function getCameraFacingLabel(mode: CameraFacingMode): string {
  return (
    CAMERA_FACING_OPTIONS.find((option) => option.value === mode)?.label ??
    "الكاميرا الأمامية"
  );
}

export function getCameraMirrorClass(facingMode: CameraFacingMode): string {
  return facingMode === "user" ? "[transform:scaleX(-1)]" : "";
}
