export const WAVE_COUNT_MULTIPLIER = 2.5;
export const LATE_WAVE_COUNT_MULTIPLIER = 1.2;
export const ENEMY_GOLD_MULTIPLIER = 1 / 3;
export const SHIELDED_WAVE_START = 28;

export const WAVES = [
  [{ type: "runner", count: 6, interval: 1.50 }],
  [{ type: "runner", count: 8, interval: 1.40 }],
  [{ type: "runner", count: 6, interval: 1.35 }, { type: "armor", count: 2, interval: 1.50 }, { type: "runner", count: 4, interval: 1.25 }],
  [{ type: "armor", count: 4, interval: 1.25 }, { type: "runner", count: 8, interval: 1.10 }],
  [{ type: "runner", count: 10, interval: 0.95 }, { type: "armor", count: 6, interval: 1.10 }, { type: "boss", count: 1, interval: 1.40 }],
  [{ type: "runner", count: 14, interval: 0.95 }, { type: "split", count: 7, interval: 1.15 }],
  [{ type: "armor", count: 7, interval: 1.00 }, { type: "split", count: 5, interval: 1.00 }, { type: "runner", count: 8, interval: 0.90 }],
  [{ type: "ghost", count: 5, interval: 1.05 }, { type: "runner", count: 12, interval: 0.85 }, { type: "armor", count: 6, interval: 0.95 }],
  [{ type: "split", count: 8, interval: 0.90 }, { type: "ghost", count: 7, interval: 0.90 }, { type: "armor", count: 8, interval: 0.90 }],
  [{ type: "runner", count: 12, interval: 0.80 }, { type: "ghost", count: 8, interval: 0.90 }, { type: "boss", count: 1, interval: 1.20 }],
  [{ type: "healer", count: 4, interval: 1.00 }, { type: "armor", count: 9, interval: 0.85 }, { type: "runner", count: 12, interval: 0.75 }],
  [{ type: "healer", count: 5, interval: 0.90 }, { type: "split", count: 9, interval: 0.80 }, { type: "ghost", count: 8, interval: 0.80 }],
  [{ type: "armor", count: 12, interval: 0.75 }, { type: "healer", count: 6, interval: 0.85 }, { type: "runner", count: 14, interval: 0.65 }, { type: "regenerator", count: 4, interval: 0.82 }],
  [{ type: "ghost", count: 12, interval: 0.70 }, { type: "split", count: 11, interval: 0.72 }, { type: "healer", count: 7, interval: 0.80 }],
  [
    { type: "runner", count: 14, interval: 0.65 }, { type: "armor", count: 12, interval: 0.70 },
    { type: "split", count: 10, interval: 0.70 }, { type: "ghost", count: 10, interval: 0.70 },
    { type: "healer", count: 6, interval: 0.80 }, { type: "boss", count: 1, interval: 1.00 }
  ],
  [{ type: "runner", count: 20, interval: 0.58 }, { type: "split", count: 12, interval: 0.66 }, { type: "ghost", count: 8, interval: 0.72 }, { type: "berserker", count: 6, interval: 0.68 }],
  [{ type: "armor", count: 6, interval: 0.68 }, { type: "healer", count: 10, interval: 0.75 }, { type: "ghost", count: 20, interval: 0.65 }],
  [{ type: "split", count: 16, interval: 0.62 }, { type: "runner", count: 20, interval: 0.55 }, { type: "healer", count: 7, interval: 0.72 }, { type: "thief", count: 6, interval: 0.64 }],
  [{ type: "ghost", count: 18, interval: 0.58 }, { type: "armor", count: 14, interval: 0.62 }, { type: "healer", count: 9, interval: 0.70 }],
  [
    { type: "armor", count: 14, interval: 0.60 }, { type: "split", count: 12, interval: 0.62 },
    { type: "ghost", count: 12, interval: 0.60 }, { type: "healer", count: 8, interval: 0.68 },
    { type: "boss", count: 2, interval: 1.00 }
  ],
  [
    { type: "runner", count: 24, interval: 0.48 }, { type: "armor", count: 16, interval: 0.55 },
    { type: "split", count: 14, interval: 0.56 }, { type: "ghost", count: 12, interval: 0.54 },
    { type: "healer", count: 8, interval: 0.65 }, { type: "regenerator", count: 6, interval: 0.62 }
  ],
  [
    { type: "armor", count: 18, interval: 0.52 }, { type: "split", count: 16, interval: 0.54 },
    { type: "ghost", count: 16, interval: 0.52 }, { type: "healer", count: 10, interval: 0.60 },
    { type: "boss", count: 2, interval: 0.90 }
  ],
  [
    { type: "runner", count: 20, interval: 0.46 }, { type: "armor", count: 16, interval: 0.52 },
    { type: "split", count: 14, interval: 0.52 }, { type: "ghost", count: 14, interval: 0.50 },
    { type: "healer", count: 10, interval: 0.58 }, { type: "berserker", count: 6, interval: 0.58 }, { type: "boss", count: 2, interval: 0.85 }
  ],
  [
    { type: "armor", count: 20, interval: 0.46 }, { type: "split", count: 18, interval: 0.48 },
    { type: "ghost", count: 18, interval: 0.46 }, { type: "healer", count: 12, interval: 0.54 }, { type: "thief", count: 6, interval: 0.50 },
    { type: "boss", count: 3, interval: 0.80 }
  ],
  [{ type: "boss", count: 8, interval: 1.50 }],
  [
    { type: "warder", count: 8, interval: 0.52 }, { type: "armor", count: 14, interval: 0.48 },
    { type: "ghost", count: 12, interval: 0.46 }, { type: "healer", count: 6, interval: 0.56 }, { type: "regenerator", count: 8, interval: 0.54 }
  ],
  [
    { type: "burrower", count: 12, interval: 0.48 }, { type: "runner", count: 18, interval: 0.40 },
    { type: "split", count: 12, interval: 0.46 }, { type: "warder", count: 8, interval: 0.50 }, { type: "berserker", count: 8, interval: 0.48 }
  ],
  [
    { type: "disruptor", count: 8, interval: 0.54 }, { type: "armor", count: 16, interval: 0.44 },
    { type: "healer", count: 10, interval: 0.50 }, { type: "thief", count: 8, interval: 0.48 }, { type: "boss", count: 2, interval: 0.82 }
  ],
  [
    { type: "warder", count: 10, interval: 0.46 }, { type: "burrower", count: 14, interval: 0.42 },
    { type: "disruptor", count: 10, interval: 0.48 }, { type: "regenerator", count: 4, interval: 0.46 },
    { type: "berserker", count: 4, interval: 0.44 }, { type: "thief", count: 4, interval: 0.42 }, { type: "boss", count: 3, interval: 0.76 }
  ],
  [{ type: "overlord", count: 1, interval: 4.00 }]
];
