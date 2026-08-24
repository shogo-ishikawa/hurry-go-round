export type WheatFieldLevel = 0 | 1 | 2;
export type Rect = { x: number; y: number; width: number; height: number };

export interface WheatNodeDefinition {
  id: string;
  field: "main";
  expansionLevel: WheatFieldLevel;
  row: number;
  column: number;
  x: number;
  y: number;
}

const nodeGroups = [
  { name: "base", firstColumn: 0, columns: 5, expansionLevel: 0 },
  { name: "exp1", firstColumn: 5, columns: 2, expansionLevel: 1 },
  { name: "exp2", firstColumn: 7, columns: 2, expansionLevel: 2 },
] as const;

const wheatNodes: WheatNodeDefinition[] = nodeGroups.flatMap((group) =>
  Array.from({ length: group.columns * 6 }, (_, index) => {
    const row = index % 6;
    const column = group.firstColumn + Math.floor(index / 6);
    return {
      id: `wheat-main-${group.name}-${String(index).padStart(2, "0")}`,
      field: "main" as const,
      expansionLevel: group.expansionLevel,
      row,
      column,
      x: 700 + column * 72,
      y: 940 + row * 50,
    };
  }),
);

export const FARM_LAYOUT = Object.freeze({
  trainingLodge: { bounds: { x: 330, y: 285, width: 390, height: 245 }, entrance: { x: 525, y: 555, radius: 100 } },
  wheatField: {
    bounds: { x: 650, y: 890, width: 760, height: 390 },
    baseBounds: { x: 650, y: 890, width: 430, height: 390 },
    expansion1Bounds: { x: 1080, y: 890, width: 165, height: 390 },
    expansion2Bounds: { x: 1245, y: 890, width: 165, height: 390 },
    entry: { x: 1040, y: 850 },
    crate: { x: 850, y: 790, radius: 78, wait: { x: 930, y: 790 } },
    collectionBox: { x: 730, y: 790, radius: 58 },
    expansionPad: { x: 1160, y: 790, radius: 76 },
    sign: { x: 650, y: 850 },
  },
  wheatCrate: { x: 850, y: 790, radius: 78, wait: { x: 930, y: 790 } },
  wheatCollectionBox: { x: 730, y: 790, radius: 58 },
  wheatExpansion: { x: 1160, y: 790, radius: 76 },
  wheatSign: { x: 650, y: 850 },
  farmPath: { x: 610, y: 760, width: 650, height: 80 },
  pond: { x: 770, y: 270, width: 420, height: 350 },
  exclusions: [{ x: 330, y: 285, width: 390, height: 245 }, { x: 770, y: 270, width: 420, height: 350 }],
  workerHome: { x: 1330, y: 720 },
  barn: { x: 1450, y: 610 },
  wheatNodes,
});

export const getActiveWheatNodes = (level: WheatFieldLevel) => FARM_LAYOUT.wheatNodes.filter((node) => node.expansionLevel <= level);
export const WHEAT_CROP_VISUAL_RADIUS = Object.freeze({ x: 18, y: 40 });
export const WHEAT_FIELD_VISUAL_MARGIN = Object.freeze({ x: 32, y: 28 });
export function getWheatFieldVisualBounds(level: WheatFieldLevel, nodes: readonly WheatNodeDefinition[] = getActiveWheatNodes(level), cropVisualRadius = WHEAT_CROP_VISUAL_RADIUS, margin = WHEAT_FIELD_VISUAL_MARGIN): Rect {
  const active=nodes.filter(node=>node.expansionLevel<=level);
  if(active.length===0)throw new Error("Wheat field requires at least one active node");
  const xs=active.map(node=>node.x),ys=active.map(node=>node.y);
  return{x:Math.min(...xs)-cropVisualRadius.x-margin.x,y:Math.min(...ys)-cropVisualRadius.y-margin.y,width:Math.max(...xs)-Math.min(...xs)+cropVisualRadius.x*2+margin.x*2,height:Math.max(...ys)-Math.min(...ys)+cropVisualRadius.y*2+margin.y*2};
}
export const getActiveWheatBounds = getWheatFieldVisualBounds;
export const rectanglesOverlap = (a: Rect, b: Rect): boolean => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
