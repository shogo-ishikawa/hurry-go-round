import Phaser from "phaser";
import { palette } from "../art/palette";
import { RECIPES, getBufferTotal, getMachinePublicStatus } from "../logic/processing";
import type { GameState } from "../state/GameState";
import { InteractionStationView } from "./InteractionStationView";

export class ProcessingFacilityView {
  private readonly objects:Phaser.GameObjects.GameObject[]=[];
  private readonly stations:{yard:InteractionStationView;millBuild:InteractionStationView;bakeryBuild:InteractionStationView;millInput:InteractionStationView;millOutput:InteractionStationView;bakeryInput:InteractionStationView;bakeryOutput:InteractionStationView;management:InteractionStationView};
  private readonly yardPlan:Phaser.GameObjects.Text;private readonly millPlan:Phaser.GameObjects.Text;private readonly bakeryPlan:Phaser.GameObjects.Text;
  private readonly millHouse:Phaser.GameObjects.Rectangle;private readonly bakeryHouse:Phaser.GameObjects.Rectangle;private readonly gear:Phaser.GameObjects.Arc;
  private readonly millStorage:Phaser.GameObjects.Text;private readonly bakeryStorage:Phaser.GameObjects.Text;private readonly millStatus:Phaser.GameObjects.Text;private readonly bakeryStatus:Phaser.GameObjects.Text;
  constructor(scene:Phaser.Scene){
    const ground=scene.add.rectangle(2510,1505,760,650,palette.path,.42).setStrokeStyle(8,palette.outline,.7).setDepth(1100);this.objects.push(ground);
    const panel=(x:number,y:number,text:string)=>scene.add.text(x,y,text,{fontFamily:"system-ui",fontSize:"17px",fontStyle:"bold",color:"#49382e",backgroundColor:"#fff4d8ee",align:"center",padding:{x:10,y:7}}).setOrigin(.5).setDepth(1700);
    this.yardPlan=panel(2200,1290,"加工場を建てる\n必要条件\n✗ 東農地　✗ 鶏小屋\n800コイン");
    this.millPlan=panel(2635,1280,"製粉機　350コイン\n麦 → 小麦粉\nとうもろこし → コーンミール");
    this.bakeryPlan=panel(2650,1590,"ベーカリー　850コイン\n製粉機の建設後に利用できます");
    const millFoundation=scene.add.rectangle(2635,1370,270,210,palette.creamDark,.42).setStrokeStyle(7,palette.outline,.7).setDepth(1250);
    const bakeryFoundation=scene.add.rectangle(2650,1680,300,220,palette.creamDark,.42).setStrokeStyle(7,palette.outline,.7).setDepth(1250);
    this.millHouse=scene.add.rectangle(2635,1370,270,210,palette.soil).setStrokeStyle(7,palette.outline).setDepth(1300);
    this.bakeryHouse=scene.add.rectangle(2650,1680,300,220,palette.barn).setStrokeStyle(7,palette.outline).setDepth(1300);
    this.gear=scene.add.circle(2695,1385,38,palette.creamDark).setStrokeStyle(7,palette.outline).setDepth(1400);
    this.millStorage=panel(2640,1515,"原料　麦 0　とうもろこし 0\n完成品はまだありません");
    this.bakeryStorage=panel(2645,1815,"原料　粉 0　ミール 0　卵 0\n完成品はまだありません");
    this.millStatus=panel(2635,1245,"未建設");this.bakeryStatus=panel(2650,1555,"未建設");
    this.objects.push(this.yardPlan,this.millPlan,this.bakeryPlan,millFoundation,bakeryFoundation,this.millHouse,this.bakeryHouse,this.gear,this.millStorage,this.bakeryStorage,this.millStatus,this.bakeryStatus);
    this.stations={yard:new InteractionStationView(scene,"purchase-processing-yard","construction","加工場　800コイン"),millBuild:new InteractionStationView(scene,"build-grain-mill","construction","製粉機　350コイン"),bakeryBuild:new InteractionStationView(scene,"build-bakery","construction","ベーカリー　850コイン"),millInput:new InteractionStationView(scene,"transfer-mill-input","input","製粉機 搬入口"),millOutput:new InteractionStationView(scene,"collect-mill-output","output","製粉機 受取口"),bakeryInput:new InteractionStationView(scene,"transfer-bakery-input","input","ベーカリー 搬入口"),bakeryOutput:new InteractionStationView(scene,"collect-bakery-output","output","ベーカリー 受取口"),management:new InteractionStationView(scene,"open-processing-panel","management","加工場 管理板")};
  }
  update(state:GameState,delta:number):void{const {land,mill,bakery}=state.processing,east=state.landExpansion.eastCornFieldUnlocked,coop=state.landExpansion.southChickenCoopUnlocked;
    this.yardPlan.setVisible(!land.yardUnlocked).setText(`加工場を建てる\n必要条件\n${east?"✓":"✗"} 東農地　${coop?"✓":"✗"} 鶏小屋\n800コイン${state.economy.walletCoins<800?`\nあと ${800-state.economy.walletCoins} コイン必要です`:""}`);this.stations.yard.setVisible(!land.yardUnlocked);
    this.millPlan.setVisible(!mill.built);this.bakeryPlan.setVisible(!bakery.built).setText(`ベーカリー　850コイン\n${land.millBuilt?"小麦粉とたまごからパンを作ります":"製粉機の建設後に利用できます"}`);
    this.stations.millBuild.setVisible(!mill.built).setEnabled(land.yardUnlocked);this.stations.bakeryBuild.setVisible(!bakery.built).setEnabled(land.yardUnlocked&&land.millBuilt);
    this.millHouse.setVisible(mill.built);this.gear.setVisible(mill.built);this.bakeryHouse.setVisible(bakery.built);this.stations.management.setVisible(land.yardUnlocked);
    this.stations.millInput.setVisible(true).setEnabled(mill.built);this.stations.millOutput.setVisible(true).setEnabled(mill.built);this.stations.bakeryInput.setVisible(true).setEnabled(bakery.built);this.stations.bakeryOutput.setVisible(true).setEnabled(bakery.built);
    this.millStorage.setVisible(mill.built).setText(`原料　麦 ${mill.input.amounts.wheat}　とうもろこし ${mill.input.amounts.corn}　${getBufferTotal(mill.input)}/${mill.input.capacity}\n${getBufferTotal(mill.output)?`完成品　小麦粉 ${mill.output.amounts.flour}　ミール ${mill.output.amounts.cornmeal}`:"完成品はまだありません"}`);
    this.bakeryStorage.setVisible(bakery.built).setText(`原料　粉 ${bakery.input.amounts.flour}　ミール ${bakery.input.amounts.cornmeal}　卵 ${bakery.input.amounts.egg}　${getBufferTotal(bakery.input)}/${bakery.input.capacity}\n${getBufferTotal(bakery.output)?`完成品　パン ${bakery.output.amounts.bread}　コーンパン ${bakery.output.amounts.cornbread}`:"完成品はまだありません"}`);
    const status=(name:string,machine:typeof mill)=>{const output=getBufferTotal(machine.output);if(machine.activeCycle){const progress=Math.round((1-machine.activeCycle.remainingMs/machine.activeCycle.durationMs)*100);return`${name}\n${RECIPES[machine.activeCycle.recipeId].publicName}を製造中 ${progress}%\n完成品 ${output}`;}return`${name}\n${getMachinePublicStatus(machine)}${output?`　完成品 ${output}`:""}`;};this.millStatus.setVisible(mill.built).setText(status("製粉機",mill));this.bakeryStatus.setVisible(bakery.built).setText(status("ベーカリー",bakery));if(mill.activeCycle)this.gear.rotation+=delta*.004;
  }
  setStationHighlighted(id:"mill-input"|"mill-output"|"bakery-input"|"bakery-output",value:boolean):void{this.stations[id==="mill-input"?"millInput":id==="mill-output"?"millOutput":id==="bakery-input"?"bakeryInput":"bakeryOutput"].setHighlighted(value);}
  destroy():void{for(const object of this.objects)object.destroy();for(const station of Object.values(this.stations))station.destroy();}
}
