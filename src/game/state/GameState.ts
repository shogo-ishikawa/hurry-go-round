import type { Inventory } from "../logic/inventory";
import { GAME_CONFIG } from "../config/gameConfig";
export interface Economy {
  walletCoins: number;
  tillCoins: number;
  wheatUnitPrice: number;
  soldUnits: number;
  customersServed: number;
}
export interface GameState {
  inventory: Inventory;
  economy: Economy;
  upgrades: { harvestSpeedLevel: number };
  harvestedTotal: number;
  deliveredOnce: boolean;
  firstSaleCompleted: boolean;
  firstCashCollected: boolean;
  firstUpgradePurchased: boolean;
}
export function createGameState(): GameState {
  return {
    inventory: {
      carried: 0,
      barn: 0,
      market: 0,
      capacity: GAME_CONFIG.carryCapacity,
      marketCapacity: GAME_CONFIG.marketShelfCapacity,
    },
    economy: {
      walletCoins: 0,
      tillCoins: 0,
      wheatUnitPrice: GAME_CONFIG.wheatUnitPrice,
      soldUnits: 0,
      customersServed: 0,
    },
    upgrades: { harvestSpeedLevel: 0 },
    harvestedTotal: 0,
    deliveredOnce: false,
    firstSaleCompleted: false,
    firstCashCollected: false,
    firstUpgradePurchased: false,
  };
}
export const GAME_EVENTS = {
  state: "game-state-changed",
  full: "capacity-full",
  tutorial: "tutorial-stage",
  wallet: "wallet-pulse",
} as const;
