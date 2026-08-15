import { GAME_CONFIG } from "../config/gameConfig";
export interface UpgradeWallet {
  walletCoins: number;
  harvestSpeedLevel: number;
}
export interface UpgradeResult {
  value: UpgradeWallet;
  purchased: boolean;
}
export function getHarvestIntervalForLevel(level: number): number {
  const safe = Math.max(
    0,
    Math.min(
      GAME_CONFIG.harvestIntervalsByLevel.length - 1,
      Math.floor(Number.isFinite(level) ? level : 0),
    ),
  );
  return (
    GAME_CONFIG.harvestIntervalsByLevel[safe] ??
    GAME_CONFIG.harvestIntervalsByLevel[0]
  );
}
export function getHarvestUpgradeCost(level: number): number | null {
  return (
    GAME_CONFIG.harvestSpeedUpgradeCosts[Math.max(0, Math.floor(level))] ?? null
  );
}
export function purchaseHarvestUpgrade(value: UpgradeWallet): UpgradeResult {
  const cost = getHarvestUpgradeCost(value.harvestSpeedLevel);
  if (cost === null || value.walletCoins < cost)
    return { value, purchased: false };
  return {
    purchased: true,
    value: {
      walletCoins: value.walletCoins - cost,
      harvestSpeedLevel: value.harvestSpeedLevel + 1,
    },
  };
}
