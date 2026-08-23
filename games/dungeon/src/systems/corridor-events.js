export function getCorridorTrapPhase(timeMs, phaseOffset = 0) {
  const cycle = (Math.max(0, timeMs) + phaseOffset) % 2800;
  if (cycle >= 1600 && cycle < 2150) return "warning";
  if (cycle >= 2150 && cycle < 2570) return "active";
  return "idle";
}

export function canClaimCorridorChest(player, chest, distance = 34) {
  if (!player || !chest?.active) return false;
  return Math.hypot(player.x - chest.x, player.y - chest.y) <= distance;
}

export function claimCorridorChest(player, chest) {
  if (!player || !chest?.active || !chest.reward) return { claimed: false, message: "" };
  chest.active = false;
  if (chest.reward.type === "potion") {
    player.consumables = (player.consumables || 0) + chest.reward.amount;
    return { claimed: true, type: "potion", amount: chest.reward.amount, message: `寶箱：藥水 +${chest.reward.amount}` };
  }
  player.gold = (player.gold || 0) + chest.reward.amount;
  return { claimed: true, type: "gold", amount: chest.reward.amount, message: `寶箱：金幣 +${chest.reward.amount}` };
}
