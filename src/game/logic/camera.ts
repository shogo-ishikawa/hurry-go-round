export function calculateCameraZoom(width: number, height: number): number {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return 1;
  return Math.min(1.55, Math.max(1, Math.min(width / 1100, height / 690)));
}
