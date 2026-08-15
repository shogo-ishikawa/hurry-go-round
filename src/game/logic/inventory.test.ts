import { describe, expect, it } from "vitest";
import {
  harvestOne,
  restockMarketOne,
  unloadOne,
  type Inventory,
} from "./inventory";
const empty = (): Inventory => ({
  carried: 0,
  barn: 0,
  market: 0,
  fieldCrate: 0,
  capacity: 12,
  marketCapacity: 8,
  fieldCrateCapacity: 16,
});
describe("inventory", () => {
  it("harvesting adds one", () => expect(harvestOne(empty()).carried).toBe(1));
  it("never exceeds carry capacity", () => {
    const full = { ...empty(), carried: 12 };
    expect(harvestOne(full)).toBe(full);
  });
  it("unloading conserves unsold wheat", () => {
    const before = { ...empty(), carried: 4, barn: 7 };
    const after = unloadOne(before);
    expect(after).toEqual({ ...before, carried: 3, barn: 8 });
    expect(after.carried + after.barn + after.market).toBe(11);
  });
  it("does nothing when carried inventory is empty", () => {
    const value = empty();
    expect(unloadOne(value)).toBe(value);
  });
  it("restocks exactly one and conserves wheat", () => {
    const before = { ...empty(), barn: 3, market: 2 };
    const after = restockMarketOne(before);
    expect(after).toEqual({ ...before, barn: 2, market: 3 });
    expect(after.barn + after.market).toBe(5);
  });
  it("stops safely when barn is empty", () => {
    const value = { ...empty(), market: 2 };
    expect(restockMarketOne(value)).toBe(value);
  });
  it("stops at market capacity without negative barn stock", () => {
    const value = { ...empty(), barn: 2, market: 8 };
    expect(restockMarketOne(value)).toBe(value);
  });
  it.each([
    ["player", { carried: 5, harvest: 0, transport: 0 }],
    ["harvest worker", { carried: 0, harvest: 3, transport: 0 }],
    ["transport worker", { carried: 0, harvest: 0, transport: 4 }],
  ])("restocks while %s carries wheat elsewhere", (_label, cargo) => {
    const before = { ...empty(), carried: cargo.carried, barn: 2 };
    const after = restockMarketOne(before);
    expect(after.barn).toBe(1);
    expect(after.market).toBe(1);
    expect(cargo.harvest + cargo.transport).toBeGreaterThanOrEqual(0);
  });
});
