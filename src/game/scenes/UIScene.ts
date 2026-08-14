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

interface PointerGesture {
  pointerId: number;
  startX: number;
  startY: number;
  startedAt: number;
  dragging: boolean;
  lastEmitAt: number;
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
  private pointerGesture: PointerGesture | null = null;
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
    this.moveHint = this.add.text(0, 0, 'Hold the joystick or keys • Click, tap, or drag the farm', {
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
    this.input.on('pointerdown', this.beginPointerGesture, this);
    this.input.on('pointermove', this.updatePointerGesture, this);
    this.input.on('pointerup', this.finishPointerGesture, this);
    this.input.on('pointerupoutside', this.cancelPointerGesture, this);
    this.input.on('gameout', this.cancelPointerGesture, this);
    this.scale.on(Phaser.Scale.Events.RESIZE, this.layout, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);

    this.layout();
    this.showPortraitNotice();
  }

  resetInput(): void {
    this.pointerGesture = null;
    this.joystick?.reset();
  }

  private handleJoystickDirection = (direction: Point): void => {
    this.game.events.emit(GAME_EVENTS.direction, direction);
  };

  private beginPointerGesture(pointer: Phaser.Input.Pointer): void {
    const point = { x: pointer.x, y: pointer.y };
    if (this.isReserved(point)) {
      this.pointerGesture = null;
      return;
    }

    this.pointerGesture = {
      pointerId: pointer.id,
      startX: pointer.x,
      startY: pointer.y,
      startedAt: this.time.now,
      dragging: false,
      lastEmitAt: 0,
    };
  }

  private updatePointerGesture(pointer: Phaser.Input.Pointer): void {
    const gesture = this.pointerGesture;
    if (!gesture || gesture.pointerId !== pointer.id || !pointer.isDown) return;

    const travel = Math.hypot(pointer.x - gesture.startX, pointer.y - gesture.startY);
    if (!gesture.dragging && travel < 14) return;
    gesture.dragging = true;

    const point = { x: pointer.x, y: pointer.y };
    if (this.isReserved(point)) return;
    if (this.time.now - gesture.lastEmitAt < 45) return;

    gesture.lastEmitAt = this.time.now;
    this.game.events.emit(GAME_EVENTS.moveTarget, point);
  }

  private finishPointerGesture(pointer: Phaser.Input.Pointer): void {
    const gesture = this.pointerGesture;
    this.pointerGesture = null;
    if (!gesture || gesture.pointerId !== pointer.id) return;

    const point = { x: pointer.x, y: pointer.y };
    if (this.isReserved(point)) return;

    if (gesture.dragging) {
      this.game.events.emit(GAME_EVENTS.moveTarget, point);
      return;
    }

    const travel = Math.hypot(pointer.x - gesture.startX, pointer.y - gesture.startY);
    const duration = this.time.now - gesture.startedAt;
    if (travel <= 16 && duration <= 700) {
      this.game.events.emit(GAME_EVENTS.moveTarget, point);
    }
  }

  private cancelPointerGesture(): void {
    this.pointerGesture = null;
  }

  private isReserved(point: Point): boolean {
    return isPointOverReservedUi(
      point,
      { width: this.scale.width, height: this.scale.height },
      this.joystickEnabled,
    );
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
    const touchLike = navigator.maxTouchPoints > 0 || width < 900;
    this.moveHint.setText(
      touchLike
        ? 'Hold the joystick • Tap or drag the farm to move'
        : 'Hold joystick / WASD / arrows • Click or drag the farm',
    );
    this.cancelPointerGesture();
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
    this.input.off('pointerdown', this.beginPointerGesture, this);
    this.input.off('pointermove', this.updatePointerGesture, this);
    this.input.off('pointerup', this.finishPointerGesture, this);
    this.input.off('pointerupoutside', this.cancelPointerGesture, this);
    this.input.off('gameout', this.cancelPointerGesture, this);
    this.scale.off(Phaser.Scale.Events.RESIZE, this.layout, this);
  }
}
