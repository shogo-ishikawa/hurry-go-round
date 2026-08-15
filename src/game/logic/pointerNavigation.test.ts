import { describe, expect, it } from "vitest";
import {
  getContinuousDragDirection,
  isContinuousDrag,
  POINTER_DRAG_THRESHOLD,
} from "./pointerNavigation";

describe("pointer navigation", () => {
  it("keeps a short click or tap out of drag mode", () => {
    const direction = getContinuousDragDirection(
      { x: 100, y: 100 },
      { x: 100 + POINTER_DRAG_THRESHOLD - 1, y: 100 },
    );
    expect(direction).toEqual({ x: 0, y: 0 });
    expect(isContinuousDrag(direction)).toBe(false);
  });

  it("returns a normalized direction after the drag threshold", () => {
    const direction = getContinuousDragDirection(
      { x: 100, y: 100 },
      { x: 130, y: 140 },
    );
    expect(Math.hypot(direction.x, direction.y)).toBeCloseTo(1);
    expect(direction.x).toBeCloseTo(0.6);
    expect(direction.y).toBeCloseTo(0.8);
    expect(isContinuousDrag(direction)).toBe(true);
  });

  it("changes direction around the fixed drag origin instead of targeting a world point", () => {
    const right = getContinuousDragDirection(
      { x: 200, y: 200 },
      { x: 260, y: 200 },
    );
    const up = getContinuousDragDirection(
      { x: 200, y: 200 },
      { x: 200, y: 140 },
    );
    expect(right).toEqual({ x: 1, y: 0 });
    expect(up).toEqual({ x: 0, y: -1 });
  });

  it("returns to neutral when the pointer comes back inside the dead zone", () => {
    const direction = getContinuousDragDirection(
      { x: 200, y: 200 },
      { x: 204, y: 203 },
    );
    expect(direction).toEqual({ x: 0, y: 0 });
  });
});
