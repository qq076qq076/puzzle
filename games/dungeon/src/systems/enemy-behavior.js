const RANGED_ATTACK_KINDS = new Set(["ranged", "spell", "burst"]);

export function isRangedAttack(kind) {
  return RANGED_ATTACK_KINDS.has(kind);
}

export function getRangedMovement(definition, dx, dy, distance, strafeDirection = 1) {
  if (!isRangedAttack(definition?.attackKind) || distance <= 0) return { x: 0, y: 0, mode: "hold" };
  const nx = dx / distance;
  const ny = dy / distance;
  const minimum = definition.preferredRangeMin ?? definition.attackRange * 0.45;
  const maximum = definition.preferredRangeMax ?? definition.attackRange * 0.8;
  if (distance < minimum) return { x: -nx, y: -ny, mode: "retreat" };
  if (distance > maximum) return { x: nx, y: ny, mode: "approach" };
  const direction = strafeDirection < 0 ? -1 : 1;
  return { x: -ny * direction, y: nx * direction, mode: "strafe" };
}
