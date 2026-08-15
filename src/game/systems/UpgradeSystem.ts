import Phaser from "phaser";
import { GAME_CONFIG } from "../config/gameConfig";
import { UpgradePad } from "../entities/UpgradePad";
import type { Farmer } from "../entities/Farmer";
import type { GameState } from "../state/GameState";
import {
  getHarvestUpgradeCost,
  purchaseHarvestUpgrade,
} from "../logic/upgrades";
export class UpgradeSystem {
  private pad: UpgradePad;
  private progress = 0;
  private lockedUntilExit = false;
  private insufficientShown = false;
  constructor(
    scene: Phaser.Scene,
    private farmer: Farmer,
    private getState: () => GameState,
    private setState: (s: GameState) => void,
    private tutorial: (stage: number) => void,
  ) {
    this.pad = new UpgradePad(
      scene,
      GAME_CONFIG.upgrade.x,
      GAME_CONFIG.upgrade.y,
    );
  }
  update(delta: number): void {
    const s = this.getState();
    const near =
      Phaser.Math.Distance.Between(
        this.farmer.x,
        this.farmer.y,
        GAME_CONFIG.upgrade.x,
        GAME_CONFIG.upgrade.y,
      ) <= GAME_CONFIG.upgrade.radius;
    if (!near) {
      this.progress = 0;
      this.lockedUntilExit = false;
      this.insufficientShown = false;
      this.pad.updateDisplay(
        s.upgrades.harvestSpeedLevel,
        0,
        s.economy.walletCoins,
      );
      return;
    }
    this.tutorial(7);
    const cost = getHarvestUpgradeCost(s.upgrades.harvestSpeedLevel);
    if (this.lockedUntilExit || cost === null) {
      this.pad.updateDisplay(
        s.upgrades.harvestSpeedLevel,
        0,
        s.economy.walletCoins,
      );
      return;
    }
    if (s.economy.walletCoins < cost) {
      this.progress = 0;
      if (!this.insufficientShown) {
        this.insufficientShown = true;
        this.pad.pulse();
      }
      this.pad.updateDisplay(
        s.upgrades.harvestSpeedLevel,
        0,
        s.economy.walletCoins,
      );
      return;
    }
    this.progress += delta;
    this.pad.updateDisplay(
      s.upgrades.harvestSpeedLevel,
      this.progress / GAME_CONFIG.upgradeHoldDurationMs,
      s.economy.walletCoins,
    );
    if (this.progress < GAME_CONFIG.upgradeHoldDurationMs) return;
    const result = purchaseHarvestUpgrade({
      walletCoins: s.economy.walletCoins,
      harvestSpeedLevel: s.upgrades.harvestSpeedLevel,
    });
    if (!result.purchased) return;
    this.setState({
      ...s,
      economy: { ...s.economy, walletCoins: result.value.walletCoins },
      upgrades: { ...s.upgrades, harvestSpeedLevel: result.value.harvestSpeedLevel },
      firstUpgradePurchased: true,
    });
    this.progress = 0;
    this.lockedUntilExit = true;
    this.pad.pulse();
    this.tutorial(8);
  }
}
