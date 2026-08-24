export const OBSTACLE_DECORATIONS = Object.freeze([
  Object.freeze({ texture: "room-decor-table", scale: 2.8 }),
  Object.freeze({ texture: "room-decor-bookshelf", scale: 3 }),
  Object.freeze({ texture: "room-decor-barricade", scale: 3 }),
  Object.freeze({ texture: "room-decor-crates", scale: 3 }),
]);

export const FLOOR_DECORATIONS = Object.freeze([
  Object.freeze({ texture: "room-decor-chair", scale: 2.8 }),
  Object.freeze({ texture: "room-decor-rubble", scale: 2.7 }),
  Object.freeze({ texture: "room-decor-torch", scale: 2.8 }),
  Object.freeze({ texture: "room-decor-glow", scale: 2.6 }),
  Object.freeze({ texture: "room-decor-crates", scale: 2.5 }),
]);

export const ROOM_DECORATION_CANDIDATE_POINTS = Object.freeze([
  Object.freeze([120, 140]), Object.freeze([240, 120]), Object.freeze([720, 120]), Object.freeze([840, 140]),
  Object.freeze([120, 220]), Object.freeze([840, 220]), Object.freeze([120, 360]), Object.freeze([840, 360]),
  Object.freeze([120, 440]), Object.freeze([240, 460]), Object.freeze([720, 460]), Object.freeze([840, 440]),
  Object.freeze([200, 220]), Object.freeze([760, 220]), Object.freeze([200, 360]), Object.freeze([760, 360]),
  Object.freeze([360, 116]), Object.freeze([600, 116]), Object.freeze([360, 464]), Object.freeze([600, 464]),
]);

export const ROOM_DECORATION_TEXTURES = Object.freeze([
  ...new Set([...OBSTACLE_DECORATIONS, ...FLOOR_DECORATIONS].map(({ texture }) => texture)),
]);
