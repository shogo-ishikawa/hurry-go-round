import type { SaveRepository } from "./SaveRepository";
import type { PersistedSettings, SaveEnvelope } from "./saveSchema";

const DB = "hurry-go-round", VERSION = 1, OPEN_TIMEOUT_MS = 4000;
export class IndexedDbSaveRepository implements SaveRepository {
  readonly backend = "IndexedDB" as const;
  private dbPromise: Promise<IDBDatabase> | null = null;
  private db(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;
    const opening = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(DB, VERSION);
      const timer = window.setTimeout(() => reject(new Error("IndexedDB open timeout")), OPEN_TIMEOUT_MS);
      request.onblocked = () => reject(new Error("IndexedDB open blocked"));
      request.onupgradeneeded = () => { for (const store of ["saves", "settings", "metadata"]) if (!request.result.objectStoreNames.contains(store)) request.result.createObjectStore(store); };
      request.onsuccess = () => { clearTimeout(timer); request.result.onversionchange = () => { request.result.close(); this.dbPromise = null; }; resolve(request.result); };
      request.onerror = () => { clearTimeout(timer); reject(new Error(`IndexedDB open failed: ${request.error?.message ?? "unknown"}`)); };
    }).catch(error => { this.dbPromise = null; throw error; });
    this.dbPromise = opening;
    return opening;
  }
  private async read<T>(store:string,key:string):Promise<T|null>{const db=await this.db();return new Promise((resolve,reject)=>{const tx=db.transaction(store,"readonly"),request=tx.objectStore(store).get(key);request.onsuccess=()=>resolve((request.result as T|undefined)??null);request.onerror=()=>reject(new Error(`IndexedDB read failed: ${request.error?.message??"unknown"}`));tx.onabort=()=>reject(new Error(`IndexedDB transaction aborted: ${tx.error?.message??"unknown"}`));});}
  private async write(store:string,key:string,value:unknown):Promise<void>{const db=await this.db();await new Promise<void>((resolve,reject)=>{const tx=db.transaction(store,"readwrite");tx.objectStore(store).put(value,key);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(new Error(`IndexedDB write failed: ${tx.error?.message??"unknown"}`));tx.onabort=()=>reject(new Error(`IndexedDB transaction aborted: ${tx.error?.message??"unknown"}`));});}
  private async remove(store:string,key:string):Promise<void>{const db=await this.db();await new Promise<void>((resolve,reject)=>{const tx=db.transaction(store,"readwrite");tx.objectStore(store).delete(key);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});}
  loadPrimary(){return this.read<SaveEnvelope>("saves","primary");} loadBackup(){return this.read<SaveEnvelope>("saves","backup");}
  savePrimary(v:SaveEnvelope){return this.write("saves","primary",v);} saveBackup(v:SaveEnvelope){return this.write("saves","backup",v);} deletePrimary(){return this.remove("saves","primary");}
  async deleteAll(){const db=await this.db();await new Promise<void>((resolve,reject)=>{const tx=db.transaction("saves","readwrite");tx.objectStore("saves").clear();tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});}
  loadSettings(){return this.read<PersistedSettings>("settings","settings");} saveSettings(v:PersistedSettings){return this.write("settings","settings",v);}
  async probe(){const value={at:Date.now()};await this.write("metadata","probe",value);const read=await this.read<typeof value>("metadata","probe");await this.remove("metadata","probe");if(read?.at!==value.at)throw new Error("IndexedDB probe mismatch");}
}
