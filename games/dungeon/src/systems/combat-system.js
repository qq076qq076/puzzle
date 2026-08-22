import Phaser from "phaser";
import { applyMachineResonanceHit, getBleedTickDamage, previewComboHit } from "./buff-effects.js";

export function calculateMeleeDamage(player, enemy, comboMultiplier = 1) {
  let multiplier = 1;
  if (player.lastStand && player.health / player.maxHealth < 0.3) multiplier *= 1.4;
  multiplier *= comboMultiplier;
  return Math.max(1, Math.round(player.attackDamage * multiplier));
}

export function resolveMeleeAttack(player, enemies) {
  if (!player.attackHitWindow) return 0;
  const facing = player.attackFacing || player.facing;
  const maxDistance = player.attackRange;
  const halfArc = Phaser.Math.DegToRad(player.attackArcDeg / 2);
  let hits = 0;
  enemies.forEach((enemy) => {
    if (!enemy.active) return;
    const dx = enemy.x - player.x;
    const dy = enemy.y - player.y;
    const distance = Math.hypot(dx, dy);
    if (distance > maxDistance || distance < 0.001) return;
    const direction = new Phaser.Math.Vector2(dx / distance, dy / distance);
    const angle = Math.acos(Phaser.Math.Clamp(facing.dot(direction), -1, 1));
    if (angle > halfArc) return;
    const targetId = enemy.sequence ?? enemy.definition.id;
    const combo = previewComboHit(player, targetId);
    const multiplier = enemy.definition.machine ? (player.machineDamageMultiplier || 1) : 1;
    const amount = calculateMeleeDamage(player, enemy, combo.multiplier) * multiplier;
    const result = enemy.takeDamage(amount, 1, {
      knockback: {
        x: direction.x,
        y: direction.y,
        distance: 18 * (player.knockbackMultiplier || 1),
        durationMs: 110,
      },
    });
    if (!result.hit) return;
    player.comboHits = combo.comboHits;
    player.comboTargetId = combo.comboTargetId;
    if (combo.triggered) player.scene.showStatus?.("連斬驅動 · 第三擊傷害 +35%");
    if (player.bleedDamage > 0) {
      enemy.bleedRemaining = 3000;
      enemy.bleedTickRemaining = 1000;
      enemy.bleedDamage = player.bleedDamage;
    }
    if (applyMachineResonanceHit(player, enemy)) player.scene.showStatus?.("機械共鳴 · 攻擊冷卻縮短");
    if (result.killed && player.lifestealAmount > 0 && player.lifestealTriggers < 10) {
      player.health = Math.min(player.maxHealth, player.health + player.lifestealAmount);
      player.lifestealTriggers += 1;
    }
    player.scene.showDamageNumber?.(enemy.x, enemy.y - 22, result.damage, result.killed ? "#f6d36c" : "#f5f1da");
    player.scene.showHitEffect?.(enemy.x, enemy.y);
    player.scene.audio?.beep("hit");
    hits += 1;
  });
  return hits;
}

export function updateBleed(enemies, delta) {
  enemies.forEach((enemy) => {
    if (!enemy.active || !enemy.bleedRemaining) return;
    enemy.bleedRemaining = Math.max(0, enemy.bleedRemaining - delta);
    enemy.bleedTickRemaining = Math.max(0, (enemy.bleedTickRemaining || 1000) - delta);
    if (enemy.bleedRemaining > 0 && enemy.bleedTickRemaining === 0) {
      enemy.bleedTickRemaining = 1000;
      const result = enemy.takeDamage(getBleedTickDamage(enemy));
      if (result.hit) enemy.scene.showDamageNumber?.(enemy.x, enemy.y - 25, result.damage, "#e17b70");
    }
  });
}
