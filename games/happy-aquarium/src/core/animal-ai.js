import { GAME_HEIGHT, GAME_WIDTH, PERSONALITY_BY_ID, SPECIES_BY_ID } from "../config/game-config.js";
import { foodSatietyGain } from "./calculations.js";

const WATER = { left: 40, right: 960, top: 75, bottom: 550 };
const HELPER_PATROL = { left: 55, right: 945, floor: 512, bob: 4 };
const FOOD_SEEK_SPEED_MULTIPLIER = 1.35;

export function createAgent(fish) {
  const species = SPECIES_BY_ID[fish.speciesId];
  const seed = (fish.behaviorSeed || 1) >>> 0;
  const x = (fish.position?.x ?? 0.5) * GAME_WIDTH;
  const y = (fish.position?.y ?? 0.5) * GAME_HEIGHT;
  return {
    id: fish.id,
    speciesId: fish.speciesId,
    personalityId: fish.personalityId,
    preferredFoodTypeId: fish.preferredFoodTypeId,
    x,
    y,
    vx: species?.movement.maxSpeed * (fish.heading === "left" ? -0.6 : 0.6) || 20,
    vy: 0,
    targetX: x,
    targetY: y,
    retargetIn: 0,
    seed,
    facing: fish.heading === "left" ? -1 : 1,
    facingTimer: 0,
    foodTargetId: null,
    foodSatiety: Number(fish.satiety) || 0,
    lastObservedSatiety: Number(fish.satiety) || 0,
  };
}

export function createHelperAgent(helper) {
  const seed = (helper.behaviorSeed || 1) >>> 0;
  return {
    x: (helper.position?.x ?? 0.5) * GAME_WIDTH,
    y: (helper.position?.y ?? 0.86) * GAME_HEIGHT,
    direction: seed % 2 === 0 ? 1 : -1,
    phase: (seed % 628) / 100,
  };
}

export function stepHelperAgent(agent, speed, dt, timeSeconds = 0) {
  agent.x += agent.direction * speed * dt;
  if (agent.x <= HELPER_PATROL.left || agent.x >= HELPER_PATROL.right) {
    agent.x = Math.max(HELPER_PATROL.left, Math.min(HELPER_PATROL.right, agent.x));
    agent.direction *= -1;
  }
  agent.y = HELPER_PATROL.floor + Math.sin(timeSeconds + agent.phase) * HELPER_PATROL.bob;
  return agent;
}

export function stepAgents(agents, fishById, foodsOrDt, maybeDt) {
  const foods = Array.isArray(foodsOrDt) ? foodsOrDt : [];
  const dt = Array.isArray(foodsOrDt) ? maybeDt : foodsOrDt;
  const grid = buildGrid(agents, 96);
  const consumed = [];
  for (const agent of agents) {
    const fish = fishById.get(agent.id);
    const config = SPECIES_BY_ID[agent.speciesId];
    if (!fish || !config || fish.health === "dead" || fish.stage === "egg") continue;
    if (agent.lastObservedSatiety !== fish.satiety) {
      agent.foodSatiety = Number(fish.satiety) || 0;
      agent.lastObservedSatiety = Number(fish.satiety) || 0;
    }
    const foodTarget = updateFoodTarget(agent, fish, foods, config);
    agent.retargetIn -= dt;
    if (foodTarget) {
      agent.targetX = foodTarget.x;
      agent.targetY = foodTarget.y;
    } else if (agent.retargetIn <= 0) {
      chooseTarget(agent, config);
    }
    const personality = PERSONALITY_BY_ID[fish.personalityId];
    const stageSpeedFactor = fish.stage === "fry" ? 0.85 : fish.stage === "juvenile" ? 0.95 : 1;
    const behaviorSpeedFactor = foodTarget ? FOOD_SEEK_SPEED_MULTIPLIER : fish.satiety < 25 ? 0.72 : 1;
    const speedFactor = fish.health === "sick" ? 0.35 : stageSpeedFactor * behaviorSpeedFactor;
    const maxSpeed = Math.max(8, config.movement.maxSpeed * speedFactor * (personality?.speedMultiplier || 1));
    let ax = (agent.targetX - agent.x) * 0.35;
    let ay = (agent.targetY - agent.y) * 0.35;
    for (const neighbor of nearby(grid, agent, 96)) {
      if (neighbor === agent) continue;
      const dx = agent.x - neighbor.x;
      const dy = agent.y - neighbor.y;
      const distanceSq = dx * dx + dy * dy;
      if (distanceSq > 0 && distanceSq < 52 * 52) {
        const force = 1 - Math.sqrt(distanceSq) / 52;
        ax += dx * force * 2.2;
        ay += dy * force * 2.2;
      }
    }
    if (agent.x < WATER.left + 70) ax += (WATER.left + 70 - agent.x) * 0.8;
    if (agent.x > WATER.right - 70) ax -= (agent.x - WATER.right + 70) * 0.8;
    if (agent.y < WATER.top + 50) ay += (WATER.top + 50 - agent.y) * 0.8;
    if (agent.y > WATER.bottom - 50) ay -= (agent.y - WATER.bottom + 50) * 0.8;
    const maxAcceleration = maxSpeed * 1.6;
    const accelerationLength = Math.hypot(ax, ay) || 1;
    if (accelerationLength > maxAcceleration) {
      ax = ax / accelerationLength * maxAcceleration;
      ay = ay / accelerationLength * maxAcceleration;
    }
    agent.vx += ax * dt;
    agent.vy += ay * dt;
    const velocityLength = Math.hypot(agent.vx, agent.vy) || 1;
    if (velocityLength > maxSpeed) {
      agent.vx = agent.vx / velocityLength * maxSpeed;
      agent.vy = agent.vy / velocityLength * maxSpeed;
    }
    agent.x = Math.max(WATER.left, Math.min(WATER.right, agent.x + agent.vx * dt));
    agent.y = Math.max(WATER.top, Math.min(WATER.bottom, agent.y + agent.vy * dt));
    const desiredFacing = agent.vx < -8 ? -1 : agent.vx > 8 ? 1 : agent.facing;
    agent.facingTimer = desiredFacing === agent.facing ? 0 : agent.facingTimer + dt;
    if (agent.facingTimer >= 0.15) {
      agent.facing = desiredFacing;
      agent.facingTimer = 0;
    }
  }
  resolveFoodArrivals(agents, fishById, foods, consumed);
  return consumed;
}

