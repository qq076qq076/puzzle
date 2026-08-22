import { BUFFS } from "../data/buffs.js";
import { REWARDS } from "../data/rewards.js";
import { applyBuff, canApplyBuff } from "./buff-system.js";

export function getRewardDefinition(rewardId) {
  if (BUFFS[rewardId]) return { ...BUFFS[rewardId], type: "buff", category: "passive" };
  return REWARDS[rewardId] || null;
}

export function getRewardCategoryLabel(rewardId) {
  const category = getRewardDefinition(rewardId)?.category;
  return {
    passive: "被動 Buff · 取得即生效",
    instant: "立即生效",
    consumable: "消耗品 · Q／POTION 使用",
    milestone: "通關收藏",
  }[category] || "獎勵";
}

export function getRewardColor(rewardId) {
  const reward = getRewardDefinition(rewardId);
  if (!reward) return 0x69718d;
  if (reward.type === "buff") return reward.color;
  if (reward.type === "trophy") return 0xdfb84f;
  if (reward.type === "heal" || reward.type === "potion") return 0x77bd88;
  return 0xdfb84f;
}

export function isRewardAvailable(player, rewardId) {
  if (BUFFS[rewardId]) return canApplyBuff(player, rewardId);
  const reward = REWARDS[rewardId];
  if (!reward) return false;
  if (reward.type === "heal") return player.health < player.maxHealth;
  if (reward.type === "trophy") return !player.trophy;
  return true;
}

export function getUsableRewardIds(player, rewardIds) {
  return rewardIds.filter((rewardId, index, all) => all.indexOf(rewardId) === index && isRewardAvailable(player, rewardId));
}

export function getRewardChoices(player, rewardIds, count = 3) {
  const candidates = [
    ...rewardIds,
    "gold_cache",
    "emergency_vial",
    "minor_heal",
    ...Object.keys(BUFFS),
  ];
  const choices = getUsableRewardIds(player, candidates).slice(0, count);
  const repeatable = choices.filter((rewardId) => ["gold_cache", "emergency_vial"].includes(rewardId));
  while (choices.length < count && repeatable.length) choices.push(repeatable[choices.length % repeatable.length]);
  return choices;
}

export function applyReward(player, rewardId) {
  const reward = getRewardDefinition(rewardId);
  if (!reward) return { applied: false, rewardId };
  if (reward.type === "buff") {
    if (applyBuff(player, rewardId)) return { applied: true, type: "buff", rewardId };
    player.gold = (player.gold || 0) + 10;
    return { applied: true, converted: true, type: "gold", rewardId, amount: 10 };
  }
  if (reward.type === "heal") {
    const before = player.health;
    if (before >= player.maxHealth) return { applied: false, type: "heal", rewardId, reason: "full_health" };
    player.health = Math.min(player.maxHealth, player.health + reward.amount);
    return { applied: true, type: "heal", rewardId, amount: player.health - before };
  }
  if (reward.type === "potion") {
    player.consumables = (player.consumables || 0) + 1;
    return { applied: true, type: "potion", rewardId, amount: reward.amount };
  }
  if (reward.type === "gold") {
    player.gold = (player.gold || 0) + reward.amount;
    return { applied: true, type: "gold", rewardId, amount: reward.amount };
  }
  if (reward.type === "trophy") {
    player.trophy = true;
    return { applied: true, type: "trophy", rewardId };
  }
  return { applied: false, rewardId };
}

export function describeReward(rewardId) {
  const reward = getRewardDefinition(rewardId);
  return reward ? `${reward.name}｜${reward.description}` : rewardId;
}
