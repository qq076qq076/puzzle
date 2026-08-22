import { BUFF_POOL_BY_ROOM } from "../data/buffs.js";
import { MONSTERS, NORMAL_MONSTER_POOLS } from "../data/monsters.js";
import { ENTRY_POINT, EXIT_POINT, ROOM_BOUNDS, ROOM_TEMPLATES } from "../data/rooms.js";
import { createRng } from "./rng.js";

export const THREAT_BUDGETS = [6, 9, 13, 17, 23];
export const WAVE_COUNTS = [1, 2, 2, 3, 3];

function pickUnique(rng, values, count) {
  const remaining = [...values];
  const result = [];
  while (remaining.length > 0 && result.length < count) {
    const index = rng.int(0, remaining.length - 1);
    result.push(remaining.splice(index, 1)[0]);
  }
  return result;
}

export function generateFloor(runSeed) {
  let previousTemplateId = null;
  return Array.from({ length: 6 }, (_, roomIndex) => {
    const room = generateRoom(runSeed, roomIndex, previousTemplateId);
    previousTemplateId = room.templateId;
    return room;
  });
}

export function generateRoom(runSeed, roomIndex, previousTemplateId = null) {
  const rng = createRng(`${runSeed}:room:${roomIndex}`);
  if (roomIndex === 5) {
    return {
      roomIndex,
      roomNumber: 6,
      type: "boss",
      templateId: "boss_arena",
      theme: "machine",
      name: "骨面機械王座",
      enemies: [],
      waves: [],
      rewardIds: ["boss_trophy"],
      obstacles: [[208, 164, 48, 48], [752, 164, 48, 48], [208, 372, 48, 48], [752, 372, 48, 48]],
      trapPoints: [[350, 290], [610, 290]],
      machineDecor: [[150, 150], [810, 150], [150, 430], [810, 430]],
      spawnPoints: [[232, 142], [728, 142], [232, 438], [728, 438]],
      entry: [480, 438],
      exit: [480, 102],
      validation: { valid: true, path: true, safeSpawns: true, area: true },
    };
  }

  const template = chooseTemplate(rng, roomIndex, previousTemplateId);
  const threatBudget = THREAT_BUDGETS[roomIndex];
  const enemies = generateEnemyPlan(rng, roomIndex, threatBudget, template.spawnPoints.length);
  const waves = splitIntoWaves(enemies, WAVE_COUNTS[roomIndex]);
  const rewardIds = pickUnique(rng, BUFF_POOL_BY_ROOM[roomIndex], 3);
  const room = {
    roomIndex,
    roomNumber: roomIndex + 1,
    type: "normal",
    templateId: template.id,
    theme: template.theme,
    name: template.name,
    threatBudget,
    enemies,
    waves,
    rewardIds,
    obstacles: template.obstacles,
    trapPoints: template.trapPoints,
    machineDecor: template.machineDecor || [],
    spawnPoints: template.spawnPoints,
    entry: ENTRY_POINT,
    exit: EXIT_POINT,
  };
  room.validation = validateRoom(room);
  if (!room.validation.valid) return generateFallbackRoom(runSeed, roomIndex, rng, previousTemplateId);
  return room;
}

function generateFallbackRoom(runSeed, roomIndex, rng, previousTemplateId = null) {
  const candidates = ROOM_TEMPLATES.filter((template) => {
    if (template.id === previousTemplateId) return false;
    return validateRoom({
      entry: ENTRY_POINT,
      exit: EXIT_POINT,
      obstacles: template.obstacles,
      trapPoints: template.trapPoints,
      spawnPoints: template.spawnPoints,
    }).valid;
  });
  const template = rng.pick(candidates.length ? candidates : ROOM_TEMPLATES);
  const enemies = generateEnemyPlan(rng, roomIndex, THREAT_BUDGETS[roomIndex], template.spawnPoints.length);
  const room = {
    roomIndex,
    roomNumber: roomIndex + 1,
    type: "normal",
    templateId: template.id,
    theme: template.theme,
    name: template.name,
    threatBudget: THREAT_BUDGETS[roomIndex],
    enemies,
    waves: splitIntoWaves(enemies, WAVE_COUNTS[roomIndex]),
    rewardIds: [BUFF_POOL_BY_ROOM[roomIndex][0], "minor_heal", "gold_cache"],
    obstacles: template.obstacles,
    trapPoints: template.trapPoints,
    machineDecor: template.machineDecor || [],
    spawnPoints: template.spawnPoints,
    entry: ENTRY_POINT,
    exit: EXIT_POINT,
  };
  room.validation = validateRoom(room);
  return room;
}

