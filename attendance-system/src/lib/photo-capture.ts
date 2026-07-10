/** التقاط إطار من عنصر الفيديو كـ data URL (JPEG) */
export function captureVideoFrame(
  video: HTMLVideoElement,
  quality = 0.85
): string | null {
  if (!video.videoWidth || !video.videoHeight) return null;

  const maxWidth = 1280;
  let width = video.videoWidth;
  let height = video.videoHeight;

  if (width > maxWidth) {
    const scale = maxWidth / width;
    width = maxWidth;
    height = Math.round(video.videoHeight * scale);
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.drawImage(video, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", quality);
}
