import { describe, expect, it } from "vitest";
import {
  getCornFieldCrateCapacity,
  getCornFieldExpansionCost,
  getCornFieldHarvestIntervalMultiplier,
  getCornFieldNodeCount,
  normalizeCornFieldLevel,
  purchaseCornFieldExpansion,
} from "./cornFieldExpansion";

describe("corn field expansion", () => {
  it("normalizes old saves without an expansion level", () => {
    expect(normalizeCornFieldLevel(undefined)).toBe(0);
    expect(normalizeCornFieldLevel(99)).toBe(0);
  });

  it("increases field nodes and crate capacity at each level", () => {
    expect([0, 1, 2].map(getCornFieldNodeCount)).toEqual([24, 36, 48]);
    expect([0, 1, 2].map(getCornFieldCrateCapacity)).toEqual([20, 28, 36]);
  });

  it("makes automated harvesting more productive as the field expands", () => {
    expect(getCornFieldHarvestIntervalMultiplier(1)).toBeLessThan(
      getCornFieldHarvestIntervalMultiplier(0),
    );
    expect(getCornFieldHarvestIntervalMultiplier(2)).toBeLessThan(
      getCornFieldHarvestIntervalMultiplier(1),
    );
  });

  it("charges exact expansion costs and stops at the maximum", () => {
    expect(getCornFieldExpansionCost(0)).toBe(220);
    expect(getCornFieldExpansionCost(1)).toBe(520);
    expect(getCornFieldExpansionCost(2)).toBeNull();

    const first = purchaseCornFieldExpansion(800, true, 0);
    expect(first).toEqual({ changed: true, walletCoins: 580, level: 1 });

    const second = purchaseCornFieldExpansion(first.walletCoins, true, first.level);
    expect(second).toEqual({ changed: true, walletCoins: 60, level: 2 });

    expect(purchaseCornFieldExpansion(999, true, 2)).toMatchObject({
      changed: false,
      reason: "maximum-level",
      walletCoins: 999,
      level: 2,
    });
  });

  it("does not charge when land is locked or coins are insufficient", () => {
    expect(purchaseCornFieldExpansion(999, false, 0)).toMatchObject({
      changed: false,
      reason: "land-locked",
      walletCoins: 999,
    });
    expect(purchaseCornFieldExpansion(219, true, 0)).toMatchObject({
      changed: false,
      reason: "insufficient-coins",
      walletCoins: 219,
    });
  });
});
