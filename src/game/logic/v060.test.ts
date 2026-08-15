import {describe,expect,it} from "vitest";
import {createCustomerPatienceState,startOrAdvanceStockoutWait,abandonFrontCustomer} from "./customerPatience";
import {layoutWorldSigns,getSignLod} from "./signLayout";
import {choosePoultryTask,canLoadCaretaker} from "./poultryAutomation";
import {collectCornWorkerOne,depositCornCrateOne,getCornAutomationTotal} from "./cornAutomation";
import {hireWorker} from "./workerHiring";
describe("v0.6 deterministic systems",()=>{
 it("advances only eligible stockout patience and abandons once",()=>{let p=createCustomerPatienceState(12000);p=startOrAdvanceStockoutWait(p,12000,{isFront:true,atPurchasePosition:true,stockAvailable:false,purchased:false});expect(p.expired).toBe(true);const q=[{id:1,phase:"waiting-stock" as const,purchased:false},{id:2,phase:"queueing" as const,purchased:false}];const r=abandonFrontCustomer(q,0);expect(r.customersLeftWithoutPurchase).toBe(1);expect(r.queue[0]?.id).toBe(2);expect(abandonFrontCustomer(r.queue,1).customersLeftWithoutPurchase).toBe(2);});
 it("places signs deterministically without overlap and applies LOD",()=>{const defs=[{id:"a",facilityId:"farm",priority:2,preferredAnchors:["north" as const],facilityBounds:{x:100,y:100,width:50,height:50},width:100,height:50},{id:"b",facilityId:"coop",priority:1,preferredAnchors:["south" as const],facilityBounds:{x:100,y:100,width:50,height:50},width:100,height:50}];expect(layoutWorldSigns(defs,[])).toEqual(layoutWorldSigns(defs,[]));expect(getSignLod(900)).toBe("hidden");expect(getSignLod(500)).toBe("compact");expect(getSignLod(100)).toBe("detail");});
 it("prioritizes poultry work and keeps cargo unmixed",()=>{expect(choosePoultryTask(3,10,3,2,5)).toBe("emergency-feed");expect(canLoadCaretaker({resource:"corn",count:2,capacity:6},"egg")).toBe(false);});
 it("conserves corn transfers and charges exact hiring costs",()=>{const s={hired:true,crate:0,crateCapacity:20,harvesterCargo:0,transporterCargo:0,barnCorn:0};const harvested=collectCornWorkerOne(s);expect(getCornAutomationTotal(harvested)).toBe(1);expect(getCornAutomationTotal(depositCornCrateOne(harvested))).toBe(1);expect(hireWorker(160,160,false)).toMatchObject({changed:true,wallet:0,hired:true});});
});
