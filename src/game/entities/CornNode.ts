import Phaser from "phaser";
import { palette } from "../art/palette";
import { tickCornCrop, harvestCornCrop, type CornCropModel } from "../logic/cornCrop";
export class CornNode extends Phaser.GameObjects.Graphics {
  model: CornCropModel;
  constructor(scene: Phaser.Scene, x: number, y: number, regrowMs: number) {
    super(scene); this.setPosition(x, y); this.model = { state: "ready", elapsedMs: regrowMs, regrowMs }; scene.add.existing(this); this.draw();
  }
  tick(delta: number): void { const before = this.model.state; this.model = tickCornCrop(this.model, delta); if (before !== this.model.state) this.draw(); this.setDepth(this.y + 30); }
  harvest(): boolean { const r = harvestCornCrop(this.model); this.model = r.model; if (r.harvested) this.draw(); return r.harvested; }
  private draw(): void { this.clear().lineStyle(3, palette.outline); const ready = this.model.state === "ready", growing = this.model.state === "growing"; const h = ready ? 78 : growing ? 48 : 22;
    this.fillStyle(palette.foliage).fillRoundedRect(-5, -h, 10, h, 4).strokeRoundedRect(-5, -h, 10, h, 4);
    if (ready) this.fillStyle(0xf2c84b).fillEllipse(-10, -45, 16, 30).strokeEllipse(-10, -45, 16, 30);
    this.lineStyle(6, palette.foliageLight).lineBetween(0, -h * .55, -22, -h * .3).lineBetween(0, -h * .7, 22, -h * .45);
  }
}
