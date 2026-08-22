const SETTINGS_KEY = "dungeon-settings-v1";
const LAST_SEED_KEY = "dungeon-last-seed-v1";

export function loadSettings() {
  try {
    const value = JSON.parse(window.localStorage.getItem(SETTINGS_KEY) || "{}");
    return { soundEnabled: value.soundEnabled !== false };
  } catch {
    return { soundEnabled: true };
  }
}

export function saveSettings(settings) {
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify({
      soundEnabled: settings.soundEnabled !== false,
    }));
  } catch {
    // Private browsing and disabled storage should not prevent a run.
  }
}

export function loadLastSeed() {
  try {
    return window.localStorage.getItem(LAST_SEED_KEY) || "";
  } catch {
    return "";
  }
}

export function saveLastSeed(seed) {
  try {
    window.localStorage.setItem(LAST_SEED_KEY, seed);
  } catch {
    // Storage is an optional convenience, not part of the active run state.
  }
}

export function createRunStats(seed) {
  return {
    seed,
    startedAt: Date.now(),
    roomsCleared: 0,
    damageTaken: 0,
    buffs: [],
    gold: 0,
    consumablesUsed: 0,
    trophy: false,
  };
}

export function cloneRunStats(stats = {}) {
  return {
    seed: stats.seed || "",
    startedAt: stats.startedAt || Date.now(),
    roomsCleared: stats.roomsCleared || 0,
    damageTaken: stats.damageTaken || 0,
    buffs: [...(stats.buffs || [])],
    gold: stats.gold || 0,
    consumablesUsed: stats.consumablesUsed || 0,
    trophy: Boolean(stats.trophy),
  };
}

export function getRunDurationSeconds(stats) {
  return Math.max(0, Math.round((Date.now() - (stats.startedAt || Date.now())) / 1000));
}
