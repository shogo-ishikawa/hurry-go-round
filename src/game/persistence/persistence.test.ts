import { describe,expect,it } from "vitest";
import { createGameState } from "../state/GameState";
import { createPersistedSnapshot, workerRestartTask } from "../logic/saveSnapshot";
import { checksumPayload,verifyChecksum } from "./checksum";
import { MemorySaveRepository } from "./SaveRepository";
import { SaveService } from "./SaveService";
import { validateEnvelope,validateSnapshot } from "./saveValidation";
import { parseImportedSave,exportFilename,MAX_IMPORT_BYTES } from "./exportImport";
const snapshot=()=>createPersistedSnapshot(createGameState(),{player:{x:990,y:640,facing:"front"},crops:[{id:"wheat-001",resource:"wheat",state:"ready",remainingMs:0}],playTimeMs:0,saveSequence:1});
describe("persistence",()=>{
 it("creates canonical state without compatibility or runtime objects",()=>{const s=snapshot();expect(s).toHaveProperty("cargo");expect(s).toHaveProperty("storage.barn");expect(s).not.toHaveProperty("inventory");expect(JSON.stringify(s)).not.toContain("event");expect(snapshot()).toEqual(s);});
 it("checks canonical SHA-256",async()=>{const s=snapshot(),hash=await checksumPayload(s);expect(await verifyChecksum(s,hash)).toBe(true);expect(await verifyChecksum({...s,playTimeMs:1},hash)).toBe(false);});
 it("validates bounds and duplicate crop ids",()=>{const s=snapshot();expect(validateSnapshot(s).ok).toBe(true);expect(validateSnapshot({...s,economy:{...s.economy,walletCoins:-1}}).ok).toBe(false);expect(validateSnapshot({...s,crops:[...s.crops,...s.crops]}).ok).toBe(false);expect(validateSnapshot({...s,cargo:{...s.cargo,amounts:{wheat:99,corn:0,egg:0}}}).ok).toBe(false);});
 it("rotates primary to backup and recovers",async()=>{const repo=new MemorySaveRepository(),service=new SaveService(repo);const first=await service.save(snapshot());const second=await service.save({...snapshot(),playTimeMs:10});expect(repo.backup).toEqual(first);expect((await service.load()).envelope).toEqual(second);repo.primary={...second,checksum:"bad"};const recovered=await service.load();expect(recovered.recovered).toBe(true);expect(recovered.envelope).toEqual(first);});
 it("leaves old data on failed write and stores settings independently",async()=>{const repo=new MemorySaveRepository(),service=new SaveService(repo);const first=await service.save(snapshot());repo.failPrimary=true;await expect(service.save({...snapshot(),playTimeMs:2})).rejects.toThrow();expect(repo.primary).toEqual(first);await repo.saveSettings({textScale:1.15,reducedMotion:true,joystickScale:1,joystickOpacity:.65,contextualHints:false});expect((await repo.loadSettings())?.reducedMotion).toBe(true);});
 it("validates envelope and import limits",async()=>{const repo=new MemorySaveRepository(),e=await new SaveService(repo).save(snapshot());expect((await validateEnvelope(e)).ok).toBe(true);expect((await parseImportedSave(JSON.stringify(e))).ok).toBe(true);expect((await parseImportedSave("{}",MAX_IMPORT_BYTES+1)).ok).toBe(false);expect(exportFilename(new Date(2026,7,15,9,8,7))).toMatch(/20260815-090807/);});
 it("chooses safe worker restart tasks",()=>{expect(workerRestartTask("harvestWorker",null,2)).toBe("wheat-crate");expect(workerRestartTask("cornTransportWorker",null,2)).toBe("barn");expect(workerRestartTask("poultryCaretaker","corn",2)).toBe("feed");expect(workerRestartTask("poultryCaretaker","egg",2)).toBe("barn");expect(workerRestartTask("transportWorker",null,0)).toBe("idle");});
});
