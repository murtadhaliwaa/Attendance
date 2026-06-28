"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  CheckCircle2,
  LogIn,
  LogOut,
  MonitorSmartphone,
  Moon,
  Maximize2,
  AlertCircle,
  Camera,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useKioskTabletMode } from "@/hooks/use-kiosk-tablet-mode";
import { CameraFacingSelector } from "@/components/kiosk/camera-facing-selector";
import { useKioskCameraPreference } from "@/hooks/use-kiosk-camera-preference";
import { getCameraFacingLabel } from "@/lib/kiosk-camera-preference";
import { cn } from "@/lib/utils";

export function KioskTabletSetup() {
  const router = useRouter();
  const {
    enabled,
    fullscreen,
    wakeLock,
    wakeLockSupported,
    fullscreenSupported,
    enableTabletMode,
    disableTabletMode,
    toggleFullscreen,
    toggleWakeLock,
  } = useKioskTabletMode();
  const { facingMode } = useKioskCameraPreference();
  const [activating, setActivating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleEnable = async () => {
    setActivating(true);
    setMessage(null);
    const result = await enableTabletMode();
    setActivating(false);

    const hints: string[] = [];
    if (!result.fullscreen && fullscreenSupported) {
      hints.push("لم يُفعَّل ملء الشاشة — اضغط الزر أدناه أو من قائمة المتصفح");
    }
    if (!result.wakeLock && wakeLockSupported) {
      hints.push("لم يُفعَّل إبقاء الشاشة — جرّب مرة أخرى بعد لمس الشاشة");
    }
    if (!wakeLockSupported) {
      hints.push(
        "المتصفح لا يدعم إبقاء الشاشة — عطّل قفل الشاشة من إعدادات التابلت"
      );
    }
    setMessage(
      hints.length > 0
        ? hints.join(" · ")
        : "تم تفعيل وضع الكشك. افتح صفحة الحضور أو الانصراف"
    );
  };

  const handleDisable = async () => {
    await disableTabletMode();
    setMessage("تم إيقاف وضع الكشك");
  };

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-4 p-4">
      <div className="text-center">
        <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-2xl bg-blue-primary/15 text-blue-primary">
          <MonitorSmartphone className="size-7" />
        </div>
        <h1 className="text-2xl font-bold text-text-primary">
          إعداد كشك التابلت
        </h1>
        <p className="mt-2 text-sm text-text-secondary">
          لـ Samsung Galaxy Tab A9 — ملء الشاشة وإبقاؤها مضاءة أثناء الدوام
        </p>
      </div>

      <Card className="border-bg-border bg-bg-card">
        <CardHeader>
          <CardTitle className="text-base">خطوات التثبيت (مرة واحدة)</CardTitle>
          <CardDescription>
            نفّذها على التابلت قبل تسليمه للموظفين
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-text-secondary">
          <p>1. افتح هذا الرابط في Chrome أو Samsung Internet</p>
          <p>2. من القائمة: «إضافة إلى الشاشة الرئيسية»</p>
          <p>3. اضغط «تفعيل وضع الكشك» أدناه</p>
          <p>4. افتح التطبيق من الشاشة الرئيسية → الحضور أو الانصراف</p>
        </CardContent>
      </Card>

      <Card className="border-bg-border bg-bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Camera className="size-4" />
            الكاميرا
          </CardTitle>
          <CardDescription>
            اختر الأمامية أو الخلفية حسب طريقة تثبيت التابلت
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <CameraFacingSelector />
          <p className="rounded-lg border border-blue-500/25 bg-blue-500/10 px-3 py-2 text-xs text-blue-100">
            بعد تغيير الكاميرا، أعد تسجيل بصمات الوجوه من نفس الجهاز والكاميرا
            المختارة.
          </p>
          <StatusRow
            ok
            label="الاختيار الحالي"
            detail={getCameraFacingLabel(facingMode)}
          />
        </CardContent>
      </Card>

      <Card className="border-bg-border bg-bg-card">
        <CardHeader>
          <CardTitle className="text-base">الحالة</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <StatusRow
            ok={enabled}
            label="وضع الكشك"
            detail={enabled ? "مُفعَّل" : "غير مُفعَّل"}
          />
          <StatusRow
            ok={fullscreen}
            label="ملء الشاشة"
            detail={fullscreen ? "نشط" : "غير نشط"}
          />
          <StatusRow
            ok={wakeLock}
            label="إبقاء الشاشة مضاءة"
            detail={
              wakeLock
                ? "نشط"
                : wakeLockSupported
                  ? "غير نشط"
                  : "غير مدعوم في المتصفح"
            }
          />

          {message && (
            <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
              {message}
            </p>
          )}

          <div className="flex flex-col gap-2 pt-1">
            {!enabled ? (
              <Button
                className="w-full"
                disabled={activating}
                onClick={() => void handleEnable()}
              >
                {activating ? "جاري التفعيل..." : "تفعيل وضع الكشك"}
              </Button>
            ) : (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => void handleDisable()}
              >
                إيقاف وضع الكشك
              </Button>
            )}

            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={!fullscreenSupported}
                onClick={() => void toggleFullscreen()}
              >
                <Maximize2 className="ml-1 size-4" />
                ملء الشاشة
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!wakeLockSupported}
                onClick={() => void toggleWakeLock()}
              >
                <Moon className="ml-1 size-4" />
                إبقاء الشاشة
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {enabled && (
        <div className="grid gap-2 sm:grid-cols-2">
          <Button
            className="h-12 bg-emerald-600 hover:bg-emerald-500"
            onClick={() => router.push("/kiosk/checkin")}
          >
            <LogIn className="ml-2 size-5" />
            فتح الحضور
          </Button>
          <Button
            className="h-12 bg-sky-600 hover:bg-sky-500"
            onClick={() => router.push("/kiosk/checkout")}
          >
            <LogOut className="ml-2 size-5" />
            فتح الانصراف
          </Button>
        </div>
      )}

      <p className="text-center text-xs text-text-muted">
        <Link href="/kiosk" className="underline hover:text-text-secondary">
          العودة لصفحة الحضور والانصراف
        </Link>
      </p>
    </div>
  );
}

function StatusRow({
  ok,
  label,
  detail,
}: {
  ok: boolean;
  label: string;
  detail: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <span className="text-text-secondary">{label}</span>
      <span
        className={cn(
          "flex items-center gap-1 font-medium",
          ok ? "text-emerald-300" : "text-text-muted"
        )}
      >
        {ok ? (
          <CheckCircle2 className="size-4" />
        ) : (
          <AlertCircle className="size-4" />
        )}
        {detail}
      </span>
    </div>
  );
}
