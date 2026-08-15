import Phaser from "phaser";
import { palette } from "../art/palette";
import type { CustomerPhase } from "../logic/customerQueue";
import type { ResourceId } from "../config/resourceDefinitions";
const shirts = [palette.plum, palette.sky, palette.coral, palette.teal];
const hairs = [
  palette.outline,
  palette.barnDark,
  palette.wheat,
  palette.soilDark,
];
export class Customer extends Phaser.GameObjects.Container {
  phase: CustomerPhase = "entering";
  purchased = false;
  requestedResource: ResourceId = "wheat";
  readonly id: number;
  private bubble: Phaser.GameObjects.Container;
  private bag: Phaser.GameObjects.Graphics;
  private phaseTime = 0;
  constructor(scene: Phaser.Scene, id: number, x: number, y: number) {
    const variant = id % 4;
    const shadow = scene.add.ellipse(0, 2, 44, 16, palette.shadow, 0.24);
    const art = scene.add.graphics();
    art
      .lineStyle(3, palette.outline)
      .fillStyle(shirts[variant] ?? palette.teal)
      .fillRoundedRect(-20, -50, 40, 48, 14)
      .strokeRoundedRect(-20, -50, 40, 48, 14);
    art.fillStyle(0xf1b98c).fillCircle(0, -69, 20).strokeCircle(0, -69, 20);
    art
      .fillStyle(hairs[variant] ?? palette.outline)
      .fillEllipse(0, -83, 39, 20);
    if (variant === 2)
      art
        .fillStyle(palette.cream)
        .fillEllipse(0, -88, 50, 13)
        .strokeEllipse(0, -88, 50, 13);
    art
      .fillStyle(palette.outline)
      .fillRoundedRect(-16, -7, 12, 18, 5)
      .fillRoundedRect(4, -7, 12, 18, 5);
    const bag = scene.add.graphics();
    const cloud = scene.add
      .ellipse(0, -126, 65, 42, palette.cream)
      .setStrokeStyle(2, palette.outline);
    const mark = scene.add.graphics();
    const bubble = scene.add.container(0, 0, [cloud, mark]).setVisible(false);
    super(scene, x, y, [shadow, art, bag, bubble]);
    this.id = id;
    this.bubble = bubble;
    this.bag = bag;
    this.drawRequest(mark, "wheat");
    scene.add.existing(this);
    this.setDepth(y + 70);
  }
  moveToward(target: Phaser.Math.Vector2, delta: number): boolean {
    const d = Phaser.Math.Distance.Between(this.x, this.y, target.x, target.y);
    if (d < 5) {
      this.setPosition(target.x, target.y);
      return true;
    }
    const step = Math.min(d, (150 * delta) / 1000);
    this.x += ((target.x - this.x) / d) * step;
    this.y += ((target.y - this.y) / d) * step;
    this.phaseTime += delta;
    this.scaleY = 1 + Math.sin(this.phaseTime * 0.01) * 0.018;
    this.setDepth(this.y + 70);
    return false;
  }
  showOutOfStock(show: boolean): void {
    this.bubble.setVisible(show);
  }
  setRequestedResource(resource: ResourceId): void { this.requestedResource = resource; const mark = this.bubble.list[1]; if (mark instanceof Phaser.GameObjects.Graphics) this.drawRequest(mark, resource); }
  giveBag(resource: ResourceId = this.requestedResource): void {
    const color = resource === "corn" ? 0xf2c84b : resource === "egg" ? palette.cream : palette.wheat;
    this.bag
      .clear()
      .lineStyle(2, palette.outline)
      .fillStyle(color)
      .fillRoundedRect(14, -42, 25, 31, 7)
      .strokeRoundedRect(14, -42, 25, 31, 7);
  }
  private drawRequest(mark: Phaser.GameObjects.Graphics, resource: ResourceId): void { mark.clear().lineStyle(2, palette.outline); if (resource === "egg") mark.fillStyle(palette.cream).fillEllipse(0, -130, 16, 21).strokeEllipse(0, -130, 16, 21); else if (resource === "corn") mark.fillStyle(0xf2c84b).fillEllipse(0, -130, 13, 25).strokeEllipse(0, -130, 13, 25).lineStyle(3, palette.foliage).lineBetween(-5, -120, -12, -130); else mark.fillStyle(palette.wheat).fillRoundedRect(-8, -138, 16, 18, 4).strokeRoundedRect(-8, -138, 16, 18, 4); }
}
