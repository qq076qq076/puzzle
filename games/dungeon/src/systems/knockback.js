const DEFAULT_DURATION_MS = 110;
const DEFAULT_DISTANCE = 14;
const EPSILON = 0.0001;

function positiveNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

export function startKnockback(actor, knockback = {}, defaults = {}) {
  if (!actor?.setVelocity || !knockback) return false;

  const x = Number(knockback.x) || 0;
  const y = Number(knockback.y) || 0;
  const length = Math.hypot(x, y);
  if (length < EPSILON) return false;

  const durationMs = positiveNumber(knockback.durationMs, positiveNumber(defaults.durationMs, DEFAULT_DURATION_MS));
  const distance = positiveNumber(knockback.distance, positiveNumber(defaults.distance, DEFAULT_DISTANCE));
  const speed = positiveNumber(knockback.speed, distance * (1000 / durationMs));

  actor.knockbackRemaining = durationMs;
  actor.knockbackVelocityX = (x / length) * speed;
  actor.knockbackVelocityY = (y / length) * speed;
  actor.setVelocity(actor.knockbackVelocityX, actor.knockbackVelocityY);
  return true;
}

export function updateKnockback(actor, delta) {
  if (!actor || !(actor.knockbackRemaining > 0)) return false;

  const blocked = actor.body?.blocked || {};
  const touching = actor.body?.touching || {};
  const blockedX = (actor.knockbackVelocityX < 0 && (blocked.left || touching.left))
    || (actor.knockbackVelocityX > 0 && (blocked.right || touching.right));
  const blockedY = (actor.knockbackVelocityY < 0 && (blocked.up || touching.up))
    || (actor.knockbackVelocityY > 0 && (blocked.down || touching.down));
  if (blockedX) actor.knockbackVelocityX = 0;
  if (blockedY) actor.knockbackVelocityY = 0;
  if (blockedX || blockedY) {
    actor.knockbackRemaining = 0;
    actor.setVelocity(0, 0);
    return true;
  }

  actor.setVelocity(actor.knockbackVelocityX || 0, actor.knockbackVelocityY || 0);
  actor.knockbackRemaining = Math.max(0, actor.knockbackRemaining - Math.max(0, Number(delta) || 0));
  return true;
}

export function constrainActorToBounds(actor, bounds, padding = 0) {
  if (!actor?.active || !bounds) return false;
  const halfWidth = actor.body?.halfWidth || padding;
  const halfHeight = actor.body?.halfHeight || padding;
  const minX = bounds.left + halfWidth;
  const maxX = bounds.right - halfWidth;
  const minY = bounds.top + halfHeight;
  const maxY = bounds.bottom - halfHeight;
  const x = Math.max(minX, Math.min(maxX, actor.x));
  const y = Math.max(minY, Math.min(maxY, actor.y));
  if (x === actor.x && y === actor.y) return false;
  actor.knockbackRemaining = 0;
  actor.knockbackVelocityX = 0;
  actor.knockbackVelocityY = 0;
  if (actor.body?.reset) actor.body.reset(x, y);
  else actor.setPosition?.(x, y);
  actor.setVelocity?.(0, 0);
  return true;
}
