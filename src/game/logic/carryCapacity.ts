export type CarryLoadLevel = 'empty' | 'normal' | 'near-full' | 'full';

export interface CarryCapacityView {
  carried: number;
  capacity: number;
  remaining: number;
  ratio: number;
  level: CarryLoadLevel;
}

function toNonNegativeInteger(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
}

export function getCarryCapacityView(
  carriedValue: number,
  capacityValue: number,
): CarryCapacityView {
  const capacity = toNonNegativeInteger(capacityValue);
  const carried = Math.min(capacity, toNonNegativeInteger(carriedValue));
  const remaining = capacity - carried;
  const ratio = capacity > 0 ? carried / capacity : 0;

  let level: CarryLoadLevel = 'normal';
  if (carried === 0) level = 'empty';
  else if (capacity > 0 && carried === capacity) level = 'full';
  else if (ratio >= 0.75) level = 'near-full';

  return { carried, capacity, remaining, ratio, level };
}
