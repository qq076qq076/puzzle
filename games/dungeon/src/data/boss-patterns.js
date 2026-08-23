export const BOSS_PHASE_TRANSITION_MS = 1700;

export const BOSS_ATTACKS = Object.freeze({
  combo: Object.freeze({ windupMs: 520, repeatWindupMs: 360, recoverMs: 950, cooldownMs: 1450, comboHits: 2 }),
  charge: Object.freeze({ windupMs: 720, recoverMs: 1150, cooldownMs: 1650 }),
  volley: Object.freeze({ windupMs: 680, recoverMs: 1050, cooldownMs: 1550 }),
  summon: Object.freeze({ windupMs: 820, recoverMs: 1350, cooldownMs: 1850 }),
  mine: Object.freeze({ windupMs: 760, recoverMs: 1300, cooldownMs: 1800 }),
});

export const BOSS_PHASE_PATTERNS = Object.freeze({
  1: Object.freeze(["combo", "volley", "charge"]),
  2: Object.freeze(["volley", "summon", "charge", "combo"]),
  3: Object.freeze(["mine", "volley", "charge", "combo"]),
});

export function getBossAttack(phase, patternIndex) {
  const pattern = BOSS_PHASE_PATTERNS[phase] || BOSS_PHASE_PATTERNS[1];
  const kind = pattern[patternIndex % pattern.length];
  return { kind, ...BOSS_ATTACKS[kind] };
}

export function getBossVolleyOffsets(phase) {
  if (phase >= 3) return [-0.66, -0.44, -0.22, 0, 0.22, 0.44, 0.66];
  if (phase === 2) return [-0.44, -0.22, 0, 0.22, 0.44];
  return [-0.3, 0, 0.3];
}
