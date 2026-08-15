import { describe, expect, it } from "vitest";
import { harvestCornCrop, tickCornCrop } from "./cornCrop";
describe("corn crop", () => { it("harvests ready corn only once and regrows through growing", () => { const ready = { state: "ready" as const, elapsedMs: 1000, regrowMs: 1000 }; const first = harvestCornCrop(ready); expect(first.harvested).toBe(true); expect(harvestCornCrop(first.model).harvested).toBe(false); const growing = tickCornCrop(first.model, 300); expect(growing.state).toBe("growing"); expect(tickCornCrop(growing, 700).state).toBe("ready"); }); });
