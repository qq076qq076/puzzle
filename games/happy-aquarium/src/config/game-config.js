export const GAME_WIDTH = 1000;
export const GAME_HEIGHT = 600;
export const TIME_ZONE = "Asia/Taipei";

export const SPECIES = [
  ["goby", "小蝦虎", [], 30, 60, 30, 10, 35, 0.72, 60, [0.72, 0.92]],
  ["guppy", "孔雀魚", [], 45, 100, 45, 10, 70, 0.78, 70, [0.20, 0.58]],
  ["anglerfish", "燈籠魚", ["guppy"], 90, 210, 90, 12, 30, 0.95, 100, [0.58, 0.88]],
  ["golden-koi", "黃金錦鯉", ["anglerfish"], 260, 600, 180, 12, 45, 1.08, 130, [0.18, 0.78]],
  ["zebrafish", "斑馬魚", ["guppy"], 150, 360, 120, 14, 95, 0.80, 75, [0.22, 0.62]],
  ["clownfish", "小丑魚", ["golden-koi"], 500, 1200, 240, 12, 55, 0.90, 90, [0.32, 0.72]],
  ["blue-devil", "藍魔鬼", ["clownfish"], 520, 1250, 240, 13, 65, 0.88, 95, [0.28, 0.72]],
  ["angelfish", "神仙魚", ["blue-devil"], 1400, 3400, 360, 12, 35, 1.05, 110, [0.25, 0.75]],
  ["lionfish", "獅子魚", ["angelfish"], 1800, 4400, 480, 11, 30, 1.12, 125, [0.45, 0.85]],
  ["moonfish", "月光魚", ["lionfish"], 3200, 8000, 600, 10, 45, 1.00, 120, [0.20, 0.68]],
  ["arowana", "龍魚", ["moonfish"], 8000, 20000, 960, 9, 60, 1.25, 160, [0.12, 0.42]],
  ["electric-eel", "電鰻", ["arowana"], 8800, 22000, 1080, 10, 70, 1.22, 150, [0.45, 0.88]],
  ["stingray", "魟魚", ["electric-eel"], 20000, 52000, 1440, 8, 40, 1.45, 180, [0.76, 0.94]],
  ["rainbow-mermaid", "彩虹美人魚", ["rainbow-crystal"], null, 120000, 1440, 8, 55, 1.25, 165, [0.15, 0.88]],
].map(([id, name, requires, eggPrice, adultSellPrice, growthMinutes, satietyDrainPerHour, maxSpeed, displayScale, stomachCapacity, depth]) => ({
  id,
  name,
  requires,
  eggPrice,
  adultSellPrice,
  growthMs: growthMinutes * 60_000,
  satietyDrainPerHour,
  displayScale,
  stomachCapacity,
  movement: { maxSpeed, depthMin: depth[0], depthMax: depth[1] },
}));

export const SPECIES_BY_ID = Object.fromEntries(SPECIES.map((item) => [item.id, item]));

export const PERSONALITIES = [
  { id: "curious", name: "好奇", speedMultiplier: 1.05, retargetMultiplier: 0.80 },
  { id: "calm", name: "沉穩", speedMultiplier: 0.90, retargetMultiplier: 1.25 },
  { id: "playful", name: "活潑", speedMultiplier: 1.15, retargetMultiplier: 0.70 },
  { id: "shy", name: "害羞", speedMultiplier: 0.95, retargetMultiplier: 1.40 },
];
export const PERSONALITY_BY_ID = Object.fromEntries(PERSONALITIES.map((item) => [item.id, item]));

export const HABITATS = {
  plants: "水草",
  caves: "洞穴",
  corals: "珊瑚",
  relics: "遺跡",
};

export const SPECIES_HABITAT = {
  goby: "caves", guppy: "plants", anglerfish: "caves", "golden-koi": "plants",
  zebrafish: "plants", clownfish: "corals", "blue-devil": "corals", angelfish: "plants",
  lionfish: "caves", moonfish: "relics", arowana: "plants", "electric-eel": "caves",
  stingray: "relics", "rainbow-mermaid": "corals",
};

