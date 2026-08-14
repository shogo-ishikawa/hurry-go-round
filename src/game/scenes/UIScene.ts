import Phaser from 'phaser';
import { palette } from '../art/palette';
import { VirtualJoystick } from '../input/VirtualJoystick';
import {
  getTutorialCenter,
  isCompactHud,
  isPointOverReservedUi,
  shouldEnableVirtualJoystick,
} from '../input/inputLayout';
import { getCarryCapacityView, type CarryCapacityView } from '../logic/carryCapacity';
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

function toCssColor(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}

export class UIScene extends Phaser.Scene {
  private carriedText!: Phaser.GameObjects.Text;
  private capacityStatusText!: Phaser.GameObjects.Text;
  private barnText!: Phaser.GameObjects.Text;
  private tutorial!: Phaser.GameObjects.Text;
  private panel!: Phaser.GameObjects.Graphics;
  private capacityMeter!: Phaser.GameObjects.Graphics;
  private joystick!: VirtualJoystick;
  private moveHint!: Phaser.GameObjects.Text;
  private fullBadge!: Phaser.GameObjects.Text;
  private versionText!: Phaser.GameObjects.Text;
  private pointerGesture: PointerGesture | null = null;
  private joystickEnabled = false;
  private compactHud = false;
  private hudPanelWidth = 300;
  private hudPanelHeight = 108;
  private carried = 0;
  private capacity = 12;
  private barnStored = 0;

  constructor() {
    super('ui');
  }

  create(): void {
    this.panel = this.add.graphics();
    this.capacityMeter = this.add.graphics();
    const style: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: 'system-ui',
      fontSize: '20px',
      color: '#49382e',
      fontStyle: 'bold',
    };

