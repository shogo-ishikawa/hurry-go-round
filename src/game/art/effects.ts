import Phaser from 'phaser';
import { palette } from './palette';
export function harvestEffect(scene: Phaser.Scene, x: number, y: number): void {
  const label = scene.add.text(x, y - 55, '+1', { fontFamily: 'system-ui', fontSize: '24px', fontStyle: 'bold', color: '#fff4d8', stroke: '#49382e', strokeThickness: 4 }).setOrigin(0.5).setDepth(5000);
  scene.tweens.add({ targets: label, y: y - 100, alpha: 0, duration: 650, onComplete: () => label.destroy() });
  for (let i = 0; i < 4; i += 1) {
    const chaff = scene.add.ellipse(x, y - 20, 8, 4, palette.wheatLight).setDepth(4999);
    scene.tweens.add({ targets: chaff, x: x + (i - 1.5) * 18, y: y - 55 - (i % 2) * 12, alpha: 0, rotation: i, duration: 480, onComplete: () => chaff.destroy() });
  }
}
export function transferEffect(scene: Phaser.Scene, x: number, y: number, targetX: number, targetY: number): void {
  const bundle = scene.add.rectangle(x, y - 45, 18, 13, palette.wheat).setStrokeStyle(2, palette.outline).setDepth(6000);
  scene.tweens.add({ targets: bundle, x: targetX, y: targetY, scale: 0.5, duration: 320, ease: 'Quad.easeIn', onComplete: () => bundle.destroy() });
}
