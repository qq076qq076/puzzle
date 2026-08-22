export const MAP_LAYOUT = Object.freeze({
  gridSize: 28,
  corridorWidthCells: 2,
  minCorridorLengthCells: 3,
  maxCorridorLengthCells: 8,
  maxRoomYOffsetCells: 5,
  maxAttempts: 24,
});

export const DEFAULT_ROOM_FOOTPRINT = Object.freeze({ width: 24, height: 14 });
export const BOSS_ROOM_FOOTPRINT = Object.freeze({ width: 30, height: 16 });

export const ROOM_FOOTPRINTS = Object.freeze({
  small_square: { width: 22, height: 13 },
  cross_hall: { width: 24, height: 14 },
  pillars: { width: 24, height: 14 },
  trap_corridor: { width: 25, height: 13 },
  two_arenas: { width: 26, height: 14 },
  machine_room: { width: 26, height: 15 },
  ring_arena: { width: 25, height: 15 },
  elite_square: { width: 27, height: 15 },
  boss_arena: BOSS_ROOM_FOOTPRINT,
});
