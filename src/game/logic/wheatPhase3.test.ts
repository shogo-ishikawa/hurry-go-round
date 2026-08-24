import {describe,expect,it} from "vitest";
import {getActiveWheatNodes,getWheatFieldVisualBounds,WHEAT_CROP_VISUAL_RADIUS} from "../config/farmLayout";
import {createGameState} from "../state/GameState";
import {decideTransportLoad,getAutomationWheatTotal,loadTransportWorkerBatch,unloadTransportWorkerBatch,type AutomationState} from "./workers";
import {getWheatWorkerRuntimeParameters} from "./workforce";

const automation=(crate:number,cargo:number):AutomationState=>{const state=createGameState();return{inventory:{...state.inventory,fieldCrate:crate,barn:4},harvestWorker:{hired:false,carried:0},transportWorker:{hired:true,carried:cargo}}};
describe("v0.9.8 dynamic wheat field",()=>{
 it.each([0,1,2] as const)("contains every crop visual at level %i",level=>{const bounds=getWheatFieldVisualBounds(level),nodes=getActiveWheatNodes(level);expect(nodes).toHaveLength([30,42,54][level]);for(const node of nodes){expect(node.x-WHEAT_CROP_VISUAL_RADIUS.x).toBeGreaterThanOrEqual(bounds.x);expect(node.x+WHEAT_CROP_VISUAL_RADIUS.x).toBeLessThanOrEqual(bounds.x+bounds.width);expect(node.y-WHEAT_CROP_VISUAL_RADIUS.y).toBeGreaterThanOrEqual(bounds.y);expect(node.y+WHEAT_CROP_VISUAL_RADIUS.y).toBeLessThanOrEqual(bounds.y+bounds.height);}});
 it("derives each expansion edge from its active nodes",()=>{expect([0,1,2].map(level=>getWheatFieldVisualBounds(level as 0|1|2).width)).toEqual([388,532,676]);});
});
describe("v0.9.8 transporter recovery",()=>{
 it("uses trained capacities",()=>expect(([1,2,3] as const).map(level=>getWheatWorkerRuntimeParameters("wheat-transporter",level).capacity)).toEqual([6,8,10]));
 it("loads and unloads atomically while conserving wheat",()=>{const before=automation(16,0),loaded=loadTransportWorkerBatch(before,6);expect(loaded).toMatchObject({changed:true,transferred:6,state:{inventory:{fieldCrate:10},transportWorker:{carried:6}}});expect(getAutomationWheatTotal(loaded.state)).toBe(getAutomationWheatTotal(before));const unloaded=unloadTransportWorkerBatch(loaded.state);expect(unloaded).toMatchObject({transferred:6,state:{inventory:{barn:10},transportWorker:{carried:0}}});expect(getAutomationWheatTotal(unloaded.state)).toBe(getAutomationWheatTotal(before));});
 it("departs before loading full, empty-source partial, timed partial, and legacy cargo",()=>{expect(decideTransportLoad(16,6,6)).toBe("moving-to-barn");expect(decideTransportLoad(0,3,6)).toBe("moving-to-barn");expect(decideTransportLoad(12,3,6,700)).toBe("moving-to-barn");expect(decideTransportLoad(16,11,10)).toBe("moving-to-barn");});
 it("never clamps legacy over-capacity cargo",()=>{const state=automation(32,11),unloaded=unloadTransportWorkerBatch(state);expect(unloaded.transferred).toBe(11);expect(unloaded.state.inventory.barn).toBe(15);expect(getAutomationWheatTotal(unloaded.state)).toBe(getAutomationWheatTotal(state));});
});
