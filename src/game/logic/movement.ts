export interface Point {
  x: number;
  y: number;
}

export interface Bounds {
  width: number;
  height: number;
  inset: number;
}

export interface TargetMovementResult {
  position: Point;
  direction: Point;
  reached: boolean;
}

export function clampPointToBounds(point: Point, bounds: Bounds): Point {
  return {
    x: Math.min(bounds.width - bounds.inset, Math.max(bounds.inset, point.x)),
    y: Math.min(bounds.height - bounds.inset, Math.max(bounds.inset, point.y)),
  };
}

export function normalizeDirection(direction: Point): Point {
  const length = Math.hypot(direction.x, direction.y);
  if (length === 0) return { x: 0, y: 0 };
  return { x: direction.x / length, y: direction.y / length };
}

export function moveWithinBounds(
  position: Point,
  direction: Point,
  distance: number,
  bounds: Bounds,
): Point {
  const normalized = normalizeDirection(direction);
  return clampPointToBounds({
    x: position.x + normalized.x * distance,
    y: position.y + normalized.y * distance,
  }, bounds);
}

export function moveTowardTarget(
  position: Point,
  target: Point,
  maxDistance: number,
  bounds: Bounds,
  arrivalRadius = 8,
): TargetMovementResult {
  const boundedTarget = clampPointToBounds(target, bounds);
  const dx = boundedTarget.x - position.x;
  const dy = boundedTarget.y - position.y;
  const distance = Math.hypot(dx, dy);
  const threshold = Math.max(0, arrivalRadius);

  if (distance <= threshold) {
    return { position: { x: position.x, y: position.y }, direction: { x: 0, y: 0 }, reached: true };
  }

  const direction = { x: dx / distance, y: dy / distance };
  if (!Number.isFinite(maxDistance) || maxDistance <= 0) {
    return { position: { x: position.x, y: position.y }, direction, reached: false };
  }

  const step = Math.min(maxDistance, distance);
  const next = moveWithinBounds(position, direction, step, bounds);
  const remaining = Math.hypot(boundedTarget.x - next.x, boundedTarget.y - next.y);
  const reached = step >= distance || remaining <= threshold;

  return {
    position: reached ? boundedTarget : next,
    direction,
    reached,
  };
}
