import { describe, expect, it } from "vitest";
import { collectResourceOne, unloadCarriedResourceOne, type CarriedInventory } from "./resources";
const empty = (capacity = 12): CarriedInventory => ({ resource: null, count: 0, capacity });
describe("multi-resource carrying", () => {
  it("collects one type without mixing and respects capacity", () => { const wheat = collectResourceOne(empty(), "wheat").value; expect(collectResourceOne(wheat, "corn")).toMatchObject({ changed: false, reason: "different-resource" }); expect(collectResourceOne({ resource: "wheat", count: 12, capacity: 12 }, "wheat").changed).toBe(false); });
  it("clears the resource after unloading the last item", () => { const result = unloadCarriedResourceOne({ resource: "egg", count: 1, capacity: 18 }, { wheat: 2, corn: 3, egg: 4 }); expect(result.carried).toEqual({ resource: null, count: 0, capacity: 18 }); expect(result.barn.egg).toBe(5); });
});
