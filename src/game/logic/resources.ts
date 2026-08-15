import { RESOURCE_IDS, emptyResourceAmounts, type ResourceAmounts, type ResourceId } from "../config/resourceDefinitions";

export interface CarriedCargo { amounts: ResourceAmounts; capacity: number }
export type CargoFailure = "full" | "empty" | "unavailable";
export interface CargoResult { cargo: CarriedCargo; changed: boolean; reason?: CargoFailure }

export const createCarriedCargo = (capacity = 12): CarriedCargo => ({ amounts: emptyResourceAmounts(), capacity });
export const getCarriedTotal = (cargo: CarriedCargo): number => RESOURCE_IDS.reduce((sum, id) => sum + cargo.amounts[id], 0);
export const getRemainingCargoCapacity = (cargo: CarriedCargo): number => Math.max(0, cargo.capacity - getCarriedTotal(cargo));
export const canAddCargo = (cargo: CarriedCargo, resource: ResourceId): boolean => cargo.amounts[resource] >= 0 && getRemainingCargoCapacity(cargo) > 0;
export function addCargoOne(cargo: CarriedCargo, resource: ResourceId): CargoResult {
  if (!canAddCargo(cargo, resource)) return { cargo, changed: false, reason: "full" };
  return { cargo: { ...cargo, amounts: { ...cargo.amounts, [resource]: cargo.amounts[resource] + 1 } }, changed: true };
}
export function removeCargoOne(cargo: CarriedCargo, resource: ResourceId): CargoResult {
  if (cargo.amounts[resource] <= 0) return { cargo, changed: false, reason: "empty" };
  return { cargo: { ...cargo, amounts: { ...cargo.amounts, [resource]: cargo.amounts[resource] - 1 } }, changed: true };
}
export function transferCargoOne(cargo: CarriedCargo, destination: ResourceAmounts, resource: ResourceId): CargoResult & { destination: ResourceAmounts } {
  const removed = removeCargoOne(cargo, resource);
  return removed.changed ? { ...removed, destination: { ...destination, [resource]: destination[resource] + 1 } } : { ...removed, destination };
}
export const getAvailableCargoResources = (cargo: CarriedCargo): ResourceId[] => RESOURCE_IDS.filter((id) => cargo.amounts[id] > 0);
export function unloadNextCargoOne(cargo: CarriedCargo, barn: ResourceAmounts, after: ResourceId | null = null) {
  const start = after === null ? 0 : (RESOURCE_IDS.indexOf(after) + 1) % RESOURCE_IDS.length;
  for (let offset = 0; offset < RESOURCE_IDS.length; offset++) {
    const resource = RESOURCE_IDS[(start + offset) % RESOURCE_IDS.length]!;
    if (cargo.amounts[resource] > 0) return { ...transferCargoOne(cargo, barn, resource), resource };
  }
  return { cargo, destination: barn, changed: false, reason: "empty" as const, resource: null };
}

// Descriptive aliases retained for call sites while the state has one authoritative cargo owner.
export const collectResourceOne = addCargoOne;
