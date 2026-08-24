export function tickContactDamage(attacker, delta) {
  attacker.contactDamageCooldownRemaining = Math.max(0, (attacker.contactDamageCooldownRemaining || 0) - Math.max(0, delta));
}

export function tryContactDamage(attacker, player) {
  if (!attacker?.active || !player?.active || player.health <= 0) return false;
  const definition = attacker.definition || {};
  const deliberateAttackSoon = Number.isFinite(definition.windupMs)
    && (attacker.attackCooldownRemaining || 0) <= definition.windupMs + 180;
  if (["attack", "telegraph", "recover", "charge", "dead", "hurt"].includes(attacker.state)
    || deliberateAttackSoon
    || attacker.spawnProtectionRemaining > 0
    || attacker.contactDamageCooldownRemaining > 0) return false;

  const damage = definition.contactDamage ?? Math.max(1, Math.round((definition.damage || 1) * 0.5));
  if (!player.takeDamage(damage, {
    knockback: {
      x: (player.x || 0) - (attacker.x || 0),
      y: (player.y || 0) - (attacker.y || 0),
      distance: definition.contactKnockbackDistance ?? 14,
      durationMs: 100,
    },
  })) return false;

  attacker.contactDamageCooldownRemaining = definition.contactCooldownMs ?? 850;
  attacker.scene?.showStatus?.(`${definition.name || "敵人"} 接觸命中`);
  return true;
}
