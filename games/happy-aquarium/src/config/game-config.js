export const GAME_WIDTH = 1000;
export const GAME_HEIGHT = 600;
export const MAX_FISH = 99;
export const TIME_ZONE = "Asia/Taipei";

export const SPECIES = [
  ["goby", "小蝦虎", 1, 30, 60, 30, 10, 35, [0.72, 0.92]],
  ["guppy", "孔雀魚", 1, 45, 100, 45, 10, 70, [0.20, 0.58]],
  ["anglerfish", "燈籠魚", 3, 90, 210, 90, 12, 30, [0.58, 0.88]],
  ["golden-koi", "黃金錦鯉", 5, 260, 600, 180, 12, 45, [0.18, 0.78]],
  ["zebrafish", "斑馬魚", 6, 150, 360, 120, 14, 95, [0.22, 0.62]],
  ["clownfish", "小丑魚", 10, 500, 1200, 240, 12, 55, [0.32, 0.72]],
  ["blue-devil", "藍魔鬼", 10, 520, 1250, 240, 13, 65, [0.28, 0.72]],
  ["angelfish", "神仙魚", 16, 1400, 3400, 360, 12, 35, [0.25, 0.75]],
  ["lionfish", "獅子魚", 16, 1800, 4400, 480, 11, 30, [0.45, 0.85]],
  ["moonfish", "月光魚", 20, 3200, 8000, 600, 10, 45, [0.20, 0.68]],
  ["arowana", "龍魚", 25, 8000, 20000, 960, 9, 60, [0.12, 0.42]],
  ["electric-eel", "電鰻", 25, 8800, 22000, 1080, 10, 70, [0.45, 0.88]],
  ["stingray", "魟魚", 32, 20000, 52000, 1440, 8, 40, [0.76, 0.94]],
  ["rainbow-mermaid", "彩虹美人魚", 40, null, 120000, 1440, 8, 55, [0.15, 0.88]],
].map(([id, name, unlockLevel, eggPrice, adultSellPrice, growthMinutes, satietyDrainPerHour, maxSpeed, depth]) => ({
  id,
  name,
  unlockLevel,
  eggPrice,
  adultSellPrice,
  growthMs: growthMinutes * 60_000,
  satietyDrainPerHour,
  movement: { maxSpeed, depthMin: depth[0], depthMax: depth[1] },
}));

export const SPECIES_BY_ID = Object.fromEntries(SPECIES.map((item) => [item.id, item]));

export const HELPERS = [
  { id: "apple-snail", name: "蘋果螺", unlockLevel: 5, price: 800, reduction: 0.20, drainPerHour: 0.75 },
  { id: "cleaner-shrimp", name: "清潔蝦", unlockLevel: 16, price: 4500, reduction: 0.15, drainPerHour: 1 },
  { id: "pleco", name: "清道夫魚", unlockLevel: 20, price: 9000, reduction: 0.25, drainPerHour: 35 / 24 },
];

export const DEVICES = [
  { id: "bubble-stone", name: "氣泡石", unlockLevel: 8, price: 1200, slot: "aeration", reduction: 0.10 },
  { id: "basic-feeder", name: "基礎餵食器", unlockLevel: 12, price: 2500, slot: "feeder", capacity: 4, intervalMs: 6 * 3_600_000 },
  { id: "warm-lamp", name: "暖燈", unlockLevel: 16, price: 7500, slot: "growth-light", growthMultiplier: 1.10 },
  { id: "hang-on-filter", name: "外掛過濾器", unlockLevel: 20, price: 15000, slot: "filter", reduction: 0.25 },
  { id: "advanced-feeder", name: "進階餵食器", unlockLevel: 25, price: 12000, slot: "feeder", capacity: 8, intervalMs: 6 * 3_600_000 },
  { id: "uv-sterilizer", name: "UV 殺菌燈", unlockLevel: 32, price: 30000, slot: "sterilizer" },
];

export const DECORATIONS = [
  ["anubias-plant", "水榕", 1, 100, 2], ["java-fern", "爪哇蕨", 1, 150, 3],
  ["vallisneria-grass", "苦草", 3, 220, 4], ["moss-ball", "莫絲球", 3, 300, 5],
  ["starfish", "海星", 4, 500, 6], ["red-seaweed", "紅海藻", 5, 450, 7],
  ["shell-cluster", "貝殼組", 5, 600, 7], ["driftwood-arch", "沉木拱", 5, 750, 8],
  ["pink-branch-coral", "粉枝珊瑚", 6, 800, 9], ["blue-fan-coral", "藍扇珊瑚", 6, 900, 10],
  ["string-lights", "燈串", 6, 2800, 17], ["brain-coral", "腦珊瑚", 8, 1200, 12],
  ["rock-arch", "岩石拱", 8, 1200, 12], ["ceramic-vase", "陶瓷花瓶", 8, 1200, 11],
  ["pebble-cave", "礫石洞", 10, 1800, 16], ["bubble-conch", "氣泡海螺", 10, 1500, 14],
  ["aquarium-castle", "水族城堡", 12, 2500, 20], ["diver-helmet", "潛水頭盔", 12, 3000, 18],
  ["decorative-treasure-chest", "裝飾寶箱", 14, 8000, 25], ["rusty-anchor", "生鏽船錨", 14, 3500, 20],
  ["lighthouse", "燈塔", 18, 6000, 30], ["pearl-clam", "珍珠蚌", 18, 6000, 24],
  ["temple-ruins", "神殿遺跡", 20, 5000, 28], ["moon-statue", "月亮雕像", 24, 10000, 38],
  ["pirate-shipwreck", "海盜沉船", 25, 8000, 36], ["mirror-backdrop", "鏡面背景", 25, 12000, 32],
  ["toy-submarine", "玩具潛艇", 28, 15000, 42], ["rainbow-crystal", "彩虹水晶", 30, 20000, 50],
  ["coral-gate", "珊瑚門", 40, 50000, 60],
].map(([id, name, unlockLevel, price, appeal]) => ({ id, name, unlockLevel, price, appeal }));

export const HELPER_BY_ID = Object.fromEntries(HELPERS.map((item) => [item.id, item]));
export const DEVICE_BY_ID = Object.fromEntries(DEVICES.map((item) => [item.id, item]));
export const DECORATION_BY_ID = Object.fromEntries(DECORATIONS.map((item) => [item.id, item]));

export const STAGE_MULTIPLIER = { egg: 0, fry: 0.25, juvenile: 0.60, adult: 1 };
export const STAGE_SCALE = { egg: 0.75, fry: 0.40, juvenile: 0.70, adult: 1 };
export const TRANSACTION_LIMIT = 50;
export const OFFLINE_CAP_MS = 7 * 24 * 3_600_000;
export const FEED_COOLDOWN_MS = 60_000;
