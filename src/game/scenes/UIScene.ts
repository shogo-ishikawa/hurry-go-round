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

  constructor() {
    super("ui");
  }

  create(): void {
    this.panels = this.add.graphics();
    this.meters = this.add.graphics();
    const style: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: "system-ui, sans-serif",
      fontSize: "18px",
      color: "#49382e",
      fontStyle: "bold",
    };

    this.carriedText = this.add.text(27, 20, "所持  0 / 12", style);
    this.barnText = this.add.text(27, 52, "倉庫  0", style);
    this.marketText = this.add.text(0, 0, "売り場  0 / 8", style);
    this.tillText = this.add.text(0, 0, "未回収  0", style);
    this.walletText = this.add.text(0, 0, "所持金  0", style);
    this.versionText = this.add.text(0, 0, "v0.3.0", {
      ...style,
      fontSize: "14px",
      color: "#755c49",
    });
    this.tutorial = this.add
      .text(0, 0, "麦畑へ移動しましょう", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "17px",
        color: "#49382e",
        align: "center",
        wordWrap: { width: 330 },
      })
      .setOrigin(0.5);
    this.moveHint = this.add
      .text(
        0,
        0,
        "WASD・矢印・ジョイスティック／クリック・タップ／ドラッグ",
        {
          fontFamily: "system-ui, sans-serif",
          fontSize: "15px",
          color: "#fff4d8",
          backgroundColor: "#49382ed9",
          padding: { x: 12, y: 8 },
        },
      )
      .setOrigin(0.5);
    this.fullBadge = this.add
      .text(0, 0, "満載です — 納品エリアへ", {
        fontFamily: "system-ui, sans-serif",
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
    if (this.moveHint.alpha > 0) {
      this.tweens.add({ targets: this.moveHint, alpha: 0, duration: 600 });
    }
  }

  resetInput(): void {
    this.joystick?.reset();
  }

  private updateState(state: GameState): void {
    this.lastState = state;
    this.carriedText.setText(
      `所持  ${state.inventory.carried} / ${state.inventory.capacity}`,
    );
    this.barnText.setText(`倉庫  ${state.inventory.barn}`);
    this.marketText.setText(
      `売り場  ${state.inventory.market} / ${state.inventory.marketCapacity}`,
    );
    this.tillText.setText(`未回収  ${state.economy.tillCoins}`);
    this.walletText.setText(`所持金  ${state.economy.walletCoins}`);
    this.fullBadge.setAlpha(
      state.inventory.carried >= state.inventory.capacity ? 1 : 0,
    );
    this.drawMeters();
  }

  private drawMeters(): void {
    const count = this.lastState?.inventory.carried ?? 0;
    const capacity = this.lastState?.inventory.capacity ?? 12;
    const layout = calculateInputLayout(this.scale.width, this.scale.height);
    const g = this.meters.clear();
    for (let index = 0; index < capacity; index += 1) {
      const x = layout.inventoryHud.x + 15 + index * 12;
      g.lineStyle(1, palette.outline, 0.5)
        .fillStyle(index < count ? palette.wheat : palette.creamDark, 0.9)
        .fillRoundedRect(x, layout.inventoryHud.y + 64, 9, 7, 2)
        .strokeRoundedRect(x, layout.inventoryHud.y + 64, 9, 7, 2);
    }
  }

  private showFull(): void {
    this.fullBadge.setAlpha(1).setScale(1.12);
    this.tweens.add({
      targets: this.fullBadge,
      scale: 1,
      duration: 220,
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
      "満載です。納品エリアへ向かいましょう",
      "倉庫へ納品中です",
      "倉庫から売り場へ商品が補充されます",
      "お客さんが麦を購入しています",
      "売上回収エリアでコインを受け取りましょう",
      "収穫速度アップの購入エリアに立ちましょう",
      "強化完了。収穫が速くなりました",
    ];
    this.tutorial.setText(messages[Math.min(stage, messages.length - 1)] ?? "");
    if (stage >= 8) {
      this.tweens.add({
        targets: this.tutorial,
        alpha: 0,
        delay: 2000,
        duration: 900,
      });
    }
  }

  private layout(): void {
    const width = this.scale.width;
    const height = this.scale.height;
    const layout = calculateInputLayout(width, height);

    this.panels
      .clear()
      .fillStyle(palette.cream, 0.94)
      .fillRoundedRect(
        layout.inventoryHud.x,
        layout.inventoryHud.y,
        layout.inventoryHud.width,
        layout.inventoryHud.height,
        18,
      )
      .lineStyle(3, palette.creamDark)
      .strokeRoundedRect(
        layout.inventoryHud.x,
        layout.inventoryHud.y,
        layout.inventoryHud.width,
        layout.inventoryHud.height,
        18,
      )
      .fillStyle(palette.cream, 0.94)
      .fillRoundedRect(
        layout.economyHud.x,
        layout.economyHud.y,
        layout.economyHud.width,
        layout.economyHud.height,
        18,
      )
      .lineStyle(3, palette.creamDark)
      .strokeRoundedRect(
        layout.economyHud.x,
        layout.economyHud.y,
        layout.economyHud.width,
        layout.economyHud.height,
        18,
      );

    this.carriedText.setPosition(
      layout.inventoryHud.x + 15,
      layout.inventoryHud.y + 8,
    );
    this.barnText.setPosition(
      layout.inventoryHud.x + 15,
      layout.inventoryHud.y + 36,
    );
    this.marketText.setPosition(layout.economyHud.x + 15, layout.economyHud.y + 8);
    this.tillText.setPosition(layout.economyHud.x + 15, layout.economyHud.y + 37);
    this.walletText.setPosition(layout.economyHud.x + 15, layout.economyHud.y + 66);
    this.versionText.setPosition(width - 60, height - 24);
    this.tutorial
      .setWordWrapWidth(Math.max(100, layout.tutorial.width))
      .setPosition(
        layout.tutorial.x + layout.tutorial.width / 2,
        layout.tutorial.y + 25,
      );
    this.moveHint.setPosition(width / 2, height - 28).setVisible(width >= 900);
    this.fullBadge.setPosition(width / 2, Math.min(135, height * 0.35));
    this.joystick?.layout();
    this.joystick?.setEnabled(true);
    this.drawMeters();
    this.showPortraitNotice();
  }

  private showPortraitNotice(): void {
    if (portraitNoticeShown || this.scale.width >= this.scale.height) return;
    portraitNoticeShown = true;
    const notice = this.add
      .text(this.scale.width / 2, 205, "横向きにすると広く遊べます", {
        fontFamily: "system-ui, sans-serif",
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
