import type { Economy } from "../state/GameState";
import type { Inventory } from "./inventory";
export interface SaleState {
  inventory: Inventory;
  economy: Economy;
}
export interface SaleResult {
  state: SaleState;
  sold: boolean;
}
export function sellWheatToCustomer(
  state: SaleState,
  alreadyPurchased: boolean,
): SaleResult {
  if (alreadyPurchased || state.inventory.market <= 0)
    return { state, sold: false };
  return {
    sold: true,
    state: {
      inventory: { ...state.inventory, market: state.inventory.market - 1 },
      economy: {
        ...state.economy,
        tillCoins: state.economy.tillCoins + state.economy.wheatUnitPrice,
        soldUnits: state.economy.soldUnits + 1,
        customersServed: state.economy.customersServed + 1,
      },
    },
  };
}
