const SCAN_DETECT_MAX_WIDTH = 480;

let detectionCanvas: HTMLCanvasElement | null = null;

export function getVideoDetectionCanvas(
  video: HTMLVideoElement
): HTMLCanvasElement | null {
  if (!video.videoWidth || !video.videoHeight) return null;

  if (!detectionCanvas) {
    detectionCanvas = document.createElement("canvas");
  }

  let width = video.videoWidth;
  let height = video.videoHeight;

  if (width > SCAN_DETECT_MAX_WIDTH) {
    const scale = SCAN_DETECT_MAX_WIDTH / width;
    width = SCAN_DETECT_MAX_WIDTH;
    height = Math.round(video.videoHeight * scale);
  }

  detectionCanvas.width = width;
  detectionCanvas.height = height;

  const ctx = detectionCanvas.getContext("2d");
  if (!ctx) return null;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(video, 0, 0, width, height);

  return detectionCanvas;
}
