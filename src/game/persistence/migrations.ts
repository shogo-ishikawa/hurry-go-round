import { checksumPayload, verifyChecksum } from "./checksum";
import { GAME_VERSION, SAVE_SCHEMA_VERSION, type PersistedGameSnapshot, type SaveEnvelope } from "./saveSchema";
import { validateEnvelope, type ValidationResult } from "./saveValidation";
const object=(v:unknown):v is Record<string,unknown>=>typeof v==="object"&&v!==null;
export async function migrateSaveEnvelope(input: unknown): Promise<ValidationResult<SaveEnvelope>> {
  if(!object(input)||typeof input.schemaVersion!=="number")return{ok:false,errors:["schema version missing"]};
  if(input.schemaVersion>SAVE_SCHEMA_VERSION)return{ok:false,errors:["このセーブデータは新しいバージョンで作成されています"]};
  if(input.schemaVersion===SAVE_SCHEMA_VERSION)return validateEnvelope(input);
  if(input.schemaVersion!==1||!object(input.payload)||typeof input.checksum!=="string")return{ok:false,errors:["unsupported schema version"]};
  if(!(await verifyChecksum(input.payload,input.checksum)))return{ok:false,errors:["checksum mismatch"]};
  const old=structuredClone(input.payload) as Record<string,unknown>;
  if(!object(old.workers))return{ok:false,errors:["invalid worker state"]};
  const workers:Record<string,unknown>={};
  for(const [key,value] of Object.entries(old.workers)){if(!object(value)||typeof value.hired!=="boolean"||typeof value.carried!=="number")return{ok:false,errors:["invalid worker state"]};workers[key]={...value,level:value.hired?1:0,carried:Math.max(0,value.carried)};}
  const payload={...old,workers,operations:{lastSelectedFacilityId:null,compactAutomationHud:false,completedInteractionTutorials:[]}} as unknown as PersistedGameSnapshot;
  const envelope={...input,schemaVersion:SAVE_SCHEMA_VERSION,gameVersion:GAME_VERSION,payload,checksum:await checksumPayload(payload)} as SaveEnvelope;
  const validated=await validateEnvelope(envelope);return validated.ok?{...validated,warnings:["v0.7.0 のセーブを v0.8.0 へ移行しました","スタッフレベルと運営所設定を追加しました"]}:validated;
}
