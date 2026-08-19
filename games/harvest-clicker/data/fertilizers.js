(function (globalThis) {
  "use strict";

  globalThis.HarvestStaticData ||= {};
  globalThis.HarvestStaticData.FERTILIZERS = Object.freeze([
    { id: "quick", name: "速效堆肥", emoji: "🟤", cost: 300, growthMultiplier: 0.75, coinMultiplier: 1.25, rounds: 3, purpose: "前期快速縮短作物等待時間，適合短週期作物。", unlock: { type: "plantOwned", value: "tomato" } },
    { id: "leaf", name: "腐葉培養土", emoji: "🍂", cost: 1200, growthMultiplier: 0.7, coinMultiplier: 1.35, rounds: 4, purpose: "用低成本兼顧生長速度與收割收入。", unlock: { type: "harvested", value: 300 } },
    { id: "bounty", name: "豐收肥料", emoji: "🧺", cost: 6000, growthMultiplier: 0.6, coinMultiplier: 1.5, rounds: 5, purpose: "中期通用肥料，適合穩定反覆收割同一批作物。", unlock: { type: "plots", value: 6 } },
    { id: "kelp", name: "海藻營養液", emoji: "🌊", cost: 28000, growthMultiplier: 0.55, coinMultiplier: 1.65, rounds: 5, purpose: "偏重生長速度，適合等待時間較長的作物。", unlock: { type: "lifetimeGold", value: 30000 } },
    { id: "star", name: "星露精華", emoji: "💫", cost: 120000, growthMultiplier: 0.4, coinMultiplier: 2, rounds: 8, purpose: "自動化階段的長效加速，能同時提高離線收入。", unlock: { type: "automation", value: 0 } },
    { id: "bone", name: "骨粉精華", emoji: "🦴", cost: 300000, growthMultiplier: 0.48, coinMultiplier: 2.15, rounds: 6, purpose: "偏重單次收成價值，適合高收益作物。", unlock: { type: "harvested", value: 5000 } },
    { id: "crystal", name: "晶礦生長劑", emoji: "💎", cost: 900000, growthMultiplier: 0.36, coinMultiplier: 2.4, rounds: 8, purpose: "大幅縮短高階作物週期，適合灑水器覆蓋區。", unlock: { type: "plots", value: 18 } },
    { id: "mycelium", name: "菌絲活化土", emoji: "🍄", cost: 2800000, growthMultiplier: 0.32, coinMultiplier: 2.75, rounds: 9, purpose: "提供多輪穩定增產，適合長時間離線配置。", unlock: { type: "lifetimeGold", value: 10000000 } },
    { id: "royal", name: "皇家金穗肥", emoji: "👑", cost: 9000000, growthMultiplier: 0.28, coinMultiplier: 3.2, rounds: 10, purpose: "後期高倍率增產，用於昂貴種子可快速回收成本。", unlock: { type: "tool", value: "prosperity_blade" } },
    { id: "eternal", name: "永恆沃土精華", emoji: "🌟", cost: 30000000, growthMultiplier: 0.24, coinMultiplier: 4, rounds: 12, purpose: "終局長效肥料，最大化高階自動農場的每輪收益。", unlock: { type: "plots", value: 32 } }
  ]);
}(globalThis));
