"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Loader2, ScanFace, ShieldCheck, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { parseJsonResponse } from "@/lib/api-utils";
import {
  averageDescriptors,
  detectFaceForScan,
  loadScanFaceModels,
} from "@/lib/face-recognition";
import { getFaceEngine } from "@/lib/face-engine";
import {
  getFaceMatchThresholds,
  selectBestFaceMatch,
} from "@/lib/face-match-config";

interface CalibrationEmployee {
  id: string;
  name: string;
  employeeCode: string;
  descriptor: number[];
}

interface DistanceRow {
  id: string;
  name: string;
  employeeCode: string;
  distance: number;
}

interface AnalysisResult {
  ranked: DistanceRow[];
  recognizedId: string | null;
  gap: number | null;
  selfDistance: number | null;
}

const CAPTURE_FRAMES = 5;
const CAPTURE_RETRIES = 20;

export function FaceCalibrationTool() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const employeesRef = useRef<CalibrationEmployee[]>([]);

  const [cameraOn, setCameraOn] = useState(false);
  const [starting, setStarting] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [loadedCount, setLoadedCount] = useState(0);
  const [selfId, setSelfId] = useState<string>("");
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const thresholds = getFaceMatchThresholds();

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOn(false);
  }, []);

  useEffect(() => stopCamera, [stopCamera]);

  async function startCamera() {
    setStarting(true);
    setResult(null);
    try {
      const [, res] = await Promise.all([
        loadScanFaceModels(),
        fetch("/api/employees/face-calibration"),
      ]);
      const list = await parseJsonResponse<CalibrationEmployee[]>(res);
      if (!res.ok) {
        throw new Error("فشل تحميل بيانات الموظفين");
      }
      employeesRef.current = list;
      setLoadedCount(list.length);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 640, height: 480 },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setCameraOn(true);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "تعذّر تشغيل الكاميرا"
      );
      stopCamera();
    } finally {
      setStarting(false);
    }
  }

  async function captureAveraged(): Promise<Float32Array | null> {
    const video = videoRef.current;
    if (!video) return null;

    const samples: Float32Array[] = [];
    for (
      let attempt = 0;
      attempt < CAPTURE_RETRIES && samples.length < CAPTURE_FRAMES;
      attempt++
    ) {
      const detection = await detectFaceForScan(video);
      if (detection) samples.push(detection.descriptor);
      await new Promise((r) => setTimeout(r, 150));
    }

    if (samples.length === 0) return null;
    return averageDescriptors(samples);
  }

  async function analyze() {
    setAnalyzing(true);
    setResult(null);
    try {
      const descriptor = await captureAveraged();
      if (!descriptor) {
        toast.error(
          "لم يُكتشف وجه حقيقي. قرّب وجهك من الكاميرا بإضاءة جيدة وأعد المحاولة"
        );
        return;
      }

      const engine = getFaceEngine();
      const expectedSize = descriptor.length;

      const ranked: DistanceRow[] = employeesRef.current
        .filter((e) => e.descriptor.length === expectedSize)
        .map((e) => ({
          id: e.id,
          name: e.name,
          employeeCode: e.employeeCode,
          distance: engine.euclideanDistance(
            descriptor,
            new Float32Array(e.descriptor)
          ),
        }))
        .sort((a, b) => a.distance - b.distance);

      if (ranked.length === 0) {
        toast.error("لا يوجد موظفون مسجّلون للمقارنة");
        return;
      }

      const best = selectBestFaceMatch(
        ranked.map((r) => ({ ...r })),
        "recognize"
      );

      const gap = ranked.length > 1 ? ranked[1].distance - ranked[0].distance : null;
      const selfDistance = selfId
        ? ranked.find((r) => r.id === selfId)?.distance ?? null
        : null;

      setResult({
        ranked: ranked.slice(0, 4),
        recognizedId: best?.id ?? null,
        gap,
        selfDistance,
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "فشل التحليل"
      );
    } finally {
      setAnalyzing(false);
    }
  }

  const recognized = result?.ranked.find((r) => r.id === result.recognizedId);
  const selfRow = selfId
    ? result?.ranked.find((r) => r.id === selfId)
    : undefined;
  // أقرب موظف ليس هو الشخص المُختار (هامش الخلط/القبول الخاطئ)
  const nearestOther = selfId
    ? result?.ranked.find((r) => r.id !== selfId)
    : undefined;

  return (
    <Card className="border border-bg-border bg-bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-text-primary">
          <ScanFace className="size-4 text-blue-primary" />
          أداة معايرة التعرف على الوجه (حيّة)
        </CardTitle>
        <p className="mt-1 text-xs text-text-muted">
          اختبر دقة النظام على وجه حقيقي بالكاميرا: هل يتعرف على الموظف الصحيح،
          وما مدى الفارق عن أقرب موظف آخر. أداة تشخيص فقط — لا تُعدّل أي بيانات.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {!cameraOn ? (
          <Button
            variant="primary"
            onClick={startCamera}
            disabled={starting}
            className="w-full sm:w-auto"
          >
            {starting ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Camera className="size-4" />
            )}
            تشغيل الكاميرا وتحميل البيانات
          </Button>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-text-muted">
              تم تحميل {loadedCount} موظفاً للمقارنة.
            </p>
            <div className="relative mx-auto aspect-[4/3] w-full max-w-sm overflow-hidden rounded-xl border border-bg-border bg-black">
              <video
                ref={videoRef}
                playsInline
                muted
                className="size-full -scale-x-100 object-cover"
              />
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Select
                value={selfId}
                onValueChange={(value) => setSelfId(value ?? "")}
              >
                <SelectTrigger className="w-full sm:w-[240px]">
                  <SelectValue placeholder="من الواقف أمام الكاميرا؟ (اختياري)" />
                </SelectTrigger>
                <SelectContent>
                  {employeesRef.current.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name} ({e.employeeCode})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex gap-2">
                <Button
                  variant="primary"
                  onClick={analyze}
                  disabled={analyzing}
                >
                  {analyzing ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <ScanFace className="size-4" />
                  )}
                  التقاط وتحليل
                </Button>
                <Button variant="outline" onClick={stopCamera}>
                  إيقاف
                </Button>
              </div>
            </div>
          </div>
        )}

        {result && (
          <div className="space-y-3 rounded-xl border border-bg-border bg-bg-elevated p-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              {recognized ? (
                <>
                  <ShieldCheck className="size-4 text-emerald-500" />
                  <span className="text-text-primary">
                    سيتعرف النظام على: {recognized.name}
                  </span>
                </>
              ) : (
                <>
                  <ShieldAlert className="size-4 text-amber-500" />
                  <span className="text-text-primary">
                    لن يتعرف النظام (التطابق بعيد أو ملتبس) — نتيجة آمنة لمنع
                    الخطأ
                  </span>
                </>
              )}
            </div>

            {selfRow && (
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="rounded-lg bg-bg-card p-3">
                  <p className="text-xs text-text-muted">
                    تطابقك أنت ({selfRow.name})
                  </p>
                  <p
                    className={
                      selfRow.distance <= thresholds.match
                        ? "text-lg font-semibold text-emerald-500"
                        : "text-lg font-semibold text-rose-500"
                    }
                    dir="ltr"
                  >
                    {selfRow.distance.toFixed(3)}
                  </p>
                  <p className="text-[11px] text-text-muted">
                    يجب أن يكون أقل من {thresholds.match} (الأقل أفضل)
                  </p>
                </div>
                {nearestOther && (
                  <div className="rounded-lg bg-bg-card p-3">
                    <p className="text-xs text-text-muted">
                      أقرب موظف آخر ({nearestOther.name})
                    </p>
                    <p
                      className={
                        nearestOther.distance > thresholds.match
                          ? "text-lg font-semibold text-emerald-500"
                          : "text-lg font-semibold text-rose-500"
                      }
                      dir="ltr"
                    >
                      {nearestOther.distance.toFixed(3)}
                    </p>
                    <p className="text-[11px] text-text-muted">
                      كلما زاد الفارق عنك، قلّ خطر الخلط
                    </p>
                  </div>
                )}
              </div>
            )}

            <div>
              <p className="mb-1 text-xs text-text-muted">
                أقرب التطابقات (المسافة — الأقل أقوى):
              </p>
              <ul className="space-y-1">
                {result.ranked.map((row, index) => (
                  <li
                    key={row.id}
                    className="flex items-center justify-between rounded-lg bg-bg-card px-3 py-1.5 text-sm"
                  >
                    <span className="text-text-secondary">
                      {index + 1}. {row.name}
                    </span>
                    <span
                      dir="ltr"
                      className={
                        row.distance <= thresholds.match
                          ? "font-mono text-emerald-500"
                          : "font-mono text-text-muted"
                      }
                    >
                      {row.distance.toFixed(3)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {result.gap !== null && (
              <p className="text-xs text-text-muted">
                الفارق بين الأول والثاني:{" "}
                <span dir="ltr" className="font-mono">
                  {result.gap.toFixed(3)}
                </span>{" "}
                — يجب أن يكون ≥ {thresholds.minGap} كي لا يرفض النظام بسبب
                الالتباس.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
