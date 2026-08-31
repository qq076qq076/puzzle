export const GAME_WIDTH = 1000;
export const GAME_HEIGHT = 600;
export const TIME_ZONE = "Asia/Taipei";

export const SPECIES = [
  ["goby", "小蝦虎", [], 30, 60, 30, 10, 35, 0.72, [0.72, 0.92]],
  ["guppy", "孔雀魚", [], 45, 100, 45, 10, 70, 0.78, [0.20, 0.58]],
  ["anglerfish", "燈籠魚", ["guppy"], 90, 210, 90, 12, 30, 0.95, [0.58, 0.88]],
  ["golden-koi", "黃金錦鯉", ["anglerfish"], 260, 600, 180, 12, 45, 1.08, [0.18, 0.78]],
  ["zebrafish", "斑馬魚", ["guppy"], 150, 360, 120, 14, 95, 0.80, [0.22, 0.62]],
  ["clownfish", "小丑魚", ["golden-koi"], 500, 1200, 240, 12, 55, 0.90, [0.32, 0.72]],
  ["blue-devil", "藍魔鬼", ["clownfish"], 520, 1250, 240, 13, 65, 0.88, [0.28, 0.72]],
  ["angelfish", "神仙魚", ["blue-devil"], 1400, 3400, 360, 12, 35, 1.05, [0.25, 0.75]],
  ["lionfish", "獅子魚", ["angelfish"], 1800, 4400, 480, 11, 30, 1.12, [0.45, 0.85]],
  ["moonfish", "月光魚", ["lionfish"], 3200, 8000, 600, 10, 45, 1.00, [0.20, 0.68]],
  ["arowana", "龍魚", ["moonfish"], 8000, 20000, 960, 9, 60, 1.25, [0.12, 0.42]],
  ["electric-eel", "電鰻", ["arowana"], 8800, 22000, 1080, 10, 70, 1.22, [0.45, 0.88]],
  ["stingray", "魟魚", ["electric-eel"], 20000, 52000, 1440, 8, 40, 1.45, [0.76, 0.94]],
  ["rainbow-mermaid", "彩虹美人魚", ["rainbow-crystal"], null, 120000, 1440, 8, 55, 1.25, [0.15, 0.88]],
].map(([id, name, requires, eggPrice, adultSellPrice, growthMinutes, satietyDrainPerHour, maxSpeed, displayScale, depth]) => ({
  id,
  name,
  requires,
  eggPrice,
  adultSellPrice,
  growthMs: growthMinutes * 60_000,
  satietyDrainPerHour,
  displayScale,
  movement: { maxSpeed, depthMin: depth[0], depthMax: depth[1] },
}));

export const SPECIES_BY_ID = Object.fromEntries(SPECIES.map((item) => [item.id, item]));

export const HELPERS = [
  { id: "apple-snail", name: "蘋果螺", requires: ["goby"], price: 800, reduction: 0.20, drainPerHour: 0.75, movementSpeed: 10 },
  { id: "cleaner-shrimp", name: "清潔蝦", requires: ["clownfish"], price: 4500, reduction: 0.15, drainPerHour: 1, movementSpeed: 18 },
  { id: "pleco", name: "清道夫魚", requires: ["cleaner-shrimp"], price: 9000, reduction: 0.25, drainPerHour: 35 / 24, movementSpeed: 24 },
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
  ["vallisneria-grass", "苦草", ["anubias-plant"], 220, 4], ["moss-ball", "莫絲球", ["anubias-plant"], 300, 5],
  ["starfish", "海星", ["java-fern"], 500, 6], ["red-seaweed", "紅海藻", ["java-fern"], 450, 7],
  ["shell-cluster", "貝殼組", ["java-fern"], 600, 7], ["driftwood-arch", "沉木拱", ["java-fern"], 750, 8],
  ["pink-branch-coral", "粉枝珊瑚", ["red-seaweed"], 800, 9], ["blue-fan-coral", "藍扇珊瑚", ["red-seaweed"], 900, 10],
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

export const DEVICE_PLACEMENTS = {
  "bubble-stone": { x: 0.18, y: 0.86, scale: 0.90, depth: 420 },
  "basic-feeder": { x: 0.84, y: 0.17, scale: 0.90, depth: 420 },
  "advanced-feeder": { x: 0.84, y: 0.17, scale: 0.90, depth: 420 },
  "warm-lamp": { x: 0.67, y: 0.13, scale: 0.90, depth: 420 },
  "hang-on-filter": { x: 0.08, y: 0.22, scale: 0.90, depth: 420 },
  "uv-sterilizer": { x: 0.13, y: 0.34, scale: 0.90, depth: 420 },
};

export const STAGE_MULTIPLIER = { egg: 0, fry: 0.25, juvenile: 0.60, adult: 1 };
export const STAGE_SCALE = { egg: 0.75, fry: 0.40, juvenile: 0.70, adult: 1 };
export const TRANSACTION_LIMIT = 50;
export const OFFLINE_CAP_MS = 7 * 24 * 3_600_000;
export const FOOD_LIFETIME_MS = 20_000;
export const FOOD_SATIETY = 15;
export const FOOD_FALL_SPEED_PX = 24;
export const COIN_DROP_INTERVAL_MS = 30_000;
export const COIN_DROP_LIFETIME_MS = 120_000;
export const COIN_DROP_LIMIT = 40;
export const COIN_FALL_SPEED_PX = 16;

export const ASSET_INSETS = {
  helpers: {},
  devices: {},
  decorations: {},
};
