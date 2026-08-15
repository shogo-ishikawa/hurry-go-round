import Phaser from 'phaser';
import { palette } from '../art/palette';
import type { Point } from '../logic/movement';

export class VirtualJoystick {
  readonly direction: Point = { x: 0, y: 0 };
  private base: Phaser.GameObjects.Arc;
  private knob: Phaser.GameObjects.Arc;
  private zone: Phaser.GameObjects.Zone;
  private activePointer: number | null = null;
  private center = new Phaser.Math.Vector2();
  constructor(private scene: Phaser.Scene) {
    this.base = scene.add.circle(0, 0, 62, palette.cream, 0.28).setStrokeStyle(3, palette.cream, 0.72);
    this.knob = scene.add.circle(0, 0, 28, palette.teal, 0.92).setStrokeStyle(3, palette.cream, 0.9);
    this.zone = scene.add.zone(0, 0, 150, 150).setInteractive();
    this.zone.on('pointerdown', this.start, this);
    scene.input.on('pointermove', this.move, this);
    scene.input.on('pointerup', this.stop, this);
    scene.input.on('pointerupoutside', this.stop, this);
    scene.input.on('gameout', this.reset, this);
    scene.scale.on(Phaser.Scale.Events.RESIZE, this.layout, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
    this.layout();
  }
  layout(): void { this.center.set(92, this.scene.scale.height - 92); this.base.setPosition(this.center.x, this.center.y); this.knob.setPosition(this.center.x, this.center.y); this.zone.setPosition(this.center.x, this.center.y); this.reset(); }
  setEnabled(enabled: boolean): void {
    this.base.setVisible(enabled); this.knob.setVisible(enabled);
    if (enabled) this.zone.setInteractive(); else this.zone.disableInteractive();
    if (!enabled) this.reset();
  }
  reset(): void { this.activePointer = null; this.direction.x = 0; this.direction.y = 0; this.knob.setPosition(this.center.x, this.center.y); }
  private start(pointer: Phaser.Input.Pointer): void { if (this.activePointer === null) { this.activePointer = pointer.id; this.move(pointer); } }
  private move(pointer: Phaser.Input.Pointer): void {
    if (pointer.id !== this.activePointer || !pointer.isDown) return;
    const dx = pointer.x - this.center.x; const dy = pointer.y - this.center.y; const length = Math.hypot(dx, dy); const max = 54;
    const factor = length > max ? max / length : 1;
    this.knob.setPosition(this.center.x + dx * factor, this.center.y + dy * factor);
    if (length < 10) { this.direction.x = 0; this.direction.y = 0; } else { this.direction.x = dx / length; this.direction.y = dy / length; }
  }
  private stop(pointer: Phaser.Input.Pointer): void { if (pointer.id === this.activePointer) this.reset(); }
  private destroy(): void {
    this.scene.scale.off(Phaser.Scale.Events.RESIZE, this.layout, this); this.scene.input.off('pointermove', this.move, this); this.scene.input.off('pointerup', this.stop, this); this.scene.input.off('pointerupoutside', this.stop, this); this.scene.input.off('gameout', this.reset, this);
  }
}
