"use client";

import { Camera, SwitchCamera } from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useKioskCameraPreference } from "@/hooks/use-kiosk-camera-preference";
import {
  CAMERA_FACING_OPTIONS,
  getCameraFacingLabel,
  type CameraFacingMode,
} from "@/lib/kiosk-camera-preference";
import { cn } from "@/lib/utils";

interface CameraFacingSelectorProps {
  className?: string;
  compact?: boolean;
  onChange?: (mode: CameraFacingMode) => void;
}

export function CameraFacingSelector({
  className,
  compact = false,
  onChange,
}: CameraFacingSelectorProps) {
  const { facingMode, setFacingMode } = useKioskCameraPreference();

  const handleChange = (value: string | null) => {
    if (value !== "user" && value !== "environment") return;
    setFacingMode(value);
    onChange?.(value);
  };

  if (compact) {
    return (
      <Select value={facingMode} onValueChange={handleChange}>
        <SelectTrigger className={cn("h-9 w-full", className)}>
          <div className="flex items-center gap-2">
            <SwitchCamera className="size-4 shrink-0 opacity-70" />
            <SelectValue>{getCameraFacingLabel(facingMode)}</SelectValue>
          </div>
        </SelectTrigger>
        <SelectContent>
          {CAMERA_FACING_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <Label className="flex items-center gap-2 text-sm text-text-secondary">
        <Camera className="size-4" />
        الكاميرا المستخدمة
      </Label>
      <Select value={facingMode} onValueChange={handleChange}>
        <SelectTrigger className="w-full">
          <SelectValue>{getCameraFacingLabel(facingMode)}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {CAMERA_FACING_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              <div className="flex flex-col items-start gap-0.5">
                <span>{option.label}</span>
                <span className="text-xs text-text-muted">{option.hint}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-text-muted">
        {
          CAMERA_FACING_OPTIONS.find((option) => option.value === facingMode)
            ?.hint
        }
      </p>
    </div>
  );
}
