import type { ResourceAmounts, ResourceId } from "../config/resourceDefinitions";
import { RESOURCE_UNIT_PRICES } from "../config/resourceDefinitions";

export function restockMarketResourceOne(resource: ResourceId, barn: ResourceAmounts, market: ResourceAmounts, capacity: ResourceAmounts) {
  if (barn[resource] <= 0) return { barn, market, changed: false, reason: "empty" as const };
  if (market[resource] >= capacity[resource]) return { barn, market, changed: false, reason: "full" as const };
  return { barn: { ...barn, [resource]: barn[resource] - 1 }, market: { ...market, [resource]: market[resource] + 1 }, changed: true };
}

export function sellRequestedResource(resource: ResourceId, market: ResourceAmounts, tillCoins: number, sold: ResourceAmounts, alreadyPurchased: boolean) {
  if (alreadyPurchased) return { market, tillCoins, sold, changed: false, reason: "already-purchased" as const };
  if (market[resource] <= 0) return { market, tillCoins, sold, changed: false, reason: "out-of-stock" as const };
  return { market: { ...market, [resource]: market[resource] - 1 }, tillCoins: tillCoins + RESOURCE_UNIT_PRICES[resource], sold: { ...sold, [resource]: sold[resource] + 1 }, changed: true };
}

export function getUnlockedCustomerResources(eastUnlocked: boolean, southUnlocked: boolean): ResourceId[] {
  return southUnlocked ? ["wheat", "corn", "egg"] : eastUnlocked ? ["wheat", "corn"] : ["wheat"];
}
