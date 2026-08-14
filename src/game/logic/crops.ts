export type CropState = 'growing' | 'ready' | 'harvested';
export interface CropModel { state: CropState; elapsedMs: number; regrowMs: number }
export interface HarvestResult { crop: CropModel; awarded: boolean }

export function harvestCrop(crop: CropModel): HarvestResult {
  if (crop.state !== 'ready') return { crop, awarded: false };
  return { crop: { ...crop, state: 'harvested', elapsedMs: 0 }, awarded: true };
}

export function advanceCrop(crop: CropModel, deltaMs: number): CropModel {
  if (crop.state === 'ready' || !Number.isFinite(deltaMs) || deltaMs <= 0) return crop;
  const elapsedMs = crop.elapsedMs + deltaMs;
  if (elapsedMs >= crop.regrowMs) return { ...crop, state: 'ready', elapsedMs: 0 };
  const state: CropState = elapsedMs >= crop.regrowMs * 0.52 ? 'growing' : 'harvested';
  return { ...crop, state, elapsedMs };
}
