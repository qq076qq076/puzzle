import { SPECIES_BY_ID, STAGE_MULTIPLIER } from "../config/game-config.js";

export function requiredExp(level) {
  return Math.round(100 * level * (1 + level / 10));
}

export function levelFishCapacity(level, completedExpansions = 0) {
  return Math.min(99, 15 + Math.floor((level - 1) / 2) + Math.min(4, completedExpansions) * 5);
}

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

export function saleExp(speciesId) {
  const price = SPECIES_BY_ID[speciesId]?.adultSellPrice ?? 0;
  return Math.max(5, Math.min(100, Math.round(Math.sqrt(price))));
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
