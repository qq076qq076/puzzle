const IMPACT_PROFILES = Object.freeze({
  hit: { hitStopMs: 38, shakeMs: 72, shakeIntensity: 0.0024 },
  heavy: { hitStopMs: 50, shakeMs: 88, shakeIntensity: 0.0032 },
  kill: { hitStopMs: 62, shakeMs: 108, shakeIntensity: 0.0042 },
  damage: { hitStopMs: 48, shakeMs: 105, shakeIntensity: 0.0052, flash: [105, 24, 28] },
});

export function getImpactProfile(kind = "hit") {
  return IMPACT_PROFILES[kind] || IMPACT_PROFILES.hit;
}

export function triggerCombatImpact(scene, kind = "hit") {
  const profile = getImpactProfile(kind);
  scene.combatHitStopRemaining = Math.max(scene.combatHitStopRemaining || 0, profile.hitStopMs);
  scene.physics?.world?.pause?.();
  scene.cameras?.main?.shake?.(profile.shakeMs, profile.shakeIntensity, true);
  if (profile.flash) scene.cameras?.main?.flash?.(58, ...profile.flash, false);
  return profile;
}

export function updateCombatHitStop(scene, delta) {
  if (!(scene?.combatHitStopRemaining > 0)) return false;
  scene.combatHitStopRemaining = Math.max(0, scene.combatHitStopRemaining - Math.max(0, Number(delta) || 0));
  if (scene.combatHitStopRemaining > 0) return true;
  scene.physics?.world?.resume?.();
  return false;
}

export function releaseCombatHitStop(scene) {
  if (!scene) return;
  scene.combatHitStopRemaining = 0;
  scene.physics?.world?.resume?.();
}