export const FISH_FOODS = [
  { id: "basic-food", name: "基本飼料", nutrition: 15, price: null, tint: 0xffffff },
  { id: "nutritious-food", name: "高營養飼料", nutrition: 30, price: 25, tint: 0x72e6ad },
  { id: "gourmet-food", name: "豪華飼料", nutrition: 60, price: 50, tint: 0xffd166 },
];

export const FISH_FOOD_BY_ID = Object.fromEntries(FISH_FOODS.map((item) => [item.id, item]));

export const CONSUMABLES = [
  ...FISH_FOODS.filter((item) => item.price != null).map((item) => ({ ...item, kind: "fish-food", requires: [] })),
  { id: "algae-wafer", name: "藻錠", kind: "algae-wafer", price: 50, requires: ["apple-snail"] },
  { id: "medicine", name: "藥水", kind: "medicine", price: 100, requires: [] },
];

export const CONSUMABLE_BY_ID = Object.fromEntries(CONSUMABLES.map((item) => [item.id, item]));

export const HELPERS = [
  { id: "apple-snail", name: "蘋果螺", requires: ["goby"], price: 800, reduction: 0.20, drainPerHour: 0.75, movementSpeed: 10 },
  { id: "cleaner-shrimp", name: "清潔蝦", requires: ["clownfish"], price: 4500, reduction: 0.15, drainPerHour: 1, movementSpeed: 18 },
  { id: "pleco", name: "清道夫魚", requires: ["cleaner-shrimp"], price: 9000, reduction: 0.25, drainPerHour: 35 / 24, movementSpeed: 24 },
  { id: "coin-hermit-crab", name: "收幣寄居蟹", requires: ["pleco"], price: 18000, reduction: 0, drainPerHour: 0, movementSpeed: 30, role: "coin-collector" },
];

export const DEVICES = [
  { id: "bubble-stone", name: "氣泡石", requires: ["apple-snail"], price: 1200, slot: "aeration", reduction: 0.10 },
  { id: "basic-feeder", name: "基礎餵食器", requires: ["bubble-stone"], price: 2500, slot: "feeder", capacity: 4, intervalMs: 6 * 3_600_000 },
  { id: "warm-lamp", name: "暖燈", requires: ["basic-feeder"], price: 7500, slot: "growth-light", growthMultiplier: 1.10 },
  { id: "hang-on-filter", name: "外掛過濾器", requires: ["cleaner-shrimp"], price: 15000, slot: "filter", reduction: 0.25 },
  { id: "advanced-feeder", name: "進階餵食器", requires: ["basic-feeder", "hang-on-filter"], price: 12000, slot: "feeder", capacity: 8, intervalMs: 6 * 3_600_000 },
  { id: "uv-sterilizer", name: "UV 殺菌燈", requires: ["hang-on-filter"], price: 30000, slot: "sterilizer" },
];

export const DECORATIONS = [
  ["anubias-plant", "水榕", [], 100, 2], ["java-fern", "爪哇蕨", [], 150, 3],
  ["vallisneria-grass", "苦草", [], 220, 4], ["moss-ball", "莫絲球", [], 300, 5],
  ["starfish", "海星", [], 500, 6], ["red-seaweed", "紅海藻", [], 450, 7],
  ["shell-cluster", "貝殼組", [], 600, 7], ["driftwood-arch", "沉木拱", [], 750, 8],
  ["pink-branch-coral", "粉枝珊瑚", [], 800, 9], ["blue-fan-coral", "藍扇珊瑚", [], 900, 10],
  ["string-lights", "燈串", ["red-seaweed"], 2800, 17], ["brain-coral", "腦珊瑚", ["driftwood-arch"], 1200, 12],
  ["rock-arch", "岩石拱", ["driftwood-arch"], 1200, 12], ["ceramic-vase", "陶瓷花瓶", ["driftwood-arch"], 1200, 11],
  ["pebble-cave", "礫石洞", ["rock-arch"], 1800, 16], ["bubble-conch", "氣泡海螺", ["rock-arch"], 1500, 14],
  ["aquarium-castle", "水族城堡", ["ceramic-vase"], 2500, 20], ["diver-helmet", "潛水頭盔", ["ceramic-vase"], 3000, 18],
  ["decorative-treasure-chest", "裝飾寶箱", ["aquarium-castle"], 8000, 25], ["rusty-anchor", "生鏽船錨", ["aquarium-castle"], 3500, 20],
  ["lighthouse", "燈塔", ["diver-helmet"], 6000, 30], ["pearl-clam", "珍珠蚌", ["diver-helmet"], 6000, 24],
  ["temple-ruins", "神殿遺跡", ["lighthouse"], 5000, 28], ["moon-statue", "月亮雕像", ["temple-ruins"], 10000, 38],
  ["pirate-shipwreck", "海盜沉船", ["decorative-treasure-chest"], 8000, 36], ["mirror-backdrop", "鏡面背景", ["decorative-treasure-chest"], 12000, 32],
  ["toy-submarine", "玩具潛艇", ["pirate-shipwreck"], 15000, 42], ["rainbow-crystal", "彩虹水晶", ["mirror-backdrop"], 20000, 50],
  ["coral-gate", "珊瑚門", ["rainbow-crystal"], 50000, 60],
].map(([id, name, requires, price, appeal]) => ({ id, name, requires, price, appeal }));

