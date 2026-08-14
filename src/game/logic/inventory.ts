export interface Inventory { carried: number; barn: number; capacity: number }

export function harvestOne(inventory: Inventory): Inventory {
  if (inventory.carried >= inventory.capacity) return inventory;
  return { ...inventory, carried: inventory.carried + 1 };
}

export function unloadOne(inventory: Inventory): Inventory {
  if (inventory.carried <= 0) return inventory;
  return { ...inventory, carried: inventory.carried - 1, barn: inventory.barn + 1 };
}
