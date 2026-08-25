function trapHitSucceeded(result) {
  if (typeof result === "boolean") return result;
  return Boolean(result?.hit);
}

export function resetTrapVictims(trap) {
  if (!trap.damagedActors) trap.damagedActors = new Set();
  else trap.damagedActors.clear();
}

export function resolveActiveTrapHits(trap, targets, range = 28) {
  if (!trap?.active) return [];
  if (!trap.damagedActors) trap.damagedActors = new Set();
  const hits = [];
  targets.forEach(({ actor, damage, kind }) => {
    if (!actor?.active || trap.damagedActors.has(actor)) return;
    if (Math.hypot(actor.x - trap.x, actor.y - trap.y) > range) return;
    const result = actor.takeDamage?.(damage);
    if (!trapHitSucceeded(result)) return;
    trap.damagedActors.add(actor);
    hits.push({ actor, damage, kind });
  });
  return hits;
}
