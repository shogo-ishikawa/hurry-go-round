import Phaser from "phaser";
import { palette } from "../art/palette";
import { GAME_CONFIG } from "../config/gameConfig";
import type { WorkerKind } from "../logic/hiring";
export class HiringStation extends Phaser.GameObjects.Container {
  private art: Phaser.GameObjects.Graphics;
  private label: Phaser.GameObjects.Text;
  constructor(
    scene: Phaser.Scene,
    readonly kind: WorkerKind,
    x: number,
    y: number,
  ) {
    const art = scene.add.graphics();
    const label = scene.add
      .text(0, -18, "", {
        fontFamily: "system-ui",
        fontSize: "16px",
        fontStyle: "bold",
        align: "center",
        wordWrap: { width: 150 },
        color: "#49382e",
      })
      .setOrigin(0.5);
    super(scene, x, y, [art, label]);
    this.art = art;
    this.label = label;
    scene.add.existing(this);
    this.setDepth(y);
    this.updateDisplay(0, "");
  }
  updateDisplay(progress: number, text: string): void {
    const g = this.art.clear();
    g.lineStyle(4, palette.outline)
      .fillStyle(
        this.kind === "harvest" ? palette.grassLight : palette.sky,
        0.72,
      )
      .fillCircle(0, 0, GAME_CONFIG.workerHireRadius)
      .strokeCircle(0, 0, GAME_CONFIG.workerHireRadius);
    g.lineStyle(7, palette.highlight)
      .beginPath()
      .arc(
        0,
        0,
        GAME_CONFIG.workerHireRadius - 7,
        -Math.PI / 2,
        -Math.PI / 2 + Math.PI * 2 * Math.min(1, progress),
      )
      .strokePath();
    if (this.label.text !== text) this.label.setText(text);
  }
  pulse(): void {
    this.scene.tweens.add({
      targets: this,
      scale: 1.12,
      yoyo: true,
      duration: 180,
    });
  }
}
