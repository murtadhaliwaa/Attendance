"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    async function syncServiceWorker() {
      if (process.env.NODE_ENV !== "production") {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(
          registrations.map((registration) => registration.unregister())
        );
        return;
      }

      await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    }

    syncServiceWorker().catch(() => {
      // تجاهل — PWA اختياري
    });
  }, []);

  return null;
}
