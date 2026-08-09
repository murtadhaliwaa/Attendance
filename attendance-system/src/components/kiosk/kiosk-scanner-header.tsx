"use client";

import Link from "next/link";
import { LogIn, LogOut } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { KioskTabletExitButton } from "@/components/kiosk/kiosk-tablet-exit";
import { useKioskTabletMode } from "@/hooks/use-kiosk-tablet-mode";
import type { KioskModeLabels } from "@/lib/kiosk-types";
import { cn } from "@/lib/utils";

interface KioskScannerHeaderProps {
  isCheckin: boolean;
  labels: KioskModeLabels;
  currentTime: string;
  accentClockClass: string;
  accentActionClass: string;
}

export function KioskScannerHeader({
  isCheckin,
  labels,
  currentTime,
  accentClockClass,
  accentActionClass,
}: KioskScannerHeaderProps) {
  const { enabled: tabletMode } = useKioskTabletMode();

  return (
    <div className="mx-auto mb-0.5 w-full max-w-4xl shrink-0 sm:mb-2 [@media(max-height:700px)]:mb-0">
      <div
        dir="ltr"
        className="grid w-full grid-cols-[1fr_auto_1fr] items-center gap-1 py-0.5 sm:gap-3 sm:py-1"
      >
        <div className="flex justify-start">
          {tabletMode ? (
            <KioskTabletExitButton className={accentActionClass} />
          ) : (
            <Link
              href="/kiosk"
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "h-8 shrink-0 px-2.5 text-xs hover:no-underline sm:px-3 sm:text-sm",
                "[@media(max-height:700px)]:h-7 [@media(max-height:700px)]:px-2",
                accentActionClass
              )}
            >
              الحضور والانصراف
            </Link>
          )}
        </div>

        <div className="flex justify-center">
          <p
            dir="ltr"
            className={cn(
              "truncate rounded-lg border px-2.5 py-1 text-center font-mono text-sm font-bold tracking-wide tabular-nums shadow-sm sm:rounded-xl sm:px-5 sm:py-2 sm:text-xl",
              "[@media(max-height:700px)]:px-2 [@media(max-height:700px)]:py-0.5 [@media(max-height:700px)]:text-sm",
              accentClockClass
            )}
          >
            {currentTime}
          </p>
        </div>

        <div className="flex w-full min-w-0 justify-end">
          <div dir="rtl" className="flex min-w-0 items-center gap-1.5 sm:gap-2.5">
            <div
              className={`flex size-8 shrink-0 items-center justify-center rounded-lg sm:size-10 [@media(max-height:700px)]:size-7 ${isCheckin ? "bg-emerald-500/15" : "bg-sky-500/15"}`}
            >
              {isCheckin ? (
                <LogIn className="size-3.5 text-emerald-300 sm:size-5" />
              ) : (
                <LogOut className="size-3.5 text-sky-300 sm:size-5" />
              )}
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-xs font-bold text-text-primary sm:text-lg [@media(max-height:700px)]:text-[11px]">
                {labels.title}
              </h1>
              <p className="hidden truncate text-xs text-text-secondary sm:block sm:text-sm">
                {labels.subtitle}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
