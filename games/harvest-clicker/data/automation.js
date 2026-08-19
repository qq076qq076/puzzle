(function (globalThis) {
  "use strict";

  globalThis.HarvestStaticData ||= {};
  globalThis.HarvestStaticData.HARVESTERS = Object.freeze([
    { id: "micro", name: "單點採收器", emoji: "🦾", image: "vehicle-tractor-farm.png", model: "tractor", cost: 25000, damage: 3, intervalSeconds: 45, regrowth: 1, range: 1, tier: 1 },
    { id: "clockwork", name: "發條割草機", emoji: "🦾", image: "combine-harvester.png", model: "combine", cost: 120000, damage: 6, intervalSeconds: 30, regrowth: 1, range: 3, tier: 2 },
    { id: "copper", name: "銅輪收割機", emoji: "⚙️", image: "vehicle-tractor.png", model: "hopper", cost: 450000, damage: 12, intervalSeconds: 20, regrowth: 0.95, range: 5, tier: 3 },
    { id: "steam", name: "蒸汽收割機", emoji: "🚜", image: "vehicle-delivery.png", model: "steam", cost: 1800000, damage: 30, intervalSeconds: 12, regrowth: 0.85, range: 7, tier: 4 },
    { id: "starcore", name: "星核聯合收割機", emoji: "🤖", image: "vehicle-tow.png", model: "autonomous", cost: 8000000, damage: 90, intervalSeconds: 5, regrowth: 0.7, range: 9, tier: 5 },
    { id: "tree_sawmill", name: "自動鋸木站", emoji: "🪵", image: "sawmill.webp", model: "sawmill", cost: 25000000000, damage: 1400, intervalSeconds: 8, regrowth: 0.55, range: 5, tier: 6, targetType: "tree" },
    { id: "tree_lumber_mill", name: "林業採伐廠", emoji: "🏭", image: "lumber-mill.webp", model: "lumber", cost: 180000000000, damage: 4000, intervalSeconds: 4, regrowth: 0.38, range: 9, tier: 7, targetType: "tree" }
  ]);
  globalThis.HarvestStaticData.SPRINKLERS = Object.freeze([
    { id: "drop", name: "單點滴灌器", emoji: "💧", image: "watering-can-metal.png", cost: 18000, growthMultiplier: 0.9, range: 1, tier: 1 },
    { id: "drip", name: "三列滴灌器", emoji: "💧", image: "sprinkler-head.png", cost: 75000, growthMultiplier: 0.8, range: 3, tier: 2 },
    { id: "fan", name: "廣角噴灌器", emoji: "🚿", image: "sprinkler-head.png", cost: 260000, growthMultiplier: 0.7, range: 5, tier: 3 },
    { id: "rotary", name: "旋轉灑水器", emoji: "🚿", image: "sprinkler-head.png", cost: 900000, growthMultiplier: 0.55, range: 7, tier: 4 },
    { id: "stardew", name: "星露灌溉器", emoji: "⛲", image: "sprinkler-head.png", cost: 5500000, growthMultiplier: 0.38, range: 9, tier: 5 }
  ]);
}(globalThis));
