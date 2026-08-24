import Phaser from "phaser";
import { palette } from "../art/palette";
import { FARM_LAYOUT,getActiveWheatNodes,getWheatFieldVisualBounds,WHEAT_CROP_VISUAL_RADIUS,type Rect,type WheatFieldLevel } from "../config/farmLayout";

export interface WheatFieldViewDiagnostics { renderedLevel:WheatFieldLevel; nodeVisualBounds:Rect[]; activeSoilBounds:Rect; fenceBounds:Rect; renderedNodeCount:number; oldWestFieldRendered:false }
const expand=(r:Rect,n:number):Rect=>({x:r.x-n,y:r.y-n,width:r.width+n*2,height:r.height+n*2});
export class WheatFieldView{
 private graphics:Phaser.GameObjects.Graphics; private level:WheatFieldLevel=0;
 constructor(scene:Phaser.Scene){this.graphics=scene.add.graphics().setDepth(-900);}
 render(level:WheatFieldLevel):void{this.level=level;const g=this.graphics.clear(),soil=getWheatFieldVisualBounds(level),planned=getWheatFieldVisualBounds(2),fence=expand(soil,8);
  g.fillStyle(palette.pathLight,.85).fillRoundedRect(FARM_LAYOUT.farmPath.x,FARM_LAYOUT.farmPath.y,FARM_LAYOUT.farmPath.width,FARM_LAYOUT.farmPath.height,30);
  g.fillStyle(palette.soilDark,.18).fillRoundedRect(planned.x,planned.y,planned.width,planned.height,28);
  if(level<2){const next=getWheatFieldVisualBounds((level+1) as WheatFieldLevel);g.fillStyle(palette.creamDark,.22).fillRoundedRect(soil.x+soil.width,next.y,next.x+next.width-soil.x-soil.width,next.height,18);}
  g.fillStyle(palette.soil).fillRoundedRect(soil.x,soil.y,soil.width,soil.height,28).lineStyle(5,palette.soilDark,.45);
  for(let y=soil.y+WHEAT_CROP_VISUAL_RADIUS.y+28;y<soil.y+soil.height-20;y+=50)g.lineBetween(soil.x+20,y,soil.x+soil.width-20,y);
  g.lineStyle(10,palette.creamDark).strokeRoundedRect(fence.x,fence.y,fence.width,fence.height,30).lineStyle(3,palette.outline,.7).strokeRoundedRect(fence.x,fence.y,fence.width,fence.height,30);
 }
 getDiagnostics():WheatFieldViewDiagnostics{const nodes=getActiveWheatNodes(this.level),activeSoilBounds=getWheatFieldVisualBounds(this.level);return{renderedLevel:this.level,nodeVisualBounds:nodes.map(n=>({x:n.x-WHEAT_CROP_VISUAL_RADIUS.x,y:n.y-WHEAT_CROP_VISUAL_RADIUS.y,width:WHEAT_CROP_VISUAL_RADIUS.x*2,height:WHEAT_CROP_VISUAL_RADIUS.y*2})),activeSoilBounds,fenceBounds:expand(activeSoilBounds,8),renderedNodeCount:nodes.length,oldWestFieldRendered:false};}
 destroy():void{this.graphics.destroy();}
}
