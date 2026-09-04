import {
  COIN_DROP_LIFETIME_MS,
  COIN_DROP_LIMIT,
  DEVICE_BY_ID,
  FOOD_LIFETIME_MS,
  HELPER_BY_ID,
  HAPPINESS_COIN_DAILY_LIMIT,
  HAPPINESS_COIN_INTERVAL_MAX_MS,
  HAPPINESS_COIN_INTERVAL_MIN_MS,
  HAPPINESS_COIN_THRESHOLD,
  OFFLINE_CAP_MS,
  SPECIES_BY_ID,
} from "../config/game-config.js";
import { clamp, dayKeyTaipei, fishHappiness, foodSatietyGain, stageFromGrowth } from "./calculations.js";
import { nextRandom, randomInt } from "./rng.js";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

export function simulate(state, now = Date.now(), { offline = false } = {}) {
  const from = Number(state.lastProcessedAt) || now;
  if (now <= from) return emptyReport(0);
  const to = Math.min(now, from + OFFLINE_CAP_MS);
  const elapsed = to - from;
  const report = emptyReport(elapsed);
  state.tank.foods = (state.tank.foods || []).filter((food) => Number(food.expiresAt) > now);
  state.tank.coinDrops = (state.tank.coinDrops || []).filter((coin) => Number(coin.expiresAt) > now);
  const cleanlinessBefore = state.tank.cleanliness;
  const livingFish = state.tank.fishes.filter((fish) => fish.health !== "dead").length;
  const reduction = activeCleanReduction(state, to);
  const baseDecay = livingFish === 0 ? 3 : 6 + 3 * Math.floor(livingFish / 5);
  state.tank.cleanliness = clamp(cleanlinessBefore - baseDecay * (elapsed / HOUR) * (1 - reduction), offline ? 10 : 0, 100);

  updateHelpers(state, elapsed, to, report);
  runAutoFeeder(state, from, to, report, offline);
  const warmMultiplier = isDeviceActive(state, "warm-lamp", to) ? 1.1 : 1;
  const coinCollectorActive = state.tank.helpers.some((helper) => helper.kind === "coin-hermit-crab");

  for (const fish of state.tank.fishes) {
    const happinessBefore = fishHappiness(state, fish);
    updateFish(state, fish, elapsed, to, warmMultiplier, offline, report);
    updateHappinessCoins(state, fish, happinessBefore, elapsed, to, offline, coinCollectorActive, report);
  }
  if (coinCollectorActive) collectDroppedCoins(state, report);

  accrueRewards(state, to, report);
  state.lastProcessedAt = now;
  report.cleanlinessLost = Math.max(0, cleanlinessBefore - state.tank.cleanliness);
  return report;
}

