import { FANTASY_WALL_TEXTURES } from "./wall-art.js";

function freezeDefinitions(definitions) {
  return Object.freeze(definitions.map((definition) => Object.freeze(definition)));
}

function numberedKeys(prefix, count, excluded = []) {
  const excludedNumbers = new Set(excluded);
  return Object.freeze(Array.from({ length: count }, (_, index) => index + 1)
    .filter((number) => !excludedNumbers.has(number))
    .map((number) => `${prefix}-${number}`));
}

function definitionsFor(keys, options) {
  return Object.fromEntries(keys.map((key) => [key, Object.freeze({ texture: key, ...options })]));
}

export const WALL_ACCENT_DECORATIONS = Object.freeze({
  top: freezeDefinitions([{ texture: FANTASY_WALL_TEXTURES["horizontal-top"], kind: "wall-accent", scale: 2 }]),
  bottom: freezeDefinitions([{ texture: FANTASY_WALL_TEXTURES["horizontal-bottom"], kind: "wall-accent", scale: 2 }]),
  left: freezeDefinitions([{ texture: FANTASY_WALL_TEXTURES["vertical-left"], kind: "wall-accent", scale: 2 }]),
  right: freezeDefinitions([{ texture: FANTASY_WALL_TEXTURES["vertical-right"], kind: "wall-accent", scale: 2 }]),
});

export const PROP_GROUPS = Object.freeze({
  blockages: numberedKeys("dungeon-blockage", 8),
  bookshelves: numberedKeys("dungeon-bookshelf", 12),
  shelfDecor: numberedKeys("dungeon-bookshelf-decor", 40),
  boxes: numberedKeys("dungeon-box", 16),
  chairs: numberedKeys("dungeon-chair", 14),
  other: numberedKeys("dungeon-other", 44, [5, 6, 7, 8]),
  tables: numberedKeys("dungeon-table", 8),
});

export const PROP_DEFINITIONS = Object.freeze({
  table: Object.freeze({ texture: "room-decor-table", scale: 2.7 }),
  tableVertical: Object.freeze({ texture: "room-decor-table-vertical", scale: 2.7 }),
  altar: Object.freeze({ texture: "room-decor-altar", scale: 2.6 }),
  bookshelf: Object.freeze({ texture: "room-decor-bookshelf", scale: 2.8 }),
  bookshelfAlt: Object.freeze({ texture: "room-decor-bookshelf-alt", scale: 2.8 }),
  barricade: Object.freeze({ texture: "room-decor-barricade", scale: 2.8 }),
  crates: Object.freeze({ texture: "room-decor-crates", scale: 2.8 }),
  chair: Object.freeze({ texture: "room-decor-chair", scale: 2.6, offsetY: -3 }),
  chairSide: Object.freeze({ texture: "room-decor-chair-side", scale: 2.6, offsetY: -3 }),
  brokenChair: Object.freeze({ texture: "room-decor-chair-broken", scale: 2.5, offsetY: -3 }),
  crateOpen: Object.freeze({ texture: "room-decor-crate-open", scale: 2.5, offsetY: -3 }),
  crateClosed: Object.freeze({ texture: "room-decor-crate-closed", scale: 2.5, offsetY: -3 }),
  sack: Object.freeze({ texture: "room-decor-sack", scale: 2.4, offsetY: -3 }),
  rubble: Object.freeze({ texture: "room-decor-rubble", scale: 2.5, offsetY: -2 }),
  bones: Object.freeze({ texture: "room-decor-bones", scale: 2.4, offsetY: -2 }),
  chain: Object.freeze({ texture: "room-decor-chain", scale: 2.4, offsetY: -3 }),
  weapon: Object.freeze({ texture: "room-decor-weapon", scale: 2.4, offsetY: -2 }),
  candle: Object.freeze({ texture: "room-decor-candle", scale: 2.4, offsetY: -4 }),
  glow: Object.freeze({ texture: "room-decor-glow", scale: 2.4, offsetY: -3 }),
  ...definitionsFor(PROP_GROUPS.blockages, { scale: 2.7, offsetY: -2 }),
  ...definitionsFor(PROP_GROUPS.bookshelves, { scale: 2.35, offsetY: -5, allowFlip: false }),
  ...definitionsFor(PROP_GROUPS.shelfDecor, { scale: 2.8, offsetY: -2 }),
  ...definitionsFor(PROP_GROUPS.boxes, { scale: 2.55, offsetY: -3 }),
  ...definitionsFor(PROP_GROUPS.chairs, { scale: 2.35, offsetY: -3 }),
  ...definitionsFor(PROP_GROUPS.other, { scale: 2.65, offsetY: -2 }),
  ...definitionsFor(PROP_GROUPS.tables, { scale: 2.4, offsetY: -4, allowFlip: false }),
});

export const ROOM_CHEST_VARIANTS = Object.freeze([1, 2]);
export const ROOM_LEVER_VARIANTS = Object.freeze([1, 2]);
export const ROOM_TRAPDOOR_DIRECTIONS = Object.freeze(["down", "side", "up"]);

