import Phaser from "phaser";
import { GAME_CONFIG } from "../config/gameConfig";
import { UI_TEXT } from "../config/localization";
import { CornNode } from "../entities/CornNode";
import { Chicken } from "../entities/Chicken";
import { WorldSign } from "../entities/WorldSign";
import type { Farmer } from "../entities/Farmer";
import { addCargoOne } from "../logic/resources";
import {
  purchaseCarryUpgrade,
  getCarryCapacityForLevel,
  getCarryUpgradeCost,
} from "../logic/carryUpgrade";
import {
  purchaseLandExpansion,
  type LandExpansionId,
} from "../logic/landExpansion";
import {
  collectEggOne,
  depositCornFeedOne,
  produceEggOne,
} from "../logic/livestock";
import {
  getCornFieldCrateCapacity,
  getCornFieldExpansionCost,
  getCornFieldNodeCount,
  normalizeCornFieldLevel,
  purchaseCornFieldExpansion,
} from "../logic/cornFieldExpansion";
import { GAME_EVENTS, type GameState } from "../state/GameState";
import { palette } from "../art/palette";

export class ExpansionSystem {
  private readonly corn: CornNode[] = [];
  private readonly chickens: Chicken[] = [];
  private readonly cornExpansionPlots: Phaser.GameObjects.Graphics[] = [];

  private harvestTimer = 0;
  private feedTimer = 0;
  private eggPickupTimer = 0;
  private eggProductionTimer = GAME_CONFIG.eggProductionIntervalMs;
  private purchaseTimer = 0;
  private purchaseId: LandExpansionId | null = null;
  private carryTimer = 0;
  private carryArmed = true;
  private cornExpansionTimer = 0;
  private cornExpansionArmed = true;
  private hintId = "";

  private eastGate: Phaser.GameObjects.Container;
  private southGate: Phaser.GameObjects.Container;
  private eastSign: WorldSign;
  private southSign: WorldSign;
  private carrySign: WorldSign;
  private cornExpansionPad: Phaser.GameObjects.Container;
  private cornExpansionProgress: Phaser.GameObjects.Graphics;

