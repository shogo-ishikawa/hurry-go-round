import { RESOURCE_IDS, RESOURCE_DEFINITIONS, getNonZeroResources, type ResourceAmounts, type ResourceId } from "../config/resourceDefinitions";
import type { GameState } from "../state/GameState";
import { getCarriedTotal } from "./resources";

export interface ResourceRow { id:ResourceId; name:string; amount:number; color:number; iconId:string; capacity?:number }
export interface ProductionResourceRow extends ResourceRow { location:string; stage:"input"|"reserved"|"output" }
export interface InventoryLocationViewModel { carried:ResourceRow[]; barn:ResourceRow[]; market:ResourceRow[]; production:ProductionResourceRow[]; farmBuffers:ResourceRow[]; totals:{carried:number;barn:number;market:number;marketCapacity:number} }
const rows=(amounts:ResourceAmounts,capacity?:ResourceAmounts):ResourceRow[]=>getNonZeroResources(amounts).map(({id,amount,definition})=>({id,name:definition.publicName,amount,color:definition.color,iconId:definition.iconId,capacity:capacity?.[id]}));
const total=(amounts:ResourceAmounts)=>RESOURCE_IDS.reduce((sum,id)=>sum+amounts[id],0);
export function createInventoryViewModel(state:GameState):InventoryLocationViewModel{
 const production:ProductionResourceRow[]=[];
 for(const [machineName,machine] of [["製粉機",state.processing.mill],["ベーカリー",state.processing.bakery]] as const){
  for(const row of rows(machine.input.amounts))production.push({...row,location:machineName,stage:"input"});
  if(machine.activeCycle)for(const row of rows(machine.activeCycle.reservedInputs))production.push({...row,location:machineName,stage:"reserved"});
  for(const row of rows(machine.output.amounts))production.push({...row,location:machineName,stage:"output"});
 }
 const dairyInput={...state.barn,milk:state.dairy.workshopInput};for(const id of RESOURCE_IDS)if(id!=="milk")dairyInput[id]=0;
 const dairyOutput={...state.barn,butter:state.dairy.workshopOutput.butter,cheese:state.dairy.workshopOutput.cheese};for(const id of RESOURCE_IDS)if(id!=="butter"&&id!=="cheese")dairyOutput[id]=0;
 for(const row of rows(dairyInput))production.push({...row,location:"乳製品工房",stage:"input"});
 if(state.dairy.cycle)production.push({id:"milk",name:RESOURCE_DEFINITIONS.milk.publicName,amount:state.dairy.cycle.reservedMilk,color:RESOURCE_DEFINITIONS.milk.color,iconId:"milk",location:"乳製品工房",stage:"reserved"});
 for(const row of rows(dairyOutput))production.push({...row,location:"乳製品工房",stage:"output"});
 const buffers:ResourceAmounts={...state.collectionNetwork.processingIntake.amounts};
 buffers.wheat+=state.inventory.fieldCrate+state.collectionNetwork.boxes.wheat.amounts.wheat;
 buffers.corn+=state.automation.cornFieldCrate+state.collectionNetwork.boxes.corn.amounts.corn;
 buffers.egg+=state.livestock.eggs+state.collectionNetwork.boxes.egg.amounts.egg;
 buffers.hay+=state.dairy.hayRack;buffers.milk+=state.dairy.milkTank;
 const vm={carried:rows(state.cargo.amounts),barn:rows(state.barn),market:rows(state.market,state.marketCapacity),production,farmBuffers:rows(buffers),totals:{carried:getCarriedTotal(state.cargo),barn:total(state.barn),market:total(state.market),marketCapacity:total(state.marketCapacity)}};
 if(vm.carried.reduce((n,r)=>n+r.amount,0)!==vm.totals.carried||vm.barn.reduce((n,r)=>n+r.amount,0)!==vm.totals.barn)throw new Error("Inventory view total invariant failed");
 return vm;
}
export function compactResourceRows(rows:readonly ResourceRow[],maxRows:number):{visible:readonly ResourceRow[];overflow:number;displayedSum:number}{const count=Math.max(0,Math.floor(maxRows)),visible=rows.slice(0,count);return{visible,overflow:Math.max(0,rows.length-visible.length),displayedSum:rows.reduce((n,row)=>n+row.amount,0)};}
export const formatCompactRows=(rows:readonly ResourceRow[],maxRows:number)=>{const compact=compactResourceRows(rows,maxRows);return[...compact.visible.map(r=>`${r.name} ${r.amount}`),...(compact.overflow?[`ほか ${compact.overflow}種類`]:[])];};
