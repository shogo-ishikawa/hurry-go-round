import { RESOURCE_IDS, RESOURCE_DEFINITIONS, type ResourceId } from "../config/resourceDefinitions";
import type { GameState } from "../state/GameState";

export interface InventoryLedgerRow {
  resource: ResourceId; name: string; iconId: string; color: number;
  carried: number; barn: number; market: number;
  wheatFieldCrate: number; cornFieldCrate: number; eggStorage: number; hayRack: number; milkTank: number;
  collectionBoxes: number; courierCargo: number; processingIntake: number;
  machineInput: number; machineReserved: number; machineOutput: number; processingWorkerCargo: number;
  dairyInput: number; dairyReserved: number; dairyOutput: number; dairyWorkerCargo: number;
  availableForContract: number; totalOnFarm: number;
}
export interface InventoryLedgerViewModel {
  rows: InventoryLedgerRow[]; carriedTotal: number; carriedCapacity: number; barnTotal: number;
  marketTotal: number; marketCapacity: number; farmBufferTotal: number; productionTotal: number; totalOnFarm: number;
}
export type LedgerLocation = Exclude<keyof InventoryLedgerRow,"resource"|"name"|"iconId"|"color"|"availableForContract"|"totalOnFarm">;
export const LEDGER_LOCATIONS: readonly LedgerLocation[]=["carried","barn","market","wheatFieldCrate","cornFieldCrate","eggStorage","hayRack","milkTank","collectionBoxes","courierCargo","processingIntake","machineInput","machineReserved","machineOutput","processingWorkerCargo","dairyInput","dairyReserved","dairyOutput","dairyWorkerCargo"];
const sum=(values:readonly number[])=>values.reduce((total,value)=>total+value,0);
let productionInvariantReported=false;
const amount=(resource:ResourceId,worker:{carriedResource:ResourceId|null;carriedAmount:number})=>worker.carriedResource===resource?worker.carriedAmount:0;
const dairyAmount=(resource:ResourceId,worker:{carried:ResourceId|null;amount:number})=>worker.carried===resource?worker.amount:0;

