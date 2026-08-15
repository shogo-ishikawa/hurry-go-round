export interface Point {
  x: number;
  y: number;
}

export interface Bounds {
  width: number;
  height: number;
  inset: number;
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
  return {
    x: Math.min(bounds.width - bounds.inset, Math.max(bounds.inset, position.x + normalized.x * distance)),
    y: Math.min(bounds.height - bounds.inset, Math.max(bounds.inset, position.y + normalized.y * distance)),
  };
}
