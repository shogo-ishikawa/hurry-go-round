import { describe, expect, it } from 'vitest';
import {
  getJoystickCenter,
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

  it('blocks HUD and joystick taps but accepts ordinary world taps', () => {
    const viewport = { width: 844, height: 390 };
    expect(isPointOverReservedUi({ x: 80, y: 60 }, viewport, true)).toBe(true);
    expect(isPointOverReservedUi({ x: 98, y: 292 }, viewport, true)).toBe(true);
    expect(isPointOverReservedUi({ x: 500, y: 220 }, viewport, true)).toBe(false);
  });

  it('does not reserve the joystick area when explicitly disabled', () => {
    const viewport = { width: 1440, height: 900 };
    const center = getJoystickCenter(viewport.height);
    expect(isPointOverReservedUi(center, viewport, false)).toBe(false);
  });
});
