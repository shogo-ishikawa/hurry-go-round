import Phaser from "phaser";
import { GAME_CONFIG } from "../config/gameConfig";
import { UI_TEXT } from "../config/localization";
import { CornNode } from "../entities/CornNode";
import { Chicken } from "../entities/Chicken";
import { WorldSign } from "../entities/WorldSign";
import type { Farmer } from "../entities/Farmer";
import { collectResourceOne } from "../logic/resources";
import { purchaseCarryUpgrade, getCarryCapacityForLevel, getCarryUpgradeCost } from "../logic/carryUpgrade";
import { purchaseLandExpansion, type LandExpansionId } from "../logic/landExpansion";
import { collectEggOne, depositCornFeedOne, produceEggOne } from "../logic/livestock";
import { GAME_EVENTS, type GameState } from "../state/GameState";
import { palette } from "../art/palette";

export class ExpansionSystem {
  private readonly corn: CornNode[] = []; private readonly chickens: Chicken[] = [];
  private harvestTimer = 0; private feedTimer = 0; private eggPickupTimer = 0; private eggProductionTimer = GAME_CONFIG.eggProductionIntervalMs;
  private purchaseTimer = 0; private purchaseId: LandExpansionId | null = null; private carryTimer = 0; private carryArmed = true; private hintId = "";
  private eastGate: Phaser.GameObjects.Container; private southGate: Phaser.GameObjects.Container; private eastSign: WorldSign; private southSign: WorldSign; private carrySign: WorldSign;
  constructor(private scene: Phaser.Scene, private farmer: Farmer, private getState: () => GameState, private setState: (s: GameState) => void) {
    for (let row = 0; row < 4; row++) for (let col = 0; col < 6; col++) this.corn.push(new CornNode(scene, 2300 + col * 88, 340 + row * 125, GAME_CONFIG.cornRegrowBaseMs + (row * 6 + col) * GAME_CONFIG.cornRegrowStaggerMs));
    const colors = [palette.cream, 0xd9b784, 0xa96d43]; for (let i = 0; i < 3; i++) this.chickens.push(new Chicken(scene, 1090 + i * 90, 1640, colors[i] ?? palette.cream, i));
    this.eastGate = this.makeGate(2100, 650); this.southGate = this.makeGate(1150, 1420);
    this.eastSign = new WorldSign(scene, 1990, 560, [UI_TEXT.facilities.east, "120コイン"]);
    this.southSign = new WorldSign(scene, 1040, 1390, [UI_TEXT.facilities.coop, "240コイン"]);
    this.carrySign = new WorldSign(scene, 1260, 610, [UI_TEXT.facilities.carry, "12 → 18　60コイン"]);
    new WorldSign(scene, 930, 1540, [UI_TEXT.facilities.feed]); new WorldSign(scene, 1410, 1540, [UI_TEXT.facilities.eggs]);
    this.syncVisibility();
  }
  update(delta: number): void {
    const state = this.getState(); this.harvestTimer = Math.max(0, this.harvestTimer - delta); this.feedTimer = Math.max(0, this.feedTimer - delta); this.eggPickupTimer = Math.max(0, this.eggPickupTimer - delta);
    if (state.landExpansion.eastCornFieldUnlocked) { for (const crop of this.corn) crop.tick(delta); this.tryHarvestCorn(); }
    if (state.landExpansion.southChickenCoopUnlocked) { for (const chicken of this.chickens) chicken.tick(delta); this.updateLivestock(delta); }
    this.updateLandPurchase(delta); this.updateCarryUpgrade(delta); this.updateHint();
  }
  constrainPosition(x: number, y: number): { x: number; y: number; blocked: boolean } {
    const land = this.getState().landExpansion;
    if (!land.eastCornFieldUnlocked && x > 2100 && y < 1050) return { x: 2070, y, blocked: true };
    if (!land.southChickenCoopUnlocked && y > 1420 && x > 650 && x < 1650) return { x, y: 1390, blocked: true };
    return { x, y, blocked: false };
  }
  isLockedPoint(x: number, y: number): boolean { return this.constrainPosition(x, y).blocked; }
  private tryHarvestCorn(): void { if (this.harvestTimer > 0) return; const state = this.getState(); let nearest: CornNode | undefined; let best = GAME_CONFIG.harvestRange ** 2;
    for (const crop of this.corn) { if (crop.model.state !== "ready") continue; const d = Phaser.Math.Distance.Squared(this.farmer.x, this.farmer.y, crop.x, crop.y); if (d <= best) { best = d; nearest = crop; } }
    if (!nearest) return; const result = collectResourceOne(state.carriedInventory, "corn"); if (!result.changed) { if (result.reason === "different-resource") this.emitHint("mixed", UI_TEXT.messages.mixed); return; }
    if (!nearest.harvest()) return; this.harvestTimer = GAME_CONFIG.cornHarvestIntervalsByLevel[state.upgrades.harvestSpeedLevel] ?? 420; this.setState({ ...state, carriedInventory: result.value }); this.farmer.setCarried(result.value.count, result.value.resource);
  }
  private updateLivestock(delta: number): void { let state = this.getState(); const feedNear = this.near(GAME_CONFIG.feedTrough); if (feedNear && this.feedTimer <= 0) { const r = depositCornFeedOne(state.carriedInventory, state.livestock); if (r.changed) { state = { ...state, carriedInventory: r.carried, livestock: r.livestock }; this.setState(state); this.farmer.setCarried(r.carried.count, r.carried.resource); this.feedTimer = GAME_CONFIG.feedDepositIntervalMs; } }
    this.eggProductionTimer -= delta; if (this.eggProductionTimer <= 0) { this.eggProductionTimer += GAME_CONFIG.eggProductionIntervalMs; const r = produceEggOne(state.livestock); if (r.changed) { state = { ...state, livestock: r.livestock }; this.setState(state); } }
    if (this.near(GAME_CONFIG.eggStorage) && this.eggPickupTimer <= 0) { const r = collectEggOne(state.carriedInventory, state.livestock); if (r.changed) { this.setState({ ...state, carriedInventory: r.carried, livestock: r.livestock }); this.farmer.setCarried(r.carried.count, r.carried.resource); this.eggPickupTimer = GAME_CONFIG.eggPickupIntervalMs; } }
  }
  private updateLandPurchase(delta: number): void { const state = this.getState(); let id: LandExpansionId | null = null; if (!state.landExpansion.eastCornFieldUnlocked && this.near(GAME_CONFIG.eastPurchase)) id = "eastCornField"; else if (!state.landExpansion.southChickenCoopUnlocked && this.near(GAME_CONFIG.southPurchase)) id = "southChickenCoop";
    if (id !== this.purchaseId) { this.purchaseId = id; this.purchaseTimer = 0; } if (!id) return; this.purchaseTimer += delta; if (this.purchaseTimer < GAME_CONFIG.landPurchaseHoldDurationMs) return;
    const r = purchaseLandExpansion(id, state.economy.walletCoins, state.landExpansion); this.purchaseTimer = 0; if (!r.purchased) { this.emitHint(`land-${r.reason}`, r.reason === "prerequisite" ? UI_TEXT.messages.eastRequired : UI_TEXT.messages.insufficientCoins); return; }
    this.setState({ ...state, economy: { ...state.economy, walletCoins: r.walletCoins }, landExpansion: r.land }); this.syncVisibility();
  }
  private updateCarryUpgrade(delta: number): void { const near = this.near(GAME_CONFIG.carryUpgrade); if (!near) { this.carryTimer = 0; this.carryArmed = true; return; } if (!this.carryArmed) return; this.carryTimer += delta; if (this.carryTimer < GAME_CONFIG.carryUpgradeHoldDurationMs) return; const state = this.getState(); const r = purchaseCarryUpgrade(state.economy.walletCoins, state.upgrades.carryCapacityLevel); this.carryTimer = 0; this.carryArmed = false; if (!r.purchased) { this.emitHint(`carry-${r.reason}`, r.reason === "maximum" ? "背負い籠は最大容量です" : UI_TEXT.messages.insufficientCoins); return; }
    const capacity = getCarryCapacityForLevel(r.level); this.setState({ ...state, economy: { ...state.economy, walletCoins: r.walletCoins }, upgrades: { ...state.upgrades, carryCapacityLevel: r.level }, carriedInventory: { ...state.carriedInventory, capacity }, inventory: { ...state.inventory, capacity } }); this.updateCarrySign(r.level);
  }
  private updateCarrySign(level: 0 | 1 | 2): void { const cost = getCarryUpgradeCost(level); this.carrySign.setLines(cost === null ? [UI_TEXT.facilities.carry, "最大容量　24個"] : [UI_TEXT.facilities.carry, `${getCarryCapacityForLevel(level)} → ${getCarryCapacityForLevel((level + 1) as 1 | 2)}　${cost}コイン`]); }
  private updateHint(): void { const state = this.getState(); if (!state.landExpansion.eastCornFieldUnlocked && this.mid(GAME_CONFIG.eastPurchase)) this.emitHint("east", UI_TEXT.messages.purchaseHint); else if (!state.landExpansion.southChickenCoopUnlocked && this.mid(GAME_CONFIG.southPurchase)) this.emitHint("south", state.landExpansion.eastCornFieldUnlocked ? UI_TEXT.messages.purchaseHint : UI_TEXT.messages.eastRequired); else if (state.landExpansion.southChickenCoopUnlocked && this.mid(GAME_CONFIG.feedTrough) && state.livestock.feed === 0) this.emitHint("feed", UI_TEXT.messages.feedEmpty); else this.hintId = ""; }
  private emitHint(id: string, text: string): void { if (id === this.hintId) return; this.hintId = id; this.scene.game.events.emit(GAME_EVENTS.hint, text); }
  private near(p: { x: number; y: number; radius: number }): boolean { return Phaser.Math.Distance.Between(this.farmer.x, this.farmer.y, p.x, p.y) <= p.radius; }
  private mid(p: { x: number; y: number; radius: number }): boolean { const d = Phaser.Math.Distance.Between(this.farmer.x, this.farmer.y, p.x, p.y); return d > p.radius * 1.05 && d <= p.radius * 2; }
  private makeGate(x: number, y: number): Phaser.GameObjects.Container { const g = this.scene.add.graphics().lineStyle(5, palette.outline).fillStyle(palette.path).fillRoundedRect(-20, -80, 40, 160, 8).strokeRoundedRect(-20, -80, 40, 160, 8); const lock = this.scene.add.graphics().lineStyle(5, palette.outline).fillStyle(palette.coin).fillRoundedRect(-18, -15, 36, 35, 6).strokeRoundedRect(-18, -15, 36, 35, 6).strokeCircle(0, -18, 14); return this.scene.add.container(x, y, [g, lock]).setDepth(y + 100); }
  private syncVisibility(): void { const land = this.getState().landExpansion; this.eastGate.setVisible(!land.eastCornFieldUnlocked); this.southGate.setVisible(!land.southChickenCoopUnlocked); for (const c of this.corn) c.setVisible(land.eastCornFieldUnlocked); for (const c of this.chickens) c.setVisible(land.southChickenCoopUnlocked); this.eastSign.setVisible(!land.eastCornFieldUnlocked); this.southSign.setVisible(!land.southChickenCoopUnlocked); }
}
