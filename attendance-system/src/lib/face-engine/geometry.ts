export function getFaceSizeRatio(
  box: { width: number; height: number },
  frameWidth: number,
  frameHeight: number
): number {
  const frameArea = frameWidth * frameHeight;
  if (frameArea === 0) return 0;
  return (box.width * box.height) / frameArea;
}
