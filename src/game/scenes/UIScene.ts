import Phaser from "phaser";
import { palette } from "../art/palette";
import { VirtualJoystick } from "../input/VirtualJoystick";
import { calculateInputLayout } from "../input/inputLayout";
import { GAME_EVENTS, type GameState } from "../state/GameState";
import type { Point } from "../logic/movement";
let portraitNoticeShown = false;
export class UIScene extends Phaser.Scene {
  private carriedText!: Phaser.GameObjects.Text;
  private barnText!: Phaser.GameObjects.Text;
  private marketText!: Phaser.GameObjects.Text;
  private tillText!: Phaser.GameObjects.Text;
  private walletText!: Phaser.GameObjects.Text;
  private tutorial!: Phaser.GameObjects.Text;
  private panels!: Phaser.GameObjects.Graphics;
  private meters!: Phaser.GameObjects.Graphics;
  private joystick!: VirtualJoystick;
  private moveHint!: Phaser.GameObjects.Text;
  private fullBadge!: Phaser.GameObjects.Text;
  private versionText!: Phaser.GameObjects.Text;
  private lastState?: GameState;
  private automationTitle!: Phaser.GameObjects.Text;
  private crateText!: Phaser.GameObjects.Text;
  private harvestWorkerText!: Phaser.GameObjects.Text;
  private transportWorkerText!: Phaser.GameObjects.Text;
  constructor() {
    super("ui");
  }
  create(): void {
    this.panels = this.add.graphics();
    this.meters = this.add.graphics();
    const style: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: "system-ui",
      fontSize: "18px",
      color: "#49382e",
      fontStyle: "bold",
    };
    this.carriedText = this.add.text(27, 20, "背負い籠  0 / 12", style);
    this.barnText = this.add.text(27, 52, "倉庫  0", style);
    this.marketText = this.add.text(0, 0, "市場  0 / 8", style);
    this.tillText = this.add.text(0, 0, "売上  0", style);
    this.walletText = this.add.text(0, 0, "コイン  0", style);
    this.versionText = this.add.text(0, 0, "v0.4.0", {
      ...style,
      fontSize: "14px",
      color: "#755c49",
    });
    this.automationTitle = this.add.text(0, 0, "自動化", style);
    this.crateText = this.add.text(0, 0, "集荷箱  0 / 16", style);
    this.harvestWorkerText = this.add.text(0, 0, "収穫スタッフ  未雇用", style);
    this.transportWorkerText = this.add.text(
      0,
      0,
      "運搬スタッフ  未雇用",
      style,
    );
    this.tutorial = this.add
      .text(0, 0, "麦畑へ移動しましょう", {
        fontFamily: "system-ui",
        fontSize: "17px",
        color: "#49382e",
        align: "center",
        wordWrap: { width: 330 },
      })
      .setOrigin(0.5);
    this.moveHint = this.add
      .text(0, 0, "WASD・矢印・スティック・タップで移動", {
        fontFamily: "system-ui",
        fontSize: "15px",
        color: "#fff4d8",
        backgroundColor: "#49382ed9",
        padding: { x: 12, y: 8 },
      })
      .setOrigin(0.5);
    this.fullBadge = this.add
      .text(0, 0, "背負い籠が満杯です　倉庫へ納品", {
        fontFamily: "system-ui",
        fontSize: "18px",
        fontStyle: "bold",
        color: "#fff4d8",
        backgroundColor: "#b9573fee",
        padding: { x: 14, y: 9 },
      })
      .setOrigin(0.5)
      .setAlpha(0);
    this.joystick = new VirtualJoystick(this);
    this.game.events.on(GAME_EVENTS.state, this.updateState, this);
    this.game.events.on(GAME_EVENTS.full, this.showFull, this);
    this.game.events.on(GAME_EVENTS.tutorial, this.updateTutorial, this);
    this.game.events.on(GAME_EVENTS.wallet, this.pulseWallet, this);
    this.scale.on(Phaser.Scale.Events.RESIZE, this.layout, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
    this.layout();
    this.showPortraitNotice();
  }
  getDirection(): Point {
    return this.joystick?.direction ?? { x: 0, y: 0 };
  }
  fadeMoveHint(): void {
    if (this.moveHint.alpha > 0)
      this.tweens.add({ targets: this.moveHint, alpha: 0, duration: 600 });
  }
  resetInput(): void {
    this.joystick?.reset();
  }
  private updateState(state: GameState): void {
    this.lastState = state;
    this.carriedText.setText(
      `背負い籠  ${state.inventory.carried} / ${state.inventory.capacity}`,
    );
    this.barnText.setText(`倉庫  ${state.inventory.barn}`);
    this.marketText.setText(
      `市場  ${state.inventory.market} / ${state.inventory.marketCapacity}`,
    );
    this.tillText.setText(`売上  ${state.economy.tillCoins}`);
    this.walletText.setText(`コイン  ${state.economy.walletCoins}`);
    const compact = this.scale.width < 520;
    this.crateText.setText(
      `${compact ? "集荷" : "集荷箱"}  ${state.inventory.fieldCrate}/${state.inventory.fieldCrateCapacity}`,
    );
    this.harvestWorkerText.setText(
      `${compact ? "収穫" : "収穫スタッフ"}  ${state.workers.harvestWorker.status}`,
    );
    this.transportWorkerText.setText(
      `${compact ? "運搬" : "運搬スタッフ"}  ${state.workers.transportWorker.status}`,
    );
    this.drawMeters();
  }
  private drawMeters(): void {
    const count = this.lastState?.inventory.carried ?? 0;
    const layout = calculateInputLayout(this.scale.width, this.scale.height);
    const g = this.meters.clear();
    for (let i = 0; i < 12; i++) {
      const x = layout.inventoryHud.x + 15 + i * 12;
      g.lineStyle(1, palette.outline, 0.5)
        .fillStyle(i < count ? palette.wheat : palette.creamDark, 0.9)
        .fillRoundedRect(x, layout.inventoryHud.y + 64, 9, 7, 2)
        .strokeRoundedRect(x, layout.inventoryHud.y + 64, 9, 7, 2);
    }
  }
  private showFull(): void {
    this.fullBadge.setAlpha(1).setScale(1.12);
    this.tweens.add({
      targets: this.fullBadge,
      alpha: 0,
      scale: 1,
      delay: 900,
      duration: 500,
    });
  }
  private pulseWallet(): void {
    this.tweens.add({
      targets: this.walletText,
      scale: 1.18,
      yoyo: true,
      duration: 100,
    });
  }
  private updateTutorial(stage: number): void {
    const messages = [
      "麦畑へ移動しましょう",
      "麦を収穫して背負い籠を満たしましょう",
      "倉庫へ納品しましょう",
      "納品を続けましょう",
      "市場の棚に麦が並びます",
      "お客さんが麦を購入します",
      "売上台からコインを受け取りましょう",
      "収穫速度の台に立ちましょう",
      "収穫が速くなりました",
      "40コインで収穫スタッフを雇えます",
      "収穫スタッフが麦を集荷箱へ運びます",
      "集荷箱の受取エリアから自分で麦を運べます",
      "さらにコインを貯めて運搬スタッフを雇いましょう",
      "運搬スタッフが集荷箱から倉庫へ運びます",
      "畑から倉庫まで自動化されました",
    ];
    this.tutorial.setText(messages[Math.min(stage, messages.length - 1)] ?? "");
    if (stage >= 14)
      this.tweens.add({
        targets: this.tutorial,
        alpha: 0,
        delay: 2000,
        duration: 900,
      });
  }
  private layout(): void {
    const w = this.scale.width,
      h = this.scale.height,
      l = calculateInputLayout(w, h);
    this.panels
      .clear()
      .fillStyle(palette.cream, 0.94)
      .fillRoundedRect(
        l.inventoryHud.x,
        l.inventoryHud.y,
        l.inventoryHud.width,
        l.inventoryHud.height,
        18,
      )
      .lineStyle(3, palette.creamDark)
      .strokeRoundedRect(
        l.inventoryHud.x,
        l.inventoryHud.y,
        l.inventoryHud.width,
        l.inventoryHud.height,
        18,
      )
      .fillStyle(palette.cream, 0.94)
      .fillRoundedRect(
        l.economyHud.x,
        l.economyHud.y,
        l.economyHud.width,
        l.economyHud.height,
        18,
      )
      .lineStyle(3, palette.creamDark)
      .strokeRoundedRect(
        l.economyHud.x,
        l.economyHud.y,
        l.economyHud.width,
        l.economyHud.height,
        18,
      );
    this.panels
      .fillStyle(palette.cream, 0.94)
      .fillRoundedRect(
        l.automationHud.x,
        l.automationHud.y,
        l.automationHud.width,
        l.automationHud.height,
        18,
      )
      .lineStyle(3, palette.creamDark)
      .strokeRoundedRect(
        l.automationHud.x,
        l.automationHud.y,
        l.automationHud.width,
        l.automationHud.height,
        18,
      );
    this.carriedText.setPosition(l.inventoryHud.x + 15, l.inventoryHud.y + 8);
    this.barnText.setPosition(l.inventoryHud.x + 15, l.inventoryHud.y + 36);
    this.marketText.setPosition(l.economyHud.x + 15, l.economyHud.y + 8);
    this.tillText.setPosition(l.economyHud.x + 15, l.economyHud.y + 37);
    this.walletText.setPosition(l.economyHud.x + 15, l.economyHud.y + 66);
    this.automationTitle.setPosition(
      l.automationHud.x + 14,
      l.automationHud.y + 7,
    );
    this.crateText.setPosition(l.automationHud.x + 14, l.automationHud.y + 34);
    this.harvestWorkerText
      .setPosition(l.automationHud.x + 14, l.automationHud.y + 58)
      .setFontSize(w < 520 ? 14 : 16);
    this.transportWorkerText
      .setPosition(l.automationHud.x + 14, l.automationHud.y + 81)
      .setFontSize(w < 520 ? 14 : 16);
    this.versionText.setPosition(w - 60, h - 24);
    this.tutorial
      .setWordWrapWidth(Math.max(100, l.tutorial.width))
      .setPosition(l.tutorial.x + l.tutorial.width / 2, l.tutorial.y + 25);
    this.moveHint.setPosition(w / 2, h - 28).setVisible(w >= 900);
    this.fullBadge.setPosition(w / 2, Math.min(135, h * 0.35));
    this.joystick?.layout();
    this.joystick?.setEnabled(true);
    this.drawMeters();
    this.showPortraitNotice();
  }
  private showPortraitNotice(): void {
    if (portraitNoticeShown || this.scale.width >= this.scale.height) return;
    portraitNoticeShown = true;
    const notice = this.add
      .text(this.scale.width / 2, 205, "横向きにすると広く見渡せます", {
        fontFamily: "system-ui",
        fontSize: "14px",
        color: "#49382e",
        backgroundColor: "#fff4d8e8",
        padding: { x: 10, y: 6 },
      })
      .setOrigin(0.5);
    this.tweens.add({
      targets: notice,
      alpha: 0,
      delay: 3000,
      duration: 700,
      onComplete: () => notice.destroy(),
    });
  }
  private cleanup(): void {
    this.game.events.off(GAME_EVENTS.state, this.updateState, this);
    this.game.events.off(GAME_EVENTS.full, this.showFull, this);
    this.game.events.off(GAME_EVENTS.tutorial, this.updateTutorial, this);
    this.game.events.off(GAME_EVENTS.wallet, this.pulseWallet, this);
    this.scale.off(Phaser.Scale.Events.RESIZE, this.layout, this);
  }
}
