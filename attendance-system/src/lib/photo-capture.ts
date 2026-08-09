/**
 * التقاط إطار من عنصر الفيديو كـ JPEG.
 * يُفضَّل Blob للرفع (بدون تضخم base64)، مع data URL اختياري للمعاينة.
 */

export type CaptureFrameOptions = {
  quality?: number;
  maxWidth?: number;
};

export type CapturedFrame = {
  blob: Blob;
  /** معاينة محلية خفيفة عبر Object URL — يجب إلغاؤها بـ URL.revokeObjectURL */
  previewUrl: string;
};

function scaleDimensions(
  video: HTMLVideoElement,
  maxWidth: number
): { width: number; height: number } {
  let width = video.videoWidth;
  let height = video.videoHeight;
  if (width > maxWidth) {
    const scale = maxWidth / width;
    width = maxWidth;
    height = Math.round(video.videoHeight * scale);
  }
  return { width, height };
}

async function drawFrameToBlob(
  video: HTMLVideoElement,
  { quality = 0.72, maxWidth = 960 }: CaptureFrameOptions
): Promise<Blob | null> {
  if (!video.videoWidth || !video.videoHeight) return null;

  const { width, height } = scaleDimensions(video, maxWidth);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.drawImage(video, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/jpeg", quality);
  });
  if (blob) return blob;

  // احتياطي نادر إن رفض المتصفح toBlob
  const dataUrl = canvas.toDataURL("image/jpeg", quality);
  const res = await fetch(dataUrl);
  return res.blob();
}

/** للكشك: Blob جاهز للرفع الثنائي + معاينة محلية */
export async function captureVideoFrameBlob(
  video: HTMLVideoElement,
  options?: CaptureFrameOptions
): Promise<CapturedFrame | null> {
  const blob = await drawFrameToBlob(video, options ?? {});
  if (!blob) return null;
  return { blob, previewUrl: URL.createObjectURL(blob) };
}

/**
 * للوحات الإدارة (صورة مرجعية): data URL كما في السابق.
 * @deprecated للكشك استخدم captureVideoFrameBlob
 */
export async function captureVideoFrame(
  video: HTMLVideoElement,
  options?: CaptureFrameOptions
): Promise<string | null> {
  const blob = await drawFrameToBlob(video, options ?? {});
  if (!blob) return null;

  return new Promise<string | null>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(blob);
  });
}
