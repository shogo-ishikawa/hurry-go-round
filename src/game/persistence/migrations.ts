import { emptyResourceAmounts, RESOURCE_MARKET_CAPACITIES, type ResourceAmounts } from "../config/resourceDefinitions";
import { createMachine } from "../logic/processing";
import { createCollectionNetwork } from "../logic/collectionNetwork";
import { createDairyState, createPastureNodes } from "../logic/dairy";
import { checksumPayload, verifyChecksum } from "./checksum";
import { GAME_VERSION,SAVE_SCHEMA_VERSION,type PersistedGameSnapshot,type SaveEnvelope } from "./saveSchema";
import { validateEnvelope,type ValidationResult } from "./saveValidation";
const object=(v:unknown):v is Record<string,unknown>=>typeof v==="object"&&v!==null;
const seven=(v:unknown):ResourceAmounts=>({...emptyResourceAmounts(),...(object(v)?v:{})}) as ResourceAmounts;
function migrateResources(payload:Record<string,unknown>):PersistedGameSnapshot{
  const p=structuredClone(payload) as Record<string, unknown> & { cargo:{amounts:unknown}; storage:{barn:unknown;market:unknown;marketCapacity:Record<string,number>}; economy:{soldByResource:unknown}; contracts:{offers:Array<{requirements:unknown;delivered:unknown}>;active:{requirements:unknown;delivered:unknown}|null}; landExpansion:{cornFieldLevel?:number}; processing?:unknown };
  p.cargo.amounts=seven(p.cargo.amounts);p.storage.barn=seven(p.storage.barn);p.storage.market=seven(p.storage.market);p.storage.marketCapacity={...RESOURCE_MARKET_CAPACITIES,...p.storage.marketCapacity};p.economy.soldByResource=seven(p.economy.soldByResource);
  for(const contract of [...(p.contracts.offers??[]),...(p.contracts.active?[p.contracts.active]:[])]){contract.requirements=seven(contract.requirements);contract.delivered=seven(contract.delivered)}
  p.processing??={land:{yardUnlocked:false,millBuilt:false,bakeryBuilt:false},mill:createMachine("grain-mill"),bakery:createMachine("bakery"),millOperator:{hired:false,level:0,carriedResource:null,carriedAmount:0,publicStatus:"未雇用"},baker:{hired:false,level:0,carriedResource:null,carriedAmount:0,publicStatus:"未雇用"},routingPolicy:"balanced",rawReserves:{wheat:8,corn:10,egg:4},autoSelectionRoundRobin:{mill:0,bakery:0}};
  p.landExpansion.cornFieldLevel??=0; p.collectionNetwork??=createCollectionNetwork(); const dairy=object(p.dairy)?p.dairy:createDairyState(); const defaults=createDairyState(); p.dairy={...defaults,...dairy,pastureNodes:Array.isArray(dairy.pastureNodes)?dairy.pastureNodes:createPastureNodes([0,1,2].includes(dairy.pastureLevel as number)?dairy.pastureLevel as 0|1|2:0)}; if(object(p.operations)){const id=p.operations.lastSelectedFacilityId;p.operations.lastSelectedFacilityId=id==="operations-office"?"training-lodge":id==="training-lodge"?id:null;} return p as unknown as PersistedGameSnapshot;
}
export async function migrateSaveEnvelope(input:unknown):Promise<ValidationResult<SaveEnvelope>>{
 if(!object(input)||typeof input.schemaVersion!=="number")return{ok:false,errors:["schema version missing"]};if(input.schemaVersion>SAVE_SCHEMA_VERSION)return{ok:false,errors:["このセーブデータは新しいバージョンで作成されています"]};if(input.schemaVersion===SAVE_SCHEMA_VERSION)return validateEnvelope(input);if(![1,2,3,4,5].includes(input.schemaVersion)||!object(input.payload)||typeof input.checksum!=="string")return{ok:false,errors:["unsupported schema version"]};if(!(await verifyChecksum(input.payload,input.checksum)))return{ok:false,errors:["checksum mismatch"]};
 let old=structuredClone(input.payload) as Record<string,unknown>;const warnings:string[]=[];
 if(input.schemaVersion===1){if(!object(old.workers))return{ok:false,errors:["invalid worker state"]};const workers:Record<string,unknown>={};for(const [key,value] of Object.entries(old.workers)){if(!object(value)||typeof value.hired!=="boolean"||typeof value.carried!=="number")return{ok:false,errors:["invalid worker state"]};workers[key]={...value,level:value.hired?1:0,carried:Math.max(0,value.carried)}}old={...old,workers,operations:{lastSelectedFacilityId:null,compactAutomationHud:false,completedInteractionTutorials:[]}};warnings.push("schema 1 を schema 2 へ移行しました")}
 const payload=migrateResources(old);const envelope={...input,schemaVersion:SAVE_SCHEMA_VERSION,gameVersion:GAME_VERSION,payload,checksum:await checksumPayload(payload)} as SaveEnvelope;const validated=await validateEnvelope(envelope);return validated.ok?{...validated,warnings:[...warnings,"schema 6 の酪農ランタイム状態へ移行しました"]}:validated;
}
