export function nextRandom(rng) {
  let value = Number(rng?.state) >>> 0;
  value ^= value << 13;
  value ^= value >>> 17;
  value ^= value << 5;
  rng.state = value >>> 0 || 0x9e3779b9;
  return rng.state / 0x1_0000_0000;
}

export function randomInt(rng, min, max) {
  return min + Math.floor(nextRandom(rng) * (max - min + 1));
}
