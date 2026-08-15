import Phaser from "phaser";
import { palette } from "../art/palette";
import type { CustomerPhase } from "../logic/customerQueue";
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
    const mark = scene.add
      .graphics()
      .lineStyle(3, palette.stubble)
      .lineBetween(-8, -130, 8, -130)
      .lineBetween(0, -138, 0, -122);
    const bubble = scene.add.container(0, 0, [cloud, mark]).setVisible(false);
    super(scene, x, y, [shadow, art, bag, bubble]);
    this.id = id;
    this.bubble = bubble;
    this.bag = bag;
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
  giveBag(): void {
    this.bag
      .clear()
      .lineStyle(2, palette.outline)
      .fillStyle(palette.wheat)
      .fillRoundedRect(14, -42, 25, 31, 7)
      .strokeRoundedRect(14, -42, 25, 31, 7);
  }
}
