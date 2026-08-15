import Phaser from "phaser";
import { palette } from "../art/palette";
import { getHarvestUpgradeCost } from "../logic/upgrades";
export class UpgradePad extends Phaser.GameObjects.Container {
  private art: Phaser.GameObjects.Graphics;
  private label: Phaser.GameObjects.Text;
  constructor(scene: Phaser.Scene, x: number, y: number) {
    const art = scene.add.graphics();
    const label = scene.add
      .text(0, -25, "", {
        fontFamily: "system-ui",
        fontSize: "18px",
        align: "center",
        fontStyle: "bold",
        color: "#49382e",
      })
      .setOrigin(0.5);
    super(scene, x, y, [art, label]);
    this.art = art;
    this.label = label;
    scene.add.existing(this);
    this.setDepth(y);
    this.updateDisplay(0, 0, 0);
  }
  updateDisplay(level: number, progress: number, wallet: number): void {
    const cost = getHarvestUpgradeCost(level);
    const g = this.art.clear();
    g.lineStyle(5, palette.outline)
      .fillStyle(palette.tealLight, 0.75)
      .fillEllipse(0, 0, 180, 95)
      .strokeEllipse(0, 0, 180, 95);
    g.lineStyle(8, palette.highlight)
      .beginPath()
      .arc(
        0,
        0,
        77,
        -Math.PI / 2,
        -Math.PI / 2 + Math.PI * 2 * Math.min(1, progress),
      )
      .strokePath();
    const status =
      cost === null
        ? "MAX"
        : wallet >= cost
          ? `${cost} COINS`
          : `NEED ${cost - wallet}`;
    this.label.setText(`HARVEST SPEED  LV ${level}\n${status}`);
  }
  pulse(): void {
    this.scene.tweens.add({
      targets: this,
      scale: 1.15,
      yoyo: true,
      duration: 220,
    });
  }
}