function updateHappinessCoins(state, fish, happinessBefore, elapsed, now, offline, coinCollectorActive, report) {
  const happinessAfter = fishHappiness(state, fish);
  fish.happiness = happinessAfter;
  if (fish.stage === "egg" || fish.health === "dead") return;
  const species = SPECIES_BY_ID[fish.speciesId];
  const purchasePrice = Number(species?.eggPrice);
  const coinValue = Number.isFinite(purchasePrice) && purchasePrice > 0 ? Math.floor(purchasePrice * 0.1) : 0;
  if (coinValue <= 0) return;
  const dayKey = dayKeyTaipei(now);
  if (fish.coinDayKey !== dayKey) {
    fish.coinDayKey = dayKey;
    fish.coinsEarnedToday = 0;
  }
  fish.happinessProgressMs = Math.max(0, Number(fish.happinessProgressMs) || 0);
  fish.nextHappinessCoinMs = clamp(Number(fish.nextHappinessCoinMs) || HAPPINESS_COIN_INTERVAL_MIN_MS, HAPPINESS_COIN_INTERVAL_MIN_MS, HAPPINESS_COIN_INTERVAL_MAX_MS);

  if (!offline && fish.pendingOfflineCoin && state.tank.coinDrops.length < COIN_DROP_LIMIT) {
    createCoinDrop(state, fish, coinValue, now, report);
    fish.pendingOfflineCoin = false;
  }

  const eligibleMs = eligibleHappinessDuration(happinessBefore, happinessAfter, elapsed);
  fish.happinessProgressMs += eligibleMs;
  while (fish.happinessProgressMs >= fish.nextHappinessCoinMs && fish.coinsEarnedToday < HAPPINESS_COIN_DAILY_LIMIT) {
    if (offline && !coinCollectorActive && fish.pendingOfflineCoin) break;
    if (!offline && state.tank.coinDrops.length >= COIN_DROP_LIMIT) break;
    fish.happinessProgressMs -= fish.nextHappinessCoinMs;
    fish.coinsEarnedToday += 1;
    if (offline) {
      if (coinCollectorActive) {
        state.player.coins += coinValue;
        report.coinsCollected += coinValue;
        report.coinDropsCollected += 1;
      } else {
        fish.pendingOfflineCoin = true;
      }
    } else {
      createCoinDrop(state, fish, coinValue, now, report);
    }
    fish.nextHappinessCoinMs = randomInt(state.rng, HAPPINESS_COIN_INTERVAL_MIN_MS / 1000, HAPPINESS_COIN_INTERVAL_MAX_MS / 1000) * 1000;
    if (offline && !coinCollectorActive) {
      fish.happinessProgressMs = 0;
      break;
    }
  }
}

function eligibleHappinessDuration(before, after, elapsed) {
  if (before >= HAPPINESS_COIN_THRESHOLD && after >= HAPPINESS_COIN_THRESHOLD) return elapsed;
  if (before < HAPPINESS_COIN_THRESHOLD && after < HAPPINESS_COIN_THRESHOLD) return 0;
  const distance = Math.abs(after - before);
  if (distance <= 0) return 0;
  if (before >= HAPPINESS_COIN_THRESHOLD) return elapsed * clamp((before - HAPPINESS_COIN_THRESHOLD) / distance, 0, 1);
  return elapsed * clamp((after - HAPPINESS_COIN_THRESHOLD) / distance, 0, 1);
}

function createCoinDrop(state, fish, value, now, report) {
  const x = clamp(Number(fish.position?.x) || 0.5, 0.06, 0.94);
  const y = clamp(Number(fish.position?.y) || 0.5, 0.16, 0.86);
  state.tank.coinDrops.push({
    id: `coin_${fish.id}_${now}_${fish.coinsEarnedToday}_${state.tank.coinDrops.length}`,
    fishId: fish.id, x, y, value, createdAt: now, expiresAt: now + COIN_DROP_LIFETIME_MS,
  });
  report.coinsDropped += 1;
}

function collectDroppedCoins(state, report) {
  if (state.tank.coinDrops.length === 0) return;
  const value = state.tank.coinDrops.reduce((sum, coin) => sum + Math.max(0, Math.floor(Number(coin.value) || 0)), 0);
  report.coinDropsCollected += state.tank.coinDrops.length;
  report.coinsCollected += value;
  state.player.coins += value;
  state.tank.coinDrops = [];
}

export function feedHungriestFish(state, pelletCount = 5, foodTypeId = "basic-food") {
  const candidates = state.tank.fishes
    .filter((fish) => fish.stage !== "egg" && fish.health === "healthy" && fish.satiety < 50)
    .sort((left, right) => left.satiety - right.satiety || left.id.localeCompare(right.id));
  const fed = [];
  for (const fish of candidates.slice(0, pelletCount)) {
    fish.satiety = clamp(fish.satiety + foodSatietyGain(foodTypeId, fish.speciesId, fish.preferredFoodTypeId), 0, 100);
    fish.starvingSince = 0;
    fed.push(fish.id);
  }
  return fed;
}

