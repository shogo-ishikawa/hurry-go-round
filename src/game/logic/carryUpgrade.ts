export type CarryCapacityLevel = 0 | 1 | 2;
export const CARRY_CAPACITY_BY_LEVEL = [12, 18, 24] as const;
export const CARRY_UPGRADE_COSTS = [60, 140] as const;

export function getCarryCapacityForLevel(level: CarryCapacityLevel): number { return CARRY_CAPACITY_BY_LEVEL[level]; }
export function getCarryUpgradeCost(level: CarryCapacityLevel): number | null { return level === 0 ? CARRY_UPGRADE_COSTS[0] : level === 1 ? CARRY_UPGRADE_COSTS[1] : null; }
export function purchaseCarryUpgrade(walletCoins: number, level: CarryCapacityLevel):
  { walletCoins: number; level: CarryCapacityLevel; purchased: boolean; reason?: "maximum" | "insufficient-coins" } {
  const cost = getCarryUpgradeCost(level);
  if (cost === null) return { walletCoins, level, purchased: false, reason: "maximum" };
  if (walletCoins < cost) return { walletCoins, level, purchased: false, reason: "insufficient-coins" };
  return { walletCoins: walletCoins - cost, level: (level + 1) as CarryCapacityLevel, purchased: true };
}
