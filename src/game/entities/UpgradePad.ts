import Phaser from "phaser";
import { palette } from "../art/palette";
import { GAME_CONFIG } from "../config/gameConfig";
import { getHarvestUpgradeCost } from "../logic/upgrades";

export class UpgradePad extends Phaser.GameObjects.Container {
  private art: Phaser.GameObjects.Graphics;
  private label: Phaser.GameObjects.Text;
  private instruction: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    const art = scene.add.graphics();
    const label = scene.add
      .text(0, -30, "", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "18px",
        align: "center",
        fontStyle: "bold",
        color: "#49382e",
        lineSpacing: 3,
      })
      .setOrigin(0.5);
    const instruction = scene.add
      .text(0, 58, "この円内に立つ", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "14px",
        align: "center",
        fontStyle: "bold",
        color: "#49382e",
        backgroundColor: "#fff4d8e8",
        padding: { x: 9, y: 5 },
      })
      .setOrigin(0.5);

    super(scene, x, y, [art, label, instruction]);
    this.art = art;
    this.label = label;
    this.instruction = instruction;
    scene.add.existing(this);
    this.setDepth(y);
    this.updateDisplay(0, 0, 0);
  }

  updateDisplay(level: number, progress: number, wallet: number): void {
    const cost = getHarvestUpgradeCost(level);
    const affordable = cost !== null && wallet >= cost;
    const radius = GAME_CONFIG.upgrade.radius;
    const fillColor =
      cost === null
        ? palette.creamDark
        : affordable
          ? palette.tealLight
          : palette.pathLight;
    const outlineColor =
      cost === null
        ? palette.outline
        : affordable
          ? palette.teal
          : palette.barn;

    const graphics = this.art.clear();
    graphics
      .fillStyle(fillColor, 0.32)
      .fillCircle(0, 0, radius)
      .lineStyle(8, outlineColor, 0.95)
      .strokeCircle(0, 0, radius)
      .lineStyle(3, palette.cream, 0.9)
      .strokeCircle(0, 0, radius - 13);

    if (progress > 0) {
      graphics
        .lineStyle(9, palette.highlight, 1)
        .beginPath()
        .arc(
          0,
          0,
          radius - 20,
          -Math.PI / 2,
          -Math.PI / 2 + Math.PI * 2 * Math.min(1, progress),
        )
        .strokePath();
    }

    const status =
      cost === null
        ? "最大レベル"
        : affordable
          ? `必要 ${cost} コイン`
          : `あと ${cost - wallet} コイン`;
    this.label.setText(`収穫速度アップ\nレベル ${level}\n${status}`);
    this.instruction.setText(cost === null ? "強化済み" : "この円内に立つ");
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
