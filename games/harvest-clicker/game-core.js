(function (globalThis) {
"use strict";

const BOARD_SIZE = 15;
const PLOT_GRID_SIZE = BOARD_SIZE / 3;
const INITIAL_PLOT_ID = 12;
const INITIAL_PLOT_IDS = [12, 7, 13, 17, 11];
const SAVE_VERSION = 3;

const PLANTS = [
  { id: "weed", name: "雜草", emoji: "🌿", image: null, seedCost: 0, hp: 1, coins: 1, growSeconds: 30, color: "#81985b" },
  { id: "clover", name: "白花苜蓿", emoji: "☘️", image: "lettuce-head.png", seedCost: 18, hp: 2, coins: 4, growSeconds: 60, color: "#77a65c" },
  { id: "tomato", name: "樁架番茄", emoji: "🍅", image: "tomato-plant-staked.png", seedCost: 90, hp: 4, coins: 15, growSeconds: 180, color: "#d65243" },
  { id: "wheat", name: "金穗小麥", emoji: "🌾", image: "wheat-stalk.png", seedCost: 420, hp: 8, coins: 65, growSeconds: 480, color: "#e0b94f" },
  { id: "berry", name: "紅莓叢", emoji: "🍓", image: "strawberry-plant.png", seedCost: 1900, hp: 15, coins: 290, growSeconds: 1200, color: "#cf4c56" },
  { id: "pumpkin", name: "月光南瓜", emoji: "🎃", image: "pumpkin-patch.png", seedCost: 8500, hp: 30, coins: 1250, growSeconds: 2700, color: "#d6a34c" },
  { id: "lavender", name: "紫晶薰衣草", emoji: "🪻", image: "lavender-bush.png", seedCost: 40000, hp: 60, coins: 6000, growSeconds: 7200, color: "#9475bd" },
  { id: "pepper", name: "赤焰火椒", emoji: "🌶️", image: "pepper-plant.png", seedCost: 190000, hp: 110, coins: 29000, growSeconds: 21600, color: "#d85043" },
  { id: "starfruit", name: "星輝果", emoji: "🌻", image: "sunflower-row.png", seedCost: 950000, hp: 220, coins: 145000, growSeconds: 64800, color: "#e7c74b" }
];

const TOOLS = [
  { id: "small_knife", name: "小刀", emoji: "🔪", image: "vegetable-peeler.png", cost: 0, damage: 1, shape: "single", cells: 1, regrowth: 1, unlock: { type: "initial", value: 0 } },
  { id: "garden_shears", name: "園藝剪", emoji: "✂️", image: "pruning-shears.png", cost: 45, damage: 2, shape: "single", cells: 1, regrowth: 1, unlock: { type: "harvested", value: 20 } },
  { id: "machete", name: "尖頭鏟", emoji: "♠️", image: "garden-spade.png", cost: 280, damage: 5, shape: "single", cells: 1, regrowth: 1, unlock: { type: "harvested", value: 80 } },
  { id: "short_sickle", name: "短柄鐮刀", emoji: "⚒️", image: "farm-scythe.png", cost: 1800, damage: 4, shape: "row3", cells: 3, regrowth: 1, unlock: { type: "harvested", value: 200 } },
  { id: "long_sickle", name: "長柄鋤", emoji: "🛠️", image: "garden-hoe.png", cost: 12000, damage: 7, shape: "cross", cells: 5, regrowth: 0.95, unlock: { type: "harvested", value: 600 } },
  { id: "rotary_cutter", name: "銅製十字鎬", emoji: "⛏️", image: "copper-pickaxe.png", cost: 85000, damage: 12, shape: "square3", cells: 9, regrowth: 0.9, unlock: { type: "plots", value: 9 } },
  { id: "steel_harvester", name: "精鋼鋤", emoji: "🛠️", image: "iron-hoe.png", cost: 650000, damage: 25, shape: "square3", cells: 9, regrowth: 0.75, unlock: { type: "harvested", value: 5000 } },
  { id: "prosperity_blade", name: "聯合收割機", emoji: "🚜", image: "combine-harvester.png", cost: 6000000, damage: 60, shape: "square5", cells: 25, regrowth: 0.6, unlock: { type: "plots", value: 19 } }
];

const PLOTS = [
  { id: 12, name: "中央田", cost: 0 },
  { id: 7, name: "北方田", cost: 0 },
  { id: 13, name: "東方田", cost: 0 },
  { id: 17, name: "南方田", cost: 0 },
  { id: 11, name: "西方田", cost: 0 },
  { id: 8, name: "東北內田", cost: 1200 },
  { id: 18, name: "東南內田", cost: 5000 },
  { id: 16, name: "西南內田", cost: 20000 },
  { id: 6, name: "西北內田", cost: 80000 },
  { id: 2, name: "最北田", cost: 300000 },
  { id: 14, name: "最東田", cost: 1200000 },
  { id: 22, name: "最南田", cost: 5000000 },
  { id: 10, name: "最西田", cost: 20000000 },
  { id: 1, name: "北偏西田", cost: 80000000 },
  { id: 3, name: "北偏東田", cost: 320000000 },
  { id: 4, name: "東北角田", cost: 1200000000 },
  { id: 9, name: "東側上田", cost: 4800000000 },
  { id: 19, name: "東側下田", cost: 19000000000 },
  { id: 24, name: "東南角田", cost: 75000000000 },
  { id: 23, name: "南偏東田", cost: 300000000000 },
  { id: 21, name: "南偏西田", cost: 1200000000000 },
  { id: 20, name: "西南角田", cost: 4800000000000 },
  { id: 15, name: "西側下田", cost: 19000000000000 },
  { id: 5, name: "西側上田", cost: 75000000000000 },
  { id: 0, name: "西北角田", cost: 300000000000000 }
];

const HARVESTERS = [
  { id: "clockwork", name: "發條割草機", emoji: "🦾", cost: 120000, damage: 6, intervalSeconds: 30, regrowth: 1 },
  { id: "steam", name: "蒸汽收割機", emoji: "🚜", cost: 900000, damage: 20, intervalSeconds: 15, regrowth: 0.9 },
  { id: "starcore", name: "星核聯合收割機", emoji: "🤖", cost: 8000000, damage: 75, intervalSeconds: 5, regrowth: 0.75 }
];

const SPRINKLERS = [
  { id: "drip", name: "滴灌水壺", emoji: "💧", cost: 75000, growthMultiplier: 0.8 },
  { id: "rotary", name: "旋轉灑水器", emoji: "🚿", cost: 600000, growthMultiplier: 0.6 },
  { id: "stardew", name: "星露灌溉器", emoji: "⛲", cost: 5500000, growthMultiplier: 0.4 }
];

const FERTILIZERS = [
  { id: "quick", name: "速效堆肥", emoji: "🟤", cost: 300, growthMultiplier: 0.75, coinMultiplier: 1.25, rounds: 3 },
  { id: "bounty", name: "豐收肥料", emoji: "🧺", cost: 6000, growthMultiplier: 0.6, coinMultiplier: 1.5, rounds: 5 },
  { id: "star", name: "星露精華", emoji: "💫", cost: 120000, growthMultiplier: 0.4, coinMultiplier: 2, rounds: 8 }
];

const plantById = new Map(PLANTS.map((item) => [item.id, item]));
const toolById = new Map(TOOLS.map((item) => [item.id, item]));
const harvesterById = new Map(HARVESTERS.map((item) => [item.id, item]));
const sprinklerById = new Map(SPRINKLERS.map((item) => [item.id, item]));
const fertilizerById = new Map(FERTILIZERS.map((item) => [item.id, item]));

function getPlant(id) { return plantById.get(id); }
function getTool(id) { return toolById.get(id); }
function getHarvester(id) { return harvesterById.get(id); }
function getSprinkler(id) { return sprinklerById.get(id); }
function getFertilizer(id) { return fertilizerById.get(id); }
function getProductPrice(kind, item) { return kind === "seed" ? item?.seedCost : item?.cost; }

function plotIdForIndex(index) {
  const row = Math.floor(index / BOARD_SIZE);
  const col = index % BOARD_SIZE;
  return Math.floor(row / 3) * PLOT_GRID_SIZE + Math.floor(col / 3);
}

function indexesForPlot(plotId) {
  const plotRow = Math.floor(plotId / PLOT_GRID_SIZE);
  const plotCol = plotId % PLOT_GRID_SIZE;
  const indexes = [];
  for (let y = 0; y < 3; y += 1) {
    for (let x = 0; x < 3; x += 1) {
      indexes.push((plotRow * 3 + y) * BOARD_SIZE + plotCol * 3 + x);
    }
  }
  return indexes;
}

function createInitialState(now = Date.now()) {
  return {
    schemaVersion: SAVE_VERSION,
    lastSimulatedAt: now,
    gold: 0,
    lifetimeGold: 0,
    harvestedCells: 0,
    ownedPlots: [...INITIAL_PLOT_IDS],
    equippedToolId: "small_knife",
    ownedToolIds: ["small_knife"],
    inventory: {},
    cells: Array.from({ length: BOARD_SIZE * BOARD_SIZE }, (_, index) => {
      const owned = INITIAL_PLOT_IDS.includes(plotIdForIndex(index));
      return {
        plantId: "weed",
        phase: owned ? "mature" : "growing",
        growthProgress: owned ? 1 : 0,
        currentHp: owned ? 1 : 0,
        nextGrowthMultiplier: 1,
        fertilizerId: null,
        fertilizerRounds: 0
      };
    }),
    harvesters: [],
    sprinklers: [],
    settings: { sound: true, reducedMotion: false },
    tutorialStep: 0,
    stats: { manualClicks: 0, offlineGold: 0 }
  };
}

function isAutomationUnlocked(state) {
  return state.harvestedCells >= 1500 && state.ownedPlots.length >= 9;
}

function isToolUnlocked(tool, state) {
  if (tool.unlock.type === "initial") return true;
  if (tool.unlock.type === "harvested") return state.harvestedCells >= tool.unlock.value;
  if (tool.unlock.type === "plots") return state.ownedPlots.length >= tool.unlock.value;
  return false;
}

function isPlantUnlocked(plant, state) {
  switch (plant.id) {
    case "weed": return true;
    case "clover": return state.lifetimeGold >= 15;
    case "tomato": return state.harvestedCells >= 40;
    case "wheat": return state.ownedToolIds.includes("garden_shears");
    case "berry": return state.ownedPlots.length >= 6;
    case "pumpkin": return state.ownedToolIds.includes("short_sickle");
    case "lavender": return state.ownedPlots.length >= 9;
    case "pepper": return state.ownedToolIds.includes("rotary_cutter");
    case "starfruit": return state.ownedPlots.length >= 16;
    default: return false;
  }
}

function isFertilizerUnlocked(item, state) {
  if (item.id === "quick") return Boolean(state.inventory?.seed_tomato) || state.cells.some((cell) => cell.plantId === "tomato");
  if (item.id === "bounty") return state.ownedPlots.length >= 9;
  return isAutomationUnlocked(state);
}

function offsetsForShape(shape) {
  if (shape === "row3") return [[0, -1], [0, 0], [0, 1]];
  if (shape === "cross") return [[-1, 0], [0, -1], [0, 0], [0, 1], [1, 0]];
  if (shape === "square3" || shape === "square5") {
    const radius = shape === "square3" ? 1 : 2;
    const offsets = [];
    for (let y = -radius; y <= radius; y += 1) {
      for (let x = -radius; x <= radius; x += 1) offsets.push([y, x]);
    }
    return offsets;
  }
  return [[0, 0]];
}

function getToolTargetIndexes(toolId, centerIndex, ownedPlots) {
  const tool = getTool(toolId) || TOOLS[0];
  const centerRow = Math.floor(centerIndex / BOARD_SIZE);
  const centerCol = centerIndex % BOARD_SIZE;
  const owned = new Set(ownedPlots);
  return offsetsForShape(tool.shape).map(([dy, dx]) => {
    const row = centerRow + dy;
    const col = centerCol + dx;
    return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE ? row * BOARD_SIZE + col : -1;
  }).filter((index) => index >= 0 && owned.has(plotIdForIndex(index)));
}

function awardHarvest(state, cell, regrowthMultiplier) {
  const plant = getPlant(cell.plantId) || PLANTS[0];
  const remainingRounds = Number.isInteger(cell.fertilizerRounds) ? cell.fertilizerRounds : (cell.fertilizerId ? 1 : 0);
  const fertilizer = remainingRounds > 0 && cell.fertilizerId ? getFertilizer(cell.fertilizerId) : null;
  const coins = Math.floor(plant.coins * (fertilizer?.coinMultiplier || 1));
  state.gold += coins;
  state.lifetimeGold += coins;
  state.harvestedCells += 1;
  cell.phase = "growing";
  cell.growthProgress = 0;
  cell.currentHp = 0;
  cell.nextGrowthMultiplier = regrowthMultiplier;
  if (fertilizer && remainingRounds > 1) cell.fertilizerRounds = remainingRounds - 1;
  else {
    cell.fertilizerId = null;
    cell.fertilizerRounds = 0;
  }
  return coins;
}

function manualHarvest(state, centerIndex) {
  const tool = getTool(state.equippedToolId) || TOOLS[0];
  const targets = getToolTargetIndexes(tool.id, centerIndex, state.ownedPlots);
  const results = [];
  let totalCoins = 0;
  state.stats.manualClicks += 1;
  for (const index of targets) {
    const cell = state.cells[index];
    if (!cell || cell.phase !== "mature") continue;
    cell.currentHp = Math.max(0, cell.currentHp - tool.damage);
    let coins = 0;
    if (cell.currentHp === 0) {
      coins = awardHarvest(state, cell, tool.regrowth);
      totalCoins += coins;
    }
    results.push({ index, damage: tool.damage, coins, harvested: coins > 0 });
  }
  return { targets, results, totalCoins };
}

function getSprinklerForPlot(state, plotId) {
  const placed = state.sprinklers.find((item) => item.plotId === plotId);
  return placed ? getSprinkler(placed.id) : null;
}

function growthDurationSeconds(state, cell, plotId) {
  const plant = getPlant(cell.plantId) || PLANTS[0];
  const sprinkler = getSprinklerForPlot(state, plotId);
  const fertilizer = cell.fertilizerId && cell.plantId !== "weed" ? getFertilizer(cell.fertilizerId) : null;
  const multiplier = (cell.nextGrowthMultiplier || 1) * (sprinkler?.growthMultiplier || 1) * (fertilizer?.growthMultiplier || 1);
  return plant.growSeconds * Math.max(0.2, multiplier);
}

function advanceCellGrowth(state, cell, plotId, seconds) {
  if (cell.phase !== "growing" || seconds <= 0) return;
  const duration = growthDurationSeconds(state, cell, plotId);
  cell.growthProgress = Math.min(1, cell.growthProgress + seconds / duration);
  if (cell.growthProgress >= 1) {
    cell.phase = "mature";
    cell.growthProgress = 1;
    cell.currentHp = (getPlant(cell.plantId) || PLANTS[0]).hp;
  }
}

function nextPulseAtOrAfter(firstPulse, intervalMs, target) {
  if (firstPulse >= target) return firstPulse;
  return firstPulse + Math.ceil((target - firstPulse) / intervalMs) * intervalMs;
}

function simulateAutoCell(state, cell, plotId, machineState, from, to, summary) {
  const machine = getHarvester(machineState.id);
  const plant = getPlant(cell.plantId) || PLANTS[0];
  const interval = machine.intervalSeconds * 1000;
  const duration = growthDurationSeconds(state, cell, plotId) * 1000;
  const firstScheduled = nextPulseAtOrAfter(machineState.nextRunAt, interval, from);
  const matureAt = cell.phase === "mature" ? from : from + (1 - cell.growthProgress) * duration;
  const firstHit = nextPulseAtOrAfter(firstScheduled, interval, matureAt);
  const startingHp = cell.phase === "mature" ? cell.currentHp : plant.hp;
  const hitsNeeded = Math.max(1, Math.ceil(startingHp / machine.damage));
  const firstHarvestAt = firstHit + (hitsNeeded - 1) * interval;

  if (firstHarvestAt > to) {
    if (cell.phase === "growing") {
      if (to < matureAt) {
        advanceCellGrowth(state, cell, plotId, (to - from) / 1000);
        return;
      }
      cell.phase = "mature";
      cell.growthProgress = 1;
      cell.currentHp = plant.hp;
    }
    if (to >= firstHit) {
      const hitCount = Math.floor((to - firstHit) / interval) + 1;
      cell.currentHp = Math.max(1, cell.currentHp - hitCount * machine.damage);
    }
    return;
  }

  const firstCoins = awardHarvest(state, cell, machine.regrowth);
  summary.gold += firstCoins;
  summary.harvested += 1;

  let lastHarvestAt = firstHarvestAt;
  while (cell.fertilizerId) {
    const fertilizedDuration = growthDurationSeconds(state, cell, plotId) * 1000;
    const fertilizedHits = Math.max(1, Math.ceil(plant.hp / machine.damage));
    const fertilizedFirstHitOffset = Math.ceil(fertilizedDuration / interval) * interval;
    const fertilizedCycleDuration = fertilizedFirstHitOffset + (fertilizedHits - 1) * interval;
    const nextHarvestAt = lastHarvestAt + fertilizedCycleDuration;
    if (nextHarvestAt > to) break;
    const coins = awardHarvest(state, cell, machine.regrowth);
    summary.gold += coins;
    summary.harvested += 1;
    lastHarvestAt = nextHarvestAt;
  }

  if (!cell.fertilizerId) {
    const stableDuration = growthDurationSeconds(state, cell, plotId) * 1000;
    const stableHits = Math.max(1, Math.ceil(plant.hp / machine.damage));
    const stableFirstHitOffset = Math.ceil(stableDuration / interval) * interval;
    const stableCycleDuration = stableFirstHitOffset + (stableHits - 1) * interval;
    const extraCycles = Math.floor((to - lastHarvestAt) / stableCycleDuration);
    if (extraCycles > 0) {
      const coins = plant.coins * extraCycles;
      state.gold += coins;
      state.lifetimeGold += coins;
      state.harvestedCells += extraCycles;
      summary.gold += coins;
      summary.harvested += extraCycles;
      lastHarvestAt += extraCycles * stableCycleDuration;
    }
  }

  const activeDuration = growthDurationSeconds(state, cell, plotId) * 1000;
  const activeHits = Math.max(1, Math.ceil(plant.hp / machine.damage));
  const activeFirstHitOffset = Math.ceil(activeDuration / interval) * interval;
  const remainder = to - lastHarvestAt;
  if (remainder < activeDuration) {
    cell.phase = "growing";
    cell.growthProgress = Math.max(0, Math.min(1, remainder / activeDuration));
    cell.currentHp = 0;
    return;
  }

  cell.phase = "mature";
  cell.growthProgress = 1;
  if (remainder < activeFirstHitOffset) {
    cell.currentHp = plant.hp;
    return;
  }
  const partialHits = Math.min(activeHits - 1, Math.floor((remainder - activeFirstHitOffset) / interval) + 1);
  cell.currentHp = Math.max(1, plant.hp - partialHits * machine.damage);
}

function simulateTo(state, targetTime) {
  const savedTime = Number(state.lastSimulatedAt);
  const from = Number.isFinite(savedTime) ? savedTime : targetTime;
  const to = Math.max(from, Number(targetTime) || from);
  const summary = { elapsedMs: to - from, gold: 0, harvested: 0 };
  if (to <= from) return summary;

  const harvesterByPlot = new Map(state.harvesters.map((item) => [item.plotId, item]));
  for (const plotId of state.ownedPlots) {
    const machineState = harvesterByPlot.get(plotId);
    for (const index of indexesForPlot(plotId)) {
      const cell = state.cells[index];
      if (machineState && getHarvester(machineState.id)) {
        simulateAutoCell(state, cell, plotId, machineState, from, to, summary);
      } else {
        advanceCellGrowth(state, cell, plotId, (to - from) / 1000);
      }
    }
    if (machineState) {
      const machine = getHarvester(machineState.id);
      const interval = machine.intervalSeconds * 1000;
      const first = nextPulseAtOrAfter(machineState.nextRunAt, interval, from);
      machineState.nextRunAt = first > to ? first : first + (Math.floor((to - first) / interval) + 1) * interval;
    }
  }
  state.lastSimulatedAt = to;
  return summary;
}

function sowPlot(state, plotId, plantId) {
  if (!state.ownedPlots.includes(plotId) || !getPlant(plantId) || plantId === "weed") return false;
  for (const index of indexesForPlot(plotId)) {
    state.cells[index] = {
      plantId,
      phase: "growing",
      growthProgress: 0,
      currentHp: 0,
      nextGrowthMultiplier: 1,
      fertilizerId: null,
      fertilizerRounds: 0
    };
  }
  return true;
}

function fertilizePlot(state, plotId, fertilizerId) {
  const fertilizer = getFertilizer(fertilizerId);
  if (!state.ownedPlots.includes(plotId) || !fertilizer) return false;
  const indexes = indexesForPlot(plotId);
  if (indexes.some((index) => state.cells[index].plantId === "weed")) return false;
  for (const index of indexes) {
    state.cells[index].fertilizerId = fertilizerId;
    state.cells[index].fertilizerRounds = fertilizer.rounds;
  }
  return true;
}

function buyPlot(state, plotId) {
  const next = PLOTS[state.ownedPlots.length];
  if (!next || next.id !== plotId || state.gold < next.cost) return false;
  state.gold -= next.cost;
  state.ownedPlots.push(plotId);
  for (const index of indexesForPlot(plotId)) {
    state.cells[index] = {
      plantId: "weed", phase: "growing", growthProgress: 0,
      currentHp: 0, nextGrowthMultiplier: 1, fertilizerId: null, fertilizerRounds: 0
    };
  }
  return true;
}

function migrateLegacyCropIds(state) {
  if (!state || typeof state !== "object") return state;
  if (Array.isArray(state.cells)) {
    for (const cell of state.cells) {
      if (cell?.plantId === "carrot") cell.plantId = "tomato";
    }
  }
  if (state.inventory && Number.isFinite(state.inventory.seed_carrot)) {
    state.inventory.seed_tomato = (state.inventory.seed_tomato || 0) + state.inventory.seed_carrot;
    delete state.inventory.seed_carrot;
  }
  return state;
}

function normalizeStateData(state) {
  migrateLegacyCropIds(state);
  if (!state || !Array.isArray(state.cells)) return state;
  for (const cell of state.cells) {
    if (!cell) continue;
    if (cell.fertilizerId && getFertilizer(cell.fertilizerId)) {
      if (!Number.isInteger(cell.fertilizerRounds) || cell.fertilizerRounds < 1) cell.fertilizerRounds = 1;
    } else {
      cell.fertilizerId = null;
      cell.fertilizerRounds = 0;
    }
  }
  return state;
}

function formatNumber(value) {
  if (!Number.isFinite(value)) return "0";
  const units = [[1e12, "T"], [1e9, "B"], [1e6, "M"], [1e3, "K"]];
  for (const [size, label] of units) {
    if (Math.abs(value) >= size) {
      const scaled = value / size;
      return `${scaled >= 100 ? scaled.toFixed(0) : scaled >= 10 ? scaled.toFixed(1) : scaled.toFixed(2)}`.replace(/\.0+$|(?<=\.[0-9])0$/, "") + label;
    }
  }
  return Math.floor(value).toLocaleString("zh-Hant");
}

function formatTime(seconds) {
  if (seconds < 60) return `${Math.ceil(seconds)} 秒`;
  if (seconds < 3600) return `${Math.ceil(seconds / 60)} 分鐘`;
  return `${Math.round(seconds / 360) / 10} 小時`;
}

function validateState(state) {
  if (!state || state.schemaVersion !== SAVE_VERSION) return false;
  if (!Number.isFinite(state.gold) || state.gold < 0 || !Number.isFinite(state.lastSimulatedAt)) return false;
  if (!Array.isArray(state.cells) || state.cells.length !== BOARD_SIZE * BOARD_SIZE) return false;
  if (!Array.isArray(state.ownedPlots) || !state.ownedPlots.includes(INITIAL_PLOT_ID)) return false;
  if (!Array.isArray(state.ownedToolIds) || !state.ownedToolIds.includes("small_knife")) return false;
  if (!getTool(state.equippedToolId)) return false;
  return state.cells.every((cell) => cell && getPlant(cell.plantId) && ["growing", "mature"].includes(cell.phase) && Number.isFinite(cell.growthProgress) && Number.isInteger(cell.fertilizerRounds) && cell.fertilizerRounds >= 0);
}

globalThis.HarvestCore = Object.freeze({
  BOARD_SIZE, PLOT_GRID_SIZE, INITIAL_PLOT_ID, INITIAL_PLOT_IDS, SAVE_VERSION, PLANTS, TOOLS, PLOTS,
  HARVESTERS, SPRINKLERS, FERTILIZERS, getPlant, getTool,
  getHarvester, getSprinkler, getFertilizer, getProductPrice, plotIdForIndex,
  indexesForPlot, createInitialState, isAutomationUnlocked,
  isToolUnlocked, isPlantUnlocked, isFertilizerUnlocked,
  getToolTargetIndexes, manualHarvest, growthDurationSeconds,
  simulateTo, sowPlot, fertilizePlot, buyPlot, formatNumber,
  formatTime, migrateLegacyCropIds, normalizeStateData, validateState
});
}(globalThis));
