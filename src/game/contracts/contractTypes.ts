import type { ResourceAmounts, ResourceId } from "../config/resourceDefinitions";

export type ContractType = "single" | "mixed" | "priority";
export type ContractStatus = "offered" | "active" | "completed" | "cancelled";

export interface DeliveryContract {
  id: string;
  sequence: number;
  type: ContractType;
  titleKey: string;
  requirements: ResourceAmounts;
  delivered: ResourceAmounts;
  baseRewardCoins: number;
  reputationReward: number;
  targetBonusMs: number | null;
  bonusMultiplier: number;
  elapsedActiveMs: number;
  status: ContractStatus;
}

export interface ContractStatistics {
  contractsCompleted: number;
  contractsCancelled: number;
  offersDeclined: number;
  contractCoinsEarned: number;
  speedBonusesEarned: number;
  bestCompletionMs: number | null;
}

export interface ContractState {
  offers: DeliveryContract[];
  active: DeliveryContract | null;
  generatorSeed: number;
  nextSequence: number;
  reputation: { points: number; level: number };
  statistics: ContractStatistics;
  deliveryCursor: ResourceId | null;
  declineCooldownMs: number;
}

export type ContractCommand = "accept" | "decline" | "cancel" | "deliver" | "complete";
export type ContractFailure = "offer-not-found" | "active-contract-exists" | "no-active-contract" | "no-deliverable-stock" | "contract-incomplete" | "button-debounce";
export interface ContractCommandResult {
  changed: boolean;
  command: ContractCommand;
  message: string;
  reason?: ContractFailure;
  prioritySaveRequested: boolean;
}
