import { FANTASY_WALL_TEXTURES } from "./wall-art.js";

function freezeDefinitions(definitions) {
  return Object.freeze(definitions.map((definition) => Object.freeze(definition)));
}

export const WALL_ACCENT_DECORATIONS = Object.freeze({
  top: freezeDefinitions([{ texture: FANTASY_WALL_TEXTURES["horizontal-top"], kind: "wall-accent", scale: 2 }]),
  bottom: freezeDefinitions([{ texture: FANTASY_WALL_TEXTURES["horizontal-bottom"], kind: "wall-accent", scale: 2 }]),
  left: freezeDefinitions([{ texture: FANTASY_WALL_TEXTURES["vertical-left"], kind: "wall-accent", scale: 2 }]),
  right: freezeDefinitions([{ texture: FANTASY_WALL_TEXTURES["vertical-right"], kind: "wall-accent", scale: 2 }]),
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
});

export const ROOM_DECORATION_PROFILES = Object.freeze({
  small_square: Object.freeze({
    id: "quarters",
    obstacleProps: Object.freeze(["table", "bookshelf", "crates"]),
    floorProps: Object.freeze(["chair", "chairSide", "crateClosed", "sack"]),
    firePairCount: 1,
  }),
  cross_hall: Object.freeze({
    id: "archive",
    obstacleProps: Object.freeze(["bookshelf", "bookshelfAlt", "table"]),
    floorProps: Object.freeze(["chair", "crateOpen", "candle"]),
    firePairCount: 2,
  }),
  pillars: Object.freeze({
    id: "shrine",
    obstacleProps: Object.freeze(["altar", "table"]),
    floorProps: Object.freeze(["candle", "glow", "bones", "sack"]),
    firePairCount: 2,
  }),
  trap_corridor: Object.freeze({
    id: "armory",
    obstacleProps: Object.freeze(["barricade", "crates", "tableVertical"]),
    floorProps: Object.freeze(["weapon", "chain", "crateOpen", "crateClosed"]),
    firePairCount: 1,
  }),
  two_arenas: Object.freeze({
    id: "ruins",
    obstacleProps: Object.freeze(["barricade", "crates"]),
    floorProps: Object.freeze(["rubble", "brokenChair", "bones", "sack", "weapon"]),
    firePairCount: 1,
  }),
});

export const DEFAULT_DECORATION_PROFILE = ROOM_DECORATION_PROFILES.small_square;

export const ROOM_DECORATION_CANDIDATE_POINTS = Object.freeze([
  Object.freeze([120, 150]), Object.freeze([240, 140]), Object.freeze([720, 140]), Object.freeze([840, 150]),
  Object.freeze([120, 230]), Object.freeze([840, 230]), Object.freeze([120, 350]), Object.freeze([840, 350]),
  Object.freeze([120, 430]), Object.freeze([240, 440]), Object.freeze([720, 440]), Object.freeze([840, 430]),
  Object.freeze([200, 220]), Object.freeze([760, 220]), Object.freeze([200, 360]), Object.freeze([760, 360]),
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
  "room-decor-torch-mount",
]);

export const ROOM_FIRE_PAIRS = Object.freeze({
  top: Object.freeze([Object.freeze([352, 120]), Object.freeze([608, 120])]),
  bottom: Object.freeze([Object.freeze([352, 460]), Object.freeze([608, 460])]),
  left: Object.freeze([Object.freeze([88, 204]), Object.freeze([88, 376])]),
  right: Object.freeze([Object.freeze([872, 204]), Object.freeze([872, 376])]),
});
