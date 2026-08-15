import { normalizePersistedSnapshot } from "../logic/normalizePersistedSnapshot";
import { checksumPayload } from "./checksum";
import { migrateSaveEnvelope } from "./migrations";
import type { SaveRepository } from "./SaveRepository";
import { GAME_VERSION,SAVE_FORMAT,SAVE_SCHEMA_VERSION,type PersistedGameSnapshot,type SaveEnvelope } from "./saveSchema";
import { validateEnvelope,validateSnapshot } from "./saveValidation";

export class SaveValidationError extends Error { constructor(readonly issues:string[]){super(issues.join("; "));this.name="SaveValidationError";} }
export class SaveService {
  private queue:Promise<unknown>=Promise.resolve();
  constructor(private readonly repository:SaveRepository){}
  get backend(){return this.repository.backend??"不明";}
  async createEnvelope(payload:PersistedGameSnapshot,previous:SaveEnvelope|null,now=new Date()):Promise<SaveEnvelope>{const checksum=await checksumPayload(payload);return{format:SAVE_FORMAT,schemaVersion:SAVE_SCHEMA_VERSION,gameVersion:GAME_VERSION,saveId:previous?.saveId??crypto.randomUUID(),createdAt:previous?.createdAt??now.toISOString(),updatedAt:now.toISOString(),checksumAlgorithm:"SHA-256",checksum,payload};}
  save(runtime:PersistedGameSnapshot):Promise<SaveEnvelope>{
    const operation=this.queue.then(async()=>{
      const payload=normalizePersistedSnapshot(runtime),snapshotResult=validateSnapshot(payload);
      if(!snapshotResult.ok)throw new SaveValidationError(snapshotResult.errors);
      const candidatePrimary=await this.repository.loadPrimary();
      const oldResult=candidatePrimary?await validateEnvelope(candidatePrimary):null;
      const oldPrimary=oldResult?.ok?oldResult.value:null;
      const envelope=await this.createEnvelope(payload,oldPrimary),preWrite=await validateEnvelope(envelope);
      if(!preWrite.ok)throw new SaveValidationError(preWrite.errors);
      if(oldPrimary)await this.repository.saveBackup(oldPrimary);
      try{
        await this.repository.savePrimary(envelope);
        const written=await this.repository.loadPrimary(),postWrite=written?await validateEnvelope(written):null;
        if(!postWrite?.ok)throw new SaveValidationError(postWrite?.errors??["written save is missing"]);
        return postWrite.value;
      }catch(error){
        if(oldPrimary)await this.repository.savePrimary(oldPrimary);else await this.repository.deletePrimary();
        throw error;
      }
    });
    this.queue=operation.catch(()=>undefined);return operation;
  }
  async load():Promise<{envelope:SaveEnvelope|null;recovered:boolean;errors:string[]}>{
    const primary=await this.repository.loadPrimary();if(primary){const result=await migrateSaveEnvelope(primary);if(result.ok)return{envelope:result.value,recovered:false,errors:[]};}
    const backup=await this.repository.loadBackup();if(backup){const result=await migrateSaveEnvelope(backup);if(result.ok){await this.repository.savePrimary(result.value);return{envelope:result.value,recovered:true,errors:[]};}return{envelope:null,recovered:false,errors:result.errors};}
    return{envelope:null,recovered:false,errors:primary?["セーブデータが破損しています"]:[]};
  }
  async diagnose(payload:PersistedGameSnapshot):Promise<void>{const normalized=normalizePersistedSnapshot(payload),result=validateSnapshot(normalized);if(!result.ok)throw new SaveValidationError(result.errors);await this.repository.probe?.();}
}
