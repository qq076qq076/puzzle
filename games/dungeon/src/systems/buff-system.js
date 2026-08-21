import { BUFFS } from "../data/buffs.js";

export function applyBuff(player, buffId) {
  const buff = BUFFS[buffId];
  if (!buff) return false;
  buff.apply(player);
  player.buffs.push(buffId);
  return true;
}

export function describeBuff(buffId) {
  const buff = BUFFS[buffId];
  return buff ? `${buff.name}｜${buff.description}` : buffId;
}
