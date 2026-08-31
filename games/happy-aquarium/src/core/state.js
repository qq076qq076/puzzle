import { DECORATION_SCALE, DEVICE_SCALE } from "../config/game-config.js";

export const SCHEMA_VERSION = 3;

export function makeId(prefix = "item") {
  const suffix = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}_${suffix}`;
}

export function createFreshState(now = Date.now()) {
  return {
    schemaVersion: SCHEMA_VERSION,
    player: { coins: 300, gems: 3 },
    tank: {
      name: "我的第一缸",
      cleanliness: 100,
      fishes: [],
      helpers: [],
      devices: { instances: [], slots: {} },
      decorations: [],
      foods: [],
      coinDrops: [],
    },
    inventory: { algaeWafers: 2, medicines: 1, filterCartridges: 0, decorationShards: 0, fertilizerShards: 0 },
    tutorial: { step: "buy-first-egg", firstEggOverrideConsumed: false, claimedRewardIds: [] },
    events: { nextRewardAt: now + 4 * 3_600_000, pendingRewards: 0 },
    quests: { dayKey: "", items: [] },
    achievements: {},
    stats: { eggsBought: 0, fishSold: 0, fishHatched: 0 },
    settings: { music: 0.5, effects: 0.7, reducedMotion: false },
    rng: { state: (now ^ 0xa5a5a5a5) >>> 0 },
    transactions: { recentIds: [], recent: [] },
    lastProcessedAt: now,
  };
}

export function normalizeState(input, now = Date.now()) {
  if (!input || typeof input !== "object") return createFreshState(now);
  const fresh = createFreshState(now);
  const state = structuredClone(input);
  state.schemaVersion = SCHEMA_VERSION;
  state.player = {
    coins: Math.max(0, finiteInt(state.player?.coins, fresh.player.coins)),
    gems: Math.max(0, finiteInt(state.player?.gems, fresh.player.gems)),
  };
  state.tank = { ...fresh.tank, ...(state.tank ?? {}) };
  delete state.tank.fishLimit;
  delete state.tank.lastFeedAt;
  state.tank.fishes = Array.isArray(state.tank.fishes) ? state.tank.fishes : [];
  state.tank.helpers = Array.isArray(state.tank.helpers) ? state.tank.helpers : [];
  state.tank.decorations = Array.isArray(state.tank.decorations)
    ? state.tank.decorations.map((item) => ({ ...item, scale: clamp(finiteNumber(item?.scale, DECORATION_SCALE.default), DECORATION_SCALE.min, DECORATION_SCALE.max) }))
    : [];
  state.tank.devices = state.tank.devices && typeof state.tank.devices === "object" ? state.tank.devices : fresh.tank.devices;
  state.tank.devices.instances = Array.isArray(state.tank.devices.instances)
    ? state.tank.devices.instances.map((item) => ({ ...item, scale: clamp(finiteNumber(item?.scale, DEVICE_SCALE.default), DEVICE_SCALE.min, DEVICE_SCALE.max) }))
    : [];
  state.tank.devices.slots = state.tank.devices.slots && typeof state.tank.devices.slots === "object" ? state.tank.devices.slots : {};
  state.tank.foods = Array.isArray(state.tank.foods)
    ? state.tank.foods.filter((food) => food && typeof food.id === "string" && finiteNumber(food.expiresAt, 0) > now)
    : [];
  state.tank.coinDrops = Array.isArray(state.tank.coinDrops)
    ? state.tank.coinDrops.filter((coin) => coin && typeof coin.id === "string" && finiteNumber(coin.expiresAt, 0) > now)
    : [];
  state.tank.cleanliness = Math.max(0, Math.min(100, finiteNumber(state.tank.cleanliness, 100)));
  state.inventory = { ...fresh.inventory, ...(state.inventory ?? {}) };
  state.tutorial = { ...fresh.tutorial, ...(state.tutorial ?? {}) };
  state.events = { ...fresh.events, ...(state.events ?? {}) };
  state.stats = { ...fresh.stats, ...(state.stats ?? {}) };
  state.settings = { ...fresh.settings, ...(state.settings ?? {}) };
  state.rng = { state: finiteInt(state.rng?.state, fresh.rng.state) >>> 0 };
  state.transactions = state.transactions && typeof state.transactions === "object" ? state.transactions : fresh.transactions;
  state.transactions.recentIds = Array.isArray(state.transactions.recentIds) ? state.transactions.recentIds.slice(-50) : [];
  state.transactions.recent = Array.isArray(state.transactions.recent) ? state.transactions.recent.slice(-50) : [];
  state.lastProcessedAt = Math.min(now, Math.max(0, finiteNumber(state.lastProcessedAt, now)));
  return state;
}

export function isValidCheckpoint(input) {
  const version = Number(input?.schemaVersion);
  return Boolean(input && typeof input === "object" && version >= 1 && version <= SCHEMA_VERSION && input.player && input.tank);
}

function finiteNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function finiteInt(value, fallback) {
  return Math.floor(finiteNumber(value, fallback));
}

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}
