"use client";

import { useEffect, useMemo, useState } from "react";
import { Clock3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatTimeLabel, isValidTimeValue, minutesToTime } from "@/lib/schedule-utils";
import { parseTimeToMinutes } from "@/lib/time-utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectionCard } from "@/components/dashboard/selection-card";

function splitTimeValue(time: string) {
  const [hours = "", minutes = ""] = time.split(":");
  return { hours, minutes };
}

function normalizeTimePart(value: string, max: number) {
  const digits = value.replace(/\D/g, "").slice(0, 2);
  if (!digits) return "";

  // احتفظ برقم واحد أثناء الكتابة (مثل 0 قبل 7 لتصبح 07)
  if (digits.length === 1) return digits;

  const parsed = Math.min(max, Math.max(0, Number(digits)));
  return String(parsed).padStart(2, "0");
}

function buildSuggestedTimes(shiftEndTime: string) {
  const endMinutes = parseTimeToMinutes(shiftEndTime);
  const offsets = [30, 60, 90];

  return offsets
    .map((offset) => minutesToTime(endMinutes + offset))
    .filter((time) => time !== shiftEndTime);
}

interface CustomEndTimePickerProps {
  shiftEndTime: string;
  value: string;
  onChange: (value: string) => void;
}

export function CustomEndTimePicker({
  shiftEndTime,
  value,
  onChange,
}: CustomEndTimePickerProps) {
  const [mode, setMode] = useState<"default" | "custom">(
    value ? "custom" : "default"
  );
  const [hour, setHour] = useState("");
  const [minute, setMinute] = useState("");
  const [error, setError] = useState("");

  const suggestions = useMemo(
    () => buildSuggestedTimes(shiftEndTime),
    [shiftEndTime]
  );

  useEffect(() => {
    setMode(value ? "custom" : "default");
    if (value) {
      const parts = splitTimeValue(value);
      setHour(parts.hours);
      setMinute(parts.minutes);
    } else {
      setHour("");
      setMinute("");
    }
    setError("");
  }, [shiftEndTime, value]);

  function selectDefault() {
    setMode("default");
    setHour("");
    setMinute("");
    setError("");
    onChange("");
  }

  function applyTime(time: string) {
    const parts = splitTimeValue(time);
    setMode("custom");
    setHour(parts.hours);
    setMinute(parts.minutes);
    setError("");
    onChange(time);
  }

  function openCustomMode() {
    setMode("custom");
    if (!value) {
      setHour("");
      setMinute("");
      setError("");
    }
  }

  function commitManualTime(nextHour: string, nextMinute: string) {
    if (!nextHour || !nextMinute) {
      setError(
        nextHour || nextMinute ? "أكمل إدخال الساعة والدقيقة" : ""
      );
      return;
    }

    const normalized = `${nextHour.padStart(2, "0")}:${nextMinute.padStart(2, "0")}`;

    if (!isValidTimeValue(normalized)) {
      setError("أدخل ساعة (0–23) ودقيقة (0–59) صحيحة");
      return;
    }

    setError("");
    onChange(normalized);
  }

  function handleHourChange(raw: string) {
    const nextHour = normalizeTimePart(raw, 23);
    setHour(nextHour);
    commitManualTime(nextHour, minute);
  }

  function handleMinuteChange(raw: string) {
    const nextMinute = normalizeTimePart(raw, 59);
    setMinute(nextMinute);
    commitManualTime(hour, nextMinute);
  }

  function handleHourBlur() {
    if (hour !== "") setHour(hour.padStart(2, "0"));
  }

  function handleMinuteBlur() {
    if (minute !== "") setMinute(minute.padStart(2, "0"));
  }

  const previewTime =
    hour !== "" && minute !== "" && !error
      ? `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`
      : null;

  return (
    <div className="space-y-3 rounded-xl border border-bg-border bg-bg-card/60 p-3.5">
      <div className="flex items-start gap-2.5">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-bg-elevated text-text-secondary">
          <Clock3 className="size-4" />
        </div>
        <div className="space-y-0.5">
          <Label className="text-sm text-text-primary">وقت الانصراف</Label>
          <p className="text-xs leading-relaxed text-text-muted">
            اختر وقت الشفت الافتراضي، أو أدخل وقتاً مخصصاً يدوياً.
          </p>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <SelectionCard
          title="وقت الشفت الافتراضي"
          subtitle={formatTimeLabel(shiftEndTime)}
          selected={mode === "default"}
          onClick={selectDefault}
        />
        <SelectionCard
          title="وقت مخصص"
          subtitle={
            mode === "custom" && previewTime
              ? formatTimeLabel(previewTime)
              : "أدخل الوقت بنفسك"
          }
          selected={mode === "custom"}
          onClick={openCustomMode}
        />
      </div>

      {mode === "custom" && (
        <div className="space-y-3 rounded-lg border border-bg-border bg-bg-elevated/40 p-3">
          <div className="space-y-2">
            <Label htmlFor="custom-end-hour">أدخل وقت الانصراف</Label>
            <div className="flex items-center gap-2" dir="ltr">
              <div className="flex-1 space-y-1">
                <span className="text-xs text-text-muted">ساعة</span>
                <Input
                  id="custom-end-hour"
                  inputMode="numeric"
                  dir="ltr"
                  placeholder="16"
                  value={hour}
                  onChange={(e) => handleHourChange(e.target.value)}
                  onBlur={handleHourBlur}
                  aria-invalid={!!error}
                  className="text-center tabular-nums"
                />
              </div>
              <span className="mt-5 text-lg text-text-muted">:</span>
              <div className="flex-1 space-y-1">
                <span className="text-xs text-text-muted">دقيقة</span>
                <Input
                  id="custom-end-minute"
                  inputMode="numeric"
                  dir="ltr"
                  placeholder="00"
                  value={minute}
                  onChange={(e) => handleMinuteChange(e.target.value)}
                  onBlur={handleMinuteBlur}
                  aria-invalid={!!error}
                  className="text-center tabular-nums"
                />
              </div>
            </div>
            {error ? (
              <p className="text-xs text-rose-300">{error}</p>
            ) : previewTime ? (
              <p className="text-xs text-text-muted">
                المعاينة:{" "}
                <span className="font-medium text-text-primary">
                  {formatTimeLabel(previewTime)}
                </span>
              </p>
            ) : (
              <p className="text-xs text-text-muted">
                مثال: ساعة 16 ودقيقة 00 = 4:00 م
              </p>
            )}
          </div>

          {suggestions.length > 0 && (
            <div className="space-y-2 border-t border-bg-border pt-3">
              <p className="text-xs font-medium text-text-secondary">
                اقتراحات سريعة
              </p>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((time) => (
                  <button
                    key={time}
                    type="button"
                    onClick={() => applyTime(time)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs transition-all",
                      value === time
                        ? "border-blue-primary bg-blue-primary text-white"
                        : "border-bg-border bg-bg-card text-text-secondary hover:border-blue-primary/40 hover:bg-bg-elevated"
                    )}
                  >
                    {formatTimeLabel(time)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
