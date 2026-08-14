export const BUY_COST = 25;
export const TIER_ATTACK_RATE_MULTIPLIERS = [0.5, 0.75, 1, 1, 1, 1];
export const MAX_TIER = 6;
export const BUILD_TIMES = [1.2, 2.4, 4, 5.8, 7.8, 10];
export const CRIT_CHANCES = [0.10, 0.20, 0.35, 0.48, 0.60, 0.72];
export const FROST_CRIT_CHANCES = [0.02, 0.03, 0.04, 0.06, 0.08, 0.10];
export const POISON_DURATIONS = [4, 5, 6, 7, 8, 9];
export const CRIT_DAMAGE_MULTIPLIER = 1.75;
export const TOWER_DAMAGE_MULTIPLIER = 0.5;
export const ATTACK_PULSE_DURATION = 0.18;
export const MERGE_EFFECT_DURATION = 0.95;
export const TIER_FIVE_MERGE_EFFECT_DURATION = 1.15;
export const TIER_SIX_MERGE_EFFECT_DURATION = 1.65;

export const TOWER_TYPES = {
  cannon: {
    name: "炮擊骰",
    symbol: "✹",
    color: "#ff9b65",
    description: "穩定的單體輸出；爆擊造成 1.75 倍傷害並以目標為中心爆炸。",
    projectileDuration: 0.34,
    criticalSplashRadius: 1,
    criticalSplashDamageRatio: 0.8,
    tiers: [
      { damage: 5.6, range: 3, interval: 0.50 },
      { damage: 12, range: 3.5, interval: 0.42 },
      { damage: 29.7, range: 4, interval: 0.34 },
      { damage: 54, range: 4.5, interval: 0.31 },
      { damage: 105, range: 5, interval: 0.28 },
      { damage: 180, range: 5.5, interval: 0.25 }
    ]
  },
  frost: {
    name: "霜凍骰",
    symbol: "❄",
    color: "#71d8f4",
    description: "降低敵人速度；爆擊造成 1.75 倍傷害並將目標凍結。",
    slow: [0.20, 0.28, 0.38, 0.48, 0.58, 0.68],
    slowDuration: 2,
    freezeDuration: 1.2,
    projectileDuration: 0.28,
    tiers: [
      { damage: 2.4, range: 3, interval: 0.42 },
      { damage: 4.8, range: 3.5, interval: 0.40 },
      { damage: 11.7, range: 4, interval: 0.38 },
      { damage: 20.7, range: 4.5, interval: 0.35 },
      { damage: 40, range: 5, interval: 0.32 },
      { damage: 68, range: 5.5, interval: 0.29 }
    ]
  },
  poison: {
    name: "毒蝕骰",
    symbol: "☣",
    color: "#9ad86f",
    description: "施加持續毒傷；爆擊對目標周圍 1 格內所有敵人造成毒傷。",
    poisonDamageRatio: 0.35,
    criticalRadius: 1,
    projectileDuration: 0.36,
    tiers: [
      { damage: 1.6, range: 2.5, interval: 0.38 },
      { damage: 3.2, range: 3, interval: 0.36 },
      { damage: 9, range: 3.5, interval: 0.34 },
      { damage: 16.2, range: 4, interval: 0.31 },
      { damage: 32, range: 4.5, interval: 0.28 },
      { damage: 56, range: 5, interval: 0.25 }
    ]
  },
  chain: {
    name: "連鎖骰",
    symbol: "⚡",
    color: "#f6cf63",
    description: "讓傷害跳向敵群；爆擊造成 1.75 倍傷害且連鎖不衰減。",
    chainCount: [2, 3, 5, 7, 9, 12],
    attenuation: [1, 0.65, 0.45, 0.32, 0.24],
    minimumAttenuation: 0.2,
    effectDuration: 0.3,
    tiers: [
      { damage: 3.2, range: 3, interval: 0.59 },
      { damage: 7.2, range: 3.5, interval: 0.53 },
      { damage: 17.1, range: 4, interval: 0.46 },
      { damage: 30.6, range: 4.5, interval: 0.42 },
      { damage: 58, range: 5, interval: 0.38 },
      { damage: 96, range: 5.5, interval: 0.34 }
    ]
  },
  pierce: {
    name: "穿刺骰",
    symbol: "➹",
    color: "#d4a4ff",
    description: "沿道路順序穿透敵人；爆擊造成 1.75 倍傷害並貫穿所有合法目標。",
    pierceCount: [2, 4, 7, 10, 14, 20],
    projectileDuration: 0.3,
    tiers: [
      { damage: 4, range: 4, interval: 0.46 },
      { damage: 8.8, range: 4.5, interval: 0.42 },
      { damage: 21.6, range: 5, interval: 0.38 },
      { damage: 37.8, range: 5.5, interval: 0.35 },
      { damage: 72, range: 6, interval: 0.32 },
      { damage: 120, range: 6.5, interval: 0.29 }
    ]
  },
  blade: {
    name: "刃擊骰",
    symbol: "⚔",
    color: "#ff718f",
    description: "近距離物理攻擊；命中讓目標沿道路後退 0.5 格。",
    knockbackDistance: 0.5,
    effectDuration: 0.3,
    tiers: [
      { damage: 7.2, range: 2, interval: 0.60 },
      { damage: 15.2, range: 2, interval: 0.56 },
      { damage: 35, range: 2, interval: 0.52 },
      { damage: 63, range: 3, interval: 0.49 },
      { damage: 118, range: 3, interval: 0.46 },
      { damage: 200, range: 3, interval: 0.43 }
    ]
  },
  inspire: {
    name: "鼓舞骰",
    symbol: "✦",
    color: "#ffcf85",
    description: "讓相鄰骰塔加快攻擊；爆擊使相鄰非鼓舞骰塔的下一次攻擊必定爆擊。",
    bonus: [0.08, 0.14, 0.22, 0.30, 0.39, 0.49],
    tiers: [
      { range: 1.5, interval: 0.59 },
      { range: 1.5, interval: 0.52 },
      { range: 1.5, interval: 0.46 },
      { range: 1.5, interval: 0.41 },
      { range: 1.5, interval: 0.37 },
      { range: 1.5, interval: 0.33 }
    ]
  }
};
