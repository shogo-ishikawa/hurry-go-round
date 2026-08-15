import { describe, expect, it } from "vitest";
import { collectEggOne, depositCornFeedOne, produceEggOne } from "./livestock";
import { createCarriedCargo, addCargoOne } from "./resources";
const livestock = { feed: 0, feedCapacity: 12, eggs: 0, eggCapacity: 12 };
describe("first livestock",()=>{it("feeds with corn only",()=>{const mixed=addCargoOne(addCargoOne(createCarriedCargo(),"wheat").cargo,"corn").cargo;const r=depositCornFeedOne(mixed,livestock);expect(r.carried.amounts).toEqual({wheat:1,corn:0,egg:0,flour:0,cornmeal:0,bread:0,cornbread:0});expect(r.livestock.feed).toBe(1);});it("converts feed into egg",()=>expect(produceEggOne({...livestock,feed:1})).toMatchObject({changed:true,livestock:{feed:0,eggs:1}}));it("collects eggs into mixed cargo",()=>{const cargo=addCargoOne(createCarriedCargo(),"wheat").cargo;expect(collectEggOne(cargo,{...livestock,eggs:1}).carried.amounts).toEqual({wheat:1,corn:0,egg:1,flour:0,cornmeal:0,bread:0,cornbread:0});});});
