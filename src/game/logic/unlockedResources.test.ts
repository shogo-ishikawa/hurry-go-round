import {describe,expect,it} from "vitest";
import {createGameState} from "../state/GameState";
import {getUnlockedResourceIds} from "./unlockedResources";
describe("dairy resource gating",()=>{it("unlocks dairy goods only with their facilities",()=>{const base=createGameState();expect(getUnlockedResourceIds(base)).not.toContain("milk");const barn={...base,dairy:{...base.dairy,barnBuilt:true}};expect(getUnlockedResourceIds(barn)).toContain("milk");expect(getUnlockedResourceIds(barn)).not.toContain("butter");expect(getUnlockedResourceIds({...barn,dairy:{...barn.dairy,workshopBuilt:true}})).toEqual(expect.arrayContaining(["milk","butter","cheese"]));});});
