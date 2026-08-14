import { describe, expect, it } from 'vitest';
import {
  clampPointToBounds,
  moveTowardTarget,
  moveWithinBounds,
  normalizeDirection,
} from './movement';

const bounds = { width: 100, height: 100, inset: 12 };

describe('movement', () => {
  it('normalizes diagonal movement so it is not faster', () => {
    const result = normalizeDirection({ x: 1, y: 1 });
    expect(result.x).toBeCloseTo(Math.SQRT1_2);
    expect(result.y).toBeCloseTo(Math.SQRT1_2);
  });

  it('keeps the player inside the map inset', () => {
    expect(moveWithinBounds({ x: 20, y: 50 }, { x: -1, y: 0 }, 50, bounds)).toEqual({ x: 12, y: 50 });
  });

  it('clamps click and tap targets to the playable area', () => {
    expect(clampPointToBounds({ x: -40, y: 160 }, bounds)).toEqual({ x: 12, y: 88 });
  });

  it('moves toward a destination without overshooting it', () => {
    const result = moveTowardTarget({ x: 20, y: 20 }, { x: 60, y: 20 }, 12, bounds);
    expect(result.position).toEqual({ x: 32, y: 20 });
    expect(result.direction).toEqual({ x: 1, y: 0 });
    expect(result.reached).toBe(false);
  });

  it('snaps to a destination when the remaining step is shorter than the frame movement', () => {
    const result = moveTowardTarget({ x: 20, y: 20 }, { x: 26, y: 24 }, 20, bounds, 1);
    expect(result.position).toEqual({ x: 26, y: 24 });
    expect(result.reached).toBe(true);
  });

  it('reports an already reached destination without introducing movement', () => {
    const result = moveTowardTarget({ x: 50, y: 50 }, { x: 54, y: 53 }, 10, bounds, 6);
    expect(result.position).toEqual({ x: 50, y: 50 });
    expect(result.direction).toEqual({ x: 0, y: 0 });
    expect(result.reached).toBe(true);
  });
});
