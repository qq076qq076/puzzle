import { DECORATION_BY_ID, DECORATION_HABITAT_BY_ID, FISH_FOOD_BY_ID, SPECIES_BY_ID, SPECIES_HABITAT, STAGE_MULTIPLIER } from "../config/game-config.js";

export function stageFromGrowth(growth) {
  if (growth < 10) return "egg";
  if (growth < 45) return "fry";
  if (growth < 100) return "juvenile";
  return "adult";
}

const FISH_GROWTH_SCALE_POINTS = [
  [10, 0.40],
  [25, 0.52],
  [45, 0.70],
  [70, 0.84],
  [90, 0.95],
  [100, 1],
];

export function fishGrowthScale(growth) {
  const value = clamp(Number(growth) || 10, 10, 100);
  for (let index = 1; index < FISH_GROWTH_SCALE_POINTS.length; index += 1) {
    const [endGrowth, endScale] = FISH_GROWTH_SCALE_POINTS[index];
    if (value > endGrowth) continue;
    const [startGrowth, startScale] = FISH_GROWTH_SCALE_POINTS[index - 1];
    const progress = (value - startGrowth) / (endGrowth - startGrowth);
    return startScale + (endScale - startScale) * progress;
  }
  return 1;
}

export function fishSellPrice(fish) {
  const species = SPECIES_BY_ID[fish.speciesId];
  if (!species || fish.health === "dead" || fish.stage === "egg") return 0;
  const stage = STAGE_MULTIPLIER[fish.stage] ?? 0;
  const variant = fish.variant === "shiny" ? 2 : 1;
  const condition = fish.health === "sick" ? 0.5 : 1;
  return Math.floor(species.adultSellPrice * stage * variant * condition);
}

export function foodSatietyGain(foodTypeId, speciesId, preferredFoodTypeId = null) {
  const nutrition = Number(FISH_FOOD_BY_ID[foodTypeId]?.nutrition) || FISH_FOOD_BY_ID["basic-food"].nutrition;
  const capacity = Number(SPECIES_BY_ID[speciesId]?.stomachCapacity) || 100;
  const preferenceMultiplier = foodTypeId === preferredFoodTypeId ? 1.15 : 1;
  return nutrition / capacity * 100 * preferenceMultiplier;
}

export function environmentComfort(state, fish) {
  const decorations = state?.tank?.decorations || [];
  const appeal = decorations.reduce((sum, item) => sum + (DECORATION_BY_ID[item.catalogId]?.appeal || 0), 0);
  const preferredHabitat = fish?.habitatPreference || SPECIES_HABITAT[fish?.speciesId];
  const matchingCount = decorations.filter((item) => DECORATION_HABITAT_BY_ID[item.catalogId] === preferredHabitat).length;
  const matchBonus = matchingCount > 0 ? Math.min(20, 10 + (matchingCount - 1) * 5) : 0;
  return clamp(45 + Math.min(35, appeal * 0.8) + matchBonus, 0, 100);
}

export function fishHappiness(state, fish) {
  if (!fish || fish.health === "dead" || fish.stage === "egg") return 0;
  const satiety = clamp(Number(fish.satiety) || 0, 0, 100);
  const cleanliness = clamp(Number(state?.tank?.cleanliness) || 0, 0, 100);
  const comfort = environmentComfort(state, fish);
  const happiness = 0.80 * satiety + 0.10 * cleanliness + 0.10 * comfort;
  return clamp(fish.health === "sick" ? Math.min(45, happiness) : happiness, 0, 100);
}

export function dayKeyTaipei(timestamp) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(timestamp));
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function fallingFoodY(food, now, { gameHeight = 600, speed = 24, floor = 520 } = {}) {
  return fallingDropY(food, now, { gameHeight, speed, floor });
}

export function fallingDropY(drop, now, { gameHeight = 600, speed = 24, floor = 520 } = {}) {
  const currentTime = Number(now);
  const createdAt = Number(drop?.createdAt);
  const start = (Number(drop?.y) || 0.5) * gameHeight;
  const elapsedSeconds = Number.isFinite(currentTime) && Number.isFinite(createdAt) ? Math.max(0, currentTime - createdAt) / 1000 : 0;
  return Math.min(floor, start + elapsedSeconds * speed);
}
