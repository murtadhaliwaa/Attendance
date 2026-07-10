"use client";

import { cn } from "@/lib/utils";

export function PendingReviewsBadge({
  count,
  className,
}: {
  count: number;
  className?: string;
}) {
  if (count <= 0) return null;

  const label = count > 99 ? "99+" : String(count);

  return (
    <span
      className={cn(
        "inline-flex min-w-[1.125rem] items-center justify-center rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-black",
        className
      )}
      aria-label={`${count} طلب بانتظار المراجعة`}
    >
      {label}
    </span>
  );
}
