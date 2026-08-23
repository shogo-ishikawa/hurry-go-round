import Phaser from "phaser";

/** Rectangle-backed modal control with a stable 48px touch target and keyboard activation. */
export class ModalButton extends Phaser.GameObjects.Container{
  private readonly background:Phaser.GameObjects.Rectangle;private readonly caption:Phaser.GameObjects.Text;private enabled=true;private focused=false;
  constructor(scene:Phaser.Scene,x:number,y:number,width:number,label:string,private readonly activate:()=>void){super(scene,x,y);this.background=scene.add.rectangle(0,0,width,48,0x297c78).setStrokeStyle(3,0x49382e);this.caption=scene.add.text(0,0,label,{fontFamily:"system-ui",fontSize:"15px",fontStyle:"bold",color:"#fff4d8",align:"center"}).setOrigin(.5);this.add([this.background,this.caption]);this.setSize(width,48).setDepth(10000).setInteractive(new Phaser.Geom.Rectangle(-width/2,-24,width,48),Phaser.Geom.Rectangle.Contains).on("pointerover",()=>this.paint(true,false)).on("pointerout",()=>this.paint(false,false)).on("pointerdown",()=>this.paint(true,true)).on("pointerup",()=>this.trigger());this.setData("buttonRect",{x:x-width/2,y:y-24,width,height:48,label});scene.add.existing(this);}
  private paint(over:boolean,down:boolean):void{this.background.setFillStyle(!this.enabled?0x8b8173:down?0x1d5e5b:over||this.focused?0x3ca6a0:0x297c78);}
  setEnabled(value:boolean,reason?:string):this{this.enabled=value;this.setAlpha(value?1:.55);if(reason)this.setData("disabledReason",reason);return this;}
  setFocused(value:boolean):this{this.focused=value;this.paint(value,false);return this;}
  trigger():void{if(this.enabled)this.activate();}
  isEnabled():boolean{return this.enabled;}
  setLabel(value:string):this{this.caption.setText(value);return this;}
  destroy(fromScene?:boolean):void{super.destroy(fromScene);}
}
