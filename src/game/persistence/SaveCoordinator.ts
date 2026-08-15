import type { PersistedGameSnapshot,SaveEnvelope } from "./saveSchema";
import type { SaveService } from "./SaveService";
export type SaveRequestReason="manual"|"autosave"|"priority"|"visibility-hidden"|"pagehide"|"before-title";
export interface SaveResult{envelope:SaveEnvelope;reason:SaveRequestReason;revision:number}
export class SaveCoordinator{
  private stateRevision=0;private savedRevision=0;private sequence:number;private running:Promise<SaveResult|null>|null=null;
  constructor(private readonly service:SaveService,initialSequence=0){this.sequence=initialSequence;}
  markDirty(){this.stateRevision+=1;}
  get isDirty(){return this.stateRevision>this.savedRevision;}
  get currentSequence(){return this.sequence;}
  request(reason:SaveRequestReason,snapshot:(sequence:number)=>PersistedGameSnapshot):Promise<SaveResult|null>{if(this.running)return this.running.then(()=>this.isDirty?this.request(reason,snapshot):null);this.running=this.drain(reason,snapshot).finally(()=>{this.running=null;});return this.running;}
  private async drain(reason:SaveRequestReason,snapshot:(sequence:number)=>PersistedGameSnapshot):Promise<SaveResult|null>{let last:SaveResult|null=null;do{const revision=this.stateRevision,nextSequence=this.sequence+1;const envelope=await this.service.save(snapshot(nextSequence));this.sequence=nextSequence;this.savedRevision=revision;last={envelope,reason,revision};}while(this.isDirty);return last;}
}
