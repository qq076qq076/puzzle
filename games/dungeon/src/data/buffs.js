export const BUFFS = {
  sharp_edge: {
    id: "sharp_edge",
    name: "鋒利刃",
    rarity: "普通",
    description: "近戰傷害 +4",
    apply(player) {
      player.attackDamage += 4;
    },
  },
  wide_arc: {
    id: "wide_arc",
    name: "寬刃",
    rarity: "普通",
    description: "近戰攻擊距離 +8、扇形 +15°",
    apply(player) {
      player.attackRange += 8;
      player.attackArcDeg += 15;
    },
  },
  swift_step: {
    id: "swift_step",
    name: "疾步",
    rarity: "普通",
    description: "移動速度 +8%",
    apply(player) {
      player.moveSpeed *= 1.08;
    },
  },
  iron_skin: {
    id: "iron_skin",
    name: "鐵皮",
    rarity: "普通",
    description: "受到傷害 -2",
    apply(player) {
      player.damageReduction += 2;
    },
  },
  vital_core: {
    id: "vital_core",
    name: "活力核心",
    rarity: "稀有",
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
    description: "近戰命中施加流血效果",
    apply(player) {
      player.bleedDamage = (player.bleedDamage ?? 0) + 3;
    },
  },
  machine_resonance: {
    id: "machine_resonance",
    name: "機械共鳴",
    rarity: "傳奇",
    description: "機械敵人受到的近戰傷害 +20%",
    apply(player) {
      player.machineDamageMultiplier = (player.machineDamageMultiplier ?? 1) + 0.2;
    },
  },
};

export const BUFF_POOL_BY_ROOM = [
  ["sharp_edge", "swift_step", "iron_skin", "vital_core"],
  ["sharp_edge", "wide_arc", "swift_step", "iron_skin", "vital_core"],
  ["sharp_edge", "wide_arc", "swift_step", "iron_skin", "vital_core", "bleeding_edge"],
  ["wide_arc", "swift_step", "vital_core", "bleeding_edge", "machine_resonance"],
  ["wide_arc", "vital_core", "bleeding_edge", "machine_resonance"],
];
