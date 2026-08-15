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

export const finiteNonNegativeInteger = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 && Number.isInteger(value);

export const finiteNonNegativeNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value) && value >= 0;
const finiteNonNegative=finiteNonNegativeInteger;

const validAmounts=(set:unknown):boolean=>object(set)&&Object.keys(set).length===RESOURCE_IDS.length&&Object.keys(set).every(key=>RESOURCE_IDS.includes(key as (typeof RESOURCE_IDS)[number]))&&RESOURCE_IDS.every(key=>finiteNonNegative(set[key]));

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
    snapshot.saveSequence,
  ]) {
    if (!finiteNonNegative(numberValue)) errors.push("invalid non-negative number");
  }

  if(!finiteNonNegativeNumber(snapshot.playTimeMs)) errors.push("invalid play time");

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

  const processing=snapshot.processing;
  if(!object(processing)||!object(processing.land)||typeof processing.land.yardUnlocked!=="boolean"||typeof processing.land.millBuilt!=="boolean"||typeof processing.land.bakeryBuilt!=="boolean"||!["balanced","market-first","contract-first","processing-first"].includes(processing.routingPolicy)) errors.push("invalid processing state");
  else {
    for(const [id,machine] of [["grain-mill",processing.mill],["bakery",processing.bakery]] as const){
      const validRecipe=id==="grain-mill"?["auto","mill-flour","mill-cornmeal"]:["auto","bakery-bread","bakery-cornbread"];
      if(!object(machine)||typeof machine.built!=="boolean"||![0,1,2,3].includes(machine.level)||machine.built!==(machine.level>0)||typeof machine.enabled!=="boolean"||!validRecipe.includes(machine.selectedMode)||!object(machine.input)||!object(machine.output)||!validAmounts(machine.input.amounts)||!validAmounts(machine.output.amounts)||!finiteNonNegative(machine.input.capacity)||!finiteNonNegative(machine.output.capacity)||RESOURCE_IDS.reduce((n,r)=>n+machine.input.amounts[r],0)>machine.input.capacity||RESOURCE_IDS.reduce((n,r)=>n+machine.output.amounts[r],0)>machine.output.capacity||!finiteNonNegative(machine.completedCycles)) errors.push("invalid machine state");
      if(machine.activeCycle!==null&&(!object(machine.activeCycle)||!validRecipe.slice(1).includes(machine.activeCycle.recipeId)||!finiteNonNegative(machine.activeCycle.remainingMs)||typeof machine.activeCycle.durationMs!=="number"||!Number.isFinite(machine.activeCycle.durationMs)||machine.activeCycle.durationMs<=0||machine.activeCycle.remainingMs>machine.activeCycle.durationMs||!validAmounts(machine.activeCycle.reservedInputs)))errors.push("invalid active cycle");
    }
    for(const [role,worker] of [["mill",processing.millOperator],["baker",processing.baker]] as const){const allowed=role==="mill"?["wheat","corn","flour","cornmeal"]:["flour","cornmeal","egg","bread","cornbread"];const capacities=role==="mill"?[0,8,12,16]:[0,6,9,12];if(!object(worker)||typeof worker.hired!=="boolean"||![0,1,2,3].includes(worker.level)||worker.hired!==(worker.level>0)||!finiteNonNegative(worker.carriedAmount)||worker.carriedAmount>(capacities[worker.level]??0)||(worker.carriedAmount===0&&worker.carriedResource!==null)||(worker.carriedAmount>0&&(typeof worker.carriedResource!=="string"||!allowed.includes(worker.carriedResource))))errors.push("invalid processing worker");}
    if(!object(processing.rawReserves)||![processing.rawReserves.wheat,processing.rawReserves.corn,processing.rawReserves.egg].every(finiteNonNegative)||!object(processing.autoSelectionRoundRobin)||![processing.autoSelectionRoundRobin.mill,processing.autoSelectionRoundRobin.bakery].every(finiteNonNegative))errors.push("invalid routing state");
  }

  const network=snapshot.collectionNetwork;
  if(!object(network)||typeof network.hubBuilt!=="boolean"||!["auto","processing-first","barn-first"].includes(network.routingMode)||!object(network.boxes)||!object(network.processingIntake)||!object(network.courier)||!object(network.sourceAgesMs)) errors.push("invalid collection network");
  else {
    for(const id of ["wheat","corn","egg"] as const){const box=network.boxes[id];if(!object(box)||typeof box.built!=="boolean"||!validAmounts(box.amounts)||!finiteNonNegative(box.capacity)||RESOURCE_IDS.reduce((n,r)=>n+box.amounts[r],0)>box.capacity||RESOURCE_IDS.some(r=>r!==id&&box.amounts[r]!==0)||(!box.built&&RESOURCE_IDS.some(r=>box.amounts[r]!==0))||!finiteNonNegative(network.sourceAgesMs[id]))errors.push("invalid collection box");}
    const intake=network.processingIntake;if(!validAmounts(intake.amounts)||!finiteNonNegative(intake.capacity)||RESOURCE_IDS.reduce((n,r)=>n+intake.amounts[r],0)>intake.capacity||intake.amounts.bread!==0||intake.amounts.cornbread!==0||!finiteNonNegative(intake.roundRobinIndex))errors.push("invalid processing intake");
    const courier=network.courier,capacities=[0,10,14,18];if(typeof courier.hired!=="boolean"||![0,1,2,3].includes(courier.level)||courier.hired!==(courier.level>0)||courier.capacity!==capacities[courier.level]||!validAmounts(courier.carried)||RESOURCE_IDS.reduce((n,r)=>n+courier.carried[r],0)>courier.capacity||!["not-hired","idle-at-hub","select-source","moving-to-source","loading","waiting-for-batch","select-destination","moving-to-processing","moving-to-barn","unloading-processing","unloading-barn","returning-to-hub"].includes(courier.stage)||!(courier.sourceId===null||["wheat","corn","egg"].includes(courier.sourceId))||!(courier.destinationId===null||["processing-intake","barn"].includes(courier.destinationId))||!finiteNonNegative(courier.waitMs)||!finiteNonNegative(courier.sourceRoundRobinIndex))errors.push("invalid collection courier");
  }

  const dairy=snapshot.dairy;
  if(!object(dairy)||typeof dairy.pastureUnlocked!=="boolean"||![0,1,2].includes(dairy.pastureLevel)||typeof dairy.barnBuilt!=="boolean"||!Array.isArray(dairy.cows)||dairy.cows.length>3||!finiteNonNegative(dairy.hayRack)||dairy.hayRack>24||!finiteNonNegative(dairy.milkTank)||dairy.milkTank>24||typeof dairy.workshopBuilt!=="boolean"||![0,1,2,3].includes(dairy.workshopLevel)||!finiteNonNegative(dairy.workshopInput)||!object(dairy.workshopOutput)||!finiteNonNegative(dairy.workshopOutput.butter)||!finiteNonNegative(dairy.workshopOutput.cheese)||!finiteNonNegative(dairy.protectedMilk)) errors.push("invalid dairy state");
  else for(const cow of dairy.cows)if(!object(cow)||typeof cow.id!=="string"||typeof cow.producing!=="boolean"||!finiteNonNegativeNumber(cow.productionRemainingMs)||!finiteNonNegative(cow.readyMilk)||!finiteNonNegative(cow.activitySeed)) errors.push("invalid cow state");

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