function chooseTemplate(rng, roomIndex, previousTemplateId = null) {
  const pool = roomIndex === 0
    ? ROOM_TEMPLATES.filter((template) => ["small_square", "cross_hall"].includes(template.id))
    : roomIndex === 1
      ? ROOM_TEMPLATES.filter((template) => ["cross_hall", "trap_corridor", "pillars"].includes(template.id))
      : roomIndex === 2
        ? ROOM_TEMPLATES.filter((template) => ["pillars", "two_arenas", "trap_corridor"].includes(template.id))
        : roomIndex === 3
          ? ROOM_TEMPLATES.filter((template) => ["machine_room", "ring_arena", "pillars"].includes(template.id))
          : ROOM_TEMPLATES.filter((template) => ["machine_room", "ring_arena", "elite_square", "two_arenas"].includes(template.id));
  const candidates = pool.filter((template) => template.id !== previousTemplateId);
  return rng.pick(candidates.length ? candidates : pool);
}

function generateEnemyPlan(rng, roomIndex, budget, spawnPointCount) {
  const pool = NORMAL_MONSTER_POOLS[roomIndex];
  const minimumEnemyCount = WAVE_COUNTS[roomIndex];
  const minimumThreat = Math.min(...pool.map((id) => MONSTERS[id].threat));
  const plan = [];
  let remaining = budget;
  let sequence = 0;
  while (remaining > 0 && plan.length < 12) {
    const candidates = pool.filter((id) => MONSTERS[id].threat <= remaining);
    if (!candidates.length) break;
    const viableCandidates = candidates.filter((id) => {
      const remainingAfterPick = remaining - MONSTERS[id].threat;
      const slotsLeft = Math.max(0, minimumEnemyCount - (plan.length + 1));
      return remainingAfterPick >= slotsLeft * minimumThreat;
    });
    const id = rng.pick(viableCandidates.length ? viableCandidates : candidates);
    plan.push({
      id,
      spawnIndex: sequence % Math.max(1, spawnPointCount),
      delayMs: sequence * 160,
      threat: MONSTERS[id].threat,
    });
    remaining -= MONSTERS[id].threat;
    sequence += 1;
  }
  if (!plan.length) plan.push({ id: pool[0], spawnIndex: 0, delayMs: 0, threat: MONSTERS[pool[0]].threat });
  return plan;
}

function splitIntoWaves(enemies, requestedWaveCount) {
  const waveCount = Math.max(1, Math.min(requestedWaveCount, enemies.length));
  const waves = Array.from({ length: waveCount }, (_, index) => ({ index, enemies: [] }));
  enemies.forEach((enemy, index) => {
    waves[index % waveCount].enemies.push({ ...enemy, delayMs: (waves[index % waveCount].enemies.length) * 260 });
  });
  return waves;
}

function pointWalkable(x, y, obstacles, padding = 18) {
  if (x < ROOM_BOUNDS.left + padding || x > ROOM_BOUNDS.right - padding || y < ROOM_BOUNDS.top + padding || y > ROOM_BOUNDS.bottom - padding) return false;
  return !obstacles.some(([ox, oy, width, height]) => x >= ox - padding && x <= ox + width + padding && y >= oy - padding && y <= oy + height + padding);
}

function hasGridPath(start, goal, obstacles) {
  const step = 28;
  const toGrid = ([x, y]) => [Math.round(x / step), Math.round(y / step)];
  const startGrid = toGrid(start);
  const goalGrid = toGrid(goal);
  const queue = [startGrid];
  const visited = new Set([startGrid.join(",")]);
  while (queue.length) {
    const [x, y] = queue.shift();
    if (x === goalGrid[0] && y === goalGrid[1]) return true;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const next = [x + dx, y + dy];
      const key = next.join(",");
      if (visited.has(key)) continue;
      const point = [next[0] * step, next[1] * step];
      if (!pointWalkable(point[0], point[1], obstacles, 12)) continue;
      visited.add(key);
      queue.push(next);
    }
  }
  return false;
}

export function validateRoom(room) {
  const path = hasGridPath(room.entry, room.exit, room.obstacles);
  const safeSpawns = room.spawnPoints.every((point) =>
    pointWalkable(point[0], point[1], room.obstacles, 10) && Math.hypot(point[0] - room.entry[0], point[1] - room.entry[1]) >= 192,
  );
  const trapSafe = room.trapPoints.every((point) => pointWalkable(point[0], point[1], room.obstacles, 2));
  const area = estimateWalkableArea(room.obstacles) >= 0.6;
  return { valid: path && safeSpawns && trapSafe && area, path, safeSpawns, trapSafe, area };
}

function estimateWalkableArea(obstacles) {
  const cell = 24;
  let walkable = 0;
  let total = 0;
  for (let y = ROOM_BOUNDS.top; y <= ROOM_BOUNDS.bottom; y += cell) {
    for (let x = ROOM_BOUNDS.left; x <= ROOM_BOUNDS.right; x += cell) {
      total += 1;
      if (pointWalkable(x, y, obstacles, 0)) walkable += 1;
    }
  }
  return total ? walkable / total : 0;
}
