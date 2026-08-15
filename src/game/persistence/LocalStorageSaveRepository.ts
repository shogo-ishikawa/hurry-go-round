import type { SaveRepository } from "./SaveRepository";
import type { PersistedSettings, SaveEnvelope } from "./saveSchema";
const key=(name:string)=>`hurry-go-round:${name}`;
export class LocalStorageSaveRepository implements SaveRepository {
  readonly backend="簡易保存" as const;
  private read<T>(name:string):T|null{const value=localStorage.getItem(key(name));return value?JSON.parse(value) as T:null;}
  private write(name:string,value:unknown):void{localStorage.setItem(key(name),JSON.stringify(value));}
  async loadPrimary(){return this.read<SaveEnvelope>("save:primary");} async loadBackup(){return this.read<SaveEnvelope>("save:backup");}
  async savePrimary(v:SaveEnvelope){this.write("save:primary",v);} async saveBackup(v:SaveEnvelope){this.write("save:backup",v);} async deletePrimary(){localStorage.removeItem(key("save:primary"));}
  async deleteAll(){for(const name of ["save:primary","save:backup","save:emergency"])localStorage.removeItem(key(name));}
  async loadSettings(){return this.read<PersistedSettings>("settings");} async saveSettings(v:PersistedSettings){this.write("settings",v);}
  async probe(){const name="diagnostic",value=crypto.randomUUID();localStorage.setItem(key(name),value);if(localStorage.getItem(key(name))!==value)throw new Error("localStorage probe mismatch");localStorage.removeItem(key(name));}
  saveEmergency(snapshot:unknown){this.write("save:emergency",snapshot);} loadEmergency<T>(){return this.read<T>("save:emergency");}
}
