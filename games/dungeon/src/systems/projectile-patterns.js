export function getEnemyProjectilePattern(definition) {
  if (definition?.projectilePattern === "burst") {
    return [
      { angleOffset: -0.09, delayMs: 0 },
      { angleOffset: 0, delayMs: 110 },
      { angleOffset: 0.09, delayMs: 220 },
    ];
  }
  return [{ angleOffset: 0, delayMs: 0 }];
}
