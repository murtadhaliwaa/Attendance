"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { ScanFace } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const FaceCalibrationTool = dynamic(
  () =>
    import("@/components/dashboard/settings/face-calibration-tool").then(
      (module) => module.FaceCalibrationTool
    ),
  { ssr: false }
);

// نحمّل أداة المعايرة (مع محرك الوجه الثقيل) عند الطلب فقط، حتى لا تثقل
// صفحة الإعدادات لكل زيارة.
export function FaceCalibrationSection() {
  const [open, setOpen] = useState(false);

  if (open) return <FaceCalibrationTool />;

  return (
    <Card className="border border-bg-border bg-bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-text-primary">
          <ScanFace className="size-4 text-blue-primary" />
          أداة معايرة التعرف على الوجه (حيّة)
        </CardTitle>
        <p className="mt-1 text-xs text-text-muted">
          اختبر دقة النظام على وجه حقيقي بالكاميرا للتأكد من التعرف على الموظف
          الصحيح وعدم الخلط مع غيره. للقراءة فقط — لا تُعدّل أي بيانات.
        </p>
      </CardHeader>
      <CardContent>
        <Button variant="outline" onClick={() => setOpen(true)}>
          <ScanFace className="size-4" />
          فتح الأداة
        </Button>
      </CardContent>
    </Card>
  );
}
