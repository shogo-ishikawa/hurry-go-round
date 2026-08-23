import Phaser from "phaser";
import { palette } from "../art/palette";
import { COLLECTION_FACILITIES } from "../config/collectionFacilities";
import { getCollectionFacilityAvailability, type CollectionSourceId } from "../logic/collectionNetwork";
import type { GameState } from "../state/GameState";

type VisibleObject=Phaser.GameObjects.GameObject&Phaser.GameObjects.Components.Visible;
export class CollectionFacilityView{
 private readonly groups:Record<"hub"|CollectionSourceId|"processing-intake",VisibleObject[]>={hub:[],wheat:[],corn:[],egg:[],"processing-intake":[]};
 private readonly labels:Record<"hub"|CollectionSourceId|"processing-intake",Phaser.GameObjects.Text>={} as Record<"hub"|CollectionSourceId|"processing-intake",Phaser.GameObjects.Text>;
 private readonly fills:Partial<Record<CollectionSourceId,Phaser.GameObjects.Graphics>>={};
 constructor(private readonly scene:Phaser.Scene){
  for(const id of ["hub","wheat","corn","egg","processing-intake"] as const){const d=COLLECTION_FACILITIES[id],p=d.guidePoint,w=id==="hub"?220:id==="processing-intake"?130:120,h=id==="hub"?145:86,color=id==="wheat"?0xd9a441:id==="corn"?0xf2c84b:id==="egg"?0xfff0c7:id==="processing-intake"?palette.teal:palette.barn;const foundation=scene.add.graphics().setDepth(p.y-2).lineStyle(4,palette.outline,.8).fillStyle(palette.soil,.55).fillRoundedRect(p.x-w/2,p.y-h/2,w,h,10).strokeRoundedRect(p.x-w/2,p.y-h/2,w,h,10);const pad=scene.add.circle(p.x,p.y+h/2+15,22,color,.55).setStrokeStyle(3,palette.outline).setDepth(p.y);const silhouette=scene.add.graphics().setDepth(p.y).fillStyle(color,.8).fillRoundedRect(p.x-w*.35,p.y-h*.2,w*.7,h*.48,7);const label=scene.add.text(p.x,p.y-h/2-12,d.publicName,{fontFamily:"system-ui",fontSize:id==="hub"?"18px":"13px",fontStyle:"bold",color:"#49382e",backgroundColor:"#fff4d8e8",align:"center",padding:{x:6,y:4}}).setOrigin(.5,1).setDepth(2100);this.labels[id]=label;this.groups[id].push(foundation,pad,silhouette,label);if(id!=="hub"&&id!=="processing-intake"){const fill=scene.add.graphics().setDepth(p.y+2);this.fills[id]=fill;this.groups[id].push(fill);}}
 }
 update(state:GameState):void{for(const id of ["hub","wheat","corn","egg","processing-intake"] as const){const a=getCollectionFacilityAvailability(id,state);for(const object of this.groups[id])object.setVisible(a.visible);if(!a.visible)continue;const d=a.definition;if(id==="hub")this.labels[id].setText(a.built?"集配所\n稼働中":a.missingPrerequisites.length?"集配所\n加工場の解放後に建設できます":`集配所\n${d.cost}コイン`);else if(id==="processing-intake")this.labels[id].setText(`${d.publicName}\n${a.built?`${Object.values(state.collectionNetwork.processingIntake.amounts).reduce((n,v)=>n+v,0)} / ${d.capacity}`:"集配所と同時に稼働"}`);else{const amount=state.collectionNetwork.boxes[id].amounts[id];this.labels[id].setText(`${d.publicName}\n${a.built?`${amount} / ${d.capacity}`:`予定地　${d.cost}コイン`}`);this.fills[id]?.clear().fillStyle(id==="wheat"?palette.wheat:id==="corn"?0xf2c84b:palette.cream).fillRect(d.guidePoint.x-42,d.guidePoint.y+12,Math.round(84*amount/d.capacity),9);}}
 }
 showTransfer(source:CollectionSourceId,direction:"deposit"|"withdraw"):void{const p=COLLECTION_FACILITIES[source].guidePoint,symbol=direction==="deposit"?"→ +1":"← +1",text=this.scene.add.text(p.x+(direction==="deposit"?-78:78),p.y,symbol,{fontFamily:"system-ui",fontSize:"18px",fontStyle:"bold",color:direction==="deposit"?"#297c78":"#b9573f",backgroundColor:"#fff4d8"}).setOrigin(.5).setDepth(2200);this.scene.tweens.add({targets:text,y:p.y-35,alpha:0,duration:650,onComplete:()=>text.destroy()});}
 destroy():void{for(const o of Object.values(this.groups).flat())o.destroy();}
}
