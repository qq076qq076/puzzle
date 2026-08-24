export function createEnemyDashMotion(definition, dx, dy) {
  if (!definition || !["dash", "pounce"].includes(definition.attackKind)) return null;
  const distance = Math.hypot(dx, dy);
  if (distance <= 0) return null;

  const speed = definition.dashSpeed ?? (definition.attackKind === "pounce" ? 300 : 420);
  return {
    velocityX: (dx / distance) * speed,
    velocityY: (dy / distance) * speed,
    durationMs: definition.dashDurationMs ?? (definition.attackKind === "pounce" ? 180 : 220),
    hitRange: definition.dashHitRange ?? (definition.attackKind === "pounce" ? 36 : 44),
    knockbackDistance: definition.dashKnockbackDistance ?? 18,
  };
}

export function getEnemyAttackActiveMs(definition) {
  if (!definition) return 0;
  if (["dash", "pounce"].includes(definition.attackKind)) return definition.dashDurationMs ?? 180;
  return definition.attackActiveMs ?? (definition.attackKind === "melee" ? 220 : 180);
}

export function getEnemyInitialCooldownMs(sequence) {
  const numericSequence = Number(sequence);
  const offset = Number.isFinite(numericSequence)
    ? Math.max(0, Math.floor(numericSequence)) % 6
    : [...String(sequence)].reduce((total, character) => total + character.charCodeAt(0), 0) % 6;
  return 600 + offset * 90;
}

export function getEnemyEffectiveAttackRange(definition) {
  if (!definition) return 0;
  const collisionClearance = (definition.bodyRadius || 0) * (definition.scale || 1) + 16;
  return Math.max(definition.attackRange || 0, collisionClearance);
}
