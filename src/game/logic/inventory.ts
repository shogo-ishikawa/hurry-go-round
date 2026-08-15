export interface Inventory {
  carried: number;
  barn: number;
  market: number;
  fieldCrate: number;
  capacity: number;
  marketCapacity: number;
  fieldCrateCapacity: number;
}
export function harvestOne(value: Inventory): Inventory {
  return value.carried >= value.capacity
    ? value
    : { ...value, carried: value.carried + 1 };
}
export function unloadOne(value: Inventory): Inventory {
  return value.carried <= 0
    ? value
    : { ...value, carried: value.carried - 1, barn: value.barn + 1 };
}
export function restockMarketOne(value: Inventory): Inventory {
  if (value.barn <= 0 || value.market >= value.marketCapacity) return value;
  return { ...value, barn: value.barn - 1, market: value.market + 1 };
}
