export const ROOM_BOUNDS = {
  left: 56,
  right: 904,
  top: 92,
  bottom: 488,
};

export const ENTRY_POINT = [92, 290];
export const EXIT_POINT = [868, 290];

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
    theme: "fantasy",
    obstacles: [],
    trapPoints: [],
    spawnPoints: SAFE_SPAWNS.slice(0, 4),
  },
  {
    id: "cross_hall",
    name: "十字廊道",
    theme: "fantasy",
    obstacles: [[390, 132, 180, 34], [390, 406, 180, 34]],
    trapPoints: [[480, 290]],
    spawnPoints: SAFE_SPAWNS.slice(0, 4),
  },
  {
    id: "pillars",
    name: "石柱庭院",
    theme: "fantasy",
    obstacles: [[280, 166, 44, 44], [680, 166, 44, 44], [280, 370, 44, 44], [680, 370, 44, 44]],
    trapPoints: [[480, 170], [480, 410]],
    spawnPoints: SAFE_SPAWNS.slice(0, 4),
  },
  {
    id: "trap_corridor",
    name: "陷阱庫房",
    theme: "fantasy",
    obstacles: [[350, 132, 180, 30], [350, 406, 180, 30], [300, 254, 32, 72], [628, 254, 32, 72]],
    trapPoints: [[400, 290], [560, 290], [480, 190], [480, 390]],
    spawnPoints: SAFE_SPAWNS.slice(0, 4),
  },
  {
    id: "two_arenas",
    name: "雙重競技場",
    theme: "fantasy",
    obstacles: [[448, 122, 64, 105], [448, 353, 64, 105]],
    trapPoints: [[350, 290], [610, 290]],
    spawnPoints: SAFE_SPAWNS.slice(0, 4),
  },
  {
    id: "machine_room",
    name: "機械污染區",
    theme: "machine",
    obstacles: [[250, 156, 128, 34], [582, 156, 128, 34], [250, 352, 128, 34], [582, 352, 128, 34]],
    trapPoints: [[420, 290], [540, 290]],
    spawnPoints: SAFE_SPAWNS.slice(0, 6),
    machineDecor: [[180, 180], [780, 180], [180, 400], [780, 400]],
  },
  {
    id: "ring_arena",
    name: "環形走廊",
    theme: "machine",
    obstacles: [[340, 140, 280, 28], [340, 400, 280, 28], [300, 190, 28, 188], [632, 190, 28, 188]],
    trapPoints: [[480, 122], [480, 458], [230, 290], [730, 290]],
    spawnPoints: SAFE_SPAWNS.slice(0, 6),
    machineDecor: [[170, 180], [790, 180], [170, 400], [790, 400]],
  },
  {
    id: "elite_square",
    name: "王座前庭",
    theme: "machine",
    obstacles: [[260, 154, 64, 64], [636, 154, 64, 64], [260, 346, 64, 64], [636, 346, 64, 64]],
    trapPoints: [[390, 290], [570, 290], [480, 230], [480, 350]],
    spawnPoints: SAFE_SPAWNS.slice(0, 6),
    machineDecor: [[150, 150], [810, 150], [150, 430], [810, 430]],
  },
];
