import Phaser from "phaser";
import { palette } from "../art/palette";
export class Chicken extends Phaser.GameObjects.Container {
  private target: Phaser.Math.Vector2; private timer: number;
  constructor(scene: Phaser.Scene, x: number, y: number, color: number, private readonly index: number) {
    const shadow = scene.add.ellipse(0, 9, 48, 18, palette.shadow, .25); const art = scene.add.graphics().lineStyle(3, palette.outline)
      .fillStyle(color).fillEllipse(0, -12, 48, 42).strokeEllipse(0, -12, 48, 42).fillCircle(18, -34, 16).strokeCircle(18, -34, 16)
      .fillStyle(0xd9583b).fillTriangle(12, -51, 19, -62, 25, -50).fillStyle(0xf2c84b).fillTriangle(31, -35, 45, -29, 31, -25)
      .lineStyle(3, palette.outline).lineBetween(-9, 8, -9, 20).lineBetween(9, 8, 9, 20);
    super(scene, x, y, [shadow, art]); scene.add.existing(this); this.target = new Phaser.Math.Vector2(x, y); this.timer = 300 + index * 600;
  }
  tick(delta: number): void { this.timer -= delta; if (this.timer <= 0) { this.timer = 1500 + this.index * 370; const phase = this.scene.time.now / 900 + this.index * 2; this.target.set(1120 + Math.cos(phase) * (220 + this.index * 20), 1660 + Math.sin(phase * 1.3) * 100); }
    const d = Phaser.Math.Distance.Between(this.x, this.y, this.target.x, this.target.y); if (d > 4) { const step = Math.min(d, delta * .045); this.x += (this.target.x - this.x) / d * step; this.y += (this.target.y - this.y) / d * step; this.scaleY = 1 + Math.sin(this.scene.time.now * .012) * .04; } this.setDepth(this.y + 45);
  }
}
