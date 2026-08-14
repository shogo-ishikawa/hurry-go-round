import Phaser from 'phaser';
import { palette } from '../art/palette';
import type { Point } from '../logic/movement';
import { getJoystickCenter } from './inputLayout';

export class VirtualJoystick {
  readonly direction: Point = { x: 0, y: 0 };

  private base: Phaser.GameObjects.Arc;
  private knob: Phaser.GameObjects.Arc;
  private zone: Phaser.GameObjects.Zone;
  private activePointer: number | null = null;
  private center = new Phaser.Math.Vector2();
  private enabled = true;

  constructor(
    private scene: Phaser.Scene,
    private onDirectionChange: (direction: Point) => void,
  ) {
    this.base = scene.add.circle(0, 0, 62, palette.cream, 0.3)
      .setStrokeStyle(3, palette.cream, 0.76)
      .setDepth(50);
    this.knob = scene.add.circle(0, 0, 28, palette.teal, 0.94)
      .setStrokeStyle(3, palette.cream, 0.92)
      .setDepth(52);
    this.zone = scene.add.zone(0, 0, 176, 176).setInteractive().setDepth(53);

    this.zone.on('pointerdown', this.start, this);
    scene.input.on('pointermove', this.move, this);
    scene.input.on('pointerup', this.stop, this);
    scene.input.on('pointerupoutside', this.stop, this);
    scene.input.on('gameout', this.reset, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);

    this.layout();
  }

  layout(): void {
    const center = getJoystickCenter(this.scene.scale.height);
    this.center.set(center.x, center.y);
    this.base.setPosition(center.x, center.y);
    this.knob.setPosition(center.x, center.y);
    this.zone.setPosition(center.x, center.y);
    this.reset();
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.base.setVisible(enabled);
    this.knob.setVisible(enabled);
    if (enabled) this.zone.setInteractive();
    else this.zone.disableInteractive();
    if (!enabled) this.reset();
  }

  reset(): void {
    this.activePointer = null;
    this.direction.x = 0;
    this.direction.y = 0;
    this.knob.setPosition(this.center.x, this.center.y);
    this.publishDirection();
  }

  private start(pointer: Phaser.Input.Pointer): void {
    if (!this.enabled || this.activePointer !== null) return;
    this.activePointer = pointer.id;
    this.move(pointer);
  }

  private move(pointer: Phaser.Input.Pointer): void {
    if (!this.enabled || pointer.id !== this.activePointer || !pointer.isDown) return;

    const dx = pointer.x - this.center.x;
    const dy = pointer.y - this.center.y;
    const length = Math.hypot(dx, dy);
    const maxRadius = 54;
    const factor = length > maxRadius ? maxRadius / length : 1;

    this.knob.setPosition(
      this.center.x + dx * factor,
      this.center.y + dy * factor,
    );

    if (length < 10) {
      this.direction.x = 0;
      this.direction.y = 0;
    } else {
      this.direction.x = dx / length;
      this.direction.y = dy / length;
    }
    this.publishDirection();
  }

  private stop(pointer: Phaser.Input.Pointer): void {
    if (pointer.id === this.activePointer) this.reset();
  }

  private publishDirection(): void {
    this.onDirectionChange({ x: this.direction.x, y: this.direction.y });
  }

  private destroy(): void {
    this.zone.off('pointerdown', this.start, this);
    this.scene.input.off('pointermove', this.move, this);
    this.scene.input.off('pointerup', this.stop, this);
    this.scene.input.off('pointerupoutside', this.stop, this);
    this.scene.input.off('gameout', this.reset, this);
  }
}
