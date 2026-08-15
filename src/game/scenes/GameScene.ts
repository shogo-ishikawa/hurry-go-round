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
import { INTERACTIONS } from "../logic/facilities";
import { createWorkerProgress, hireWorkerByRole, trainWorker, type WorkerRoleId } from "../logic/workforce";
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
  constructor() {
    super("game");
  }
  init(data: { snapshot?: PersistedGameSnapshot }): void { if(data.snapshot) this.restoreSnapshot(data.snapshot); }
  create(): void {
    createFarmWorld(this);
    this.createContractFacilities();
    const operations=INTERACTIONS.find(i=>i.id==="open-operations")!;this.add.circle(operations.center.x,operations.center.y,operations.visibleRadius,palette.teal,.18).setStrokeStyle(5,palette.outline).setDepth(operations.center.y);this.add.text(operations.center.x,operations.center.y,"運営所",{fontFamily:"system-ui",fontSize:"18px",fontStyle:"bold",color:"#49382e",backgroundColor:"#fff4d8dd",padding:{x:8,y:5}}).setOrigin(.5).setDepth(operations.center.y+1);
    this.createCrops();
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
  getPersistedSnapshot(sequence:number):PersistedGameSnapshot{return createPersistedSnapshot(this.state,{player:{x:this.farmer.x,y:this.farmer.y,facing:"front"},crops:this.crops.map((c,i)=>({id:`wheat-${String(i).padStart(3,"0")}`,resource:"wheat",state:c.model.state,remainingMs:Math.max(0,c.model.regrowMs-c.model.elapsedMs)})),playTimeMs:this.time.now,saveSequence:sequence});}
  private restoreSnapshot(s:PersistedGameSnapshot):void{const fresh=createGameState();this.state={...fresh,cargo:{amounts:{...s.cargo.amounts},capacity:s.cargo.capacity},barn:{...s.storage.barn},market:{...s.storage.market},marketCapacity:{...s.storage.marketCapacity},soldByResource:{...s.economy.soldByResource},landExpansion:{...s.landExpansion},livestock:{feed:s.livestock.feed,feedCapacity:s.livestock.feedCapacity,eggs:s.livestock.eggs,eggCapacity:s.livestock.eggCapacity},economy:{...fresh.economy,walletCoins:s.economy.walletCoins,tillCoins:s.economy.tillCoins,soldUnits:s.economy.soldUnits,customersServed:s.economy.customersServed,customersLeftWithoutPurchase:s.economy.customersLeftWithoutPurchase,contractCoinsEarned:s.economy.contractCoinsEarned},upgrades:{...s.upgrades},workers:{harvestWorker:{...fresh.workers.harvestWorker,...s.workers.harvestWorker},transportWorker:{...fresh.workers.transportWorker,...s.workers.transportWorker},cornHarvestWorker:{...fresh.workers.cornHarvestWorker,...s.workers.cornHarvestWorker},cornTransportWorker:{...fresh.workers.cornTransportWorker,...s.workers.cornTransportWorker},poultryCaretaker:{...fresh.workers.poultryCaretaker,...s.workers.poultryCaretaker}},automation:{...fresh.automation,cornFieldCrate:s.automation.cornFieldCrate},inventory:{...fresh.inventory,fieldCrate:s.automation.wheatFieldCrate},contracts:structuredClone(s.contracts),processing:structuredClone(s.processing),harvestedTotal:s.statistics.harvestedTotal,...s.progression};this.registry.set("restored-player",s.player);}
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
    this.updateContracts(delta);
    this.updateOperations();
  }
  private updateOperations():void{const action=INTERACTIONS.find(i=>i.id==="open-operations")!,inside=Phaser.Math.Distance.Between(this.farmer.x,this.farmer.y,action.center.x,action.center.y)<=action.radius;if(inside!==this.operationsInRange){this.operationsInRange=inside;this.game.events.emit(GAME_EVENTS.operationsRange,inside);}if(inside&&(Phaser.Input.Keyboard.JustDown(this.contractKey)||Phaser.Input.Keyboard.JustDown(this.cursors.space!)))this.game.events.emit(GAME_EVENTS.operationsOpen);}
  private handleOperationsAction(action:"hire"|"train",role:WorkerRoleId):void{const keys:Record<WorkerRoleId,keyof GameState["workers"]>={"wheat-harvester":"harvestWorker","wheat-transporter":"transportWorker","corn-harvester":"cornHarvestWorker","corn-transporter":"cornTransportWorker","poultry-caretaker":"poultryCaretaker"},key=keys[role],current=this.state.workers[key],hired=new Set<WorkerRoleId>();for(const [id,k] of Object.entries(keys) as [WorkerRoleId,keyof GameState["workers"]][])if(this.state.workers[k].hired)hired.add(id);const progress=createWorkerProgress(current.hired,key==="poultryCaretaker"?this.state.workers.poultryCaretaker.resource:role.startsWith("corn")?"corn":"wheat",current.carried);const result=action==="hire"?hireWorkerByRole(role,this.state.economy.walletCoins,progress,{eastUnlocked:this.state.landExpansion.eastCornFieldUnlocked,coopUnlocked:this.state.landExpansion.southChickenCoopUnlocked,hiredRoles:hired}):trainWorker(role,this.state.economy.walletCoins,progress);if(!result.changed){this.game.events.emit(GAME_EVENTS.hint,"条件またはコインが足りません");return;}this.setState({...this.state,economy:{...this.state.economy,walletCoins:result.wallet},workers:{...this.state.workers,[key]:{...current,hired:result.worker.hired,level:result.worker.level,status:action==="hire"?"作業場所へ移動中":"研修完了"}}});this.game.events.emit(GAME_EVENTS.dirty,"priority");}
  private createContractFacilities(): void {
    const board = this.add.graphics().setDepth(GAME_CONFIG.contractBoard.y);
    board.fillStyle(palette.shadow,.22).fillEllipse(1638,970,180,38).lineStyle(7,palette.outline).fillStyle(palette.soil).fillRoundedRect(1550,850,160,105,8).strokeRoundedRect(1550,850,160,105,8).fillStyle(palette.barn).fillTriangle(1535,855,1725,855,1630,815).fillStyle(palette.cream).fillRoundedRect(1570,870,42,55,3).fillRoundedRect(1620,865,42,62,3).fillRoundedRect(1670,875,25,47,3);
    this.add.text(1630,835,"出荷契約",{fontFamily:"system-ui",fontSize:"20px",fontStyle:"bold",color:"#fff4d8"}).setOrigin(.5).setDepth(2000);
    const dock = this.add.graphics().setDepth(GAME_CONFIG.contractDock.y); dock.fillStyle(palette.shadow,.2).fillEllipse(1378,890,230,55).lineStyle(6,palette.outline).fillStyle(palette.path).fillRoundedRect(1260,780,230,105,10).strokeRoundedRect(1260,780,230,105,10).fillStyle(palette.soil).fillRoundedRect(1290,800,48,45,6).strokeRoundedRect(1290,800,48,45,6).fillRoundedRect(1350,800,48,45,6).strokeRoundedRect(1350,800,48,45,6).fillRoundedRect(1410,800,48,45,6).strokeRoundedRect(1410,800,48,45,6);
    this.add.text(1375,862,"契約出荷場",{fontFamily:"system-ui",fontSize:"17px",fontStyle:"bold",color:"#49382e",backgroundColor:"#fff4d8dd",padding:{x:8,y:4}}).setOrigin(.5).setDepth(2000);
  }
  private unlockedResources(): ResourceId[] { return this.state.landExpansion.southChickenCoopUnlocked ? ["wheat","corn","egg"] : this.state.landExpansion.eastCornFieldUnlocked ? ["wheat","corn"] : ["wheat"]; }
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
    const positions: Array<[number, number]> = [];
    for (const [startX, startY] of [
      [345, 330],
      [815, 950],
    ] as const)
      for (let row = 0; row < 3; row++)
        for (let col = 0; col < 5; col++)
          positions.push([startX + col * 90, startY + row * 78]);
    this.crops = positions.map(
      ([x, y], i) =>
        new CropNode(this, x, y, GAME_CONFIG.regrowBaseMs + (i % 7) * 170, i),
    );
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
    this.input.off("pointerdown", this.beginPointer, this);
    this.input.off("pointermove", this.updatePointerDrag, this);
    this.input.off("pointerup", this.endPointer, this);
    this.scale.off(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    this.game.events.off(Phaser.Core.Events.BLUR, this.clearInput, this);
    this.game.events.off(GAME_EVENTS.contractAction, this.handleContractAction, this);
    this.game.events.off(GAME_EVENTS.operationsAction,this.handleOperationsAction,this);
  }
}
