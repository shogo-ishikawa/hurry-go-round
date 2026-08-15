import { describe, expect, it } from "vitest";
import { collectTillCoin } from "./economy";
const economy = {
  walletCoins: 5,
  tillCoins: 3,
  wheatUnitPrice: 2,
  soldUnits: 4,
  customersServed: 4,
};
describe("cash collection", () => {
  it("moves one coin and conserves total coins", () => {
    const after = collectTillCoin(economy);
    expect(after).toMatchObject({ walletCoins: 6, tillCoins: 2 });
    expect(after.walletCoins + after.tillCoins).toBe(8);
  });
  it("supports partial collection", () =>
    expect(collectTillCoin(collectTillCoin(economy)).tillCoins).toBe(1));
  it("does nothing at zero without a negative till", () => {
    const empty = { ...economy, tillCoins: 0 };
    expect(collectTillCoin(empty)).toBe(empty);
  });
});
