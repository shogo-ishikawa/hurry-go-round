import { describe, expect, it } from "vitest";
import { harvestCrop, type CropModel } from "./crops";
import {
  decideHarvestWorkerAvailability,
  decideTransportLoad,
  depositHarvestWorkerCargoOne,
  getAutomationWheatTotal,
  harvestWorkerCollectOne,
  loadTransportWorkerOne,
  playerCollectFromFieldCrateOne,
  unloadTransportWorkerOne,
  type AutomationState,
} from "./workers";
const make = (): AutomationState => ({
  inventory: {
    carried: 0,
    barn: 0,
    market: 0,
    fieldCrate: 0,
    capacity: 12,
    marketCapacity: 8,
    fieldCrateCapacity: 16,
  },
  harvestWorker: { hired: false, carried: 0 },
  transportWorker: { hired: false, carried: 0 },
});
describe("worker and field-crate transfers", () => {
  it("harvest worker cannot operate before hiring", () =>
    expect(harvestWorkerCollectOne(make(), 4).changed).toBe(false));
  it("a ready crop and worker award exactly once", () => {
    const crop: CropModel = { state: "ready", elapsedMs: 0, regrowMs: 8000 };
    const first = harvestCrop(crop),
      second = harvestCrop(first.crop);
    let s = { ...make(), harvestWorker: { hired: true, carried: 0 } };
    if (first.awarded) s = harvestWorkerCollectOne(s, 4).state;
    expect(s.harvestWorker.carried).toBe(1);
    expect(second.awarded).toBe(false);
  });
  it("never exceeds harvest carry capacity", () => {
    const s = { ...make(), harvestWorker: { hired: true, carried: 4 } };
    expect(harvestWorkerCollectOne(s, 4).changed).toBe(false);
  });
  it("deposits one and conserves wheat", () => {
    const s = { ...make(), harvestWorker: { hired: true, carried: 2 } };
    const r = depositHarvestWorkerCargoOne(s);
    expect(r.state.harvestWorker.carried).toBe(1);
    expect(r.state.inventory.fieldCrate).toBe(1);
    expect(getAutomationWheatTotal(r.state)).toBe(getAutomationWheatTotal(s));
  });
  it("does not deposit into a full crate", () => {
    const s = {
      ...make(),
      inventory: { ...make().inventory, fieldCrate: 16 },
      harvestWorker: { hired: true, carried: 1 },
    };
    expect(depositHarvestWorkerCargoOne(s).changed).toBe(false);
  });
  it("player collects one unless crate empty or pack full", () => {
    const s = { ...make(), inventory: { ...make().inventory, fieldCrate: 2 } };
    const r = playerCollectFromFieldCrateOne(s);
    expect(r.state.inventory).toMatchObject({ fieldCrate: 1, carried: 1 });
    expect(playerCollectFromFieldCrateOne(make()).changed).toBe(false);
    expect(
      playerCollectFromFieldCrateOne({
        ...s,
        inventory: { ...s.inventory, carried: 12 },
      }).changed,
    ).toBe(false);
  });
  it("player and transport sequential collection never goes negative", () => {
    let s = {
      ...make(),
      inventory: { ...make().inventory, fieldCrate: 2 },
      transportWorker: { hired: true, carried: 0 },
    };
    s = playerCollectFromFieldCrateOne(s).state;
    s = loadTransportWorkerOne(s, 6).state;
    expect(s.inventory.fieldCrate).toBe(0);
    expect(loadTransportWorkerOne(s, 6).changed).toBe(false);
  });
  it("transport requires hiring and respects capacity", () => {
    const s = { ...make(), inventory: { ...make().inventory, fieldCrate: 2 } };
    expect(loadTransportWorkerOne(s, 6).changed).toBe(false);
    const full = { ...s, transportWorker: { hired: true, carried: 6 } };
    expect(loadTransportWorkerOne(full, 6).changed).toBe(false);
  });
  it("transport unloads one to barn and conserves wheat", () => {
    const s = { ...make(), transportWorker: { hired: true, carried: 2 } };
    const r = unloadTransportWorkerOne(s);
    expect(r.state.transportWorker.carried).toBe(1);
    expect(r.state.inventory.barn).toBe(1);
    expect(getAutomationWheatTotal(r.state)).toBe(2);
    expect(
      unloadTransportWorkerOne({
        ...s,
        transportWorker: { hired: true, carried: 0 },
      }).changed,
    ).toBe(false);
  });
  it("worker harvest is the only transfer that increases total", () => {
    const s = { ...make(), harvestWorker: { hired: true, carried: 0 } };
    expect(getAutomationWheatTotal(harvestWorkerCollectOne(s, 4).state)).toBe(
      getAutomationWheatTotal(s) + 1,
    );
  });
  it("waits with no ready crop and resumes when one is ready", () => {
    expect(decideHarvestWorkerAvailability(true, 0, 0, 4)).toBe(
      "waiting-for-crops",
    );
    expect(decideHarvestWorkerAvailability(true, 1, 0, 4)).toBe("seeking-crop");
    expect(decideHarvestWorkerAvailability(false, 1, 0, 4)).toBe("not-hired");
  });
  it("sends loaded transport to barn and otherwise waits or loads", () => {
    expect(decideTransportLoad(0, 0, 6)).toBe("idle-at-crate");
    expect(decideTransportLoad(2, 0, 6)).toBe("loading");
    expect(decideTransportLoad(0, 1, 6)).toBe("moving-to-barn");
  });
});