export const ROOM_DECORATION_PROFILES = Object.freeze({
  small_square: Object.freeze({
    id: "quarters",
    obstacleProps: Object.freeze([...PROP_GROUPS.tables, ...PROP_GROUPS.bookshelves, ...PROP_GROUPS.boxes]),
    floorProps: Object.freeze([...PROP_GROUPS.chairs, ...PROP_GROUPS.boxes, ...PROP_GROUPS.other]),
    clutterProps: Object.freeze([...PROP_GROUPS.shelfDecor, ...PROP_GROUPS.other]),
    firePairCount: 1,
  }),
  cross_hall: Object.freeze({
    id: "archive",
    obstacleProps: Object.freeze([...PROP_GROUPS.bookshelves, ...PROP_GROUPS.tables]),
    floorProps: Object.freeze([...PROP_GROUPS.chairs, ...PROP_GROUPS.boxes, ...PROP_GROUPS.shelfDecor]),
    clutterProps: Object.freeze([...PROP_GROUPS.shelfDecor, ...PROP_GROUPS.other]),
    firePairCount: 2,
  }),
  pillars: Object.freeze({
    id: "shrine",
    obstacleProps: Object.freeze([...PROP_GROUPS.tables, ...PROP_GROUPS.blockages]),
    floorProps: Object.freeze([...PROP_GROUPS.other, ...PROP_GROUPS.shelfDecor]),
    clutterProps: Object.freeze([...PROP_GROUPS.shelfDecor, ...PROP_GROUPS.other]),
    firePairCount: 2,
  }),
  trap_corridor: Object.freeze({
    id: "armory",
    obstacleProps: Object.freeze([...PROP_GROUPS.blockages, ...PROP_GROUPS.boxes, ...PROP_GROUPS.tables]),
    floorProps: Object.freeze([...PROP_GROUPS.other, ...PROP_GROUPS.boxes, ...PROP_GROUPS.chairs]),
    clutterProps: Object.freeze([...PROP_GROUPS.other, ...PROP_GROUPS.shelfDecor]),
    firePairCount: 1,
  }),
  two_arenas: Object.freeze({
    id: "ruins",
    obstacleProps: Object.freeze([...PROP_GROUPS.blockages, ...PROP_GROUPS.boxes]),
    floorProps: Object.freeze([...PROP_GROUPS.blockages, ...PROP_GROUPS.chairs, ...PROP_GROUPS.other]),
    clutterProps: Object.freeze([...PROP_GROUPS.shelfDecor, ...PROP_GROUPS.other]),
    firePairCount: 1,
  }),
});

export const DEFAULT_DECORATION_PROFILE = ROOM_DECORATION_PROFILES.small_square;

export const ROOM_DECORATION_CANDIDATE_POINTS = Object.freeze([
  Object.freeze([120, 150]), Object.freeze([240, 140]), Object.freeze([720, 140]), Object.freeze([840, 150]),
  Object.freeze([120, 230]), Object.freeze([840, 230]), Object.freeze([120, 350]), Object.freeze([840, 350]),
  Object.freeze([120, 430]), Object.freeze([240, 440]), Object.freeze([720, 440]), Object.freeze([840, 430]),
  Object.freeze([200, 220]), Object.freeze([760, 220]), Object.freeze([200, 360]), Object.freeze([760, 360]),
  Object.freeze([280, 210]), Object.freeze([680, 210]), Object.freeze([280, 370]), Object.freeze([680, 370]),
  Object.freeze([360, 200]), Object.freeze([600, 200]), Object.freeze([360, 380]), Object.freeze([600, 380]),
  Object.freeze([400, 250]), Object.freeze([560, 250]), Object.freeze([400, 330]), Object.freeze([560, 330]),
]);

export const FLOOR_PATCH_TEXTURES = Object.freeze([
  "room-floor-fantasy-alt",
  "room-floor-fantasy-stone",
]);

export const ROOM_BACKGROUND_TEXTURES = Object.freeze([
  ...new Set([
    ...Object.values(WALL_ACCENT_DECORATIONS).flatMap((definitions) => definitions.map(({ texture }) => texture)),
    ...FLOOR_PATCH_TEXTURES,
  ]),
]);

export const ROOM_DECORATION_TEXTURES = Object.freeze([
  ...new Set(Object.values(PROP_DEFINITIONS).map(({ texture }) => texture)),
  ...Array.from({ length: 8 }, (_, index) => `dungeon-torch-mount-${index + 1}`),
]);

export const ROOM_ANIMATED_TEXTURES = Object.freeze([
  ...ROOM_CHEST_VARIANTS.flatMap((variant) => ["down", "side", "up"].map((direction) => `room-chest-${variant}-${direction}`)),
  ...ROOM_LEVER_VARIANTS.map((variant) => `room-lever-${variant}`),
]);

export const ROOM_FIRE_PAIRS = Object.freeze({
  top: Object.freeze([Object.freeze([352, 120]), Object.freeze([608, 120])]),
  bottom: Object.freeze([Object.freeze([352, 460]), Object.freeze([608, 460])]),
  left: Object.freeze([Object.freeze([88, 204]), Object.freeze([88, 376])]),
  right: Object.freeze([Object.freeze([872, 204]), Object.freeze([872, 376])]),
});
