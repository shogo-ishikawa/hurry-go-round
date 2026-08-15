import Phaser from "phaser";
import { palette } from "../art/palette";
import type { GameState } from "../state/GameState";

export class ProcessingFacilityView {
  private readonly objects:(Phaser.GameObjects.GameObject&Phaser.GameObjects.Components.Visible)[]=[];
  private readonly planned:(Phaser.GameObjects.GameObject&Phaser.GameObjects.Components.Visible)[]=[];
  private readonly mill:(Phaser.GameObjects.GameObject&Phaser.GameObjects.Components.Visible)[]=[];
  private readonly bakery:(Phaser.GameObjects.GameObject&Phaser.GameObjects.Components.Visible)[]=[];
  private readonly gear:Phaser.GameObjects.Arc;
  constructor(scene:Phaser.Scene){
    const ground=scene.add.rectangle(2510,1505,760,650,palette.path,.42).setStrokeStyle(8,palette.outline,.7).setDepth(1100);this.objects.push(ground);
    const title=scene.add.text(2200,1220,"加工場予定地\n東農地と鶏小屋の先",{fontFamily:"system-ui",fontSize:"22px",fontStyle:"bold",color:"#49382e",backgroundColor:"#fff4d8e8",align:"center",padding:{x:12,y:8}}).setOrigin(.5).setDepth(2000);this.planned.push(title);
    for(let x=2180;x<=2840;x+=110)this.planned.push(scene.add.rectangle(x,1210,12,36,palette.outline).setDepth(1200));
    this.planned.push(scene.add.rectangle(2200,1590,125,18,palette.outline).setDepth(1200));
    const board=scene.add.rectangle(2395,1340,150,105,palette.soil).setStrokeStyle(6,palette.outline).setDepth(1350);const boardText=scene.add.text(2395,1340,"加工場\n管理板",{fontFamily:"system-ui",fontSize:"18px",fontStyle:"bold",color:"#fff4d8",align:"center"}).setOrigin(.5).setDepth(1400);this.objects.push(board,boardText);
    const millHouse=scene.add.rectangle(2635,1370,270,210,palette.soil).setStrokeStyle(7,palette.outline).setDepth(1300);const millLabel=scene.add.text(2635,1288,"製粉機",{fontFamily:"system-ui",fontSize:"20px",fontStyle:"bold",color:"#49382e",backgroundColor:"#fff4d8dd",padding:{x:8,y:4}}).setOrigin(.5).setDepth(1500);this.gear=scene.add.circle(2695,1385,38,palette.creamDark).setStrokeStyle(7,palette.outline).setDepth(1400);this.mill.push(millHouse,millLabel,this.gear);
    const bakeryHouse=scene.add.rectangle(2650,1680,300,220,palette.barn).setStrokeStyle(7,palette.outline).setDepth(1300);const bakeryLabel=scene.add.text(2650,1595,"ベーカリー",{fontFamily:"system-ui",fontSize:"20px",fontStyle:"bold",color:"#49382e",backgroundColor:"#fff4d8dd",padding:{x:8,y:4}}).setOrigin(.5).setDepth(1500);this.bakery.push(bakeryHouse,bakeryLabel);
    this.objects.push(...this.planned,...this.mill,...this.bakery);
  }
  update(state:GameState,delta:number):void{const open=state.processing.land.yardUnlocked;for(const o of this.planned)o.setVisible(!open);for(const o of this.mill)o.setVisible(state.processing.land.millBuilt);for(const o of this.bakery)o.setVisible(state.processing.land.bakeryBuilt);if(state.processing.mill.activeCycle)this.gear.rotation+=delta*.004;}
  destroy():void{for(const object of this.objects)object.destroy();}
}
