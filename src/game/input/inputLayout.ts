import type { Point } from '../logic/movement';

export interface ViewportSize {
  width: number;
  height: number;
}

export const INPUT_LAYOUT = {
  joystickCenterX: 92,
  joystickBottomMargin: 92,
  joystickHitRadius: 86,
  hudWidth: 250,
  hudHeight: 108,
  tutorialHeight: 92,
  tutorialMaxWidth: 390,
  bottomHintHeight: 78,
} as const;

export function shouldEnableVirtualJoystick(viewportWidth: number, maxTouchPoints: number): boolean {
  return maxTouchPoints > 0 || viewportWidth < 900;
}

export function getJoystickCenter(viewportHeight: number): Point {
  return {
    x: INPUT_LAYOUT.joystickCenterX,
    y: Math.max(70, viewportHeight - INPUT_LAYOUT.joystickBottomMargin),
  };
}

export function isPointOverReservedUi(
  point: Point,
  viewport: ViewportSize,
  joystickEnabled: boolean,
): boolean {
  if (point.x < 0 || point.y < 0 || point.x > viewport.width || point.y > viewport.height) return true;

  if (point.x <= INPUT_LAYOUT.hudWidth && point.y <= INPUT_LAYOUT.hudHeight) return true;

  const tutorialWidth = Math.min(INPUT_LAYOUT.tutorialMaxWidth, Math.max(0, viewport.width - 24));
  if (
    point.y <= INPUT_LAYOUT.tutorialHeight
    && Math.abs(point.x - viewport.width / 2) <= tutorialWidth / 2
  ) return true;

  if (point.x >= viewport.width - 100 && point.y <= 64) return true;

  if (
    point.y >= viewport.height - INPUT_LAYOUT.bottomHintHeight
    && Math.abs(point.x - viewport.width / 2) <= 230
  ) return true;

  if (joystickEnabled) {
    const center = getJoystickCenter(viewport.height);
    if (Math.hypot(point.x - center.x, point.y - center.y) <= INPUT_LAYOUT.joystickHitRadius) return true;
  }

  return false;
}
