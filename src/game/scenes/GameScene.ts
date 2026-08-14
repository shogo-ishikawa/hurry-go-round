import Phaser from 'phaser';
import { harvestEffect, transferEffect } from '../art/effects';
import { palette } from '../art/palette';
import { createFarmWorld } from '../art/terrain';
import { GAME_CONFIG } from '../config/gameConfig';
import { CropNode } from '../entities/CropNode';
import { Farmer } from '../entities/Farmer';
import { calculateCameraZoom } from '../logic/camera';
import { harvestOne, unloadOne } from '../logic/inventory';
import {
  clampPointToBounds,
  moveTowardTarget,
  moveWithinBounds,
  type Point,
} from '../logic/movement';
import {
  createGameState,
  GAME_EVENTS,
  type GameState,
  type ScreenTargetRequest,
} from '../state/GameState';

const MOVEMENT_BOUNDS = {
  width: GAME_CONFIG.worldWidth,
  height: GAME_CONFIG.worldHeight,
  inset: GAME_CONFIG.playerInset,
} as const;

export class GameScene extends Phaser.Scene {
  private farmer!: Farmer;
  private crops: CropNode[] = [];
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<'up' | 'down' | 'left' | 'right', Phaser.Input.Keyboard.Key>;
  private state: GameState = createGameState();
  private harvestCooldown = 0;
  private unloadCooldown = 0;
  private fullNotified = false;
  private tutorialStage = 0;
  private joystickDirection: Point = { x: 0, y: 0 };
  private moveTarget: Point | null = null;
  private targetMarker!: Phaser.GameObjects.Container;
  private firstMovementEmitted = false;

  constructor() {
    super('game');
  }

