import Phaser from "phaser";
import { interactionById, type InteractionId } from "../logic/facilities";

export type StationSemantic="construction"|"input"|"output"|"management";
const COLORS:Record<StationSemantic,number>={construction:0xc98b36,input:0x258d91,output:0x4f9a57,management:0xfff1cf};
const ICONS:Record<StationSemantic,string>={construction:"🔨",input:"↓",output:"↑",management:"⚙"};

/** A visible station whose geometry is taken directly from the logical registry. */
export class InteractionStationView{
  readonly radius:number;
  private readonly objects:Phaser.GameObjects.GameObject[]=[];
  private readonly pad:Phaser.GameObjects.Shape;
  constructor(scene:Phaser.Scene,id:InteractionId,semantic:StationSemantic,label:string){const interaction=interactionById(id);if(!interaction)throw new Error(`Unknown interaction ${id}`);this.radius=interaction.visibleRadius;const {x,y}=interaction.center;this.pad=semantic==="construction"?scene.add.rectangle(x,y,this.radius*1.35,this.radius*1.35,COLORS[semantic],.78).setStrokeStyle(5,0x49382e):scene.add.circle(x,y,this.radius,COLORS[semantic],.72).setStrokeStyle(5,0x49382e);const icon=scene.add.text(x,y-5,ICONS[semantic],{fontFamily:"system-ui",fontSize:"28px",fontStyle:"bold",color:semantic==="management"?"#49382e":"#fff4d8"}).setOrigin(.5);const sign=scene.add.text(x,y+this.radius+10,label,{fontFamily:"system-ui",fontSize:"15px",fontStyle:"bold",color:"#49382e",backgroundColor:"#fff4d8ee",padding:{x:8,y:5},align:"center"}).setOrigin(.5,0);for(const o of [this.pad,icon,sign])o.setDepth(1800);this.objects.push(this.pad,icon,sign);}
  setVisible(visible:boolean):this{for(const object of this.objects)(object as unknown as Phaser.GameObjects.Components.Visible).setVisible(visible);return this;}
  setEnabled(enabled:boolean):this{this.pad.setAlpha(enabled?.92:.32);return this;}
  setHighlighted(value:boolean):this{this.pad.setScale(value?1.08:1);return this;}
  destroy():void{for(const object of this.objects)object.destroy();}
}
