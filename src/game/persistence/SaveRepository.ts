import type { PersistedSettings, SaveEnvelope } from "./saveSchema";
export interface SaveRepository { loadPrimary(): Promise<SaveEnvelope | null>; loadBackup(): Promise<SaveEnvelope | null>; savePrimary(value: SaveEnvelope): Promise<void>; saveBackup(value: SaveEnvelope): Promise<void>; deleteAll(): Promise<void>; loadSettings(): Promise<PersistedSettings | null>; saveSettings(value: PersistedSettings): Promise<void> }
export class MemorySaveRepository implements SaveRepository {
  primary: SaveEnvelope | null = null; backup: SaveEnvelope | null = null; settings: PersistedSettings | null = null; failPrimary = false;
  async loadPrimary() { return this.primary ? structuredClone(this.primary) : null; } async loadBackup() { return this.backup ? structuredClone(this.backup) : null; }
  async savePrimary(v: SaveEnvelope) { if (this.failPrimary) throw new Error("primary write failed"); this.primary = structuredClone(v); } async saveBackup(v: SaveEnvelope) { this.backup = structuredClone(v); }
  async deleteAll() { this.primary = null; this.backup = null; } async loadSettings() { return this.settings ? { ...this.settings } : null; } async saveSettings(v: PersistedSettings) { this.settings = { ...v }; }
}
