import { describe, expect, it } from "vitest";
import { harvestOne, restockMarketOne, unloadOne } from "./inventory";
import { sellWheatToCustomer } from "./market";
import { collectAllTillCoins } from "./economy";
import {
  depositHarvestWorkerCargoOne,
  getAutomationWheatTotal,
  harvestWorkerCollectOne,
  loadTransportWorkerOne,
  playerCollectFromFieldCrateOne,
  unloadTransportWorkerOne,
  type AutomationState,
} from "./workers";
const base = (): AutomationState => ({
  inventory: {
    carried: 0,
    barn: 0,
    market: 0,
    fieldCrate: 0,
    capacity: 12,
    marketCapacity: 8,
    fieldCrateCapacity: 16,
  },
  harvestWorker: { hired: true, carried: 0 },
  transportWorker: { hired: true, carried: 0 },
});
describe("complete automation invariants", () => {
  it("only harvest and sale change total unsold wheat", () => {
    let s = base(),
      total = getAutomationWheatTotal(s);
    s = { ...s, inventory: harvestOne(s.inventory) };
    expect(getAutomationWheatTotal(s)).toBe(total + 1);
    total++;
    s = harvestWorkerCollectOne(s, 4).state;
    expect(getAutomationWheatTotal(s)).toBe(total + 1);
    total++;
    for (const transfer of [
      depositHarvestWorkerCargoOne,
      playerCollectFromFieldCrateOne,
    ] as const) {
      s = transfer(s).state;
      expect(getAutomationWheatTotal(s)).toBe(total);
    }
    s = { ...s, inventory: unloadOne(s.inventory) };
    expect(getAutomationWheatTotal(s)).toBe(total);
    s = { ...s, inventory: restockMarketOne(s.inventory) };
    expect(getAutomationWheatTotal(s)).toBe(total);
    const sale = sellWheatToCustomer(
      {
        inventory: s.inventory,
        economy: {
          walletCoins: 0,
          tillCoins: 0,
          wheatUnitPrice: 2,
          soldUnits: 0,
          customersServed: 0, customersLeftWithoutPurchase: 0,
        },
      },
      false,
    );
    expect(sale.sold).toBe(true);
    expect(
      getAutomationWheatTotal({ ...s, inventory: sale.state.inventory }),
    ).toBe(total - 1);
  });
  it("transport transfers and till collection conserve their totals", () => {
    let s = { ...base(), inventory: { ...base().inventory, fieldCrate: 2 } };
    const total = getAutomationWheatTotal(s);
    s = loadTransportWorkerOne(s, 6).state;
    s = unloadTransportWorkerOne(s).state;
    expect(getAutomationWheatTotal(s)).toBe(total);
    const e = {
        walletCoins: 2,
        tillCoins: 5,
        wheatUnitPrice: 2,
        soldUnits: 1,
        customersServed: 1,
      },
      after = collectAllTillCoins(e).economy;
    expect(after.walletCoins + after.tillCoins).toBe(
      e.walletCoins + e.tillCoins,
    );
  });
});
