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
