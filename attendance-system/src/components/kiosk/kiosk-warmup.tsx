"use client";

import { useEffect } from "react";
import { loadScanFaceModels } from "@/lib/face-recognition";

/** يبدأ تحميل نماذج الوجه مبكراً عند دخول قسم الحضور والانصراف */
export function KioskWarmup() {
  useEffect(() => {
    void import("face-api.js").catch(() => {});
    void loadScanFaceModels().catch(() => {});
  }, []);

  return null;
}
