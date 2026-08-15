import type { CarriedCargo } from "./resources";
import { addCargoOne, removeCargoOne } from "./resources";

export interface LivestockInventory { feed: number; feedCapacity: number; eggs: number; eggCapacity: number; }

export function depositCornFeedOne(carried: CarriedCargo, livestock: LivestockInventory) {
  if (carried.amounts.corn <= 0) return { carried, livestock, changed: false, reason: "corn-required" as const };
  if (livestock.feed >= livestock.feedCapacity) return { carried, livestock, changed: false, reason: "full" as const };
  const removed = removeCargoOne(carried, "corn");
  return { carried: removed.cargo, livestock: { ...livestock, feed: livestock.feed + 1 }, changed: true };
}

export function produceEggOne(livestock: LivestockInventory) {
  if (livestock.feed <= 0) return { livestock, changed: false, reason: "no-feed" as const };
  if (livestock.eggs >= livestock.eggCapacity) return { livestock, changed: false, reason: "full" as const };
  return { livestock: { ...livestock, feed: livestock.feed - 1, eggs: livestock.eggs + 1 }, changed: true };
}

export function collectEggOne(carried: CarriedCargo, livestock: LivestockInventory) {
  if (livestock.eggs <= 0) return { carried, livestock, changed: false, reason: "empty" as const };
  const result = addCargoOne(carried, "egg");
  if (!result.changed) return { carried, livestock, changed: false, reason: result.reason };
  return { carried: result.cargo, livestock: { ...livestock, eggs: livestock.eggs - 1 }, changed: true };
}