function updateFish(state, fish, elapsed, now, growthMultiplier, offline, report) {
  const species = SPECIES_BY_ID[fish.speciesId];
  if (!species) return;
  const startedAsEgg = fish.stage === "egg";
  if (startedAsEgg) {
    fish.health = "healthy";
    fish.sickSince = 0;
    fish.diedAt = 0;
    fish.starvingSince = 0;
    fish.lastDiseaseCheckAt = now;
  }
  const startedSatiety = Number(fish.satiety) || 0;
  if (fish.health === "dead") return;
  if (offline && fish.health === "sick" && fish.sickSince) fish.sickSince += elapsed;

  if (fish.stage !== "egg") {
    const drainMultiplier = state.tank.cleanliness < 40 ? 1.5 : 1;
    const sickMultiplier = fish.health === "sick" ? 0.75 : 1;
    const drained = species.satietyDrainPerHour * (elapsed / HOUR) * drainMultiplier * sickMultiplier;
    const floor = offline && startedSatiety >= 25 ? 25 : 0;
    fish.satiety = clamp(startedSatiety - drained, floor, 100);
  }

  const canGrow = fish.stage === "egg" || (fish.satiety > 30 && fish.health === "healthy");
  if (canGrow && fish.growth < 100) advanceGrowth(fish, species, elapsed * growthMultiplier, report);
  if (startedAsEgg) return;

  if (fish.satiety <= 0) {
    fish.starvingSince ||= now - elapsed;
    if (now - fish.starvingSince >= 2 * HOUR && fish.health === "healthy") makeSick(fish, now, report);
  } else {
    fish.starvingSince = 0;
  }

  const uvActive = isDeviceActive(state, "uv-sterilizer", now);
  if (state.tank.cleanliness < 20 && !uvActive && fish.health === "healthy" && now - (fish.lastDiseaseCheckAt || 0) >= DAY) {
    fish.lastDiseaseCheckAt = now;
    const chance = Math.min(0.35, 0.08 + 0.02 * Math.floor(elapsed / HOUR));
    if (nextRandom(state.rng) < chance) makeSick(fish, now, report);
  }
  if (!offline && fish.health === "sick" && now - fish.sickSince >= DAY) {
    fish.health = "dead";
    fish.diedAt = now;
    report.died += 1;
  }
}

function advanceGrowth(fish, species, availableMs, report) {
  let remaining = availableMs;
  while (remaining > 0 && fish.growth < 100) {
    const stage = stageFromGrowth(fish.growth);
    const end = stage === "egg" ? 10 : stage === "fry" ? 45 : 100;
    const share = stage === "egg" ? 0.10 : stage === "fry" ? 0.35 : 0.55;
    const duration = stage === "egg" && fish.tutorialEgg ? 60_000 : species.growthMs * share;
    const pointsPerMs = (end - (stage === "egg" ? 0 : stage === "fry" ? 10 : 45)) / duration;
    const neededMs = (end - fish.growth) / pointsPerMs;
    const spent = Math.min(remaining, neededMs);
    fish.growth = clamp(fish.growth + spent * pointsPerMs, 0, 100);
    remaining -= spent;
    const previousStage = fish.stage;
    fish.stage = stageFromGrowth(fish.growth);
    if (previousStage === "egg" && fish.stage === "fry") {
      fish.satiety = 80;
      report.hatched += 1;
    }
    if (fish.growth >= 100 && previousStage !== "adult") report.becameAdult += 1;
    if (spent <= 0) break;
  }
}

function updateHelpers(state, elapsed, now, report) {
  for (const helper of state.tank.helpers) {
    const config = HELPER_BY_ID[helper.kind];
    if (!config) continue;
    helper.satiety = clamp((Number(helper.satiety) || 0) - config.drainPerHour * (elapsed / HOUR), 0, 100);
    if (helper.satiety <= 0) helper.hungrySince ||= now;
    else helper.hungrySince = 0;
    if (helper.kind === "pleco") {
      const dayKey = dayKeyTaipei(now);
      if (helper.lastDailyWorkDayKey !== dayKey && state.inventory.algaeWafers > 0) {
        state.inventory.algaeWafers -= 1;
        helper.satiety = clamp(helper.satiety + 35, 0, 100);
        state.tank.cleanliness = clamp(state.tank.cleanliness + 5, 0, 100);
        helper.lastDailyWorkDayKey = dayKey;
        report.helperActions += 1;
      }
    }
  }
}

