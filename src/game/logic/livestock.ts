import type { CarriedCargo } from "./resources";
import { addCargoOne, removeCargoOne } from "./resources";

export interface LivestockInventory { feed: number; feedCapacity: number; eggs: number; eggCapacity: number; }
export type CoopLevel = 0|1|2|3;
export const COOP_LEVELS = [{chickens:0,eggBatch:0,feedCapacity:12,eggCapacity:12,cost:null},{chickens:3,eggBatch:1,feedCapacity:12,eggCapacity:12,cost:420},{chickens:5,eggBatch:2,feedCapacity:18,eggCapacity:18,cost:900},{chickens:7,eggBatch:3,feedCapacity:24,eggCapacity:24,cost:null}] as const;
export const getCoopParameters=(level:CoopLevel)=>COOP_LEVELS[level];
export function upgradeCoop(wallet:number,level:CoopLevel,livestock:LivestockInventory){const cost=COOP_LEVELS[level].cost;if(level===0)return{changed:false,wallet,level,livestock,reason:"locked" as const};if(cost===null)return{changed:false,wallet,level,livestock,reason:"maximum-level" as const};if(wallet<cost)return{changed:false,wallet,level,livestock,reason:"insufficient-coins" as const};const next=(level+1) as CoopLevel,p=COOP_LEVELS[next];return{changed:true,wallet:wallet-cost,level:next,livestock:{...livestock,feedCapacity:p.feedCapacity,eggCapacity:p.eggCapacity}};}

export function depositCornFeedOne(carried: CarriedCargo, livestock: LivestockInventory) {
  if (carried.amounts.corn <= 0) return { carried, livestock, changed: false, reason: "corn-required" as const };
  if (livestock.feed >= livestock.feedCapacity) return { carried, livestock, changed: false, reason: "full" as const };
  const removed = removeCargoOne(carried, "corn");
  return { carried: removed.cargo, livestock: { ...livestock, feed: livestock.feed + 1 }, changed: true };
}

export function produceEggOne(livestock: LivestockInventory) {
  if (livestock.feed <= 0) return { livestock, changed: false, reason: "no-feed" as const };
  if (livestock.eggs >= livestock.eggCapacity) return { livestock, changed: false, reason: "full" as const };
  return { livestock: { ...livestock, feed: livestock.feed - 1, eggs: livestock.eggs + 1 }, changed: true };
}

export function produceEggBatch(livestock:LivestockInventory,configuredBatch:number){const produced=Math.min(Math.max(0,Math.floor(configuredBatch)),livestock.feed,Math.max(0,livestock.eggCapacity-livestock.eggs));return produced===0?{livestock,changed:false,produced,reason:livestock.feed<=0?"no-feed" as const:"full" as const}:{livestock:{...livestock,feed:livestock.feed-produced,eggs:livestock.eggs+produced},changed:true,produced};}

export const getPoultryTargets=(level:CoopLevel)=>({feedTarget:[0,10,15,20][level]!,emergencyThreshold:[0,3,5,7][level]!});

export function collectEggOne(carried: CarriedCargo, livestock: LivestockInventory) {
  if (livestock.eggs <= 0) return { carried, livestock, changed: false, reason: "empty" as const };
  const result = addCargoOne(carried, "egg");
  if (!result.changed) return { carried, livestock, changed: false, reason: result.reason };
  return { carried: result.cargo, livestock: { ...livestock, eggs: livestock.eggs - 1 }, changed: true };
}