  constructor(
    private scene: Phaser.Scene,
    private farmer: Farmer,
    private getState: () => GameState,
    private setState: (state: GameState) => void,
  ) {
    const positions: Array<[number, number]> = [];

    // Initial 24 plants.
    for (let row = 0; row < 4; row += 1) {
      for (let col = 0; col < 6; col += 1) {
        positions.push([2300 + col * 88, 340 + row * 125]);
      }
    }
    // First expansion: 12 plants immediately south of the initial plot.
    for (let row = 0; row < 2; row += 1) {
      for (let col = 0; col < 6; col += 1) {
        positions.push([2300 + col * 88, 850 + row * 95]);
      }
    }
    // Second expansion: another 12 plants farther south.
    for (let row = 0; row < 2; row += 1) {
      for (let col = 0; col < 6; col += 1) {
        positions.push([2300 + col * 88, 1060 + row * 95]);
      }
    }

    this.corn = positions.map(
      ([x, y], index) =>
        new CornNode(
          scene,
          x,
          y,
          GAME_CONFIG.cornRegrowBaseMs +
            index * GAME_CONFIG.cornRegrowStaggerMs,
        ),
    );
    this.scene.data.set("corn-nodes", this.corn);

    this.cornExpansionPlots.push(
      this.makeCornExpansionPlot(2220, 790, 620, 220),
      this.makeCornExpansionPlot(2220, 1000, 620, 220),
    );

    const colors = [palette.cream, 0xd9b784, 0xa96d43];
    for (let index = 0; index < 3; index += 1) {
      this.chickens.push(
        new Chicken(
          scene,
          1090 + index * 90,
          1640,
          colors[index] ?? palette.cream,
          index,
        ),
      );
    }

    this.eastGate = this.makeGate(2100, 650);
    this.southGate = this.makeGate(1150, 1420);
    this.eastSign = new WorldSign(scene, 1990, 560, [
      UI_TEXT.facilities.east,
      "120コイン",
    ]);
    this.southSign = new WorldSign(scene, 1040, 1390, [
      UI_TEXT.facilities.coop,
      "240コイン",
    ]);
    this.carrySign = new WorldSign(scene, 1260, 610, [
      UI_TEXT.facilities.carry,
      "12 → 18　60コイン",
    ]);
    new WorldSign(scene, 930, 1540, [UI_TEXT.facilities.feed]);
    new WorldSign(scene, 1410, 1540, [UI_TEXT.facilities.eggs]);

    this.cornExpansionPad = this.makeCornExpansionPad();
    this.cornExpansionProgress = scene.add
      .graphics()
      .setDepth(GAME_CONFIG.cornFieldExpansion.y + 4);

    this.syncVisibility();
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      scene.data.remove("corn-nodes");
    });
  }

  update(delta: number): void {
    this.harvestTimer = Math.max(0, this.harvestTimer - delta);
    this.feedTimer = Math.max(0, this.feedTimer - delta);
    this.eggPickupTimer = Math.max(0, this.eggPickupTimer - delta);

    const state = this.getState();
    this.syncDerivedCornCapacity(state);

    if (state.landExpansion.eastCornFieldUnlocked) {
      const activeCount = getCornFieldNodeCount(
        state.landExpansion.cornFieldLevel,
      );
      for (let index = 0; index < activeCount; index += 1) {
        this.corn[index]?.tick(delta);
      }
      this.tryHarvestCorn();
    }

    if (state.landExpansion.southChickenCoopUnlocked) {
      for (const chicken of this.chickens) chicken.tick(delta);
      this.updateLivestock(delta);
    }

    this.updateLandPurchase(delta);
    this.updateCarryUpgrade(delta);
    this.updateCornFieldExpansion(delta);
    this.updateHint();
  }

  constrainPosition(
    x: number,
    y: number,
  ): { x: number; y: number; blocked: boolean } {
    const land = this.getState().landExpansion;
    if (!land.eastCornFieldUnlocked && x > 2100 && y < 1300) {
      return { x: 2070, y, blocked: true };
    }
    if (
      !land.southChickenCoopUnlocked &&
      y > 1420 &&
      x > 650 &&
      x < 1650
    ) {
      return { x, y: 1390, blocked: true };
    }
    return { x, y, blocked: false };
  }

  isLockedPoint(x: number, y: number): boolean {
    return this.constrainPosition(x, y).blocked;
  }

  private tryHarvestCorn(): void {
    if (this.harvestTimer > 0) return;

    const state = this.getState();
    const activeCount = getCornFieldNodeCount(
      state.landExpansion.cornFieldLevel,
    );
    let nearest: CornNode | undefined;
    let best = GAME_CONFIG.harvestRange ** 2;

    for (let index = 0; index < activeCount; index += 1) {
      const crop = this.corn[index];
      if (!crop || !crop.visible || crop.model.state !== "ready") continue;
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

    if (!nearest) return;
    const result = addCargoOne(state.cargo, "corn");
    if (!result.changed || !nearest.harvest()) return;

    this.harvestTimer =
      GAME_CONFIG.cornHarvestIntervalsByLevel[
        state.upgrades.harvestSpeedLevel
      ] ?? 420;
    this.setState({ ...state, cargo: result.cargo });
    this.farmer.setCargo(result.cargo.amounts, result.cargo.capacity);
  }

  private updateLivestock(delta: number): void {
    let state = this.getState();
    const feedNear = this.near(GAME_CONFIG.feedTrough);

    if (feedNear && this.feedTimer <= 0) {
      const result = depositCornFeedOne(state.cargo, state.livestock);
      if (result.changed) {
        state = {
          ...state,
          cargo: result.carried,
          livestock: result.livestock,
        };
        this.setState(state);
        this.farmer.setCargo(
          result.carried.amounts,
          result.carried.capacity,
        );
        this.feedTimer = GAME_CONFIG.feedDepositIntervalMs;
      }
    }

    this.eggProductionTimer -= delta;
    if (this.eggProductionTimer <= 0) {
      this.eggProductionTimer += GAME_CONFIG.eggProductionIntervalMs;
      const result = produceEggOne(state.livestock);
      if (result.changed) {
        state = { ...state, livestock: result.livestock };
        this.setState(state);
      }
    }

    if (this.near(GAME_CONFIG.eggStorage) && this.eggPickupTimer <= 0) {
      const result = collectEggOne(state.cargo, state.livestock);
      if (result.changed) {
        this.setState({
          ...state,
          cargo: result.carried,
          livestock: result.livestock,
        });
        this.farmer.setCargo(
          result.carried.amounts,
          result.carried.capacity,
        );
        this.eggPickupTimer = GAME_CONFIG.eggPickupIntervalMs;
      }
    }
  }

  private updateLandPurchase(delta: number): void {
    const state = this.getState();
    let id: LandExpansionId | null = null;

    if (
      !state.landExpansion.eastCornFieldUnlocked &&
      this.near(GAME_CONFIG.eastPurchase)
    ) {
      id = "eastCornField";
    } else if (
      !state.landExpansion.southChickenCoopUnlocked &&
      this.near(GAME_CONFIG.southPurchase)
    ) {
      id = "southChickenCoop";
    }

    if (id !== this.purchaseId) {
      this.purchaseId = id;
      this.purchaseTimer = 0;
    }
    if (!id) return;

    this.purchaseTimer += delta;
    if (this.purchaseTimer < GAME_CONFIG.landPurchaseHoldDurationMs) return;

    const result = purchaseLandExpansion(
      id,
      state.economy.walletCoins,
      state.landExpansion,
    );
    this.purchaseTimer = 0;
    if (!result.purchased) {
      this.emitHint(
        `land-${result.reason}`,
        result.reason === "prerequisite"
          ? UI_TEXT.messages.eastRequired
          : UI_TEXT.messages.insufficientCoins,
      );
      return;
    }

    this.setState({
      ...state,
      economy: {
        ...state.economy,
        walletCoins: result.walletCoins,
      },
      landExpansion: result.land,
    });
    this.syncVisibility();
    this.scene.game.events.emit(GAME_EVENTS.dirty, "priority");
  }

  private updateCarryUpgrade(delta: number): void {
    const near = this.near(GAME_CONFIG.carryUpgrade);
    if (!near) {
      this.carryTimer = 0;
      this.carryArmed = true;
      return;
    }
    if (!this.carryArmed) return;

    this.carryTimer += delta;
    if (this.carryTimer < GAME_CONFIG.carryUpgradeHoldDurationMs) return;

    const state = this.getState();
    const result = purchaseCarryUpgrade(
      state.economy.walletCoins,
      state.upgrades.carryCapacityLevel,
    );
    this.carryTimer = 0;
    this.carryArmed = false;

    if (!result.purchased) {
      this.emitHint(
        `carry-${result.reason}`,
        result.reason === "maximum"
          ? "運搬かごは最大容量です"
          : UI_TEXT.messages.insufficientCoins,
      );
      return;
    }

    const capacity = getCarryCapacityForLevel(result.level);
    this.setState({
      ...state,
      economy: {
        ...state.economy,
        walletCoins: result.walletCoins,
      },
      upgrades: {
        ...state.upgrades,
        carryCapacityLevel: result.level,
      },
      cargo: { ...state.cargo, capacity },
    });
    this.updateCarrySign(result.level);
  }

  private updateCornFieldExpansion(delta: number): void {
    const state = this.getState();
    const level = normalizeCornFieldLevel(
      state.landExpansion.cornFieldLevel,
    );
    const available =
      state.landExpansion.eastCornFieldUnlocked && level < 2;

    if (!available) {
      this.cornExpansionTimer = 0;
      this.drawCornExpansionProgress(0);
      return;
    }

    const near = this.near(GAME_CONFIG.cornFieldExpansion);
    if (!near) {
      this.cornExpansionTimer = 0;
      this.cornExpansionArmed = true;
      this.drawCornExpansionProgress(0);
      return;
    }
    if (!this.cornExpansionArmed) return;

    this.cornExpansionTimer += delta;
    const progress = Phaser.Math.Clamp(
      this.cornExpansionTimer /
        GAME_CONFIG.cornFieldExpansionHoldDurationMs,
      0,
      1,
    );
    this.drawCornExpansionProgress(progress);
    if (progress < 1) return;

    this.cornExpansionTimer = 0;
    this.cornExpansionArmed = false;
    this.drawCornExpansionProgress(0);

    const result = purchaseCornFieldExpansion(
      state.economy.walletCoins,
      state.landExpansion.eastCornFieldUnlocked,
      level,
    );
    if (!result.changed) {
      this.emitHint(
        `corn-expansion-${result.reason}`,
        result.reason === "maximum-level"
          ? UI_TEXT.messages.cornFieldMaximum
          : result.reason === "land-locked"
            ? UI_TEXT.messages.eastRequired
            : UI_TEXT.messages.insufficientCoins,
      );
      return;
    }

    const crateCapacity = getCornFieldCrateCapacity(result.level);
    this.setState({
      ...state,
      economy: {
        ...state.economy,
        walletCoins: result.walletCoins,
      },
      landExpansion: {
        ...state.landExpansion,
        cornFieldLevel: result.level,
      },
      automation: {
        ...state.automation,
        cornFieldCrateCapacity: crateCapacity,
      },
    });
    this.syncVisibility();
    this.scene.game.events.emit(GAME_EVENTS.dirty, "priority");
    this.scene.game.events.emit(
      GAME_EVENTS.hint,
      `とうもろこし畑を ${getCornFieldNodeCount(result.level)} 株へ拡張しました`,
    );
  }

  private updateCarrySign(level: 0 | 1 | 2): void {
    const cost = getCarryUpgradeCost(level);
    this.carrySign.setLines(
      cost === null
        ? [UI_TEXT.facilities.carry, "最大容量　24個"]
        : [
            UI_TEXT.facilities.carry,
            `${getCarryCapacityForLevel(level)} → ${getCarryCapacityForLevel(
              (level + 1) as 1 | 2,
            )}　${cost}コイン`,
          ],
    );
  }

  private updateHint(): void {
    const state = this.getState();
    const cornLevel = normalizeCornFieldLevel(
      state.landExpansion.cornFieldLevel,
    );

    if (
      !state.landExpansion.eastCornFieldUnlocked &&
      this.mid(GAME_CONFIG.eastPurchase)
    ) {
      this.emitHint("east", UI_TEXT.messages.purchaseHint);
      return;
    }

    if (
      state.landExpansion.eastCornFieldUnlocked &&
      cornLevel < 2 &&
      this.mid(GAME_CONFIG.cornFieldExpansion)
    ) {
      const cost = getCornFieldExpansionCost(cornLevel);
      this.emitHint(
        "corn-field-expansion",
        `${UI_TEXT.messages.cornFieldExpansionHint}\n${getCornFieldNodeCount(
          cornLevel,
        )} → ${getCornFieldNodeCount(cornLevel + 1)} 株　${cost ?? 0}コイン`,
      );
      return;
    }

    if (
      !state.landExpansion.southChickenCoopUnlocked &&
      this.mid(GAME_CONFIG.southPurchase)
    ) {
      this.emitHint(
        "south",
        state.landExpansion.eastCornFieldUnlocked
          ? UI_TEXT.messages.purchaseHint
          : UI_TEXT.messages.eastRequired,
      );
      return;
    }

    if (
      state.landExpansion.southChickenCoopUnlocked &&
      this.mid(GAME_CONFIG.feedTrough) &&
      state.livestock.feed === 0
    ) {
      this.emitHint("feed", UI_TEXT.messages.feedEmpty);
      return;
    }

    this.hintId = "";
  }

  private syncDerivedCornCapacity(state: GameState): void {
    const capacity = getCornFieldCrateCapacity(
      state.landExpansion.cornFieldLevel,
    );
    if (state.automation.cornFieldCrateCapacity === capacity) return;

    this.setState({
      ...state,
      automation: {
        ...state.automation,
        cornFieldCrateCapacity: capacity,
      },
    });
  }

  private emitHint(id: string, text: string): void {
    if (id === this.hintId) return;
    this.hintId = id;
    this.scene.game.events.emit(GAME_EVENTS.hint, text);
  }

  private near(point: { x: number; y: number; radius: number }): boolean {
    return (
      Phaser.Math.Distance.Between(
        this.farmer.x,
        this.farmer.y,
        point.x,
        point.y,
      ) <= point.radius
    );
  }

  private mid(point: { x: number; y: number; radius: number }): boolean {
    const distance = Phaser.Math.Distance.Between(
      this.farmer.x,
      this.farmer.y,
      point.x,
      point.y,
    );
    return distance > point.radius * 1.05 && distance <= point.radius * 2;
  }

  private makeGate(x: number, y: number): Phaser.GameObjects.Container {
    const gate = this.scene.add
      .graphics()
      .lineStyle(5, palette.outline)
      .fillStyle(palette.path)
      .fillRoundedRect(-20, -80, 40, 160, 8)
      .strokeRoundedRect(-20, -80, 40, 160, 8);
    const lock = this.scene.add
      .graphics()
      .lineStyle(5, palette.outline)
      .fillStyle(palette.coin)
      .fillRoundedRect(-18, -15, 36, 35, 6)
      .strokeRoundedRect(-18, -15, 36, 35, 6)
      .strokeCircle(0, -18, 14);
    return this.scene.add
      .container(x, y, [gate, lock])
      .setDepth(y + 100);
  }

  private makeCornExpansionPlot(
    x: number,
    y: number,
    width: number,
    height: number,
  ): Phaser.GameObjects.Graphics {
    const graphics = this.scene.add.graphics().setDepth(-890);
    graphics
      .fillStyle(palette.soilDark, 0.25)
      .fillRoundedRect(x + 10, y + 14, width, height, 28)
      .fillStyle(palette.soil)
      .fillRoundedRect(x, y, width, height, 28)
      .lineStyle(5, palette.soilDark, 0.45);
    for (let rowY = y + 55; rowY < y + height; rowY += 65) {
      graphics.lineBetween(x + 24, rowY, x + width - 24, rowY);
    }
    return graphics;
  }

  private makeCornExpansionPad(): Phaser.GameObjects.Container {
    const { x, y, radius } = GAME_CONFIG.cornFieldExpansion;
    const shadow = this.scene.add.ellipse(
      8,
      16,
      radius * 1.8,
      radius * 0.72,
      palette.shadow,
      0.22,
    );
    const graphics = this.scene.add
      .graphics()
      .lineStyle(5, palette.outline, 0.9)
      .fillStyle(palette.wheat, 0.28)
      .fillCircle(0, 0, radius)
      .strokeCircle(0, 0, radius)
      .lineStyle(6, palette.foliage)
      .lineBetween(-28, 0, 28, 0)
      .lineBetween(0, -28, 0, 28)
      .lineStyle(3, palette.outline, 0.65)
      .strokeRoundedRect(-54, -54, 108, 108, 16);
    return this.scene.add
      .container(x, y, [shadow, graphics])
      .setDepth(y - 1);
  }

  private drawCornExpansionProgress(progress: number): void {
    this.cornExpansionProgress.clear();
    if (progress <= 0 || !this.cornExpansionPad.visible) return;

    const { x, y, radius } = GAME_CONFIG.cornFieldExpansion;
    this.cornExpansionProgress
      .lineStyle(8, palette.coin, 0.95)
      .beginPath()
      .arc(
        x,
        y,
        radius + 10,
        -Math.PI / 2,
        -Math.PI / 2 + Math.PI * 2 * progress,
      )
      .strokePath();
  }

  private syncVisibility(): void {
    const state = this.getState();
    const land = state.landExpansion;
    const level = normalizeCornFieldLevel(land.cornFieldLevel);
    const activeCornCount = getCornFieldNodeCount(level);

    this.eastGate.setVisible(!land.eastCornFieldUnlocked);
    this.southGate.setVisible(!land.southChickenCoopUnlocked);

    for (let index = 0; index < this.corn.length; index += 1) {
      this.corn[index]?.setVisible(
        land.eastCornFieldUnlocked && index < activeCornCount,
      );
    }
    this.cornExpansionPlots[0]?.setVisible(
      land.eastCornFieldUnlocked && level >= 1,
    );
    this.cornExpansionPlots[1]?.setVisible(
      land.eastCornFieldUnlocked && level >= 2,
    );

    for (const chicken of this.chickens) {
      chicken.setVisible(land.southChickenCoopUnlocked);
    }

    this.eastSign.setVisible(!land.eastCornFieldUnlocked);
    this.southSign.setVisible(!land.southChickenCoopUnlocked);
    this.cornExpansionPad.setVisible(
      land.eastCornFieldUnlocked && level < 2,
    );
    if (!this.cornExpansionPad.visible) this.drawCornExpansionProgress(0);
  }
}
