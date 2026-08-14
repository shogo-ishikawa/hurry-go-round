import Phaser from 'phaser';
import { moveWithinBounds, type Point } from '../logic/movement';

const MAP = { width: 1200, height: 800, inset: 22 } as const;
const PLAYER_SPEED = 230;

export class PrototypeScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Container;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<'up' | 'down' | 'left' | 'right', Phaser.Input.Keyboard.Key>;
  private touchDirection: Point = { x: 0, y: 0 };
  private touchPointerId: number | null = null;
  private joystickBase!: Phaser.GameObjects.Arc;
  private joystickKnob!: Phaser.GameObjects.Arc;
  private hint!: Phaser.GameObjects.Text;

  constructor() {
    super('prototype');
  }

  create(): void {
    this.drawMap();
    this.createPlayer();
    this.createInput();
    this.createOverlay();

    this.cameras.main.setBounds(0, 0, MAP.width, MAP.height);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.scale.on(Phaser.Scale.Events.RESIZE, this.layoutOverlay, this);
    this.layoutOverlay();
  }

  update(_time: number, delta: number): void {
    const keyboardDirection = {
      x: Number(this.cursors.right.isDown || this.wasd.right.isDown) - Number(this.cursors.left.isDown || this.wasd.left.isDown),
      y: Number(this.cursors.down.isDown || this.wasd.down.isDown) - Number(this.cursors.up.isDown || this.wasd.up.isDown),
    };
    const direction = keyboardDirection.x || keyboardDirection.y ? keyboardDirection : this.touchDirection;
    const next = moveWithinBounds(this.player, direction, PLAYER_SPEED * delta / 1000, MAP);
    this.player.setPosition(next.x, next.y);
  }

  private drawMap(): void {
    const graphics = this.add.graphics();
    graphics.fillStyle(0x253d51).fillRect(0, 0, MAP.width, MAP.height);
    graphics.fillStyle(0x315b4b).fillRoundedRect(22, 22, MAP.width - 44, MAP.height - 44, 36);
    graphics.fillStyle(0xd7bd78).fillRoundedRect(110, 330, 980, 140, 54);
    graphics.fillStyle(0x5f91a3).fillRoundedRect(470, 70, 260, 210, 65);
    graphics.lineStyle(8, 0x8dc1c7, 0.65).strokeRoundedRect(470, 70, 260, 210, 65);

    const spots = [[150, 150], [300, 230], [910, 180], [1010, 620], [260, 640], [780, 650]];
    for (const [x, y] of spots) {
      graphics.fillStyle(0x193f38).fillCircle(x, y, 48);
      graphics.fillStyle(0x4d8362).fillCircle(x, y - 9, 39);
    }

    this.add.text(56, 50, 'HURRY-GO-ROUND', {
      fontFamily: 'system-ui, sans-serif', fontSize: '26px', color: '#f9e7ae', fontStyle: 'bold',
    });
  }

  private createPlayer(): void {
    const shadow = this.add.ellipse(0, 20, 42, 18, 0x10252a, 0.45);
    const body = this.add.circle(0, 0, 22, 0xf1a65a).setStrokeStyle(4, 0x6e3f36);
    const face = this.add.circle(0, -13, 13, 0xffd6a0);
    const eyes = this.add.text(-7, -22, '••', { fontSize: '12px', color: '#273143' });
    this.player = this.add.container(MAP.width / 2, MAP.height / 2, [shadow, body, face, eyes]);
    this.player.setDepth(5);
  }

  private createInput(): void {
    if (!this.input.keyboard) throw new Error('Keyboard input unavailable');
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys({ up: 'W', down: 'S', left: 'A', right: 'D' }) as typeof this.wasd;

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.touchPointerId !== null) return;
      this.touchPointerId = pointer.id;
      this.updateTouch(pointer);
      this.joystickBase.setVisible(true);
      this.joystickKnob.setVisible(true);
    });
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (pointer.id === this.touchPointerId && pointer.isDown) this.updateTouch(pointer);
    });
    const stopTouch = (pointer: Phaser.Input.Pointer) => {
      if (pointer.id !== this.touchPointerId) return;
      this.touchPointerId = null;
      this.touchDirection = { x: 0, y: 0 };
      this.joystickBase.setVisible(false);
      this.joystickKnob.setVisible(false);
    };
    this.input.on('pointerup', stopTouch);
    this.input.on('pointerupoutside', stopTouch);
  }

  private createOverlay(): void {
    this.hint = this.add.text(0, 0, 'Move: WASD / arrows / drag anywhere', {
      fontFamily: 'system-ui, sans-serif', fontSize: '15px', color: '#ffffff',
      backgroundColor: '#142335cc', padding: { x: 12, y: 8 },
    }).setScrollFactor(0).setDepth(20);
    this.joystickBase = this.add.circle(0, 0, 48, 0xffffff, 0.18).setStrokeStyle(2, 0xffffff, 0.45).setScrollFactor(0).setDepth(20).setVisible(false);
    this.joystickKnob = this.add.circle(0, 0, 22, 0xf9e7ae, 0.75).setScrollFactor(0).setDepth(21).setVisible(false);
  }

  private updateTouch(pointer: Phaser.Input.Pointer): void {
    if (!this.joystickBase) return;
    const origin = pointer.downX === 0 && pointer.downY === 0 ? { x: pointer.x, y: pointer.y } : { x: pointer.downX, y: pointer.downY };
    const deltaX = pointer.x - origin.x;
    const deltaY = pointer.y - origin.y;
    const distance = Math.hypot(deltaX, deltaY);
    const maxRadius = 44;
    const scale = distance > maxRadius ? maxRadius / distance : 1;
    this.joystickBase.setPosition(origin.x, origin.y);
    this.joystickKnob.setPosition(origin.x + deltaX * scale, origin.y + deltaY * scale);
    this.touchDirection = distance < 8 ? { x: 0, y: 0 } : { x: deltaX, y: deltaY };
  }

  private layoutOverlay(): void {
    if (this.hint) this.hint.setPosition(16, this.scale.height - this.hint.height - 16);
  }
}
