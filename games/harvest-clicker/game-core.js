(function (globalThis) {
"use strict";

const STATIC_CONFIG = globalThis.HarvestStaticConfig;
const STATIC_DATA = globalThis.HarvestStaticData;
if (!STATIC_CONFIG || !STATIC_DATA) throw new Error("Harvest Clicker static settings are not loaded");
const {
  BOARD_SIZE, PLOT_GRID_SIZE, INITIAL_PLOT_ID, INITIAL_PLOT_IDS, SAVE_VERSION,
  LAND_PRICE_BASE, LAND_PRICE_GROWTH, LAND_SIZE, LOWEST_GROWTH_MULTIPLIER,
  MONTHLY_EVENT_ID, MONTHLY_EVENT_REWARD_PLANT_ID, MONTHLY_EVENT_START_AT, MONTHLY_EVENT_END_AT
} = STATIC_CONFIG;
const { PLANTS, TOOLS, HARVESTERS, SPRINKLERS, FERTILIZERS, DECORATIONS = [] } = STATIC_DATA;

/*
 * The old inline tables are intentionally kept in this commented migration
 * snapshot for easy diff review. Runtime data now comes from data/*.js.
const PLANTS = [
  { id: "weed", name: "雜草", emoji: "🌿", image: null, seedCost: 0, hp: 1, coins: 1, growSeconds: 30, color: "#81985b", unlock: { type: "initial", value: 0 } },
  { id: "clover", name: "白花苜蓿", emoji: "☘️", image: "lettuce-head.png", seedCost: 18, hp: 2, coins: 4, growSeconds: 60, color: "#77a65c", unlock: { type: "lifetimeGold", value: 15 } },
  { id: "tomato", name: "樁架番茄", emoji: "🍅", image: "tomato-plant-staked.png", seedCost: 90, hp: 4, coins: 15, growSeconds: 180, color: "#d65243", unlock: { type: "harvested", value: 40 } },
  { id: "cabbage", name: "翠玉甘藍", emoji: "🥬", image: "cabbage-head-row.png", seedCost: 220, hp: 6, coins: 34, growSeconds: 300, color: "#70a95e", unlock: { type: "lifetimeGold", value: 180 } },
  { id: "wheat", name: "金穗小麥", emoji: "🌾", image: "wheat-stalk.png", seedCost: 420, hp: 8, coins: 65, growSeconds: 480, color: "#e0b94f", unlock: { type: "tool", value: "garden_shears" } },
  { id: "corn", name: "蜜香玉米", emoji: "🌽", image: "corn-stalk-row.png", seedCost: 900, hp: 11, coins: 135, growSeconds: 720, color: "#d8bd45", unlock: { type: "harvested", value: 200 } },
  { id: "berry", name: "紅莓叢", emoji: "🍓", image: "strawberry-plant.png", seedCost: 1900, hp: 15, coins: 290, growSeconds: 1200, color: "#cf4c56", unlock: { type: "plots", value: 8 } },
  { id: "zucchini", name: "碧綠櫛瓜", emoji: "🥒", image: "zucchini-plant.png", seedCost: 4200, hp: 22, coins: 620, growSeconds: 1800, color: "#5e9b57", unlock: { type: "lifetimeGold", value: 5000 } },
  { id: "pumpkin", name: "月光南瓜", emoji: "🎃", image: "pumpkin-patch.png", seedCost: 8500, hp: 30, coins: 1250, growSeconds: 2700, color: "#d6a34c", unlock: { type: "tool", value: "short_sickle" } },
  { id: "eggplant", name: "夜紫茄", emoji: "🍆", image: "eggplant-plant.png", seedCost: 18000, hp: 42, coins: 2700, growSeconds: 4500, color: "#795da5", unlock: { type: "harvested", value: 800 } },
  { id: "lavender", name: "紫晶薰衣草", emoji: "🪻", image: "lavender-bush.png", seedCost: 40000, hp: 60, coins: 6000, growSeconds: 7200, color: "#9475bd", unlock: { type: "plots", value: 12 } },
  { id: "blueberry", name: "藍莓灌木", emoji: "🫐", image: "blueberry-bush.png", seedCost: 85000, hp: 80, coins: 12750, growSeconds: 10800, color: "#536a9e", unlock: { type: "lifetimeGold", value: 100000 } },
  { id: "pepper", name: "赤焰火椒", emoji: "🌶️", image: "pepper-plant.png", seedCost: 190000, hp: 110, coins: 29000, growSeconds: 21600, color: "#d85043", unlock: { type: "tool", value: "rotary_cutter" } },
  { id: "rose", name: "晨露玫瑰", emoji: "🌹", image: "rose-bush.png", seedCost: 420000, hp: 155, coins: 63000, growSeconds: 36000, color: "#c65367", unlock: { type: "harvested", value: 5000 } },
  { id: "starfruit", name: "星輝果", emoji: "🌻", image: "sunflower-row.png", seedCost: 950000, hp: 220, coins: 145000, growSeconds: 64800, color: "#e7c74b", unlock: { type: "plots", value: 18 } },
  { id: "cotton", name: "雲絮棉花", emoji: "☁️", image: "cotton-plant.png", seedCost: 2200000, hp: 320, coins: 335000, growSeconds: 108000, color: "#e8e4d6", unlock: { type: "lifetimeGold", value: 2000000 } },
  { id: "sugarcane", name: "翡翠甘蔗", emoji: "🎋", image: "sugar-cane.png", seedCost: 5000000, hp: 460, coins: 760000, growSeconds: 172800, color: "#6ba663", unlock: { type: "tool", value: "steel_harvester" } },
  { id: "rice", name: "月白稻束", emoji: "🍚", image: "rice-paddy-bundle.png", seedCost: 11000000, hp: 650, coins: 1700000, growSeconds: 259200, color: "#d6c983", unlock: { type: "harvested", value: 25000 } },
  { id: "grape", name: "暮色葡萄", emoji: "🍇", image: "grape-vine.png", seedCost: 25000000, hp: 900, coins: 3800000, growSeconds: 432000, color: "#735893", unlock: { type: "plots", value: 24 } },
  { id: "vanilla", name: "銀香香草", emoji: "🌼", image: "vanilla-vine.png", seedCost: 60000000, hp: 1300, coins: 9000000, growSeconds: 691200, color: "#e7dfb0", unlock: { type: "lifetimeGold", value: 75000000 } },
  { id: "coffee", name: "曜石咖啡", emoji: "☕", image: "coffee-bean-plant.png", seedCost: 150000000, hp: 1800, coins: 23000000, growSeconds: 1036800, color: "#7f4b34", unlock: { type: "plots", value: 32 } },
  { id: "apple_tree", name: "晨紅蘋果樹", emoji: "🍎", image: "apple-tree.png", type: "tree", footprint: 1, seedCost: 400000000, hp: 2400, coins: 60000000, growSeconds: 1296000, color: "#76a947", unlock: { type: "lifetimeGold", value: 150000000 } },
  { id: "orange_tree", name: "蜜香橙樹", emoji: "🍊", image: "orange-tree.png", type: "tree", footprint: 1, seedCost: 1200000000, hp: 3600, coins: 190000000, growSeconds: 1468800, color: "#dc8d36", unlock: { type: "tool", value: "forester_axe" } },
  { id: "cherry_tree", name: "緋櫻果樹", emoji: "🍒", image: "cherry-tree.png", type: "tree", footprint: 2, seedCost: 3500000000, hp: 5200, coins: 560000000, growSeconds: 1728000, color: "#ce4f5e", unlock: { type: "harvested", value: 70000 } },
  { id: "peach_tree", name: "霞蜜桃樹", emoji: "🍑", image: "peach-tree.png", type: "tree", footprint: 2, seedCost: 9000000000, hp: 7600, coins: 1400000000, growSeconds: 2073600, color: "#e9a477", unlock: { type: "tool", value: "steel_hatchet" } },
  { id: "lemon_tree", name: "金露檸檬樹", emoji: "🍋", image: "lemon-tree.png", type: "tree", footprint: 3, seedCost: 22000000000, hp: 10500, coins: 3600000000, growSeconds: 2419200, color: "#e0ca4e", unlock: { type: "plots", value: 45 } },
  { id: "banana_tree", name: "月彎香蕉樹", emoji: "🍌", image: "banana-tree.png", type: "tree", footprint: 3, seedCost: 55000000000, hp: 14500, coins: 9000000000, growSeconds: 2851200, color: "#dfc448", unlock: { type: "lifetimeGold", value: 30000000000 } },
  { id: "coconut_tree", name: "海風椰子樹", emoji: "🥥", image: "coconut-palm.png", type: "tree", footprint: 4, seedCost: 135000000000, hp: 19000, coins: 22000000000, growSeconds: 3369600, color: "#5d9e58", unlock: { type: "tool", value: "crosscut_saw" } },
  { id: "ginkgo_tree", name: "黃金銀杏樹", emoji: "🍂", image: "ginkgo-tree-yellow.png", type: "tree", footprint: 4, seedCost: 320000000000, hp: 24500, coins: 52000000000, growSeconds: 3974400, color: "#e5b735", unlock: { type: "harvested", value: 120000 } },
  { id: "maple_tree", name: "赤霞楓樹", emoji: "🍁", image: "maple-tree-red-autumn.png", type: "tree", footprint: 5, seedCost: 760000000000, hp: 31000, coins: 125000000000, growSeconds: 4665600, color: "#c95036", unlock: { type: "tool", value: "double_bit_axe" } },
  { id: "cypress_tree", name: "千年檜木", emoji: "🌲", image: "cypress-tree.png", type: "tree", footprint: 5, seedCost: 1800000000000, hp: 39000, coins: 300000000000, growSeconds: 5529600, color: "#3f7351", unlock: { type: "tool", value: "power_saw" } }
];

*/

/*
const TOOLS = [
  { id: "small_knife", name: "小刀", emoji: "🔪", image: "vegetable-peeler.png", cost: 0, damage: 1, shape: "single", cells: 1, regrowth: 1, unlock: { type: "initial", value: 0 } },
  { id: "garden_shears", name: "園藝剪", emoji: "✂️", image: "pruning-shears.png", cost: 45, damage: 2, shape: "single", cells: 1, regrowth: 1, unlock: { type: "harvested", value: 20 } },
  { id: "hand_trowel", name: "手持鏟", emoji: "🪏", image: "hand-trowel.png", cost: 160, damage: 3, shape: "col3", cells: 3, regrowth: 1, unlock: { type: "harvested", value: 60 } },
  { id: "machete", name: "尖頭鏟", emoji: "♠️", image: "garden-spade.png", cost: 420, damage: 5, shape: "row3", cells: 3, regrowth: 1, unlock: { type: "harvested", value: 120 } },
  { id: "short_sickle", name: "短柄鐮刀", emoji: "⚒️", image: "farm-scythe.png", cost: 1800, damage: 4, shape: "row5", cells: 5, regrowth: 1, unlock: { type: "harvested", value: 250 } },
  { id: "long_sickle", name: "長柄鋤", emoji: "🛠️", image: "garden-hoe.png", cost: 6000, damage: 7, shape: "cross", cells: 5, regrowth: 0.95, unlock: { type: "harvested", value: 600 } },
  { id: "pitchfork", name: "五齒耙", emoji: "🔱", image: "compost-pile-pitchfork.png", cost: 22000, damage: 8, shape: "col5", cells: 5, regrowth: 0.92, unlock: { type: "plots", value: 12 } },
  { id: "rotary_cutter", name: "銅製十字鎬", emoji: "⛏️", image: "copper-pickaxe.png", cost: 85000, damage: 12, shape: "diamond2", cells: 13, regrowth: 0.9, unlock: { type: "harvested", value: 2500 } },
  { id: "steel_harvester", name: "精鋼鋤", emoji: "🛠️", image: "iron-hoe.png", cost: 300000, damage: 25, shape: "square3", cells: 9, regrowth: 0.8, unlock: { type: "plots", value: 18 } },
  { id: "wide_scythe", name: "廣域鐮刀", emoji: "⚒️", image: "farm-scythe.png", cost: 1200000, damage: 32, shape: "cross9", cells: 9, regrowth: 0.72, unlock: { type: "harvested", value: 12000 } },
  { id: "prosperity_blade", name: "聯合收割機", emoji: "🚜", image: "combine-harvester.png", cost: 6000000, damage: 60, shape: "square5", cells: 25, regrowth: 0.6, unlock: { type: "plots", value: 24 } },
  { id: "grand_harvester", name: "巨型聯合收割機", emoji: "🚜", image: "combine-harvester.png", cost: 30000000, damage: 110, shape: "square7", cells: 49, regrowth: 0.5, unlock: { type: "harvested", value: 50000 } },
  { id: "forester_axe", name: "林務雙刃斧", emoji: "🪓", image: "woodcutter-hand-axe.png", cost: 120000000, damage: 220, shape: "single", cells: 1, regrowth: 0.48, unlock: { type: "harvested", value: 70000 } },
  { id: "steel_hatchet", name: "精鋼伐木斧", emoji: "🪓", image: "steel-hatchet.png", cost: 350000000, damage: 420, shape: "cross", cells: 5, regrowth: 0.44, unlock: { type: "harvested", value: 90000 } },
  { id: "crosscut_saw", name: "橫切手鋸", emoji: "🪚", image: "hand-saw-crosscut.png", cost: 1100000000, damage: 650, shape: "row5", cells: 5, regrowth: 0.4, unlock: { type: "plots", value: 45 } },
  { id: "double_bit_axe", name: "重型雙刃斧", emoji: "🪓", image: "double-bit-war-axe.png", cost: 4000000000, damage: 1000, shape: "square3", cells: 9, regrowth: 0.34, unlock: { type: "harvested", value: 140000 } },
  { id: "power_saw", name: "動力圓鋸", emoji: "🪚", image: "circular-saw-mini.png", cost: 15000000000, damage: 1800, shape: "square5", cells: 25, regrowth: 0.28, unlock: { type: "harvested", value: 200000 } }
];

*/

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

const PLOTS = [...INITIAL_PLOT_IDS, ...remainingPlotIds].map((id) => ({
  id,
  name: id === INITIAL_PLOT_ID
    ? "中央田"
    : `第 ${Math.floor(id / PLOT_GRID_SIZE) + 1} 列・第 ${id % PLOT_GRID_SIZE + 1} 欄農田`
}));

function getLandPrice(ownedPlotCount) {
  const count = Math.max(0, Math.floor(Number(ownedPlotCount) || 0));
  if (count < INITIAL_PLOT_IDS.length) return 0;
  if (count >= PLOTS.length) return null;
  return roundLandPrice(LAND_PRICE_BASE * (LAND_PRICE_GROWTH ** (count - INITIAL_PLOT_IDS.length)));
}

/*
const HARVESTERS = [
  { id: "micro", name: "單點採收器", emoji: "🦾", image: "kenney-tractor.png", cost: 25000, damage: 3, intervalSeconds: 45, regrowth: 1, range: 1, tier: 1 },
  { id: "clockwork", name: "發條割草機", emoji: "🦾", image: "kenney-tractor-shovel.png", cost: 120000, damage: 6, intervalSeconds: 30, regrowth: 1, range: 3, tier: 2 },
  { id: "copper", name: "銅輪收割機", emoji: "⚙️", image: "kenney-delivery.png", cost: 450000, damage: 12, intervalSeconds: 20, regrowth: 0.95, range: 5, tier: 3 },
  { id: "steam", name: "蒸汽收割機", emoji: "🚜", image: "kenney-delivery-flat.png", cost: 1800000, damage: 30, intervalSeconds: 12, regrowth: 0.85, range: 7, tier: 4 },
  { id: "starcore", name: "星核聯合收割機", emoji: "🤖", image: "kenney-garbage-truck.png", cost: 8000000, damage: 90, intervalSeconds: 5, regrowth: 0.7, range: 9, tier: 5 },
  { id: "tree_sawmill", name: "自動鋸木站", emoji: "🪵", image: "kenney-truck-flat.png", cost: 25000000000, damage: 1400, intervalSeconds: 8, regrowth: 0.55, range: 5, tier: 6, targetType: "tree" },
  { id: "tree_lumber_mill", name: "林業採伐廠", emoji: "🏭", image: "kenney-truck.png", cost: 180000000000, damage: 4000, intervalSeconds: 4, regrowth: 0.38, range: 9, tier: 7, targetType: "tree" }
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
  { id: "bounty", name: "豐收肥料", emoji: "🧺", cost: 6000, growthMultiplier: 0.6, coinMultiplier: 1.5, rounds: 5, purpose: "中期通用肥料，適合穩定反覆收割同一批作物。", unlock: { type: "plots", value: 6 } },
  { id: "kelp", name: "海藻營養液", emoji: "🌊", cost: 28000, growthMultiplier: 0.55, coinMultiplier: 1.65, rounds: 5, purpose: "偏重生長速度，適合等待時間較長的作物。", unlock: { type: "lifetimeGold", value: 30000 } },
  { id: "star", name: "星露精華", emoji: "💫", cost: 120000, growthMultiplier: 0.4, coinMultiplier: 2, rounds: 8, purpose: "自動化階段的長效加速，能同時提高離線收入。", unlock: { type: "automation", value: 0 } },
  { id: "bone", name: "骨粉精華", emoji: "🦴", cost: 300000, growthMultiplier: 0.48, coinMultiplier: 2.15, rounds: 6, purpose: "偏重單次收成價值，適合高收益作物。", unlock: { type: "harvested", value: 5000 } },
  { id: "crystal", name: "晶礦生長劑", emoji: "💎", cost: 900000, growthMultiplier: 0.36, coinMultiplier: 2.4, rounds: 8, purpose: "大幅縮短高階作物週期，適合灑水器覆蓋區。", unlock: { type: "plots", value: 18 } },
  { id: "mycelium", name: "菌絲活化土", emoji: "🍄", cost: 2800000, growthMultiplier: 0.32, coinMultiplier: 2.75, rounds: 9, purpose: "提供多輪穩定增產，適合長時間離線配置。", unlock: { type: "lifetimeGold", value: 10000000 } },
  { id: "royal", name: "皇家金穗肥", emoji: "👑", cost: 9000000, growthMultiplier: 0.28, coinMultiplier: 3.2, rounds: 10, purpose: "後期高倍率增產，用於昂貴種子可快速回收成本。", unlock: { type: "tool", value: "prosperity_blade" } },
  { id: "eternal", name: "永恆沃土精華", emoji: "🌟", cost: 30000000, growthMultiplier: 0.24, coinMultiplier: 4, rounds: 12, purpose: "終局長效肥料，最大化高階自動農場的每輪收益。", unlock: { type: "plots", value: 32 } }
];

*/

const plantById = new Map(PLANTS.map((item) => [item.id, item]));
const toolById = new Map(TOOLS.map((item) => [item.id, item]));
const harvesterById = new Map(HARVESTERS.map((item) => [item.id, item]));
const sprinklerById = new Map(SPRINKLERS.map((item) => [item.id, item]));
const fertilizerById = new Map(FERTILIZERS.map((item) => [item.id, item]));
const decorationById = new Map(DECORATIONS.map((item) => [item.id, item]));
const FERTILIZER_STACK_DECAY = 0.62;

function getPlant(id) { return plantById.get(id); }
function getTool(id) { return toolById.get(id); }
function getHarvester(id) { return harvesterById.get(id); }
function getSprinkler(id) { return sprinklerById.get(id); }
function getFertilizer(id) { return fertilizerById.get(id); }
function getDecoration(id) { return decorationById.get(id); }
function getProductPrice(kind, item) { return kind === "seed" ? item?.seedCost : item?.cost; }

function fertilizerStacksForCell(cell) {
  if (!cell) return [];
  const source = Array.isArray(cell.fertilizerStacks) && cell.fertilizerStacks.length
    ? cell.fertilizerStacks
    : cell.fertilizerId && getFertilizer(cell.fertilizerId)
      ? [{ id: cell.fertilizerId, rounds: Number.isInteger(cell.fertilizerRounds) ? cell.fertilizerRounds : 1 }]
      : [];
  return source
    .map((stack) => ({ id: stack?.id, rounds: Math.floor(Number(stack?.rounds) || 0) }))
    .filter((stack) => getFertilizer(stack.id) && stack.rounds > 0);
}

function syncLegacyFertilizerFields(cell, stacks = fertilizerStacksForCell(cell)) {
  if (!cell) return [];
  cell.fertilizerStacks = stacks.map((stack) => ({ id: stack.id, rounds: stack.rounds }));
  const primary = cell.fertilizerStacks[0];
  cell.fertilizerId = primary?.id || null;
  cell.fertilizerRounds = primary?.rounds || 0;
  return cell.fertilizerStacks;
}

function getFertilizerEffect(cell) {
  const stacks = fertilizerStacksForCell(cell)
    .sort((left, right) => {
      const leftItem = getFertilizer(left.id);
      const rightItem = getFertilizer(right.id);
      return (1 - (rightItem?.growthMultiplier || 1)) - (1 - (leftItem?.growthMultiplier || 1));
    });
  let growthMultiplier = 1;
  let coinMultiplier = 1;
  stacks.forEach((stack, index) => {
    const fertilizer = getFertilizer(stack.id);
    const weight = FERTILIZER_STACK_DECAY ** index;
    growthMultiplier -= (1 - fertilizer.growthMultiplier) * weight;
    coinMultiplier += (fertilizer.coinMultiplier - 1) * weight;
  });
  return {
    stacks,
    growthMultiplier: Math.max(LOWEST_GROWTH_MULTIPLIER, growthMultiplier),
    coinMultiplier: Math.max(1, coinMultiplier),
    count: stacks.length,
    rounds: stacks.reduce((total, stack) => Math.max(total, stack.rounds), 0)
  };
}

function consumeFertilizerRound(cell) {
  const stacks = fertilizerStacksForCell(cell)
    .map((stack) => ({ ...stack, rounds: stack.rounds - 1 }))
    .filter((stack) => stack.rounds > 0);
  return syncLegacyFertilizerFields(cell, stacks);
}

function plotIdForIndex(index) {
  const row = Math.floor(index / BOARD_SIZE);
  const col = index % BOARD_SIZE;
  return Math.floor(row / LAND_SIZE) * PLOT_GRID_SIZE + Math.floor(col / LAND_SIZE);
}

function indexesForPlot(plotId) {
  const plotRow = Math.floor(plotId / PLOT_GRID_SIZE);
  const plotCol = plotId % PLOT_GRID_SIZE;
  const indexes = [];
  for (let y = 0; y < LAND_SIZE; y += 1) {
    for (let x = 0; x < LAND_SIZE; x += 1) {
      indexes.push((plotRow * LAND_SIZE + y) * BOARD_SIZE + plotCol * LAND_SIZE + x);
    }
  }
  return indexes;
}

function createInitialState(now = Date.now()) {
  return {
    schemaVersion: SAVE_VERSION,
    accountStartedAt: now,
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
        fertilizerRounds: 0,
        fertilizerStacks: []
      };
    }),
    harvesters: [],
    sprinklers: [],
    decorations: [],
    events: {
      [MONTHLY_EVENT_ID]: { claimedAt: 0, plotId: null, centerIndex: null, rewardPlantId: MONTHLY_EVENT_REWARD_PLANT_ID }
    },
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

function automationTargetIndexes(range, plotId, ownedPlots, centerIndex = indexesForPlot(plotId)[4]) {
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

function getPlantFootprint(plantOrId) {
  const plant = typeof plantOrId === "string" ? getPlant(plantOrId) : plantOrId;
  if (plant?.id === "weed") return 1;
  return plant?.type === "tree" ? Math.max(1, Math.floor(plant.footprint || 1)) : 3;
}

function getPlantPlacementIndexes(centerIndex, plantId) {
  const footprint = getPlantFootprint(plantId);
  const centerRow = Math.floor(centerIndex / BOARD_SIZE);
  const centerCol = centerIndex % BOARD_SIZE;
  // Odd footprints are centered on the selected cell. Even footprints use
  // the selected cell as the upper-left cell of the central 2×2/4×4 pair,
  // which keeps every tree selectable without inventing a half-cell target.
  const startRow = centerRow - Math.floor((footprint - 1) / 2);
  const startCol = centerCol - Math.floor((footprint - 1) / 2);
  const indexes = [];
  for (let row = startRow; row < startRow + footprint; row += 1) {
    for (let col = startCol; col < startCol + footprint; col += 1) {
      if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) continue;
      indexes.push(row * BOARD_SIZE + col);
    }
  }
  return indexes;
}

function plantRootIndexForCell(cell, index) {
  return Number.isInteger(cell?.plantRootIndex) ? cell.plantRootIndex : index;
}

function plantAnchorIndexForCell(cell, index) {
  return Number.isInteger(cell?.plantAnchorIndex) ? cell.plantAnchorIndex : index;
}

function isPlantRootCell(cell, index) {
  return plantRootIndexForCell(cell, index) === index;
}

function occupiedIndexesForRoot(state, rootIndex) {
  const rootCell = state.cells[rootIndex];
  if (!rootCell) return [];
  const indexes = getPlantPlacementIndexes(plantAnchorIndexForCell(rootCell, rootIndex), rootCell.plantId);
  return indexes.filter((index) => plantRootIndexForCell(state.cells[index], index) === rootIndex);
}

function getDeviceStateForIndex(state, list, getter, index, cell = null) {
  return list
    .filter((placed) => {
      const item = getter(placed.id);
      const plant = cell ? getPlant(cell.plantId) : null;
      const canTargetPlant = !item?.targetType || item.targetType === plant?.type;
      const targetIndex = plantAnchorIndexForCell(cell, index);
      return item && canTargetPlant && automationTargetIndexes(item.range, placed.plotId, state.ownedPlots, placed.centerIndex).includes(targetIndex);
    })
    .sort((a, b) => (getter(b.id)?.tier || 0) - (getter(a.id)?.tier || 0))[0] || null;
}

function awardHarvest(state, cell, regrowthMultiplier, rootIndex) {
  const plant = getPlant(cell.plantId) || PLANTS[0];
  const fertilizerEffect = getFertilizerEffect(cell);
  const coins = Math.floor(plant.coins * fertilizerEffect.coinMultiplier);
  state.gold += coins;
  state.lifetimeGold += coins;
  state.harvestedCells += 1;
  const occupiedIndexes = Number.isInteger(rootIndex) ? occupiedIndexesForRoot(state, rootIndex) : [];
  const resetIndexes = occupiedIndexes.length ? occupiedIndexes : [state.cells.indexOf(cell)];
  for (const index of resetIndexes) {
    const occupiedCell = state.cells[index];
    if (!occupiedCell) continue;
    occupiedCell.phase = "growing";
    occupiedCell.growthProgress = 0;
    occupiedCell.currentHp = 0;
    occupiedCell.nextGrowthMultiplier = regrowthMultiplier;
    consumeFertilizerRound(occupiedCell);
  }
  return coins;
}

function manualHarvest(state, centerIndex) {
  const tool = getTool(state.equippedToolId) || TOOLS[0];
  const targets = getToolTargetIndexes(tool.id, centerIndex, state.ownedPlots);
  const results = [];
  const harvestedRoots = new Set();
  let totalCoins = 0;
  state.stats.manualClicks += 1;
  for (const index of targets) {
    const rootIndex = plantRootIndexForCell(state.cells[index], index);
    if (harvestedRoots.has(rootIndex)) continue;
    harvestedRoots.add(rootIndex);
    const cell = state.cells[rootIndex];
    if (!cell || cell.phase !== "mature") continue;
    cell.currentHp = Math.max(0, cell.currentHp - tool.damage);
    let coins = 0;
    if (cell.currentHp === 0) {
      coins = awardHarvest(state, cell, tool.regrowth, rootIndex);
      totalCoins += coins;
    }
    results.push({ index: rootIndex, damage: tool.damage, coins, harvested: coins > 0 });
  }
  return { targets, results, totalCoins };
}

function getSprinklerForIndex(state, index, cell = null) {
  const placed = getDeviceStateForIndex(state, state.sprinklers, getSprinkler, index, cell);
  return placed ? getSprinkler(placed.id) : null;
}

function growthDurationSeconds(state, cell, plotId, index = indexesForPlot(plotId)[4]) {
  const plant = getPlant(cell.plantId) || PLANTS[0];
  const sprinkler = getSprinklerForIndex(state, index, cell);
  const fertilizer = cell.plantId !== "weed" ? getFertilizerEffect(cell) : null;
  const multiplier = (cell.nextGrowthMultiplier || 1) * (sprinkler?.growthMultiplier || 1) * (fertilizer?.growthMultiplier || 1);
  return plant.growSeconds * Math.max(LOWEST_GROWTH_MULTIPLIER, multiplier);
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

  const firstCoins = awardHarvest(state, cell, machine.regrowth, index);
  summary.gold += firstCoins;
  summary.harvested += 1;

  let lastHarvestAt = firstHarvestAt;
  while (fertilizerStacksForCell(cell).length) {
    const fertilizedDuration = growthDurationSeconds(state, cell, plotId, index) * 1000;
    const fertilizedHits = Math.max(1, Math.ceil(plant.hp / machine.damage));
    const fertilizedFirstHitOffset = Math.ceil(fertilizedDuration / interval) * interval;
    const fertilizedCycleDuration = fertilizedFirstHitOffset + (fertilizedHits - 1) * interval;
    const nextHarvestAt = lastHarvestAt + fertilizedCycleDuration;
    if (nextHarvestAt > to) break;
    const coins = awardHarvest(state, cell, machine.regrowth, index);
    summary.gold += coins;
    summary.harvested += 1;
    lastHarvestAt = nextHarvestAt;
  }

  if (!fertilizerStacksForCell(cell).length) {
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
      if (!isPlantRootCell(cell, index)) continue;
      const machineState = getDeviceStateForIndex(state, state.harvesters, getHarvester, index, cell);
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

function makeGrowingCell(plantId, metadata = {}) {
  return {
    plantId,
    phase: "growing",
    growthProgress: 0,
    currentHp: 0,
    nextGrowthMultiplier: 1,
    fertilizerId: null,
    fertilizerRounds: 0,
    fertilizerStacks: [],
    ...metadata
  };
}

function clearPlantFootprint(state, rootIndex) {
  const indexes = occupiedIndexesForRoot(state, rootIndex);
  for (const index of indexes) {
    state.cells[index] = {
      plantId: "weed", phase: "mature", growthProgress: 1,
      currentHp: 1, nextGrowthMultiplier: 1, fertilizerId: null, fertilizerRounds: 0, fertilizerStacks: []
    };
  }
}

function sowPlot(state, plotId, plantId) {
  const plant = getPlant(plantId);
  if (!state.ownedPlots.includes(plotId) || !plant || plantId === "weed" || plant.type === "tree") return false;
  const indexes = indexesForPlot(plotId);
  const roots = new Set(indexes.map((index) => plantRootIndexForCell(state.cells[index], index)));
  for (const rootIndex of roots) clearPlantFootprint(state, rootIndex);
  for (const index of indexes) state.cells[index] = makeGrowingCell(plantId);
  return true;
}

function sowPlantAt(state, centerIndex, plantId) {
  const plant = getPlant(plantId);
  if (!plant || plantId === "weed") return false;
  if (plant.type !== "tree") return sowPlot(state, plotIdForIndex(centerIndex), plantId);
  const indexes = getPlantPlacementIndexes(centerIndex, plantId);
  const owned = new Set(state.ownedPlots);
  if (indexes.length !== getPlantFootprint(plant) ** 2 || !indexes.every((index) => owned.has(plotIdForIndex(index)))) return false;
  const roots = new Set(indexes.map((index) => plantRootIndexForCell(state.cells[index], index)));
  for (const rootIndex of roots) clearPlantFootprint(state, rootIndex);
  const rootIndex = indexes[0];
  for (const index of indexes) {
    state.cells[index] = makeGrowingCell(plantId, { plantRootIndex: rootIndex, plantAnchorIndex: centerIndex });
  }
  return true;
}

function claimMonthlyCherryTreeReward(state, now = Date.now()) {
  if (!state || !Array.isArray(state.ownedPlots)) return false;
  state.events ||= {};
  const event = state.events[MONTHLY_EVENT_ID] ||= {
    claimedAt: 0, plotId: null, centerIndex: null, rewardPlantId: MONTHLY_EVENT_REWARD_PLANT_ID
  };
  if (Number(event.claimedAt) > 0) return false;
  const currentTime = Number(now);
  if (!Number.isFinite(currentTime) || currentTime < MONTHLY_EVENT_START_AT || currentTime >= MONTHLY_EVENT_END_AT) return false;
  const plant = getPlant(MONTHLY_EVENT_REWARD_PLANT_ID);
  if (!plant) return false;
  state.inventory ||= {};
  const inventoryKey = `seed_${plant.id}`;
  state.inventory[inventoryKey] = (Number(state.inventory[inventoryKey]) || 0) + 1;
  event.claimedAt = currentTime;
  event.plotId = null;
  event.centerIndex = null;
  event.rewardPlantId = plant.id;
  return { eventId: MONTHLY_EVENT_ID, plantId: plant.id, inventoryKey };
}

function fertilizePlot(state, plotId, fertilizerId) {
  const fertilizer = getFertilizer(fertilizerId);
  if (!state.ownedPlots.includes(plotId) || !fertilizer) return false;
  const indexes = indexesForPlot(plotId);
  const roots = new Set(indexes
    .filter((index) => state.cells[index]?.plantId && state.cells[index].plantId !== "weed")
    .map((index) => plantRootIndexForCell(state.cells[index], index)));
  if (!roots.size) return false;
  for (const rootIndex of roots) {
    const occupiedIndexes = occupiedIndexesForRoot(state, rootIndex);
    for (const index of occupiedIndexes.length ? occupiedIndexes : [rootIndex]) {
      const cell = state.cells[index];
      const stacks = fertilizerStacksForCell(cell);
      stacks.push({ id: fertilizerId, rounds: fertilizer.rounds });
      syncLegacyFertilizerFields(cell, stacks);
    }
  }
  return true;
}

function buyPlot(state, plotId) {
  const plot = PLOTS.find((item) => item.id === plotId);
  const price = getLandPrice(state.ownedPlots.length);
  if (!plot || state.ownedPlots.includes(plotId) || price == null || state.gold < price) return false;
  state.gold -= price;
  state.ownedPlots.push(plotId);
  for (const index of indexesForPlot(plotId)) {
    state.cells[index] = {
      plantId: "weed", phase: "growing", growthProgress: 0,
      currentHp: 0, nextGrowthMultiplier: 1, fertilizerId: null, fertilizerRounds: 0, fertilizerStacks: []
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

function migrateLegacyTreeFootprints(state) {
  if (!state || !Array.isArray(state.cells)) return state;
  for (const plot of PLOTS) {
    const indexes = indexesForPlot(plot.id);
    const treeIds = new Set(indexes.map((index) => state.cells[index]?.plantId).filter((plantId) => getPlant(plantId)?.type === "tree"));
    if (treeIds.size !== 1 || indexes.some((index) => Number.isInteger(state.cells[index]?.plantRootIndex) || Number.isInteger(state.cells[index]?.plantAnchorIndex))) continue;
    const treeId = [...treeIds][0];
    if (!indexes.every((index) => state.cells[index]?.plantId === treeId)) continue;
    const rootIndex = indexes[0];
    const anchorIndex = indexes[4];
    for (const index of indexes) {
      state.cells[index].plantRootIndex = rootIndex;
      state.cells[index].plantAnchorIndex = anchorIndex;
    }
  }
  return state;
}

function normalizeTreeFootprintSizes(state) {
  if (!state || !Array.isArray(state.cells)) return state;
  const ownedPlots = new Set(Array.isArray(state.ownedPlots) ? state.ownedPlots : []);
  const processedRoots = new Set();
  const resetCell = (index) => {
    const owned = ownedPlots.has(plotIdForIndex(index));
    state.cells[index] = {
      plantId: "weed",
      phase: owned ? "mature" : "growing",
      growthProgress: owned ? 1 : 0,
      currentHp: owned ? 1 : 0,
      nextGrowthMultiplier: 1,
      fertilizerId: null,
      fertilizerRounds: 0,
      fertilizerStacks: []
    };
  };
  for (let index = 0; index < state.cells.length; index += 1) {
    const cell = state.cells[index];
    const plant = getPlant(cell?.plantId);
    if (!plant || plant.type !== "tree") continue;
    const oldRootIndex = plantRootIndexForCell(cell, index);
    if (processedRoots.has(oldRootIndex)) continue;
    processedRoots.add(oldRootIndex);
    const rootCell = state.cells[oldRootIndex] || cell;
    const anchorIndex = plantAnchorIndexForCell(rootCell, oldRootIndex);
    const targetIndexes = getPlantPlacementIndexes(anchorIndex, plant.id);
    const oldIndexes = [];
    for (let candidate = 0; candidate < state.cells.length; candidate += 1) {
      if (plantRootIndexForCell(state.cells[candidate], candidate) === oldRootIndex && state.cells[candidate]?.plantId === plant.id) oldIndexes.push(candidate);
    }
    if (targetIndexes.length !== getPlantFootprint(plant) ** 2) continue;
    const oldSnapshot = { ...rootCell };
    for (const oldIndex of oldIndexes) {
      if (!targetIndexes.includes(oldIndex)) resetCell(oldIndex);
    }
    const nextRootIndex = targetIndexes[0];
    for (const targetIndex of targetIndexes) {
      state.cells[targetIndex] = {
        ...oldSnapshot,
        plantRootIndex: nextRootIndex,
        plantAnchorIndex: anchorIndex
      };
    }
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
  migrateLegacyTreeFootprints(state);
  normalizeTreeFootprintSizes(state);
  if (!state || !Array.isArray(state.cells)) return state;
  if (!Number.isFinite(Number(state.accountStartedAt))) state.accountStartedAt = Number(state.lastSimulatedAt) || Date.now();
  if (!Array.isArray(state.decorations)) state.decorations = [];
  state.events ||= {};
  if (!state.events[MONTHLY_EVENT_ID] || typeof state.events[MONTHLY_EVENT_ID] !== "object") {
    state.events[MONTHLY_EVENT_ID] = { claimedAt: 0, plotId: null, centerIndex: null, rewardPlantId: MONTHLY_EVENT_REWARD_PLANT_ID };
  }
  for (const cell of state.cells) {
    if (!cell) continue;
    syncLegacyFertilizerFields(cell, fertilizerStacksForCell(cell));
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
  if (!Array.isArray(state.decorations)) return false;
  if (!state.decorations.every((placed) => {
    const decoration = getDecoration(placed?.id);
    return Boolean(decoration)
      && placed.slotType === decoration.slotType
      && Number.isInteger(placed.row)
      && Number.isInteger(placed.col)
      && (placed.slotType === "corner" || placed.direction === "horizontal" || placed.direction === "vertical");
  })) return false;
  return state.cells.every((cell) => cell && getPlant(cell.plantId) && ["growing", "mature"].includes(cell.phase) && Number.isFinite(cell.growthProgress) && Number.isInteger(cell.fertilizerRounds) && cell.fertilizerRounds >= 0);
}

globalThis.HarvestCore = Object.freeze({
  BOARD_SIZE, PLOT_GRID_SIZE, INITIAL_PLOT_ID, INITIAL_PLOT_IDS, SAVE_VERSION, PLANTS, TOOLS, PLOTS,
  HARVESTERS, SPRINKLERS, FERTILIZERS, DECORATIONS, getPlant, getTool,
  getHarvester, getSprinkler, getFertilizer, getDecoration, getProductPrice, plotIdForIndex,
  indexesForPlot, getLandPrice, getPlantFootprint, getPlantPlacementIndexes, createInitialState, isAutomationUnlocked,
  isToolUnlocked, isPlantUnlocked, isFertilizerUnlocked,
  getToolTargetIndexes, automationTargetIndexes, manualHarvest, growthDurationSeconds,
  getFertilizerEffect,
  simulateTo, sowPlot, sowPlantAt, claimMonthlyCherryTreeReward, fertilizePlot, buyPlot, formatNumber,
  formatTime, migrateLegacyCropIds, normalizeStateData, validateState
});
}(globalThis));
