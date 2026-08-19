(function (globalThis) {
  "use strict";

  globalThis.HarvestStaticData ||= {};
  globalThis.HarvestStaticData.TOOLS = Object.freeze([
    { id: "small_knife", name: "小刀", emoji: "🔪", image: "vegetable-peeler.png", cost: 0, damage: 1, shape: "single", cells: 1, regrowth: 1, unlock: { type: "initial", value: 0 } },
    { id: "garden_shears", name: "園藝剪", emoji: "✂️", image: "pruning-shears.png", cost: 45, damage: 2, shape: "single", cells: 1, regrowth: 1, unlock: { type: "harvested", value: 20 } },
    { id: "hand_trowel", name: "手持鏟", emoji: "🪏", image: "hand-trowel.png", cost: 160, damage: 3, shape: "col3", cells: 3, regrowth: 1, unlock: { type: "harvested", value: 60 } },
    { id: "machete", name: "尖頭鏟", emoji: "♠️", image: "garden-spade.png", cost: 420, damage: 5, shape: "row3", cells: 3, regrowth: 1, unlock: { type: "harvested", value: 120 } },
    { id: "short_sickle", name: "短柄鐮刀", emoji: "⚒️", image: "farm-scythe.png", cost: 1800, damage: 4, shape: "row5", cells: 5, regrowth: 1, unlock: { type: "harvested", value: 250 } },
    { id: "long_sickle", name: "長柄鋤", emoji: "🛠️", image: "garden-hoe.png", cost: 6000, damage: 7, shape: "cross", cells: 5, regrowth: 0.95, unlock: { type: "harvested", value: 600 } },
    { id: "pitchfork", name: "五齒耙", emoji: "🔱", image: "compost-pile-pitchfork.png", cost: 22000, damage: 8, shape: "col5", cells: 5, regrowth: 0.92, unlock: { type: "plots", value: 12 } },
    { id: "rotary_cutter", name: "銅製十字鎬", emoji: "⛏️", image: "copper-pickaxe.png", cost: 85000, damage: 12, shape: "diamond2", cells: 13, regrowth: 0.9, unlock: { type: "harvested", value: 2500 } },
    { id: "steel_harvester", name: "精鋼鋤", emoji: "🛠️", image: "iron-hoe.png", cost: 300000, damage: 25, shape: "square3", cells: 9, regrowth: 0.8, unlock: { type: "plots", value: 18 } },
    { id: "wide_scythe", name: "廣域鐮刀", emoji: "⚒️", image: "farm-scythe.png", cost: 1200000, damage: 32, shape: "cross9", cells: 9, regrowth: 0.72, unlock: { type: "harvested", value: 12000 } },
    { id: "prosperity_blade", name: "聯合收割機", emoji: "🚜", image: "combine-harvester.png", cost: 6000000, damage: 60, shape: "square5", cells: 25, regrowth: 0.6, unlock: { type: "plots", value: 24 } },
    { id: "grand_harvester", name: "巨型聯合收割機", emoji: "🚜", image: "combine-harvester.png", cost: 30000000, damage: 110, shape: "square7", cells: 49, regrowth: 0.5, unlock: { type: "harvested", value: 50000 } },
    { id: "forester_axe", name: "林務雙刃斧", emoji: "🪓", image: "woodcutter-hand-axe.png", cost: 120000000, damage: 220, shape: "single", cells: 1, regrowth: 0.48, unlock: { type: "harvested", value: 70000 } },
    { id: "steel_hatchet", name: "精鋼伐木斧", emoji: "🪓", image: "steel-hatchet.png", cost: 350000000, damage: 420, shape: "cross", cells: 5, regrowth: 0.44, unlock: { type: "harvested", value: 90000 } },
    { id: "crosscut_saw", name: "橫切手鋸", emoji: "🪚", image: "hand-saw-crosscut.png", cost: 1100000000, damage: 650, shape: "row5", cells: 5, regrowth: 0.4, unlock: { type: "plots", value: 45 } },
    { id: "double_bit_axe", name: "重型雙刃斧", emoji: "🪓", image: "double-bit-war-axe.png", cost: 4000000000, damage: 1000, shape: "square3", cells: 9, regrowth: 0.34, unlock: { type: "harvested", value: 140000 } },
    { id: "power_saw", name: "動力圓鋸", emoji: "🪚", image: "circular-saw-mini.png", cost: 15000000000, damage: 1800, shape: "square5", cells: 25, regrowth: 0.28, unlock: { type: "harvested", value: 200000 } }
  ]);
}(globalThis));
