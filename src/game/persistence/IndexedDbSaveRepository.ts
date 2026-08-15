import type { SaveRepository } from "./SaveRepository"; import type { PersistedSettings, SaveEnvelope } from "./saveSchema";
const DB = "hurry-go-round-db", VERSION = 1;
export class IndexedDbSaveRepository implements SaveRepository {
  private dbPromise?: Promise<IDBDatabase>;
  private db(): Promise<IDBDatabase> { return this.dbPromise ??= new Promise((resolve, reject) => { const request = indexedDB.open(DB, VERSION); request.onupgradeneeded = () => { const db = request.result; if (!db.objectStoreNames.contains("saves")) db.createObjectStore("saves"); if (!db.objectStoreNames.contains("settings")) db.createObjectStore("settings"); if (!db.objectStoreNames.contains("metadata")) db.createObjectStore("metadata"); }; request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); }); }
  private async read<T>(store: string, key: string): Promise<T | null> { const db = await this.db(); return new Promise((resolve, reject) => { const req = db.transaction(store, "readonly").objectStore(store).get(key); req.onsuccess = () => resolve((req.result as T | undefined) ?? null); req.onerror = () => reject(req.error); }); }
  private async write<T>(store: string, key: string, value: T): Promise<void> { const db = await this.db(); return new Promise((resolve, reject) => { const tx = db.transaction(store, "readwrite"); tx.objectStore(store).put(value, key); tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); }); }
  loadPrimary() { return this.read<SaveEnvelope>("saves", "primary"); } loadBackup() { return this.read<SaveEnvelope>("saves", "backup"); } savePrimary(v: SaveEnvelope) { return this.write("saves", "primary", v); } saveBackup(v: SaveEnvelope) { return this.write("saves", "backup", v); }
  async deleteAll() { const db = await this.db(); await new Promise<void>((resolve, reject) => { const tx = db.transaction("saves", "readwrite"); tx.objectStore("saves").clear(); tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); }); }
  loadSettings() { return this.read<PersistedSettings>("settings", "settings"); } saveSettings(v: PersistedSettings) { return this.write("settings", "settings", v); }
}
