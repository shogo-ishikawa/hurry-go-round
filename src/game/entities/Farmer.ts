import Phaser from 'phaser';
import { palette } from '../art/palette';
import { GAME_CONFIG } from '../config/gameConfig';

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
    const shadow = scene.add.ellipse(0, 4, 68, 24, palette.shadow, 0.24);
    const stack = scene.add.graphics();
    const leftLeg = scene.add.rectangle(-13, 4, 15, 34, palette.denimDark)
      .setStrokeStyle(2.5, palette.outline);
    const rightLeg = scene.add.rectangle(13, 4, 15, 34, palette.denimDark)
      .setStrokeStyle(2.5, palette.outline);
    const leftArm = scene.add.rectangle(-27, -20, 13, 33, palette.cream)
      .setStrokeStyle(2.5, palette.outline);
    const rightArm = scene.add.rectangle(27, -20, 13, 33, palette.cream)
      .setStrokeStyle(2.5, palette.outline);
    const body = scene.add.graphics();

    super(scene, x, y, [shadow, stack, leftLeg, rightLeg, leftArm, rightArm, body]);
    this.shadow = shadow;
    this.stack = stack.setScale(0.94);
    this.bodyGraphics = body.setScale(0.88);
    this.leftLeg = leftLeg;
    this.rightLeg = rightLeg;
    this.leftArm = leftArm;
    this.rightArm = rightArm;

    scene.add.existing(this);
    this.setSize(68, 102).setScale(0.96);
    this.drawBody();
    this.setCarried(0);
  }

  setFacingFromVector(x: number, y: number): void {
    if (Math.abs(x) < 0.001 && Math.abs(y) < 0.001) return;
    const next: Facing = Math.abs(x) > Math.abs(y)
      ? (x < 0 ? 'left' : 'right')
      : (y < 0 ? 'back' : 'front');
    if (next !== this.facing) {
      this.facing = next;
      this.drawBody();
      this.drawStack();
    }
  }

  setCarried(count: number): void {
    const nextCount = Number.isFinite(count)
      ? Phaser.Math.Clamp(Math.floor(count), 0, GAME_CONFIG.carryCapacity)
      : 0;
    if (nextCount !== this.carried) {
      this.carried = nextCount;
      this.drawStack();
    }
  }

  playHarvestMotion(): void {
    this.scene.tweens.killTweensOf(this);
    const harvestAngle = this.facing === 'left' ? -6 : 6;
    this.scene.tweens.add({
      targets: this,
      angle: harvestAngle,
      scaleX: 0.93,
      scaleY: 1.01,
      yoyo: true,
      duration: 95,
      onComplete: () => this.setAngle(0).setScale(0.96),
    });
  }

  animate(delta: number, moving: boolean): void {
    this.phase += delta * (moving ? 0.0125 : 0.0024);
    const wave = Math.sin(this.phase);
    const bob = wave * (moving ? 3.6 : 1.05);
    const stride = moving ? wave * 0.36 : 0;
    const armSwing = stride * 0.72;

    this.bodyGraphics.y = -66 + bob;
    this.stack.y = -66 + bob;
    this.leftLeg.setPosition(-13, 4 + bob).setRotation(stride);
    this.rightLeg.setPosition(13, 4 + bob).setRotation(-stride);
    this.leftArm.setPosition(-27, -20 + bob).setRotation(-armSwing);
    this.rightArm.setPosition(27, -20 + bob).setRotation(armSwing);
    this.bodyGraphics.setScale(
      0.88 * (1 - Math.abs(wave) * (moving ? 0.012 : 0)),
      0.88 * (1 + Math.abs(wave) * (moving ? 0.022 : 0)),
    );
    this.shadow.setScale(1 - Math.abs(bob) * 0.009, 1 - Math.abs(bob) * 0.004);
    this.setDepth(this.y + 90);
  }

  private drawBody(): void {
    const g = this.bodyGraphics.clear();
    const side = this.facing === 'left' ? -1 : this.facing === 'right' ? 1 : 0;
    const back = this.facing === 'back';
    const profile = side !== 0;
    const headX = side * 4;

    g.lineStyle(3, palette.outline, 1);

    // Ponytail and braid sit behind the face and hat.
    const ponytailX = profile ? -side * 28 : 24;
    g.fillStyle(palette.hair)
      .fillEllipse(ponytailX, 7, 20, 34)
      .strokeEllipse(ponytailX, 7, 20, 34);
    g.fillStyle(palette.hairLight)
      .fillCircle(ponytailX + (profile ? -side * 2 : 2), 21, 9)
      .strokeCircle(ponytailX + (profile ? -side * 2 : 2), 21, 9);
    g.fillStyle(palette.teal).fillRoundedRect(ponytailX - 6, 27, 12, 6, 3);

    // Neck, shirt, and rounded overall silhouette.
    g.fillStyle(palette.skinShadow)
      .fillRoundedRect(-8 + headX, 27, 16, 13, 5)
      .strokeRoundedRect(-8 + headX, 27, 16, 13, 5);
    g.fillStyle(palette.cream)
      .fillRoundedRect(-29, 34, 58, 40, 18)
      .strokeRoundedRect(-29, 34, 58, 40, 18);
    g.fillStyle(palette.denim)
      .fillRoundedRect(-21, 40, 42, 39, 12)
      .strokeRoundedRect(-21, 40, 42, 39, 12);

    if (back) {
      g.lineStyle(4, palette.denimDark)
        .lineBetween(-16, 38, -10, 60)
        .lineBetween(16, 38, 10, 60);
      g.fillStyle(palette.denimDark).fillRoundedRect(-15, 57, 30, 13, 5);
      g.lineStyle(2, palette.creamDark).lineBetween(-10, 64, 10, 64);
    } else {
      g.lineStyle(4, palette.denimDark)
        .lineBetween(-17, 39, -13, 56)
        .lineBetween(17, 39, 13, 56);
      g.fillStyle(palette.hatLight)
        .fillCircle(-13, 47, 3.2)
        .fillCircle(13, 47, 3.2);
      g.fillStyle(palette.denimDark)
        .fillRoundedRect(-13, 55, 26, 16, 5)
        .strokeRoundedRect(-13, 55, 26, 16, 5);
      g.lineStyle(2, palette.tealLight)
        .lineBetween(-8, 60, 8, 60)
        .lineBetween(0, 57, 0, 68);
    }

    // Head and ears.
    if (!back) {
      g.fillStyle(palette.skinShadow);
      if (!profile) {
        g.fillCircle(-22, 10, 7).strokeCircle(-22, 10, 7);
        g.fillCircle(22, 10, 7).strokeCircle(22, 10, 7);
      } else {
        g.fillCircle(headX + side * 20, 11, 7).strokeCircle(headX + side * 20, 11, 7);
      }
    }
    g.fillStyle(back ? palette.hair : palette.skin)
      .fillEllipse(headX, 10, profile ? 41 : 46, 43)
      .strokeEllipse(headX, 10, profile ? 41 : 46, 43);

    // Hair cap and fringe.
    g.fillStyle(palette.hair);
    if (back) {
      g.fillEllipse(headX, 7, 42, 39).strokeEllipse(headX, 7, 42, 39);
      g.lineStyle(2, palette.hairLight)
        .lineBetween(-13, 2, -8, 23)
        .lineBetween(0, -2, 2, 24)
        .lineBetween(13, 2, 11, 22);
    } else if (profile) {
      g.fillEllipse(headX - side * 7, -2, 34, 21).strokeEllipse(headX - side * 7, -2, 34, 21);
      g.fillTriangle(headX - side * 18, 0, headX + side * 3, -8, headX - side * 4, 10);
    } else {
      g.fillEllipse(headX, -3, 44, 22).strokeEllipse(headX, -3, 44, 22);
      g.fillTriangle(-20, 0, -5, -8, -10, 10);
      g.fillTriangle(18, 0, 4, -8, 10, 9);
    }

    // Friendly face with eyebrows, highlights, blush, nose, and smile.
    if (!back) {
      const eyeOffset = profile ? side * 8 : 0;
      g.lineStyle(2.2, palette.hair);
      if (profile) {
        const eyeX = headX + side * 7;
        g.lineBetween(eyeX - 4, 4, eyeX + 3, 3);
        g.fillStyle(palette.outline).fillCircle(eyeX, 8, 2.6);
        g.fillStyle(palette.white).fillCircle(eyeX - side * 0.8, 7.2, 0.9);
        g.lineStyle(2, palette.skinShadow)
          .beginPath()
          .moveTo(headX + side * 14, 11)
          .lineTo(headX + side * 18, 14)
          .lineTo(headX + side * 14, 15)
          .strokePath();
        g.fillStyle(palette.blush).fillEllipse(headX + side * 9, 17, 9, 4);
        g.lineStyle(2, palette.barnDark)
          .beginPath()
          .arc(headX + side * 7, 17, 6, 0.25, Math.PI - 0.25)
          .strokePath();
      } else {
        for (const eyeX of [-8, 8]) {
          g.lineBetween(eyeX - 4, 3, eyeX + 4, 2);
          g.fillStyle(palette.outline).fillCircle(eyeX, 8, 2.6);
          g.fillStyle(palette.white).fillCircle(eyeX - 0.8, 7.1, 0.9);
        }
        g.lineStyle(2, palette.skinShadow).lineBetween(eyeOffset, 10, eyeOffset - 1, 14);
        g.fillStyle(palette.blush)
          .fillEllipse(-14, 17, 9, 4)
          .fillEllipse(14, 17, 9, 4);
        g.lineStyle(2.2, palette.barnDark)
          .beginPath()
          .arc(0, 15, 7, 0.2, Math.PI - 0.2)
          .strokePath();
      }
    }

    // Wide woven hat, teal ribbon, stitching, and a small flower pin.
    g.lineStyle(3, palette.outline)
      .fillStyle(palette.hatLight)
      .fillEllipse(headX + side * 2, -10, profile ? 61 : 68, 19)
      .strokeEllipse(headX + side * 2, -10, profile ? 61 : 68, 19);
    g.fillStyle(palette.hat)
      .fillRoundedRect(-22 + headX, -39, 44, 30, 13)
      .strokeRoundedRect(-22 + headX, -39, 44, 30, 13);
    g.fillStyle(palette.teal).fillRoundedRect(-22 + headX, -16, 44, 7, 3);
    g.lineStyle(1.5, palette.hatLight, 0.85)
      .lineBetween(-14 + headX, -34, 14 + headX, -34)
      .lineBetween(-17 + headX, -27, 17 + headX, -27);
    if (!back) {
      g.fillStyle(palette.flower)
        .fillCircle(16 + headX, -18, 4)
        .fillCircle(21 + headX, -17, 4)
        .fillCircle(18 + headX, -13, 4);
      g.fillStyle(palette.highlight).fillCircle(18 + headX, -16, 2.5);
    }
  }

  private drawStack(): void {
    const g = this.stack.clear();
    const visibleCount = Phaser.Math.Clamp(this.carried, 0, GAME_CONFIG.carryCapacity);
    const full = visibleCount >= GAME_CONFIG.carryCapacity;
    const nearlyFull = visibleCount >= Math.ceil(GAME_CONFIG.carryCapacity * 0.75);
    const back = this.facing === 'back';
    const xShift = this.facing === 'left'
      ? 29
      : this.facing === 'right'
        ? -29
        : back
          ? 25
          : -29;
    const carrierOutline = full
      ? palette.barn
      : nearlyFull
        ? palette.soilDark
        : palette.outline;

    // Shoulder straps and an empty basket remain visible before the first harvest.
    g.lineStyle(3, palette.soilDark, 0.72)
      .lineBetween(xShift - 15, 37, xShift - 11, 64)
      .lineBetween(xShift + 15, 37, xShift + 11, 64);
    g.lineStyle(2.7, carrierOutline)
      .fillStyle(palette.path)
      .fillRoundedRect(xShift - 22, 34, 44, 33, 8)
      .strokeRoundedRect(xShift - 22, 34, 44, 33, 8);
    g.fillStyle(palette.soilDark, visibleCount === 0 ? 0.22 : 0.08)
      .fillEllipse(xShift, 43, 31, 12);
    g.lineStyle(2, palette.soilDark, 0.82)
      .lineBetween(xShift - 18, 44, xShift + 18, 44)
      .lineBetween(xShift - 17, 54, xShift + 17, 54)
      .lineBetween(xShift - 16, 63, xShift + 16, 63)
      .lineBetween(xShift - 9, 36, xShift - 9, 65)
      .lineBetween(xShift + 9, 36, xShift + 9, 65);

    for (let index = 0; index < visibleCount; index += 1) {
      const row = Math.floor(index / 3);
      const column = index % 3;
      const x = xShift + (column - 1) * 13 + (row % 2) * 4;
      const y = 36 - row * 13;
      g.lineStyle(1.8, palette.outline)
        .fillStyle(palette.wheat)
        .fillRoundedRect(x - 7, y - 6, 15, 11, 4)
        .strokeRoundedRect(x - 7, y - 6, 15, 11, 4);
      g.lineStyle(2.2, palette.wheatLight)
        .lineBetween(x - 3, y - 6, x + 1, y - 16)
        .lineBetween(x + 2, y - 5, x + 7, y - 14);
      g.lineStyle(2, palette.teal).lineBetween(x - 6, y, x + 7, y);
    }

    if (full) {
      // A red tie and flag make the physical stack read as unmistakably full.
      g.lineStyle(3, palette.barn)
        .lineBetween(xShift - 19, 1, xShift + 19, 1);
      g.fillStyle(palette.barn)
        .fillTriangle(xShift + 18, -4, xShift + 30, 1, xShift + 18, 7);
      g.lineStyle(1.5, palette.outline)
        .strokeTriangle(xShift + 18, -4, xShift + 30, 1, xShift + 18, 7);
    }
  }
}
