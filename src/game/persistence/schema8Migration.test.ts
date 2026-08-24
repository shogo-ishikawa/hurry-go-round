import { describe, expect, it } from "vitest";
import { mapSchema8WheatId, migrateSaveEnvelope } from "./migrations";
import { checksumPayload } from "./checksum";
import { createPersistedSnapshot } from "../logic/saveSnapshot";
import { createGameState } from "../state/GameState";

const oldIds = [
  ...["west", "central"].flatMap(cluster => Array.from({length:15},(_,i)=>`wheat-${cluster}-base-${String(i).padStart(2,"0")}`)),
  ...["exp1", "exp2"].flatMap(group => ["west", "central"].flatMap(cluster => Array.from({length:6},(_,i)=>`wheat-${cluster}-${group}-${String(i).padStart(2,"0")}`))),
];

describe("schema 8 unified wheat migration",()=>{
  it("maps all 54 legacy IDs exactly once",()=>{
    const mapped=oldIds.map(mapSchema8WheatId);
    expect(mapped.every(Boolean)).toBe(true);expect(new Set(mapped).size).toBe(54);
    expect(mapped).toContain("wheat-main-base-00");expect(mapped).toContain("wheat-main-base-29");expect(mapped).toContain("wheat-main-exp2-11");
  });
  it("preserves level, state, timer, crate and worker cargo",async()=>{
    const state=createGameState();state.landExpansion.wheatFieldLevel=2;state.inventory.fieldCrate=11;state.workers.harvestWorker={...state.workers.harvestWorker,hired:true,level:3,carried:6};
    const payload=createPersistedSnapshot(state,{player:{x:100,y:700,facing:"front"},crops:oldIds.map((id,i)=>({id,resource:"wheat" as const,state:i%3===0?"growing" as const:i%3===1?"harvested" as const:"ready" as const,remainingMs:i+0.4})),playTimeMs:10,saveSequence:4});
    const envelope={format:"hurry-go-round-save",schemaVersion:8,gameVersion:"0.9.6",saveId:"schema8",createdAt:"2026-01-01",updatedAt:"2026-01-01",checksumAlgorithm:"SHA-256",checksum:await checksumPayload(payload),payload};
    const result=await migrateSaveEnvelope(envelope);expect(result.ok).toBe(true);if(!result.ok)return;
    expect(result.value).toMatchObject({schemaVersion:9,gameVersion:"0.9.8"});expect(result.value.payload.crops).toHaveLength(54);
    expect(result.value.payload.crops[0]).toMatchObject({id:"wheat-main-base-00",state:"growing",remainingMs:0});
    expect(result.value.payload.automation.wheatFieldCrate).toBe(11);expect(result.value.payload.workers.harvestWorker).toMatchObject({hired:true,level:3,carried:6});
  });
});