function runAutoFeeder(state, from, to, report, offline) {
  const id = state.tank.devices.slots.feeder;
  const feeder = state.tank.devices.instances.find((item) => item.id === id);
  const config = feeder && DEVICE_BY_ID[feeder.catalogId];
  if (!feeder || !config?.intervalMs || feeder.state.ammo <= 0) return;
  feeder.state.nextRunAt ||= from + config.intervalMs;
  let guard = 0;
  while (feeder.state.nextRunAt <= to && feeder.state.ammo > 0 && guard < 100) {
    const runAt = feeder.state.nextRunAt;
    const virtualFeed = offline || runAt + FOOD_LIFETIME_MS <= to;
    const fed = virtualFeed ? feedHungriestFish(state, 5) : [];
    if (!virtualFeed) dropAutomaticFood(state, feeder.id, runAt, 5);
    feeder.state.ammo -= 1;
    feeder.state.nextRunAt += config.intervalMs;
    report.autoFeeds += 1;
    report.fishFed += fed.length;
    guard += 1;
  }
}

function dropAutomaticFood(state, feederId, createdAt, count) {
  for (let index = 0; index < count; index += 1) {
    state.tank.foods.push({
      id: `food_auto_${feederId}_${createdAt}_${index}`,
      foodTypeId: "basic-food",
      x: 0.46 + index * 0.02,
      y: 0.18,
      createdAt,
      expiresAt: createdAt + FOOD_LIFETIME_MS,
    });
  }
}

function accrueRewards(state, now, report) {
  while (state.events.nextRewardAt <= now && state.events.pendingRewards < 3) {
    state.events.pendingRewards += 1;
    state.events.nextRewardAt += state.tank.decorations.some((item) => item.catalogId === "decorative-treasure-chest") ? 3 * HOUR : 4 * HOUR;
    report.rewardsFound += 1;
  }
  if (state.events.nextRewardAt <= now) state.events.nextRewardAt = now + 4 * HOUR;
}

function activeCleanReduction(state, now) {
  let total = state.tank.helpers.reduce((sum, helper) => sum + (helper.satiety > 0 ? HELPER_BY_ID[helper.kind]?.reduction || 0 : 0), 0);
  for (const deviceId of ["bubble-stone", "hang-on-filter"]) {
    if (isDeviceActive(state, deviceId, now)) total += DEVICE_BY_ID[deviceId].reduction || 0;
  }
  return Math.min(0.85, total);
}

export function isDeviceActive(state, catalogId, now = Date.now()) {
  const instance = state.tank.devices.instances.find((item) => item.catalogId === catalogId);
  if (!instance || state.tank.devices.slots[DEVICE_BY_ID[catalogId]?.slot] !== instance.id) return false;
  if (catalogId === "hang-on-filter") return Number(instance.state.cartridgeUntil) > now;
  if (instance.schedule) {
    const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Taipei", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(now));
    const hour = Number(parts.find((part) => part.type === "hour")?.value || 0);
    const minute = Number(parts.find((part) => part.type === "minute")?.value || 0);
    const current = hour * 60 + minute;
    const start = instance.schedule.startMinute ?? 480;
    const end = (start + (instance.schedule.durationMinutes ?? 720)) % 1440;
    return start < end ? current >= start && current < end : current >= start || current < end;
  }
  return true;
}

function makeSick(fish, now, report) {
  fish.health = "sick";
  fish.sickSince = now;
  report.becameSick += 1;
}

function emptyReport(elapsedMs) {
  return { elapsedMs, hatched: 0, becameAdult: 0, becameSick: 0, died: 0, autoFeeds: 0, fishFed: 0, helperActions: 0, rewardsFound: 0, coinsDropped: 0, coinDropsCollected: 0, coinsCollected: 0, cleanlinessLost: 0 };
}
