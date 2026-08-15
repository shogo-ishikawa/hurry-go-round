import { describe, expect, it } from 'vitest';
import { calculateCameraZoom } from './camera';

describe('responsive camera zoom', () => {
  it('zooms above one on desktop', () => expect(calculateCameraZoom(1440, 900)).toBeGreaterThan(1));
  it('caps large desktop zoom', () => expect(calculateCameraZoom(1920, 1080)).toBe(1.55));
  it.each([[844, 390], [390, 844], [320, 568]])('keeps %d × %d at the minimum', (w, h) => {
    expect(calculateCameraZoom(w, h)).toBe(1);
  });
  it.each([[0, 900], [-1, 10], [Number.NaN, 500], [500, Number.POSITIVE_INFINITY]])('handles invalid dimensions', (w, h) => {
    expect(calculateCameraZoom(w, h)).toBe(1);
  });
});
