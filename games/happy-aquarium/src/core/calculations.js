import { FISH_FOOD_BY_ID, SPECIES_BY_ID, STAGE_MULTIPLIER } from "../config/game-config.js";

export function stageFromGrowth(growth) {
  if (growth < 10) return "egg";
  if (growth < 45) return "fry";
  if (growth < 100) return "juvenile";
  return "adult";
}

export function fishSellPrice(fish) {
  const species = SPECIES_BY_ID[fish.speciesId];
  if (!species || fish.health === "dead" || fish.stage === "egg") return 0;
  const stage = STAGE_MULTIPLIER[fish.stage] ?? 0;
  const variant = fish.variant === "shiny" ? 2 : 1;
  const condition = fish.health === "sick" ? 0.5 : 1;
  return Math.floor(species.adultSellPrice * stage * variant * condition);
}

export function foodSatietyGain(foodTypeId, speciesId) {
  const nutrition = Number(FISH_FOOD_BY_ID[foodTypeId]?.nutrition) || FISH_FOOD_BY_ID["basic-food"].nutrition;
  const capacity = Number(SPECIES_BY_ID[speciesId]?.stomachCapacity) || 100;
  return nutrition / capacity * 100;
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
