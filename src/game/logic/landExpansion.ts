import type { CornFieldLevel } from "./cornFieldExpansion";

export type LandExpansionId = "eastCornField" | "southChickenCoop";

export interface LandExpansionState {
  eastCornFieldUnlocked: boolean;
  southChickenCoopUnlocked: boolean;
  /**
   * Additional corn-field expansion beyond the initial 24 plants.
   * Optional for backward compatibility with v0.8.0 schema-2 saves.
   */
  cornFieldLevel?: CornFieldLevel;
}

const COSTS: Record<LandExpansionId, number> = {
  eastCornField: 120,
  southChickenCoop: 240,
};

export function getLandExpansionCost(id: LandExpansionId): number {
  return COSTS[id];
}

export function canPurchaseLandExpansion(
  id: LandExpansionId,
  walletCoins: number,
  land: LandExpansionState,
): {
  allowed: boolean;
  reason?: "purchased" | "prerequisite" | "insufficient-coins";
} {
  if (
    (id === "eastCornField" && land.eastCornFieldUnlocked) ||
    (id === "southChickenCoop" && land.southChickenCoopUnlocked)
  ) {
    return { allowed: false, reason: "purchased" };
  }
  if (id === "southChickenCoop" && !land.eastCornFieldUnlocked) {
    return { allowed: false, reason: "prerequisite" };
  }
  if (walletCoins < COSTS[id]) {
    return { allowed: false, reason: "insufficient-coins" };
  }
  return { allowed: true };
}

export function purchaseLandExpansion(
  id: LandExpansionId,
  walletCoins: number,
  land: LandExpansionState,
): {
  walletCoins: number;
  land: LandExpansionState;
  purchased: boolean;
  reason?: "purchased" | "prerequisite" | "insufficient-coins";
} {
  const check = canPurchaseLandExpansion(id, walletCoins, land);
  if (!check.allowed) {
    return {
      walletCoins,
      land,
      purchased: false,
      reason: check.reason,
    };
  }

  if (id === "eastCornField") {
    return {
      walletCoins: walletCoins - COSTS[id],
      land: {
        ...land,
        eastCornFieldUnlocked: true,
        cornFieldLevel: land.cornFieldLevel ?? 0,
      },
      purchased: true,
    };
  }

  return {
    walletCoins: walletCoins - COSTS[id],
    land: { ...land, southChickenCoopUnlocked: true },
    purchased: true,
  };
}
