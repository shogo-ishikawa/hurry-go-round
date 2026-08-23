import type { LandExpansionState } from "./landExpansion";
import type { WheatFieldLevel } from "../config/farmLayout";

const NODE_COUNTS = [30, 42, 54] as const;
const CRATE_CAPACITIES = [16, 24, 32] as const;
const COSTS = [220, 520] as const;
export const getWheatFieldNodeCount = (level: WheatFieldLevel): number => NODE_COUNTS[level];
export const getWheatFieldCrateCapacity = (level: WheatFieldLevel): number => CRATE_CAPACITIES[level];
export const getWheatFieldExpansionCost = (level: WheatFieldLevel): number | null => level === 0 ? COSTS[0] : level === 1 ? COSTS[1] : null;
export function purchaseWheatFieldExpansion(walletCoins:number, land:LandExpansionState) {
  const level=land.wheatFieldLevel ?? 0, cost=getWheatFieldExpansionCost(level);
  if(cost===null)return{purchased:false,walletCoins,land,reason:"maximum-level" as const};
  if(walletCoins<cost)return{purchased:false,walletCoins,land,reason:"insufficient-coins" as const};
  return{purchased:true,walletCoins:walletCoins-cost,land:{...land,wheatFieldLevel:(level+1) as WheatFieldLevel}};
}
