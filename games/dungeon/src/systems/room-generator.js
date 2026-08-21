import { BUFF_POOL_BY_ROOM } from "../data/buffs.js";
import { MONSTERS, NORMAL_MONSTER_POOLS } from "../data/monsters.js";
import { ROOM_TEMPLATES } from "../data/rooms.js";
import { createRng } from "./rng.js";

const THREAT_BUDGETS = [6, 9, 13, 17, 23];

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
  return Array.from({ length: 6 }, (_, roomIndex) => generateRoom(runSeed, roomIndex));
}

export function generateRoom(runSeed, roomIndex) {
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
      rewardIds: ["boss_trophy"],
      obstacles: [],
      spawnPoints: [[150, 135], [810, 135], [150, 405], [810, 405]],
    };
  }

  const template = chooseTemplate(rng, roomIndex);
  const budget = THREAT_BUDGETS[roomIndex];
  const enemyPlan = generateEnemyPlan(rng, roomIndex, budget, template.spawnPoints.length);
  const rewardPool = BUFF_POOL_BY_ROOM[roomIndex];
  const rewardIds = pickUnique(rng, rewardPool, Math.min(3, rewardPool.length));
  return {
    roomIndex,
    roomNumber: roomIndex + 1,
    type: "normal",
    templateId: template.id,
    theme: template.theme,
    name: template.name,
    threatBudget: budget,
    enemies: enemyPlan,
    rewardIds,
    obstacles: template.obstacles,
    spawnPoints: template.spawnPoints,
  };
}

function chooseTemplate(rng, roomIndex) {
  const pool = ROOM_TEMPLATES.filter((template) => roomIndex < 3 || template.theme === "machine" || template.id === "pillars" || template.id === "trap_corridor");
  return rng.pick(pool.length ? pool : ROOM_TEMPLATES);
}

function generateEnemyPlan(rng, roomIndex, budget, spawnPointCount) {
  const pool = NORMAL_MONSTER_POOLS[roomIndex];
  const plan = [];
  let remaining = budget;
  let sequence = 0;
  while (remaining > 0 && plan.length < 12) {
    const candidates = pool.filter((id) => MONSTERS[id].threat <= remaining);
    if (!candidates.length) break;
    const id = rng.pick(candidates);
    plan.push({ id, spawnIndex: sequence % Math.max(1, spawnPointCount), delayMs: sequence * 180 });
    remaining -= MONSTERS[id].threat;
    sequence += 1;
  }
  if (!plan.length) plan.push({ id: pool[0], spawnIndex: 0, delayMs: 0 });
  return plan;
}
