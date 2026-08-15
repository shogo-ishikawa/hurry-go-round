import { describe, expect, it } from "vitest";
import { addCargoOne, createCarriedCargo, getCarriedTotal, removeCargoOne, unloadNextCargoOne } from "./resources";
describe("mixed cargo", () => {
  it("coexists and shares capacity", () => { let cargo=createCarriedCargo(12); cargo=addCargoOne(cargo,"wheat").cargo; cargo=addCargoOne(cargo,"corn").cargo; cargo=addCargoOne(cargo,"egg").cargo; expect(cargo.amounts).toEqual({wheat:1,corn:1,egg:1}); expect(getCarriedTotal(cargo)).toBe(3); });
  it("preserves unrelated resources and unloads round-robin",()=>{ const cargo={amounts:{wheat:2,corn:1,egg:1},capacity:12}; expect(removeCargoOne(cargo,"corn").cargo.amounts).toEqual({wheat:2,corn:0,egg:1}); const first=unloadNextCargoOne(cargo,{wheat:0,corn:0,egg:0},"wheat"); expect(first.resource).toBe("corn"); const second=unloadNextCargoOne(first.cargo,first.destination,first.resource); expect(second.resource).toBe("egg"); });
  it("supports every upgrade capacity without overflow",()=>{for(const capacity of [12,18,24]){let cargo=createCarriedCargo(capacity);for(let i=0;i<capacity+1;i++)cargo=addCargoOne(cargo,"wheat").cargo;expect(getCarriedTotal(cargo)).toBe(capacity);}});
});
