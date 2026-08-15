import type { QueueCustomer } from "./customerQueue";

export interface CustomerPatienceState { stockoutWaitMs: number; stockoutPatienceMs: number; expired: boolean }
export const createCustomerPatienceState = (stockoutPatienceMs: number): CustomerPatienceState => ({ stockoutWaitMs: 0, stockoutPatienceMs: Math.max(0, stockoutPatienceMs), expired: false });
export function startOrAdvanceStockoutWait(state: CustomerPatienceState, deltaMs: number, conditions: { isFront: boolean; atPurchasePosition: boolean; stockAvailable: boolean; purchased: boolean }): CustomerPatienceState {
  if (state.expired || !conditions.isFront || !conditions.atPurchasePosition || conditions.stockAvailable || conditions.purchased) return conditions.stockAvailable ? resetStockoutWait(state) : state;
  const stockoutWaitMs = Math.min(state.stockoutPatienceMs, state.stockoutWaitMs + Math.max(0, deltaMs));
  return { ...state, stockoutWaitMs, expired: stockoutWaitMs >= state.stockoutPatienceMs };
}
export const resetStockoutWait = (state: CustomerPatienceState): CustomerPatienceState => state.stockoutWaitMs === 0 && !state.expired ? state : { ...state, stockoutWaitMs: 0, expired: false };
export const hasCustomerPatienceExpired = (state: CustomerPatienceState): boolean => state.expired || state.stockoutWaitMs >= state.stockoutPatienceMs;
export function advanceQueueAfterDeparture<T extends QueueCustomer>(queue: readonly T[]): T[] { return queue.slice(1).map((customer, index) => ({ ...customer, phase: index === 0 ? "buying" : "queueing" })) as T[]; }
export function abandonFrontCustomer<T extends QueueCustomer>(queue: readonly T[], customersLeftWithoutPurchase: number) {
  const front = queue[0];
  if (!front || front.purchased || front.phase === "leaving-disappointed" || front.phase === "leaving") return { queue: [...queue], departed: null, customersLeftWithoutPurchase, changed: false };
  return { queue: advanceQueueAfterDeparture(queue), departed: { ...front, phase: "leaving-disappointed" as const }, customersLeftWithoutPurchase: customersLeftWithoutPurchase + 1, changed: true };
}
