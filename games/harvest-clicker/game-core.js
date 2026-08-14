(function (globalThis) {
"use strict";

const BOARD_SIZE = 27;
const PLOT_GRID_SIZE = BOARD_SIZE / 3;
const INITIAL_PLOT_ID = 40;
const INITIAL_PLOT_IDS = [40, 31, 41, 49, 39, 30, 32, 50, 48];
const SAVE_VERSION = 4;

const PLANTS = [
  { id: "weed", name: "雜草", emoji: "🌿", image: null, seedCost: 0, hp: 1, coins: 1, growSeconds: 30, color: "#81985b", unlock: { type: "initial", value: 0 } },
  { id: "clover", name: "白花苜蓿", emoji: "☘️", image: "lettuce-head.png", seedCost: 18, hp: 2, coins: 4, growSeconds: 60, color: "#77a65c", unlock: { type: "lifetimeGold", value: 15 } },
  { id: "tomato", name: "樁架番茄", emoji: "🍅", image: "tomato-plant-staked.png", seedCost: 90, hp: 4, coins: 15, growSeconds: 180, color: "#d65243", unlock: { type: "harvested", value: 40 } },
  { id: "cabbage", name: "翠玉甘藍", emoji: "🥬", image: "cabbage-head-row.png", seedCost: 220, hp: 6, coins: 34, growSeconds: 300, color: "#70a95e", unlock: { type: "lifetimeGold", value: 180 } },
  { id: "wheat", name: "金穗小麥", emoji: "🌾", image: "wheat-stalk.png", seedCost: 420, hp: 8, coins: 65, growSeconds: 480, color: "#e0b94f", unlock: { type: "tool", value: "garden_shears" } },
  { id: "corn", name: "蜜香玉米", emoji: "🌽", image: "corn-stalk-row.png", seedCost: 900, hp: 11, coins: 135, growSeconds: 720, color: "#d8bd45", unlock: { type: "harvested", value: 200 } },
  { id: "berry", name: "紅莓叢", emoji: "🍓", image: "strawberry-plant.png", seedCost: 1900, hp: 15, coins: 290, growSeconds: 1200, color: "#cf4c56", unlock: { type: "plots", value: 10 } },
  { id: "zucchini", name: "碧綠櫛瓜", emoji: "🥒", image: "zucchini-plant.png", seedCost: 4200, hp: 22, coins: 620, growSeconds: 1800, color: "#5e9b57", unlock: { type: "lifetimeGold", value: 5000 } },
  { id: "pumpkin", name: "月光南瓜", emoji: "🎃", image: "pumpkin-patch.png", seedCost: 8500, hp: 30, coins: 1250, growSeconds: 2700, color: "#d6a34c", unlock: { type: "tool", value: "short_sickle" } },
  { id: "eggplant", name: "夜紫茄", emoji: "🍆", image: "eggplant-plant.png", seedCost: 18000, hp: 42, coins: 2700, growSeconds: 4500, color: "#795da5", unlock: { type: "harvested", value: 800 } },
  { id: "lavender", name: "紫晶薰衣草", emoji: "🪻", image: "lavender-bush.png", seedCost: 40000, hp: 60, coins: 6000, growSeconds: 7200, color: "#9475bd", unlock: { type: "plots", value: 16 } },
  { id: "blueberry", name: "藍莓灌木", emoji: "🫐", image: "blueberry-bush.png", seedCost: 85000, hp: 80, coins: 12750, growSeconds: 10800, color: "#536a9e", unlock: { type: "lifetimeGold", value: 100000 } },
  { id: "pepper", name: "赤焰火椒", emoji: "🌶️", image: "pepper-plant.png", seedCost: 190000, hp: 110, coins: 29000, growSeconds: 21600, color: "#d85043", unlock: { type: "tool", value: "rotary_cutter" } },
  { id: "rose", name: "晨露玫瑰", emoji: "🌹", image: "rose-bush.png", seedCost: 420000, hp: 155, coins: 63000, growSeconds: 36000, color: "#c65367", unlock: { type: "harvested", value: 5000 } },
  { id: "starfruit", name: "星輝果", emoji: "🌻", image: "sunflower-row.png", seedCost: 950000, hp: 220, coins: 145000, growSeconds: 64800, color: "#e7c74b", unlock: { type: "plots", value: 25 } },
  { id: "cotton", name: "雲絮棉花", emoji: "☁️", image: "cotton-plant.png", seedCost: 2200000, hp: 320, coins: 335000, growSeconds: 108000, color: "#e8e4d6", unlock: { type: "lifetimeGold", value: 2000000 } },
  { id: "sugarcane", name: "翡翠甘蔗", emoji: "🎋", image: "sugar-cane.png", seedCost: 5000000, hp: 460, coins: 760000, growSeconds: 172800, color: "#6ba663", unlock: { type: "tool", value: "steel_harvester" } },
  { id: "rice", name: "月白稻束", emoji: "🍚", image: "rice-paddy-bundle.png", seedCost: 11000000, hp: 650, coins: 1700000, growSeconds: 259200, color: "#d6c983", unlock: { type: "harvested", value: 25000 } },
  { id: "grape", name: "暮色葡萄", emoji: "🍇", image: "grape-vine.png", seedCost: 25000000, hp: 900, coins: 3800000, growSeconds: 432000, color: "#735893", unlock: { type: "plots", value: 36 } },
  { id: "vanilla", name: "銀香香草", emoji: "🌼", image: "vanilla-vine.png", seedCost: 60000000, hp: 1300, coins: 9000000, growSeconds: 691200, color: "#e7dfb0", unlock: { type: "lifetimeGold", value: 75000000 } },
  { id: "coffee", name: "曜石咖啡", emoji: "☕", image: "coffee-bean-plant.png", seedCost: 150000000, hp: 1800, coins: 23000000, growSeconds: 1036800, color: "#7f4b34", unlock: { type: "plots", value: 49 } }
];

const TOOLS = [
  { id: "small_knife", name: "小刀", emoji: "🔪", image: "vegetable-peeler.png", cost: 0, damage: 1, shape: "single", cells: 1, regrowth: 1, unlock: { type: "initial", value: 0 } },
  { id: "garden_shears", name: "園藝剪", emoji: "✂️", image: "pruning-shears.png", cost: 45, damage: 2, shape: "single", cells: 1, regrowth: 1, unlock: { type: "harvested", value: 20 } },
  { id: "hand_trowel", name: "手持鏟", emoji: "🪏", image: "hand-trowel.png", cost: 160, damage: 3, shape: "col3", cells: 3, regrowth: 1, unlock: { type: "harvested", value: 60 } },
  { id: "machete", name: "尖頭鏟", emoji: "♠️", image: "garden-spade.png", cost: 420, damage: 5, shape: "row3", cells: 3, regrowth: 1, unlock: { type: "harvested", value: 120 } },
  { id: "short_sickle", name: "短柄鐮刀", emoji: "⚒️", image: "farm-scythe.png", cost: 1800, damage: 4, shape: "row5", cells: 5, regrowth: 1, unlock: { type: "harvested", value: 250 } },
  { id: "long_sickle", name: "長柄鋤", emoji: "🛠️", image: "garden-hoe.png", cost: 6000, damage: 7, shape: "cross", cells: 5, regrowth: 0.95, unlock: { type: "harvested", value: 600 } },
  { id: "pitchfork", name: "五齒耙", emoji: "🔱", image: "compost-pile-pitchfork.png", cost: 22000, damage: 8, shape: "col5", cells: 5, regrowth: 0.92, unlock: { type: "plots", value: 16 } },
  { id: "rotary_cutter", name: "銅製十字鎬", emoji: "⛏️", image: "copper-pickaxe.png", cost: 85000, damage: 12, shape: "diamond2", cells: 13, regrowth: 0.9, unlock: { type: "harvested", value: 2500 } },
  { id: "steel_harvester", name: "精鋼鋤", emoji: "🛠️", image: "iron-hoe.png", cost: 300000, damage: 25, shape: "square3", cells: 9, regrowth: 0.8, unlock: { type: "plots", value: 25 } },
  { id: "wide_scythe", name: "廣域鐮刀", emoji: "⚒️", image: "farm-scythe.png", cost: 1200000, damage: 32, shape: "cross9", cells: 9, regrowth: 0.72, unlock: { type: "harvested", value: 12000 } },
  { id: "prosperity_blade", name: "聯合收割機", emoji: "🚜", image: "combine-harvester.png", cost: 6000000, damage: 60, shape: "square5", cells: 25, regrowth: 0.6, unlock: { type: "plots", value: 36 } },
  { id: "grand_harvester", name: "巨型聯合收割機", emoji: "🚜", image: "combine-harvester.png", cost: 30000000, damage: 110, shape: "square7", cells: 49, regrowth: 0.5, unlock: { type: "harvested", value: 50000 } }
];

function roundLandPrice(value) {
  const unit = 10 ** Math.max(0, Math.floor(Math.log10(value)) - 1);
  return Math.round(value / unit) * unit;
}

const remainingPlotIds = Array.from({ length: PLOT_GRID_SIZE * PLOT_GRID_SIZE }, (_, id) => id)
  .filter((id) => !INITIAL_PLOT_IDS.includes(id))
  .sort((a, b) => {
    const aRow = Math.floor(a / PLOT_GRID_SIZE); const aCol = a % PLOT_GRID_SIZE;
    const bRow = Math.floor(b / PLOT_GRID_SIZE); const bCol = b % PLOT_GRID_SIZE;
    const aRing = Math.max(Math.abs(aRow - 4), Math.abs(aCol - 4));
    const bRing = Math.max(Math.abs(bRow - 4), Math.abs(bCol - 4));
    return aRing - bRing || Math.atan2(aRow - 4, aCol - 4) - Math.atan2(bRow - 4, bCol - 4);
  });

const PLOTS = [...INITIAL_PLOT_IDS, ...remainingPlotIds].map((id, order) => ({
  id,
  name: order === 0 ? "中央田" : `第 ${order + 1} 區農田`,
  cost: order < INITIAL_PLOT_IDS.length ? 0 : roundLandPrice(1200 * (1.45 ** (order - INITIAL_PLOT_IDS.length)))
}));

const HARVESTERS = [
  { id: "micro", name: "單點採收器", emoji: "🦾", image: "combine-harvester.png", cost: 25000, damage: 3, intervalSeconds: 45, regrowth: 1, range: 1, tier: 1 },
  { id: "clockwork", name: "發條割草機", emoji: "🦾", image: "combine-harvester.png", cost: 120000, damage: 6, intervalSeconds: 30, regrowth: 1, range: 3, tier: 2 },
  { id: "copper", name: "銅輪收割機", emoji: "⚙️", image: "combine-harvester.png", cost: 450000, damage: 12, intervalSeconds: 20, regrowth: 0.95, range: 5, tier: 3 },
  { id: "steam", name: "蒸汽收割機", emoji: "🚜", image: "combine-harvester.png", cost: 1800000, damage: 30, intervalSeconds: 12, regrowth: 0.85, range: 7, tier: 4 },
  { id: "starcore", name: "星核聯合收割機", emoji: "🤖", image: "combine-harvester.png", cost: 8000000, damage: 90, intervalSeconds: 5, regrowth: 0.7, range: 9, tier: 5 }
];

const SPRINKLERS = [
  { id: "drop", name: "單點滴灌器", emoji: "💧", image: "watering-can-metal.png", cost: 18000, growthMultiplier: 0.9, range: 1, tier: 1 },
  { id: "drip", name: "三列滴灌器", emoji: "💧", image: "sprinkler-head.png", cost: 75000, growthMultiplier: 0.8, range: 3, tier: 2 },
  { id: "fan", name: "廣角噴灌器", emoji: "🚿", image: "sprinkler-head.png", cost: 260000, growthMultiplier: 0.7, range: 5, tier: 3 },
  { id: "rotary", name: "旋轉灑水器", emoji: "🚿", image: "sprinkler-head.png", cost: 900000, growthMultiplier: 0.55, range: 7, tier: 4 },
  { id: "stardew", name: "星露灌溉器", emoji: "⛲", image: "sprinkler-head.png", cost: 5500000, growthMultiplier: 0.38, range: 9, tier: 5 }
];

const FERTILIZERS = [
  { id: "quick", name: "速效堆肥", emoji: "🟤", cost: 300, growthMultiplier: 0.75, coinMultiplier: 1.25, rounds: 3, purpose: "前期快速縮短作物等待時間，適合短週期作物。", unlock: { type: "plantOwned", value: "tomato" } },
  { id: "leaf", name: "腐葉培養土", emoji: "🍂", cost: 1200, growthMultiplier: 0.7, coinMultiplier: 1.35, rounds: 4, purpose: "用低成本兼顧生長速度與收割收入。", unlock: { type: "harvested", value: 300 } },
  { id: "bounty", name: "豐收肥料", emoji: "🧺", cost: 6000, growthMultiplier: 0.6, coinMultiplier: 1.5, rounds: 5, purpose: "中期通用肥料，適合穩定反覆收割同一批作物。", unlock: { type: "plots", value: 9 } },
  { id: "kelp", name: "海藻營養液", emoji: "🌊", cost: 28000, growthMultiplier: 0.55, coinMultiplier: 1.65, rounds: 5, purpose: "偏重生長速度，適合等待時間較長的作物。", unlock: { type: "lifetimeGold", value: 30000 } },
  { id: "star", name: "星露精華", emoji: "💫", cost: 120000, growthMultiplier: 0.4, coinMultiplier: 2, rounds: 8, purpose: "自動化階段的長效加速，能同時提高離線收入。", unlock: { type: "automation", value: 0 } },
  { id: "bone", name: "骨粉精華", emoji: "🦴", cost: 300000, growthMultiplier: 0.48, coinMultiplier: 2.15, rounds: 6, purpose: "偏重單次收成價值，適合高收益作物。", unlock: { type: "harvested", value: 5000 } },
  { id: "crystal", name: "晶礦生長劑", emoji: "💎", cost: 900000, growthMultiplier: 0.36, coinMultiplier: 2.4, rounds: 8, purpose: "大幅縮短高階作物週期，適合灑水器覆蓋區。", unlock: { type: "plots", value: 25 } },
  { id: "mycelium", name: "菌絲活化土", emoji: "🍄", cost: 2800000, growthMultiplier: 0.32, coinMultiplier: 2.75, rounds: 9, purpose: "提供多輪穩定增產，適合長時間離線配置。", unlock: { type: "lifetimeGold", value: 10000000 } },
  { id: "royal", name: "皇家金穗肥", emoji: "👑", cost: 9000000, growthMultiplier: 0.28, coinMultiplier: 3.2, rounds: 10, purpose: "後期高倍率增產，用於昂貴種子可快速回收成本。", unlock: { type: "tool", value: "prosperity_blade" } },
  { id: "eternal", name: "永恆沃土精華", emoji: "🌟", cost: 30000000, growthMultiplier: 0.24, coinMultiplier: 4, rounds: 12, purpose: "終局長效肥料，最大化高階自動農場的每輪收益。", unlock: { type: "plots", value: 49 } }
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
  if (!plant?.unlock || plant.unlock.type === "initial") return true;
  if (plant.unlock.type === "lifetimeGold") return state.lifetimeGold >= plant.unlock.value;
  if (plant.unlock.type === "harvested") return state.harvestedCells >= plant.unlock.value;
  if (plant.unlock.type === "plots") return state.ownedPlots.length >= plant.unlock.value;
  if (plant.unlock.type === "tool") return state.ownedToolIds.includes(plant.unlock.value);
  return false;
}

function isFertilizerUnlocked(item, state) {
  if (!item?.unlock) return false;
  if (item.unlock.type === "plantOwned") return Boolean(state.inventory?.[`seed_${item.unlock.value}`]) || state.cells.some((cell) => cell.plantId === item.unlock.value);
  if (item.unlock.type === "harvested") return state.harvestedCells >= item.unlock.value;
  if (item.unlock.type === "plots") return state.ownedPlots.length >= item.unlock.value;
  if (item.unlock.type === "lifetimeGold") return state.lifetimeGold >= item.unlock.value;
  if (item.unlock.type === "tool") return state.ownedToolIds.includes(item.unlock.value);
  if (item.unlock.type === "automation") return isAutomationUnlocked(state);
  return false;
}

function offsetsForShape(shape) {
  if (shape === "row3" || shape === "row5") {
    const radius = shape === "row3" ? 1 : 2;
    return Array.from({ length: radius * 2 + 1 }, (_, index) => [0, index - radius]);
  }
  if (shape === "col3" || shape === "col5") {
    const radius = shape === "col3" ? 1 : 2;
    return Array.from({ length: radius * 2 + 1 }, (_, index) => [index - radius, 0]);
  }
  if (shape === "cross") return [[-1, 0], [0, -1], [0, 0], [0, 1], [1, 0]];
  if (shape === "cross9") return [[-2, 0], [-1, 0], [0, -2], [0, -1], [0, 0], [0, 1], [0, 2], [1, 0], [2, 0]];
  if (shape === "diamond2") {
    const offsets = [];
    for (let y = -2; y <= 2; y += 1) {
      for (let x = -2; x <= 2; x += 1) if (Math.abs(x) + Math.abs(y) <= 2) offsets.push([y, x]);
    }
    return offsets;
  }
  if (shape === "square3" || shape === "square5" || shape === "square7") {
    const radius = shape === "square3" ? 1 : shape === "square5" ? 2 : 3;
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

function automationTargetIndexes(range, plotId, ownedPlots) {
  const centerIndex = indexesForPlot(plotId)[4];
  const centerRow = Math.floor(centerIndex / BOARD_SIZE);
  const centerCol = centerIndex % BOARD_SIZE;
  const radius = Math.floor(Math.max(1, range) / 2);
  const owned = new Set(ownedPlots);
  const indexes = [];
  for (let row = centerRow - radius; row <= centerRow + radius; row += 1) {
    for (let col = centerCol - radius; col <= centerCol + radius; col += 1) {
      if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) continue;
      const index = row * BOARD_SIZE + col;
      if (owned.has(plotIdForIndex(index))) indexes.push(index);
    }
  }
  return indexes;
}

function getDeviceStateForIndex(state, list, getter, index) {
  return list
    .filter((placed) => {
      const item = getter(placed.id);
      return item && automationTargetIndexes(item.range, placed.plotId, state.ownedPlots).includes(index);
    })
    .sort((a, b) => (getter(b.id)?.tier || 0) - (getter(a.id)?.tier || 0))[0] || null;
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

function getSprinklerForIndex(state, index) {
  const placed = getDeviceStateForIndex(state, state.sprinklers, getSprinkler, index);
  return placed ? getSprinkler(placed.id) : null;
}

function growthDurationSeconds(state, cell, plotId, index = indexesForPlot(plotId)[4]) {
  const plant = getPlant(cell.plantId) || PLANTS[0];
  const sprinkler = getSprinklerForIndex(state, index);
  const fertilizer = cell.fertilizerId && cell.plantId !== "weed" ? getFertilizer(cell.fertilizerId) : null;
  const multiplier = (cell.nextGrowthMultiplier || 1) * (sprinkler?.growthMultiplier || 1) * (fertilizer?.growthMultiplier || 1);
  return plant.growSeconds * Math.max(0.2, multiplier);
}

function advanceCellGrowth(state, cell, plotId, seconds, index = indexesForPlot(plotId)[4]) {
  if (cell.phase !== "growing" || seconds <= 0) return;
  const duration = growthDurationSeconds(state, cell, plotId, index);
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

function simulateAutoCell(state, cell, plotId, index, machineState, from, to, summary) {
  const machine = getHarvester(machineState.id);
  const plant = getPlant(cell.plantId) || PLANTS[0];
  const interval = machine.intervalSeconds * 1000;
  const duration = growthDurationSeconds(state, cell, plotId, index) * 1000;
  const firstScheduled = nextPulseAtOrAfter(machineState.nextRunAt, interval, from);
  const matureAt = cell.phase === "mature" ? from : from + (1 - cell.growthProgress) * duration;
  const firstHit = nextPulseAtOrAfter(firstScheduled, interval, matureAt);
  const startingHp = cell.phase === "mature" ? cell.currentHp : plant.hp;
  const hitsNeeded = Math.max(1, Math.ceil(startingHp / machine.damage));
  const firstHarvestAt = firstHit + (hitsNeeded - 1) * interval;

  if (firstHarvestAt > to) {
    if (cell.phase === "growing") {
      if (to < matureAt) {
        advanceCellGrowth(state, cell, plotId, (to - from) / 1000, index);
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
    const fertilizedDuration = growthDurationSeconds(state, cell, plotId, index) * 1000;
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
    const stableDuration = growthDurationSeconds(state, cell, plotId, index) * 1000;
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

  const activeDuration = growthDurationSeconds(state, cell, plotId, index) * 1000;
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

  for (const plotId of state.ownedPlots) {
    for (const index of indexesForPlot(plotId)) {
      const cell = state.cells[index];
      const machineState = getDeviceStateForIndex(state, state.harvesters, getHarvester, index);
      if (machineState && getHarvester(machineState.id)) {
        simulateAutoCell(state, cell, plotId, index, machineState, from, to, summary);
      } else {
        advanceCellGrowth(state, cell, plotId, (to - from) / 1000, index);
      }
    }
  }
  for (const machineState of state.harvesters) {
    const machine = getHarvester(machineState.id);
    if (!machine) continue;
    const interval = machine.intervalSeconds * 1000;
    const first = nextPulseAtOrAfter(machineState.nextRunAt, interval, from);
    machineState.nextRunAt = first > to ? first : first + (Math.floor((to - first) / interval) + 1) * interval;
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

const LEGACY_PLOT_ORDER = [12, 7, 13, 17, 11, 8, 18, 16, 6, 2, 14, 22, 10, 1, 3, 4, 9, 19, 24, 23, 21, 20, 15, 5, 0];

function migrateLegacyBoard(state) {
  if (!state || state.schemaVersion !== 3 || !Array.isArray(state.cells) || state.cells.length !== 225) return state;
  const legacy = { ...state };
  const legacyOwned = Array.isArray(state.ownedPlots) ? state.ownedPlots : LEGACY_PLOT_ORDER.slice(0, 5);
  const ownedCount = Math.min(PLOTS.length, Math.max(INITIAL_PLOT_IDS.length, legacyOwned.length + 4));
  const migrated = createInitialState(Number(state.lastSimulatedAt) || Date.now());
  const ownedPlots = PLOTS.slice(0, ownedCount).map((plot) => plot.id);
  const legacyOrderById = new Map(LEGACY_PLOT_ORDER.map((id, order) => [id, order]));
  const mappedPlotByLegacyId = new Map();

  for (const legacyPlotId of legacyOwned) {
    const order = legacyOrderById.get(legacyPlotId);
    if (!Number.isInteger(order)) continue;
    const mappedId = order < 5
      ? (Math.floor(legacyPlotId / 5) + 2) * PLOT_GRID_SIZE + (legacyPlotId % 5) + 2
      : PLOTS[Math.min(PLOTS.length - 1, order + 4)].id;
    mappedPlotByLegacyId.set(legacyPlotId, mappedId);
  }

  for (let legacyIndex = 0; legacyIndex < state.cells.length; legacyIndex += 1) {
    const legacyRow = Math.floor(legacyIndex / 15);
    const legacyCol = legacyIndex % 15;
    const legacyPlotId = Math.floor(legacyRow / 3) * 5 + Math.floor(legacyCol / 3);
    const mappedPlotId = mappedPlotByLegacyId.get(legacyPlotId);
    if (!Number.isInteger(mappedPlotId) || !ownedPlots.includes(mappedPlotId)) continue;
    const mappedPlotRow = Math.floor(mappedPlotId / PLOT_GRID_SIZE);
    const mappedPlotCol = mappedPlotId % PLOT_GRID_SIZE;
    const mappedIndex = (mappedPlotRow * 3 + legacyRow % 3) * BOARD_SIZE + mappedPlotCol * 3 + legacyCol % 3;
    migrated.cells[mappedIndex] = { ...state.cells[legacyIndex] };
  }

  Object.assign(state, migrated, legacy, {
    schemaVersion: SAVE_VERSION,
    ownedPlots,
    cells: migrated.cells,
    harvesters: (Array.isArray(state.harvesters) ? state.harvesters : []).map((placed) => ({
      ...placed,
      plotId: mappedPlotByLegacyId.get(placed.plotId) ?? INITIAL_PLOT_ID
    })).filter((placed) => ownedPlots.includes(placed.plotId) && getHarvester(placed.id)),
    sprinklers: (Array.isArray(state.sprinklers) ? state.sprinklers : []).map((placed) => ({
      ...placed,
      plotId: mappedPlotByLegacyId.get(placed.plotId) ?? INITIAL_PLOT_ID
    })).filter((placed) => ownedPlots.includes(placed.plotId) && getSprinkler(placed.id))
  });
  return state;
}

function normalizeStateData(state) {
  migrateLegacyBoard(state);
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
  getToolTargetIndexes, automationTargetIndexes, manualHarvest, growthDurationSeconds,
  simulateTo, sowPlot, fertilizePlot, buyPlot, formatNumber,
  formatTime, migrateLegacyCropIds, normalizeStateData, validateState
});
}(globalThis));
