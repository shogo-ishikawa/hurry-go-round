import type { Inventory } from "../logic/inventory";
import { GAME_CONFIG } from "../config/gameConfig";
import {
  emptyResourceAmounts,
  RESOURCE_MARKET_CAPACITIES,
  type ResourceAmounts,
} from "../config/resourceDefinitions";
import { createCarriedCargo, type CarriedCargo } from "../logic/resources";
import type { CarryCapacityLevel } from "../logic/carryUpgrade";
import type { LandExpansionState } from "../logic/landExpansion";
import type { LivestockInventory } from "../logic/livestock";
import { createContractState } from "../logic/contracts";
import type { ContractState } from "../contracts/contractTypes";
import { createMachine, type ProcessingLandState, type ProcessingMachineState } from "../logic/processing";
import type { ProcessingWorkerState } from "../logic/processingWorkers";
import type { RoutingPolicyId } from "../logic/processingRouting";
import { createCollectionNetwork, type CollectionNetwork } from "../logic/collectionNetwork";
import { createDairyState, type DairyState } from "../logic/dairy";
import { getWheatFieldCrateCapacity } from "../logic/wheatFieldExpansion";

export interface Economy {
  walletCoins: number;
  tillCoins: number;
  wheatUnitPrice: number;
  soldUnits: number;
  customersServed: number;
  customersLeftWithoutPurchase?: number;
  contractCoinsEarned?: number;
}

export interface GameState {
  inventory: Inventory;
  cargo: CarriedCargo;
  barn: ResourceAmounts;
  market: ResourceAmounts;
  marketCapacity: ResourceAmounts;
  soldByResource: ResourceAmounts;
  landExpansion: LandExpansionState;
  livestock: LivestockInventory;
  coopLevel: 0|1|2|3;
  economy: Economy;
  upgrades: {
    harvestSpeedLevel: number;
    carryCapacityLevel: CarryCapacityLevel;
  };
  workers: {
    harvestWorker: {
      hired: boolean;
      level: 0 | 1 | 2 | 3;
      carried: number;
      status: string;
    };
    transportWorker: {
      hired: boolean;
      level: 0 | 1 | 2 | 3;
      carried: number;
      status: string;
    };
    cornHarvestWorker: {
      hired: boolean;
      level: 0 | 1 | 2 | 3;
      carried: number;
      status: string;
    };
    cornTransportWorker: {
      hired: boolean;
      level: 0 | 1 | 2 | 3;
      carried: number;
      status: string;
    };
    poultryCaretaker: {
      hired: boolean;
      level: 0 | 1 | 2 | 3;
      resource: "corn" | "egg" | null;
      carried: number;
      status: string;
    };
  };
  automation: {
    cornFieldCrate: number;
    cornFieldCrateCapacity: number;
  };
  contracts: ContractState;
  processing: {
    land: ProcessingLandState;
    mill: ProcessingMachineState;
    bakery: ProcessingMachineState;
    millOperator: ProcessingWorkerState;
    baker: ProcessingWorkerState;
    routingPolicy: RoutingPolicyId;
    rawReserves: { wheat:number; corn:number; egg:number };
    autoSelectionRoundRobin: { mill:number; bakery:number };
  };
  collectionNetwork: CollectionNetwork;
  dairy: DairyState;
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
      fieldCrateCapacity: getWheatFieldCrateCapacity(0),
    },
    cargo: createCarriedCargo(GAME_CONFIG.carryCapacity),
    barn: emptyResourceAmounts(),
    market: emptyResourceAmounts(),
    marketCapacity: { ...RESOURCE_MARKET_CAPACITIES },
    soldByResource: emptyResourceAmounts(),
    landExpansion: {
      wheatFieldLevel: 0,
      eastCornFieldUnlocked: false,
      southChickenCoopUnlocked: false,
      cornFieldLevel: 0,
    },
    livestock: {
      feed: 0,
      feedCapacity: GAME_CONFIG.chickenFeedCapacity,
      eggs: 0,
      eggCapacity: GAME_CONFIG.eggStorageCapacity,
    },
    coopLevel: 0,
    economy: {
      walletCoins: 0,
      tillCoins: 0,
      wheatUnitPrice: GAME_CONFIG.wheatUnitPrice,
      soldUnits: 0,
      customersServed: 0,
      customersLeftWithoutPurchase: 0,
      contractCoinsEarned: 0,
    },
    upgrades: { harvestSpeedLevel: 0, carryCapacityLevel: 0 },
    workers: {
      harvestWorker: {
        hired: false,
        level: 0,
        carried: 0,
        status: "未雇用",
      },
      transportWorker: {
        hired: false,
        level: 0,
        carried: 0,
        status: "未雇用",
      },
      cornHarvestWorker: {
        hired: false,
        level: 0,
        carried: 0,
        status: "未雇用",
      },
      cornTransportWorker: {
        hired: false,
        level: 0,
        carried: 0,
        status: "未雇用",
      },
      poultryCaretaker: {
        hired: false,
        level: 0,
        resource: null,
        carried: 0,
        status: "未雇用",
      },
    },
    automation: {
      cornFieldCrate: 0,
      cornFieldCrateCapacity: GAME_CONFIG.cornFieldCrateCapacity,
    },
    contracts: createContractState(),
    processing: {
      land:{yardUnlocked:false,millBuilt:false,bakeryBuilt:false}, mill:createMachine("grain-mill"), bakery:createMachine("bakery"),
      millOperator:{hired:false,level:0,carriedResource:null,carriedAmount:0,publicStatus:"未雇用"}, baker:{hired:false,level:0,carriedResource:null,carriedAmount:0,publicStatus:"未雇用"},
      routingPolicy:"balanced", rawReserves:{wheat:8,corn:10,egg:4}, autoSelectionRoundRobin:{mill:0,bakery:0},
    },
    collectionNetwork:createCollectionNetwork(),
    dairy:createDairyState(),
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
  contractRange: "contract-range",
  contractOpen: "contract-open",
  contractAction: "contract-action",
  contractResult: "contract-command-result",
  operationsRange: "operations-range",
  operationsOpen: "operations-open",
  operationsAction: "operations-action",
  processingRange: "processing-range",
  processingOpen: "processing-open",
  processingAction: "processing-action",
  collectionRange: "collection-range",
  collectionOpen: "collection-open",
  collectionAction: "collection-action",
  collectionResult: "collection-command-result",
  dirty: "persistent-state-dirty",
} as const;
