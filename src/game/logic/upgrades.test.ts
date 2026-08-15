import { describe, expect, it } from "vitest";
import {
  getHarvestIntervalForLevel,
  getHarvestUpgradeCost,
  purchaseHarvestUpgrade,
} from "./upgrades";
describe("harvest speed upgrade", () => {
  it.each([
    [0, 280],
    [1, 220],
    [2, 170],
  ])("maps level %d to %d ms", (level, interval) =>
    expect(getHarvestIntervalForLevel(level)).toBe(interval),
  );
  it("returns costs and MAX", () => {
    expect(getHarvestUpgradeCost(0)).toBe(20);
    expect(getHarvestUpgradeCost(1)).toBe(55);
    expect(getHarvestUpgradeCost(2)).toBeNull();
  });
  it("refuses insufficient funds", () => {
    const value = { walletCoins: 19, harvestSpeedLevel: 0 };
    expect(purchaseHarvestUpgrade(value)).toEqual({ value, purchased: false });
  });
  it("deducts exact cost and advances once", () =>
    expect(
      purchaseHarvestUpgrade({ walletCoins: 30, harvestSpeedLevel: 0 }),
    ).toEqual({
      value: { walletCoins: 10, harvestSpeedLevel: 1 },
      purchased: true,
    }));
  it("does not exceed or charge at maximum", () => {
    const value = { walletCoins: 99, harvestSpeedLevel: 2 };
    expect(purchaseHarvestUpgrade(value)).toEqual({ value, purchased: false });
  });
});
