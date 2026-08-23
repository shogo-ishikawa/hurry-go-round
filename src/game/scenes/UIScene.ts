import Phaser from "phaser";
import { palette } from "../art/palette";
import { VirtualJoystick } from "../input/VirtualJoystick";
import { calculateInputLayout } from "../input/inputLayout";
import { GAME_EVENTS, type GameState } from "../state/GameState";
import type { Point } from "../logic/movement";
import { palette as colors } from "../art/palette";
import { getCarriedTotal } from "../logic/resources";
import { WORKER_ROLE_IDS, WORKER_ROLES, getWorkerTrainingCost, type WorkerRoleId } from "../logic/workforce";
import { getMachinePublicStatus, getProcessingConstructionAvailability, RECIPES, type MachineId, type RecipeId } from "../logic/processing";
import { ModalButton } from "./ModalButton";
import { COLLECTION_SOURCES, getCollectionPanelViewModel, type CollectionCommand, type CollectionCommandResult, type CollectionRoutingMode } from "../logic/collectionNetwork";
import { COLLECTION_FACILITIES } from "../config/collectionFacilities";
let portraitNoticeShown = false;
let lastCollectionKey = "", lastCollectionKeyShift = false, lastCollectionKeyAt = -Infinity;
export class UIScene extends Phaser.Scene {
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
  private collectionButton!:Phaser.GameObjects.Text;
  private pauseButton!: Phaser.GameObjects.Text;
  private saveStatus!: Phaser.GameObjects.Text;
  private overlay: Phaser.GameObjects.GameObject[] = [];
  private collectionOpenState=false; private collectionPage=0; private collectionResult=""; private modalButtons:ModalButton[]=[]; private modalFocus=-1;
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
    this.carriedText = this.add.text(27, 20, "持ち物\n空", style);
    this.barnText = this.add.text(27, 52, "倉庫\n麦 0", style);
    this.marketText = this.add.text(0, 0, "売り場\n麦 0 / 8", style);
    this.tillText = this.add.text(0, 0, "売上  0", style);
    this.walletText = this.add.text(0, 0, "コイン  0", style);
    this.versionText = this.add.text(0, 0, "v0.9.5", {
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
    this.game.events.on(GAME_EVENTS.operationsRange,this.showOperationsButton,this);
    this.game.events.on(GAME_EVENTS.operationsOpen,this.openOperations,this);
    this.game.events.on(GAME_EVENTS.processingRange,this.showProcessingButton,this);
    this.game.events.on(GAME_EVENTS.processingOpen,this.openProcessing,this);
    this.game.events.on(GAME_EVENTS.collectionRange,this.showCollectionButton,this);
    this.game.events.on(GAME_EVENTS.collectionOpen,this.openCollection,this);
    this.game.events.on(GAME_EVENTS.collectionResult,this.handleCollectionResult,this);
    this.input.keyboard?.on("keydown",this.handleModalKey,this);
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
    const shade=this.add.rectangle(w/2,h/2,w,h,0x49382e,.72).setInteractive(); const panel=this.add.rectangle(w/2,h/2,Math.min(w-24,1000),Math.min(h-24,700),palette.cream).setStrokeStyle(4,palette.outline); const heading=this.add.text(w/2,Math.max(24,h/2-Math.min(h-24,700)/2+28),title,{fontFamily:"system-ui",fontSize:`${Math.max(22,Math.min(34,w/20))}px`,fontStyle:"bold",color:"#49382e"}).setOrigin(.5,0); this.overlay.push(shade,panel,heading); return heading;
  }
  private button(x:number,y:number,label:string,fn:()=>void):Phaser.GameObjects.Text { const b=this.add.text(x,y,label,{fontFamily:"system-ui",fontSize:"16px",fontStyle:"bold",color:"#fff4d8",backgroundColor:"#297c78",padding:{x:16,y:12},align:"center"}).setOrigin(.5).setInteractive({useHandCursor:true}).on("pointerup",fn);this.overlay.push(b);return b; }
  private openContracts=(reward?:{base:number;bonus:number;reputation:number}):void=>{ if(this.overlay.length)return;this.overlayBase(reward?"契約達成":"出荷契約");const state=this.lastState;if(!state)return;const w=this.scale.width,h=this.scale.height;
    if(reward){const t=this.add.text(w/2,h/2-55,`基本報酬 ${reward.base}コイン\n早期達成ボーナス ${reward.bonus}コイン\n評判 +${reward.reputation}`,{fontFamily:"system-ui",fontSize:"21px",color:"#49382e",align:"center",lineSpacing:10}).setOrigin(.5);this.overlay.push(t);this.button(w/2,h/2+120,"閉じる",()=>this.closeOverlay());return;}
    const rep=this.add.text(w/2,Math.max(70,h/2-Math.min(h-24,700)/2+75),`評判 ${state.contracts.reputation.points}　完了 ${state.contracts.statistics.contractsCompleted}`,{fontFamily:"system-ui",fontSize:"17px",color:"#49382e"}).setOrigin(.5);this.overlay.push(rep);const compact=w<700;const top=compact?145:h/2-145;state.contracts.offers.forEach((offer,i)=>{const x=compact?w/2:w/2-300+i*300,y=compact?top+i*120:top;const req=Object.entries(offer.requirements).filter(([,n])=>n>0).map(([k,n])=>`${k==="wheat"?"麦":k==="corn"?"とうもろこし":"たまご"} ${n}`).join(" / ");const card=this.add.text(x,y,`${offer.type==="priority"?"優先依頼":"契約候補"}\n${req}\n基本報酬 ${offer.baseRewardCoins}`,{fontFamily:"system-ui",fontSize:compact?"14px":"16px",color:"#49382e",backgroundColor:"#eadbb9",padding:{x:12,y:10},align:"center"}).setOrigin(.5,0);this.overlay.push(card);this.button(x-42,y+88,"受注",()=>{this.game.events.emit(GAME_EVENTS.contractAction,"accept",offer.id);this.closeOverlay();});this.button(x+45,y+88,"見送る",()=>{this.game.events.emit(GAME_EVENTS.contractAction,"decline",offer.id);this.closeOverlay();});});if(state.contracts.active){const active=this.add.text(w/2,h-125,`進行中の契約　${Object.entries(state.contracts.active.requirements).filter(([,n])=>n>0).map(([k,n])=>`${k==="wheat"?"麦":k==="corn"?"とうもろこし":"たまご"} ${state.contracts.active!.delivered[k as "wheat"]}/${n}`).join("　")}`,{fontFamily:"system-ui",fontSize:"16px",color:"#49382e"}).setOrigin(.5);this.overlay.push(active);let cancellationArmed=false;const cancelButton=this.button(w/2,h-75,"契約を中止",()=>{if(!cancellationArmed){cancellationArmed=true;cancelButton.setText("契約を中止しますか？　もう一度押す");return;}this.game.events.emit(GAME_EVENTS.contractAction,"cancel");this.closeOverlay();});}this.button(w-80,55,"閉じる",()=>this.closeOverlay());};
  private openPause=():void=>{if(this.overlay.length)return;this.overlayBase("一時停止・管理");const w=this.scale.width,h=this.scale.height;["ゲームに戻る","今すぐ保存","出荷契約","設定","セーブデータを書き出す","セーブデータを読み込む","タイトルへ戻る","農場を最初からやり直す"].forEach((label,i)=>this.button(w/2,h/2-190+i*52,label,()=>{if(label==="ゲームに戻る")this.closeOverlay();else if(label==="出荷契約"){this.closeOverlay();this.openContracts();}else this.game.events.emit(`management-${label}`);}));};
  private openOperations=(result=""):void=>{if(this.overlay.length||!this.lastState)return;this.overlayBase("研修小屋　スタッフ管理");const state=this.lastState,w=this.scale.width,h=this.scale.height,keys:Record<WorkerRoleId,keyof GameState["workers"]>={"wheat-harvester":"harvestWorker","wheat-transporter":"transportWorker","corn-harvester":"cornHarvestWorker","corn-transporter":"cornTransportWorker","poultry-caretaker":"poultryCaretaker"};const summary=this.add.text(w/2,h/2-Math.min(h-24,700)/2+76,`コイン ${state.economy.walletCoins}　評判 ${state.contracts.reputation.points}\n契約 ${state.contracts.active?"進行中":"なし"}${result?`\n${result}`:""}`,{fontFamily:"system-ui",fontSize:"16px",color:"#49382e",align:"center"}).setOrigin(.5,0);this.overlay.push(summary);const compact=h<600;WORKER_ROLE_IDS.forEach((role,index)=>{const worker=state.workers[keys[role]],definition=WORKER_ROLES[role],cost=worker.hired?getWorkerTrainingCost(role,worker.level):definition.hireCost,label=worker.hired?`Lv${worker.level}　${worker.status}`:"未雇用",x=w/2,y=(compact?130:170)+index*(compact?70:82);const card=this.add.text(x-80,y,`${definition.publicName}\n${label}　${cost===null?"最大レベル":`${cost}コイン`}`,{fontFamily:"system-ui",fontSize:compact?"13px":"15px",color:"#49382e",backgroundColor:"#eadbb9",padding:{x:12,y:8},fixedWidth:Math.min(500,w-150)}).setOrigin(.5);this.overlay.push(card);this.button(x+Math.min(270,w/2-55),y,worker.hired?(cost===null?"最大":"研修"):"雇用",()=>{if(cost!==null)this.game.events.emit(GAME_EVENTS.operationsAction,worker.hired?"train":"hire",role);this.closeOverlay();this.time.delayedCall(0,()=>this.openOperations(`${definition.publicName}の手続きを実行しました（${cost}コイン）`));});});this.button(w-75,50,"閉じる",()=>this.closeOverlay());};
  private showOperationsButton=(visible:boolean):void=>{this.operationsButton.setVisible(visible&&!this.overlay.length);};
  private showProcessingButton=(visible:boolean):void=>{this.processingButton.setVisible(visible&&!this.overlay.length);};
  private showCollectionButton=(visible:boolean):void=>{this.collectionButton.setVisible(visible&&!this.overlay.length);};
  private handleCollectionResult=(result:CollectionCommandResult):void=>{this.collectionResult=result.message;if(this.collectionOpenState)this.renderCollection();};
  private collectionCommand(command:CollectionCommand):void{this.game.events.emit(GAME_EVENTS.collectionAction,command);}
  private addModalButton(x:number,y:number,width:number,label:string,command:CollectionCommand|(()=>void),enabled=true,reason?:string):void{const b=new ModalButton(this,x,y,width,label,()=>typeof command==="function"?command():this.collectionCommand(command)).setEnabled(enabled,reason);this.modalButtons.push(b);this.overlay.push(b);}
  private renderCollection():void{if(!this.lastState)return;for(const item of this.overlay)item.destroy();this.overlay=[];this.modalButtons=[];this.modalFocus=-1;this.overlayBase("集配所　管理");this.collectionOpenState=true;const state=this.lastState,vm=getCollectionPanelViewModel(state,this.collectionResult?{message:this.collectionResult}:undefined),w=this.scale.width,h=this.scale.height,compact=w<700||h<650;const pages=["施設","集配スタッフ","配送設定","緊急操作"] as const;const page=pages[this.collectionPage];const top=compact?74:92;const tabsWidth=Math.min(180,(w-32)/4);pages.forEach((label,index)=>this.addModalButton(16+tabsWidth/2+index*tabsWidth,top,tabsWidth-4,label,()=>{this.collectionPage=index;this.renderCollection();},index!==this.collectionPage,"選択中"));let body="";if(page==="施設")body=vm.facilities.map(f=>`${f.definition.publicName}　${f.built?"建設済み":f.visible?(f.missingPrerequisites.length?"前提条件未達":`${f.definition.cost}コイン`):"未解放"}${f.definition.capacity?`　${f.amount}/${f.definition.capacity}`:""}`).join("\n");else if(page==="集配スタッフ"){const c=vm.courier;body=`${c.hired?`Lv${c.level}`:"未雇用"}　容量 ${c.capacity}　${c.stage}\n積載 ${c.load}/${c.capacity}　麦${c.carried.wheat} とうもろこし${c.carried.corn} たまご${c.carried.egg}\n現在地 ${c.sourceId??"集配所"}　配送先 ${c.destinationId??"なし"}`;}else if(page==="配送設定")body=`現在の配送モード：${vm.routingMode==="auto"?"自動":vm.routingMode==="processing-first"?"加工場優先":"倉庫優先"}`;else body=COLLECTION_SOURCES.map(id=>`${COLLECTION_FACILITIES[id].publicName}　${state.collectionNetwork.boxes[id].amounts[id]}個 → 倉庫`).join("\n");const info=this.add.text(w/2,top+48,`所持コイン ${vm.walletCoins}\n${body}\n\n${this.collectionResult}`,{fontFamily:"system-ui",fontSize:compact?"13px":"17px",color:this.collectionResult?"#7a3d24":"#49382e",lineSpacing:compact?4:8,align:"left",wordWrap:{width:w-42}}).setOrigin(.5,0);this.overlay.push(info);const bottom=h-(compact?76:92),buttonWidth=Math.min(190,(w-32)/3-6);if(page==="施設"){const candidates=vm.facilities.filter(f=>f.definition.id!=="processing-intake"&&f.visible&&!f.built).slice(0,compact?2:4);candidates.forEach((f,i)=>this.addModalButton(16+buttonWidth/2+i*(buttonWidth+6),bottom,buttonWidth,`${f.definition.publicName} 建設`,{type:"build",facilityId:f.definition.id as "hub"|"wheat"|"corn"|"egg"},f.available,f.missingPrerequisites.length?"前提条件未達":f.missingCoins?`あと${f.missingCoins}コイン`:undefined));}else if(page==="集配スタッフ"){const c=vm.courier;this.addModalButton(w/2-buttonWidth/2-4,bottom,buttonWidth,c.hired?(c.level===3?"最大レベル":`研修 ${c.trainingCost}`):"雇用 480",{type:c.hired?"train-courier":"hire-courier"},!c.hired||c.level<3,c.level===3?"最大レベル":undefined);this.addModalButton(w/2+buttonWidth/2+4,bottom,buttonWidth,"集配所へ案内",{type:"locate",facilityId:"hub"});}else if(page==="配送設定")(["auto","processing-first","barn-first"] as CollectionRoutingMode[]).forEach((mode,i)=>this.addModalButton(w/2+(i-1)*(buttonWidth+6),bottom,buttonWidth,mode==="auto"?"自動":mode==="processing-first"?"加工場優先":"倉庫優先",{type:"select-routing-mode",mode},true));else COLLECTION_SOURCES.forEach((source,i)=>{const amount=state.collectionNetwork.boxes[source].amounts[source];this.addModalButton(w/2+(i-1)*(buttonWidth+6),bottom,buttonWidth,`${source==="wheat"?"麦":source==="corn"?"とうもろこし":"たまご"}を倉庫へ移す`,{type:"flush-source",source},amount>0,amount>0?undefined:"在庫が空です");});this.addModalButton(w-70,30,112,"閉じる",()=>this.closeOverlay());}
  private openCollection=():void=>{if(this.overlay.length||!this.lastState)return;this.collectionOpenState=true;this.collectionPage=0;this.collectionResult="";this.renderCollection();};
  private handleModalKey=(event:KeyboardEvent):void=>{const now=performance.now(),duplicate=event.key===lastCollectionKey&&event.shiftKey===lastCollectionKeyShift&&now-lastCollectionKeyAt<30;if(!this.collectionOpenState||duplicate)return;lastCollectionKey=event.key;lastCollectionKeyShift=event.shiftKey;lastCollectionKeyAt=now;if(event.key==="Escape"){event.preventDefault();this.closeOverlay();return;}if(event.key==="Tab"){event.preventDefault();if(!this.modalButtons.length)return;this.modalFocus=(this.modalFocus+(event.shiftKey?-1:1)+this.modalButtons.length)%this.modalButtons.length;this.modalButtons.forEach((b,i)=>b.setFocused(i===this.modalFocus));}else if((event.key==="Enter"||event.key===" ")&&this.modalFocus>=0){event.preventDefault();this.modalButtons[this.modalFocus].trigger();}};
  getCollectionE2ESummary(){return{open:this.collectionOpenState,page:this.collectionPage,result:this.collectionResult,focusedCount:this.modalButtons.filter(button=>button.isFocused()).length,buttons:this.modalButtons.map(button=>button.getSerializableRect())};}
  private openProcessing=(result=""):void=>{if(this.overlay.length||!this.lastState)return;this.overlayBase("加工場　生産管理");const state=this.lastState,w=this.scale.width,h=this.scale.height,land=state.processing.land;const availability=["processing-yard","grain-mill","bakery"].map(id=>getProcessingConstructionAvailability(id as "processing-yard"|MachineId,land,state.economy.walletCoins,state.landExpansion.eastCornFieldUnlocked,state.landExpansion.southChickenCoopUnlocked));const machineLine=(key:"mill"|"bakery")=>{const m=state.processing[key],recipe=m.activeCycle?RECIPES[m.activeCycle.recipeId].publicName:"なし";return `${key==="mill"?"製粉機":"ベーカリー"} Lv${m.level}　${getMachinePublicStatus(m)}　モード ${m.enabled?m.selectedMode:"停止"}\n加工 ${recipe}　残り ${(m.activeCycle?.remainingMs??0)/1000}秒\n入力 ${Object.entries(m.input.amounts).filter(([,n])=>n).map(([r,n])=>`${r} ${n}`).join(" / ")||"空"}　${Object.values(m.input.amounts).reduce((a,b)=>a+b,0)}/${m.input.capacity}\n出力 ${Object.entries(m.output.amounts).filter(([,n])=>n).map(([r,n])=>`${r} ${n}`).join(" / ")||"空"}　${Object.values(m.output.amounts).reduce((a,b)=>a+b,0)}/${m.output.capacity}`;};const prerequisites=availability.map(a=>`${a.facility}：${a.built?"建設済み":a.reason??`${a.cost}コイン`}`).join("　");const info=this.add.text(w/2,Math.max(62,h/2-325),`所持コイン ${state.economy.walletCoins}\n${prerequisites}\n\n${machineLine("mill")}\n\n${machineLine("bakery")}\n\nスタッフ　製粉 ${state.processing.millOperator.publicStatus}　製パン ${state.processing.baker.publicStatus}\n${result}`,{fontFamily:"system-ui",fontSize:w<600?"12px":"15px",color:result?"#7a3d24":"#49382e",align:"left",lineSpacing:4,wordWrap:{width:Math.min(920,w-40)}}).setOrigin(.5,0);this.overlay.push(info);const add=(x:number,y:number,label:string,machine:MachineId,mode:"auto"|"stop"|RecipeId,enabled:boolean)=>{const b=new ModalButton(this,x,y,Math.min(185,w/4-8),label,()=>{this.game.events.emit(GAME_EVENTS.processingAction,machine,mode);for(const item of this.overlay)item.destroy();this.overlay=[];this.time.delayedCall(0,()=>this.openProcessing(`${machine==="grain-mill"?"製粉機":"ベーカリー"}を「${label}」に変更しました`));}).setEnabled(enabled,enabled?undefined:"先に設備を建設してください");this.overlay.push(b);};const y=h-132;add(w/2-285,y,"自動","grain-mill","auto",state.processing.mill.built);add(w/2-95,y,"小麦粉を優先","grain-mill","mill-flour",state.processing.mill.built);add(w/2+95,y,"コーンミールを優先","grain-mill","mill-cornmeal",state.processing.mill.built);add(w/2+285,y,"停止","grain-mill","stop",state.processing.mill.built);add(w/2-285,y+55,"自動","bakery","auto",state.processing.bakery.built);add(w/2-95,y+55,"パンを優先","bakery","bakery-bread",state.processing.bakery.built);add(w/2+95,y+55,"コーンブレッドを優先","bakery","bakery-cornbread",state.processing.bakery.built);add(w/2+285,y+55,"停止","bakery","stop",state.processing.bakery.built);this.button(w-75,50,"閉じる",()=>this.closeOverlay());};
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
    const carried = state.cargo; const total = getCarriedTotal(carried);
    this.carriedText.setText(total ? `持ち物　${total} / ${carried.capacity}\n麦${carried.amounts.wheat}　とう${carried.amounts.corn}　卵${carried.amounts.egg}` : `持ち物\n空　0 / ${carried.capacity}`);
    const unlocked = state.landExpansion;
    this.barnText.setText(["倉庫", `麦 ${state.barn.wheat}`, unlocked.eastCornFieldUnlocked ? `とうもろこし ${state.barn.corn}` : "", unlocked.southChickenCoopUnlocked ? `たまご ${state.barn.egg}` : "", state.processing.land.millBuilt ? `小麦粉 ${state.barn.flour}　コーンミール ${state.barn.cornmeal}` : "", state.processing.land.bakeryBuilt ? `パン ${state.barn.bread}　コーンブレッド ${state.barn.cornbread}` : ""].filter(Boolean).join("\n"));
    this.marketText.setText(["売り場", `麦 ${state.market.wheat} / 8`, unlocked.eastCornFieldUnlocked ? `とうもろこし ${state.market.corn} / 8` : "", unlocked.southChickenCoopUnlocked ? `たまご ${state.market.egg} / 8` : "", state.processing.land.millBuilt ? `小麦粉 ${state.market.flour}/6　コーンミール ${state.market.cornmeal}/6` : "", state.processing.land.bakeryBuilt ? `パン ${state.market.bread}/6　コーンブレッド ${state.market.cornbread}/4` : ""].filter(Boolean).join("\n"));
    this.livestockText.setVisible(unlocked.southChickenCoopUnlocked).setText(`鶏小屋\n餌 ${state.livestock.feed} / ${state.livestock.feedCapacity}　卵 ${state.livestock.eggs} / ${state.livestock.eggCapacity}\n飼育 ${state.workers.poultryCaretaker.status}`);
    if(state.dairy.pastureUnlocked)this.livestockText.setVisible(true).setText(`${this.livestockText.text}\n酪農　牛 ${state.dairy.cows.length}/3　草 ${state.dairy.hayRack}/24　乳 ${state.dairy.milkTank}/24${state.dairy.workshopBuilt?`\n工房 ${state.dairy.cycle?`${state.dairy.cycle.recipe} 加工中`:"待機"}`:""}`);
    this.tillText.setText(`売上  ${state.economy.tillCoins}`);
    this.walletText.setText(`コイン  ${state.economy.walletCoins}`);
    const compact = this.scale.width < 520;
    this.crateText.setText(
      `${compact ? "集荷" : "集荷箱"}  ${state.inventory.fieldCrate}/${state.inventory.fieldCrateCapacity}`,
    );
    this.harvestWorkerText.setText(
      `${compact ? "収穫" : "収穫スタッフ"}  ${state.workers.harvestWorker.status}`,
    );
    this.transportWorkerText.setText(
      `${compact ? "運搬" : "運搬スタッフ"}  ${state.workers.transportWorker.status}`,
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
    this.contractButton.setPosition(w/2,h-85);this.operationsButton.setPosition(w/2,h-140);this.processingButton.setPosition(w/2,h-85);this.collectionButton.setPosition(w/2,h-85);this.pauseButton.setPosition(w-12,12);this.saveStatus.setPosition(w-105,12);
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
    this.game.events.off(GAME_EVENTS.contractRange, this.showContractButton, this);this.game.events.off(GAME_EVENTS.contractOpen,this.openContracts,this);this.game.events.off(GAME_EVENTS.operationsRange,this.showOperationsButton,this);this.game.events.off(GAME_EVENTS.operationsOpen,this.openOperations,this);this.game.events.off(GAME_EVENTS.processingRange,this.showProcessingButton,this);this.game.events.off(GAME_EVENTS.processingOpen,this.openProcessing,this);this.game.events.off(GAME_EVENTS.collectionRange,this.showCollectionButton,this);this.game.events.off(GAME_EVENTS.collectionOpen,this.openCollection,this);this.game.events.off(GAME_EVENTS.collectionResult,this.handleCollectionResult,this);this.input.keyboard?.off("keydown",this.handleModalKey,this);this.game.events.off("save-status",this.updateSaveStatus,this);this.input.keyboard?.off("keydown-ESC",this.togglePause,this);this.input.keyboard?.off("keydown-P",this.togglePause,this);
    this.scale.off(Phaser.Scale.Events.RESIZE, this.layout, this);
  }
}
