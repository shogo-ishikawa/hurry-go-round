import Phaser from 'phaser';
import { palette } from '../art/palette';
import { VirtualJoystick } from '../input/VirtualJoystick';
import { GAME_EVENTS, type GameState } from '../state/GameState';
import type { Point } from '../logic/movement';

let portraitNoticeShown = false;
export class UIScene extends Phaser.Scene {
  private carriedText!: Phaser.GameObjects.Text;
  private barnText!: Phaser.GameObjects.Text;
  private tutorial!: Phaser.GameObjects.Text;
  private panel!: Phaser.GameObjects.Graphics;
  private joystick!: VirtualJoystick;
  private moveHint!: Phaser.GameObjects.Text;
  private fullBadge!: Phaser.GameObjects.Text;
  private versionText!: Phaser.GameObjects.Text;
  constructor() { super('ui'); }
  create(): void {
    this.panel = this.add.graphics();
    const style: Phaser.Types.GameObjects.Text.TextStyle = { fontFamily: 'system-ui', fontSize: '20px', color: '#49382e', fontStyle: 'bold' };
    this.carriedText = this.add.text(28, 22, 'Carried  0 / 12', style).setInteractive();
    this.barnText = this.add.text(28, 54, 'Barn  0', style).setInteractive();
    this.versionText = this.add.text(0, 0, 'v0.2.0', { ...style, fontSize: '15px', color: '#755c49' });
    this.tutorial = this.add.text(0, 0, 'Follow the golden path to the wheat', { fontFamily: 'system-ui', fontSize: '18px', color: '#49382e', align: 'center', wordWrap: { width: 340 } }).setOrigin(0.5).setInteractive();
    this.moveHint = this.add.text(0, 0, 'Move with WASD or arrow keys', { fontFamily: 'system-ui', fontSize: '16px', color: '#fff4d8', backgroundColor: '#49382ed9', padding: { x: 14, y: 9 } }).setOrigin(0.5);
    this.fullBadge = this.add.text(0, 0, 'FULL — DELIVER TO BARN', { fontFamily: 'system-ui', fontSize: '20px', fontStyle: 'bold', color: '#fff4d8', backgroundColor: '#b9573fee', padding: { x: 16, y: 10 } }).setOrigin(0.5).setAlpha(0);
    this.joystick = new VirtualJoystick(this);
    this.game.events.on(GAME_EVENTS.state, this.updateState, this);
    this.game.events.on(GAME_EVENTS.full, this.showFull, this);
    this.game.events.on(GAME_EVENTS.tutorial, this.updateTutorial, this);
    this.scale.on(Phaser.Scale.Events.RESIZE, this.layout, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
    this.layout(); this.showPortraitNotice();
  }
  getDirection(): Point { return this.joystick?.direction ?? { x: 0, y: 0 }; }
  fadeMoveHint(): void { if (this.moveHint.alpha > 0) this.tweens.add({ targets: this.moveHint, alpha: 0, duration: 600 }); }
  resetInput(): void { this.joystick?.reset(); }
  private updateState(state: GameState): void { this.carriedText.setText(`Carried  ${state.inventory.carried} / ${state.inventory.capacity}`); this.barnText.setText(`Barn  ${state.inventory.barn}`); }
  private showFull(): void { this.fullBadge.setAlpha(1).setScale(1.12); this.tweens.add({ targets: this.fullBadge, alpha: 0, scale: 1, delay: 900, duration: 500 }); this.tweens.add({ targets: this.carriedText, scale: 1.16, yoyo: true, duration: 170 }); }
  private updateTutorial(stage: number): void {
    const messages = ['Follow the golden path to the wheat', 'Wheat stacks on your pack automatically', 'Your pack is filling — head to the red barn', 'Delivery complete — keep the round going!'];
    this.tutorial.setText(messages[Math.min(stage, messages.length - 1)] ?? '');
    if (stage >= 3) this.tweens.add({ targets: this.tutorial, alpha: 0, delay: 1800, duration: 900 });
  }
  private layout(): void {
    const w = this.scale.width; const h = this.scale.height;
    this.panel.clear().fillStyle(palette.cream, 0.94).fillRoundedRect(14, 14, 225, 77, 18).lineStyle(3, palette.creamDark).strokeRoundedRect(14, 14, 225, 77, 18);
    this.versionText.setPosition(w - 72, 20);
    this.tutorial.setPosition(w / 2, 42);
    this.moveHint.setPosition(w / 2, h - 35);
    this.fullBadge.setPosition(w / 2, Math.min(112, h * 0.25));
    this.joystick?.layout();
    this.joystick?.setEnabled(navigator.maxTouchPoints > 0 || w < 900);
    this.showPortraitNotice();
  }
  private showPortraitNotice(): void {
    if (portraitNoticeShown || this.scale.width >= this.scale.height) return;
    portraitNoticeShown = true;
    const notice = this.add.text(this.scale.width / 2, 102, 'Landscape gives you a wider view', { fontFamily: 'system-ui', fontSize: '15px', color: '#49382e', backgroundColor: '#fff4d8e8', padding: { x: 12, y: 7 } }).setOrigin(0.5);
    this.tweens.add({ targets: notice, alpha: 0, delay: 3200, duration: 700, onComplete: () => notice.destroy() });
  }
  private cleanup(): void { this.game.events.off(GAME_EVENTS.state, this.updateState, this); this.game.events.off(GAME_EVENTS.full, this.showFull, this); this.game.events.off(GAME_EVENTS.tutorial, this.updateTutorial, this); this.scale.off(Phaser.Scale.Events.RESIZE, this.layout, this); }
}
