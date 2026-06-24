"use client";

import { useCallback, useRef, useState } from "react";

export function useKioskCamera() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraReady, setCameraReady] = useState(false);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraReady(false);
  }, []);

  const attachStreamToVideo = useCallback(async (stream: MediaStream) => {
    streamRef.current = stream;

    for (let attempt = 0; attempt < 30; attempt++) {
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        video.muted = true;
        try {
          await video.play();
        } catch (playError) {
          if (
            playError instanceof DOMException &&
            playError.name === "NotAllowedError"
          ) {
            throw new Error(
              "المتصفح منع تشغيل الكاميرا. اضغط على الصفحة ثم اسمح بالكاميرا"
            );
          }
          throw playError;
        }

        if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
          setCameraReady(true);
          return;
        }

        await new Promise<void>((resolve, reject) => {
          const onReady = () => {
            cleanup();
            setCameraReady(true);
            resolve();
          };
          const onError = () => {
            cleanup();
            reject(new Error("تعذر عرض بث الكاميرا"));
          };
          const cleanup = () => {
            video.removeEventListener("loadeddata", onReady);
            video.removeEventListener("error", onError);
          };
          video.addEventListener("loadeddata", onReady, { once: true });
          video.addEventListener("error", onError, { once: true });
        });
        return;
      }
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }

    throw new Error("تعذر ربط الكاميرا بالواجهة. حدّث الصفحة وحاول مرة أخرى");
  }, []);

  const startCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("المتصفح لا يدعم الكاميرا. استخدم Chrome أو Edge");
    }

    stopCamera();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      await attachStreamToVideo(stream);
    } catch (error) {
      if (error instanceof Error && error.message.includes("تعذر")) {
        throw error;
      }

      const name =
        error instanceof DOMException ? error.name : "UnknownError";
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        throw new Error(
          "تم رفض صلاحية الكاميرا. اضغط على أيقونة القفل في شريط العنوان واسمح بالكاميرا"
        );
      }
      if (name === "NotFoundError" || name === "DevicesNotFoundError") {
        throw new Error("لم يُعثر على كاميرا متصلة بالجهاز");
      }
      if (name === "NotReadableError" || name === "TrackStartError") {
        throw new Error(
          "الكاميرا مستخدمة من برنامج آخر. أغلقه ثم اضغط إعادة المحاولة"
        );
      }
      throw new Error("فشل تشغيل الكاميرا. تأكد أنها غير مستخدمة من برنامج آخر");
    }
  }, [attachStreamToVideo, stopCamera]);

  return {
    videoRef,
    streamRef,
    cameraReady,
    setCameraReady,
    stopCamera,
    startCamera,
  };
}
