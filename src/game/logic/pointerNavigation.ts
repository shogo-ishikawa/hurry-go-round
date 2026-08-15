import type { Point } from "./movement";

export const POINTER_DRAG_THRESHOLD = 14;

export function getContinuousDragDirection(
  start: Point,
  current: Point,
  threshold = POINTER_DRAG_THRESHOLD,
): Point {
  const dx = current.x - start.x;
  const dy = current.y - start.y;
  const distance = Math.hypot(dx, dy);
  const safeThreshold = Number.isFinite(threshold) ? Math.max(0, threshold) : POINTER_DRAG_THRESHOLD;

  if (!Number.isFinite(distance) || distance < safeThreshold || distance === 0) {
    return { x: 0, y: 0 };
  }

  return { x: dx / distance, y: dy / distance };
}

export function isContinuousDrag(direction: Point): boolean {
  return Math.hypot(direction.x, direction.y) > 0.001;
}
