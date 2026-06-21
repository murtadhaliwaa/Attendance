"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard error:", error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-20 text-center">
      <AlertTriangle className="size-10 text-amber-200" />
      <div className="space-y-2">
        <h2 className="text-lg font-medium text-text-primary">
          تعذّر تحميل الصفحة
        </h2>
        <p className="text-sm leading-relaxed text-text-muted">
          تحقق من اتصال الإنترنت ثم أعد المحاولة. إذا استمرت المشكلة، قد يكون
          الخادم أو قاعدة البيانات بطيئة مؤقتاً.
        </p>
      </div>
      <Button onClick={reset}>إعادة المحاولة</Button>
    </div>
  );
}
