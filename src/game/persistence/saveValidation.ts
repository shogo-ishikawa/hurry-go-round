import { RESOURCE_IDS } from "../config/resourceDefinitions";
import {
  SAVE_FORMAT,
  SAVE_SCHEMA_VERSION,
  type PersistedGameSnapshot,
  type SaveEnvelope,
} from "./saveSchema";
import { verifyChecksum } from "./checksum";

export type ValidationResult<T> =
  | { ok: true; value: T; warnings: string[] }
  | { ok: false; errors: string[] };

const object = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const finiteNonNegative = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0;

export function validateSnapshot(
  value: unknown,
): ValidationResult<PersistedGameSnapshot> {
  const errors: string[] = [];
  if (!object(value)) {
    return { ok: false, errors: ["payload must be an object"] };
  }

  const snapshot = value as unknown as PersistedGameSnapshot;
  if (
    !object(snapshot.player) ||
    !Number.isFinite(snapshot.player.x) ||
    !Number.isFinite(snapshot.player.y) ||
    !["front", "back", "left", "right"].includes(snapshot.player.facing)
  ) {
    errors.push("invalid player");
  }

  const resourceSets = [
    snapshot.cargo?.amounts,
    snapshot.storage?.barn,
    snapshot.storage?.market,
    snapshot.storage?.marketCapacity,
    snapshot.economy?.soldByResource,
  ];
  for (const set of resourceSets) {
    if (
      !object(set) ||
      Object.keys(set).some(
        (key) => !RESOURCE_IDS.includes(key as (typeof RESOURCE_IDS)[number]),
      ) ||
      RESOURCE_IDS.some((key) => !finiteNonNegative(set[key]))
    ) {
      errors.push("invalid resource amounts");
    }
  }

  if (
    !finiteNonNegative(snapshot.cargo?.capacity) ||
    RESOURCE_IDS.reduce(
      (total, key) => total + (snapshot.cargo?.amounts?.[key] ?? 0),
      0,
    ) > snapshot.cargo.capacity
  ) {
    errors.push("cargo exceeds capacity");
  }

  if (
    snapshot.storage &&
    RESOURCE_IDS.some(
      (key) =>
        snapshot.storage.market[key] > snapshot.storage.marketCapacity[key],
    )
  ) {
    errors.push("market exceeds capacity");
  }

  for (const numberValue of [
    snapshot.economy?.walletCoins,
    snapshot.economy?.tillCoins,
    snapshot.economy?.soldUnits,
    snapshot.economy?.customersServed,
    snapshot.economy?.customersLeftWithoutPurchase,
    snapshot.playTimeMs,
    snapshot.saveSequence,
  ]) {
    if (!finiteNonNegative(numberValue)) errors.push("invalid non-negative number");
  }

  if (
    !Array.isArray(snapshot.crops) ||
    new Set(snapshot.crops?.map((crop) => crop.id)).size !==
      snapshot.crops?.length ||
    snapshot.crops?.some(
      (crop) => !crop.id || !finiteNonNegative(crop.remainingMs),
    )
  ) {
    errors.push("invalid or duplicate crops");
  }

  const contracts = snapshot.contracts;
  if (!object(contracts) || !Array.isArray(contracts.offers)) {
    errors.push("invalid contracts");
  } else {
    for (const contract of [
      ...contracts.offers,
      ...(contracts.active ? [contracts.active] : []),
    ]) {
      if (
        RESOURCE_IDS.some(
          (key) =>
            !finiteNonNegative(contract.requirements?.[key]) ||
            !finiteNonNegative(contract.delivered?.[key]) ||
            contract.delivered[key] > contract.requirements[key],
        )
      ) {
        errors.push("invalid contract progress");
      }
    }
  }

  for (const worker of Object.values(snapshot.workers ?? {})) {
    if (
      !object(worker) ||
      !finiteNonNegative(worker.carried) ||
      worker.carried > 12 ||
      ![0, 1, 2, 3].includes(worker.level as number) ||
      worker.hired !== ((worker.level as number) > 0)
    ) {
      errors.push("invalid worker state");
    }
  }

  if (
    !object(snapshot.operations) ||
    !(
      snapshot.operations.lastSelectedFacilityId === null ||
      typeof snapshot.operations.lastSelectedFacilityId === "string"
    ) ||
    typeof snapshot.operations.compactAutomationHud !== "boolean" ||
    !Array.isArray(snapshot.operations.completedInteractionTutorials)
  ) {
    errors.push("invalid operations state");
  }

  if (
    !object(snapshot.landExpansion) ||
    typeof snapshot.landExpansion.eastCornFieldUnlocked !== "boolean" ||
    typeof snapshot.landExpansion.southChickenCoopUnlocked !== "boolean" ||
    (snapshot.landExpansion.cornFieldLevel !== undefined &&
      ![0, 1, 2].includes(snapshot.landExpansion.cornFieldLevel))
  ) {
    errors.push("invalid land expansion state");
  }

  return errors.length
    ? { ok: false, errors: [...new Set(errors)] }
    : { ok: true, value: structuredClone(snapshot), warnings: [] };
}

export async function validateEnvelope(
  value: unknown,
): Promise<ValidationResult<SaveEnvelope>> {
  if (!object(value)) {
    return { ok: false, errors: ["save envelope must be an object"] };
  }
  if (value.format !== SAVE_FORMAT) {
    return { ok: false, errors: ["invalid save format"] };
  }
  if (
    typeof value.schemaVersion !== "number" ||
    value.schemaVersion > SAVE_SCHEMA_VERSION
  ) {
    return { ok: false, errors: ["unsupported schema version"] };
  }
  if (value.schemaVersion !== SAVE_SCHEMA_VERSION) {
    return { ok: false, errors: ["migration required"] };
  }
  if (
    typeof value.gameVersion !== "string" ||
    typeof value.saveId !== "string" ||
    typeof value.createdAt !== "string" ||
    typeof value.updatedAt !== "string" ||
    value.checksumAlgorithm !== "SHA-256" ||
    typeof value.checksum !== "string"
  ) {
    return { ok: false, errors: ["invalid envelope metadata"] };
  }

  const payload = validateSnapshot(value.payload);
  if (!payload.ok) return payload;
  if (!(await verifyChecksum(payload.value, value.checksum))) {
    return { ok: false, errors: ["checksum mismatch"] };
  }

  return {
    ok: true,
    value: value as unknown as SaveEnvelope,
    warnings: payload.warnings,
  };
}
