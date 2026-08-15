import { describe, expect, it } from "vitest";
import { calculateInputLayout, isPointNavigationAllowed } from "./inputLayout";
describe.each([
  [1440, 900],
  [1920, 1080],
  [844, 390],
  [390, 844],
  [320, 568],
])("input layout %d × %d", (w, h) => {
  it("reserves both HUDs and joystick from point movement", () => {
    const l = calculateInputLayout(w, h);
    for (const r of [l.inventoryHud, l.economyHud, l.automationHud, l.joystick])
      expect(
        isPointNavigationAllowed(r.x + r.width / 2, r.y + r.height / 2, l),
      ).toBe(false);
  });
  it("keeps HUD panels clear of the joystick", () => {
    const {
      economyHud: e,
      automationHud: a,
      joystick: j,
    } = calculateInputLayout(w, h);
    const overlap = !(
      e.x + e.width <= j.x ||
      j.x + j.width <= e.x ||
      e.y + e.height <= j.y ||
      j.y + j.height <= e.y
    );
    expect(overlap).toBe(false);
    const automationOverlap = !(
      a.x + a.width <= j.x ||
      j.x + j.width <= a.x ||
      a.y + a.height <= j.y ||
      j.y + j.height <= a.y
    );
    expect(automationOverlap).toBe(false);
    for (const r of [e, a, j]) {
      expect(r.width).toBeGreaterThanOrEqual(0);
      expect(r.height).toBeGreaterThanOrEqual(0);
    }
  });
  it("keeps every HUD panel inside the viewport", () => {
    const l = calculateInputLayout(w, h);
    for (const r of [l.inventoryHud, l.economyHud, l.automationHud]) {
      expect(r.x).toBeGreaterThanOrEqual(0);
      expect(r.y).toBeGreaterThanOrEqual(0);
      expect(r.x + r.width).toBeLessThanOrEqual(w);
      expect(r.y + r.height).toBeLessThanOrEqual(h);
    }
    expect(l.automationHud.width).toBeGreaterThanOrEqual(174);
  });
});
