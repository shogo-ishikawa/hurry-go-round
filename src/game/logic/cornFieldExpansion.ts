export type CornFieldLevel = 0 | 1 | 2;

const NODE_COUNTS = [24, 36, 48] as const;
const CRATE_CAPACITIES = [20, 28, 36] as const;
const EXPANSION_COSTS = [220, 520] as const;
const HARVEST_INTERVAL_MULTIPLIERS = [1, 0.82, 0.68] as const;

export type CornFieldExpansionFailure =
  | "land-locked"
  | "insufficient-coins"
  | "maximum-level";

export interface CornFieldExpansionResult {
  changed: boolean;
  walletCoins: number;
  level: CornFieldLevel;
  reason?: CornFieldExpansionFailure;
}

export function normalizeCornFieldLevel(level: number | undefined): CornFieldLevel {
  if (level === 1 || level === 2) return level;
  return 0;
}

export function getCornFieldNodeCount(level: number | undefined): number {
  return NODE_COUNTS[normalizeCornFieldLevel(level)];
}

export function getCornFieldCrateCapacity(level: number | undefined): number {
  return CRATE_CAPACITIES[normalizeCornFieldLevel(level)];
}

export function getCornFieldExpansionCost(level: number | undefined): number | null {
  const normalized = normalizeCornFieldLevel(level);
  if (normalized === 0) return EXPANSION_COSTS[0];
  if (normalized === 1) return EXPANSION_COSTS[1];
  return null;
}

export function getCornFieldHarvestIntervalMultiplier(level: number | undefined): number {
  return HARVEST_INTERVAL_MULTIPLIERS[normalizeCornFieldLevel(level)];
}

export function purchaseCornFieldExpansion(
  walletCoins: number,
  eastFieldUnlocked: boolean,
  currentLevel: number | undefined,
): CornFieldExpansionResult {
  const level = normalizeCornFieldLevel(currentLevel);
  if (!eastFieldUnlocked) {
    return { changed: false, walletCoins, level, reason: "land-locked" };
  }

  const cost = getCornFieldExpansionCost(level);
  if (cost === null) {
    return { changed: false, walletCoins, level, reason: "maximum-level" };
  }
  if (walletCoins < cost) {
    return { changed: false, walletCoins, level, reason: "insufficient-coins" };
  }

  return {
    changed: true,
    walletCoins: walletCoins - cost,
    level: (level + 1) as CornFieldLevel,
  };
}
