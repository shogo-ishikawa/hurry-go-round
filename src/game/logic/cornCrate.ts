import type { CarriedCargo } from "./resources";
import { getCarriedTotal } from "./resources";

export function depositCornBatch(crate:number,capacity:number,carried:number){const deposited=Math.min(Math.max(0,capacity-crate),Math.max(0,carried));return{crate:crate+deposited,carried:carried-deposited,deposited,outcome:deposited===0?"crate-full" as const:deposited===carried?"full" as const:"partial" as const};}
export function collectCornFromCrate(cargo:CarriedCargo,crate:number){const amount=Math.min(crate,Math.max(0,cargo.capacity-getCarriedTotal(cargo)));return{cargo:{...cargo,amounts:{...cargo.amounts,corn:cargo.amounts.corn+amount}},crate:crate-amount,collected:amount,reason:amount>0?undefined:crate<=0?"empty" as const:"cargo-full" as const};}
