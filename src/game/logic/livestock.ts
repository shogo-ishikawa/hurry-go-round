import type { CarriedInventory } from "./resources";
import { collectResourceOne } from "./resources";

export interface LivestockInventory { feed: number; feedCapacity: number; eggs: number; eggCapacity: number; }

export function depositCornFeedOne(carried: CarriedInventory, livestock: LivestockInventory) {
  if (carried.resource !== "corn" || carried.count <= 0) return { carried, livestock, changed: false, reason: "corn-required" as const };
  if (livestock.feed >= livestock.feedCapacity) return { carried, livestock, changed: false, reason: "full" as const };
  const count = carried.count - 1;
  return { carried: { ...carried, count, resource: count === 0 ? null : "corn" as const }, livestock: { ...livestock, feed: livestock.feed + 1 }, changed: true };
}

export function produceEggOne(livestock: LivestockInventory) {
  if (livestock.feed <= 0) return { livestock, changed: false, reason: "no-feed" as const };
  if (livestock.eggs >= livestock.eggCapacity) return { livestock, changed: false, reason: "full" as const };
  return { livestock: { ...livestock, feed: livestock.feed - 1, eggs: livestock.eggs + 1 }, changed: true };
}

export function collectEggOne(carried: CarriedInventory, livestock: LivestockInventory) {
  if (livestock.eggs <= 0) return { carried, livestock, changed: false, reason: "empty" as const };
  const result = collectResourceOne(carried, "egg");
  if (!result.changed) return { carried, livestock, changed: false, reason: result.reason };
  return { carried: result.value, livestock: { ...livestock, eggs: livestock.eggs - 1 }, changed: true };
}
