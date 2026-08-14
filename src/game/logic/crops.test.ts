import { describe, expect, it } from 'vitest';
import { advanceCrop, harvestCrop, type CropModel } from './crops';
const ready = (): CropModel => ({ state: 'ready', elapsedMs: 0, regrowMs: 8000 });
describe('crop lifecycle', () => {
  it('awards a ready crop exactly once', () => {
    const first = harvestCrop(ready());
    expect(first.awarded).toBe(true);
    expect(harvestCrop(first.crop).awarded).toBe(false);
  });
  it('progresses through visible regrowth and returns ready', () => {
    const cut = harvestCrop(ready()).crop;
    expect(advanceCrop(cut, 4200).state).toBe('growing');
    expect(advanceCrop(cut, 8000).state).toBe('ready');
  });
  it('is stable across variable frame steps without rewards', () => {
    let crop = harvestCrop(ready()).crop;
    for (const step of [17, 1200, 333, 2450, 4000]) crop = advanceCrop(crop, step);
    expect(crop.state).toBe('ready');
    expect(harvestCrop(crop).awarded).toBe(true);
  });
});
