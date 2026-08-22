export function tickContactDamage(attacker, delta) {
  attacker.contactDamageCooldownRemaining = Math.max(0, (attacker.contactDamageCooldownRemaining || 0) - Math.max(0, delta));
}

export function tryContactDamage(attacker, player) {
  if (!attacker?.active || !player?.active || player.health <= 0) return false;
  if (attacker.state === "dead" || attacker.spawnProtectionRemaining > 0 || attacker.contactDamageCooldownRemaining > 0) return false;

  const definition = attacker.definition || {};
  const damage = definition.contactDamage ?? Math.max(1, Math.round((definition.damage || 1) * 0.5));
  if (!player.takeDamage(damage)) return false;

  attacker.contactDamageCooldownRemaining = definition.contactCooldownMs ?? 850;
  attacker.scene?.showStatus?.(`${definition.name || "敵人"} 接觸命中`);
  return true;
}
