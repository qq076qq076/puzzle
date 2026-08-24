export const ROOM_BOUNDS = {
  left: 56,
  right: 904,
  top: 92,
  bottom: 488,
};

export const ENTRY_POINT = [92, 290];
export const ENTRY_SPAWN_POINT = [18, 290];
export const ENTRY_DOOR_POINT = [40, 290];
// The trigger sits beyond the exit door so a transition requires physically
// crossing the doorway rather than confirming from inside the room.
export const EXIT_POINT = [876, 290];
export const EXIT_DOOR_POINT = [920, 290];
export const EXIT_TRIGGER_POINT = [930, 290];

export const ROOM_SIDES = Object.freeze(["left", "right", "up", "down"]);

export const SIDE_VECTORS = Object.freeze({
  left: Object.freeze([-1, 0]),
  right: Object.freeze([1, 0]),
  up: Object.freeze([0, -1]),
  down: Object.freeze([0, 1]),
});

export const ROOM_CONNECTION_POINTS = Object.freeze({
  left: Object.freeze({ inside: Object.freeze([92, 290]), outside: Object.freeze([18, 290]), door: Object.freeze([40, 290]), trigger: Object.freeze([30, 290]) }),
  right: Object.freeze({ inside: Object.freeze([868, 290]), outside: Object.freeze([942, 290]), door: Object.freeze([920, 290]), trigger: Object.freeze([930, 290]) }),
  up: Object.freeze({ inside: Object.freeze([480, 124]), outside: Object.freeze([480, 50]), door: Object.freeze([480, 76]), trigger: Object.freeze([480, 68]) }),
  down: Object.freeze({ inside: Object.freeze([480, 456]), outside: Object.freeze([480, 530]), door: Object.freeze([480, 512]), trigger: Object.freeze([480, 520]) }),
});

export function getOppositeSide(side) {
  return { left: "right", right: "left", up: "down", down: "up" }[side] || "right";
}

export function getSideVector(side) {
  return SIDE_VECTORS[side] || SIDE_VECTORS.right;
}

const SAFE_SPAWNS = [
  [232, 142],
  [728, 142],
  [232, 438],
  [728, 438],
  [480, 122],
  [480, 458],
];

export const ROOM_TEMPLATES = [
  {
    id: "small_square",
    name: "小型石室",
    shape: "compact",
    theme: "fantasy",
    obstacles: [],
    trapPoints: [],
    spawnPoints: SAFE_SPAWNS.slice(0, 4),
  },
  {
    id: "cross_hall",
    name: "十字廊道",
    shape: "cross",
    theme: "fantasy",
    obstacles: [[390, 132, 180, 34], [390, 406, 180, 34]],
    trapPoints: [[480, 290]],
    spawnPoints: SAFE_SPAWNS.slice(0, 4),
  },
  {
    id: "pillars",
    name: "石柱庭院",
    shape: "notched",
    theme: "fantasy",
    boundaryObstacles: [[56, 92, 88, 52], [816, 92, 88, 52], [56, 436, 88, 52], [816, 436, 88, 52]],
    obstacles: [[280, 166, 44, 44], [680, 166, 44, 44], [280, 370, 44, 44], [680, 370, 44, 44]],
    trapPoints: [[480, 170], [480, 410]],
    spawnPoints: SAFE_SPAWNS.slice(0, 4),
  },
  {
    id: "trap_corridor",
    name: "陷阱庫房",
    shape: "narrow",
    theme: "fantasy",
    obstacles: [[350, 132, 180, 30], [350, 406, 180, 30], [300, 254, 32, 72], [628, 254, 32, 72]],
    trapPoints: [[400, 290], [560, 290], [480, 190], [480, 390]],
    spawnPoints: SAFE_SPAWNS.slice(0, 4),
  },
  {
    id: "two_arenas",
    name: "雙重競技場",
    shape: "split",
    theme: "fantasy",
    boundaryObstacles: [[56, 92, 116, 44], [788, 92, 116, 44], [56, 444, 116, 44], [788, 444, 116, 44]],
    obstacles: [[448, 122, 64, 105], [448, 353, 64, 105]],
    trapPoints: [[350, 290], [610, 290]],
    spawnPoints: SAFE_SPAWNS.slice(0, 4),
  },
  {
    id: "machine_room",
    name: "機械污染區",
    shape: "wide",
    theme: "machine",
    obstacles: [[250, 156, 128, 34], [582, 156, 128, 34], [250, 352, 128, 34], [582, 352, 128, 34]],
    trapPoints: [[420, 290], [540, 290]],
    spawnPoints: SAFE_SPAWNS.slice(0, 6),
    machineDecor: [[180, 180], [780, 180], [180, 400], [780, 400]],
  },
  {
    id: "ring_arena",
    name: "環形走廊",
    shape: "ring",
    theme: "machine",
    obstacles: [[340, 140, 280, 28], [340, 400, 280, 28], [300, 190, 28, 188], [632, 190, 28, 188]],
    trapPoints: [[480, 122], [480, 458], [230, 290], [730, 290]],
    spawnPoints: SAFE_SPAWNS.slice(0, 6),
    machineDecor: [[170, 180], [790, 180], [170, 400], [790, 400]],
  },
  {
    id: "elite_square",
    name: "王座前庭",
    shape: "fortified",
    theme: "machine",
    obstacles: [[260, 154, 64, 64], [636, 154, 64, 64], [260, 346, 64, 64], [636, 346, 64, 64]],
    trapPoints: [[390, 290], [570, 290], [480, 230], [480, 350]],
    spawnPoints: SAFE_SPAWNS.slice(0, 6),
    machineDecor: [[150, 150], [810, 150], [150, 430], [810, 430]],
  },
];
