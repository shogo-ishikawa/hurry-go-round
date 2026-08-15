import { RESOURCE_IDS } from "../config/resourceDefinitions";
import { SAVE_FORMAT, SAVE_SCHEMA_VERSION, type PersistedGameSnapshot, type SaveEnvelope } from "./saveSchema";
import { verifyChecksum } from "./checksum";
export type ValidationResult<T> = { ok: true; value: T; warnings: string[] } | { ok: false; errors: string[] };
const object = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const finiteNonNegative = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0;
export function validateSnapshot(value: unknown): ValidationResult<PersistedGameSnapshot> {
  const errors: string[] = []; if (!object(value)) return { ok: false, errors: ["payload must be an object"] }; const s = value as unknown as PersistedGameSnapshot;
  if (!object(s.player) || !Number.isFinite(s.player.x) || !Number.isFinite(s.player.y) || !["front","back","left","right"].includes(s.player.facing)) errors.push("invalid player");
  const amounts = [s.cargo?.amounts, s.storage?.barn, s.storage?.market, s.storage?.marketCapacity, s.economy?.soldByResource];
  for (const set of amounts) if (!object(set) || Object.keys(set).some(k => !RESOURCE_IDS.includes(k as never)) || RESOURCE_IDS.some(k => !finiteNonNegative(set[k]))) errors.push("invalid resource amounts");
  if (!finiteNonNegative(s.cargo?.capacity) || RESOURCE_IDS.reduce((n,k) => n + (s.cargo?.amounts?.[k] ?? 0), 0) > s.cargo.capacity) errors.push("cargo exceeds capacity");
  if (s.storage && RESOURCE_IDS.some(k => s.storage.market[k] > s.storage.marketCapacity[k])) errors.push("market exceeds capacity");
  for (const n of [s.economy?.walletCoins,s.economy?.tillCoins,s.economy?.soldUnits,s.economy?.customersServed,s.economy?.customersLeftWithoutPurchase,s.playTimeMs,s.saveSequence]) if (!finiteNonNegative(n)) errors.push("invalid non-negative number");
  if (!Array.isArray(s.crops) || new Set(s.crops?.map(c => c.id)).size !== s.crops?.length || s.crops?.some(c => !c.id || !finiteNonNegative(c.remainingMs))) errors.push("invalid or duplicate crops");
  const contracts = s.contracts; if (!object(contracts) || !Array.isArray(contracts.offers)) errors.push("invalid contracts"); else for (const contract of [...contracts.offers, ...(contracts.active ? [contracts.active] : [])]) { if (RESOURCE_IDS.some(k => !finiteNonNegative(contract.requirements?.[k]) || !finiteNonNegative(contract.delivered?.[k]) || contract.delivered[k] > contract.requirements[k])) errors.push("invalid contract progress"); }
  for (const worker of Object.values(s.workers ?? {})) if (!object(worker) || !finiteNonNegative(worker.carried) || worker.carried > 12 || ![0,1,2,3].includes(worker.level) || worker.hired !== (worker.level > 0)) errors.push("invalid worker state");
  if (!object(s.operations) || !(s.operations.lastSelectedFacilityId === null || typeof s.operations.lastSelectedFacilityId === "string") || typeof s.operations.compactAutomationHud !== "boolean" || !Array.isArray(s.operations.completedInteractionTutorials)) errors.push("invalid operations state");
  return errors.length ? { ok: false, errors: [...new Set(errors)] } : { ok: true, value: structuredClone(s), warnings: [] };
}
export async function validateEnvelope(value: unknown): Promise<ValidationResult<SaveEnvelope>> {
  if (!object(value)) return { ok: false, errors: ["save envelope must be an object"] }; if (value.format !== SAVE_FORMAT) return { ok: false, errors: ["invalid save format"] }; if (typeof value.schemaVersion !== "number" || value.schemaVersion > SAVE_SCHEMA_VERSION) return { ok: false, errors: ["unsupported schema version"] }; if (value.schemaVersion !== SAVE_SCHEMA_VERSION) return { ok: false, errors: ["migration required"] };
  if (typeof value.gameVersion !== "string" || typeof value.saveId !== "string" || typeof value.createdAt !== "string" || typeof value.updatedAt !== "string" || value.checksumAlgorithm !== "SHA-256" || typeof value.checksum !== "string") return { ok: false, errors: ["invalid envelope metadata"] };
  const payload = validateSnapshot(value.payload); if (!payload.ok) return payload; if (!(await verifyChecksum(payload.value, value.checksum))) return { ok: false, errors: ["checksum mismatch"] };
  return { ok: true, value: value as unknown as SaveEnvelope, warnings: payload.warnings };
}
