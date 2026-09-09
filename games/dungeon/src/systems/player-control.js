const EPSILON = 0.0001;

export const ATTACK_INPUT_BUFFER_MS = 140;
export const DODGE_INPUT_BUFFER_MS = 140;

export function getMoveIntent(x, y) {
  const rawX = Number(x) || 0;
  const rawY = Number(y) || 0;
  const length = Math.hypot(rawX, rawY);
  if (length < EPSILON) return { x: 0, y: 0, magnitude: 0 };
  return {
    x: rawX / length,
    y: rawY / length,
    magnitude: Math.min(1, length),
  };
}

export function canDodgeCancelAttack(player) {
  return !(player?.attackRemaining > 0) || Boolean(player?.attackHitResolved);
}

export function getAttackMoveMultiplier(player) {
  if (!(player?.attackRemaining > 0)) return 1;
  return player.attackHitResolved ? 0.72 : 0.48;
}

export function getAssistedAttackFacing(player, targets = [], options = {}) {
  const facingX = Number(player?.facing?.x) || 0;
  const facingY = Number(player?.facing?.y) || 0;
  const facingLength = Math.hypot(facingX, facingY) || 1;
  const fallback = { x: facingX / facingLength, y: facingY / facingLength };
  const maxDistance = Math.max(0, Number(options.maxDistance) || (Number(player?.attackRange) || 0) + 22);
  const snapArcDeg = Math.max(0, Number(options.snapArcDeg) || 68);
  const closeSnapDistance = Math.max(0, Number(options.closeSnapDistance) || 34);
  const minimumDot = Math.cos((snapArcDeg * Math.PI) / 180);
  let best = null;

  for (const target of targets || []) {
    if (!target?.active || target.health <= 0) continue;
    const dx = (Number(target.x) || 0) - (Number(player?.x) || 0);
    const dy = (Number(target.y) || 0) - (Number(player?.y) || 0);
    const distance = Math.hypot(dx, dy);
    if (distance < EPSILON || distance > maxDistance) continue;
    const x = dx / distance;
    const y = dy / distance;
    const dot = fallback.x * x + fallback.y * y;
    if (distance > closeSnapDistance && dot < minimumDot) continue;
    const score = distance + (1 - dot) * 38;
    if (!best || score < best.score) best = { x, y, score };
  }

  return best ? { x: best.x, y: best.y } : fallback;
}
