(function (globalThis) {
  "use strict";

  globalThis.HarvestStaticData ||= {};
  globalThis.HarvestStaticData.HARVESTERS = Object.freeze([
    { id: "micro", name: "單點採收器", emoji: "🦾", image: "kenney-tractor.png", directionImages: { "down-left": "kenney-tractor-down-left.png", "down-right": "kenney-tractor-down-right.png", "up-left": "kenney-tractor-up-left.png", "up-right": "kenney-tractor-up-right.png" }, model: "tractor", cost: 25000, damage: 3, intervalSeconds: 45, regrowth: 1, range: 1, tier: 1 },
    { id: "clockwork", name: "發條割草機", emoji: "🦾", image: "kenney-tractor-shovel.png", directionImages: { "down-left": "kenney-tractor-shovel-down-left.png", "down-right": "kenney-tractor-shovel-down-right.png", "up-left": "kenney-tractor-shovel-up-left.png", "up-right": "kenney-tractor-shovel-up-right.png" }, model: "combine", cost: 120000, damage: 6, intervalSeconds: 30, regrowth: 1, range: 3, tier: 2 },
    { id: "copper", name: "銅輪收割機", emoji: "⚙️", image: "kenney-delivery.png", directionImages: { "down-left": "kenney-delivery-down-left.png", "down-right": "kenney-delivery-down-right.png", "up-left": "kenney-delivery-up-left.png", "up-right": "kenney-delivery-up-right.png" }, model: "hopper", cost: 450000, damage: 12, intervalSeconds: 20, regrowth: 0.95, range: 5, tier: 3 },
    { id: "steam", name: "蒸汽收割機", emoji: "🚜", image: "kenney-delivery-flat.png", directionImages: { "down-left": "kenney-delivery-flat-down-left.png", "down-right": "kenney-delivery-flat-down-right.png", "up-left": "kenney-delivery-flat-up-left.png", "up-right": "kenney-delivery-flat-up-right.png" }, model: "steam", cost: 1800000, damage: 30, intervalSeconds: 12, regrowth: 0.85, range: 7, tier: 4 },
    { id: "starcore", name: "星核聯合收割機", emoji: "🤖", image: "kenney-garbage-truck.png", directionImages: { "down-left": "kenney-garbage-truck-down-left.png", "down-right": "kenney-garbage-truck-down-right.png", "up-left": "kenney-garbage-truck-up-left.png", "up-right": "kenney-garbage-truck-up-right.png" }, model: "autonomous", cost: 8000000, damage: 90, intervalSeconds: 5, regrowth: 0.7, range: 9, tier: 5 },
    { id: "tree_sawmill", name: "自動鋸木站", emoji: "🪵", image: "kenney-truck-flat.png", directionImages: { "down-left": "kenney-truck-flat-down-left.png", "down-right": "kenney-truck-flat-down-right.png", "up-left": "kenney-truck-flat-up-left.png", "up-right": "kenney-truck-flat-up-right.png" }, model: "sawmill", cost: 25000000000, damage: 1400, intervalSeconds: 8, regrowth: 0.55, range: 5, tier: 6, targetType: "tree" },
    { id: "tree_lumber_mill", name: "林業採伐廠", emoji: "🏭", image: "kenney-truck.png", directionImages: { "down-left": "kenney-truck-down-left.png", "down-right": "kenney-truck-down-right.png", "up-left": "kenney-truck-up-left.png", "up-right": "kenney-truck-up-right.png" }, model: "lumber", cost: 180000000000, damage: 4000, intervalSeconds: 4, regrowth: 0.38, range: 9, tier: 7, targetType: "tree" }
  ]);
  globalThis.HarvestStaticData.SPRINKLERS = Object.freeze([
    { id: "drop", name: "單點滴灌器", emoji: "💧", image: "watering-can-metal.png", cost: 18000, growthMultiplier: 0.9, range: 1, tier: 1 },
    { id: "drip", name: "三列滴灌器", emoji: "💧", image: "sprinkler-head.png", cost: 75000, growthMultiplier: 0.8, range: 3, tier: 2 },
    { id: "fan", name: "廣角噴灌器", emoji: "🚿", image: "sprinkler-head.png", cost: 260000, growthMultiplier: 0.7, range: 5, tier: 3 },
    { id: "rotary", name: "旋轉灑水器", emoji: "🚿", image: "sprinkler-head.png", cost: 900000, growthMultiplier: 0.55, range: 7, tier: 4 },
    { id: "stardew", name: "星露灌溉器", emoji: "⛲", image: "sprinkler-head.png", cost: 5500000, growthMultiplier: 0.38, range: 9, tier: 5 }
  ]);
}(globalThis));
