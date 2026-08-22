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

  actor.setVelocity(actor.knockbackVelocityX || 0, actor.knockbackVelocityY || 0);
  actor.knockbackRemaining = Math.max(0, actor.knockbackRemaining - Math.max(0, Number(delta) || 0));
  return true;
}
