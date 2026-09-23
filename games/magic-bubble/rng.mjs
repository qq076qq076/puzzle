export function normalizeSeed(value) {
  const seed = Number(value) >>> 0;
  return seed || 0x6d2b79f5;
}

export function nextRandom(state) {
  let nextState = (normalizeSeed(state) + 0x6d2b79f5) >>> 0;
  let value = nextState;
  value = Math.imul(value ^ (value >>> 15), value | 1);
  value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
  return {
    state: nextState,
    value: ((value ^ (value >>> 14)) >>> 0) / 4294967296
  };
}

export function randomInt(state, min, max) {
  const result = nextRandom(state);
  return {
    state: result.state,
    value: min + Math.floor(result.value * (max - min + 1))
  };
}

export function browserSeed() {
  if (globalThis.crypto && typeof globalThis.crypto.getRandomValues === "function") {
    const values = new Uint32Array(1);
    globalThis.crypto.getRandomValues(values);
    return normalizeSeed(values[0]);
  }
  return normalizeSeed(Date.now());
}

