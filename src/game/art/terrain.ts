import Phaser from "phaser";
import { palette } from "./palette";
import { GAME_CONFIG } from "../config/gameConfig";
import { WorldSign } from "../entities/WorldSign";
import { UI_TEXT } from "../config/localization";

function tree(scene: Phaser.Scene, x: number, y: number, scale = 1): void {
  const c = scene.add.container(x, y).setDepth(y + 70);
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
  const crown = scene.add
    .graphics()
    .fillStyle(palette.foliage)
    .fillCircle(-22 * scale, -48 * scale, 31 * scale)
    .fillCircle(20 * scale, -51 * scale, 35 * scale)
    .fillCircle(0, -77 * scale, 37 * scale)
    .lineStyle(3, palette.outline)
    .strokeCircle(0, -64 * scale, 56 * scale);
  const light = scene.add.circle(
    -17 * scale,
    -77 * scale,
    11 * scale,
    palette.foliageLight,
    0.8,
  );
  c.add([shadow, trunk, crown, light]);
}

export function createFarmWorld(scene: Phaser.Scene): void {
  const g = scene.add.graphics().setDepth(-1000);
  g.fillStyle(palette.grass).fillRect(
    0,
    0,
    GAME_CONFIG.worldWidth,
    GAME_CONFIG.worldHeight,
  );
  // v0.5.0 expansion parcels extend the established farm east and south.
  g.fillStyle(palette.pathLight, 0.55).fillRoundedRect(2040, 160, 900, 900, 38);
  g.fillStyle(palette.soil).fillRoundedRect(2230, 260, 620, 650, 28);
  g.lineStyle(5, palette.soilDark, 0.45);
  for (let y = 315; y < 900; y += 125) g.lineBetween(2260, y, 2820, y);
  g.fillStyle(palette.pathLight, 0.55).fillRoundedRect(620, 1380, 1040, 470, 38);
  g.fillStyle(palette.creamDark, 0.65).fillRoundedRect(690, 1460, 900, 330, 28);
  g.fillStyle(palette.barn).fillRoundedRect(720, 1480, 260, 210, 20).lineStyle(6, palette.outline).strokeRoundedRect(720, 1480, 260, 210, 20);
  g.fillStyle(palette.barnDark).fillTriangle(690, 1510, 850, 1385, 1010, 1510).strokeTriangle(690, 1510, 850, 1385, 1010, 1510);
  g.fillStyle(palette.outline).fillRoundedRect(805, 1580, 90, 110, 12);
  // Water and feed/egg fixtures use icons and shapes rather than ground labels.
  g.fillStyle(palette.water).fillEllipse(1260, 1740, 95, 45).lineStyle(4, palette.outline).strokeEllipse(1260, 1740, 95, 45);
  g.fillStyle(palette.path).fillRoundedRect(930, 1580, 100, 58, 8).strokeRoundedRect(930, 1580, 100, 58, 8);
  g.fillStyle(palette.wheat).fillEllipse(980, 1595, 70, 20);
  g.fillStyle(palette.path).fillRoundedRect(1340, 1580, 100, 70, 8).strokeRoundedRect(1340, 1580, 100, 70, 8);
  for (let i = 0; i < 6; i++) g.fillStyle(palette.cream).fillEllipse(1360 + (i % 3) * 30, 1598 + Math.floor(i / 3) * 26, 17, 22);
  // grass variation
  g.fillStyle(palette.grassLight, 0.28);
  for (let y = 35; y < GAME_CONFIG.worldHeight; y += 95)
    for (let x = (y % 190) + 20; x < GAME_CONFIG.worldWidth; x += 170)
      g.fillCircle(x, y, 24);
  // looping path
  g.lineStyle(190, palette.path, 1).strokeEllipse(1030, 710, 1390, 850);
  g.lineStyle(140, palette.pathLight, 0.45).strokeEllipse(1030, 710, 1390, 850);
  // pond
  g.fillStyle(palette.shadow, 0.22).fillEllipse(455, 1090, 360, 215);
  g.fillStyle(palette.water).fillEllipse(440, 1075, 350, 205);
  g.lineStyle(9, palette.waterLight, 0.75).strokeEllipse(430, 1060, 300, 155);
  g.fillStyle(palette.grassDark)
    .fillCircle(290, 1035, 14)
    .fillCircle(575, 1128, 17);
  // flower clusters
  for (const [x, y] of [
    [920, 280],
    [1610, 1030],
    [270, 810],
  ]) {
    g.fillStyle(palette.foliage).fillCircle(x, y, 28);
    g.fillStyle(palette.flower)
      .fillCircle(x - 10, y - 5, 6)
      .fillCircle(x + 9, y - 12, 6)
      .fillCircle(x + 4, y + 9, 6);
  }
  // directional path marks
  g.lineStyle(5, palette.cream, 0.7)
    .beginPath()
    .moveTo(1030, 245)
    .lineTo(1065, 260)
    .lineTo(1030, 275)
    .strokePath();

  // barn shadow, building and platform
  g.fillStyle(palette.shadow, 0.25).fillRoundedRect(1400, 255, 410, 350, 34);
  g.fillStyle(palette.barn).fillRoundedRect(1375, 225, 410, 330, 24);
  g.lineStyle(7, palette.outline).strokeRoundedRect(1375, 225, 410, 330, 24);
  g.fillStyle(palette.barnDark)
    .fillTriangle(1350, 275, 1580, 90, 1810, 275)
    .lineStyle(7, palette.outline)
    .strokeTriangle(1350, 275, 1580, 90, 1810, 275);
  g.fillStyle(palette.cream)
    .fillCircle(1580, 205, 48)
    .lineStyle(6, palette.outline)
    .strokeCircle(1580, 205, 48);
  g.lineBetween(1532, 205, 1628, 205).lineBetween(1580, 157, 1580, 253);
  g.fillStyle(palette.barnDark)
    .fillRoundedRect(1495, 355, 170, 200, 12)
    .lineStyle(6, palette.outline)
    .strokeRoundedRect(1495, 355, 170, 200, 12);
  g.lineBetween(1495, 355, 1665, 555).lineBetween(1665, 355, 1495, 555);
  g.fillStyle(palette.pathLight)
    .fillRoundedRect(1340, 535, 290, 125, 20)
    .lineStyle(5, palette.outline)
    .strokeRoundedRect(1340, 535, 290, 125, 20);
  g.lineStyle(5, palette.teal, 0.9).strokeCircle(
    GAME_CONFIG.delivery.x,
    GAME_CONFIG.delivery.y,
    GAME_CONFIG.delivery.radius,
  );
  // crates, barrels, sign
  for (const [x, y] of [
    [1695, 505],
    [1745, 505],
    [1718, 460],
  ])
    g.fillStyle(palette.path)
      .fillRoundedRect(x, y, 45, 45, 6)
      .lineStyle(4, palette.outline)
      .strokeRoundedRect(x, y, 45, 45, 6);
  g.fillStyle(palette.soilDark)
    .fillEllipse(1320, 530, 45, 66)
    .lineStyle(4, palette.outline)
    .strokeEllipse(1320, 530, 45, 66);
  g.fillStyle(palette.cream)
    .fillRoundedRect(1260, 610, 150, 55, 10)
    .lineStyle(4, palette.outline)
    .strokeRoundedRect(1260, 610, 150, 55, 10);
  new WorldSign(scene, 1330, 620, [UI_TEXT.facilities.delivery]);
  new WorldSign(scene, 1740, 610, [UI_TEXT.facilities.market]);
  new WorldSign(scene, 1840, 720, [UI_TEXT.facilities.cash]);
  // Market queue, cash collection, and entrance/exit guidance.
  g.lineStyle(4, palette.cream, 0.65);
  for (const y of [830, 920, 1010, 1100]) g.strokeCircle(1590, y, 31);
  g.lineStyle(5, palette.coin, 0.9).strokeCircle(
    GAME_CONFIG.cash.x,
    GAME_CONFIG.cash.y,
    GAME_CONFIG.cash.radius,
  );
  g.lineStyle(5, palette.teal, 0.55)
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
  ] as const)
    tree(scene, values[0], values[1], values[2]);
}
