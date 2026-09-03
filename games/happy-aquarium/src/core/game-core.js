import {
  DECORATION_BY_ID,
  DECORATION_SCALE,
  CONSUMABLE_BY_ID,
  DEVICE_BY_ID,
  DEVICE_SCALE,
  FISH_FOOD_BY_ID,
  FOOD_LIFETIME_MS,
  HELPER_BY_ID,
  HAPPINESS_COIN_INTERVAL_MAX_MS,
  HAPPINESS_COIN_INTERVAL_MIN_MS,
  PERSONALITIES,
  SPECIES_HABITAT,
  SPECIES_BY_ID,
  TRANSACTION_LIMIT,
} from "../config/game-config.js";
import { clamp, dayKeyTaipei, fishSellPrice, foodSatietyGain, stageFromGrowth } from "./calculations.js";
import { nextRandom, randomInt } from "./rng.js";
import { simulate } from "./simulation.js";
import { createFreshState, makeId, normalizeState } from "./state.js";
import { isUnlocked } from "./unlocks.js";

export class GameCore {
  #state;
  #listeners = new Set();

  constructor(state = createFreshState(), { devMode = false } = {}) {
    this.#state = normalizeState(state);
    this.devMode = Boolean(devMode);
    ensureDailyGoals(this.#state, Date.now());
  }

  subscribe(listener) {
    this.#listeners.add(listener);
    listener(this.snapshot(), []);
    return () => this.#listeners.delete(listener);
  }

  snapshot() {
    return structuredClone(this.#state);
  }

  replaceState(state, { offline = false, now = Date.now() } = {}) {
    this.#state = normalizeState(state, now);
    ensureDailyGoals(this.#state, now);
    const report = simulate(this.#state, now, { offline });
    const events = [{ type: "stateRestored", report }];
    if (report.hatched > 0) claimTutorial(this.#state, "hatch-first-egg", { coins: 50 }, events);
    this.#publish(events);
    return report;
  }

  reset(now = Date.now()) {
    this.#state = createFreshState(now);
    ensureDailyGoals(this.#state, now);
    this.#publish([{ type: "stateReset" }]);
  }

  tick(now = Date.now(), liveFishPositions = null) {
    syncLiveFishPositions(this.#state, liveFishPositions);
    const events = [];
    ensureDailyGoals(this.#state, now, events);
    const report = simulate(this.#state, now);
    events.unshift({ type: "tick", report });
    if (report.hatched > 0) claimTutorial(this.#state, "hatch-first-egg", { coins: 50 }, events);
    this.#publish(events);
    return report;
  }

  dispatch(type, payload = {}, transactionId = makeId("tx"), now = Date.now()) {
    if (this.#state.transactions.recentIds.includes(transactionId)) {
      return { transactionId, ok: true, duplicate: true, state: this.snapshot(), events: [] };
    }
    this.tick(now);
    const handler = COMMANDS[type];
    if (!handler) return this.#failure(transactionId, "UNKNOWN_COMMAND");
    const events = [];
    ensureDailyGoals(this.#state, now, events);
    const result = handler(this.#state, payload, now, events, { devMode: this.devMode });
    if (!result.ok) return this.#failure(transactionId, result.errorCode);
    tryGrantLegendaryFish(this.#state, now, events);
    this.#recordTransaction(transactionId, type, now);
    events.push({ type: "saveUrgent" });
    this.#publish(events);
    return { transactionId, ok: true, state: this.snapshot(), events };
  }

  #failure(transactionId, errorCode) {
    return { transactionId, ok: false, errorCode, state: this.snapshot(), events: [] };
  }

  #recordTransaction(id, type, at) {
    const transactions = this.#state.transactions;
    transactions.recentIds.push(id);
    transactions.recent.push({ id, type, at, ok: true });
    if (transactions.recentIds.length > TRANSACTION_LIMIT) transactions.recentIds.splice(0, transactions.recentIds.length - TRANSACTION_LIMIT);
    if (transactions.recent.length > TRANSACTION_LIMIT) transactions.recent.splice(0, transactions.recent.length - TRANSACTION_LIMIT);
  }

  #publish(events) {
    const snapshot = this.snapshot();
    for (const listener of this.#listeners) listener(snapshot, events);
  }
}

function syncLiveFishPositions(state, positions) {
  if (!positions || typeof positions !== "object") return;
  for (const fish of state.tank.fishes) {
    const live = positions[fish.id];
    if (!live) continue;
    const x = Number(live.x);
    const y = Number(live.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    fish.position = { x: clamp(x, 0.04, 0.96), y: clamp(y, 0.125, 0.92) };
    if (live.heading === "left" || live.heading === "right") fish.heading = live.heading;
  }
}

const COMMANDS = {
  BUY_EGG(state, { speciesId }, now, events, { devMode }) {
    const species = SPECIES_BY_ID[speciesId];
    if (!species || species.eggPrice == null) return fail("NOT_FOR_SALE");
    if (!devMode && !isUnlocked(state, species)) return fail("REQUIREMENTS_LOCKED");
    if (!devMode && speciesId === "moonfish" && !isTaipeiNight(now)) return fail("NIGHT_ONLY");
    if (!devMode && state.player.coins < species.eggPrice) return fail("NOT_ENOUGH_COINS");
    if (!devMode) state.player.coins -= species.eggPrice;
    const tutorialEgg = !devMode && speciesId === "guppy" && !state.tutorial.firstEggOverrideConsumed;
    state.tutorial.firstEggOverrideConsumed ||= tutorialEgg;
    const fish = createFishInstance(state, speciesId, now, {
      acquisitionType: devMode ? "dev" : "shop",
      acquisitionCost: devMode ? 0 : species.eggPrice,
      adult: devMode,
      tutorialEgg,
    });
    state.tank.fishes.push(fish);
    state.stats.eggsBought += 1;
    if (!devMode) claimTutorial(state, "buy-first-egg", { coins: 30 }, events);
    events.push({ type: "fishAdded", fishId: fish.id });
    return ok();
  },

  BUY_CONSUMABLE(state, { itemId }, _now, events, { devMode }) {
    const item = CONSUMABLE_BY_ID[itemId];
    if (!item) return fail("UNKNOWN_ITEM");
    if (!devMode && !isUnlocked(state, item)) return fail("REQUIREMENTS_LOCKED");
    if (!devMode && state.player.coins < item.price) return fail("NOT_ENOUGH_COINS");
    if (!devMode) state.player.coins -= item.price;
    if (item.kind === "fish-food") state.inventory.fishFoods[item.id] = (state.inventory.fishFoods[item.id] || 0) + 1;
    if (item.kind === "algae-wafer") state.inventory.algaeWafers += 1;
    if (item.kind === "medicine") state.inventory.medicines += 1;
    events.push({ type: "consumablePurchased", itemId });
    return ok();
  },

  SELECT_FOOD(state, { foodTypeId }, _now, events, { devMode }) {
    const food = FISH_FOOD_BY_ID[foodTypeId];
    if (!food) return fail("UNKNOWN_ITEM");
    if (!devMode && food.price != null && (state.inventory.fishFoods[foodTypeId] || 0) <= 0) return fail("NO_FISH_FOOD");
    state.inventory.selectedFishFoodId = foodTypeId;
    events.push({ type: "foodSelected", foodTypeId });
    return ok();
  },

  FEED(state, { x, y }, now, events, { devMode }) {
    const normalizedX = Number(x);
    const normalizedY = Number(y);
    if (!Number.isFinite(normalizedX) || !Number.isFinite(normalizedY)) return fail("INVALID_FOOD_POSITION");
    const foodTypeId = FISH_FOOD_BY_ID[state.inventory.selectedFishFoodId] ? state.inventory.selectedFishFoodId : "basic-food";
    const foodConfig = FISH_FOOD_BY_ID[foodTypeId];
    if (!devMode && foodConfig.price != null && (state.inventory.fishFoods[foodTypeId] || 0) <= 0) return fail("NO_FISH_FOOD");
    if (!devMode && foodConfig.price != null) {
      state.inventory.fishFoods[foodTypeId] -= 1;
      if (state.inventory.fishFoods[foodTypeId] === 0) state.inventory.selectedFishFoodId = "basic-food";
    }
    const food = {
      id: makeId("food"),
      foodTypeId,
      x: clamp(normalizedX, 0.04, 0.96),
      y: clamp(normalizedY, 0.125, 0.875),
      createdAt: now,
      expiresAt: now + FOOD_LIFETIME_MS,
    };
    state.tank.foods.push(food);
    events.push({ type: "foodDropped", foodId: food.id });
    return ok();
  },

  EAT_FOOD(state, { foodId, fishId }, now, events) {
    const foodIndex = state.tank.foods.findIndex((item) => item.id === foodId);
    if (foodIndex < 0) return fail("FOOD_NOT_FOUND");
    const fish = state.tank.fishes.find((item) => item.id === fishId);
    if (!fish || fish.stage === "egg" || fish.health !== "healthy" || fish.satiety >= 50) return fail("FISH_CANNOT_EAT");
    const [food] = state.tank.foods.splice(foodIndex, 1);
    const satietyGain = foodSatietyGain(food.foodTypeId, fish.speciesId, fish.preferredFoodTypeId);
    fish.satiety = clamp(fish.satiety + satietyGain, 0, 100);
    fish.starvingSince = 0;
    claimTutorial(state, "feed-first-fish", { coins: 50 }, events);
    progressDailyGoal(state, "feed", 1, now, events);
    events.push({ type: "foodEaten", foodId, fishId, satietyGain });
    return ok();
  },

  COLLECT_COIN(state, { coinId }, _now, events) {
    const index = state.tank.coinDrops.findIndex((coin) => coin.id === coinId);
    if (index < 0) return fail("COIN_NOT_FOUND");
    const [coin] = state.tank.coinDrops.splice(index, 1);
    const value = Math.max(0, Math.floor(Number(coin.value) || 0));
    state.player.coins += value;
    progressDailyGoal(state, "collect", 1, _now, events);
    events.push({ type: "coinCollected", coinId, value });
    return ok();
  },

  CLEAN(state, _payload, _now, events) {
    if (state.tank.cleanliness >= 100 && state.tutorial.step !== "clean-first-algae") return fail("ALREADY_CLEAN");
    state.tank.cleanliness = clamp(state.tank.cleanliness + 2, 0, 100);
    claimTutorial(state, "clean-first-algae", { coins: 50, decorationId: "anubias-plant" }, events);
    progressDailyGoal(state, "care", 1, _now, events);
    events.push({ type: "algaeCleaned" });
    return ok();
  },

  USE_WAFER(state, _payload, _now, events) {
    if (state.inventory.algaeWafers <= 0) return fail("NO_WAFER");
    const helper = [...state.tank.helpers].sort((a, b) => a.satiety - b.satiety || a.id.localeCompare(b.id))[0];
    if (!helper || helper.satiety >= 100) return fail("NO_HUNGRY_HELPER");
    state.inventory.algaeWafers -= 1;
    helper.satiety = clamp(helper.satiety + 35, 0, 100);
    helper.hungrySince = 0;
    events.push({ type: "helperFed", helperId: helper.id });
    return ok();
  },

  USE_MEDICINE(state, { fishId }, _now, events) {
    const fish = state.tank.fishes.find((item) => item.id === fishId);
    if (!fish || fish.health !== "sick") return fail("FISH_NOT_SICK");
    if (state.inventory.medicines <= 0) return fail("NO_MEDICINE");
    state.inventory.medicines -= 1;
    fish.health = "healthy";
    fish.sickSince = 0;
    fish.satiety = Math.max(25, fish.satiety);
    progressDailyGoal(state, "care", 1, _now, events);
    events.push({ type: "fishCured", fishId });
    return ok();
  },

  ACCELERATE_FISH(state, { fishId }, _now, events) {
    const fish = state.tank.fishes.find((item) => item.id === fishId);
    if (!fish || fish.health === "dead" || fish.growth >= 100) return fail("CANNOT_ACCELERATE");
    if (state.player.gems < 1) return fail("NOT_ENOUGH_GEMS");
    state.player.gems -= 1;
    fish.growth = fish.growth < 10 ? 10 : fish.growth < 45 ? 45 : 100;
    fish.stage = stageFromGrowth(fish.growth);
    if (fish.stage === "fry" && fish.satiety === 0) fish.satiety = 80;
    if (fish.stage !== "egg") claimTutorial(state, "hatch-first-egg", { coins: 50 }, events);
    events.push({ type: "fishGrew", fishId });
    return ok();
  },

  REVIVE_FISH(state, { fishId }, now, events) {
    const fish = state.tank.fishes.find((item) => item.id === fishId);
    if (!fish || fish.health !== "dead" || now - fish.diedAt > 24 * 3_600_000) return fail("CANNOT_REVIVE");
    if (state.player.gems < 3) return fail("NOT_ENOUGH_GEMS");
    state.player.gems -= 3;
    fish.health = "healthy";
    fish.diedAt = 0;
    fish.satiety = 40;
    events.push({ type: "fishRevived", fishId });
    return ok();
  },

  SELL_FISH(state, { fishId }, _now, events) {
    const index = state.tank.fishes.findIndex((item) => item.id === fishId);
    if (index < 0) return fail("FISH_NOT_FOUND");
    const fish = state.tank.fishes[index];
    const price = fishSellPrice(fish);
    if (price <= 0) return fail("CANNOT_SELL");
    state.tank.fishes.splice(index, 1);
    state.player.coins += price;
    state.stats.fishSold += 1;
    events.push({ type: "fishSold", fishId, price });
    return ok();
  },

  BUY_HELPER(state, { helperId }, now, events, { devMode }) {
    const config = HELPER_BY_ID[helperId];
    if (!config) return fail("UNKNOWN_ITEM");
    if (!devMode && !isUnlocked(state, config)) return fail("REQUIREMENTS_LOCKED");
    if (state.tank.helpers.some((item) => item.kind === helperId)) return fail("ALREADY_OWNED");
    if (!devMode && state.player.coins < config.price) return fail("NOT_ENOUGH_COINS");
    if (!devMode) state.player.coins -= config.price;
    state.tank.helpers.push({ id: makeId("helper"), kind: helperId, acquiredAt: now, satiety: config.drainPerHour > 0 ? 80 : 100, hungrySince: 0, lastPassiveFeedAt: 0, lastDailyWorkDayKey: "", behaviorSeed: randomInt(state.rng, 1, 0x7fffffff), position: { x: 0.3 + nextRandom(state.rng) * 0.4, y: 0.86 } });
    events.push({ type: "helperAdded", helperId });
    return ok();
  },

  BUY_DEVICE(state, { deviceId }, now, events, { devMode }) {
    const config = DEVICE_BY_ID[deviceId];
    if (!config) return fail("UNKNOWN_ITEM");
    if (!devMode && !isUnlocked(state, config)) return fail("REQUIREMENTS_LOCKED");
    if (state.tank.devices.instances.some((item) => item.catalogId === deviceId)) return fail("ALREADY_OWNED");
    if (!devMode && state.player.coins < config.price) return fail("NOT_ENOUGH_COINS");
    if (!devMode) state.player.coins -= config.price;
    const instance = { id: makeId("device"), catalogId: deviceId, purchasedAt: now, scale: DEVICE_SCALE.default, state: {}, schedule: null };
    if (config.capacity) instance.state = { ammo: config.capacity, intervalMs: config.intervalMs, nextRunAt: now + config.intervalMs };
    if (deviceId === "hang-on-filter") instance.state.cartridgeUntil = now + 7 * 24 * 3_600_000;
    if (["warm-lamp", "uv-sterilizer"].includes(deviceId)) instance.schedule = { timeZone: "Asia/Taipei", startMinute: 480, durationMinutes: 720 };
    state.tank.devices.instances.push(instance);
    state.tank.devices.slots[config.slot] = instance.id;
    events.push({ type: "deviceInstalled", deviceId });
    return ok();
  },

  REFILL_FEEDER(state, _payload, now, events) {
    const id = state.tank.devices.slots.feeder;
    const feeder = state.tank.devices.instances.find((item) => item.id === id);
    const config = feeder && DEVICE_BY_ID[feeder.catalogId];
    if (!feeder || !config?.capacity) return fail("NO_FEEDER");
    feeder.state.ammo = config.capacity;
    feeder.state.nextRunAt = Math.max(now + config.intervalMs, feeder.state.nextRunAt || 0);
    events.push({ type: "deviceRefilled", deviceId: feeder.catalogId });
    return ok();
  },

  BUY_DECORATION(state, { decorationId }, _now, events, { devMode }) {
    const config = DECORATION_BY_ID[decorationId];
    if (!config) return fail("UNKNOWN_ITEM");
    if (!devMode && !isUnlocked(state, config)) return fail("REQUIREMENTS_LOCKED");
    if (!devMode && state.tank.decorations.length >= 10) return fail("DECORATION_LIMIT");
    if (!devMode && state.player.coins < config.price) return fail("NOT_ENOUGH_COINS");
    if (!devMode) state.player.coins -= config.price;
    const count = state.tank.decorations.length;
    const instanceId = makeId("decor");
    state.tank.decorations.push({ id: instanceId, catalogId: decorationId, x: 0.12 + (count % 6) * 0.14, y: 0.86 - Math.floor(count / 6) * 0.10, rotation: 0, scale: DECORATION_SCALE.default });
    events.push({ type: "decorationAdded", decorationId, instanceId });
    return ok();
  },

  MOVE_DECORATION(state, { instanceId, x, y }, _now, events) {
    const decoration = state.tank.decorations.find((item) => item.id === instanceId);
    const normalizedX = Number(x);
    const normalizedY = Number(y);
    if (!decoration) return fail("DECORATION_NOT_FOUND");
    if (!Number.isFinite(normalizedX) || !Number.isFinite(normalizedY)) return fail("INVALID_DECORATION_POSITION");
    decoration.x = clamp(normalizedX, 0.06, 0.94);
    decoration.y = clamp(normalizedY, 0.20, 0.90);
    events.push({ type: "decorationMoved", instanceId });
    return ok();
  },

  RESIZE_DECORATION(state, { instanceId, scale }, _now, events) {
    const decoration = state.tank.decorations.find((item) => item.id === instanceId);
    const normalizedScale = Number(scale);
    if (!decoration) return fail("DECORATION_NOT_FOUND");
    if (!Number.isFinite(normalizedScale)) return fail("INVALID_OBJECT_SCALE");
    decoration.scale = clamp(normalizedScale, DECORATION_SCALE.min, DECORATION_SCALE.max);
    events.push({ type: "decorationResized", instanceId, scale: decoration.scale });
    return ok();
  },

  RESIZE_DEVICE(state, { instanceId, scale }, _now, events) {
    const device = state.tank.devices.instances.find((item) => item.id === instanceId);
    const normalizedScale = Number(scale);
    if (!device) return fail("DEVICE_NOT_FOUND");
    if (!Number.isFinite(normalizedScale)) return fail("INVALID_OBJECT_SCALE");
    device.scale = clamp(normalizedScale, DEVICE_SCALE.min, DEVICE_SCALE.max);
    events.push({ type: "deviceResized", instanceId, scale: device.scale });
    return ok();
  },

  OPEN_REWARD(state, _payload, _now, events) {
    if (state.events.pendingRewards <= 0) return fail("NO_REWARD");
    state.events.pendingRewards -= 1;
    const roll = nextRandom(state.rng);
    let message;
    if (roll < 0.55) {
      const coins = randomInt(state.rng, 80, 240);
      state.player.coins += coins;
      message = `獲得 ${coins} 金幣`;
    } else if (roll < 0.75) {
      state.inventory.algaeWafers += 1;
      message = "獲得 1 顆藻錠";
    } else if (roll < 0.92) {
      state.inventory.medicines += 1;
      message = "獲得 1 瓶藥水";
    } else {
      const gems = randomInt(state.rng, 1, 3);
      state.player.gems += gems;
      message = `獲得 ${gems} 顆寶石`;
    }
    events.push({ type: "rewardOpened", message });
    return ok();
  },

  RENAME_TANK(state, { name }, _now, events) {
    const normalized = String(name || "").trim().slice(0, 24);
    if (!normalized) return fail("INVALID_NAME");
    state.tank.name = normalized;
    events.push({ type: "tankRenamed", name: normalized });
    return ok();
  },
};

function createFishInstance(state, speciesId, now, { acquisitionType = "milestone", acquisitionCost = 0, adult = false, tutorialEgg = false } = {}) {
  const species = SPECIES_BY_ID[speciesId];
  const personality = PERSONALITIES[randomInt(state.rng, 0, PERSONALITIES.length - 1)];
  const foodIds = Object.keys(FISH_FOOD_BY_ID);
  const preferredFoodTypeId = foodIds[randomInt(state.rng, 0, foodIds.length - 1)];
  return {
    id: makeId("fish"), speciesId, name: species.name, acquiredAt: now, acquisitionType, acquisitionCost,
    stage: adult ? "adult" : "egg", growth: adult ? 100 : 0, satiety: adult ? 100 : 0, variant: null,
    health: "healthy", sickSince: 0, diedAt: 0, lastDiseaseCheckAt: now, starvingSince: 0,
    skills: [], paidPerformancesOnDay: 0, behaviorSeed: randomInt(state.rng, 1, 0x7fffffff),
    position: { x: 0.2 + nextRandom(state.rng) * 0.6, y: 0.2 + nextRandom(state.rng) * 0.5 }, heading: "right", tutorialEgg,
    personalityId: personality.id,
    preferredFoodTypeId,
    habitatPreference: SPECIES_HABITAT[speciesId] || "plants",
    sizePotential: Math.round((0.90 + nextRandom(state.rng) * 0.20) * 1000) / 1000,
    happiness: 0,
    happinessProgressMs: 0,
    nextHappinessCoinMs: randomInt(state.rng, HAPPINESS_COIN_INTERVAL_MIN_MS / 1000, HAPPINESS_COIN_INTERVAL_MAX_MS / 1000) * 1000,
    coinDayKey: dayKeyTaipei(now),
    coinsEarnedToday: 0,
    pendingOfflineCoin: false,
  };
}

function ensureDailyGoals(state, now, events = []) {
  const dayKey = dayKeyTaipei(now);
  if (state.quests.dayKey === dayKey && state.quests.items.length === 3) return;
  state.quests = {
    dayKey,
    items: [
      { id: "feed", label: "讓魚吃到 3 顆飼料", target: 3, progress: 0, reward: 50, completed: false },
      { id: "collect", label: "撿起 2 枚金幣", target: 2, progress: 0, reward: 80, completed: false },
      { id: "care", label: "完成 1 次清潔或治療", target: 1, progress: 0, reward: 60, completed: false },
    ],
  };
  events.push({ type: "dailyGoalsReset", dayKey });
}

function progressDailyGoal(state, id, amount, now, events) {
  ensureDailyGoals(state, now, events);
  const goal = state.quests.items.find((item) => item.id === id);
  if (!goal || goal.completed) return;
  goal.progress = Math.min(goal.target, goal.progress + amount);
  if (goal.progress < goal.target) return;
  goal.completed = true;
  state.player.coins += goal.reward;
  state.stats.dailyGoalsCompleted = (Number(state.stats.dailyGoalsCompleted) || 0) + 1;
  events.push({ type: "dailyGoalCompleted", goalId: id, label: goal.label, reward: goal.reward });
}

function tryGrantLegendaryFish(state, now, events) {
  if (state.achievements.legendaryFishGranted) return;
  const hasCrystal = state.tank.decorations.some((item) => item.catalogId === "rainbow-crystal");
  if (!hasCrystal || (Number(state.stats.dailyGoalsCompleted) || 0) < 30) return;
  const fish = createFishInstance(state, "rainbow-mermaid", now);
  state.tank.fishes.push(fish);
  state.achievements.legendaryFishGranted = true;
  events.push({ type: "fishAdded", fishId: fish.id }, { type: "legendaryFishGranted", fishId: fish.id });
}

function claimTutorial(state, id, reward, events) {
  if (state.tutorial.claimedRewardIds.includes(id) || state.tutorial.step !== id) return;
  state.tutorial.claimedRewardIds.push(id);
  state.player.coins += reward.coins || 0;
  if (reward.decorationId && state.tank.decorations.length < 10) state.tank.decorations.push({ id: makeId("decor"), catalogId: reward.decorationId, x: 0.18, y: 0.85, rotation: 0, scale: DECORATION_SCALE.default });
  const order = ["buy-first-egg", "hatch-first-egg", "feed-first-fish", "clean-first-algae"];
  state.tutorial.step = order[order.indexOf(id) + 1] || "complete";
  events.push({ type: "tutorialAdvanced", step: state.tutorial.step });
}

function isTaipeiNight(now) {
  const hour = Number(new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Taipei", hour: "2-digit", hourCycle: "h23" }).format(new Date(now)));
  return hour >= 18 || hour < 6;
}

function ok() { return { ok: true }; }
function fail(errorCode) { return { ok: false, errorCode }; }

export const ERROR_MESSAGES = {
  UNKNOWN_COMMAND: "未知操作。", NOT_FOR_SALE: "這種魚不能直接購買。", REQUIREMENTS_LOCKED: "尚未持有解鎖所需物品。",
  NIGHT_ONLY: "月光魚只在台北時間 18:00～06:00 販售。", NOT_ENOUGH_COINS: "金幣不足。",
  INVALID_FOOD_POSITION: "請點擊魚缸水域放置魚糧。", FOOD_NOT_FOUND: "這顆魚糧已經被吃掉了。", FISH_CANNOT_EAT: "這隻魚目前不能進食。", ALREADY_CLEAN: "魚缸已經很乾淨。",
  COIN_NOT_FOUND: "這枚金幣已經被撿走或消失了。",
  NO_WAFER: "背包沒有藻錠。", NO_HUNGRY_HELPER: "目前沒有需要藻錠的清潔生物。", FISH_NOT_SICK: "這隻魚不需要治療。",
  NO_MEDICINE: "背包沒有藥水。", NO_FISH_FOOD: "這種飼料已經用完，請購買或改用基本飼料。", CANNOT_ACCELERATE: "目前不能加速。", NOT_ENOUGH_GEMS: "寶石不足。", CANNOT_REVIVE: "已超過復活期限。",
  FISH_NOT_FOUND: "找不到這隻魚。", CANNOT_SELL: "目前不能出售。", UNKNOWN_ITEM: "找不到商品。", ALREADY_OWNED: "已經擁有。",
  NO_FEEDER: "尚未安裝餵食器。", DEVICE_NOT_FOUND: "找不到這台設備。", DECORATION_LIMIT: "魚缸最多擺放 10 件裝飾。", DECORATION_NOT_FOUND: "找不到這件裝飾。", INVALID_DECORATION_POSITION: "請把裝飾放在魚缸內。", INVALID_OBJECT_SCALE: "請選擇有效的物件大小。", NO_REWARD: "目前沒有漂流禮物。", INVALID_NAME: "名稱不能空白。",
};
