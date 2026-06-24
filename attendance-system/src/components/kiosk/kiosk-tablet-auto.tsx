"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useKioskTabletMode } from "@/hooks/use-kiosk-tablet-mode";

const SCANNER_PATHS = ["/kiosk/checkin", "/kiosk/checkout"];

/** يفعّل ملء الشاشة ومنع النوم تلقائياً على صفحات المسح */
export function KioskTabletAutoActivate() {
  const pathname = usePathname();
  const { enabled, activateSession } = useKioskTabletMode();

  useEffect(() => {
    if (!enabled) return;
    if (!SCANNER_PATHS.includes(pathname)) return;
    void activateSession();
  }, [enabled, pathname, activateSession]);

  return null;
}
