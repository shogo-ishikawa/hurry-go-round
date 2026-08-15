import Phaser from "phaser";
import { palette } from "../art/palette";
import { VirtualJoystick } from "../input/VirtualJoystick";
import { calculateInputLayout } from "../input/inputLayout";
import { GAME_EVENTS, type GameState } from "../state/GameState";
import type { Point } from "../logic/movement";
import { palette as colors } from "../art/palette";
import { getCarriedTotal } from "../logic/resources";
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
  private livestockText!: Phaser.GameObjects.Text;
  private contextHint!: Phaser.GameObjects.Text;
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
    this.carriedText = this.add.text(27, 20, "背負い籠\n空", style);
    this.barnText = this.add.text(27, 52, "倉庫\n麦 0", style);
    this.marketText = this.add.text(0, 0, "売り場\n麦 0 / 8", style);
    this.tillText = this.add.text(0, 0, "売上  0", style);
    this.walletText = this.add.text(0, 0, "コイン  0", style);
    this.versionText = this.add.text(0, 0, "v0.6.0", {
      ...style,
      fontSize: "14px",
      color: "#755c49",
    });
    this.automationTitle = this.add.text(0, 0, "麦の自動化", style);
    this.crateText = this.add.text(0, 0, "集荷箱  0 / 16", style);
    this.harvestWorkerText = this.add.text(0, 0, "収穫スタッフ  未雇用", style);
    this.transportWorkerText = this.add.text(
      0,
      0,
      "運搬スタッフ  未雇用",
      style,
    );
    this.livestockText = this.add.text(0, 0, "鶏小屋\n餌 0 / 12\n卵 0 / 12", { ...style, fontSize: "16px" }).setVisible(false);
    this.contextHint = this.add.text(0, 0, "", { fontFamily: "system-ui", fontSize: "16px", color: "#fff4d8", backgroundColor: "#49382ee8", align: "center", padding: { x: 14, y: 9 }, wordWrap: { width: 340 } }).setOrigin(.5).setAlpha(0);
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
    this.game.events.on(GAME_EVENTS.hint, this.showContextHint, this);
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
    const carried = state.cargo; const total = getCarriedTotal(carried);
    this.carriedText.setText(total ? `背負い籠　${total} / ${carried.capacity}\n麦${carried.amounts.wheat}　とう${carried.amounts.corn}　卵${carried.amounts.egg}` : `背負い籠\n空　0 / ${carried.capacity}`);
    const unlocked = state.landExpansion;
    this.barnText.setText(["倉庫", `麦 ${state.barn.wheat}`, unlocked.eastCornFieldUnlocked ? `とうもろこし ${state.barn.corn}` : "", unlocked.southChickenCoopUnlocked ? `たまご ${state.barn.egg}` : ""].filter(Boolean).join("\n"));
    this.marketText.setText(["売り場", `麦 ${state.market.wheat} / 8`, unlocked.eastCornFieldUnlocked ? `とうもろこし ${state.market.corn} / 8` : "", unlocked.southChickenCoopUnlocked ? `たまご ${state.market.egg} / 8` : ""].filter(Boolean).join("\n"));
    this.livestockText.setVisible(unlocked.southChickenCoopUnlocked).setText(`鶏小屋\n餌 ${state.livestock.feed} / ${state.livestock.feedCapacity}　卵 ${state.livestock.eggs} / ${state.livestock.eggCapacity}\n飼育 ${state.workers.poultryCaretaker.status}`);
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
    const cargo = this.lastState?.cargo;
    const count = cargo ? getCarriedTotal(cargo) : 0;
    const capacity = cargo?.capacity ?? 12;
    const layout = calculateInputLayout(this.scale.width, this.scale.height);
    const g = this.meters.clear();
    const columns = this.scale.width < 520 ? 12 : 12;
    for (let i = 0; i < capacity; i++) {
      const x = layout.inventoryHud.x + 15 + (i % columns) * 12;
      const y = layout.inventoryHud.y + 66 + Math.floor(i / columns) * 10;
      g.lineStyle(1, palette.outline, 0.5)
        .fillStyle(i < count ? (i < (cargo?.amounts.wheat ?? 0) ? colors.wheat : i < (cargo?.amounts.wheat ?? 0) + (cargo?.amounts.corn ?? 0) ? 0xf2c84b : colors.cream) : palette.creamDark, 0.9)
        .fillRoundedRect(x, y, 9, 7, 2).strokeRoundedRect(x, y, 9, 7, 2);
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
  private showContextHint(message: string): void { this.contextHint.setText(message).setAlpha(1); this.tweens.killTweensOf(this.contextHint); this.tweens.add({ targets: this.contextHint, alpha: 0, delay: 1700, duration: 350 }); }
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
    if (this.lastState?.landExpansion.southChickenCoopUnlocked) this.panels.fillStyle(palette.cream, .94).fillRoundedRect(l.livestockHud.x, l.livestockHud.y, l.livestockHud.width, l.livestockHud.height, 18).lineStyle(3, palette.creamDark).strokeRoundedRect(l.livestockHud.x, l.livestockHud.y, l.livestockHud.width, l.livestockHud.height, 18);
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
    this.barnText.setPosition(l.inventoryHud.x + 15, l.inventoryHud.y + 52).setFontSize(w < 520 ? 13 : 15);
    this.marketText.setPosition(l.economyHud.x + 15, l.economyHud.y + 8);
    this.tillText.setPosition(l.economyHud.x + 15, l.economyHud.y + 82).setFontSize(w < 520 ? 13 : 15);
    this.walletText.setPosition(l.economyHud.x + 15, l.economyHud.y + 104).setFontSize(w < 520 ? 13 : 15);
    this.marketText.setFontSize(w < 520 ? 13 : 15);
    this.livestockText.setPosition(l.livestockHud.x + 12, l.livestockHud.y + 10).setFontSize(w < 520 ? 13 : 16);
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
    this.contextHint.setPosition(w / 2, Math.min(h - 190, Math.max(100, h * .2))).setWordWrapWidth(Math.max(160, Math.min(340, w - 32)));
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
    this.game.events.off(GAME_EVENTS.hint, this.showContextHint, this);
    this.scale.off(Phaser.Scale.Events.RESIZE, this.layout, this);
  }
}
