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
    for (const r of [l.inventoryHud, l.economyHud, l.joystick])
      expect(
        isPointNavigationAllowed(r.x + r.width / 2, r.y + r.height / 2, l),
      ).toBe(false);
  });
  it("keeps the economy panel clear of the joystick", () => {
    const { economyHud: e, joystick: j } = calculateInputLayout(w, h);
    const overlap = !(
      e.x + e.width <= j.x ||
      j.x + j.width <= e.x ||
      e.y + e.height <= j.y ||
      j.y + j.height <= e.y
    );
    expect(overlap).toBe(false);
  });
});
