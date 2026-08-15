import { describe, expect, it } from "vitest";
import { sellWheatToCustomer, type SaleState } from "./market";
const state = (market = 2): SaleState => ({
  inventory: {
    carried: 0,
    barn: 3,
    market,
    fieldCrate: 0,
    capacity: 12,
    marketCapacity: 8,
    fieldCrateCapacity: 16,
  },
  economy: {
    walletCoins: 4,
    tillCoins: 1,
    wheatUnitPrice: 2,
    soldUnits: 0,
    customersServed: 0,
  },
});
describe("sale transaction", () => {
  it("atomically sells one unit at the exact price", () => {
    const before = state();
    const result = sellWheatToCustomer(before, false);
    expect(result.sold).toBe(true);
    expect(result.state.inventory.market).toBe(1);
    expect(result.state.economy).toMatchObject({
      tillCoins: 3,
      soldUnits: 1,
      customersServed: 1,
      walletCoins: 4,
    });
  });
  it("refuses empty stock without negative values", () => {
    const before = state(0);
    const result = sellWheatToCustomer(before, false);
    expect(result).toEqual({ state: before, sold: false });
  });
  it("values one complete load at 24 coins", () => {
    let current = state(12);
    for (let i = 0; i < 12; i += 1)
      current = sellWheatToCustomer(current, false).state;
    expect(current.inventory.market).toBe(0);
    expect(current.economy.tillCoins - state(12).economy.tillCoins).toBe(24);
  });
  it("refuses a duplicate customer purchase", () => {
    const before = state();
    expect(sellWheatToCustomer(before, true)).toEqual({
      state: before,
      sold: false,
    });
  });
});
