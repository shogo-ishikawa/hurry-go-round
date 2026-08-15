import type { ResourceAmounts } from "../config/resourceDefinitions";
import type { ContractState } from "../contracts/contractTypes";
import type { ProcessingLandState, ProcessingMachineState } from "../logic/processing";
import type { ProcessingWorkerState } from "../logic/processingWorkers";
import type { RoutingPolicyId } from "../logic/processingRouting";
import type { CollectionNetwork } from "../logic/collectionNetwork";

export const SAVE_FORMAT = "hurry-go-round-save" as const;
export const SAVE_SCHEMA_VERSION = 4 as const;
export const GAME_VERSION = "0.9.1";

export interface PersistedSettings {
  textScale: 1 | 1.15 | 1.3;
  reducedMotion: boolean;
  joystickScale: 0.85 | 1 | 1.15;
  joystickOpacity: 0.45 | 0.65 | 0.85;
  contextualHints: boolean;
}

export const DEFAULT_SETTINGS: PersistedSettings = {
  textScale: 1,
  reducedMotion: false,
  joystickScale: 1,
  joystickOpacity: 0.65,
  contextualHints: true,
};

export interface PersistedCropSnapshot {
  id: string;
  resource: "wheat" | "corn";
  state: "ready" | "growing" | "harvested";
  remainingMs: number;
}

export interface PersistedGameSnapshot {
  player: {
    x: number;
    y: number;
    facing: "front" | "back" | "left" | "right";
  };
  cargo: { amounts: ResourceAmounts; capacity: number };
  storage: {
    barn: ResourceAmounts;
    market: ResourceAmounts;
    marketCapacity: ResourceAmounts;
  };
  economy: {
    walletCoins: number;
    tillCoins: number;
    soldByResource: ResourceAmounts;
    soldUnits: number;
    customersServed: number;
    customersLeftWithoutPurchase: number;
    contractCoinsEarned: number;
  };
  landExpansion: {
    eastCornFieldUnlocked: boolean;
    southChickenCoopUnlocked: boolean;
    /** Optional so existing schema-2 v0.8.0 saves remain valid. */
    cornFieldLevel?: 0 | 1 | 2;
  };
  livestock: {
    feed: number;
    feedCapacity: number;
    eggs: number;
    eggCapacity: number;
    eggRemainingMs: number;
  };
  upgrades: {
    harvestSpeedLevel: number;
    carryCapacityLevel: 0 | 1 | 2;
  };
  workers: {
    harvestWorker: {
      hired: boolean;
      level: 0 | 1 | 2 | 3;
      carried: number;
    };
    transportWorker: {
      hired: boolean;
      level: 0 | 1 | 2 | 3;
      carried: number;
    };
    cornHarvestWorker: {
      hired: boolean;
      level: 0 | 1 | 2 | 3;
      carried: number;
    };
    cornTransportWorker: {
      hired: boolean;
      level: 0 | 1 | 2 | 3;
      carried: number;
    };
    poultryCaretaker: {
      hired: boolean;
      level: 0 | 1 | 2 | 3;
      resource: "corn" | "egg" | null;
      carried: number;
    };
  };
  operations: {
    lastSelectedFacilityId: string | null;
    compactAutomationHud: boolean;
    completedInteractionTutorials: string[];
  };
  automation: {
    wheatFieldCrate: number;
    cornFieldCrate: number;
  };
  crops: PersistedCropSnapshot[];
  contracts: ContractState;
  processing: { land:ProcessingLandState; mill:ProcessingMachineState; bakery:ProcessingMachineState; millOperator:ProcessingWorkerState; baker:ProcessingWorkerState; routingPolicy:RoutingPolicyId; rawReserves:{wheat:number;corn:number;egg:number}; autoSelectionRoundRobin:{mill:number;bakery:number} };
  collectionNetwork: CollectionNetwork;
  progression: Record<string, boolean>;
  statistics: { harvestedTotal: number };
  playTimeMs: number;
  saveSequence: number;
}

export interface SaveEnvelope {
  format: typeof SAVE_FORMAT;
  schemaVersion: typeof SAVE_SCHEMA_VERSION;
  gameVersion: string;
  saveId: string;
  createdAt: string;
  updatedAt: string;
  checksumAlgorithm: "SHA-256";
  checksum: string;
  payload: PersistedGameSnapshot;
}
