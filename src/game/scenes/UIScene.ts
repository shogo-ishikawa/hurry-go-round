import Phaser from "phaser";
import { palette } from "../art/palette";
import { VirtualJoystick } from "../input/VirtualJoystick";
import { calculateInputLayout } from "../input/inputLayout";
import { GAME_EVENTS, type GameState } from "../state/GameState";
import type { Point } from "../logic/movement";
import { palette as colors } from "../art/palette";
import { getCarriedTotal } from "../logic/resources";
import { WORKER_ROLE_IDS, WORKER_ROLES, getWheatWorkerRuntimeParameters, getWorkerTrainingCost, type WorkerRoleId } from "../logic/workforce";
import { RECIPES, type MachineId, type RecipeId } from "../logic/processing";
import { createProcessingPlanViewModel, DEFAULT_PROCESSING_PLANS, diagnoseProcessingBuffer, setRecipeTargetCycles, type RecipePlan } from "../logic/processingPlan";
import { DiscreteSlider } from "./DiscreteSlider";
import { ModalButton } from "./ModalButton";
import { COLLECTION_SOURCES, getCollectionPanelViewModel, type CollectionCommand, type CollectionCommandResult, type CollectionRoutingMode } from "../logic/collectionNetwork";
import { COLLECTION_FACILITIES } from "../config/collectionFacilities";
import { createInventoryViewModel, formatCompactRows } from "../logic/inventoryViewModel";
import { RESOURCE_DEFINITIONS, RESOURCE_IDS } from "../config/resourceDefinitions";
import { formatContractIdentity } from "../logic/contracts";
import { createMachineViewModel } from "../logic/processingViewModel";
import { getProcessingWorkerCapacity } from "../logic/processingWorkers";
import { getCowBarnStatus, getDairyWorkerCapacity } from "../logic/dairy";
let portraitNoticeShown = false;
export class UIScene extends Phaser.Scene {
  private processingPlans:Record<MachineId,RecipePlan>={"grain-mill":structuredClone(DEFAULT_PROCESSING_PLANS["grain-mill"]),bakery:structuredClone(DEFAULT_PROCESSING_PLANS.bakery)};
  private planMessage="";
  private planSliders:DiscreteSlider[]=[];
  private carriedText!: Phaser.GameObjects.Text;
  private barnText!: Phaser.GameObjects.Text;
  private marketText!: Phaser.GameObjects.Text;
  private tillText!: Phaser.GameObjects.Text;
  private walletText!: Phaser.GameObjects.Text;
  private tutorial!: Phaser.GameObjects.Text;
  private panels!: Phaser.GameObjects.Graphics;
  private meters!: Phaser.GameObjects.Graphics;
  private joystick!: VirtualJoystick;
  private moveHint!: Phaser.GameObjects.Text;
  private fullBadge!: Phaser.GameObjects.Text;
  private versionText!: Phaser.GameObjects.Text;
  private lastState?: GameState;
  private automationTitle!: Phaser.GameObjects.Text;
  private crateText!: Phaser.GameObjects.Text;
  private harvestWorkerText!: Phaser.GameObjects.Text;
  private transportWorkerText!: Phaser.GameObjects.Text;
  private livestockText!: Phaser.GameObjects.Text;
  private contextHint!: Phaser.GameObjects.Text;
  private contractButton!: Phaser.GameObjects.Text;
  private operationsButton!:Phaser.GameObjects.Text;
  private processingButton!:Phaser.GameObjects.Text;
  private dairyButton!:Phaser.GameObjects.Text;
  private collectionButton!:Phaser.GameObjects.Text;
  private pauseButton!: Phaser.GameObjects.Text;
  private saveStatus!: Phaser.GameObjects.Text;
  private overlay: Phaser.GameObjects.GameObject[] = [];
  private collectionOpenState=false; private collectionPage=0; private collectionResult=""; private contractResult=""; private modalButtons:ModalButton[]=[]; private modalFocus=-1;
  private inventoryPage=0; private inventoryRowPage=0; private processingPage=0; private processingContentPage=0; private panelRect={x:0,y:0,width:0,height:0}; private contentRect={x:0,y:0,width:0,height:0}; private modalDragStartY:number|null=null;
  constructor() {
    super("ui");
  }
  create(): void {
    this.panels = this.add.graphics();
    this.meters = this.add.graphics();
    const style: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: "system-ui",
      fontSize: "18px",
      color: "#49382e",
      fontStyle: "bold",
    };
    this.carriedText = this.add.text(27, 20, "持ち物\n空", style).setInteractive({useHandCursor:true}).on("pointerup",()=>this.openInventory());
    this.barnText = this.add.text(27, 52, "倉庫\n麦 0", style).setInteractive({useHandCursor:true}).on("pointerup",()=>this.openInventory());
    this.marketText = this.add.text(0, 0, "売り場\n麦 0 / 8", style);
    this.tillText = this.add.text(0, 0, "売上  0", style);
    this.walletText = this.add.text(0, 0, "コイン  0", style);
    this.versionText = this.add.text(0, 0, "v0.9.8", {
      ...style,
      fontSize: "14px",
      color: "#755c49",
    });
    this.automationTitle = this.add.text(0, 0, "麦の自動化", style);
    this.crateText = this.add.text(0, 0, "集荷箱  0 / 16", style);
    this.harvestWorkerText = this.add.text(0, 0, "収穫スタッフ  未雇用", style);
    this.transportWorkerText = this.add.text(
      0,
      0,
      "運搬スタッフ  未雇用",
      style,
    );
    this.livestockText = this.add.text(0, 0, "鶏小屋\n餌 0 / 12\n卵 0 / 12", { ...style, fontSize: "16px" }).setVisible(false);
    this.contextHint = this.add.text(0, 0, "", { fontFamily: "system-ui", fontSize: "16px", color: "#fff4d8", backgroundColor: "#49382ee8", align: "center", padding: { x: 14, y: 9 }, wordWrap: { width: 340 } }).setOrigin(.5).setAlpha(0);
    this.contractButton=this.add.text(0,0,"契約を見る  E",{...style,fontSize:"17px",backgroundColor:"#297c78",color:"#fff4d8",padding:{x:18,y:13}}).setOrigin(.5).setVisible(false).setInteractive({useHandCursor:true}).on("pointerup",()=>this.openContracts());
    this.operationsButton=this.add.text(0,0,"研修小屋  E",{...style,fontSize:"17px",backgroundColor:"#297c78",color:"#fff4d8",padding:{x:18,y:13}}).setOrigin(.5).setVisible(false).setInteractive({useHandCursor:true}).on("pointerup",()=>this.openOperations());
    this.dairyButton=this.add.text(0,0,"酪農管理  E",{...style,fontSize:"17px",backgroundColor:"#297c78",color:"#fff4d8",padding:{x:18,y:13}}).setOrigin(.5).setVisible(false).setInteractive({useHandCursor:true}).on("pointerup",()=>this.openDairy());
    this.processingButton=this.add.text(0,0,"加工場管理  E",{...style,fontSize:"17px",backgroundColor:"#297c78",color:"#fff4d8",padding:{x:18,y:13}}).setOrigin(.5).setVisible(false).setInteractive({useHandCursor:true}).on("pointerup",()=>this.openProcessing());
    this.collectionButton=this.add.text(0,0,"集配所  E",{...style,fontSize:"17px",backgroundColor:"#297c78",color:"#fff4d8",padding:{x:18,y:13}}).setOrigin(.5).setVisible(false).setInteractive({useHandCursor:true}).on("pointerup",()=>this.openCollection());
    this.pauseButton=this.add.text(0,0,"一時停止",{...style,fontSize:"14px",backgroundColor:"#fff4d8",padding:{x:13,y:10}}).setOrigin(1,0).setInteractive({useHandCursor:true}).on("pointerup",()=>this.openPause());
    this.saveStatus=this.add.text(0,0,"変更なし",{...style,fontSize:"13px",backgroundColor:"#fff4d8cc",padding:{x:8,y:6}}).setOrigin(1,0);
    this.tutorial = this.add
      .text(0, 0, "麦畑へ移動しましょう", {
        fontFamily: "system-ui",
        fontSize: "17px",
        color: "#49382e",
        align: "center",
        wordWrap: { width: 330 },
      })
      .setOrigin(0.5);
    this.moveHint = this.add
      .text(0, 0, "WASD・矢印・スティック・タップで移動", {
        fontFamily: "system-ui",
        fontSize: "15px",
        color: "#fff4d8",
        backgroundColor: "#49382ed9",
        padding: { x: 12, y: 8 },
      })
      .setOrigin(0.5);
    this.fullBadge = this.add
      .text(0, 0, "持ち物がいっぱいです　倉庫へ納品", {
        fontFamily: "system-ui",
        fontSize: "18px",
        fontStyle: "bold",
        color: "#fff4d8",
        backgroundColor: "#b9573fee",
        padding: { x: 14, y: 9 },
      })
      .setOrigin(0.5)
      .setAlpha(0);
    this.joystick = new VirtualJoystick(this);
    this.game.events.on(GAME_EVENTS.state, this.updateState, this);
    this.game.events.on(GAME_EVENTS.full, this.showFull, this);
    this.game.events.on(GAME_EVENTS.tutorial, this.updateTutorial, this);
    this.game.events.on(GAME_EVENTS.wallet, this.pulseWallet, this);
    this.game.events.on(GAME_EVENTS.hint, this.showContextHint, this);
    this.game.events.on(GAME_EVENTS.contractRange, this.showContractButton, this);
    this.game.events.on(GAME_EVENTS.contractOpen, this.openContracts, this);
    this.game.events.on(GAME_EVENTS.contractResult, this.handleContractResult, this);
    this.game.events.on(GAME_EVENTS.operationsRange,this.showOperationsButton,this);
    this.game.events.on(GAME_EVENTS.operationsOpen,this.openOperations,this);
    this.game.events.on(GAME_EVENTS.processingRange,this.showProcessingButton,this);
    this.game.events.on(GAME_EVENTS.processingOpen,this.openProcessing,this);
    this.game.events.on(GAME_EVENTS.dairyRange,(visible:boolean)=>this.dairyButton.setVisible(visible));this.game.events.on(GAME_EVENTS.dairyOpen,this.openDairy,this);
    this.game.events.on(GAME_EVENTS.collectionRange,this.showCollectionButton,this);
    this.game.events.on(GAME_EVENTS.collectionOpen,this.openCollection,this);
    this.game.events.on(GAME_EVENTS.collectionResult,this.handleCollectionResult,this);
    this.input.keyboard?.on("keydown",this.handleModalKey,this);this.input.on("wheel",this.handleModalWheel,this);this.input.on("pointerdown",this.handleModalPointerDown,this);this.input.on("pointerup",this.handleModalPointerUp,this);
    this.input.keyboard?.on("keydown-I",this.openInventory,this);
    this.game.events.on("save-status",this.updateSaveStatus,this);
    this.input.keyboard?.on("keydown-ESC",this.togglePause,this); this.input.keyboard?.on("keydown-P",this.togglePause,this);
    this.scale.on(Phaser.Scale.Events.RESIZE, this.layout, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
    this.layout();
    this.showPortraitNotice();
  }
  private updateSaveStatus(value:string):void{this.saveStatus.setText(value);}
  private showContractButton(visible:boolean):void { this.contractButton.setVisible(visible&&!this.overlay.length); }
  private togglePause=():void=>{ if(this.overlay.length)this.closeOverlay();else this.openPause(); };
  private overlayBase(title:string): Phaser.GameObjects.Text {
    this.scene.pause("game");this.resetInput();this.contractButton.setVisible(false); const w=this.scale.width,h=this.scale.height;
    const shade=this.add.rectangle(w/2,h/2,w,h,0x49382e,.72).setInteractive(); const panelWidth=Math.min(w-24,1000),panelHeight=Math.min(h-24,700); this.panelRect={x:(w-panelWidth)/2,y:(h-panelHeight)/2,width:panelWidth,height:panelHeight}; const panel=this.add.rectangle(w/2,h/2,panelWidth,panelHeight,palette.cream).setStrokeStyle(4,palette.outline); const heading=this.add.text(w/2,Math.max(24,h/2-Math.min(h-24,700)/2+28),title,{fontFamily:"system-ui",fontSize:`${Math.max(22,Math.min(34,w/20))}px`,fontStyle:"bold",color:"#49382e"}).setOrigin(.5,0); this.overlay.push(shade,panel,heading); return heading;
  }
  private button(x:number,y:number,label:string,fn:()=>void):Phaser.GameObjects.Text { const b=this.add.text(x,y,label,{fontFamily:"system-ui",fontSize:"16px",fontStyle:"bold",color:"#fff4d8",backgroundColor:"#297c78",padding:{x:16,y:12},align:"center"}).setOrigin(.5).setInteractive({useHandCursor:true}).on("pointerup",fn);this.overlay.push(b);return b; }
  private handleContractResult=(message:string):void=>{this.contractResult=message;if(this.overlay.length){this.closeOverlay();this.time.delayedCall(0,()=>this.openContracts());}};
  private openContracts=(reward?:{base:number;bonus:number;reputation:number}):void=>{
    if(this.overlay.length)return;this.overlayBase(reward?"契約達成":"出荷契約");const state=this.lastState;if(!state)return;const w=this.scale.width,h=this.scale.height;
    if(reward){const t=this.add.text(w/2,h/2-55,`基本報酬 ${reward.base}コイン\n早期達成ボーナス ${reward.bonus}コイン\n評判 +${reward.reputation}`,{fontFamily:"system-ui",fontSize:"21px",color:"#49382e",align:"center",lineSpacing:10}).setOrigin(.5);this.overlay.push(t);this.button(w/2,h/2+120,"閉じる",()=>this.closeOverlay());return;}
    const compact=w<700||h<650,top=compact?105:h/2-220;
    const rep=this.add.text(w/2,top-34,`評判 ${state.contracts.reputation.points}　完了 ${state.contracts.statistics.contractsCompleted}　見送り ${state.contracts.statistics.offersDeclined}${this.contractResult?`\n${this.contractResult}`:""}`,{fontFamily:"system-ui",fontSize:compact?"13px":"17px",color:"#49382e",align:"center"}).setOrigin(.5);this.overlay.push(rep);
    state.contracts.offers.forEach((offer,i)=>{const x=compact?w/2:w/2-300+i*300,y=compact?top+i*105:top;const req=RESOURCE_IDS.filter(id=>offer.requirements[id]>0).map(id=>`${RESOURCE_DEFINITIONS[id].publicName} ${offer.requirements[id]}`).join(" / ");const card=this.add.text(x,y,`${formatContractIdentity(offer)}　${offer.type==="priority"?"優先":"契約候補"}\n${req}\n基本報酬 ${offer.baseRewardCoins}　早期目標 ${Math.round((offer.targetBonusMs??0)/1000)}秒`,{fontFamily:"system-ui",fontSize:compact?"12px":"15px",color:"#49382e",backgroundColor:"#eadbb9",padding:{x:10,y:7},align:"center",fixedWidth:compact?Math.min(w-36,470):270}).setOrigin(.5,0);this.overlay.push(card);this.button(x-48,y+(compact?78:92),"受注",()=>this.game.events.emit(GAME_EVENTS.contractAction,"accept",offer.id));this.button(x+48,y+(compact?78:92),"見送る",()=>this.game.events.emit(GAME_EVENTS.contractAction,"decline",offer.id));});
    if(state.contracts.active){const active=state.contracts.active,rows=RESOURCE_IDS.filter(id=>active.requirements[id]>0).map(id=>{const missing=Math.max(0,active.requirements[id]-active.delivered[id]-state.cargo.amounts[id]-state.barn[id]);return `${RESOURCE_DEFINITIONS[id].publicName}　必要 ${active.requirements[id]}　納品 ${active.delivered[id]}\n持ち物 ${state.cargo.amounts[id]}　倉庫 ${state.barn[id]}　不足 ${missing}`;});const text=this.add.text(w/2,compact?h-150:h/2+80,`${formatContractIdentity(active)}　進行中\n${rows.join("　")}\n基本報酬 ${active.baseRewardCoins}　早期達成ボーナス ${Math.floor(active.baseRewardCoins*active.bonusMultiplier)}　経過 ${Math.floor(active.elapsedActiveMs/1000)}秒`,{fontFamily:"system-ui",fontSize:compact?"11px":"15px",color:"#49382e",align:"center",wordWrap:{width:w-40}}).setOrigin(.5);this.overlay.push(text);let armed=false;const cancel=this.button(w/2,compact?h-65:h-72,"契約を中止",()=>{if(!armed){armed=true;cancel.setText("もう一度押して中止");return;}this.game.events.emit(GAME_EVENTS.contractAction,"cancel");});}
    this.button(w-70,30,"閉じる",()=>{this.contractResult="";this.closeOverlay();});
  };
  private openPause=():void=>{if(this.overlay.length)return;this.overlayBase("一時停止・管理");const w=this.scale.width,h=this.scale.height;["ゲームに戻る","今すぐ保存","出荷契約","設定","セーブデータを書き出す","セーブデータを読み込む","タイトルへ戻る","農場を最初からやり直す"].forEach((label,i)=>this.button(w/2,h/2-190+i*52,label,()=>{if(label==="ゲームに戻る")this.closeOverlay();else if(label==="出荷契約"){this.closeOverlay();this.openContracts();}else this.game.events.emit(`management-${label}`);}));};
  private openOperations=(result=""):void=>{if(this.overlay.length||!this.lastState)return;this.overlayBase("研修小屋　スタッフ管理");const state=this.lastState,w=this.scale.width,h=this.scale.height,keys:Record<WorkerRoleId,keyof GameState["workers"]>={"wheat-harvester":"harvestWorker","wheat-transporter":"transportWorker","corn-harvester":"cornHarvestWorker","corn-transporter":"cornTransportWorker","poultry-caretaker":"poultryCaretaker"};const summary=this.add.text(w/2,h/2-Math.min(h-24,700)/2+76,`コイン ${state.economy.walletCoins}　評判 ${state.contracts.reputation.points}\n契約 ${state.contracts.active?"進行中":"なし"}${result?`\n${result}`:""}`,{fontFamily:"system-ui",fontSize:"16px",color:"#49382e",align:"center"}).setOrigin(.5,0);this.overlay.push(summary);const compact=h<600;WORKER_ROLE_IDS.forEach((role,index)=>{const worker=state.workers[keys[role]],definition=WORKER_ROLES[role],cost=worker.hired?getWorkerTrainingCost(role,worker.level):definition.hireCost,label=worker.hired?`Lv${worker.level}　${worker.status}`:"未雇用",x=w/2,y=(compact?130:170)+index*(compact?70:82);const card=this.add.text(x-80,y,`${definition.publicName}\n${label}　${cost===null?"最大レベル":`${cost}コイン`}`,{fontFamily:"system-ui",fontSize:compact?"13px":"15px",color:"#49382e",backgroundColor:"#eadbb9",padding:{x:12,y:8},fixedWidth:Math.min(500,w-150)}).setOrigin(.5);this.overlay.push(card);this.button(x+Math.min(270,w/2-55),y,worker.hired?(cost===null?"最大":"研修"):"雇用",()=>{if(cost!==null)this.game.events.emit(GAME_EVENTS.operationsAction,worker.hired?"train":"hire",role);this.closeOverlay();this.time.delayedCall(0,()=>this.openOperations(`${definition.publicName}の手続きを実行しました（${cost}コイン）`));});});this.button(w-75,50,"閉じる",()=>this.closeOverlay());};
  private showOperationsButton=(visible:boolean):void=>{this.operationsButton.setVisible(visible&&!this.overlay.length);};
  private showProcessingButton=(visible:boolean):void=>{this.processingButton.setVisible(visible&&!this.overlay.length);};
  private showCollectionButton=(visible:boolean):void=>{this.collectionButton.setVisible(visible&&!this.overlay.length);};
  private openInventory=():void=>{
    if(this.overlay.length||!this.lastState)return;this.overlayBase("在庫台帳");
    const vm=createInventoryViewModel(this.lastState),w=this.scale.width,h=this.scale.height,compact=w<700||h<650;
    const sections=["持ち物・倉庫","全保管場所","生産設備内","集荷・集配"] as const;
    const tabY=this.panelRect.y+(compact?72:82),columns=compact?2:4,tabWidth=Math.min(210,(this.panelRect.width-20)/columns);
    sections.forEach((label,index)=>{const row=Math.floor(index/columns),col=index%columns;this.addModalButton(this.panelRect.x+10+tabWidth/2+col*tabWidth,tabY+row*52,tabWidth-4,label,()=>{this.closeOverlay();this.inventoryPage=index;this.inventoryRowPage=0;this.openInventory();},index!==this.inventoryPage,"選択中");});
    const tabsBottom=tabY+(Math.ceil(sections.length/columns)-1)*52+28,bottom=this.panelRect.y+this.panelRect.height-66;
    this.contentRect={x:this.panelRect.x+12,y:tabsBottom+8,width:this.panelRect.width-24,height:Math.max(70,bottom-tabsBottom-12)};
    const perPage=h<430?3:h<650?5:h<850?7:11,maxPage=Math.max(0,Math.ceil(vm.rows.length/perPage)-1);this.inventoryRowPage=Math.min(this.inventoryRowPage,maxPage);
    const rows=vm.rows.slice(this.inventoryRowPage*perPage,(this.inventoryRowPage+1)*perPage),section=sections[this.inventoryPage];
    const location=(r:(typeof vm.rows)[number])=>[
      `持ち物 ${r.carried}　倉庫 ${r.barn}　売り場 ${r.market}`,
      `麦集荷 ${r.wheatFieldCrate}　とうもろこし集荷 ${r.cornFieldCrate}　卵置場 ${r.eggStorage}　干し草台 ${r.hayRack}　ミルクタンク ${r.milkTank}`,
      `集配箱 ${r.collectionBoxes}　配送中 ${r.courierCargo}　加工場受入 ${r.processingIntake}`,
      `機械 入力 ${r.machineInput} / 予約 ${r.machineReserved} / 完成 ${r.machineOutput} / スタッフ ${r.processingWorkerCargo}`,
      `乳製品 入力 ${r.dairyInput} / 予約 ${r.dairyReserved} / 完成 ${r.dairyOutput} / スタッフ ${r.dairyWorkerCargo}`,
      `農場内総数 ${r.totalOnFarm}`].join("\n");
    let lines:string[]=[];
    if(section==="持ち物・倉庫")lines=[`商品 | 持ち物 | 倉庫 | 利用可能計`,...rows.map(r=>`${r.name}　| ${r.carried} | ${r.barn} | ${r.availableForContract}`),`持ち物合計 ${vm.carriedTotal}/${vm.carriedCapacity}　倉庫合計 ${vm.barnTotal}`];
    else if(section==="全保管場所")lines=rows.flatMap(r=>[`${r.name}`,location(r)]);
    else if(section==="生産設備内")lines=rows.map(r=>`${r.name}　入力 ${r.machineInput+r.dairyInput}　予約 ${r.machineReserved+r.dairyReserved}　完成 ${r.machineOutput+r.dairyOutput}　運搬中 ${r.processingWorkerCargo+r.dairyWorkerCargo}`);
    else lines=rows.map(r=>`${r.name}　畑・畜産 ${r.wheatFieldCrate+r.cornFieldCrate+r.eggStorage+r.hayRack+r.milkTank}　集配箱 ${r.collectionBoxes}　配送中 ${r.courierCargo}　加工場受入 ${r.processingIntake}`);
    lines.push(`売り場合計 ${vm.marketTotal}/${vm.marketCapacity}　集荷・集配合計 ${vm.farmBufferTotal}　生産設備内合計 ${vm.productionTotal}　農場内総数 ${vm.totalOnFarm}`);
    const info=this.add.text(this.contentRect.x+8,this.contentRect.y+4,lines.join("\n"),{fontFamily:"system-ui",fontSize:compact?"12px":"16px",color:"#49382e",lineSpacing:compact?2:5,wordWrap:{width:this.contentRect.width-16}}).setOrigin(0,0);this.overlay.push(info);
    this.addModalButton(this.panelRect.x+70,bottom+28,112,"前へ",()=>{this.closeOverlay();this.inventoryRowPage=Math.max(0,this.inventoryRowPage-1);this.openInventory();},this.inventoryRowPage>0);
    this.addModalButton(this.panelRect.x+this.panelRect.width-70,bottom+28,112,"次へ",()=>{this.closeOverlay();this.inventoryRowPage=Math.min(maxPage,this.inventoryRowPage+1);this.openInventory();},this.inventoryRowPage<maxPage);
    const indicator=this.add.text(w/2,bottom+18,`${this.inventoryRowPage+1} / ${maxPage+1}ページ　全11商品（すべて表示）`,{fontFamily:"system-ui",fontSize:compact?"12px":"14px",color:"#49382e"}).setOrigin(.5);this.overlay.push(indicator);
    this.addModalButton(this.panelRect.x+this.panelRect.width-64,this.panelRect.y+30,104,"閉じる",()=>this.closeOverlay());
  };
  private handleCollectionResult=(result:CollectionCommandResult):void=>{this.collectionResult=result.message;if(this.collectionOpenState)this.renderCollection();};
  private collectionCommand(command:CollectionCommand):void{this.game.events.emit(GAME_EVENTS.collectionAction,command);}
  private addModalButton(x:number,y:number,width:number,label:string,command:CollectionCommand|(()=>void),enabled=true,reason?:string):void{const b=new ModalButton(this,x,y,width,label,()=>typeof command==="function"?command():this.collectionCommand(command)).setEnabled(enabled,reason);this.modalButtons.push(b);this.overlay.push(b);}
  private renderCollection():void{if(!this.lastState)return;for(const item of this.overlay)item.destroy();this.overlay=[];this.modalButtons=[];this.modalFocus=-1;this.overlayBase("集配所　管理");this.collectionOpenState=true;const state=this.lastState,vm=getCollectionPanelViewModel(state,this.collectionResult?{message:this.collectionResult}:undefined),w=this.scale.width,h=this.scale.height,compact=w<700||h<650;const pages=["施設","集配スタッフ","配送設定","緊急操作"] as const;const page=pages[this.collectionPage];const top=compact?74:92;const tabsWidth=Math.min(180,(w-32)/4);pages.forEach((label,index)=>this.addModalButton(16+tabsWidth/2+index*tabsWidth,top,tabsWidth-4,label,()=>{this.collectionPage=index;this.renderCollection();},index!==this.collectionPage,"選択中"));let body="";if(page==="施設")body=vm.facilities.map(f=>`${f.definition.publicName}　${f.built?"建設済み":f.visible?(f.missingPrerequisites.length?"前提条件未達":`${f.definition.cost}コイン`):"未解放"}${f.definition.capacity?`　${f.amount}/${f.definition.capacity}`:""}`).join("\n");else if(page==="集配スタッフ"){const c=vm.courier;body=`${c.hired?`Lv${c.level}`:"未雇用"}　容量 ${c.capacity}　${c.stage}\n積載 ${c.load}/${c.capacity}　麦${c.carried.wheat} とうもろこし${c.carried.corn} たまご${c.carried.egg}\n現在地 ${c.sourceId??"集配所"}　配送先 ${c.destinationId??"なし"}`;}else if(page==="配送設定")body=`現在の配送モード：${vm.routingMode==="auto"?"自動":vm.routingMode==="processing-first"?"加工場優先":"倉庫優先"}`;else body=COLLECTION_SOURCES.map(id=>`${COLLECTION_FACILITIES[id].publicName}　${state.collectionNetwork.boxes[id].amounts[id]}個 → 倉庫`).join("\n");const info=this.add.text(w/2,top+48,`所持コイン ${vm.walletCoins}\n${body}\n\n${this.collectionResult}`,{fontFamily:"system-ui",fontSize:compact?"13px":"17px",color:this.collectionResult?"#7a3d24":"#49382e",lineSpacing:compact?4:8,align:"left",wordWrap:{width:w-42}}).setOrigin(.5,0);this.overlay.push(info);const bottom=h-(compact?76:92),buttonWidth=Math.min(190,(w-32)/3-6);if(page==="施設"){const candidates=vm.facilities.filter(f=>f.definition.id!=="processing-intake"&&f.visible&&!f.built).slice(0,compact?2:4);candidates.forEach((f,i)=>this.addModalButton(16+buttonWidth/2+i*(buttonWidth+6),bottom,buttonWidth,`${f.definition.publicName} 建設`,{type:"build",facilityId:f.definition.id as "hub"|"wheat"|"corn"|"egg"},f.available,f.missingPrerequisites.length?"前提条件未達":f.missingCoins?`あと${f.missingCoins}コイン`:undefined));}else if(page==="集配スタッフ"){const c=vm.courier;this.addModalButton(w/2-buttonWidth/2-4,bottom,buttonWidth,c.hired?(c.level===3?"最大レベル":`研修 ${c.trainingCost}`):"雇用 480",{type:c.hired?"train-courier":"hire-courier"},!c.hired||c.level<3,c.level===3?"最大レベル":undefined);this.addModalButton(w/2+buttonWidth/2+4,bottom,buttonWidth,"集配所へ案内",{type:"locate",facilityId:"hub"});}else if(page==="配送設定")(["auto","processing-first","barn-first"] as CollectionRoutingMode[]).forEach((mode,i)=>this.addModalButton(w/2+(i-1)*(buttonWidth+6),bottom,buttonWidth,mode==="auto"?"自動":mode==="processing-first"?"加工場優先":"倉庫優先",{type:"select-routing-mode",mode},true));else COLLECTION_SOURCES.forEach((source,i)=>{const amount=state.collectionNetwork.boxes[source].amounts[source];this.addModalButton(w/2+(i-1)*(buttonWidth+6),bottom,buttonWidth,`${source==="wheat"?"麦":source==="corn"?"とうもろこし":"たまご"}を倉庫へ移す`,{type:"flush-source",source},amount>0,amount>0?undefined:"在庫が空です");});this.addModalButton(w-70,30,112,"閉じる",()=>this.closeOverlay());}
  private openCollection=():void=>{if(this.overlay.length||!this.lastState)return;this.collectionOpenState=true;this.collectionPage=0;this.collectionResult="";this.renderCollection();};
  private handleModalKey=(event:KeyboardEvent):void=>{if(!this.overlay.length)return;if(event.key==="Escape"){event.preventDefault();this.closeOverlay();return;}if(event.key==="Tab"){event.preventDefault();if(!this.modalButtons.length)return;this.modalFocus=(this.modalFocus+(event.shiftKey?-1:1)+this.modalButtons.length)%this.modalButtons.length;this.modalButtons.forEach((button,index)=>button.setFocused(index===this.modalFocus));}else if((event.key==="Enter"||event.key===" ")&&this.modalFocus>=0){event.preventDefault();this.modalButtons[this.modalFocus].trigger();}else if(event.key==="PageDown"||event.key==="ArrowDown"){event.preventDefault();const next=this.modalButtons.find(button=>button.getSerializableRect().label==="次へ"&&button.isEnabled());next?.trigger();}else if(event.key==="PageUp"||event.key==="ArrowUp"){event.preventDefault();const previous=this.modalButtons.find(button=>button.getSerializableRect().label==="前へ"&&button.isEnabled());previous?.trigger();}};
  private turnModalPage(direction:-1|1):void{const label=direction>0?"次へ":"前へ";this.modalButtons.find(button=>button.getSerializableRect().label===label&&button.isEnabled())?.trigger();}
  private handleModalWheel=(_pointer:Phaser.Input.Pointer,_objects:Phaser.GameObjects.GameObject[],_dx:number,dy:number):void=>{if(this.overlay.length&&Math.abs(dy)>4)this.turnModalPage(dy>0?1:-1);};
  private handleModalPointerDown=(pointer:Phaser.Input.Pointer):void=>{if(this.overlay.length&&pointer.x>=this.contentRect.x&&pointer.x<=this.contentRect.x+this.contentRect.width&&pointer.y>=this.contentRect.y&&pointer.y<=this.contentRect.y+this.contentRect.height)this.modalDragStartY=pointer.y;};
  private handleModalPointerUp=(pointer:Phaser.Input.Pointer):void=>{if(this.modalDragStartY!==null&&Math.abs(pointer.y-this.modalDragStartY)>35)this.turnModalPage(pointer.y<this.modalDragStartY?1:-1);this.modalDragStartY=null;};
  getCollectionE2ESummary(){return{open:this.collectionOpenState,page:this.collectionPage,result:this.collectionResult,focusedCount:this.modalButtons.filter(button=>button.isFocused()).length,buttons:this.modalButtons.map(button=>button.getSerializableRect())};}
  getInventoryE2ESummary(){const ledger=this.lastState?createInventoryViewModel(this.lastState):null;return{carried:this.carriedText.text,barn:this.barnText.text,market:this.marketText.text,till:this.tillText.text,wallet:this.walletText.text,page:this.inventoryPage,section:["持ち物・倉庫","全保管場所","生産設備内","集荷・集配"][this.inventoryPage],scrollPosition:this.inventoryRowPage,scrollMaximum:ledger?Math.max(0,Math.ceil(ledger.rows.length/(this.scale.height<430?3:this.scale.height<650?5:this.scale.height<850?7:11))-1):0,panel:{...this.panelRect},content:{...this.contentRect},rows:ledger?.rows??[],overlayText:this.overlay.filter((item):item is Phaser.GameObjects.Text=>item instanceof Phaser.GameObjects.Text).map(item=>item.text),visibleText:this.getVisibleTextDiagnostics(),buttons:this.modalButtons.map(button=>button.getSerializableRect())};}
  openContractsE2E():void{this.openContracts();}
  openInventoryE2E():void{this.openInventory();}
  private openDairy=():void=>{if(this.overlay.length||!this.lastState)return;this.overlayBase("酪農管理");const state=this.lastState,d=state.dairy,status=getCowBarnStatus(d),w=this.scale.width,h=this.scale.height,compact=w<520||h<620;const text=this.add.text(w/2,compact?82:105,[`牛 ${d.cows.length} / 3　稼働中 ${status.active}　餌待ち ${status.waiting}`,`牛に保持中の牛乳 ${status.held}`,`干し草台 ${d.hayRack} / 24　ミルクタンク ${d.milkTank} / 24`,`次の牛乳 ${status.nextMilkMs===null?"待機中":`${(status.nextMilkMs/1000).toFixed(1)}秒`}`,"牛1頭：干し草1個 + 10秒 = 牛乳1個",`倉庫 干し草 ${state.barn.hay}　牛乳 ${state.barn.milk}`,`酪農スタッフ Lv${d.dairyWorker.level} 容量${getDairyWorkerCapacity(d.dairyWorker.level)}`,`乳製品スタッフ Lv${d.workshopWorker.level} 容量${getDairyWorkerCapacity(d.workshopWorker.level)}`].join("\n"),{fontFamily:"system-ui",fontSize:compact?"13px":"17px",color:"#49382e",backgroundColor:"#eadbb9",padding:{x:12,y:10},align:"center",wordWrap:{width:Math.min(w-36,700)}}).setOrigin(.5,0);this.overlay.push(text);const commands=[["持ち物の干し草を全部補充","hay-cargo"],["倉庫から目標量まで補充","hay-barn"],["牛乳を持ち物へ回収","milk-cargo"],["牛乳を倉庫へ送る","milk-barn"],[d.dairyWorker.hired?d.dairyWorker.level===3?"酪農 最大":"酪農 研修":"酪農 雇用",d.dairyWorker.hired?"train-dairy":"hire-dairy"],[d.workshopWorker.hired?d.workshopWorker.level===3?"乳製品 最大":"乳製品 研修":"乳製品 雇用",d.workshopWorker.hired?"train-workshop":"hire-workshop"]] as const;commands.forEach(([label,command],i)=>this.addModalButton(w/2+(i%2?140:-140),compact?330+Math.floor(i/2)*48:390+Math.floor(i/2)*55,260,label,()=>{this.game.events.emit(GAME_EVENTS.dairyAction,command);this.closeOverlay();this.time.delayedCall(0,()=>this.openDairy());},!label.includes("最大")));this.addModalButton(w-70,40,110,"閉じる",()=>this.closeOverlay());};
  openProcessingE2E(page=0):void{this.processingPage=Math.max(0,Math.min(5,page));this.processingContentPage=0;this.openProcessing();}
  private openProcessing=(pageOrResult:number|string=""):void=>{
    if(typeof pageOrResult==="number"){this.processingPage=pageOrResult;pageOrResult="";}if(this.overlay.length||!this.lastState)return;this.planSliders=[];this.overlayBase("加工場　生産管理");const state=this.lastState,w=this.scale.width,h=this.scale.height,compact=w<700||h<650;
    const tabs=["概要","レシピ帳","製粉機","ベーカリー","完成品","スタッフ"] as const,columns=compact?3:6,tabWidth=(this.panelRect.width-20)/columns,tabY=this.panelRect.y+(compact?70:82);
    tabs.forEach((label,index)=>this.addModalButton(this.panelRect.x+10+tabWidth/2+(index%columns)*tabWidth,tabY+Math.floor(index/columns)*52,tabWidth-4,label,()=>{this.closeOverlay();this.processingPage=index;this.processingContentPage=0;this.openProcessing();},index!==this.processingPage,"選択中"));
    const top=tabY+(Math.ceil(tabs.length/columns)-1)*52+34,bottom=this.panelRect.y+this.panelRect.height-68;this.contentRect={x:this.panelRect.x+12,y:top,width:this.panelRect.width-24,height:Math.max(60,bottom-top)};const tab=tabs[this.processingPage],cards:string[]=[];
    const format=(amounts:typeof state.barn)=>RESOURCE_IDS.filter(id=>amounts[id]>0).map(id=>`${RESOURCE_DEFINITIONS[id].publicName} ${amounts[id]}`).join(" + ")||"なし";
    if(tab==="概要")cards.push(`加工場の流れ
1. レシピを選び、仕込み回数を設定
2. 搬入口へ素材を入れる
3. 機械が自動で加工
4. 受取口またはスタッフが完成品を回収`,`製粉機：${createMachineViewModel("grain-mill",state.processing.mill).primaryAction}
ベーカリー：${createMachineViewModel("bakery",state.processing.bakery).primaryAction}`);
    else if(tab==="レシピ帳"){for(const machineId of ["grain-mill","bakery"] as const){const machine=machineId==="grain-mill"?state.processing.mill:state.processing.bakery,vm=createProcessingPlanViewModel(machineId,machine,this.processingPlans[machineId],state.cargo.amounts,state.barn);for(const card of vm.recipeCards)cards.push(`【${format(card.outputs)}】 ${card.name}
必要 ${format(card.inputs)} → 出力 ${format(card.outputs)}
基本 ${(card.baseDurationMs/1000).toFixed(1)}秒　現在 Lv${machine.level}：${(card.currentDurationMs/1000).toFixed(1)}秒
持ち物 ${format(card.cargo)}
倉庫 ${format(card.barn)}
機械入力 ${format(card.machineInput)}
現在作れる回数 ${card.craftableCycles}回
対応設備 ${machineId==="grain-mill"?"製粉機":"ベーカリー"}
このレシピを設定`);}}
    else if(tab==="完成品")cards.push(`製粉機　${format(state.processing.mill.output.amounts)}　${Object.values(state.processing.mill.output.amounts).reduce((a,b)=>a+b,0)}/${state.processing.mill.output.capacity}`,`ベーカリー　${format(state.processing.bakery.output.amounts)}　${Object.values(state.processing.bakery.output.amounts).reduce((a,b)=>a+b,0)}/${state.processing.bakery.output.capacity}`);
    else if(tab==="スタッフ")cards.push(`製粉スタッフ Lv${state.processing.millOperator.level}　容量 ${getProcessingWorkerCapacity("millOperator",state.processing.millOperator.level)}
${state.processing.millOperator.publicStatus}`,`製パンスタッフ Lv${state.processing.baker.level}　容量 ${getProcessingWorkerCapacity("baker",state.processing.baker.level)}
${state.processing.baker.publicStatus}`);
    else {const machineId:MachineId=tab==="製粉機"?"grain-mill":"bakery",machine=machineId==="grain-mill"?state.processing.mill:state.processing.bakery,vm=createProcessingPlanViewModel(machineId,machine,this.processingPlans[machineId],state.cargo.amounts,state.barn);cards.push(`【運転モード】 ${machine.enabled?machine.selectedMode==="auto"?"自動":RECIPES[machine.selectedMode].publicName:"停止"}
【仕込み計画】 ${vm.recipeCards.map(c=>`${c.name} ${c.targetCycles}回`).join(" / ")}
【必要素材目標】 ${format(vm.targetInputs)}
【入力庫】 ${format(machine.input.amounts)}
目標合計 ${vm.targetInputTotal} / ${vm.inputCapacity}　残り設定可能 ${vm.remainingPlanCapacity}枠
【加工中】 ${machine.activeCycle?RECIPES[machine.activeCycle.recipeId].publicName:"なし"}
【完成品】 ${format(machine.output.amounts)}
【停止理由・次の操作】 ${createMachineViewModel(machineId,machine).primaryAction}`,...vm.recipeCards.map(c=>`【${c.name}】 ${format(c.inputs)} → ${format(c.outputs)}
目標 ${c.targetCycles}回　不足 ${format(c.missingInputs)}`));}
    const perPage=h<430?1:h<650?2:4,maxPage=Math.max(0,Math.ceil(cards.length/perPage)-1);this.processingContentPage=Math.min(this.processingContentPage,maxPage);const shown=cards.slice(this.processingContentPage*perPage,(this.processingContentPage+1)*perPage);let y=this.contentRect.y+4;for(const card of shown){const text=this.add.text(this.contentRect.x+8,y,card,{fontFamily:"system-ui",fontSize:compact?"12px":"16px",color:"#49382e",backgroundColor:"#eadbb9",padding:{x:8,y:6},wordWrap:{width:this.contentRect.width-32},fixedWidth:this.contentRect.width-16}).setOrigin(0,0);this.overlay.push(text);y+=text.height+8;}
    if(tab==="レシピ帳"){const recipe=Object.values(RECIPES)[this.processingContentPage];if(recipe)this.addModalButton(this.panelRect.x+this.panelRect.width/2,bottom-24,Math.min(260,this.panelRect.width-150),"このレシピを設定",()=>{this.game.events.emit(GAME_EVENTS.processingAction,recipe.machine,recipe.id);this.closeOverlay();this.processingPage=recipe.machine==="grain-mill"?2:3;this.processingContentPage=0;this.time.delayedCall(0,()=>this.openProcessing());});}
    if(tab==="製粉機"||tab==="ベーカリー"){const machineId:MachineId=tab==="製粉機"?"grain-mill":"bakery",machine=machineId==="grain-mill"?state.processing.mill:state.processing.bakery,recipeIds=Object.values(RECIPES).filter(r=>r.machine===machineId).map(r=>r.id),diagnosis=diagnoseProcessingBuffer(machineId,machine,this.processingPlans[machineId]);cards.push(`診断：${diagnosis.blockedReason??"稼働可能"}　入力 ${format(diagnosis.current)}\n目標 ${format(diagnosis.target)}　不足 ${format(diagnosis.deficit)}　余剰 ${format(diagnosis.excess)}\n予約 ${format(diagnosis.reserved)}　空き ${diagnosis.freeCapacity}/${diagnosis.capacity}`);recipeIds.forEach((recipeId,index)=>{const current=this.processingPlans[machineId].targetCyclesByRecipe[recipeId]??0,sliderWidth=Math.max(80,Math.min(220,(this.panelRect.width-220)/2)),sy=bottom-180-index*54;this.addModalButton(this.panelRect.x+40,sy,48,"−",()=>this.changePlan(machineId,recipeId,current-1),current>0);const slider=new DiscreteSlider(this,this.panelRect.x+this.panelRect.width/2,sy,sliderWidth,current,0,10,value=>this.changePlan(machineId,recipeId,value));this.planSliders.push(slider);this.overlay.push(slider);this.addModalButton(this.panelRect.x+this.panelRect.width-40,sy,48,"＋",()=>this.changePlan(machineId,recipeId,current+1),current<10);});const modes=[["持物優先","cargo-first"],["倉庫優先","barn-first"],["持物のみ","cargo-only"],["倉庫のみ","barn-only"]] as const,modeWidth=(this.panelRect.width-24)/4;modes.forEach(([label,mode],index)=>this.addModalButton(this.panelRect.x+12+modeWidth*(index+.5),bottom-112,modeWidth-4,label,()=>this.game.events.emit(GAME_EVENTS.processingAction,machineId,mode)));const actionY=bottom-58,buttonWidth=Math.min(180,(this.panelRect.width-24)/3);this.addModalButton(this.panelRect.x+12+buttonWidth/2,actionY,buttonWidth-4,"倉庫から計画まで",()=>this.game.events.emit(GAME_EVENTS.processingAction,machineId,"refill"));this.addModalButton(this.panelRect.x+this.panelRect.width/2,actionY,buttonWidth-4,"入力を計画へ整列",()=>this.game.events.emit(GAME_EVENTS.processingAction,machineId,"align"));this.addModalButton(this.panelRect.x+this.panelRect.width-12-buttonWidth/2,actionY,buttonWidth-4,"入力を全て倉庫へ",()=>this.game.events.emit(GAME_EVENTS.processingAction,machineId,"empty"));}
    const notice=String(pageOrResult||this.planMessage);if(notice){const text=this.add.text(this.contentRect.x+8,bottom-18,notice,{fontFamily:"system-ui",fontSize:"13px",color:"#7a3d24"});this.overlay.push(text);}this.addModalButton(this.panelRect.x+70,bottom+30,112,"前へ",()=>{this.closeOverlay();this.processingContentPage=Math.max(0,this.processingContentPage-1);this.openProcessing();},this.processingContentPage>0);this.addModalButton(this.panelRect.x+this.panelRect.width-70,bottom+30,112,"次へ",()=>{this.closeOverlay();this.processingContentPage=Math.min(maxPage,this.processingContentPage+1);this.openProcessing();},this.processingContentPage<maxPage);this.addModalButton(this.panelRect.x+this.panelRect.width-64,this.panelRect.y+30,104,"閉じる",()=>this.closeOverlay());
  };
  private changePlan(machineId:MachineId,recipeId:RecipeId,value:number):void{if(!this.lastState)return;const machine=machineId==="grain-mill"?this.lastState.processing.mill:this.lastState.processing.bakery,result=setRecipeTargetCycles(machineId,recipeId,value,this.processingPlans[machineId],machine.input.capacity);this.planMessage=result.message??"仕込み計画を変更しました";if(result.accepted){this.processingPlans[machineId]=result.plan;this.game.events.emit(GAME_EVENTS.processingAction,machineId,"plan",recipeId,value);}this.closeOverlay();this.time.delayedCall(0,()=>this.openProcessing());}
  private getVisibleTextDiagnostics(){return this.overlay.filter((item):item is Phaser.GameObjects.Text=>item instanceof Phaser.GameObjects.Text).map(item=>{const bounds=item.getBounds(),intersection=Phaser.Geom.Intersects.RectangleToRectangle(bounds,new Phaser.Geom.Rectangle(this.contentRect.x,this.contentRect.y,this.contentRect.width,this.contentRect.height));return{label:item.text.split("\n")[0]??"",text:item.text,x:bounds.x,y:bounds.y,width:bounds.width,height:bounds.height,clipped:bounds.x<this.contentRect.x||bounds.right>this.contentRect.x+this.contentRect.width||bounds.y<this.contentRect.y||bounds.bottom>this.contentRect.y+this.contentRect.height,visible:item.visible&&item.alpha>0&&intersection};});}
  getProcessingPanelE2ESummary(){const machine=this.lastState?(this.processingPage===2?createMachineViewModel("grain-mill",this.lastState.processing.mill):this.processingPage===3?createMachineViewModel("bakery",this.lastState.processing.bakery):null):null;return{page:this.processingPage,pageName:["概要","レシピ帳","製粉機","ベーカリー","完成品","スタッフ"][this.processingPage],scrollPosition:this.processingContentPage,panel:{...this.panelRect},content:{...this.contentRect},visibleText:this.getVisibleTextDiagnostics(),buttons:this.modalButtons.map(button=>button.getSerializableRect()),sliders:this.planSliders.map(slider=>slider.getSerializableRect()),machine};}
  private closeOverlay():void{for(const item of this.overlay)item.destroy();this.overlay=[];this.modalButtons=[];this.modalFocus=-1;this.collectionOpenState=false;this.scene.resume("game");}
  getDirection(): Point {
    return this.joystick?.direction ?? { x: 0, y: 0 };
  }
  fadeMoveHint(): void {
    if (this.moveHint.alpha > 0)
      this.tweens.add({ targets: this.moveHint, alpha: 0, duration: 600 });
  }
  resetInput(): void {
    this.joystick?.reset();
  }
  private updateState(state: GameState): void {
    this.lastState = state;
    if(this.collectionOpenState)this.time.delayedCall(0,()=>{if(this.collectionOpenState)this.renderCollection();});
    const carried = state.cargo,vm=createInventoryViewModel(state); const total = vm.carriedTotal,compact=this.scale.width<520;
    this.carriedText.setText([`持ち物　${total} / ${carried.capacity}`,...(total?formatCompactRows(vm.rows,compact?2:3,"carried"):["空"]),"一覧"].join("\n"));
    const unlocked = state.landExpansion;
    this.barnText.setText([`倉庫　合計 ${vm.barnTotal}`,...formatCompactRows(vm.rows,compact?1:2,"barn"),"一覧"].join("\n"));
    this.marketText.setText(["売り場",`販売棚 合計 ${vm.marketTotal} / ${vm.marketCapacity}`,...formatCompactRows(vm.rows,compact?1:2,"market")].join("\n"));
    this.livestockText.setVisible(unlocked.southChickenCoopUnlocked).setText(`鶏小屋\n餌 ${state.livestock.feed} / ${state.livestock.feedCapacity}　卵 ${state.livestock.eggs} / ${state.livestock.eggCapacity}\n飼育 ${state.workers.poultryCaretaker.status}`);
    if(state.dairy.pastureUnlocked)this.livestockText.setVisible(true).setText(`${this.livestockText.text}\n酪農　牛 ${state.dairy.cows.length}/3　草 ${state.dairy.hayRack}/24　乳 ${state.dairy.milkTank}/24${state.dairy.workshopBuilt?`\n工房 ${state.dairy.cycle?`${state.dairy.cycle.recipe} 加工中`:"待機"}`:""}`);
    this.tillText.setText(`未回収売上  ${state.economy.tillCoins}コイン`);
    this.walletText.setText(`所持コイン  ${state.economy.walletCoins}コイン`);
    this.crateText.setText(
      `${compact ? "集荷" : "集荷箱"}  ${state.inventory.fieldCrate}/${state.inventory.fieldCrateCapacity}`,
    );
    this.harvestWorkerText.setText(
      `${compact ? "収穫" : "収穫スタッフ"}  ${state.workers.harvestWorker.status}`,
    );
    this.transportWorkerText.setText(
      `${compact ? "運搬" : "運搬スタッフ"}  ${state.workers.transportWorker.status}　${state.workers.transportWorker.carried}/${getWheatWorkerRuntimeParameters("wheat-transporter",state.workers.transportWorker.level).capacity}`,
    );
    this.drawMeters();
  }
  private drawMeters(): void {
    const cargo = this.lastState?.cargo;
    const count = cargo ? getCarriedTotal(cargo) : 0;
    const capacity = cargo?.capacity ?? 12;
    const layout = calculateInputLayout(this.scale.width, this.scale.height);
    const g = this.meters.clear();
    const columns = this.scale.width < 520 ? 12 : 12;
    for (let i = 0; i < capacity; i++) {
      const x = layout.inventoryHud.x + 15 + (i % columns) * 12;
      const y = layout.inventoryHud.y + 66 + Math.floor(i / columns) * 10;
      g.lineStyle(1, palette.outline, 0.5)
        .fillStyle(i < count ? (i < (cargo?.amounts.wheat ?? 0) ? colors.wheat : i < (cargo?.amounts.wheat ?? 0) + (cargo?.amounts.corn ?? 0) ? 0xf2c84b : colors.cream) : palette.creamDark, 0.9)
        .fillRoundedRect(x, y, 9, 7, 2).strokeRoundedRect(x, y, 9, 7, 2);
    }
  }
  private showFull(): void {
    this.fullBadge.setAlpha(1).setScale(1.12);
    this.tweens.add({
      targets: this.fullBadge,
      alpha: 0,
      scale: 1,
      delay: 900,
      duration: 500,
    });
  }
  private pulseWallet(): void {
    this.tweens.add({
      targets: this.walletText,
      scale: 1.18,
      yoyo: true,
      duration: 100,
    });
  }
  private showContextHint(message: string): void { this.contextHint.setText(message).setAlpha(1); this.tweens.killTweensOf(this.contextHint); this.tweens.add({ targets: this.contextHint, alpha: 0, delay: 1700, duration: 350 }); }
  private updateTutorial(stage: number): void {
    const messages = [
      "麦畑へ移動しましょう",
      "麦を収穫して持ち物へ加えましょう",
      "倉庫へ納品しましょう",
      "納品を続けましょう",
      "市場の棚に麦が並びます",
      "お客さんが麦を購入します",
      "売上台からコインを受け取りましょう",
      "収穫速度の台に立ちましょう",
      "収穫が速くなりました",
      "40コインで収穫スタッフを雇えます",
      "収穫スタッフが麦を集荷箱へ運びます",
      "集荷箱の受取エリアから自分で麦を運べます",
      "さらにコインを貯めて運搬スタッフを雇いましょう",
      "運搬スタッフが集荷箱から倉庫へ運びます",
      "畑から倉庫まで自動化されました",
    ];
    this.tutorial.setText(messages[Math.min(stage, messages.length - 1)] ?? "");
    if (stage >= 14)
      this.tweens.add({
        targets: this.tutorial,
        alpha: 0,
        delay: 2000,
        duration: 900,
      });
  }
  private layout(): void {
    const w = this.scale.width,
      h = this.scale.height,
      l = calculateInputLayout(w, h);
    this.panels
      .clear()
      .fillStyle(palette.cream, 0.94)
      .fillRoundedRect(
        l.inventoryHud.x,
        l.inventoryHud.y,
        l.inventoryHud.width,
        l.inventoryHud.height,
        18,
      )
      .lineStyle(3, palette.creamDark)
      .strokeRoundedRect(
        l.inventoryHud.x,
        l.inventoryHud.y,
        l.inventoryHud.width,
        l.inventoryHud.height,
        18,
      )
      .fillStyle(palette.cream, 0.94)
      .fillRoundedRect(
        l.economyHud.x,
        l.economyHud.y,
        l.economyHud.width,
        l.economyHud.height,
        18,
      )
      .lineStyle(3, palette.creamDark)
      .strokeRoundedRect(
        l.economyHud.x,
        l.economyHud.y,
        l.economyHud.width,
        l.economyHud.height,
        18,
      );
    if (this.lastState?.landExpansion.southChickenCoopUnlocked) this.panels.fillStyle(palette.cream, .94).fillRoundedRect(l.livestockHud.x, l.livestockHud.y, l.livestockHud.width, l.livestockHud.height, 18).lineStyle(3, palette.creamDark).strokeRoundedRect(l.livestockHud.x, l.livestockHud.y, l.livestockHud.width, l.livestockHud.height, 18);
    this.panels
      .fillStyle(palette.cream, 0.94)
      .fillRoundedRect(
        l.automationHud.x,
        l.automationHud.y,
        l.automationHud.width,
        l.automationHud.height,
        18,
      )
      .lineStyle(3, palette.creamDark)
      .strokeRoundedRect(
        l.automationHud.x,
        l.automationHud.y,
        l.automationHud.width,
        l.automationHud.height,
        18,
      );
    this.carriedText.setPosition(l.inventoryHud.x + 15, l.inventoryHud.y + 8);
    this.barnText.setPosition(l.inventoryHud.x + 15, l.inventoryHud.y + 52).setFontSize(w < 520 ? 13 : 15);
    this.marketText.setPosition(l.economyHud.x + 15, l.economyHud.y + 8);
    this.tillText.setPosition(l.economyHud.x + 15, l.economyHud.y + 82).setFontSize(w < 520 ? 13 : 15);
    this.walletText.setPosition(l.economyHud.x + 15, l.economyHud.y + 104).setFontSize(w < 520 ? 13 : 15);
    this.marketText.setFontSize(w < 520 ? 13 : 15);
    this.livestockText.setPosition(l.livestockHud.x + 12, l.livestockHud.y + 10).setFontSize(w < 520 ? 13 : 16);
    this.automationTitle.setPosition(
      l.automationHud.x + 14,
      l.automationHud.y + 7,
    );
    this.crateText.setPosition(l.automationHud.x + 14, l.automationHud.y + 34);
    this.harvestWorkerText
      .setPosition(l.automationHud.x + 14, l.automationHud.y + 58)
      .setFontSize(w < 520 ? 14 : 16);
    this.transportWorkerText
      .setPosition(l.automationHud.x + 14, l.automationHud.y + 81)
      .setFontSize(w < 520 ? 14 : 16);
    this.versionText.setPosition(w - 60, h - 24);
    this.tutorial
      .setWordWrapWidth(Math.max(100, l.tutorial.width))
      .setPosition(l.tutorial.x + l.tutorial.width / 2, l.tutorial.y + 25);
    this.moveHint.setPosition(w / 2, h - 28).setVisible(w >= 900);
    this.fullBadge.setPosition(w / 2, Math.min(135, h * 0.35));
    this.contextHint.setPosition(w / 2, Math.min(h - 190, Math.max(100, h * .2))).setWordWrapWidth(Math.max(160, Math.min(340, w - 32)));
    this.contractButton.setPosition(w/2,h-85);this.operationsButton.setPosition(w/2,h-140);this.dairyButton.setPosition(w/2, h-120);this.processingButton.setPosition(w/2,h-85);this.collectionButton.setPosition(w/2,h-85);this.pauseButton.setPosition(w-12,12);this.saveStatus.setPosition(w-105,12);
    this.joystick?.layout();
    this.joystick?.setEnabled(true);
    this.drawMeters();
    this.showPortraitNotice();
  }
  private showPortraitNotice(): void {
    if (portraitNoticeShown || this.scale.width >= this.scale.height) return;
    portraitNoticeShown = true;
    const notice = this.add
      .text(this.scale.width / 2, 205, "横向きにすると広く見渡せます", {
        fontFamily: "system-ui",
        fontSize: "14px",
        color: "#49382e",
        backgroundColor: "#fff4d8e8",
        padding: { x: 10, y: 6 },
      })
      .setOrigin(0.5);
    this.tweens.add({
      targets: notice,
      alpha: 0,
      delay: 3000,
      duration: 700,
      onComplete: () => notice.destroy(),
    });
  }
  private cleanup(): void {
    this.game.events.off(GAME_EVENTS.state, this.updateState, this);
    this.game.events.off(GAME_EVENTS.full, this.showFull, this);
    this.game.events.off(GAME_EVENTS.tutorial, this.updateTutorial, this);
    this.game.events.off(GAME_EVENTS.wallet, this.pulseWallet, this);
    this.game.events.off(GAME_EVENTS.hint, this.showContextHint, this);
    this.game.events.off(GAME_EVENTS.contractRange, this.showContractButton, this);this.game.events.off(GAME_EVENTS.contractOpen,this.openContracts,this);this.game.events.off(GAME_EVENTS.contractResult,this.handleContractResult,this);this.game.events.off(GAME_EVENTS.operationsRange,this.showOperationsButton,this);this.game.events.off(GAME_EVENTS.operationsOpen,this.openOperations,this);this.game.events.off(GAME_EVENTS.processingRange,this.showProcessingButton,this);this.game.events.off(GAME_EVENTS.processingOpen,this.openProcessing,this);this.game.events.off(GAME_EVENTS.collectionRange,this.showCollectionButton,this);this.game.events.off(GAME_EVENTS.collectionOpen,this.openCollection,this);this.game.events.off(GAME_EVENTS.collectionResult,this.handleCollectionResult,this);this.input.keyboard?.off("keydown",this.handleModalKey,this);this.input.off("wheel",this.handleModalWheel,this);this.input.off("pointerdown",this.handleModalPointerDown,this);this.input.off("pointerup",this.handleModalPointerUp,this);this.game.events.off("save-status",this.updateSaveStatus,this);this.input.keyboard?.off("keydown-ESC",this.togglePause,this);this.input.keyboard?.off("keydown-P",this.togglePause,this);
    this.scale.off(Phaser.Scale.Events.RESIZE, this.layout, this);
  }
}
