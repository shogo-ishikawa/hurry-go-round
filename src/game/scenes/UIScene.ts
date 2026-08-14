import Phaser from 'phaser';
import { palette } from '../art/palette';
import { VirtualJoystick } from '../input/VirtualJoystick';
import {
  isPointOverReservedUi,
  shouldEnableVirtualJoystick,
} from '../input/inputLayout';
import type { Point } from '../logic/movement';
import { GAME_EVENTS, type GameState } from '../state/GameState';

let portraitNoticeShown = false;

interface TapStart {
  pointerId: number;
  x: number;
  y: number;
  startedAt: number;
}

export class UIScene extends Phaser.Scene {
  private carriedText!: Phaser.GameObjects.Text;
  private barnText!: Phaser.GameObjects.Text;
  private tutorial!: Phaser.GameObjects.Text;
  private panel!: Phaser.GameObjects.Graphics;
  private joystick!: VirtualJoystick;
  private moveHint!: Phaser.GameObjects.Text;
  private fullBadge!: Phaser.GameObjects.Text;
  private versionText!: Phaser.GameObjects.Text;
  private tapStart: TapStart | null = null;
  private joystickEnabled = false;

  constructor() {
    super('ui');
  }

  create(): void {
    this.panel = this.add.graphics();
    const style: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: 'system-ui',
      fontSize: '20px',
      color: '#49382e',
      fontStyle: 'bold',
    };

    this.carriedText = this.add.text(28, 22, 'Carried  0 / 12', style);
    this.barnText = this.add.text(28, 54, 'Barn  0', style);
    this.versionText = this.add.text(0, 0, 'v0.2.0', {
      ...style,
      fontSize: '15px',
      color: '#755c49',
    });
    this.tutorial = this.add.text(0, 0, 'Follow the golden path to the wheat', {
      fontFamily: 'system-ui',
      fontSize: '18px',
      color: '#49382e',
      align: 'center',
      wordWrap: { width: 340 },
    }).setOrigin(0.5);
    this.moveHint = this.add.text(0, 0, 'Hold WASD / arrows • Click the farm to move', {
      fontFamily: 'system-ui',
      fontSize: '16px',
      color: '#fff4d8',
      backgroundColor: '#49382ed9',
      padding: { x: 14, y: 9 },
    }).setOrigin(0.5);
    this.fullBadge = this.add.text(0, 0, 'FULL — DELIVER TO BARN', {
      fontFamily: 'system-ui',
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#fff4d8',
      backgroundColor: '#b9573fee',
      padding: { x: 16, y: 10 },
    }).setOrigin(0.5).setAlpha(0);

    this.joystick = new VirtualJoystick(this, this.handleJoystickDirection);

    this.game.events.on(GAME_EVENTS.state, this.updateState, this);
    this.game.events.on(GAME_EVENTS.full, this.showFull, this);
    this.game.events.on(GAME_EVENTS.tutorial, this.updateTutorial, this);
    this.game.events.on(GAME_EVENTS.playerMoved, this.fadeMoveHint, this);
    this.input.on('pointerdown', this.beginTap, this);
    this.input.on('pointerup', this.finishTap, this);
    this.input.on('pointerupoutside', this.cancelTap, this);
    this.input.on('gameout', this.cancelTap, this);
    this.scale.on(Phaser.Scale.Events.RESIZE, this.layout, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);

