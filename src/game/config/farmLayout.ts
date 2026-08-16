export type WheatFieldLevel = 0 | 1 | 2;
export type WheatFieldCluster = "west" | "central";
export type Rect = { x: number; y: number; width: number; height: number };

const group = (cluster: WheatFieldCluster, name: "base" | "exp1" | "exp2", startX: number, startY: number, count: number) =>
  Array.from({ length: count }, (_, index) => ({
    id: `wheat-${cluster}-${name}-${String(index).padStart(2, "0")}`,
    cluster,
    expansionLevel: (name === "base" ? 0 : name === "exp1" ? 1 : 2) as WheatFieldLevel,
    x: startX + (index % 3) * 86,
    y: startY + Math.floor(index / 3) * 54,
  }));

export const FARM_LAYOUT = Object.freeze({
  trainingLodge: { bounds: { x: 330, y: 285, width: 390, height: 245 }, entrance: { x: 525, y: 555, radius: 100 } },
  wheatFields: {
    west: { bounds: { x: 35, y: 620, width: 650, height: 330 }, entry: { x: 690, y: 790 } },
    central: { bounds: { x: 760, y: 885, width: 590, height: 300 }, entry: { x: 1040, y: 850 } },
  },
  wheatCrate: { x: 850, y: 790, radius: 78, wait: { x: 930, y: 790 } },
  wheatCollectionBox: { x: 730, y: 790, radius: 58 },
  wheatExpansion: { x: 1040, y: 790, radius: 76 },
  wheatSign: { x: 600, y: 985 },
  farmPath: { x: 610, y: 760, width: 500, height: 80 },
  pond: { x: 770, y: 270, width: 420, height: 350 },
  exclusions: [{ x: 330, y: 285, width: 390, height: 245 }, { x: 770, y: 270, width: 420, height: 350 }],
  workerHome: { x: 1330, y: 720 },
  barn: { x: 1450, y: 610 },
  wheatNodes: [
    ...group("west", "base", 105, 675, 15), ...group("west", "exp1", 390, 675, 6), ...group("west", "exp2", 390, 800, 6),
    ...group("central", "base", 815, 950, 15), ...group("central", "exp1", 1100, 950, 6), ...group("central", "exp2", 1100, 1075, 6),
  ],
});

export const getActiveWheatNodes = (level: WheatFieldLevel) => FARM_LAYOUT.wheatNodes.filter(node => node.expansionLevel <= level);
export const rectanglesOverlap = (a: Rect, b: Rect): boolean => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