    this.carriedText = this.add.text(28, 22, 'PACK  0 / 12', style);
    this.capacityStatusText = this.add.text(0, 24, '12 LEFT', {
      ...style,
      fontSize: '14px',
      color: '#755c49',
    }).setOrigin(1, 0);
    this.barnText = this.add.text(28, 78, 'BARN  0 WHEAT', {
      ...style,
      fontSize: '16px',
      color: '#755c49',
    });
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
    this.fullBadge = this.add.text(0, 0, 'PACK FULL — DELIVER TO BARN', {
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
    this.carried = state.inventory.carried;
    this.capacity = state.inventory.capacity;
    this.barnStored = state.inventory.barn;
    this.refreshInventoryHud();
  }

  private refreshInventoryHud(): void {
    const view = getCarryCapacityView(this.carried, this.capacity);
    const emphasisColor = view.level === 'full'
      ? palette.barn
      : view.level === 'near-full'
        ? palette.soilDark
        : palette.outline;

    this.carriedText
      .setText(`PACK  ${view.carried} / ${view.capacity}`)
      .setColor(toCssColor(emphasisColor));
    this.capacityStatusText
      .setText(view.level === 'full' ? 'FULL' : `${view.remaining} LEFT`)
      .setColor(toCssColor(emphasisColor));
    this.barnText.setText(`BARN  ${this.barnStored} WHEAT`);

    if (view.level === 'full') {
      this.fullBadge.setAlpha(1);
    } else {
      this.tweens.killTweensOf(this.fullBadge);
      this.fullBadge.setAlpha(0).setScale(1);
      this.carriedText.setScale(1);
      this.capacityStatusText.setScale(1);
    }

    this.drawInventoryPanel(view);
  }

  private drawInventoryPanel(view: CarryCapacityView): void {
    const panelBorder = view.level === 'full'
      ? palette.barn
      : view.level === 'near-full'
        ? palette.wheat
        : palette.creamDark;
    const accent = view.level === 'full'
      ? palette.barn
      : view.level === 'near-full'
        ? palette.wheat
        : palette.teal;

    this.panel.clear()
      .fillStyle(palette.cream, 0.95)
      .fillRoundedRect(14, 14, this.hudPanelWidth, this.hudPanelHeight, 18)
      .lineStyle(3, panelBorder)
      .strokeRoundedRect(14, 14, this.hudPanelWidth, this.hudPanelHeight, 18)
      .fillStyle(accent, 0.95)
      .fillRoundedRect(14, 14, this.hudPanelWidth, 7, 5);

    const slotCount = Math.max(1, Math.min(view.capacity, 12));
    const filledSlots = view.capacity <= 12
      ? Math.min(view.carried, slotCount)
      : Math.round(view.ratio * slotCount);
    const columns = this.compactHud ? 6 : 12;
    const slotWidth = this.compactHud ? 25 : 18;
    const slotHeight = 15;
    const gapX = this.compactHud ? 5 : 4;
    const gapY = 5;
    const startX = 28;
    const startY = 52;

    this.capacityMeter.clear();
    for (let index = 0; index < slotCount; index += 1) {
      const row = Math.floor(index / columns);
      const column = index % columns;
      const x = startX + column * (slotWidth + gapX);
      const y = startY + row * (slotHeight + gapY);
      const filled = index < filledSlots;
      const borderColor = view.level === 'full'
        ? palette.barn
        : view.level === 'near-full' && !filled
          ? palette.barnDark
          : palette.outline;

      this.capacityMeter
        .fillStyle(filled ? palette.wheatLight : palette.creamDark, filled ? 1 : 0.52)
        .fillRoundedRect(x, y, slotWidth, slotHeight, 4)
        .lineStyle(1.5, borderColor, filled ? 0.9 : 0.45)
        .strokeRoundedRect(x, y, slotWidth, slotHeight, 4);

      if (filled) {
        const centerX = x + slotWidth / 2;
        this.capacityMeter
          .lineStyle(1.4, palette.soilDark, 0.78)
          .lineBetween(centerX, y + 3, centerX, y + slotHeight - 3)
          .lineBetween(centerX, y + 6, centerX - 3, y + 4)
          .lineBetween(centerX, y + 8, centerX + 3, y + 6);
      }
    }
  }

  private showFull(): void {
    this.tweens.killTweensOf(this.fullBadge);
    this.fullBadge.setAlpha(1).setScale(1);
    this.tweens.add({
      targets: this.fullBadge,
      scale: 1.1,
      duration: 180,
      yoyo: true,
      repeat: 1,
    });
    this.tweens.add({
      targets: [this.carriedText, this.capacityStatusText],
      scale: 1.1,
      yoyo: true,
      duration: 170,
    });
  }

  private updateTutorial(stage: number): void {
    const messages = [
      'Follow the golden path to the wheat',
      'Wheat appears on your back and fills the pack meter',
      'Your pack is nearly full — head to the red barn',
      'Delivery complete — your pack has space again!',
    ];
    this.tutorial.setText(messages[Math.min(stage, messages.length - 1)] ?? '');
    if (stage >= 3) {
      this.tweens.add({ targets: this.tutorial, alpha: 0, delay: 1800, duration: 900 });
    }
  }

  private layout(): void {
    const width = this.scale.width;
    const height = this.scale.height;
    const viewport = { width, height };

    this.compactHud = isCompactHud(width);
    this.hudPanelWidth = this.compactHud ? 220 : 300;
    this.hudPanelHeight = this.compactHud ? 128 : 108;

    this.carriedText
      .setPosition(28, 22)
      .setFontSize(this.compactHud ? 18 : 20);
    this.capacityStatusText
      .setPosition(14 + this.hudPanelWidth - 18, 24)
      .setFontSize(this.compactHud ? 13 : 14);
    this.barnText
      .setPosition(28, this.compactHud ? 101 : 78)
      .setFontSize(this.compactHud ? 15 : 16);
    this.versionText.setPosition(width - 72, 20);

    const tutorialCenter = getTutorialCenter(viewport);
    this.tutorial.setPosition(tutorialCenter.x, tutorialCenter.y);
    this.moveHint
      .setPosition(width / 2, height - 35)
      .setFontSize(this.compactHud ? 14 : 16);
    this.fullBadge.setPosition(
      width / 2,
      this.compactHud ? this.hudPanelHeight + 108 : Math.min(112, height * 0.25),
    );

    this.joystickEnabled = shouldEnableVirtualJoystick(width, navigator.maxTouchPoints);
    this.joystick?.layout();
    this.joystick?.setEnabled(this.joystickEnabled);
    const touchLike = navigator.maxTouchPoints > 0 || width < 900;
    this.moveHint.setText(
      touchLike
        ? 'Joystick • Tap or drag the farm to move'
        : 'Joystick / WASD / arrows • Click or drag',
    );

    this.refreshInventoryHud();
    this.cancelPointerGesture();
    this.showPortraitNotice();
  }

  private showPortraitNotice(): void {
    if (portraitNoticeShown || this.scale.width >= this.scale.height) return;
    portraitNoticeShown = true;
    const noticeY = this.compactHud ? this.hudPanelHeight + 118 : 102;
    const notice = this.add.text(this.scale.width / 2, noticeY, 'Landscape gives you a wider view', {
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
