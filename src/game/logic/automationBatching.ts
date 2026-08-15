import { getCornFieldHarvestIntervalMultiplier } from "./cornFieldExpansion";

const nonNegativeInteger = (value: number): number =>
  Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;

export function getRemainingWorkerCapacity(carried: number, capacity: number): number {
  return Math.max(0, nonNegativeInteger(capacity) - nonNegativeInteger(carried));
}

export function getLoadableBatchAmount(
  sourceAmount: number,
  carriedAmount: number,
  capacity: number,
): number {
  return Math.min(
    nonNegativeInteger(sourceAmount),
    getRemainingWorkerCapacity(carriedAmount, capacity),
  );
}

export function getPoultryFeedBatchAmount(
  barnCorn: number,
  currentFeed: number,
  targetFeed: number,
  workerCapacity: number,
): number {
  const required = Math.max(
    0,
    nonNegativeInteger(targetFeed) - nonNegativeInteger(currentFeed),
  );
  return Math.min(
    nonNegativeInteger(barnCorn),
    required,
    nonNegativeInteger(workerCapacity),
  );
}

export function getEggCollectionBatchAmount(
  storedEggs: number,
  workerCapacity: number,
): number {
  return Math.min(
    nonNegativeInteger(storedEggs),
    nonNegativeInteger(workerCapacity),
  );
}

export function shouldDepartWithBatch(
  carriedAmount: number,
  capacity: number,
  sourceRemaining: number,
  waitedMs: number,
  departureDelayMs: number,
): boolean {
  const carried = nonNegativeInteger(carriedAmount);
  if (carried <= 0) return false;
  if (carried >= nonNegativeInteger(capacity)) return true;
  if (nonNegativeInteger(sourceRemaining) <= 0) return true;
  return Math.max(0, waitedMs) >= Math.max(0, departureDelayMs);
}

export function getCornWorkerHarvestIntervalMs(
  baseIntervalMs: number,
  workerOperationMultiplier: number,
  cornFieldLevel: number | undefined,
): number {
  const interval =
    Math.max(1, baseIntervalMs) *
    Math.max(0.05, workerOperationMultiplier) *
    getCornFieldHarvestIntervalMultiplier(cornFieldLevel);
  return Math.max(80, Math.round(interval));
}
