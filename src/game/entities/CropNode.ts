import Phaser from 'phaser';
import { palette } from '../art/palette';
import { advanceCrop, harvestCrop, type CropModel } from '../logic/crops';

export class CropNode extends Phaser.GameObjects.Container {
  readonly cropId: string;
  readonly cluster: "west" | "central";
  model: CropModel;
  private art: Phaser.GameObjects.Graphics;
  private swayOffset: number;

  constructor(scene: Phaser.Scene, x: number, y: number, regrowMs: number, index: number, cropId = `wheat-legacy-${index}`, cluster: "west" | "central" = "central") {
    const art = scene.add.graphics(); super(scene, x, y, [art]); scene.add.existing(this);
    this.art = art; this.cropId = cropId; this.cluster = cluster; this.model = { state: 'ready', elapsedMs: 0, regrowMs };
    this.swayOffset = index * 0.71; this.draw(); this.setDepth(y);
  }
  harvest(): boolean {
    const result = harvestCrop(this.model); this.model = result.crop;
    if (result.awarded) { this.draw(); this.scene.tweens.add({ targets: this, scaleX: 0.72, scaleY: 0.72, yoyo: true, duration: 110 }); }
    return result.awarded;
  }
  tick(delta: number, time: number): void {
    const previous = this.model.state; this.model = advanceCrop(this.model, delta);
    if (previous !== this.model.state) this.draw();
    this.rotation = this.model.state === 'ready' ? Math.sin(time * 0.0022 + this.swayOffset) * 0.045 : 0;
  }
  private draw(): void {
    const g = this.art.clear(); g.lineStyle(2, palette.outline, 0.7);
    if (this.model.state === 'harvested') {
      g.fillStyle(palette.stubble); for (const x of [-9, 0, 9]) g.fillRect(x - 2, -4, 4, 13); return;
    }
    const scale = this.model.state === 'growing' ? 0.58 : 1;
    for (const x of [-12, 0, 12]) {
      const h = (32 + (x === 0 ? 7 : 0)) * scale;
      g.lineStyle(3, palette.stubble).lineBetween(x, 8, x, 8 - h);
      g.fillStyle(this.model.state === 'ready' ? palette.wheat : palette.wheatLight);
      g.fillEllipse(x - 3, 8 - h, 9, 15 * scale).fillEllipse(x + 3, 13 - h, 9, 15 * scale);
    }
  }
}