  create(): void {
    createFarmWorld(this);
    this.createCrops();
    this.farmer = new Farmer(this, 990, 640);
    this.createTargetMarker();

    if (!this.input.keyboard) throw new Error('Keyboard input unavailable');
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys({
      up: 'W',
      down: 'S',
      left: 'A',
      right: 'D',
    }) as typeof this.wasd;
    this.input.keyboard.addCapture('W,A,S,D,UP,DOWN,LEFT,RIGHT');

    this.cameras.main
      .setBounds(0, 0, GAME_CONFIG.worldWidth, GAME_CONFIG.worldHeight)
      .startFollow(this.farmer, true, 0.2, 0.2);
    this.cameras.main.setRoundPixels(true);
    this.updateCamera();

    this.game.events.on(GAME_EVENTS.direction, this.handleJoystickDirection, this);
    this.game.events.on(GAME_EVENTS.moveTarget, this.handleMoveTarget, this);
    this.scene.launch('ui');
    this.time.delayedCall(0, this.emitState, [], this);

    this.scale.on(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    this.game.events.on(Phaser.Core.Events.BLUR, this.clearInput, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
  }

  update(time: number, delta: number): void {
    this.updateMovement(delta);

    for (const crop of this.crops) crop.tick(delta, time);
    this.harvestCooldown = Math.max(0, this.harvestCooldown - delta);
    this.unloadCooldown = Math.max(0, this.unloadCooldown - delta);
    this.tryHarvest();
    this.tryUnload();
  }

  private updateMovement(delta: number): void {
    const start = { x: this.farmer.x, y: this.farmer.y };
    const manualDirection = this.readManualDirection();
    const manualActive = Math.hypot(manualDirection.x, manualDirection.y) > 0.01;
    let facingDirection: Point = { x: 0, y: 0 };
    let next = start;

    if (manualActive) {
      this.clearMoveTarget();
      facingDirection = manualDirection;
      next = moveWithinBounds(
        start,
        manualDirection,
        GAME_CONFIG.playerSpeed * delta / 1000,
        MOVEMENT_BOUNDS,
      );
    } else if (this.moveTarget) {
      const result = moveTowardTarget(
        start,
        this.moveTarget,
        GAME_CONFIG.playerSpeed * delta / 1000,
        MOVEMENT_BOUNDS,
        GAME_CONFIG.pointMoveArrivalRadius,
      );
      facingDirection = result.direction;
      next = result.position;
      if (result.reached) this.clearMoveTarget();
    }

    const moved = Phaser.Math.Distance.Squared(start.x, start.y, next.x, next.y) > 0.01;
    if (moved) {
      this.farmer.setFacingFromVector(facingDirection.x, facingDirection.y);
      if (!this.firstMovementEmitted) {
        this.firstMovementEmitted = true;
        this.game.events.emit(GAME_EVENTS.playerMoved);
      }
    }

    this.farmer.setPosition(next.x, next.y);
    this.farmer.animate(delta, moved);
  }

  private createCrops(): void {
    const positions: Array<[number, number]> = [];
    for (const [startX, startY] of [[345, 330], [815, 950]] as const) {
      for (let row = 0; row < 3; row += 1) {
        for (let col = 0; col < 5; col += 1) {
          positions.push([startX + col * 90, startY + row * 78]);
        }
      }
    }
    this.crops = positions.map(
      ([x, y], index) => new CropNode(
        this,
        x,
        y,
        GAME_CONFIG.regrowBaseMs + (index % 7) * 170,
        index,
      ),
    );
  }

  private createTargetMarker(): void {
    const shadow = this.add.ellipse(0, 5, 48, 22, palette.shadow, 0.18);
    const ring = this.add.circle(0, 0, 19, palette.cream, 0.18)
      .setStrokeStyle(4, palette.teal, 0.95);
    const center = this.add.circle(0, 0, 5, palette.tealLight, 0.95);
    this.targetMarker = this.add.container(0, 0, [shadow, ring, center])
      .setVisible(false);
  }

  private readManualDirection(): Point {
    const keyboardDirection = {
      x: Number(this.cursors.right.isDown || this.wasd.right.isDown)
        - Number(this.cursors.left.isDown || this.wasd.left.isDown),
      y: Number(this.cursors.down.isDown || this.wasd.down.isDown)
        - Number(this.cursors.up.isDown || this.wasd.up.isDown),
    };
    return keyboardDirection.x || keyboardDirection.y
      ? keyboardDirection
      : this.joystickDirection;
  }

  private handleJoystickDirection(direction: Point): void {
    this.joystickDirection = { x: direction.x, y: direction.y };
    if (Math.hypot(direction.x, direction.y) > 0.01) this.clearMoveTarget();
  }

  private handleMoveTarget(screenTarget: ScreenTargetRequest): void {
    if (!Number.isFinite(screenTarget.x) || !Number.isFinite(screenTarget.y)) return;

    const worldPoint = this.cameras.main.getWorldPoint(screenTarget.x, screenTarget.y);
    const target = clampPointToBounds(
      { x: worldPoint.x, y: worldPoint.y },
      MOVEMENT_BOUNDS,
    );
    const distance = Phaser.Math.Distance.Between(
      this.farmer.x,
      this.farmer.y,
      target.x,
      target.y,
    );
    if (distance <= GAME_CONFIG.pointMoveArrivalRadius) {
      this.clearMoveTarget();
      return;
    }

    this.moveTarget = target;
    this.targetMarker
      .setPosition(target.x, target.y)
      .setDepth(target.y - 12)
      .setVisible(true)
      .setAlpha(1)
      .setScale(0.82);
    this.tweens.killTweensOf(this.targetMarker);
    this.tweens.add({
      targets: this.targetMarker,
      scale: 1.14,
      alpha: 0.48,
      duration: 480,
      yoyo: true,
      repeat: -1,
    });
  }

  private clearMoveTarget(): void {
    this.moveTarget = null;
    if (!this.targetMarker) return;
    this.tweens.killTweensOf(this.targetMarker);
    this.targetMarker.setVisible(false).setAlpha(1).setScale(1);
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

    this.harvestCooldown = GAME_CONFIG.harvestIntervalMs;
    this.state.inventory = harvestOne(this.state.inventory);
    this.state.harvestedTotal += 1;
    this.farmer.setFacingFromVector(crop.x - this.farmer.x, crop.y - this.farmer.y);
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
    let best = GAME_CONFIG.harvestRange * GAME_CONFIG.harvestRange;
    for (const crop of this.crops) {
      if (crop.model.state !== 'ready') continue;
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
    const inZone = Phaser.Math.Distance.Between(
      this.farmer.x,
      this.farmer.y,
      GAME_CONFIG.delivery.x,
      GAME_CONFIG.delivery.y,
    ) <= GAME_CONFIG.delivery.radius;
    if (!inZone || this.unloadCooldown > 0 || this.state.inventory.carried === 0) return;

    const before = this.state.inventory.carried;
    this.state.inventory = unloadOne(this.state.inventory);
    if (this.state.inventory.carried === before) return;

    this.unloadCooldown = GAME_CONFIG.unloadIntervalMs;
    this.fullNotified = false;
    this.farmer.setCarried(this.state.inventory.carried);
    transferEffect(this, this.farmer.x, this.farmer.y, 1520, 480);
    this.emitState();
    if (!this.state.deliveredOnce) {
      this.state.deliveredOnce = true;
      this.setTutorial(3);
    }
  }

  private emitState(): void {
    this.game.events.emit(GAME_EVENTS.state, this.state);
  }

  private setTutorial(stage: number): void {
    if (stage <= this.tutorialStage) return;
    this.tutorialStage = stage;
    this.game.events.emit(GAME_EVENTS.tutorial, stage);
  }

  private updateCamera(): void {
    this.cameras.main.setZoom(calculateCameraZoom(this.scale.width, this.scale.height));
  }

  private handleResize(): void {
    this.updateCamera();
    this.joystickDirection = { x: 0, y: 0 };
  }

  private clearInput(): void {
    this.joystickDirection = { x: 0, y: 0 };
    this.clearMoveTarget();
  }

  private cleanup(): void {
    this.clearMoveTarget();
    this.game.events.off(GAME_EVENTS.direction, this.handleJoystickDirection, this);
    this.game.events.off(GAME_EVENTS.moveTarget, this.handleMoveTarget, this);
    this.scale.off(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    this.game.events.off(Phaser.Core.Events.BLUR, this.clearInput, this);
  }
}
