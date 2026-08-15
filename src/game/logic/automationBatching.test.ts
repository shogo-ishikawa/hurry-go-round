import { describe, expect, it } from "vitest";
import {
  getCornWorkerHarvestIntervalMs,
  getEggCollectionBatchAmount,
  getLoadableBatchAmount,
  getPoultryFeedBatchAmount,
  getRemainingWorkerCapacity,
  shouldDepartWithBatch,
} from "./automationBatching";

describe("automation batching", () => {
  it("calculates remaining worker capacity safely", () => {
    expect(getRemainingWorkerCapacity(2, 6)).toBe(4);
    expect(getRemainingWorkerCapacity(8, 6)).toBe(0);
  });

  it("loads several source items in one trip without exceeding capacity", () => {
    expect(getLoadableBatchAmount(20, 0, 6)).toBe(6);
    expect(getLoadableBatchAmount(3, 0, 6)).toBe(3);
    expect(getLoadableBatchAmount(20, 4, 6)).toBe(2);
  });

  it("plans one poultry feed trip up to the target and capacity", () => {
    expect(getPoultryFeedBatchAmount(20, 2, 10, 6)).toBe(6);
    expect(getPoultryFeedBatchAmount(20, 8, 10, 6)).toBe(2);
    expect(getPoultryFeedBatchAmount(0, 2, 10, 6)).toBe(0);
  });

  it("collects eggs in batches", () => {
    expect(getEggCollectionBatchAmount(12, 6)).toBe(6);
    expect(getEggCollectionBatchAmount(4, 6)).toBe(4);
  });

  it("waits briefly for a useful transport batch but never waits when full or empty", () => {
    expect(shouldDepartWithBatch(0, 8, 10, 900, 700)).toBe(false);
    expect(shouldDepartWithBatch(8, 8, 10, 0, 700)).toBe(true);
    expect(shouldDepartWithBatch(3, 8, 0, 0, 700)).toBe(true);
    expect(shouldDepartWithBatch(3, 8, 5, 699, 700)).toBe(false);
    expect(shouldDepartWithBatch(3, 8, 5, 700, 700)).toBe(true);
  });

  it("reduces corn harvest interval after field expansion", () => {
    const base = getCornWorkerHarvestIntervalMs(520, 1, 0);
    const expanded = getCornWorkerHarvestIntervalMs(520, 1, 1);
    const maximum = getCornWorkerHarvestIntervalMs(520, 1, 2);
    expect(base).toBe(520);
    expect(expanded).toBeLessThan(base);
    expect(maximum).toBeLessThan(expanded);
  });
});
