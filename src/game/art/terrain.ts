import Phaser from "phaser";
import { palette } from "./palette";
import { GAME_CONFIG } from "../config/gameConfig";

function tree(scene: Phaser.Scene, x: number, y: number, scale = 1): void {
  const container = scene.add.container(x, y).setDepth(y + 70);
  const shadow = scene.add.ellipse(
    12,
    16,
    90 * scale,
    38 * scale,
    palette.shadow,
    0.25,
  );
  const trunk = scene.add
    .rectangle(0, -8, 18 * scale, 55 * scale, palette.soilDark)
    .setStrokeStyle(3, palette.outline);
  const crown = scene.add.graphics();
  crown.lineStyle(3, palette.outline, 0.9);
  crown
    .fillStyle(palette.foliage)
    .fillCircle(-22 * scale, -48 * scale, 31 * scale)
    .strokeCircle(-22 * scale, -48 * scale, 31 * scale)
    .fillCircle(20 * scale, -51 * scale, 35 * scale)
    .strokeCircle(20 * scale, -51 * scale, 35 * scale)
    .fillCircle(0, -77 * scale, 37 * scale)
    .strokeCircle(0, -77 * scale, 37 * scale);
  const light = scene.add.circle(
    -17 * scale,
    -77 * scale,
    11 * scale,
    palette.foliageLight,
    0.8,
  );
  container.add([shadow, trunk, crown, light]);
}

function addZoneLabel(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  color = "#49382e",
): void {
  scene.add
    .text(x, y, text, {
      fontFamily: "system-ui, sans-serif",
      fontSize: "18px",
      fontStyle: "bold",
      color,
      align: "center",
      backgroundColor: "#fff4d8e8",
      padding: { x: 12, y: 7 },
    })
    .setOrigin(0.5)
    .setDepth(y + 90);
}

