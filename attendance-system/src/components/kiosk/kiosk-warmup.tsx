"use client";

import { useEffect } from "react";
import { loadScanFaceModels } from "@/lib/face-recognition";

/** تحميل مسبق لنماذج Human (1024-d) */
export function KioskWarmup() {
  useEffect(() => {
    void import("@vladmandic/human").catch(() => {});
    void loadScanFaceModels().catch(() => {});
  }, []);

  return null;
}
