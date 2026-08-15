import Phaser from "phaser";
import { createFarmWorld } from "../art/terrain";
import { harvestEffect, transferEffect } from "../art/effects";
import { calculateCameraZoom } from "../logic/camera";
import { moveWithinBounds, type Point } from "../logic/movement";
import {
  getContinuousDragDirection,
  isContinuousDrag,
} from "../logic/pointerNavigation";
import { harvestOne, unloadOne } from "../logic/inventory";
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
import { UIScene } from "./UIScene";

interface PointerGesture {
  pointerId: number;
  startX: number;
  startY: number;
  dragging: boolean;
}

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
  private fullNotified = false;
  private tutorialStage = 0;
  private ui?: UIScene;
  private market!: MarketSystem;
  private upgrades!: UpgradeSystem;
  private pointTarget: Phaser.Math.Vector2 | null = null;
  private destinationMarker!: Phaser.GameObjects.Arc;
  private pointerGesture: PointerGesture | null = null;
  private dragDirection: Point = { x: 0, y: 0 };

  constructor() {
    super("game");
  }

  create(): void {
    createFarmWorld(this);
    this.createCrops();
    this.farmer = new Farmer(this, 990, 640);
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

    this.cameras.main
      .setBounds(0, 0, GAME_CONFIG.worldWidth, GAME_CONFIG.worldHeight)
      .startFollow(this.farmer, true, 0.2, 0.2);
    this.cameras.main.setRoundPixels(true);
    this.updateCamera();

    this.market = new MarketSystem(
      this,
      this.farmer,
      () => this.state,
      (state) => this.setState(state),
      (stage) => this.setTutorial(stage),
    );
    this.upgrades = new UpgradeSystem(
      this,
      this.farmer,
      () => this.state,
      (state) => this.setState(state),
      (stage) => this.setTutorial(stage),
    );

    this.scene.launch("ui");
    this.time.delayedCall(0, () => {
      this.ui = this.scene.get("ui") as UIScene;
      this.emitState();
    });

    this.input.on("pointerdown", this.beginPointerGesture, this);
    this.input.on("pointermove", this.updatePointerGesture, this);
    this.input.on("pointerup", this.finishPointerGesture, this);
    this.input.on("pointerupoutside", this.cancelPointerGesture, this);
    this.input.on("gameout", this.cancelPointerGesture, this);
    this.scale.on(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    this.game.events.on(Phaser.Core.Events.BLUR, this.clearInput, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
  }

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
    this.farmer.setPosition(next.x, next.y);
    this.farmer.animate(delta, moving);

    for (const crop of this.crops) crop.tick(delta, time);
    this.harvestCooldown = Math.max(0, this.harvestCooldown - delta);
    this.unloadCooldown = Math.max(0, this.unloadCooldown - delta);
    this.tryHarvest();
    this.tryUnload();
    this.market.update(delta);
    this.upgrades.update(delta);
  }

  private createCrops(): void {
    const positions: Array<[number, number]> = [];
    for (const [startX, startY] of [
      [345, 330],
      [815, 950],
    ] as const) {
      for (let row = 0; row < 3; row += 1) {
        for (let col = 0; col < 5; col += 1) {
          positions.push([startX + col * 90, startY + row * 78]);
        }
      }
    }
    this.crops = positions.map(
      ([x, y], index) =>
        new CropNode(
          this,
          x,
          y,
          GAME_CONFIG.regrowBaseMs + (index % 7) * 170,
          index,
        ),
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

    const manualDirection =
      keyboard.x || keyboard.y
        ? keyboard
        : joystick.x || joystick.y
          ? joystick
          : this.dragDirection;

    if (manualDirection.x || manualDirection.y) {
      this.cancelPointTarget();
      return manualDirection;
    }

    if (!this.pointTarget) return { x: 0, y: 0 };
    const dx = this.pointTarget.x - this.farmer.x;
    const dy = this.pointTarget.y - this.farmer.y;
    if (Math.hypot(dx, dy) < 10) {
      this.cancelPointTarget();
      return { x: 0, y: 0 };
    }
    return { x: dx, y: dy };
  }

  private beginPointerGesture(pointer: Phaser.Input.Pointer): void {
    if (!this.isWorldPointerAllowed(pointer.x, pointer.y)) return;

    this.pointerGesture = {
      pointerId: pointer.id,
      startX: pointer.x,
      startY: pointer.y,
      dragging: false,
    };
    this.dragDirection = { x: 0, y: 0 };
    this.cancelPointTarget();
  }

  private updatePointerGesture(pointer: Phaser.Input.Pointer): void {
    const gesture = this.pointerGesture;
    if (!gesture || gesture.pointerId !== pointer.id || !pointer.isDown) return;

    const direction = getContinuousDragDirection(
      { x: gesture.startX, y: gesture.startY },
      { x: pointer.x, y: pointer.y },
    );
    if (isContinuousDrag(direction)) gesture.dragging = true;
    this.dragDirection = gesture.dragging ? direction : { x: 0, y: 0 };
  }

  private finishPointerGesture(pointer: Phaser.Input.Pointer): void {
    const gesture = this.pointerGesture;
    this.pointerGesture = null;
    this.dragDirection = { x: 0, y: 0 };
    if (!gesture || gesture.pointerId !== pointer.id) return;

    if (gesture.dragging) return;
    if (!this.isWorldPointerAllowed(pointer.x, pointer.y)) return;
    this.setPointTargetAt(pointer.x, pointer.y);
  }

  private cancelPointerGesture(): void {
    this.pointerGesture = null;
    this.dragDirection = { x: 0, y: 0 };
  }

  private setPointTargetAt(screenX: number, screenY: number): void {
    const world = this.cameras.main.getWorldPoint(screenX, screenY);
    const x = Phaser.Math.Clamp(
      world.x,
      GAME_CONFIG.playerInset,
      GAME_CONFIG.worldWidth - GAME_CONFIG.playerInset,
    );
    const y = Phaser.Math.Clamp(
      world.y,
      GAME_CONFIG.playerInset,
      GAME_CONFIG.worldHeight - GAME_CONFIG.playerInset,
    );
    this.pointTarget = new Phaser.Math.Vector2(x, y);
    this.destinationMarker.setPosition(x, y).setVisible(true);
  }

  private isWorldPointerAllowed(x: number, y: number): boolean {
    return isPointNavigationAllowed(
      x,
      y,
      calculateInputLayout(this.scale.width, this.scale.height),
    );
  }

  private cancelPointTarget(): void {
    this.pointTarget = null;
    this.destinationMarker.setVisible(false);
  }

  private tryHarvest(): void {
    if (this.harvestCooldown > 0) return;
    if (this.state.inventory.carried >= this.state.inventory.capacity) {
      if (!this.fullNotified && this.nearestReadyCrop()) {
        this.fullNotified = true;
        this.game.events.emit(GAME_EVENTS.full);
        this.setTutorial(2);
      }
      return;
    }

    const crop = this.nearestReadyCrop();
    if (!crop || !crop.harvest()) return;

    this.harvestCooldown = getHarvestIntervalForLevel(
      this.state.upgrades.harvestSpeedLevel,
    );
    this.state = {
      ...this.state,
      inventory: harvestOne(this.state.inventory),
      harvestedTotal: this.state.harvestedTotal + 1,
    };
    this.farmer.setFacingFromVector(
      crop.x - this.farmer.x,
      crop.y - this.farmer.y,
    );
    this.farmer.setCarried(this.state.inventory.carried);
    this.farmer.playHarvestMotion();
    harvestEffect(this, crop.x, crop.y);
    this.emitState();

    if (this.state.harvestedTotal === 1) this.setTutorial(1);
    if (this.state.inventory.carried >= 9) this.setTutorial(2);
    if (this.state.inventory.carried === this.state.inventory.capacity) {
      this.fullNotified = true;
      this.game.events.emit(GAME_EVENTS.full);
    }
  }

  private nearestReadyCrop(): CropNode | undefined {
    let nearest: CropNode | undefined;
    let best = GAME_CONFIG.harvestRange ** 2;
    for (const crop of this.crops) {
      if (crop.model.state !== "ready") continue;
      const distance = Phaser.Math.Distance.Squared(
        this.farmer.x,
        this.farmer.y,
        crop.x,
        crop.y,
      );
      if (distance <= best) {
        best = distance;
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
      this.state.inventory.carried === 0
    ) {
      return;
    }

    const inventory = unloadOne(this.state.inventory);
    if (inventory === this.state.inventory) return;
    this.state = { ...this.state, inventory, deliveredOnce: true };
    this.unloadCooldown = GAME_CONFIG.unloadIntervalMs;
    this.fullNotified = false;
    this.farmer.setCarried(inventory.carried);
    transferEffect(this, this.farmer.x, this.farmer.y, 1520, 480);
    this.emitState();
    this.setTutorial(3);
  }

  private setState(state: GameState): void {
    const walletGrew =
      state.economy.walletCoins > this.state.economy.walletCoins;
    this.state = state;
    this.emitState();
    if (walletGrew) this.game.events.emit(GAME_EVENTS.wallet);
  }

  private emitState(): void {
    this.game.events.emit(GAME_EVENTS.state, this.state);
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
    this.cancelPointerGesture();
    this.cancelPointTarget();
  }

  private cleanup(): void {
    this.input.off("pointerdown", this.beginPointerGesture, this);
    this.input.off("pointermove", this.updatePointerGesture, this);
    this.input.off("pointerup", this.finishPointerGesture, this);
    this.input.off("pointerupoutside", this.cancelPointerGesture, this);
    this.input.off("gameout", this.cancelPointerGesture, this);
    this.scale.off(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    this.game.events.off(Phaser.Core.Events.BLUR, this.clearInput, this);
  }
}
