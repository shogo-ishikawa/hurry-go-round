import { describe, expect, it } from 'vitest';
import { getCarryCapacityView } from './carryCapacity';

describe('carry-capacity display', () => {
  it('reports an empty pack and all remaining spaces', () => {
    expect(getCarryCapacityView(0, 12)).toEqual({
      carried: 0,
      capacity: 12,
      remaining: 12,
      ratio: 0,
      level: 'empty',
    });
  });

  it('marks three-quarters full as near-full', () => {
    expect(getCarryCapacityView(9, 12)).toMatchObject({
      carried: 9,
      remaining: 3,
      ratio: 0.75,
      level: 'near-full',
    });
  });

  it('marks an exactly full pack as full', () => {
    expect(getCarryCapacityView(12, 12)).toEqual({
      carried: 12,
      capacity: 12,
      remaining: 0,
      ratio: 1,
      level: 'full',
    });
  });

  it('clamps invalid or excessive values safely', () => {
    expect(getCarryCapacityView(18.9, 12.8)).toMatchObject({
      carried: 12,
      capacity: 12,
      remaining: 0,
      level: 'full',
    });
    expect(getCarryCapacityView(Number.NaN, Number.POSITIVE_INFINITY)).toEqual({
      carried: 0,
      capacity: 0,
      remaining: 0,
      ratio: 0,
      level: 'empty',
    });
  });
});
