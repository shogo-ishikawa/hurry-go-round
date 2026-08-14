import { describe, expect, it } from 'vitest';
import { harvestOne, unloadOne, type Inventory } from './inventory';

const empty = (): Inventory => ({ carried: 0, barn: 0, capacity: 12 });
describe('inventory', () => {
  it('harvesting adds one', () => expect(harvestOne(empty()).carried).toBe(1));
  it('never exceeds capacity and stops there', () => {
    const full = { carried: 12, barn: 3, capacity: 12 };
    expect(harvestOne(full)).toBe(full);
  });
  it('unloading transfers exactly one and conserves inventory', () => {
    const before = { carried: 4, barn: 7, capacity: 12 };
    const after = unloadOne(before);
    expect(after).toEqual({ carried: 3, barn: 8, capacity: 12 });
    expect(after.carried + after.barn).toBe(before.carried + before.barn);
  });
  it('does nothing when empty', () => { const value = empty(); expect(unloadOne(value)).toBe(value); });
});
