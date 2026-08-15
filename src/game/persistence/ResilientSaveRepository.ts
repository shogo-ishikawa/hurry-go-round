import type { SaveRepository } from "./SaveRepository";
import type { PersistedSettings, SaveEnvelope } from "./saveSchema";
export class ResilientSaveRepository implements SaveRepository {
  private active:SaveRepository; constructor(private readonly preferred:SaveRepository,private readonly fallback:SaveRepository){this.active=preferred;}
  get backend(){return this.active.backend;}
  async initialize(){try{await this.preferred.probe?.();this.active=this.preferred;}catch(error){console.warn("IndexedDB unavailable; using localStorage",error);await this.fallback.probe?.();this.active=this.fallback;}}
  loadPrimary(){return this.active.loadPrimary();} loadBackup(){return this.active.loadBackup();} savePrimary(v:SaveEnvelope){return this.active.savePrimary(v);} saveBackup(v:SaveEnvelope){return this.active.saveBackup(v);} deletePrimary(){return this.active.deletePrimary();} deleteAll(){return this.active.deleteAll();} loadSettings(){return this.active.loadSettings();} saveSettings(v:PersistedSettings){return this.active.saveSettings(v);}
  async probe(){await this.active.probe?.();}
}
