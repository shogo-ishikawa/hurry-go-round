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
  tutorial: Rect;
}
export function calculateInputLayout(
  width: number,
  height: number,
): InputLayout {
  const narrow = width < 520;
  return {
    joystick: { x: 16, y: Math.max(0, height - 168), width: 168, height: 168 },
    inventoryHud: { x: 12, y: 12, width: narrow ? 174 : 225, height: 77 },
    economyHud: {
      x: narrow ? 12 : Math.max(12, width - 237),
      y: narrow ? 96 : 12,
      width: narrow ? 174 : 225,
      height: 101,
    },
    tutorial: {
      x: narrow ? 190 : 250,
      y: 10,
      width: Math.max(0, width - (narrow ? 202 : 500)),
      height: 72,
    },
  };
}
export function isPointNavigationAllowed(
  x: number,
  y: number,
  layout: InputLayout,
): boolean {
  return !Object.values(layout).some(
    (r) => x >= r.x && x <= r.x + r.width && y >= r.y && y <= r.y + r.height,
  );
}