function updateFoodTarget(agent, fish, foods, config) {
  const canEat = canPursueFood(fish, agent.foodSatiety);
  let target = foods.find((food) => food.id === agent.foodTargetId && !food.consumed);
  if (!canEat) {
    agent.foodTargetId = null;
    target = null;
  }
  if (!canEat) return null;
  if (!target) {
    const candidates = foods
      .filter((food) => !food.consumed)
      .sort((left, right) => foodScore(agent, left, config) - foodScore(agent, right, config) || left.id.localeCompare(right.id));
    target = candidates[0] || null;
    if (target) {
      agent.foodTargetId = target.id;
    }
  }
  return target;
}

function foodScore(agent, food, config) {
  const preference = food.foodTypeId === agent.preferredFoodTypeId ? 0.75 : 1;
  return Math.hypot(agent.x - food.x, agent.y - food.y) / Math.max(8, config.movement.maxSpeed) * preference;
}

function resolveFoodArrivals(agents, fishById, foods, consumed) {
  const virtualSatiety = new Map(agents.map((agent) => [agent.id, agent.foodSatiety]));
  for (const food of foods) {
    if (food.consumed) continue;
    const arrivals = agents
      .filter((agent) => {
        const fish = fishById.get(agent.id);
        return canPursueFood(fish, virtualSatiety.get(agent.id)) && Math.hypot(agent.x - food.x, agent.y - food.y) < 18;
      })
      .sort((left, right) => Math.hypot(left.x - food.x, left.y - food.y) - Math.hypot(right.x - food.x, right.y - food.y) || left.id.localeCompare(right.id));
    const winner = arrivals[0];
    if (!winner) continue;
    food.consumed = true;
    consumed.push({ foodId: food.id, fishId: winner.id });
    const fish = fishById.get(winner.id);
    const nextSatiety = Math.min(100, virtualSatiety.get(winner.id) + foodSatietyGain(food.foodTypeId, fish.speciesId, fish.preferredFoodTypeId));
    virtualSatiety.set(winner.id, nextSatiety);
    winner.foodSatiety = nextSatiety;
    for (const agent of agents) if (agent.foodTargetId === food.id) agent.foodTargetId = null;
  }
}

function canPursueFood(fish, satiety = fish?.satiety) {
  return Boolean(fish && fish.health === "healthy" && fish.stage !== "egg" && satiety < 50);
}

function chooseTarget(agent, config) {
  agent.seed = xorshift(agent.seed);
  const rx = agent.seed / 0x1_0000_0000;
  agent.seed = xorshift(agent.seed);
  const ry = agent.seed / 0x1_0000_0000;
  agent.targetX = WATER.left + 70 + rx * (WATER.right - WATER.left - 140);
  agent.targetY = GAME_HEIGHT * (config.movement.depthMin + ry * (config.movement.depthMax - config.movement.depthMin));
  const retargetMultiplier = PERSONALITY_BY_ID[agent.personalityId]?.retargetMultiplier || 1;
  agent.retargetIn = (2 + rx * 3) * retargetMultiplier;
}

function buildGrid(agents, size) {
  const grid = new Map();
  for (const agent of agents) {
    const key = `${Math.floor(agent.x / size)},${Math.floor(agent.y / size)}`;
    if (!grid.has(key)) grid.set(key, []);
    grid.get(key).push(agent);
  }
  return grid;
}

function nearby(grid, agent, size) {
  const result = [];
  const cx = Math.floor(agent.x / size);
  const cy = Math.floor(agent.y / size);
  for (let y = cy - 1; y <= cy + 1; y += 1) {
    for (let x = cx - 1; x <= cx + 1; x += 1) result.push(...(grid.get(`${x},${y}`) || []));
  }
  return result;
}

function xorshift(value) {
  let next = value || 0x9e3779b9;
  next ^= next << 13;
  next ^= next >>> 17;
  next ^= next << 5;
  return next >>> 0 || 0x9e3779b9;
}
