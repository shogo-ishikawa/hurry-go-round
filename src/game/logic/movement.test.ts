import { describe, expect, it } from 'vitest';
import { moveWithinBounds, normalizeDirection } from './movement';

describe('movement', () => {
  it('normalizes diagonal movement so it is not faster', () => {
    const result = normalizeDirection({ x: 1, y: 1 });
    expect(result.x).toBeCloseTo(Math.SQRT1_2);
    expect(result.y).toBeCloseTo(Math.SQRT1_2);
  });

  it('keeps the player inside the map inset', () => {
    expect(moveWithinBounds({ x: 20, y: 50 }, { x: -1, y: 0 }, 50, {
      width: 100,
      height: 100,
      inset: 12,
    })).toEqual({ x: 12, y: 50 });
  });
});
