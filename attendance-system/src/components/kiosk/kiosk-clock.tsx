"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

function formatNow() {
  return new Date().toLocaleTimeString("ar-SA", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

/**
 * ساعة معزولة بحالتها الخاصة حتى لا تُعيد رسم قائمة الموظفين كل ثانية.
 */
export function KioskClock({ className }: { className?: string }) {
  const [time, setTime] = useState("");

  useEffect(() => {
    setTime(formatNow());
    const id = setInterval(() => setTime(formatNow()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <p
      dir="ltr"
      suppressHydrationWarning
      className={cn(
        "truncate rounded-lg border px-2.5 py-1 text-center font-mono text-sm font-bold tracking-wide tabular-nums shadow-sm sm:rounded-xl sm:px-5 sm:py-2 sm:text-xl",
        "[@media(max-height:700px)]:px-2 [@media(max-height:700px)]:py-0.5 [@media(max-height:700px)]:text-sm",
        className
      )}
    >
      {time}
    </p>
  );
}
