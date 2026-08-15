export interface Rect { x: number; y: number; width: number; height: number }
export interface SignDefinition { id: string; facilityId: string; priority: number; preferredAnchors: readonly SignAnchor[]; facilityBounds: Rect; width: number; height: number }
export type SignAnchor = "north" | "north-east" | "east" | "south-east" | "south" | "south-west" | "west" | "north-west";
export interface SignPlacement extends Rect { id: string; mode: "full" | "icon" }
const directions: Record<SignAnchor, readonly [number, number]> = { north:[0,-1], "north-east":[1,-1], east:[1,0], "south-east":[1,1], south:[0,1], "south-west":[-1,1], west:[-1,0], "north-west":[-1,-1] };
const expandedOverlap = (a: Rect, b: Rect, gap: number) => a.x < b.x + b.width + gap && a.x + a.width + gap > b.x && a.y < b.y + b.height + gap && a.y + a.height + gap > b.y;
export function layoutWorldSigns(definitions: readonly SignDefinition[], obstacles: readonly Rect[], gap = 40, offset = 110): SignPlacement[] {
  const placed: SignPlacement[] = [];
  for (const sign of [...definitions].sort((a,b) => b.priority-a.priority || a.id.localeCompare(b.id))) {
    let accepted: SignPlacement | undefined;
    for (const mode of ["full", "icon"] as const) for (const anchor of sign.preferredAnchors) {
      const [dx,dy] = directions[anchor], width = mode === "full" ? sign.width : Math.min(44, sign.width), height = mode === "full" ? sign.height : Math.min(44, sign.height);
      const candidate = { id: sign.id, mode, width, height, x: sign.facilityBounds.x + sign.facilityBounds.width/2 + dx*(sign.facilityBounds.width/2+offset)-width/2, y: sign.facilityBounds.y + sign.facilityBounds.height/2 + dy*(sign.facilityBounds.height/2+offset)-height/2 };
      if (![...obstacles, ...placed].some((other) => expandedOverlap(candidate, other, gap))) { accepted = candidate; break; }
    }
    if (accepted) placed.push(accepted);
  }
  return placed;
}
export function projectSignRect(rect:Rect,zoom:number,camera={x:0,y:0}):Rect{return{x:(rect.x-camera.x)*zoom,y:(rect.y-camera.y)*zoom,width:rect.width*zoom,height:rect.height*zoom};}
export function validateNoSignOverlap(signs:readonly Rect[],gap=40):boolean{return signs.every((sign,index)=>signs.slice(index+1).every(other=>!expandedOverlap(sign,other,gap)));}
export type SignLod = "hidden" | "compact" | "detail" | "operation";
export const getSignLod = (distance: number, insideOperationRange = false): SignLod => insideOperationRange ? "operation" : distance > 850 ? "hidden" : distance >= 400 ? "compact" : "detail";
