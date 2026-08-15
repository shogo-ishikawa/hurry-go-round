export type CropState = "growing" | "ready" | "harvested";
export interface CornCropModel { state: CropState; elapsedMs: number; regrowMs: number; }
export function harvestCornCrop(model: CornCropModel): { model: CornCropModel; harvested: boolean } {
  return model.state !== "ready" ? { model, harvested: false } : { model: { ...model, state: "harvested", elapsedMs: 0 }, harvested: true };
}
export function tickCornCrop(model: CornCropModel, deltaMs: number): CornCropModel {
  if (model.state === "ready") return model;
  const elapsedMs = model.elapsedMs + Math.max(0, deltaMs);
  if (model.state === "harvested" && elapsedMs >= model.regrowMs * 0.3) return { ...model, state: "growing", elapsedMs };
  if (elapsedMs >= model.regrowMs) return { ...model, state: "ready", elapsedMs: model.regrowMs };
  return { ...model, elapsedMs };
}
