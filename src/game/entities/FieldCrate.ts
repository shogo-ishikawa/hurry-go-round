import Phaser from "phaser";
import { palette } from "../art/palette";
import { GAME_CONFIG } from "../config/gameConfig";
export class FieldCrate extends Phaser.GameObjects.Container {
  private fill: Phaser.GameObjects.Graphics;
  private full: Phaser.GameObjects.Text;
  private shown = -1;
  constructor(scene: Phaser.Scene) {
    const zone = scene.add
      .ellipse(
        0,
        20,
        GAME_CONFIG.fieldCratePickupRadius * 2,
        GAME_CONFIG.fieldCratePickupRadius * 1.25,
        palette.teal,
        0.13,
      )
      .setStrokeStyle(4, palette.teal, 0.65);
    const art = scene.add
      .graphics()
      .lineStyle(5, palette.outline)
      .fillStyle(palette.path)
      .fillRoundedRect(-90, -22, 180, 78, 14)
      .strokeRoundedRect(-90, -22, 180, 78, 14)
      .lineStyle(4, palette.soilDark)
      .lineBetween(-70, -10, 70, 45)
      .lineBetween(70, -10, -70, 45);
    const fill = scene.add.graphics();
    const label = scene.add
      .text(0, -78, "集荷箱\n麦を一時保管", {
        fontFamily: "system-ui",
        fontSize: "18px",
        fontStyle: "bold",
        align: "center",
        color: "#49382e",
      })
      .setOrigin(0.5);
    const pickup = scene.add
      .text(0, 78, "受取エリア　麦を持ち物に移す", {
        fontFamily: "system-ui",
        fontSize: "15px",
        color: "#49382e",
        backgroundColor: "#fff4d8cc",
        padding: { x: 8, y: 4 },
      })
      .setOrigin(0.5);
    const full = scene.add
      .text(0, -112, "集荷箱が満杯", {
        fontFamily: "system-ui",
        fontSize: "18px",
        fontStyle: "bold",
        color: "#fff4d8",
        backgroundColor: "#b9573fee",
        padding: { x: 8, y: 4 },
      })
      .setOrigin(0.5)
      .setVisible(false);
    super(scene, GAME_CONFIG.fieldCrate.x, GAME_CONFIG.fieldCrate.y, [
      zone,
      art,
      fill,
      label,
      pickup,
      full,
    ]);
    this.fill = fill;
    this.full = full;
    scene.add.existing(this);
    this.setDepth(this.y + 60);
    this.updateDisplay(0);
  }
  updateDisplay(count: number): void {
    if (count === this.shown) return;
    this.shown = count;
    const g = this.fill.clear();
    for (let i = 0; i < 16; i++) {
      const x = -68 + (i % 8) * 19,
        y = 2 + Math.floor(i / 8) * 24;
      g.lineStyle(1, palette.outline, 0.4)
        .fillStyle(
          i < count ? palette.wheat : palette.soilDark,
          i < count ? 1 : 0.25,
        )
        .fillRoundedRect(x - 7, y - 6, 14, 12, 3)
        .strokeRoundedRect(x - 7, y - 6, 14, 12, 3);
    }
    this.full.setVisible(count >= 16);
  }
}
