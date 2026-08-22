import { applyBuff } from "./buff-system.js";

export function normalizeRunBuild(build = {}) {
  return {
    buffs: [...(build.buffs || [])],
    health: build.health ?? 100,
    gold: build.gold ?? 0,
    consumables: build.consumables ?? 0,
    trophy: Boolean(build.trophy),
  };
}

export function applyPlayerBuild(player, build = {}, options = {}) {
  const normalized = normalizeRunBuild(build);
  normalized.buffs.forEach((buffId) => applyBuff(player, buffId));
  player.health = Math.min(player.maxHealth, normalized.health);
  player.gold = normalized.gold;
  player.consumables = normalized.consumables;
  player.trophy = normalized.trophy;
  if (options.resetRoomTriggers) player.lifestealTriggers = 0;
  return player;
}

export function capturePlayerBuild(player) {
  return {
    buffs: [...(player.buffs || [])],
    health: player.health,
    gold: player.gold || 0,
    consumables: player.consumables || 0,
    trophy: Boolean(player.trophy),
  };
}
