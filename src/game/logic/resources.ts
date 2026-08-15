import type { ResourceAmounts, ResourceId } from "../config/resourceDefinitions";

export interface CarriedInventory {
  resource: ResourceId | null;
  count: number;
  capacity: number;
}

export type ResourceTransferFailure = "full" | "empty" | "different-resource";
export type ResourceTransferResult<T> = { value: T; changed: boolean; reason?: ResourceTransferFailure };

export function canSwitchCarriedResource(carried: CarriedInventory, resource: ResourceId): boolean {
  return carried.count === 0 || carried.resource === null || carried.resource === resource;
}

export function canCollectResource(carried: CarriedInventory, resource: ResourceId): boolean {
  return canSwitchCarriedResource(carried, resource) && carried.count < carried.capacity;
}

export function collectResourceOne(carried: CarriedInventory, resource: ResourceId): ResourceTransferResult<CarriedInventory> {
  if (!canSwitchCarriedResource(carried, resource)) return { value: carried, changed: false, reason: "different-resource" };
  if (carried.count >= carried.capacity) return { value: carried, changed: false, reason: "full" };
  return { value: { ...carried, resource, count: carried.count + 1 }, changed: true };
}

export function unloadCarriedResourceOne(carried: CarriedInventory, barn: ResourceAmounts): {
  carried: CarriedInventory; barn: ResourceAmounts; changed: boolean; reason?: "empty";
} {
  if (carried.count <= 0 || carried.resource === null) return { carried, barn, changed: false, reason: "empty" };
  const resource = carried.resource;
  const count = carried.count - 1;
  return {
    carried: { ...carried, count, resource: count === 0 ? null : resource },
    barn: { ...barn, [resource]: barn[resource] + 1 }, changed: true,
  };
}
