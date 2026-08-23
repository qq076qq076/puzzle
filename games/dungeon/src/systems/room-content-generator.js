import { BUFF_POOL_BY_ROOM } from "../data/buffs.js";
import { MONSTERS, NORMAL_MONSTER_POOLS } from "../data/monsters.js";
import { ROOM_TEMPLATES } from "../data/rooms.js";
import { createRng } from "./rng.js";

export const THREAT_BUDGETS = [14, 24, 34, 54, 78];
export const ENEMY_COUNTS = [4, 5, 6, 8, 10];
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

export function getRoomTemplatePool(roomIndex) {
  if (roomIndex === 0) return ROOM_TEMPLATES.filter((template) => ["small_square", "cross_hall"].includes(template.id));
  if (roomIndex === 1) return ROOM_TEMPLATES.filter((template) => ["cross_hall", "trap_corridor", "pillars"].includes(template.id));
  if (roomIndex === 2) return ROOM_TEMPLATES.filter((template) => ["pillars", "two_arenas", "trap_corridor"].includes(template.id));
  if (roomIndex === 3) return ROOM_TEMPLATES.filter((template) => ["machine_room", "ring_arena", "pillars"].includes(template.id));
  return ROOM_TEMPLATES.filter((template) => ["machine_room", "ring_arena", "elite_square", "two_arenas"].includes(template.id));
}

export function chooseRoomTemplate(rng, roomIndex, previousTemplateId = null) {
  const pool = getRoomTemplatePool(roomIndex);
  const candidates = pool.filter((template) => template.id !== previousTemplateId);
  return rng.pick(candidates.length ? candidates : pool);
}

export function generateEnemyPlan(rng, roomIndex, budget, spawnPointCount, targetEnemyCount) {
  const pool = NORMAL_MONSTER_POOLS[roomIndex];
  const minimumThreat = Math.min(...pool.map((id) => MONSTERS[id].threat));
  const plan = [];
  let remaining = budget;
  let sequence = 0;
  while (remaining > 0 && plan.length < targetEnemyCount) {
    const candidates = pool.filter((id) => MONSTERS[id].threat <= remaining);
    if (!candidates.length) break;
    const viableCandidates = candidates.filter((id) => {
      const remainingAfterPick = remaining - MONSTERS[id].threat;
      const slotsLeft = Math.max(0, targetEnemyCount - (plan.length + 1));
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

export function splitIntoWaves(enemies, requestedWaveCount) {
  const waveCount = Math.max(1, Math.min(requestedWaveCount, enemies.length));
  const waves = Array.from({ length: waveCount }, (_, index) => ({ index, enemies: [] }));
  enemies.forEach((enemy, index) => {
    const wave = waves[index % waveCount];
    wave.enemies.push({ ...enemy, delayMs: wave.enemies.length * 260 });
  });
  return waves;
}

export function generateRoomContent(runSeed, roomIndex, previousTemplateId = null) {
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
    };
  }

  const rng = createRng(`${runSeed}:room:${roomIndex}:content`);
  const template = chooseRoomTemplate(rng, roomIndex, previousTemplateId);
  const threatBudget = THREAT_BUDGETS[roomIndex];
  const enemies = generateEnemyPlan(rng, roomIndex, threatBudget, template.spawnPoints.length, ENEMY_COUNTS[roomIndex]);
  return {
    roomIndex,
    roomNumber: roomIndex + 1,
    type: "normal",
    templateId: template.id,
    theme: template.theme,
    name: template.name,
    threatBudget,
    enemies,
    waves: splitIntoWaves(enemies, WAVE_COUNTS[roomIndex]),
    rewardIds: pickUnique(rng, BUFF_POOL_BY_ROOM[roomIndex], 3),
  };
}
