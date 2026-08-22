export const BUFFS = {
  sharp_edge: {
    id: "sharp_edge",
    name: "鋒利刃",
    rarity: "普通",
    color: 0x8ebc72,
    maxStacks: 5,
    description: "近戰傷害 +4",
    apply(player) {
      player.attackDamage += 4;
    },
  },
  wide_arc: {
    id: "wide_arc",
    name: "寬刃",
    rarity: "普通",
    color: 0x8ebc72,
    maxStacks: 2,
    description: "攻擊距離 +8、扇形 +15°",
    apply(player) {
      player.attackRange += 8;
      player.attackArcDeg += 15;
    },
  },
  heavy_handle: {
    id: "heavy_handle",
    name: "重握柄",
    rarity: "普通",
    color: 0x8ebc72,
    maxStacks: 2,
    description: "擊退 +25%，揮擊間隔 +0.05 秒",
    apply(player) {
      player.knockbackMultiplier *= 1.25;
      player.attackCooldownMs += 50;
    },
  },
  swift_step: {
    id: "swift_step",
    name: "疾步",
    rarity: "普通",
    color: 0x8ebc72,
    maxStacks: 3,
    description: "移動速度 +8%",
    apply(player) {
      player.moveSpeed *= 1.08;
    },
  },
  iron_skin: {
    id: "iron_skin",
    name: "鐵皮",
    rarity: "普通",
    color: 0x8ebc72,
    maxStacks: 3,
    description: "受到傷害 -2（最低仍受 1）",
    apply(player) {
      player.damageReduction += 2;
    },
  },
  vital_core: {
    id: "vital_core",
    name: "活力核心",
    rarity: "稀有",
    color: 0x79a8d5,
    maxStacks: 3,
    description: "最大生命 +20，立即恢復 20",
    apply(player) {
      player.maxHealth += 20;
      player.health = Math.min(player.maxHealth, player.health + 20);
    },
  },
  bleeding_edge: {
    id: "bleeding_edge",
    name: "流血刃",
    rarity: "稀有",
    color: 0x79a8d5,
    maxStacks: 2,
    description: "近戰命中施加 3 秒流血，每秒 3 傷害",
    apply(player) {
      player.bleedDamage += 3;
    },
  },
  vampiric_mark: {
    id: "vampiric_mark",
    name: "吸血印記",
    rarity: "稀有",
    color: 0x79a8d5,
    maxStacks: 2,
    description: "近戰擊殺恢復 2 生命，每房最多觸發 10 次",
    apply(player) {
      player.lifestealAmount += 2;
    },
  },
  combo_drive: {
    id: "combo_drive",
    name: "連斬驅動",
    rarity: "稀有",
    color: 0x79a8d5,
    maxStacks: 1,
    description: "連續命中不同敵人時，第三次傷害 +35%",
    apply(player) {
      player.comboDrive = true;
    },
  },
  machine_resonance: {
    id: "machine_resonance",
    name: "機械共鳴",
    rarity: "傳奇",
    color: 0xc68bd7,
    maxStacks: 2,
    description: "首次命中標記機械敵人；後續命中每層使攻擊冷卻 -15%",
    apply(player) {
      player.machineResonanceStacks += 1;
    },
  },
  last_stand: {
    id: "last_stand",
    name: "背水一擊",
    rarity: "傳奇",
    color: 0xc68bd7,
    maxStacks: 1,
    description: "生命低於 30% 時近戰傷害 +40%",
    apply(player) {
      player.lastStand = true;
    },
  },
};

export const BUFF_POOL_BY_ROOM = [
  ["sharp_edge", "minor_heal", "gold_cache", "swift_step", "iron_skin"],
  ["sharp_edge", "swift_step", "iron_skin", "minor_heal", "emergency_vial", "wide_arc"],
  ["wide_arc", "bleeding_edge", "vital_core", "heavy_handle", "gold_cache", "minor_heal"],
  ["machine_resonance", "swift_step", "vital_core", "bleeding_edge", "vampiric_mark", "gold_cache"],
  ["machine_resonance", "last_stand", "combo_drive", "vital_core", "bleeding_edge", "gold_cache"],
];
