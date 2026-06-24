const SCAN_DETECT_MAX_WIDTH = 480;

let detectionCanvas: HTMLCanvasElement | null = null;
let detectionCtx: CanvasRenderingContext2D | null = null;

export function getVideoDetectionCanvas(
  video: HTMLVideoElement
): HTMLCanvasElement | null {
  if (!video.videoWidth || !video.videoHeight) return null;

  if (!detectionCanvas) {
    detectionCanvas = document.createElement("canvas");
    detectionCtx = detectionCanvas.getContext("2d", {
      willReadFrequently: true,
    });
  }

  if (!detectionCtx) return null;

  let width = video.videoWidth;
  let height = video.videoHeight;

  if (width > SCAN_DETECT_MAX_WIDTH) {
    const scale = SCAN_DETECT_MAX_WIDTH / width;
    width = SCAN_DETECT_MAX_WIDTH;
    height = Math.round(video.videoHeight * scale);
  }

  detectionCanvas.width = width;
  detectionCanvas.height = height;

  detectionCtx.setTransform(1, 0, 0, 1, 0, 0);
  detectionCtx.clearRect(0, 0, width, height);
  detectionCtx.drawImage(video, 0, 0, width, height);

  return detectionCanvas;
}
