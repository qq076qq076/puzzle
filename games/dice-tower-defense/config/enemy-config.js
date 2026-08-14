export const BOSS_LANDING_DURATION = 0.9;
export const ENEMY_VISUAL_SCALE = (3 / 4) * 1.5;
export const ENEMY_RESISTANCE_START_WAVE = 12;
export const ENEMY_RESISTANCE_PER_WAVE = 0.02;
export const ENEMY_RESISTANCE_CAP = 0.36;

export const RESISTANCE_STYLES = {
  freeze: { label: "冰凍", icon: "❄", color: "#71d8f4" },
  lightning: { label: "雷電", icon: "⚡", color: "#f6cf63" },
  poison: { label: "毒素", icon: "☣", color: "#9ad86f" },
  physical: { label: "物理", icon: "◆", color: "#c5ced9" }
};

export const MAGE_DISABLE_RADIUS = 2.6;
export const MAGE_DISABLE_DURATION = 0.7;
export const MAGE_DISABLE_COOLDOWN = 12;
export const HEALER_COOLDOWN = 8.5;
export const HEALER_HEAL_RATIO = 0.05;
export const HEALING_TARGET_COOLDOWN = 6;
export const KNOCKBACK_PROTECTION_DISTANCE = 1.35;
export const KNOCKBACK_PROTECTION_MIN = 0.75;
export const KNOCKBACK_PROTECTION_MAX = 2;
export const BOSS_KNOCKBACK_PROTECTION = 2.5;

export const ENEMY_ABILITY_CONFIG = {
  ghost: { firstCooldown: 6, cooldown: 6, invisibleDuration: 1 },
  warder: { firstCooldown: 3.5, staggerCycle: 4, staggerStep: 0.45, cooldown: 5.25, radius: 2.2, shieldRatio: 0.08 },
  burrower: { firstCooldown: 4, staggerCycle: 5, staggerStep: 0.35, cooldown: 5.5, duration: 1.25, speedMultiplier: 1.65 },
  disruptor: { firstCooldown: 4.5, staggerCycle: 6, staggerStep: 0.4, cooldown: 6, radius: 2.6, cooldownDelay: 0.45 },
  regenerator: { damageDelay: 2.5, healPerSecond: 0.02, visualCooldown: 0.6 },
  berserker: { hpThreshold: 0.5, speedMultiplier: 1.7 },
  boss: { cooldown: 8, speedBoostDuration: 3, speedBoostMultiplier: 1.2, summonCount: 4 }
};

export const ENEMY_TYPES = {
  runner: { name: "迅捷蟲", symbol: "S", color: "#ff8d83", hp: 35, speed: 1.8, leakDamage: 1, reward: 2, waveResistanceTypes: ["freeze"] },
  armor: { name: "裝甲蟲", symbol: "A", color: "#b3bdca", hp: 95, speed: 0.8, leakDamage: 1, reward: 3, baseResistances: { physical: 0.35 }, waveResistanceTypes: ["physical"] },
  split: { name: "分裂蟲", symbol: "D", color: "#dc9b76", hp: 70, speed: 1.0, leakDamage: 1, reward: 3, splits: true, waveResistanceTypes: ["lightning"] },
  child: { name: "分裂幼體", symbol: "d", color: "#e4bf7b", hp: 20, speed: 1.35, leakDamage: 1, reward: 1, waveResistanceTypes: ["poison"] },
  ghost: { name: "幽影蟲", symbol: "G", color: "#b898ec", hp: 110, speed: 1.1, leakDamage: 1, reward: 4, canBecomeInvisible: true, waveResistanceTypes: ["physical"] },
  healer: { name: "治療法師", symbol: "H", color: "#78d8ae", hp: 80, speed: 0.7, leakDamage: 2, reward: 5, waveResistanceTypes: ["poison"] },
  boss: { name: "巨甲王", symbol: "B", color: "#ffbf62", hp: 900, speed: 0.45, leakDamage: 5, reward: 30, boss: true, waveResistanceTypes: ["physical"] },
  warder: { name: "結界蟲", symbol: "W", color: "#69e7ef", hp: 145, speed: 0.74, leakDamage: 2, reward: 6, waveResistanceTypes: ["lightning"] },
  burrower: { name: "潛地蟲", symbol: "U", color: "#dfad73", hp: 105, speed: 1.18, leakDamage: 2, reward: 5, waveResistanceTypes: ["freeze"] },
  disruptor: { name: "干擾蟲", symbol: "J", color: "#ed82ff", hp: 175, speed: 0.68, leakDamage: 3, reward: 8, waveResistanceTypes: ["lightning"] },
  overlord: { name: "裂界巨甲王", symbol: "O", color: "#e36eff", hp: 1800, speed: 0.38, leakDamage: 8, reward: 60, boss: true, finalBoss: true, waveResistanceTypes: ["lightning", "physical"] },
  regenerator: { name: "再生蟲", symbol: "R", color: "#70e58c", hp: 150, speed: 0.78, leakDamage: 2, reward: 6, waveResistanceTypes: ["poison"] },
  berserker: { name: "狂暴蟲", symbol: "K", color: "#ff665f", hp: 120, speed: 1.0, leakDamage: 2, reward: 6, waveResistanceTypes: ["freeze"] },
  thief: { name: "掠金蟲", symbol: "T", color: "#ffd45d", hp: 85, speed: 1.45, leakDamage: 1, reward: 9, goldSteal: 12, waveResistanceTypes: ["freeze"] }
};

export const ENEMY_MODELS = {
  runner: { spritePath: "assets/enemies/swift-bat.png", spriteScale: 0.6, radius: 0.25, scaleMultiplier: 1 },
  armor: { spritePath: "assets/enemies/armored-knight.png", spriteScale: 0.6, radius: 0.25, scaleMultiplier: 1 },
  split: { spritePath: "assets/enemies/splitter-slime.png", spriteScale: 0.6, radius: 0.25, scaleMultiplier: 1 },
  child: { spritePath: "assets/enemies/child-spider.png", spriteScale: 0.46, radius: 0.25, scaleMultiplier: 1 },
  ghost: { spritePath: "assets/enemies/shadow-ghost.png", spriteScale: 0.6, radius: 0.25, scaleMultiplier: 1 },
  healer: { spritePath: "assets/enemies/healer-wizard.png", spriteScale: 0.6, radius: 0.25, scaleMultiplier: 1 },
  boss: { spritePath: "assets/enemies/boss-demon.png", spriteScale: 0.82, radius: 0.34, scaleMultiplier: 1 },
  warder: { spritePath: "assets/enemies/armored-knight.png", spriteScale: 0.6, radius: 0.25, scaleMultiplier: 1 },
  burrower: { spritePath: "assets/enemies/child-spider.png", spriteScale: 0.6, radius: 0.25, scaleMultiplier: 1 },
  disruptor: { spritePath: "assets/enemies/shadow-ghost.png", spriteScale: 0.6, radius: 0.25, scaleMultiplier: 1 },
  overlord: { spritePath: "assets/enemies/boss-demon.png", spriteScale: 0.94, radius: 0.34, scaleMultiplier: 1.5 },
  regenerator: { spritePath: "assets/enemies/splitter-slime.png", spriteScale: 0.6, radius: 0.25, scaleMultiplier: 1 },
  berserker: { spritePath: "assets/enemies/armored-knight.png", spriteScale: 0.6, radius: 0.25, scaleMultiplier: 1 },
  thief: { spritePath: "assets/enemies/child-spider.png", spriteScale: 0.6, radius: 0.25, scaleMultiplier: 1 }
};
