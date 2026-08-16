import { FARM_LAYOUT } from "../config/farmLayout";
export const WORKER_ROUTES = {
 home:FARM_LAYOUT.workerHome, fieldEntries:[FARM_LAYOUT.wheatFields.west.entry,FARM_LAYOUT.wheatFields.central.entry], crate:{x:FARM_LAYOUT.wheatCrate.x,y:FARM_LAYOUT.wheatCrate.y}, crateWait:FARM_LAYOUT.wheatCrate.wait,barn:FARM_LAYOUT.barn,
 transportToBarn:[{x:1060,y:760},{x:1320,y:745},{x:1410,y:670},FARM_LAYOUT.barn],
 transportToCrate:[{x:1410,y:670},{x:1320,y:745},{x:1060,y:760},{x:FARM_LAYOUT.wheatCrate.x,y:FARM_LAYOUT.wheatCrate.y}],
} as const;
