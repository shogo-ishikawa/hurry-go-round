import type { ResourceId } from "../config/resourceDefinitions";

export type WorkerRoleId = "wheat-harvester" | "wheat-transporter" | "corn-harvester" | "corn-transporter" | "poultry-caretaker";
export type WorkerLevel = 0 | 1 | 2 | 3;
export type WorkerProgress = { hired: boolean; level: WorkerLevel; carriedResource: ResourceId | null; carriedAmount: number };
export type WorkerPrerequisites = { eastUnlocked: boolean; coopUnlocked: boolean; hiredRoles: ReadonlySet<WorkerRoleId> };
export type WorkerAvailabilityReason = "land-locked" | "prerequisite-worker-missing" | "already-hired" | "insufficient-coins" | "maximum-level" | "not-hired";

export interface WorkerRoleDefinition { id: WorkerRoleId; publicName: string; facilityId: string; hireInteractionId: string; hireCost: number; trainingCosts: readonly [number, number]; capacities: readonly [number, number, number] }
export const WORKER_ROLES: Readonly<Record<WorkerRoleId, WorkerRoleDefinition>> = {
  "wheat-harvester": { id:"wheat-harvester", publicName:"麦の収穫スタッフ", facilityId:"wheat-harvest-hire", hireInteractionId:"hire-wheat-harvester", hireCost:40, trainingCosts:[80,180], capacities:[4,7,10] },
  "wheat-transporter": { id:"wheat-transporter", publicName:"麦の運搬スタッフ", facilityId:"wheat-transport-hire", hireInteractionId:"hire-wheat-transporter", hireCost:75, trainingCosts:[110,240], capacities:[6,8,10] },
  "corn-harvester": { id:"corn-harvester", publicName:"とうもろこし収穫スタッフ", facilityId:"corn-harvest-hire", hireInteractionId:"hire-corn-harvester", hireCost:160, trainingCosts:[220,450], capacities:[5,6,8] },
  "corn-transporter": { id:"corn-transporter", publicName:"とうもろこし運搬スタッフ", facilityId:"corn-transport-hire", hireInteractionId:"hire-corn-transporter", hireCost:240, trainingCosts:[280,560], capacities:[8,10,12] },
  "poultry-caretaker": { id:"poultry-caretaker", publicName:"飼育スタッフ", facilityId:"poultry-caretaker-hire", hireInteractionId:"hire-poultry-caretaker", hireCost:300, trainingCosts:[320,640], capacities:[6,8,10] },
};
export const WORKER_ROLE_IDS = Object.freeze(Object.keys(WORKER_ROLES) as WorkerRoleId[]);
export const createWorkerProgress = (hired=false, resource:ResourceId|null=null, amount=0):WorkerProgress => ({ hired, level:hired?1:0, carriedResource:amount>0?resource:null, carriedAmount:amount });

export function getWorkerAvailability(role:WorkerRoleId, progress:WorkerProgress, prerequisites:WorkerPrerequisites, wallet:number): { available:true } | { available:false; reason:WorkerAvailabilityReason; missingCoins?:number } {
  if (progress.hired) return { available:false, reason:"already-hired" };
  if ((role.startsWith("corn-") && !prerequisites.eastUnlocked) || (role === "poultry-caretaker" && !prerequisites.coopUnlocked)) return { available:false, reason:"land-locked" };
  if ((role === "wheat-transporter" && !prerequisites.hiredRoles.has("wheat-harvester")) || (role === "corn-transporter" && !prerequisites.hiredRoles.has("corn-harvester"))) return { available:false, reason:"prerequisite-worker-missing" };
  const missing = WORKER_ROLES[role].hireCost-wallet;
  return missing > 0 ? { available:false, reason:"insufficient-coins", missingCoins:missing } : { available:true };
}
export function hireWorkerByRole(role:WorkerRoleId, wallet:number, progress:WorkerProgress, prerequisites:WorkerPrerequisites): { changed:boolean; wallet:number; worker:WorkerProgress; reason?:WorkerAvailabilityReason; spawnRequested:boolean; prioritySaveRequested:boolean } {
  const availability=getWorkerAvailability(role,progress,prerequisites,wallet);
  if(!availability.available) return { changed:false,wallet,worker:progress,reason:availability.reason,spawnRequested:false,prioritySaveRequested:false };
  return { changed:true,wallet:wallet-WORKER_ROLES[role].hireCost,worker:{hired:true,level:1,carriedResource:null,carriedAmount:0},spawnRequested:true,prioritySaveRequested:true };
}
export function getWorkerParametersForLevel(role:WorkerRoleId, level:WorkerLevel): { moveSpeedMultiplier:number; operationIntervalMultiplier:number; capacity:number } {
  const move=[0,1,1.15,1.3] as const, interval=[0,1,.85,.7] as const;
  return { moveSpeedMultiplier:move[level], operationIntervalMultiplier:interval[level], capacity:level===0?0:WORKER_ROLES[role].capacities[level-1] };
}
export function getWheatWorkerRuntimeParameters(role:"wheat-harvester"|"wheat-transporter",level:WorkerLevel){
 const p=getWorkerParametersForLevel(role,level);
 if(role==="wheat-harvester")return{capacity:p.capacity,moveSpeed:[0,155,178,202][level],operationIntervalMs:[0,850,650,480][level],retargetIntervalMs:[0,250,190,140][level]};
 return{capacity:p.capacity,moveSpeed:185*p.moveSpeedMultiplier,operationIntervalMs:150*p.operationIntervalMultiplier,retargetIntervalMs:0};
}
export function getWorkerTrainingCost(role:WorkerRoleId, level:WorkerLevel):number|null { return level===1?WORKER_ROLES[role].trainingCosts[0]:level===2?WORKER_ROLES[role].trainingCosts[1]:null; }
export function trainWorker(role:WorkerRoleId,wallet:number,worker:WorkerProgress):{changed:boolean;wallet:number;worker:WorkerProgress;reason?:WorkerAvailabilityReason;prioritySaveRequested:boolean}{
  if(!worker.hired||worker.level===0)return{changed:false,wallet,worker,reason:"not-hired",prioritySaveRequested:false};const cost=getWorkerTrainingCost(role,worker.level);if(cost===null)return{changed:false,wallet,worker,reason:"maximum-level",prioritySaveRequested:false};if(wallet<cost)return{changed:false,wallet,worker,reason:"insufficient-coins",prioritySaveRequested:false};const level=(worker.level+1) as WorkerLevel;return{changed:true,wallet:wallet-cost,worker:{...worker,level,carriedAmount:Math.min(worker.carriedAmount,getWorkerParametersForLevel(role,level).capacity)},prioritySaveRequested:true};
}
export const availabilityText=(reason:WorkerAvailabilityReason,missingCoins=0):string=>({"land-locked":"土地を購入すると利用できます","prerequisite-worker-missing":"先に前提スタッフを雇ってください","already-hired":"雇用済みです","insufficient-coins":`あと ${missingCoins} コイン必要です`,"maximum-level":"最大レベルです","not-hired":"先にスタッフを雇ってください"})[reason];