/** The only player-facing extraction of inventory locations. Each owned unit appears in exactly one column. */
export function createInventoryLedger(state:GameState):InventoryLedgerViewModel {
  const rows=RESOURCE_IDS.map((resource):InventoryLedgerRow=>{
    const mill=state.processing.mill,bakery=state.processing.bakery,dairy=state.dairy;
    const locations:Record<LedgerLocation,number>={
      carried:state.cargo.amounts[resource],barn:state.barn[resource],market:state.market[resource],
      wheatFieldCrate:resource==="wheat"?state.inventory.fieldCrate:0,
      cornFieldCrate:resource==="corn"?state.automation.cornFieldCrate:0,
      eggStorage:resource==="egg"?state.livestock.eggs:0,hayRack:resource==="hay"?dairy.hayRack:0,milkTank:resource==="milk"?dairy.milkTank:0,
      collectionBoxes:state.collectionNetwork.boxes.wheat.amounts[resource]+state.collectionNetwork.boxes.corn.amounts[resource]+state.collectionNetwork.boxes.egg.amounts[resource],
      courierCargo:state.collectionNetwork.courier.carried[resource],processingIntake:state.collectionNetwork.processingIntake.amounts[resource],
      machineInput:mill.input.amounts[resource]+bakery.input.amounts[resource],
      machineReserved:(mill.activeCycle?.reservedInputs[resource]??0)+(bakery.activeCycle?.reservedInputs[resource]??0),
      machineOutput:mill.output.amounts[resource]+bakery.output.amounts[resource],
      processingWorkerCargo:amount(resource,state.processing.millOperator)+amount(resource,state.processing.baker),
      dairyInput:resource==="milk"?dairy.workshopInput:0,dairyReserved:resource==="milk"?(dairy.cycle?.reservedMilk??0):0,
      dairyOutput:resource==="butter"?dairy.workshopOutput.butter:resource==="cheese"?dairy.workshopOutput.cheese:0,
      dairyWorkerCargo:dairyAmount(resource,dairy.dairyWorker)+dairyAmount(resource,dairy.workshopWorker),
    };
    const definition=RESOURCE_DEFINITIONS[resource];
    return {resource,name:definition.publicName,iconId:definition.iconId,color:definition.color,...locations,
      availableForContract:locations.carried+locations.barn,totalOnFarm:sum(LEDGER_LOCATIONS.map(key=>locations[key]))};
  });
  const total=(key:LedgerLocation)=>sum(rows.map(row=>row[key]));
  const vm={rows,carriedTotal:total("carried"),carriedCapacity:state.cargo.capacity,barnTotal:total("barn"),marketTotal:total("market"),
    marketCapacity:sum(RESOURCE_IDS.map(id=>state.marketCapacity[id])),
    farmBufferTotal:sum(rows.map(row=>sum([row.wheatFieldCrate,row.cornFieldCrate,row.eggStorage,row.hayRack,row.milkTank,row.collectionBoxes,row.courierCargo,row.processingIntake]))),
    productionTotal:sum(rows.map(row=>sum([row.machineInput,row.machineReserved,row.machineOutput,row.processingWorkerCargo,row.dairyInput,row.dairyReserved,row.dairyOutput,row.dairyWorkerCargo]))),
    totalOnFarm:sum(rows.map(row=>row.totalOnFarm))};
  const errors=validateInventoryLedger(vm,state);
  if(errors.length){const message=`Inventory ledger invariant failed: ${errors.join("; ")}`;if(import.meta.env.DEV||import.meta.env.VITE_E2E==="1")throw new Error(message);if(!productionInvariantReported){productionInvariantReported=true;console.error(message);}}
  return vm;
}
export function validateInventoryLedger(vm:InventoryLedgerViewModel,state:GameState):string[]{
  const raw=(record:Readonly<Record<ResourceId,number>>)=>sum(RESOURCE_IDS.map(id=>record[id]));const errors:string[]=[];
  if(vm.rows.length!==RESOURCE_IDS.length||new Set(vm.rows.map(row=>row.resource)).size!==RESOURCE_IDS.length)errors.push("resources must have exactly one row");
  if(vm.carriedTotal!==raw(state.cargo.amounts))errors.push("carried total mismatch");
  if(vm.barnTotal!==raw(state.barn))errors.push("barn total mismatch");if(vm.marketTotal!==raw(state.market))errors.push("market total mismatch");
  if(sum(vm.rows.map(row=>sum(LEDGER_LOCATIONS.map(key=>row[key]))))!==vm.totalOnFarm)errors.push("farm total mismatch");
  for(const row of vm.rows)for(const key of [...LEDGER_LOCATIONS,"availableForContract","totalOnFarm"] as const)if(!Number.isFinite(row[key])||row[key]<0||!Number.isInteger(row[key]))errors.push(`${row.resource}.${key} is not a nonnegative integer`);
  return errors;
}
export const createInventoryViewModel=createInventoryLedger;
export function compactResourceRows(rows:readonly InventoryLedgerRow[],maxRows:number,key:"carried"|"barn"|"market"="carried"){
  const nonzero=rows.filter(row=>row[key]>0),visible=nonzero.slice(0,Math.max(0,Math.floor(maxRows))),hidden=nonzero.slice(visible.length);
  return{visible,overflow:hidden.length,hiddenUnits:sum(hidden.map(row=>row[key])),displayedSum:sum(nonzero.map(row=>row[key]))};
}
export function formatCompactRows(rows:readonly InventoryLedgerRow[],maxRows:number,key:"carried"|"barn"|"market"="carried"){
  const compact=compactResourceRows(rows,maxRows,key);return[...compact.visible.map(row=>`${row.name} ${row[key]}`),...(compact.overflow?[`ほか ${compact.overflow}種類・${compact.hiddenUnits}個`]:[])];
}
