export function previewComboHit(player, targetId) {
  if (!player.comboDrive) {
    return { comboHits: player.comboHits || 0, comboTargetId: player.comboTargetId, multiplier: 1, triggered: false };
  }
  const hits = player.comboTargetId === targetId ? 1 : (player.comboHits || 0) + 1;
  if (hits >= 3) return { comboHits: 0, comboTargetId: null, multiplier: 1.35, triggered: true };
  return { comboHits: hits, comboTargetId: targetId, multiplier: 1, triggered: false };
}

export function getBleedTickDamage(enemy) {
  return Math.max(1, enemy.bleedDamage || 3);
}

export function applyMachineResonanceHit(player, enemy) {
  if (!enemy.definition?.machine || (player.machineResonanceStacks || 0) <= 0) return false;
  const triggered = enemy.machineMarkedRemaining > 0;
  if (triggered) {
    player.attackCooldownRemaining *= Math.max(0.55, 1 - player.machineResonanceStacks * 0.15);
  }
  enemy.machineMarkedRemaining = 3000;
  return triggered;
}
