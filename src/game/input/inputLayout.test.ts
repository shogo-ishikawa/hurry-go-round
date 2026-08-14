import { describe, expect, it } from 'vitest';
import {
  getHudReservedSize,
  getJoystickCenter,
  getTutorialCenter,
  isCompactHud,
  isPointOverReservedUi,
  shouldEnableVirtualJoystick,
} from './inputLayout';

describe('input layout', () => {
  it('keeps the joystick enabled on desktop, touch devices, and narrow viewports', () => {
    expect(shouldEnableVirtualJoystick(1440, 0)).toBe(true);
    expect(shouldEnableVirtualJoystick(844, 0)).toBe(true);
    expect(shouldEnableVirtualJoystick(1440, 1)).toBe(true);
    expect(shouldEnableVirtualJoystick(0, 0)).toBe(false);
  });

  it('places the joystick above the lower-left safe margin', () => {
    expect(getJoystickCenter(390)).toEqual({ x: 98, y: 292 });
  });

  it('switches to a taller compact HUD and moves tutorial guidance below it', () => {
    expect(isCompactHud(390)).toBe(true);
    expect(getHudReservedSize(390)).toEqual({ width: 248, height: 150 });
    expect(getTutorialCenter({ width: 390, height: 844 })).toEqual({ x: 195, y: 178 });

    expect(isCompactHud(844)).toBe(false);
    expect(getHudReservedSize(844)).toEqual({ width: 326, height: 128 });
    expect(getTutorialCenter({ width: 844, height: 390 })).toEqual({ x: 422, y: 42 });
  });

  it('blocks HUD, tutorial, and joystick taps but accepts ordinary world taps', () => {
    const viewport = { width: 844, height: 390 };
    expect(isPointOverReservedUi({ x: 300, y: 110 }, viewport, true)).toBe(true);
    expect(isPointOverReservedUi({ x: 422, y: 42 }, viewport, true)).toBe(true);
    expect(isPointOverReservedUi({ x: 98, y: 292 }, viewport, true)).toBe(true);
    expect(isPointOverReservedUi({ x: 500, y: 220 }, viewport, true)).toBe(false);
  });

  it('reserves the relocated tutorial on a narrow portrait viewport', () => {
    const viewport = { width: 390, height: 844 };
    expect(isPointOverReservedUi({ x: 195, y: 178 }, viewport, true)).toBe(true);
    expect(isPointOverReservedUi({ x: 320, y: 260 }, viewport, true)).toBe(false);
  });

  it('does not reserve the joystick area when explicitly disabled', () => {
    const viewport = { width: 1440, height: 900 };
    const center = getJoystickCenter(viewport.height);
    expect(isPointOverReservedUi(center, viewport, false)).toBe(false);
  });
});
