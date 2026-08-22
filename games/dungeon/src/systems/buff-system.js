import { BUFFS } from "../data/buffs.js";

export function getBuffStack(player, buffId) {
  if (player.buffStacks?.[buffId] != null) return player.buffStacks[buffId];
  return (player.buffs || []).filter((id) => id === buffId).length;
}

export function canApplyBuff(player, buffId) {
  const buff = BUFFS[buffId];
  if (!buff) return false;
  return getBuffStack(player, buffId) < buff.maxStacks;
}

export function applyBuff(player, buffId) {
  const buff = BUFFS[buffId];
  if (!buff || !canApplyBuff(player, buffId)) return false;
  const nextStack = getBuffStack(player, buffId) + 1;
  buff.apply(player);
  player.buffs ??= [];
  player.buffStacks ??= {};
  player.buffs.push(buffId);
  player.buffStacks[buffId] = nextStack;
  return true;
}

export function describeBuff(buffId) {
  const buff = BUFFS[buffId];
  return buff ? `${buff.name}｜${buff.description}` : buffId;
}
