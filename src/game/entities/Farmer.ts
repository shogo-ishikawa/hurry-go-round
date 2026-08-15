import Phaser from 'phaser';
import { palette } from '../art/palette';
export type Facing = 'front' | 'back' | 'left' | 'right';

export class Farmer extends Phaser.GameObjects.Container {
  private bodyGraphics: Phaser.GameObjects.Graphics;
  private stack: Phaser.GameObjects.Graphics;
  private shadow: Phaser.GameObjects.Ellipse;
  private leftLeg: Phaser.GameObjects.Rectangle;
  private rightLeg: Phaser.GameObjects.Rectangle;
  private leftArm: Phaser.GameObjects.Rectangle;
  private rightArm: Phaser.GameObjects.Rectangle;
  private facing: Facing = 'front';
  private phase = 0;
  private carried = -1;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    const shadow = scene.add.ellipse(0, 2, 54, 20, palette.shadow, 0.28);
    const stack = scene.add.graphics();
    const leftLeg = scene.add.rectangle(-12, 4, 13, 28, palette.outline).setStrokeStyle(2, palette.outline);
    const rightLeg = scene.add.rectangle(12, 4, 13, 28, palette.outline).setStrokeStyle(2, palette.outline);
    const leftArm = scene.add.rectangle(-24, -17, 12, 30, palette.cream).setStrokeStyle(2, palette.outline);
    const rightArm = scene.add.rectangle(24, -17, 12, 30, palette.cream).setStrokeStyle(2, palette.outline);
    const body = scene.add.graphics();
    super(scene, x, y, [shadow, stack, leftLeg, rightLeg, leftArm, rightArm, body]);
    this.shadow = shadow; this.stack = stack.setScale(0.78); this.bodyGraphics = body.setScale(0.78);
    this.leftLeg = leftLeg; this.rightLeg = rightLeg; this.leftArm = leftArm; this.rightArm = rightArm;
    scene.add.existing(this);
    this.setSize(56, 84).setScale(0.85);
    this.drawBody(); this.setCarried(0);
  }

  setFacingFromVector(x: number, y: number): void {
    const next: Facing = Math.abs(x) > Math.abs(y) ? (x < 0 ? 'left' : 'right') : (y < 0 ? 'back' : 'front');
    if (next !== this.facing) { this.facing = next; this.drawBody(); this.drawStack(); }
  }

  setCarried(count: number): void { if (count !== this.carried) { this.carried = count; this.drawStack(); } }

  playHarvestMotion(): void {
    this.scene.tweens.killTweensOf(this);
    this.scene.tweens.add({ targets: this, angle: this.facing === 'left' ? -5 : 5, yoyo: true, duration: 90 });
  }

  animate(delta: number, moving: boolean): void {
    this.phase += delta * (moving ? 0.012 : 0.0025);
    const bob = Math.sin(this.phase) * (moving ? 3.2 : 1.1);
    this.bodyGraphics.y = -58 + bob;
    this.stack.y = -58 + bob;
    const stride = moving ? Math.sin(this.phase) * 0.34 : 0;
    this.leftLeg.setPosition(-12, 4 + bob).setRotation(stride);
    this.rightLeg.setPosition(12, 4 + bob).setRotation(-stride);
    this.leftArm.setPosition(-24, -17 + bob).setRotation(-stride * 0.7);
    this.rightArm.setPosition(24, -17 + bob).setRotation(stride * 0.7);
    this.bodyGraphics.setScale(0.78, 0.78 * (1 + (moving ? Math.abs(Math.sin(this.phase)) * 0.025 : 0)));
    this.shadow.scaleX = 1 - Math.abs(bob) * 0.008;
    this.setDepth(this.y + 80);
  }

  private drawBody(): void {
    const g = this.bodyGraphics.clear();
    const side = this.facing === 'left' ? -1 : this.facing === 'right' ? 1 : 0;
    const back = this.facing === 'back';
    g.lineStyle(3, palette.outline, 1);
    // overalls and shirt
    g.fillStyle(palette.cream).fillRoundedRect(-25, 25, 50, 35, 16).strokeRoundedRect(-25, 25, 50, 35, 16);
    g.fillStyle(palette.teal).fillRoundedRect(-18, 30, 36, 36, 12).strokeRoundedRect(-18, 30, 36, 36, 12);
    g.lineBetween(-13, 30, -16, 20).lineBetween(13, 30, 16, 20);
    // ponytail behind face
    g.fillStyle(palette.barnDark).fillEllipse(-22 * (side || 1), 8, 17, 30).strokeEllipse(-22 * (side || 1), 8, 17, 30);
    g.fillStyle(0xf3b984).fillCircle(side * 4, 10, 22).strokeCircle(side * 4, 10, 22);
    if (!back) {
      g.fillStyle(palette.outline).fillCircle(side * 8 - 7, 8, 2.2).fillCircle(side * 8 + 7, 8, 2.2);
      g.lineStyle(2, palette.barnDark).beginPath().arc(side * 8, 14, 6, 0.2, Math.PI - 0.2).strokePath();
    }
    // brim and straw hat
    g.lineStyle(3, palette.outline).fillStyle(palette.wheatLight).fillEllipse(side * 3, -7, 60, 18).strokeEllipse(side * 3, -7, 60, 18);
    g.fillStyle(palette.wheat).fillRoundedRect(-20 + side * 3, -30, 40, 25, 12).strokeRoundedRect(-20 + side * 3, -30, 40, 25, 12);
    g.fillStyle(palette.teal).fillRect(-20 + side * 3, -10, 40, 6);
  }

  private drawStack(): void {
    const g = this.stack.clear();
    if (this.carried <= 0) return;
    const behind = this.facing === 'back';
    const xShift = this.facing === 'left' ? 23 : this.facing === 'right' ? -23 : behind ? 20 : -24;
    for (let i = 0; i < this.carried; i += 1) {
      const row = Math.floor(i / 3); const col = i % 3;
      const x = xShift + (col - 1) * 10 + (row % 2) * 4;
      const y = 49 - row * 11;
      g.lineStyle(1.5, palette.outline).fillStyle(palette.wheat).fillRoundedRect(x - 6, y - 6, 13, 10, 3).strokeRoundedRect(x - 6, y - 6, 13, 10, 3);
      g.lineStyle(2, palette.wheatLight).lineBetween(x, y - 6, x + 3, y - 13);
    }
  }
}
