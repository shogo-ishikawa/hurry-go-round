import Phaser from "phaser";
import { palette } from "../art/palette";
import type { GameState } from "../state/GameState";
import type { CollectionSourceId } from "../logic/collectionNetwork";

export class CollectionFacilityView{
  private readonly hub:(Phaser.GameObjects.GameObject&Phaser.GameObjects.Components.Visible)[]=[];private readonly boxes:Record<CollectionSourceId,(Phaser.GameObjects.GameObject&Phaser.GameObjects.Components.Visible)[]>={wheat:[],corn:[],egg:[]};private readonly fills:Record<CollectionSourceId,Phaser.GameObjects.Graphics>={} as Record<CollectionSourceId,Phaser.GameObjects.Graphics>;private readonly intake:(Phaser.GameObjects.GameObject&Phaser.GameObjects.Components.Visible)[]=[];
  constructor(scene:Phaser.Scene){
    const office=scene.add.graphics().lineStyle(6,palette.outline).fillStyle(palette.soil).fillRoundedRect(1740,1450,225,155,12).strokeRoundedRect(1740,1450,225,155,12).fillStyle(palette.barn).fillTriangle(1720,1460,1985,1460,1855,1390).fillStyle(palette.cream).fillRect(1825,1510,58,95);this.hub.push(office,scene.add.text(1855,1425,"集配所",{fontFamily:"system-ui",fontSize:"20px",fontStyle:"bold",color:"#fff4d8"}).setOrigin(.5).setDepth(2100));
    const specs:[CollectionSourceId,number,number,string][]=[["wheat",775,745,"麦"],["corn",2665,905,"とうもろこし"],["egg",1245,1765,"たまご"]];for(const [id,x,y,label] of specs){const shape=scene.add.graphics().lineStyle(5,palette.outline).fillStyle(id==="egg"?palette.creamDark:palette.soil).fillRoundedRect(x-60,y-42,120,id==="corn"?94:78,8).strokeRoundedRect(x-60,y-42,120,id==="corn"?94:78,8).setDepth(y);const fill=scene.add.graphics().setDepth(y+2);this.fills[id]=fill;const text=scene.add.text(x,y-62,`${label} 集配箱`,{fontFamily:"system-ui",fontSize:"14px",fontStyle:"bold",color:"#49382e",backgroundColor:"#fff4d8dd",padding:{x:6,y:3}}).setOrigin(.5).setDepth(2100);this.boxes[id].push(shape,fill,text);}
    const intake=scene.add.graphics().lineStyle(6,palette.outline).fillStyle(palette.teal).fillRoundedRect(1990,1460,130,110,8).strokeRoundedRect(1990,1460,130,110,8);this.intake.push(intake,scene.add.text(2055,1515,"加工場\n受入箱",{fontFamily:"system-ui",fontSize:"15px",fontStyle:"bold",align:"center",color:"#fff4d8"}).setOrigin(.5).setDepth(2100));
  }
  update(state:GameState):void{for(const object of this.hub)object.setVisible(state.collectionNetwork.hubBuilt);for(const id of ["wheat","corn","egg"] as const){const box=state.collectionNetwork.boxes[id];for(const object of this.boxes[id])object.setVisible(box.built);const amount=box.amounts[id];this.fills[id].clear().fillStyle(id==="wheat"?palette.wheat:id==="corn"?0xf2c84b:palette.cream).fillRect((id==="corn"?2615:id==="egg"?1195:725),id==="corn"?930:id==="egg"?1780:760,Math.round(100*amount/box.capacity),10);}for(const object of this.intake)object.setVisible(state.processing.land.yardUnlocked);}
  destroy():void{for(const o of [...this.hub,...this.intake,...Object.values(this.boxes).flat()])o.destroy();}
}
