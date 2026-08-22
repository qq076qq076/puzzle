import { REWARDS } from "../data/rewards.js";

export function useEmergencyPotion(player) {
  if (!player || player.health <= 0) {
    return { used: false, reason: "unavailable", message: "目前無法使用藥水" };
  }
  if ((player.consumables || 0) <= 0) {
    return { used: false, reason: "empty", message: "沒有緊急藥瓶" };
  }
  if (player.health >= player.maxHealth) {
    return { used: false, reason: "full_health", message: "生命已滿，不消耗藥水" };
  }

  const before = player.health;
  player.consumables -= 1;
  player.health = Math.min(player.maxHealth, player.health + REWARDS.emergency_vial.amount);
  const healed = player.health - before;
  return {
    used: true,
    healed,
    remaining: player.consumables,
    message: `使用緊急藥瓶 · 恢復 ${healed} HP`,
  };
}
