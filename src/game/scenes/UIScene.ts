import Phaser from "phaser";
import { palette } from "../art/palette";
import { VirtualJoystick } from "../input/VirtualJoystick";
import { calculateInputLayout } from "../input/inputLayout";
import { GAME_EVENTS, type GameState } from "../state/GameState";
import type { Point } from "../logic/movement";
import { palette as colors } from "../art/palette";
import { getCarriedTotal } from "../logic/resources";
import { WORKER_ROLE_IDS, WORKER_ROLES, getWorkerTrainingCost, type WorkerRoleId } from "../logic/workforce";
let portraitNoticeShown = false;
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
  private pauseButton!: Phaser.GameObjects.Text;
  private saveStatus!: Phaser.GameObjects.Text;
  private overlay: Phaser.GameObjects.GameObject[] = [];
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
    this.carriedText = this.add.text(27, 20, "背負い籠\n空", style);
    this.barnText = this.add.text(27, 52, "倉庫\n麦 0", style);
    this.marketText = this.add.text(0, 0, "売り場\n麦 0 / 8", style);
    this.tillText = this.add.text(0, 0, "売上  0", style);
    this.walletText = this.add.text(0, 0, "コイン  0", style);
    this.versionText = this.add.text(0, 0, "v0.9.0", {
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
    this.operationsButton=this.add.text(0,0,"農場運営所  E",{...style,fontSize:"17px",backgroundColor:"#297c78",color:"#fff4d8",padding:{x:18,y:13}}).setOrigin(.5).setVisible(false).setInteractive({useHandCursor:true}).on("pointerup",()=>this.openOperations());
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
      .text(0, 0, "背負い籠が満杯です　倉庫へ納品", {
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
    this.game.events.on(GAME_EVENTS.operationsRange,(visible:boolean)=>this.operationsButton.setVisible(visible&&!this.overlay.length));
    this.game.events.on(GAME_EVENTS.operationsOpen,this.openOperations,this);
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
  private openOperations=():void=>{if(this.overlay.length||!this.lastState)return;this.overlayBase("農場運営所　スタッフ・施設");const state=this.lastState,w=this.scale.width,h=this.scale.height,keys:Record<WorkerRoleId,keyof GameState["workers"]>={"wheat-harvester":"harvestWorker","wheat-transporter":"transportWorker","corn-harvester":"cornHarvestWorker","corn-transporter":"cornTransportWorker","poultry-caretaker":"poultryCaretaker"};const summary=this.add.text(w/2,h/2-Math.min(h-24,700)/2+76,`コイン ${state.economy.walletCoins}　評判 ${state.contracts.reputation.points}\n契約 ${state.contracts.active?"進行中":"なし"}`,{fontFamily:"system-ui",fontSize:"16px",color:"#49382e",align:"center"}).setOrigin(.5,0);this.overlay.push(summary);const compact=h<600;WORKER_ROLE_IDS.forEach((role,index)=>{const worker=state.workers[keys[role]],definition=WORKER_ROLES[role],cost=worker.hired?getWorkerTrainingCost(role,worker.level):definition.hireCost,label=worker.hired?`Lv${worker.level}　${worker.status}`:"未雇用",x=w/2,y=(compact?130:170)+index*(compact?70:82);const card=this.add.text(x-80,y,`${definition.publicName}\n${label}　${cost===null?"最大レベル":`${cost}コイン`}`,{fontFamily:"system-ui",fontSize:compact?"13px":"15px",color:"#49382e",backgroundColor:"#eadbb9",padding:{x:12,y:8},fixedWidth:Math.min(500,w-150)}).setOrigin(.5);this.overlay.push(card);this.button(x+Math.min(270,w/2-55),y,worker.hired?(cost===null?"最大":"研修"):"雇用",()=>{if(cost!==null)this.game.events.emit(GAME_EVENTS.operationsAction,worker.hired?"train":"hire",role);this.closeOverlay();});});this.button(w-75,50,"閉じる",()=>this.closeOverlay());};
  private closeOverlay():void{for(const item of this.overlay)item.destroy();this.overlay=[];this.scene.resume("game");}
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
    const carried = state.cargo; const total = getCarriedTotal(carried);
    this.carriedText.setText(total ? `背負い籠　${total} / ${carried.capacity}\n麦${carried.amounts.wheat}　とう${carried.amounts.corn}　卵${carried.amounts.egg}` : `背負い籠\n空　0 / ${carried.capacity}`);
    const unlocked = state.landExpansion;
    this.barnText.setText(["倉庫", `麦 ${state.barn.wheat}`, unlocked.eastCornFieldUnlocked ? `とうもろこし ${state.barn.corn}` : "", unlocked.southChickenCoopUnlocked ? `たまご ${state.barn.egg}` : "", state.processing.land.millBuilt ? `小麦粉 ${state.barn.flour}　コーンミール ${state.barn.cornmeal}` : "", state.processing.land.bakeryBuilt ? `パン ${state.barn.bread}　コーンブレッド ${state.barn.cornbread}` : ""].filter(Boolean).join("\n"));
    this.marketText.setText(["売り場", `麦 ${state.market.wheat} / 8`, unlocked.eastCornFieldUnlocked ? `とうもろこし ${state.market.corn} / 8` : "", unlocked.southChickenCoopUnlocked ? `たまご ${state.market.egg} / 8` : "", state.processing.land.millBuilt ? `小麦粉 ${state.market.flour}/6　コーンミール ${state.market.cornmeal}/6` : "", state.processing.land.bakeryBuilt ? `パン ${state.market.bread}/6　コーンブレッド ${state.market.cornbread}/4` : ""].filter(Boolean).join("\n"));
    this.livestockText.setVisible(unlocked.southChickenCoopUnlocked).setText(`鶏小屋\n餌 ${state.livestock.feed} / ${state.livestock.feedCapacity}　卵 ${state.livestock.eggs} / ${state.livestock.eggCapacity}\n飼育 ${state.workers.poultryCaretaker.status}`);
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
      "麦を収穫して背負い籠を満たしましょう",
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
    this.contractButton.setPosition(w/2,h-85);this.operationsButton.setPosition(w/2,h-140);this.pauseButton.setPosition(w-12,12);this.saveStatus.setPosition(w-105,12);
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
    this.game.events.off(GAME_EVENTS.contractRange, this.showContractButton, this);this.game.events.off(GAME_EVENTS.contractOpen,this.openContracts,this);this.game.events.off(GAME_EVENTS.operationsOpen,this.openOperations,this);this.game.events.off("save-status",this.updateSaveStatus,this);this.input.keyboard?.off("keydown-ESC",this.togglePause,this);this.input.keyboard?.off("keydown-P",this.togglePause,this);
    this.scale.off(Phaser.Scale.Events.RESIZE, this.layout, this);
  }
}
