import Phaser from "phaser";
import { createFarmWorld } from "../art/terrain";
import { harvestEffect, transferEffect } from "../art/effects";
import { calculateCameraZoom } from "../logic/camera";
import { moveWithinBounds, type Point } from "../logic/movement";
import { addCargoOne, getCarriedTotal, unloadNextCargoOne } from "../logic/resources";
import { getContinuousDragDirection } from "../logic/pointerNavigation";
import { getHarvestIntervalForLevel } from "../logic/upgrades";
import {
  calculateInputLayout,
  isPointNavigationAllowed,
} from "../input/inputLayout";
import { GAME_CONFIG } from "../config/gameConfig";
import { FARM_LAYOUT, getActiveWheatNodes } from "../config/farmLayout";
import { getWheatFieldCrateCapacity, getWheatFieldExpansionCost, getWheatFieldNodeCount, purchaseWheatFieldExpansion } from "../logic/wheatFieldExpansion";
import { CropNode } from "../entities/CropNode";
import { Farmer } from "../entities/Farmer";
import {
  createGameState,
  GAME_EVENTS,
  type GameState,
} from "../state/GameState";
import { MarketSystem } from "../systems/MarketSystem";
import { UpgradeSystem } from "../systems/UpgradeSystem";
import { WorkerSystem } from "../systems/WorkerSystem";
import { HiringSystem } from "../systems/HiringSystem";
import { ExpansionSystem } from "../systems/ExpansionSystem";
import { UIScene } from "./UIScene";
import { ExpandedAutomationSystem } from "../systems/ExpandedAutomationSystem";
import { acceptContract, advanceContractActiveTime, cancelActiveContract, completeContract, declineContractOffer, deliverNextContractResourceOne, isContractComplete } from "../logic/contracts";
import type { ResourceId } from "../config/resourceDefinitions";
import { palette } from "../art/palette";
import type { PersistedGameSnapshot } from "../persistence/saveSchema";
import { createPersistedSnapshot } from "../logic/saveSnapshot";
import { normalizeDurationMs } from "../logic/normalizePersistedSnapshot";
import { INTERACTIONS, type InteractionId } from "../logic/facilities";
import { getWheatWorkerRuntimeParameters, toWorkerProgress, hireWorkerByRole, trainWorker, type WorkerRoleId } from "../logic/workforce";
import { advanceCows, advanceDairyCycle, advancePastureNodes, startDairyCycle } from "../logic/dairy";
import { getUnlockedResourceIds } from "../logic/unlockedResources";
import { ProcessingSystem } from "../systems/ProcessingSystem";
import { CollectionNetworkSystem } from "../systems/CollectionNetworkSystem";
import { DairySystem } from "../systems/DairySystem";
export class GameScene extends Phaser.Scene {
  private farmer!: Farmer;
  private crops: CropNode[] = [];
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<
    "up" | "down" | "left" | "right",
    Phaser.Input.Keyboard.Key
  >;
  private state: GameState = createGameState();
  private harvestCooldown = 0;
  private unloadCooldown = 0;
  private lastUnloadedResource: import("../config/resourceDefinitions").ResourceId | null = null;
  private fullNotified = false;
  private tutorialStage = 0;
  private ui?: UIScene;
  private market!: MarketSystem;
  private upgrades!: UpgradeSystem;
  private workers!: WorkerSystem;
  private hiring!: HiringSystem;
  private expansion!: ExpansionSystem;
  private expandedAutomation!: ExpandedAutomationSystem;
  private pointTarget: Phaser.Math.Vector2 | null = null;
  private dragStart: Point | null = null;
  private dragDirection: Point = { x: 0, y: 0 };
  private dragging = false;
  private destinationMarker!: Phaser.GameObjects.Arc;
  private contractCooldown = 0;
  private contractInRange = false;
  private contractDirtyElapsed = 0;
  private contractKey!: Phaser.Input.Keyboard.Key;
  private operationsInRange=false;
  private wheatExpansionHold=0;
  private wheatExpansionLabel?:Phaser.GameObjects.Text;
  private runtimeReady = false;
  private processingSystem!:ProcessingSystem;
  private collectionSystem!:CollectionNetworkSystem;
  private dairySystem!:DairySystem;
  constructor() {
    super("game");
  }
  init(data: { snapshot?: PersistedGameSnapshot }): void { if(data.snapshot) this.restoreSnapshot(data.snapshot); }
  create(): void {
    createFarmWorld(this);
    this.createContractFacilities();
    const operations=INTERACTIONS.find(i=>i.id==="open-operations")!;
    const {bounds:lodgeBounds}=FARM_LAYOUT.trainingLodge;
    const lodge=this.add.graphics().setDepth(lodgeBounds.y+lodgeBounds.height);
    lodge.lineStyle(6,palette.outline).fillStyle(palette.soil).fillRoundedRect(lodgeBounds.x,lodgeBounds.y,lodgeBounds.width,lodgeBounds.height,12).strokeRoundedRect(lodgeBounds.x,lodgeBounds.y,lodgeBounds.width,lodgeBounds.height).fillStyle(palette.barn).fillTriangle(lodgeBounds.x-20,lodgeBounds.y+35,lodgeBounds.x+lodgeBounds.width+20,lodgeBounds.y+35,lodgeBounds.x+lodgeBounds.width/2,lodgeBounds.y-65).fillStyle(palette.cream).fillRoundedRect(492,430,66,100,5);
    this.add.circle(operations.center.x,operations.center.y,operations.visibleRadius,palette.teal,.12).setStrokeStyle(4,palette.outline).setDepth(operations.center.y);
    this.add.text(525,320,"研修小屋\nスタッフ・研修",{fontFamily:"system-ui",fontSize:"17px",fontStyle:"bold",align:"center",color:"#49382e",backgroundColor:"#fff4d8dd",padding:{x:9,y:5}}).setOrigin(.5).setDepth(2000);
    this.createCrops();
    const wx=FARM_LAYOUT.wheatExpansion.x,wy=FARM_LAYOUT.wheatExpansion.y;this.add.circle(wx,wy,FARM_LAYOUT.wheatExpansion.radius,palette.wheat,.16).setStrokeStyle(4,palette.outline).setDepth(wy);this.wheatExpansionLabel=this.add.text(wx,wy-100,"麦畑を広げる\n30 → 42株　220コイン",{fontFamily:"system-ui",fontSize:"16px",fontStyle:"bold",align:"center",color:"#49382e",backgroundColor:"#fff4d8dd",padding:{x:8,y:4}}).setOrigin(.5).setDepth(2100);
    this.farmer = new Farmer(this, 990, 640);
    const restoredPlayer=(this.registry.get("restored-player") as PersistedGameSnapshot["player"]|undefined);if(restoredPlayer)this.farmer.setPosition(restoredPlayer.x,restoredPlayer.y);
    this.destinationMarker = this.add
      .circle(0, 0, 22, 0xffffff, 0)
      .setStrokeStyle(4, 0x297c78, 0.8)
      .setVisible(false)
      .setDepth(9000);
    if (!this.input.keyboard) throw new Error("Keyboard input unavailable");
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys({
      up: "W",
      down: "S",
      left: "A",
      right: "D",
    }) as typeof this.wasd;
    this.contractKey = this.input.keyboard.addKey("E");
    this.cameras.main
      .setBounds(0, 0, GAME_CONFIG.worldWidth, GAME_CONFIG.worldHeight)
      .startFollow(this.farmer, true, 0.2, 0.2);
    this.cameras.main.setRoundPixels(true);
    this.updateCamera();
    this.market = new MarketSystem(
      this,
      this.farmer,
      () => this.state,
      (s) => this.setState(s),
      (stage) => this.setTutorial(stage),
    );
    this.upgrades = new UpgradeSystem(
      this,
      this.farmer,
      () => this.state,
      (s) => this.setState(s),
      (stage) => this.setTutorial(stage),
    );
    this.workers = new WorkerSystem(
      this,
      this.farmer,
      this.crops,
      () => this.state,
      (s) => this.setState(s),
      (stage) => this.setTutorial(stage),
    );
    this.hiring = new HiringSystem(
      this,
      this.farmer,
      () => this.state,
      (s) => this.setState(s),
      (stage) => this.setTutorial(stage),
    );
    this.expansion = new ExpansionSystem(this, this.farmer, () => this.state, (s) => this.setState(s));
    this.expandedAutomation = new ExpandedAutomationSystem(this, this.farmer, () => this.state, (s) => this.setState(s));
    this.collectionSystem=new CollectionNetworkSystem(this,this.farmer,()=>this.state,(state)=>{this.state=state;},this.contractKey);
    this.processingSystem=new ProcessingSystem(this,this.farmer,()=>this.state,(state)=>{this.state=state;},this.contractKey);
    this.dairySystem=new DairySystem(this,this.farmer,()=>this.state,(state)=>this.setState(state));
    this.runtimeReady = true;
    this.scene.launch("ui");
    this.time.delayedCall(0, () => {
      this.ui = this.scene.get("ui") as UIScene;
      this.emitState();
    });
    this.input.on("pointerdown", this.beginPointer, this);
    this.input.on("pointermove", this.updatePointerDrag, this);
    this.input.on("pointerup", this.endPointer, this);
    this.scale.on(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    this.game.events.on(Phaser.Core.Events.BLUR, this.clearInput, this);
    this.game.events.on(GAME_EVENTS.contractAction, this.handleContractAction, this);
    this.game.events.on(GAME_EVENTS.operationsAction,this.handleOperationsAction,this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
  }
  configureWheatE2E(level:0|1|2,workerLevel:1|2|3):void {
    if (!this.runtimeReady) throw new Error("GameScene is not ready");
    this.state={...this.state,landExpansion:{...this.state.landExpansion,wheatFieldLevel:level},inventory:{...this.state.inventory,fieldCrate:0,fieldCrateCapacity:getWheatFieldCrateCapacity(level)},workers:{...this.state.workers,harvestWorker:{...this.state.workers.harvestWorker,hired:true,level:workerLevel,carried:0}}};
    this.configureWheatNodes(level);
    for (const crop of this.crops) crop.resetReady();
    this.workers.resetWheatHarvesterForE2E();
    this.emitState();
  }
  isE2EReady():boolean{return this.runtimeReady&&this.scene.isActive();}
  getWheatE2ESummary(){
    const diagnostics=this.workers.getWheatDiagnostics();
    return{level:this.state.landExpansion.wheatFieldLevel??0,nodeCount:this.crops.length,workerLevel:this.state.workers.harvestWorker.level,workerCapacity:getWheatWorkerRuntimeParameters("wheat-harvester",this.state.workers.harvestWorker.level).capacity,crateCapacity:this.state.inventory.fieldCrateCapacity,workerCargo:this.state.workers.harvestWorker.carried,crateAmount:this.state.inventory.fieldCrate,readyWest:this.crops.filter(c=>c.cluster==="west"&&c.model.state==="ready").length,readyCentral:this.crops.filter(c=>c.cluster==="central"&&c.model.state==="ready").length,...diagnostics};
  }
  configureProcessingE2E(coins:number,cargo?:Partial<GameState["cargo"]["amounts"]>):void{if(!this.runtimeReady)throw new Error("GameScene is not ready");this.state={...this.state,economy:{...this.state.economy,walletCoins:Math.max(0,Math.floor(coins))},landExpansion:{...this.state.landExpansion,eastCornFieldUnlocked:true,southChickenCoopUnlocked:true},cargo:{...this.state.cargo,amounts:{...this.state.cargo.amounts,...cargo}}};this.emitState();}
  positionAtProcessingInteractionE2E(id:InteractionId):void{const interaction=INTERACTIONS.find(item=>item.id===id);if(!interaction)throw new Error(`Unknown interaction ${id}`);this.farmer.setPosition(interaction.center.x,interaction.center.y);}
  advanceProcessingE2E(deltaMs:number,stepMs=50):void{let remaining=Math.max(0,Math.min(120000,Math.floor(deltaMs)));const step=Math.max(1,Math.min(250,Math.floor(stepMs)));while(remaining>0){const delta=Math.min(step,remaining);this.processingSystem.advanceForE2E(delta);remaining-=delta;}}
  getProcessingE2ESummary(){return this.processingSystem.getDiagnostics();}
  configureCollectionE2E(input:{coins?:number;processingYard?:boolean;eastField?:boolean;chickenCoop?:boolean;built?:boolean;sources?:Partial<Record<"wheat"|"corn"|"egg",number>>;processingBuilt?:boolean;processingEnabled?:boolean}):void{if(!this.runtimeReady)throw new Error("GameScene is not ready");const sources=input.sources??{},network=this.state.collectionNetwork,boxes={...network.boxes};for(const source of ["wheat","corn","egg"] as const)boxes[source]={...boxes[source],built:input.built??boxes[source].built,amounts:{...boxes[source].amounts,[source]:Math.max(0,Math.floor(sources[source]??boxes[source].amounts[source]))}};this.state={...this.state,economy:{...this.state.economy,walletCoins:Math.max(0,Math.floor(input.coins??this.state.economy.walletCoins))},landExpansion:{...this.state.landExpansion,eastCornFieldUnlocked:input.eastField??this.state.landExpansion.eastCornFieldUnlocked,southChickenCoopUnlocked:input.chickenCoop??this.state.landExpansion.southChickenCoopUnlocked},processing:{...this.state.processing,land:{...this.state.processing.land,yardUnlocked:input.processingYard??this.state.processing.land.yardUnlocked,millBuilt:input.processingBuilt??this.state.processing.land.millBuilt,bakeryBuilt:input.processingBuilt??this.state.processing.land.bakeryBuilt},mill:{...this.state.processing.mill,enabled:input.processingEnabled??this.state.processing.mill.enabled},bakery:{...this.state.processing.bakery,enabled:input.processingEnabled??this.state.processing.bakery.enabled}},collectionNetwork:{...network,hubBuilt:input.built??network.hubBuilt,boxes}};this.emitState();}
  positionAtCollectionInteractionE2E(id:InteractionId):void{this.positionAtProcessingInteractionE2E(id);this.collectionSystem.update(0);}
  advanceCollectionE2E(deltaMs:number,stepMs=50):void{this.collectionSystem.advanceForE2E(deltaMs,stepMs);this.emitState();}
  getCollectionE2ESummary(){return this.collectionSystem.getDiagnostics();}
  getCollectionPanelE2ESummary(){return(this.scene.get("ui") as UIScene).getCollectionE2ESummary();}
  getPersistedSnapshot(sequence:number):PersistedGameSnapshot{return createPersistedSnapshot(this.state,{player:{x:this.farmer.x,y:this.farmer.y,facing:"front"},crops:this.crops.map((c)=>({id:c.cropId,resource:"wheat",state:c.model.state,remainingMs:normalizeDurationMs(c.model.regrowMs-c.model.elapsedMs)})),playTimeMs:this.time.now,saveSequence:sequence,eggRemainingMs:this.expansion.getEggRemainingMs()});}
  private restoreSnapshot(s:PersistedGameSnapshot):void{const fresh=createGameState();this.state={...fresh,coopLevel:s.livestock.coopLevel,cargo:{amounts:{...s.cargo.amounts},capacity:s.cargo.capacity},barn:{...s.storage.barn},market:{...s.storage.market},marketCapacity:{...s.storage.marketCapacity},soldByResource:{...s.economy.soldByResource},landExpansion:{...s.landExpansion},livestock:{feed:s.livestock.feed,feedCapacity:s.livestock.feedCapacity,eggs:s.livestock.eggs,eggCapacity:s.livestock.eggCapacity},economy:{...fresh.economy,walletCoins:s.economy.walletCoins,tillCoins:s.economy.tillCoins,soldUnits:s.economy.soldUnits,customersServed:s.economy.customersServed,customersLeftWithoutPurchase:s.economy.customersLeftWithoutPurchase,contractCoinsEarned:s.economy.contractCoinsEarned},upgrades:{...s.upgrades},workers:{harvestWorker:{...fresh.workers.harvestWorker,...s.workers.harvestWorker},transportWorker:{...fresh.workers.transportWorker,...s.workers.transportWorker},cornHarvestWorker:{...fresh.workers.cornHarvestWorker,...s.workers.cornHarvestWorker},cornTransportWorker:{...fresh.workers.cornTransportWorker,...s.workers.cornTransportWorker},poultryCaretaker:{...fresh.workers.poultryCaretaker,...s.workers.poultryCaretaker}},automation:{...fresh.automation,cornFieldCrate:s.automation.cornFieldCrate},inventory:{...fresh.inventory,fieldCrate:s.automation.wheatFieldCrate,fieldCrateCapacity:getWheatFieldCrateCapacity(s.landExpansion.wheatFieldLevel ?? 0)},contracts:structuredClone(s.contracts),processing:structuredClone(s.processing),collectionNetwork:structuredClone(s.collectionNetwork),dairy:structuredClone(s.dairy),harvestedTotal:s.statistics.harvestedTotal,...s.progression};this.registry.set("restored-player",s.player);this.registry.set("restored-crops",s.crops);this.registry.set("restored-egg-remaining",s.livestock.eggRemainingMs);}
  update(time: number, delta: number): void {
    const direction = this.readDirection();
    const moving = direction.x !== 0 || direction.y !== 0;
    if (moving) {
      this.farmer.setFacingFromVector(direction.x, direction.y);
      this.ui?.fadeMoveHint();
    }
    const next = moveWithinBounds(
      this.farmer,
      direction,
      (GAME_CONFIG.playerSpeed * delta) / 1000,
      {
        width: GAME_CONFIG.worldWidth,
        height: GAME_CONFIG.worldHeight,
        inset: GAME_CONFIG.playerInset,
      },
    );
    const constrained = this.expansion.constrainPosition(next.x, next.y);
    this.farmer.setPosition(constrained.x, constrained.y);
    if (constrained.blocked) this.cancelPointTarget();
    this.farmer.animate(delta, moving);
    for (const crop of this.crops) crop.tick(delta, time);
    this.harvestCooldown = Math.max(0, this.harvestCooldown - delta);
    this.unloadCooldown = Math.max(0, this.unloadCooldown - delta);
    this.tryHarvest();
    this.tryUnload();
    this.market.update(delta);
    this.upgrades.update(delta);
    this.hiring.update(delta);
    this.workers.update(delta);
    this.expansion.update(delta);
    this.expandedAutomation.update(delta);
    this.collectionSystem.update(delta);
    this.processingSystem.update(delta);
    this.dairySystem.update(delta);
    this.updateDairy(delta);
    this.updateContracts(delta);
    this.updateOperations();
    this.updateWheatExpansion(delta);
  }
  private updateDairy(delta:number):void{const cows=advanceCows(this.state.dairy.cows,this.state.dairy.hayRack,this.state.dairy.milkTank,delta);let dairy={...this.state.dairy,...cows,pastureNodes:advancePastureNodes(this.state.dairy.pastureNodes,delta)};dairy=advanceDairyCycle(dairy,delta);dairy=startDairyCycle(dairy);this.state={...this.state,dairy};}
  private updateWheatExpansion(delta:number):void{
    const level=this.state.landExpansion.wheatFieldLevel??0,cost=getWheatFieldExpansionCost(level),count=getWheatFieldNodeCount(level);
    this.wheatExpansionLabel?.setText(cost===null?`麦畑\n最大まで拡張済み　${count}株`:`麦畑を広げる\n${count} → ${getWheatFieldNodeCount((level+1) as 1|2)}株　${cost}コイン`);
    const near=Phaser.Math.Distance.Between(this.farmer.x,this.farmer.y,FARM_LAYOUT.wheatExpansion.x,FARM_LAYOUT.wheatExpansion.y)<=FARM_LAYOUT.wheatExpansion.radius;
    if(!near){this.wheatExpansionHold=0;return;}const keyPressed=Phaser.Input.Keyboard.JustDown(this.contractKey)||Phaser.Input.Keyboard.JustDown(this.cursors.space!);this.wheatExpansionHold+=keyPressed?1100:delta;if(this.wheatExpansionHold<1100)return;this.wheatExpansionHold=0;
    const result=purchaseWheatFieldExpansion(this.state.economy.walletCoins,this.state.landExpansion);if(!result.purchased){this.game.events.emit(GAME_EVENTS.hint,result.reason==="maximum-level"?"最大まで拡張済み":`あと ${(cost??0)-this.state.economy.walletCoins} コイン必要です`);return;}
    this.state={...this.state,economy:{...this.state.economy,walletCoins:result.walletCoins},landExpansion:result.land,inventory:{...this.state.inventory,fieldCrateCapacity:getWheatFieldCrateCapacity(result.land.wheatFieldLevel??0)}};this.configureWheatNodes(result.land.wheatFieldLevel??0);this.emitState();this.game.events.emit(GAME_EVENTS.dirty,"priority");this.game.events.emit(GAME_EVENTS.hint,"麦畑を拡張しました");
  }
  private configureWheatNodes(level:0|1|2):void{const activeNodes=getActiveWheatNodes(level),activeIds=new Set(activeNodes.map(node=>node.id));for(let index=this.crops.length-1;index>=0;index--){if(!activeIds.has(this.crops[index].cropId)){this.crops[index].destroy();this.crops.splice(index,1);}}const existing=new Set(this.crops.map(c=>c.cropId));for(const [index,node] of activeNodes.entries())if(!existing.has(node.id))this.crops.push(new CropNode(this,node.x,node.y,GAME_CONFIG.regrowBaseMs+(index%7)*170,index,node.id,node.cluster));}
  private updateOperations():void{const action=INTERACTIONS.find(i=>i.id==="open-operations")!,inside=Phaser.Math.Distance.Between(this.farmer.x,this.farmer.y,action.center.x,action.center.y)<=action.radius;if(inside!==this.operationsInRange){this.operationsInRange=inside;this.game.events.emit(GAME_EVENTS.operationsRange,inside);}if(inside&&(Phaser.Input.Keyboard.JustDown(this.contractKey)||Phaser.Input.Keyboard.JustDown(this.cursors.space!)))this.game.events.emit(GAME_EVENTS.operationsOpen);}
  private handleOperationsAction(action:"hire"|"train",role:WorkerRoleId):void{const keys:Record<WorkerRoleId,keyof GameState["workers"]>={"wheat-harvester":"harvestWorker","wheat-transporter":"transportWorker","corn-harvester":"cornHarvestWorker","corn-transporter":"cornTransportWorker","poultry-caretaker":"poultryCaretaker"},key=keys[role],current=this.state.workers[key],hired=new Set<WorkerRoleId>();for(const [id,k] of Object.entries(keys) as [WorkerRoleId,keyof GameState["workers"]][])if(this.state.workers[k].hired)hired.add(id);const progress=toWorkerProgress(current,role==="poultry-caretaker"?"corn":role.startsWith("corn")?"corn":"wheat");const result=action==="hire"?hireWorkerByRole(role,this.state.economy.walletCoins,progress,{eastUnlocked:this.state.landExpansion.eastCornFieldUnlocked,coopUnlocked:this.state.landExpansion.southChickenCoopUnlocked,hiredRoles:hired}):trainWorker(role,this.state.economy.walletCoins,progress);if(!result.changed){this.game.events.emit(GAME_EVENTS.hint,"条件またはコインが足りません");return;}this.setState({...this.state,economy:{...this.state.economy,walletCoins:result.wallet},workers:{...this.state.workers,[key]:{...current,hired:result.worker.hired,level:result.worker.level,status:action==="hire"?"作業場所へ移動中":"研修完了"}}});this.game.events.emit(GAME_EVENTS.dirty,"priority");}
  private createContractFacilities(): void {
    const board = this.add.graphics().setDepth(GAME_CONFIG.contractBoard.y);
    board.fillStyle(palette.shadow,.22).fillEllipse(1638,970,180,38).lineStyle(7,palette.outline).fillStyle(palette.soil).fillRoundedRect(1550,850,160,105,8).strokeRoundedRect(1550,850,160,105,8).fillStyle(palette.barn).fillTriangle(1535,855,1725,855,1630,815).fillStyle(palette.cream).fillRoundedRect(1570,870,42,55,3).fillRoundedRect(1620,865,42,62,3).fillRoundedRect(1670,875,25,47,3);
    this.add.text(1630,835,"出荷契約",{fontFamily:"system-ui",fontSize:"20px",fontStyle:"bold",color:"#fff4d8"}).setOrigin(.5).setDepth(2000);
    const dock = this.add.graphics().setDepth(GAME_CONFIG.contractDock.y); dock.fillStyle(palette.shadow,.2).fillEllipse(1378,890,230,55).lineStyle(6,palette.outline).fillStyle(palette.path).fillRoundedRect(1260,780,230,105,10).strokeRoundedRect(1260,780,230,105,10).fillStyle(palette.soil).fillRoundedRect(1290,800,48,45,6).strokeRoundedRect(1290,800,48,45,6).fillRoundedRect(1350,800,48,45,6).strokeRoundedRect(1350,800,48,45,6).fillRoundedRect(1410,800,48,45,6).strokeRoundedRect(1410,800,48,45,6);
    this.add.text(1375,862,"契約出荷場",{fontFamily:"system-ui",fontSize:"17px",fontStyle:"bold",color:"#49382e",backgroundColor:"#fff4d8dd",padding:{x:8,y:4}}).setOrigin(.5).setDepth(2000);
  }
  private unlockedResources(): ResourceId[] { return getUnlockedResourceIds(this.state); }
  private updateContracts(delta: number): void {
    this.state = { ...this.state, contracts: advanceContractActiveTime(this.state.contracts, delta, false) }; this.contractCooldown = Math.max(0, this.contractCooldown-delta);
    if(this.state.contracts.active){this.contractDirtyElapsed+=delta;if(this.contractDirtyElapsed>=1000){this.contractDirtyElapsed=0;this.game.events.emit(GAME_EVENTS.dirty);}}
    const range = Phaser.Math.Distance.Between(this.farmer.x,this.farmer.y,GAME_CONFIG.contractBoard.x,GAME_CONFIG.contractBoard.y)<=GAME_CONFIG.contractBoard.radius;
    if (range !== this.contractInRange) { this.contractInRange=range; this.game.events.emit(GAME_EVENTS.contractRange,range); }
    if (range && (Phaser.Input.Keyboard.JustDown(this.contractKey) || Phaser.Input.Keyboard.JustDown(this.cursors.space!))) this.game.events.emit(GAME_EVENTS.contractOpen);
    const dock = Phaser.Math.Distance.Between(this.farmer.x,this.farmer.y,GAME_CONFIG.contractDock.x,GAME_CONFIG.contractDock.y)<=GAME_CONFIG.contractDock.radius;
    if (dock && this.contractCooldown<=0 && this.state.contracts.active) { const result=deliverNextContractResourceOne(this.state.contracts,this.state.barn); if(result.changed){ this.state={...this.state,contracts:result.state,barn:result.barn}; this.contractCooldown=GAME_CONFIG.contractDeliveryIntervalMs; transferEffect(this,this.farmer.x,this.farmer.y,GAME_CONFIG.contractDock.x,GAME_CONFIG.contractDock.y); this.emitState(); this.game.events.emit(GAME_EVENTS.dirty); if(this.state.contracts.active&&isContractComplete(this.state.contracts.active)){const done=completeContract(this.state.contracts,this.state.economy.walletCoins);if(done.ok){this.state={...this.state,contracts:done.state,economy:{...this.state.economy,walletCoins:done.wallet,contractCoinsEarned:(this.state.economy.contractCoinsEarned??0)+done.reward.total}};this.emitState();this.game.events.emit(GAME_EVENTS.dirty,"priority");this.game.events.emit(GAME_EVENTS.contractOpen,done.reward);}} } }
  }
  private handleContractAction(action: string, id?: string): void { let contracts=this.state.contracts; if(action==="accept"&&id){const r=acceptContract(contracts,id,this.unlockedResources());if(r.ok)contracts=r.state;} else if(action==="decline"&&id){const r=declineContractOffer(contracts,id,this.unlockedResources());if(r.ok)contracts=r.state;} else if(action==="cancel"){const r=cancelActiveContract(contracts,this.state.barn);if(r.ok){contracts=r.state;this.state={...this.state,barn:r.barn};}} this.state={...this.state,contracts};this.emitState();this.game.events.emit(GAME_EVENTS.dirty,"priority"); }
  private createCrops(): void {
    const nodes=getActiveWheatNodes(this.state.landExpansion.wheatFieldLevel ?? 0);
    this.crops=nodes.map((node,index)=>new CropNode(this,node.x,node.y,GAME_CONFIG.regrowBaseMs+(index%7)*170,index,node.id,node.cluster));
    const restored=this.registry.get("restored-crops") as PersistedGameSnapshot["crops"]|undefined;
    if(restored){const byId=new Map(restored.map(c=>[c.id,c]));for(const crop of this.crops){const saved=byId.get(crop.cropId);if(saved)crop.model={...crop.model,state:saved.state,elapsedMs:Math.max(0,crop.model.regrowMs-saved.remainingMs)};}}
  }
  private readDirection(): Point {
    const keyboard = {
      x:
        Number(this.cursors.right.isDown || this.wasd.right.isDown) -
        Number(this.cursors.left.isDown || this.wasd.left.isDown),
      y:
        Number(this.cursors.down.isDown || this.wasd.down.isDown) -
        Number(this.cursors.up.isDown || this.wasd.up.isDown),
    };
    const joystick = this.ui?.getDirection() ?? { x: 0, y: 0 };
    if (keyboard.x || keyboard.y || joystick.x || joystick.y) {
      this.cancelPointTarget();
      return keyboard.x || keyboard.y ? keyboard : joystick;
    }
    if (this.dragging) return this.dragDirection;
    if (!this.pointTarget) return { x: 0, y: 0 };
    const dx = this.pointTarget.x - this.farmer.x,
      dy = this.pointTarget.y - this.farmer.y;
    if (Math.hypot(dx, dy) < 10) {
      this.cancelPointTarget();
      return { x: 0, y: 0 };
    }
    return { x: dx, y: dy };
  }
  private setPointTarget(pointer: Phaser.Input.Pointer): void {
    if (
      !isPointNavigationAllowed(
        pointer.x,
        pointer.y,
        calculateInputLayout(this.scale.width, this.scale.height),
      )
    )
      return;
    const world = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    if (this.expansion.isLockedPoint(world.x, world.y)) {
      this.game.events.emit(GAME_EVENTS.hint, "この土地はまだ購入されていません");
      return;
    }
    this.pointTarget = new Phaser.Math.Vector2(world.x, world.y);
    this.destinationMarker.setPosition(world.x, world.y).setVisible(true);
  }
  private beginPointer(pointer: Phaser.Input.Pointer): void {
    if (!isPointNavigationAllowed(pointer.x, pointer.y, calculateInputLayout(this.scale.width, this.scale.height))) return;
    this.dragStart = { x: pointer.x, y: pointer.y }; this.dragDirection = { x: 0, y: 0 }; this.dragging = false;
  }
  private updatePointerDrag(pointer: Phaser.Input.Pointer): void {
    if (!pointer.isDown || !this.dragStart) return;
    const direction = getContinuousDragDirection(this.dragStart, { x: pointer.x, y: pointer.y });
    this.dragDirection = direction;
    if (direction.x || direction.y) { this.dragging = true; this.cancelPointTarget(); }
  }
  private endPointer(pointer: Phaser.Input.Pointer): void {
    if (!this.dragStart) return; const wasDragging = this.dragging;
    this.dragStart = null; this.dragging = false; this.dragDirection = { x: 0, y: 0 };
    if (wasDragging) this.cancelPointTarget(); else this.setPointTarget(pointer);
  }
  private cancelPointTarget(): void {
    this.pointTarget = null;
    this.destinationMarker.setVisible(false);
  }
  private tryHarvest(): void {
    if (this.harvestCooldown > 0) return;
    if (getCarriedTotal(this.state.cargo) >= this.state.cargo.capacity) {
      if (!this.fullNotified && this.nearestReadyCrop()) {
        this.fullNotified = true;
        this.game.events.emit(GAME_EVENTS.full);
        this.setTutorial(2);
      }
      return;
    }
    const crop = this.nearestReadyCrop();
    if (!crop) return;
    const collected = addCargoOne(this.state.cargo, "wheat");
    if (!collected.changed) {
      return;
    }
    if (!crop.harvest()) return;
    this.harvestCooldown = getHarvestIntervalForLevel(
      this.state.upgrades.harvestSpeedLevel,
    );
    this.state = {
      ...this.state,
      cargo: collected.cargo,
      harvestedTotal: this.state.harvestedTotal + 1,
    };
    this.farmer.setFacingFromVector(
      crop.x - this.farmer.x,
      crop.y - this.farmer.y,
    );
    this.farmer.setCargo(collected.cargo.amounts, collected.cargo.capacity);
    this.farmer.playHarvestMotion();
    harvestEffect(this, crop.x, crop.y);
    this.emitState();
    if (this.state.harvestedTotal === 1) this.setTutorial(1);
    if (getCarriedTotal(collected.cargo) >= 9) this.setTutorial(2);
    if (getCarriedTotal(collected.cargo) === collected.cargo.capacity) {
      this.fullNotified = true;
      this.game.events.emit(GAME_EVENTS.full);
    }
  }
  private nearestReadyCrop(): CropNode | undefined {
    let nearest: CropNode | undefined,
      best = GAME_CONFIG.harvestRange ** 2;
    for (const crop of this.crops) {
      if (crop.model.state !== "ready") continue;
      const d = Phaser.Math.Distance.Squared(
        this.farmer.x,
        this.farmer.y,
        crop.x,
        crop.y,
      );
      if (d <= best) {
        best = d;
        nearest = crop;
      }
    }
    return nearest;
  }
  private tryUnload(): void {
    const inZone =
      Phaser.Math.Distance.Between(
        this.farmer.x,
        this.farmer.y,
        GAME_CONFIG.delivery.x,
        GAME_CONFIG.delivery.y,
      ) <= GAME_CONFIG.delivery.radius;
    if (
      !inZone ||
      this.unloadCooldown > 0 ||
      getCarriedTotal(this.state.cargo) === 0
    )
      return;
    const result = unloadNextCargoOne(this.state.cargo, this.state.barn, this.lastUnloadedResource);
    if (!result.changed) return;
    this.lastUnloadedResource = result.resource;
    this.state = { ...this.state, cargo: result.cargo, barn: result.destination, deliveredOnce: true };
    this.unloadCooldown = GAME_CONFIG.unloadIntervalMs;
    this.fullNotified = false;
    this.farmer.setCargo(result.cargo.amounts, result.cargo.capacity);
    transferEffect(this, this.farmer.x, this.farmer.y, 1520, 480);
    this.emitState();
    this.setTutorial(3);
  }
  private setState(state: GameState): void {
    const walletGrew =
      state.economy.walletCoins > this.state.economy.walletCoins;
    this.state = state;
    if (
      (state.economy.walletCoins >= GAME_CONFIG.harvestWorkerHireCost ||
        state.firstUpgradePurchased) &&
      !state.workers.harvestWorker.hired
    )
      this.setTutorial(9);
    this.emitState();
    if (walletGrew) this.game.events.emit(GAME_EVENTS.wallet);
  }
  private emitState(): void {
    this.game.events.emit(GAME_EVENTS.state, this.state);
    this.game.events.emit(GAME_EVENTS.dirty);
  }
  private setTutorial(stage: number): void {
    if (stage > this.tutorialStage) {
      this.tutorialStage = stage;
      this.game.events.emit(GAME_EVENTS.tutorial, stage);
    }
  }
  private updateCamera(): void {
    this.cameras.main.setZoom(
      calculateCameraZoom(this.scale.width, this.scale.height),
    );
  }
  private handleResize(): void {
    this.updateCamera();
    this.clearInput();
  }
  private clearInput(): void {
    this.ui?.resetInput();
    this.dragStart = null; this.dragging = false; this.dragDirection = { x: 0, y: 0 };
    this.cancelPointTarget();
  }
  private cleanup(): void {
    this.processingSystem?.destroy();
    this.collectionSystem?.destroy();
    this.input.off("pointerdown", this.beginPointer, this);
    this.input.off("pointermove", this.updatePointerDrag, this);
    this.input.off("pointerup", this.endPointer, this);
    this.scale.off(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    this.game.events.off(Phaser.Core.Events.BLUR, this.clearInput, this);
    this.game.events.off(GAME_EVENTS.contractAction, this.handleContractAction, this);
    this.game.events.off(GAME_EVENTS.operationsAction,this.handleOperationsAction,this);
  }
}
