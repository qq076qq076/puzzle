export const BOARD = Object.freeze({
  columns: 6,
  visibleRows: 12,
  hiddenRows: 1,
  totalRows: 13,
  spawnX: 2,
  spawnY: 0
});

export const CELL = Object.freeze({
  empty: 0,
  red: 1,
  yellow: 2,
  green: 3,
  blue: 4,
  garbage: 8
});

export const COLORS = Object.freeze([
  Object.freeze({ id: CELL.red, key: "red", name: "火焰紅", color: 0xff5277, emissive: 0x4f0718, symbol: "flame" }),
  Object.freeze({ id: CELL.yellow, key: "yellow", name: "星光黃", color: 0xffd45a, emissive: 0x4b3100, symbol: "star" }),
  Object.freeze({ id: CELL.green, key: "green", name: "森林綠", color: 0x63e6a5, emissive: 0x073b24, symbol: "leaf" }),
  Object.freeze({ id: CELL.blue, key: "blue", name: "魔力藍", color: 0x64b5ff, emissive: 0x08284b, symbol: "drop" })
]);

export const SPEED_MS = Object.freeze([1000, 850, 720, 600, 500, 420, 350, 290, 240, 200, 165, 135, 110, 90, 75]);
export const CHAIN_BONUS = Object.freeze([0, 0, 8, 16, 32, 64, 96, 128, 160, 192, 224]);
export const COLOR_BONUS = Object.freeze([0, 0, 3, 6, 12]);

export const TIMING = Object.freeze({
  fixedStepMs: 1000 / 60,
  lockDelayMs: 500,
  maxLockResets: 12,
  softDropMs: 45,
  dasMs: 160,
  arrMs: 65,
  maxFrameDeltaMs: 100,
  maxStepsPerFrame: 6
});

export const ROTATION_OFFSETS = Object.freeze([
  Object.freeze({ x: 0, y: -1 }),
  Object.freeze({ x: 1, y: 0 }),
  Object.freeze({ x: 0, y: 1 }),
  Object.freeze({ x: -1, y: 0 })
]);

export function colorConfig(id) {
  return COLORS.find((entry) => entry.id === id) || null;
}

