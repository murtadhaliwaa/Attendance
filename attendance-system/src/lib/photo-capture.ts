/**
 * التقاط إطار من عنصر الفيديو كـ data URL (JPEG).
 * يستخدم toBlob غير المتزامن حتى لا تتجمّد الواجهة على الأجهزة الضعيفة.
 */
export async function captureVideoFrame(
  video: HTMLVideoElement,
  // 960 بكسل تكفي لمراجعة بشرية وتقلّل حجم الرفع إلى أقل من النصف
  { quality = 0.72, maxWidth = 960 }: { quality?: number; maxWidth?: number } = {}
): Promise<string | null> {
  if (!video.videoWidth || !video.videoHeight) return null;

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

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/jpeg", quality);
  });
  if (!blob) return canvas.toDataURL("image/jpeg", quality);

  return new Promise<string | null>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(blob);
  });
}