    this.layout();
    this.showPortraitNotice();
  }

  resetInput(): void {
    this.tapStart = null;
    this.joystick?.reset();
  }

  private handleJoystickDirection = (direction: Point): void => {
    this.game.events.emit(GAME_EVENTS.direction, direction);
  };

  private beginTap(pointer: Phaser.Input.Pointer): void {
    const point = { x: pointer.x, y: pointer.y };
    const viewport = { width: this.scale.width, height: this.scale.height };
    if (isPointOverReservedUi(point, viewport, this.joystickEnabled)) {
      this.tapStart = null;
      return;
    }

    this.tapStart = {
      pointerId: pointer.id,
      x: pointer.x,
      y: pointer.y,
      startedAt: this.time.now,
    };
  }

  private finishTap(pointer: Phaser.Input.Pointer): void {
    const start = this.tapStart;
    this.tapStart = null;
    if (!start || start.pointerId !== pointer.id) return;

    const travel = Math.hypot(pointer.x - start.x, pointer.y - start.y);
    const duration = this.time.now - start.startedAt;
    if (travel > 16 || duration > 650) return;

    const point = { x: pointer.x, y: pointer.y };
    const viewport = { width: this.scale.width, height: this.scale.height };
    if (isPointOverReservedUi(point, viewport, this.joystickEnabled)) return;

    this.game.events.emit(GAME_EVENTS.moveTarget, point);
  }

  private cancelTap(): void {
    this.tapStart = null;
  }

  private fadeMoveHint(): void {
    if (this.moveHint.alpha <= 0) return;
    this.tweens.add({ targets: this.moveHint, alpha: 0, duration: 600 });
  }

  private updateState(state: GameState): void {
    this.carriedText.setText(`Carried  ${state.inventory.carried} / ${state.inventory.capacity}`);
    this.barnText.setText(`Barn  ${state.inventory.barn}`);
  }

  private showFull(): void {
    this.fullBadge.setAlpha(1).setScale(1.12);
    this.tweens.add({ targets: this.fullBadge, alpha: 0, scale: 1, delay: 900, duration: 500 });
    this.tweens.add({ targets: this.carriedText, scale: 1.16, yoyo: true, duration: 170 });
  }

  private updateTutorial(stage: number): void {
    const messages = [
      'Follow the golden path to the wheat',
      'Wheat stacks on your pack automatically',
      'Your pack is filling — head to the red barn',
      'Delivery complete — keep the round going!',
    ];
    this.tutorial.setText(messages[Math.min(stage, messages.length - 1)] ?? '');
    if (stage >= 3) {
      this.tweens.add({ targets: this.tutorial, alpha: 0, delay: 1800, duration: 900 });
    }
  }

  private layout(): void {
    const width = this.scale.width;
    const height = this.scale.height;

    this.panel.clear()
      .fillStyle(palette.cream, 0.94)
      .fillRoundedRect(14, 14, 225, 77, 18)
      .lineStyle(3, palette.creamDark)
      .strokeRoundedRect(14, 14, 225, 77, 18);
    this.versionText.setPosition(width - 72, 20);
    this.tutorial.setPosition(width / 2, 42);
    this.moveHint.setPosition(width / 2, height - 35);
    this.fullBadge.setPosition(width / 2, Math.min(112, height * 0.25));

    this.joystickEnabled = shouldEnableVirtualJoystick(width, navigator.maxTouchPoints);
    this.joystick?.layout();
    this.joystick?.setEnabled(this.joystickEnabled);
    this.moveHint.setText(
      this.joystickEnabled
        ? 'Hold the joystick • Tap the farm to move'
        : 'Hold WASD / arrows • Click the farm to move',
    );
    this.cancelTap();
    this.showPortraitNotice();
  }

  private showPortraitNotice(): void {
    if (portraitNoticeShown || this.scale.width >= this.scale.height) return;
    portraitNoticeShown = true;
    const notice = this.add.text(this.scale.width / 2, 102, 'Landscape gives you a wider view', {
      fontFamily: 'system-ui',
      fontSize: '15px',
      color: '#49382e',
      backgroundColor: '#fff4d8e8',
      padding: { x: 12, y: 7 },
    }).setOrigin(0.5);
    this.tweens.add({
      targets: notice,
      alpha: 0,
      delay: 3200,
      duration: 700,
      onComplete: () => notice.destroy(),
    });
  }

  private cleanup(): void {
    this.game.events.off(GAME_EVENTS.state, this.updateState, this);
    this.game.events.off(GAME_EVENTS.full, this.showFull, this);
    this.game.events.off(GAME_EVENTS.tutorial, this.updateTutorial, this);
    this.game.events.off(GAME_EVENTS.playerMoved, this.fadeMoveHint, this);
    this.input.off('pointerdown', this.beginTap, this);
    this.input.off('pointerup', this.finishTap, this);
    this.input.off('pointerupoutside', this.cancelTap, this);
    this.input.off('gameout', this.cancelTap, this);
    this.scale.off(Phaser.Scale.Events.RESIZE, this.layout, this);
  }
}
