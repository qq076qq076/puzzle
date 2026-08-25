export function createRng(seed) {
  let state = hashSeed(String(seed));
  return {
    next() {
      state = (state + 0x6d2b79f5) | 0;
      let value = Math.imul(state ^ (state >>> 15), 1 | state);
      value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    },
    int(min, max) {
      return Math.floor(this.next() * (max - min + 1)) + min;
    },
    real(min, max) {
      return this.next() * (max - min) + min;
    },
    pick(values) {
      return values[Math.floor(this.next() * values.length)];
    },
  };
}

export function hashSeed(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function makeRunSeed(now = Date.now(), random = Math.random()) {
  return `${now.toString(36)}-${Math.floor(random * 0xffffff).toString(36).padStart(5, "0")}`;
}
