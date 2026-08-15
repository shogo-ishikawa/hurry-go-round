export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}
export interface InputLayout {
  joystick: Rect;
  inventoryHud: Rect;
  economyHud: Rect;
  automationHud: Rect;
  tutorial: Rect;
}
export function calculateInputLayout(
  width: number,
  height: number,
): InputLayout {
  const w = Math.max(0, width),
    h = Math.max(0, height),
    narrow = w < 520;
  return {
    joystick: { x: 16, y: Math.max(0, h - 168), width: 168, height: 168 },
    inventoryHud: { x: 12, y: 12, width: narrow ? 174 : 225, height: 77 },
    economyHud: {
      x: narrow ? 12 : Math.max(12, w - 237),
      y: narrow ? 96 : 12,
      width: narrow ? 174 : 225,
      height: 101,
    },
    automationHud: {
      x: narrow ? 12 : Math.max(196, (w - 360) / 2),
      y: narrow ? 204 : 130,
      width: narrow ? 174 : 360,
      height: narrow ? 103 : 112,
    },
    tutorial: {
      x: narrow ? 190 : 250,
      y: 10,
      width: Math.max(0, w - (narrow ? 202 : 500)),
      height: 72,
    },
  };
}
export function isPointNavigationAllowed(
  x: number,
  y: number,
  l: InputLayout,
): boolean {
  return !Object.values(l).some(
    (r) => x >= r.x && x <= r.x + r.width && y >= r.y && y <= r.y + r.height,
  );
}
