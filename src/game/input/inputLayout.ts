import type { Point } from '../logic/movement';

export interface ViewportSize {
  width: number;
  height: number;
}

export interface ReservedSize {
  width: number;
  height: number;
}

export const INPUT_LAYOUT = {
  joystickCenterX: 98,
  joystickBottomMargin: 98,
  joystickHitRadius: 92,
  compactHudBreakpoint: 620,
  hudWideWidth: 326,
  hudWideHeight: 128,
  hudCompactWidth: 248,
  hudCompactHeight: 150,
  tutorialWideY: 42,
  tutorialCompactY: 178,
  tutorialHeight: 76,
  tutorialMaxWidth: 390,
  bottomHintHeight: 78,
} as const;

export function shouldEnableVirtualJoystick(viewportWidth: number, maxTouchPoints: number): boolean {
  return Number.isFinite(viewportWidth)
    && viewportWidth > 0
    && Number.isFinite(maxTouchPoints)
    && maxTouchPoints >= 0;
}

export function isCompactHud(viewportWidth: number): boolean {
  return viewportWidth < INPUT_LAYOUT.compactHudBreakpoint;
}

export function getHudReservedSize(viewportWidth: number): ReservedSize {
  return isCompactHud(viewportWidth)
    ? { width: INPUT_LAYOUT.hudCompactWidth, height: INPUT_LAYOUT.hudCompactHeight }
    : { width: INPUT_LAYOUT.hudWideWidth, height: INPUT_LAYOUT.hudWideHeight };
}

export function getTutorialCenter(viewport: ViewportSize): Point {
  return {
    x: viewport.width / 2,
    y: isCompactHud(viewport.width)
      ? INPUT_LAYOUT.tutorialCompactY
      : INPUT_LAYOUT.tutorialWideY,
  };
}

export function getJoystickCenter(viewportHeight: number): Point {
  return {
    x: INPUT_LAYOUT.joystickCenterX,
    y: Math.max(76, viewportHeight - INPUT_LAYOUT.joystickBottomMargin),
  };
}

export function isPointOverReservedUi(
  point: Point,
  viewport: ViewportSize,
  joystickEnabled: boolean,
): boolean {
  if (point.x < 0 || point.y < 0 || point.x > viewport.width || point.y > viewport.height) return true;

  const hud = getHudReservedSize(viewport.width);
  if (point.x <= hud.width && point.y <= hud.height) return true;

  const tutorialCenter = getTutorialCenter(viewport);
  const tutorialWidth = Math.min(
    INPUT_LAYOUT.tutorialMaxWidth,
    Math.max(0, viewport.width - 24),
  );
  if (
    Math.abs(point.y - tutorialCenter.y) <= INPUT_LAYOUT.tutorialHeight / 2
    && Math.abs(point.x - tutorialCenter.x) <= tutorialWidth / 2
  ) return true;

  if (point.x >= viewport.width - 100 && point.y <= 64) return true;

  if (
    point.y >= viewport.height - INPUT_LAYOUT.bottomHintHeight
    && Math.abs(point.x - viewport.width / 2) <= 260
  ) return true;

  if (joystickEnabled) {
    const center = getJoystickCenter(viewport.height);
    if (Math.hypot(point.x - center.x, point.y - center.y) <= INPUT_LAYOUT.joystickHitRadius) return true;
  }

  return false;
}
