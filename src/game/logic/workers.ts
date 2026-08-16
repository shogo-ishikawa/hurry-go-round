export interface AutomationInventory {
  carried: number;
  barn: number;
  market: number;
  fieldCrate: number;
  capacity: number;
  marketCapacity: number;
  fieldCrateCapacity: number;
}
export interface WorkerCargo {
  hired: boolean;
  carried: number;
}
export interface AutomationState {
  inventory: AutomationInventory;
  harvestWorker: WorkerCargo;
  transportWorker: WorkerCargo;
}
export interface TransferResult {
  state: AutomationState;
  changed: boolean;
}
const result = (state: AutomationState, changed: boolean): TransferResult => ({
  state,
  changed,
});
export function harvestWorkerCollectOne(
  s: AutomationState,
  max: number,
): TransferResult {
  if (!s.harvestWorker.hired || s.harvestWorker.carried >= max)
    return result(s, false);
  return result(
    {
      ...s,
      harvestWorker: {
        ...s.harvestWorker,
        carried: s.harvestWorker.carried + 1,
      },
    },
    true,
  );
}
export function depositHarvestWorkerCargoOne(
  s: AutomationState,
): TransferResult {
  if (
    s.harvestWorker.carried <= 0 ||
    s.inventory.fieldCrate >= s.inventory.fieldCrateCapacity
  )
    return result(s, false);
  return result(
    {
      ...s,
      inventory: { ...s.inventory, fieldCrate: s.inventory.fieldCrate + 1 },
      harvestWorker: {
        ...s.harvestWorker,
        carried: s.harvestWorker.carried - 1,
      },
    },
    true,
  );
}
export interface BatchDepositResult extends TransferResult { transferred: number; outcome: "deposited"|"partial"|"crate-full"|"empty" }
export function depositHarvestWorkerBatch(s:AutomationState):BatchDepositResult{
 const available=Math.max(0,s.inventory.fieldCrateCapacity-s.inventory.fieldCrate), transferred=Math.min(s.harvestWorker.carried,available);
 if(s.harvestWorker.carried<=0)return{state:s,changed:false,transferred:0,outcome:"empty"};
 if(transferred<=0)return{state:s,changed:false,transferred:0,outcome:"crate-full"};
 return{state:{...s,inventory:{...s.inventory,fieldCrate:s.inventory.fieldCrate+transferred},harvestWorker:{...s.harvestWorker,carried:s.harvestWorker.carried-transferred}},changed:true,transferred,outcome:transferred<s.harvestWorker.carried?"partial":"deposited"};
}
export type ClusterNode={id:string;cluster:"west"|"central";x:number;y:number;ready:boolean};
export const selectWheatFieldCluster=(nodes:readonly ClusterNode[],x:number,y:number,current?:ClusterNode["cluster"]):ClusterNode["cluster"]|null=>{
 const ready=nodes.filter(n=>n.ready);if(!ready.length)return null;if(current&&ready.some(n=>n.cluster===current))return current;
 return ready.reduce((best,n)=>Math.hypot(n.x-x,n.y-y)<Math.hypot(best.x-x,best.y-y)?n:best).cluster;
};
export const selectNextWheatNodeInCluster=(nodes:readonly ClusterNode[],cluster:ClusterNode["cluster"],x:number,y:number)=>nodes.filter(n=>n.ready&&n.cluster===cluster).sort((a,b)=>Math.hypot(a.x-x,a.y-y)-Math.hypot(b.x-x,b.y-y)||a.id.localeCompare(b.id))[0];
export const shouldWheatWorkerReturnToCrate=(cargo:number,capacity:number,readyInCluster:number,emptyElapsedMs:number,graceMs=600)=>cargo>0&&(cargo>=capacity||(readyInCluster===0&&emptyElapsedMs>=graceMs));
export function playerCollectFromFieldCrateOne(
  s: AutomationState,
): TransferResult {
  if (
    s.inventory.fieldCrate <= 0 ||
    s.inventory.carried >= s.inventory.capacity
  )
    return result(s, false);
  return result(
    {
      ...s,
      inventory: {
        ...s.inventory,
        fieldCrate: s.inventory.fieldCrate - 1,
        carried: s.inventory.carried + 1,
      },
    },
    true,
  );
}
export function loadTransportWorkerOne(
  s: AutomationState,
  max: number,
): TransferResult {
  if (
    !s.transportWorker.hired ||
    s.inventory.fieldCrate <= 0 ||
    s.transportWorker.carried >= max
  )
    return result(s, false);
  return result(
    {
      ...s,
      inventory: { ...s.inventory, fieldCrate: s.inventory.fieldCrate - 1 },
      transportWorker: {
        ...s.transportWorker,
        carried: s.transportWorker.carried + 1,
      },
    },
    true,
  );
}
export function unloadTransportWorkerOne(s: AutomationState): TransferResult {
  if (s.transportWorker.carried <= 0) return result(s, false);
  return result(
    {
      ...s,
      inventory: { ...s.inventory, barn: s.inventory.barn + 1 },
      transportWorker: {
        ...s.transportWorker,
        carried: s.transportWorker.carried - 1,
      },
    },
    true,
  );
}
export function getAutomationWheatTotal(s: AutomationState): number {
  return (
    s.inventory.carried +
    s.inventory.barn +
    s.inventory.market +
    s.inventory.fieldCrate +
    s.harvestWorker.carried +
    s.transportWorker.carried
  );
}
export type HarvestAvailability =
  | "not-hired"
  | "seeking-crop"
  | "waiting-for-crops"
  | "returning-to-crate";
export function decideHarvestWorkerAvailability(
  hired: boolean,
  readyCrops: number,
  cargo: number,
  capacity: number,
): HarvestAvailability {
  if (!hired) return "not-hired";
  if (cargo >= capacity || (readyCrops <= 0 && cargo > 0))
    return "returning-to-crate";
  return readyCrops > 0 ? "seeking-crop" : "waiting-for-crops";
}
export type TransportLoadDecision =
  | "idle-at-crate"
  | "loading"
  | "moving-to-barn";
export function decideTransportLoad(
  crate: number,
  cargo: number,
  capacity: number,
): TransportLoadDecision {
  if (cargo >= capacity || (crate <= 0 && cargo > 0)) return "moving-to-barn";
  return crate > 0 ? "loading" : "idle-at-crate";
}