export function createFarmWorld(scene: Phaser.Scene): void {
  const graphics = scene.add.graphics().setDepth(-1000);
  graphics.fillStyle(palette.grass).fillRect(
    0,
    0,
    GAME_CONFIG.worldWidth,
    GAME_CONFIG.worldHeight,
  );

  graphics.fillStyle(palette.grassLight, 0.28);
  for (let y = 35; y < GAME_CONFIG.worldHeight; y += 95) {
    for (let x = (y % 190) + 20; x < GAME_CONFIG.worldWidth; x += 170) {
      graphics.fillCircle(x, y, 24);
    }
  }

  graphics.lineStyle(190, palette.path, 1).strokeEllipse(1030, 710, 1390, 850);
  graphics.lineStyle(140, palette.pathLight, 0.45).strokeEllipse(
    1030,
    710,
    1390,
    850,
  );

  graphics.fillStyle(palette.shadow, 0.22).fillEllipse(455, 1090, 360, 215);
  graphics.fillStyle(palette.water).fillEllipse(440, 1075, 350, 205);
  graphics.lineStyle(9, palette.waterLight, 0.75).strokeEllipse(
    430,
    1060,
    300,
    155,
  );
  graphics.fillStyle(palette.grassDark)
    .fillCircle(290, 1035, 14)
    .fillCircle(575, 1128, 17);

  const plots = [
    { x: 290, y: 265, w: 560, h: 310 },
    { x: 760, y: 885, w: 590, h: 300 },
  ];
  for (const plot of plots) {
    graphics.fillStyle(palette.soilDark, 0.25).fillRoundedRect(
      plot.x + 10,
      plot.y + 14,
      plot.w,
      plot.h,
      28,
    );
    graphics.fillStyle(palette.soil).fillRoundedRect(
      plot.x,
      plot.y,
      plot.w,
      plot.h,
      28,
    );
    graphics.lineStyle(5, palette.soilDark, 0.45);
    for (let rowY = plot.y + 54; rowY < plot.y + plot.h; rowY += 64) {
      graphics.lineBetween(plot.x + 24, rowY, plot.x + plot.w - 24, rowY);
    }
  }

  graphics.lineStyle(10, palette.creamDark)
    .lineBetween(230, 220, 900, 220)
    .lineBetween(230, 220, 230, 650)
    .lineBetween(700, 840, 1410, 840);
  graphics.lineStyle(3, palette.outline, 0.7)
    .lineBetween(230, 220, 900, 220)
    .lineBetween(230, 220, 230, 650)
    .lineBetween(700, 840, 1410, 840);
  for (const x of [230, 360, 490, 620, 750, 880]) {
    graphics.fillStyle(palette.creamDark).fillRoundedRect(x - 7, 202, 14, 40, 4);
  }

  for (const [x, y] of [
    [920, 280],
    [1060, 1120],
    [1610, 1030],
    [270, 810],
  ]) {
    graphics.fillStyle(palette.foliage).fillCircle(x, y, 28);
    graphics.fillStyle(palette.flower)
      .fillCircle(x - 10, y - 5, 6)
      .fillCircle(x + 9, y - 12, 6)
      .fillCircle(x + 4, y + 9, 6);
  }

  graphics.lineStyle(5, palette.cream, 0.7)
    .beginPath()
    .moveTo(1030, 245)
    .lineTo(1065, 260)
    .lineTo(1030, 275)
    .strokePath();

  graphics.fillStyle(palette.shadow, 0.25).fillRoundedRect(
    1400,
    255,
    410,
    350,
    34,
  );
  graphics.fillStyle(palette.barn).fillRoundedRect(1375, 225, 410, 330, 24);
  graphics.lineStyle(7, palette.outline).strokeRoundedRect(
    1375,
    225,
    410,
    330,
    24,
  );
  graphics.fillStyle(palette.barnDark)
    .fillTriangle(1350, 275, 1580, 90, 1810, 275)
    .lineStyle(7, palette.outline)
    .strokeTriangle(1350, 275, 1580, 90, 1810, 275);
  graphics.fillStyle(palette.cream)
    .fillCircle(1580, 205, 48)
    .lineStyle(6, palette.outline)
    .strokeCircle(1580, 205, 48);
  graphics.lineBetween(1532, 205, 1628, 205).lineBetween(1580, 157, 1580, 253);
  graphics.fillStyle(palette.barnDark)
    .fillRoundedRect(1495, 355, 170, 200, 12)
    .lineStyle(6, palette.outline)
    .strokeRoundedRect(1495, 355, 170, 200, 12);
  graphics.lineBetween(1495, 355, 1665, 555).lineBetween(1665, 355, 1495, 555);
  graphics.fillStyle(palette.pathLight).fillRoundedRect(1340, 535, 290, 125, 20);
  graphics.lineStyle(5, palette.outline).strokeRoundedRect(1340, 535, 290, 125, 20);

  graphics.fillStyle(palette.teal, 0.2).fillCircle(
    GAME_CONFIG.delivery.x,
    GAME_CONFIG.delivery.y,
    GAME_CONFIG.delivery.radius,
  );
  graphics.lineStyle(8, palette.teal, 0.95).strokeCircle(
    GAME_CONFIG.delivery.x,
    GAME_CONFIG.delivery.y,
    GAME_CONFIG.delivery.radius,
  );
  graphics.lineStyle(3, palette.cream, 0.9).strokeCircle(
    GAME_CONFIG.delivery.x,
    GAME_CONFIG.delivery.y,
    GAME_CONFIG.delivery.radius - 14,
  );

  for (const [x, y] of [
    [1695, 505],
    [1745, 505],
    [1718, 460],
  ]) {
    graphics.fillStyle(palette.path)
      .fillRoundedRect(x, y, 45, 45, 6)
      .lineStyle(4, palette.outline)
      .strokeRoundedRect(x, y, 45, 45, 6);
  }
  graphics.fillStyle(palette.soilDark)
    .fillEllipse(1320, 530, 45, 66)
    .lineStyle(4, palette.outline)
    .strokeEllipse(1320, 530, 45, 66);

  addZoneLabel(
    scene,
    GAME_CONFIG.delivery.x,
    GAME_CONFIG.delivery.y + GAME_CONFIG.delivery.radius - 20,
    "納品エリア\n収穫物を倉庫へ",
  );

  graphics.lineStyle(4, palette.cream, 0.65);
  for (const y of [830, 920, 1010, 1100]) {
    graphics.fillStyle(palette.cream, 0.14).fillCircle(1590, y, 31);
    graphics.strokeCircle(1590, y, 31);
  }

  graphics.fillStyle(palette.coin, 0.22).fillCircle(
    GAME_CONFIG.cash.x,
    GAME_CONFIG.cash.y,
    GAME_CONFIG.cash.radius,
  );
  graphics.lineStyle(8, palette.coin, 0.95).strokeCircle(
    GAME_CONFIG.cash.x,
    GAME_CONFIG.cash.y,
    GAME_CONFIG.cash.radius,
  );
  graphics.lineStyle(3, palette.cream, 0.9).strokeCircle(
    GAME_CONFIG.cash.x,
    GAME_CONFIG.cash.y,
    GAME_CONFIG.cash.radius - 13,
  );
  addZoneLabel(
    scene,
    GAME_CONFIG.cash.x,
    GAME_CONFIG.cash.y + GAME_CONFIG.cash.radius + 22,
    "売上回収エリア\nコインを受け取る",
  );

  graphics.lineStyle(5, palette.teal, 0.55)
    .beginPath()
    .moveTo(1950, 900)
    .lineTo(1870, 900)
    .lineTo(1895, 882)
    .moveTo(1870, 900)
    .lineTo(1895, 918)
    .strokePath();

  for (const values of [
    [120, 190, 1],
    [1080, 190, 0.9],
    [1900, 280, 1],
    [1880, 900, 1.1],
    [1240, 1320, 0.85],
    [700, 1320, 0.8],
  ] as const) {
    tree(scene, values[0], values[1], values[2]);
  }
}
