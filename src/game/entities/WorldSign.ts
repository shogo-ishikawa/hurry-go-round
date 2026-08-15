import Phaser from "phaser";
import { palette } from "../art/palette";

export class WorldSign extends Phaser.GameObjects.Container {
  private label: Phaser.GameObjects.Text;
  constructor(scene: Phaser.Scene, x: number, y: number, lines: readonly [string, string?]) {
    const shadow = scene.add.ellipse(5, 26, 132, 28, palette.shadow, 0.24);
    const art = scene.add.graphics().lineStyle(3, palette.outline)
      .fillStyle(palette.soilDark).fillRoundedRect(-7, -10, 14, 72, 4).strokeRoundedRect(-7, -10, 14, 72, 4)
      .fillStyle(palette.path).fillRoundedRect(-74, -48, 148, 66, 9).strokeRoundedRect(-74, -48, 148, 66, 9)
      .fillStyle(palette.cream).fillRoundedRect(-65, -39, 130, 48, 6);
    const label = scene.add.text(0, -16, lines.filter(Boolean).join("\n"), {
      fontFamily: "system-ui", fontSize: "15px", fontStyle: "bold", color: "#49382e", align: "center", fixedWidth: 126,
    }).setOrigin(0.5);
    super(scene, x, y, [shadow, art, label]); this.label = label; scene.add.existing(this); this.setDepth(y + 55);
  }
  setLines(lines: readonly [string, string?]): void { this.label.setText(lines.filter(Boolean).join("\n")); }
}
