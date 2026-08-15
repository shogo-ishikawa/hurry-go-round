export const WORKER_ROUTES = {
  home: { x: 1330, y: 720 },
  fieldEntries: [
    { x: 720, y: 680 },
    { x: 1060, y: 850 },
  ],
  crate: { x: 1110, y: 790 },
  crateWait: { x: 1190, y: 780 },
  barn: { x: 1450, y: 610 },
  transportToBarn: [
    { x: 1210, y: 760 },
    { x: 1320, y: 745 },
    { x: 1410, y: 670 },
    { x: 1450, y: 610 },
  ],
  transportToCrate: [
    { x: 1410, y: 670 },
    { x: 1320, y: 745 },
    { x: 1210, y: 760 },
    { x: 1110, y: 790 },
  ],
} as const;
