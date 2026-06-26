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
    <div className="mx-auto mb-2 w-full max-w-4xl shrink-0">
      <div
        dir="ltr"
        className="grid w-full grid-cols-[1fr_auto_1fr] items-center gap-2 py-1 sm:gap-3"
      >
        <div className="flex justify-start">
          {tabletMode ? (
            <KioskTabletExitButton className={accentActionClass} />
          ) : (
            <Link
              href="/kiosk"
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "h-8 shrink-0 px-3 text-sm hover:no-underline",
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
              "truncate rounded-xl border px-4 py-1.5 text-center font-mono text-lg font-bold tracking-wide tabular-nums shadow-sm sm:px-5 sm:py-2 sm:text-xl",
              accentClockClass
            )}
          >
            {currentTime}
          </p>
        </div>

        <div className="flex w-full min-w-0 justify-end">
          <div dir="rtl" className="flex min-w-0 items-center gap-2 sm:gap-2.5">
            <div
              className={`flex size-9 shrink-0 items-center justify-center rounded-lg sm:size-10 ${isCheckin ? "bg-emerald-500/15" : "bg-sky-500/15"}`}
            >
              {isCheckin ? (
                <LogIn className="size-4 text-emerald-300 sm:size-5" />
              ) : (
                <LogOut className="size-4 text-sky-300 sm:size-5" />
              )}
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-base font-bold text-text-primary sm:text-lg">
                {labels.title}
              </h1>
              <p className="truncate text-xs text-text-secondary sm:text-sm">
                {labels.subtitle}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
