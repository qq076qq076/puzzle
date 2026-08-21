import Phaser from "phaser";

export function resolveMeleeAttack(player, enemies) {
  const facing = player.facing;
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
    const multiplier = enemy.definition.id.includes("spider") ? player.machineDamageMultiplier : 1;
    enemy.takeDamage(player.attackDamage, multiplier);
    if (player.bleedDamage > 0) enemy.bleedRemaining = 3000;
    hits += 1;
  });
  return hits;
}

export function updateBleed(enemies, delta) {
  enemies.forEach((enemy) => {
    if (!enemy.active || !enemy.bleedRemaining) return;
    enemy.bleedRemaining = Math.max(0, enemy.bleedRemaining - delta);
    if (enemy.bleedRemaining > 0 && Math.floor(enemy.bleedRemaining / 250) !== Math.floor((enemy.bleedRemaining + delta) / 250)) {
      enemy.takeDamage(3);
    }
  });
}
