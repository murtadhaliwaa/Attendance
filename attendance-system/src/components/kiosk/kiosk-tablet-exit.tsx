"use client";

import Link from "next/link";
import { Settings2 } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { useKioskTabletMode } from "@/hooks/use-kiosk-tablet-mode";
import { cn } from "@/lib/utils";

/** زر خروج مخفي من وضع الكشك — للمسؤول فقط */
export function KioskTabletExitButton({ className }: { className?: string }) {
  const { enabled } = useKioskTabletMode();

  if (!enabled) return null;

  return (
    <Link
      href="/kiosk/setup"
      title="إعداد الكشك"
      className={cn(
        buttonVariants({ variant: "ghost", size: "icon" }),
        "size-8 opacity-40 hover:opacity-100",
        className
      )}
    >
      <Settings2 className="size-4" />
    </Link>
  );
}
