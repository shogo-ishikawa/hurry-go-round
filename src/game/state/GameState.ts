import type { Inventory } from "../logic/inventory";
import { GAME_CONFIG } from "../config/gameConfig";
import { emptyResourceAmounts, RESOURCE_MARKET_CAPACITIES, type ResourceAmounts } from "../config/resourceDefinitions";
import type { CarriedInventory } from "../logic/resources";
import type { CarryCapacityLevel } from "../logic/carryUpgrade";
import type { LandExpansionState } from "../logic/landExpansion";
import type { LivestockInventory } from "../logic/livestock";
export interface Economy {
  walletCoins: number;
  tillCoins: number;
  wheatUnitPrice: number;
  soldUnits: number;
  customersServed: number;
}
export interface GameState {
  inventory: Inventory;
  carriedInventory: CarriedInventory;
  barn: ResourceAmounts;
  market: ResourceAmounts;
  marketCapacity: ResourceAmounts;
  soldByResource: ResourceAmounts;
  landExpansion: LandExpansionState;
  livestock: LivestockInventory;
  economy: Economy;
  upgrades: { harvestSpeedLevel: number; carryCapacityLevel: CarryCapacityLevel };
  workers: {
    harvestWorker: { hired: boolean; carried: number; status: string };
    transportWorker: { hired: boolean; carried: number; status: string };
  };
  harvestedTotal: number;
  deliveredOnce: boolean;
  firstSaleCompleted: boolean;
  firstCashCollected: boolean;
  firstUpgradePurchased: boolean;
  firstHarvestWorkerHired: boolean;
  firstFieldCratePickup: boolean;
  firstTransportWorkerHired: boolean;
  firstAutomatedBarnDelivery: boolean;
}
export function createGameState(): GameState {
  return {
    inventory: {
      carried: 0,
      barn: 0,
      market: 0,
      fieldCrate: 0,
      capacity: GAME_CONFIG.carryCapacity,
      marketCapacity: GAME_CONFIG.marketShelfCapacity,
      fieldCrateCapacity: GAME_CONFIG.fieldCrateCapacity,
    },
    carriedInventory: { resource: null, count: 0, capacity: 12 },
    barn: emptyResourceAmounts(),
    market: emptyResourceAmounts(),
    marketCapacity: { ...RESOURCE_MARKET_CAPACITIES },
    soldByResource: emptyResourceAmounts(),
    landExpansion: { eastCornFieldUnlocked: false, southChickenCoopUnlocked: false },
    livestock: { feed: 0, feedCapacity: GAME_CONFIG.chickenFeedCapacity, eggs: 0, eggCapacity: GAME_CONFIG.eggStorageCapacity },
    economy: {
      walletCoins: 0,
      tillCoins: 0,
      wheatUnitPrice: GAME_CONFIG.wheatUnitPrice,
      soldUnits: 0,
      customersServed: 0,
    },
    upgrades: { harvestSpeedLevel: 0, carryCapacityLevel: 0 },
    workers: {
      harvestWorker: { hired: false, carried: 0, status: "未雇用" },
      transportWorker: { hired: false, carried: 0, status: "未雇用" },
    },
    harvestedTotal: 0,
    deliveredOnce: false,
    firstSaleCompleted: false,
    firstCashCollected: false,
    firstUpgradePurchased: false,
    firstHarvestWorkerHired: false,
    firstFieldCratePickup: false,
    firstTransportWorkerHired: false,
    firstAutomatedBarnDelivery: false,
  };
}
export const GAME_EVENTS = {
  state: "game-state-changed",
  full: "capacity-full",
  tutorial: "tutorial-stage",
  wallet: "wallet-pulse",
  hint: "context-hint",
} as const;