export const HELPER_BY_ID = Object.fromEntries(HELPERS.map((item) => [item.id, item]));
export const DEVICE_BY_ID = Object.fromEntries(DEVICES.map((item) => [item.id, item]));
export const DECORATION_BY_ID = Object.fromEntries(DECORATIONS.map((item) => [item.id, item]));

const PLANT_DECORATIONS = ["anubias-plant", "java-fern", "vallisneria-grass", "moss-ball", "red-seaweed"];
const CORAL_DECORATIONS = ["starfish", "shell-cluster", "pink-branch-coral", "blue-fan-coral", "brain-coral", "pearl-clam", "coral-gate"];
const CAVE_DECORATIONS = ["driftwood-arch", "rock-arch", "pebble-cave", "bubble-conch"];
export const DECORATION_HABITAT_BY_ID = Object.fromEntries(DECORATIONS.map((item) => [
  item.id,
  PLANT_DECORATIONS.includes(item.id) ? "plants" : CORAL_DECORATIONS.includes(item.id) ? "corals" : CAVE_DECORATIONS.includes(item.id) ? "caves" : "relics",
]));

export const DEVICE_PLACEMENTS = {
  "bubble-stone": { x: 0.18, y: 0.86, scale: 1.25, depth: 420 },
  "basic-feeder": { x: 0.84, y: 0.17, scale: 1.25, depth: 420 },
  "advanced-feeder": { x: 0.84, y: 0.17, scale: 1.25, depth: 420 },
  "warm-lamp": { x: 0.67, y: 0.13, scale: 1.25, depth: 420 },
  "hang-on-filter": { x: 0.08, y: 0.22, scale: 1.25, depth: 420 },
  "uv-sterilizer": { x: 0.13, y: 0.34, scale: 1.25, depth: 420 },
};

export const DECORATION_SCALE = { min: 0.75, max: 2.50, default: 1.45 };
export const DEVICE_SCALE = { min: 0.75, max: 2.00, default: 1.25 };

export const STAGE_MULTIPLIER = { egg: 0, fry: 0.25, juvenile: 0.60, adult: 1 };
export const STAGE_SCALE = { egg: 0.75, fry: 0.40, juvenile: 0.70, adult: 1 };
export const TRANSACTION_LIMIT = 50;
export const OFFLINE_CAP_MS = 7 * 24 * 3_600_000;
export const FOOD_LIFETIME_MS = 20_000;
export const FOOD_FALL_SPEED_PX = 24;
export const HAPPINESS_COIN_THRESHOLD = 60;
export const HAPPINESS_COIN_INTERVAL_MIN_MS = 45_000;
export const HAPPINESS_COIN_INTERVAL_MAX_MS = 90_000;
export const HAPPINESS_COIN_DAILY_LIMIT = 12;
export const COIN_DROP_LIFETIME_MS = 120_000;
export const COIN_DROP_LIMIT = 40;
export const COIN_FALL_SPEED_PX = 16;

export const ASSET_INSETS = {
  helpers: {},
  devices: {},
  decorations: {},
};
