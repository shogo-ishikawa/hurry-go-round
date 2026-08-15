import type { GameState } from "../state/GameState";
import type { PersistedCropSnapshot, PersistedGameSnapshot } from "../persistence/saveSchema";

export interface RuntimeSnapshot { player: PersistedGameSnapshot["player"]; crops: PersistedCropSnapshot[]; playTimeMs: number; saveSequence: number; eggRemainingMs?: number }
export function createPersistedSnapshot(state: GameState, runtime: RuntimeSnapshot): PersistedGameSnapshot {
  return {
    player: { ...runtime.player }, cargo: { amounts: { ...state.cargo.amounts }, capacity: state.cargo.capacity },
    storage: { barn: { ...state.barn }, market: { ...state.market }, marketCapacity: { ...state.marketCapacity } },
    economy: { walletCoins: state.economy.walletCoins, tillCoins: state.economy.tillCoins, soldByResource: { ...state.soldByResource }, soldUnits: state.economy.soldUnits, customersServed: state.economy.customersServed, customersLeftWithoutPurchase: state.economy.customersLeftWithoutPurchase ?? 0, contractCoinsEarned: state.economy.contractCoinsEarned ?? 0 },
    landExpansion: { ...state.landExpansion }, livestock: { ...state.livestock, eggRemainingMs: runtime.eggRemainingMs ?? 4500 }, upgrades: { ...state.upgrades },
    workers: { harvestWorker: { hired: state.workers.harvestWorker.hired, level:state.workers.harvestWorker.level, carried: state.workers.harvestWorker.carried }, transportWorker: { hired: state.workers.transportWorker.hired, level:state.workers.transportWorker.level, carried: state.workers.transportWorker.carried }, cornHarvestWorker: { hired: state.workers.cornHarvestWorker.hired, level:state.workers.cornHarvestWorker.level, carried: state.workers.cornHarvestWorker.carried }, cornTransportWorker: { hired: state.workers.cornTransportWorker.hired, level:state.workers.cornTransportWorker.level, carried: state.workers.cornTransportWorker.carried }, poultryCaretaker: { hired: state.workers.poultryCaretaker.hired, level:state.workers.poultryCaretaker.level, resource: state.workers.poultryCaretaker.resource, carried: state.workers.poultryCaretaker.carried } },
    operations:{lastSelectedFacilityId:null,compactAutomationHud:false,completedInteractionTutorials:[]},
    automation: { wheatFieldCrate: state.inventory.fieldCrate, cornFieldCrate: state.automation.cornFieldCrate }, crops: runtime.crops.map(c => ({ ...c })), contracts: structuredClone(state.contracts),
    processing: structuredClone(state.processing),
    collectionNetwork: structuredClone(state.collectionNetwork),
    dairy: structuredClone(state.dairy),
    progression: { deliveredOnce: state.deliveredOnce, firstSaleCompleted: state.firstSaleCompleted, firstCashCollected: state.firstCashCollected, firstUpgradePurchased: state.firstUpgradePurchased, firstHarvestWorkerHired: state.firstHarvestWorkerHired, firstFieldCratePickup: state.firstFieldCratePickup, firstTransportWorkerHired: state.firstTransportWorkerHired, firstAutomatedBarnDelivery: state.firstAutomatedBarnDelivery }, statistics: { harvestedTotal: state.harvestedTotal }, playTimeMs: runtime.playTimeMs, saveSequence: runtime.saveSequence,
  };
}
export function workerRestartTask(worker: keyof PersistedGameSnapshot["workers"], resource: "corn" | "egg" | null, carried: number): string {
  if (carried <= 0) return "idle"; if (worker === "harvestWorker") return "wheat-crate"; if (worker === "transportWorker" || worker === "cornTransportWorker") return "barn"; if (worker === "cornHarvestWorker") return "corn-crate"; return resource === "corn" ? "feed" : "barn";
}
