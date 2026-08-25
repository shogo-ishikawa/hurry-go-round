import { emptyResourceAmounts, RESOURCE_MARKET_CAPACITIES, type ResourceAmounts } from "../config/resourceDefinitions";
import { createMachine, RECIPES, type MachineId, type ProcessingMachineState, type RecipeId } from "../logic/processing";
import { createCollectionNetwork } from "../logic/collectionNetwork";
import { createDairyState, createPastureNodes } from "../logic/dairy";
import { checksumPayload, verifyChecksum } from "./checksum";
import { GAME_VERSION,SAVE_SCHEMA_VERSION,type PersistedGameSnapshot,type SaveEnvelope } from "./saveSchema";
import { validateEnvelope,type ValidationResult } from "./saveValidation";
import { getActiveWheatNodes, type WheatFieldLevel } from "../config/farmLayout";
import { normalizeDurationMs } from "../logic/normalizePersistedSnapshot";
const object=(v:unknown):v is Record<string,unknown>=>typeof v==="object"&&v!==null;
const seven=(v:unknown):ResourceAmounts=>({...emptyResourceAmounts(),...(object(v)?v:{})}) as ResourceAmounts;
function migrateResources(payload:Record<string,unknown>):PersistedGameSnapshot{
  const p=structuredClone(payload) as Record<string, unknown> & { cargo:{amounts:unknown}; storage:{barn:unknown;market:unknown;marketCapacity:Record<string,number>}; economy:{soldByResource:unknown}; contracts:{offers:Array<{requirements:unknown;delivered:unknown}>;active:{requirements:unknown;delivered:unknown}|null}; landExpansion:{cornFieldLevel?:number;wheatFieldLevel?:number}; crops?:Array<{id:string}>; processing?:unknown };
  p.cargo.amounts=seven(p.cargo.amounts);p.storage.barn=seven(p.storage.barn);p.storage.market=seven(p.storage.market);p.storage.marketCapacity={...RESOURCE_MARKET_CAPACITIES,...p.storage.marketCapacity};p.economy.soldByResource=seven(p.economy.soldByResource);
  for(const contract of [...(p.contracts.offers??[]),...(p.contracts.active?[p.contracts.active]:[])]){contract.requirements=seven(contract.requirements);contract.delivered=seven(contract.delivered)}
  p.processing??={land:{yardUnlocked:false,millBuilt:false,bakeryBuilt:false},mill:createMachine("grain-mill"),bakery:createMachine("bakery"),millOperator:{hired:false,level:0,carriedResource:null,carriedAmount:0,publicStatus:"未雇用"},baker:{hired:false,level:0,carriedResource:null,carriedAmount:0,publicStatus:"未雇用"},routingPolicy:"balanced",rawReserves:{wheat:8,corn:10,egg:4},autoSelectionRoundRobin:{mill:0,bakery:0}};
  p.landExpansion.cornFieldLevel??=0; p.landExpansion.wheatFieldLevel??=0;
  const livestock=p.livestock as Record<string,unknown>;
  const coopLevel=(p.landExpansion as {southChickenCoopUnlocked:boolean}).southChickenCoopUnlocked?1:0;
  livestock.coopLevel=livestock.coopLevel??coopLevel;
  livestock.eggRemainingMs=typeof livestock.eggRemainingMs==="number"&&Number.isFinite(livestock.eggRemainingMs)&&livestock.eggRemainingMs>=0?Math.round(livestock.eggRemainingMs):4500;
  const capacity=[12,12,18,24][livestock.coopLevel as number]??12;
  livestock.feedCapacity=capacity;livestock.eggCapacity=capacity;
  livestock.feed=Math.min(capacity,Math.max(0,Math.floor(Number(livestock.feed)||0)));livestock.eggs=Math.min(capacity,Math.max(0,Math.floor(Number(livestock.eggs)||0)));
  const contractRecord=p.contracts as unknown as Record<string,unknown>;if(typeof contractRecord.declineCooldownMs==="number")contractRecord.declineCooldownMs=0;
  if(Array.isArray(p.crops)){p.crops=p.crops.map((crop,index)=>{if(!crop.id?.match(/^wheat-\d{3}$/))return crop;const cluster=index<15?"west":"central",local=index%15;return{...crop,id:`wheat-${cluster}-base-${String(local).padStart(2,"0")}`};});} p.collectionNetwork??=createCollectionNetwork(); const dairy=object(p.dairy)?p.dairy:createDairyState(); const defaults=createDairyState(); p.dairy={...defaults,...dairy,pastureNodes:Array.isArray(dairy.pastureNodes)?dairy.pastureNodes:createPastureNodes([0,1,2].includes(dairy.pastureLevel as number)?dairy.pastureLevel as 0|1|2:0)}; if(object(p.operations)){const id=p.operations.lastSelectedFacilityId;p.operations.lastSelectedFacilityId=id==="operations-office"?"training-lodge":id==="training-lodge"?id:null;} return p as unknown as PersistedGameSnapshot;
}
export function mapSchema8WheatId(id:string):string|null {
 const match=/^wheat-(west|central)-(base|exp1|exp2)-(\d{2})$/.exec(id);if(!match)return null;
 const cluster=match[1],group=match[2],index=Number(match[3]),limit=group==="base"?15:6;
 if(index<0||index>=limit)return null;
 const target=index+(cluster==="central"?limit:0);
 return `wheat-main-${group}-${String(target).padStart(2,"0")}`;
}
function migrateSchema8Wheat(payload:PersistedGameSnapshot):PersistedGameSnapshot {
 const level=payload.landExpansion.wheatFieldLevel as WheatFieldLevel;
 const expected=getActiveWheatNodes(level);const byId=new Map<string,PersistedGameSnapshot["crops"][number]>();
 for(const crop of payload.crops){if(!crop.id.startsWith("wheat-"))continue;const id=mapSchema8WheatId(crop.id);if(id&&!byId.has(id))byId.set(id,{...crop,id,remainingMs:normalizeDurationMs(crop.remainingMs)});}
 return {...payload,crops:expected.map(node=>byId.get(node.id)??{id:node.id,resource:"wheat",state:"ready",remainingMs:0})};
}
function migrateProcessingLedger(payload:PersistedGameSnapshot):PersistedGameSnapshot {
 const processing=structuredClone(payload.processing);
 const migrateMachine=(id:MachineId,old:ProcessingMachineState):ProcessingMachineState=>{
  const defaults=createMachine(id),recipes=Object.values(RECIPES).filter(recipe=>recipe.machine===id).map(recipe=>recipe.id),targets:Partial<Record<RecipeId,number>>={};
  for(const recipe of recipes)targets[recipe]=old.selectedMode==="auto"||old.selectedMode===recipe?1:0;
  return {...defaults,...old,input:structuredClone(old.input),output:structuredClone(old.output),activeCycle:old.activeCycle?structuredClone(old.activeCycle):null,recipeTargetCycles:targets,currentPlanCompletedCycles:{},completedByRecipe:{...defaults.completedByRecipe},legacyUnattributedCycles:old.completedCycles,lastCompletion:null,recentHistory:[],completionMode:"repeat",supplyMode:"cargo-first",autoBalance:0};
 };
 return {...payload,processing:{...processing,mill:migrateMachine("grain-mill",processing.mill),bakery:migrateMachine("bakery",processing.bakery)}};
}
export async function migrateSaveEnvelope(input:unknown):Promise<ValidationResult<SaveEnvelope>>{
 if(!object(input)||typeof input.schemaVersion!=="number")return{ok:false,errors:["schema version missing"]};if(input.schemaVersion>SAVE_SCHEMA_VERSION)return{ok:false,errors:["このセーブデータは新しいバージョンで作成されています"]};if(input.schemaVersion===SAVE_SCHEMA_VERSION){const validated=await validateEnvelope(input);if(!validated.ok)return validated;if(validated.value.payload.contracts.declineCooldownMs<=0)return validated;const payload=structuredClone(validated.value.payload);payload.contracts.declineCooldownMs=0;const envelope={...validated.value,payload,checksum:await checksumPayload(payload)};return{ok:true,value:envelope,warnings:["旧式の契約見送り待ち時間を解除しました"]};}if(![1,2,3,4,5,6,7,8,9].includes(input.schemaVersion)||!object(input.payload)||typeof input.checksum!=="string")return{ok:false,errors:["unsupported schema version"]};if(!(await verifyChecksum(input.payload,input.checksum)))return{ok:false,errors:["checksum mismatch"]};
 let old=structuredClone(input.payload) as Record<string,unknown>;const warnings:string[]=[];
 if(input.schemaVersion===1){if(!object(old.workers))return{ok:false,errors:["invalid worker state"]};const workers:Record<string,unknown>={};for(const [key,value] of Object.entries(old.workers)){if(!object(value)||typeof value.hired!=="boolean"||typeof value.carried!=="number")return{ok:false,errors:["invalid worker state"]};workers[key]={...value,level:value.hired?1:0,carried:Math.max(0,value.carried)}}old={...old,workers,operations:{lastSelectedFacilityId:null,compactAutomationHud:false,completedInteractionTutorials:[]}};warnings.push("schema 1 を schema 2 へ移行しました")}
 const resources=migrateResources(old);const payload=migrateProcessingLedger(migrateSchema8Wheat(resources));const envelope={...input,schemaVersion:SAVE_SCHEMA_VERSION,gameVersion:GAME_VERSION,payload,checksum:await checksumPayload(payload)} as SaveEnvelope;const validated=await validateEnvelope(envelope);return validated.ok?{...validated,warnings:[...warnings,"schema 10 の加工生産台帳へ移行しました"]}:validated;
}
