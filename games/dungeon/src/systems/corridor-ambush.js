export function shouldTriggerCorridorAmbush(ambush, player, cellSize) {
  if (!ambush || ambush.state !== "pending" || !player?.active) return false;
  const [x, y] = ambush.trigger || [];
  if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
  return Math.hypot(player.x - x, player.y - y) <= Math.max(1, cellSize * 0.8);
}

export function isCorridorAmbushCleared(ambush, pendingSpawns, enemies) {
  return ambush?.state === "active"
    && pendingSpawns === 0
    && (enemies || []).every((enemy) => !enemy.active);
}
