(function (globalThis) {
  "use strict";

  globalThis.HarvestStaticData ||= {};
  globalThis.HarvestStaticData.PLANTS = Object.freeze([
    { id: "weed", name: "雜草", emoji: "🌿", image: null, seedCost: 0, hp: 1, coins: 1, growSeconds: 30, color: "#81985b", unlock: { type: "initial", value: 0 } },
    { id: "clover", name: "白花苜蓿", emoji: "☘️", image: "lettuce-head.png", seedCost: 18, hp: 2, coins: 4, growSeconds: 60, color: "#77a65c", unlock: { type: "lifetimeGold", value: 15 } },
    { id: "tomato", name: "樁架番茄", emoji: "🍅", image: "tomato-plant-staked.png", seedCost: 90, hp: 4, coins: 15, growSeconds: 180, color: "#d65243", unlock: { type: "harvested", value: 40 } },
    { id: "cabbage", name: "翠玉甘藍", emoji: "🥬", image: "cabbage-head-row.png", seedCost: 220, hp: 6, coins: 34, growSeconds: 300, color: "#70a95e", unlock: { type: "lifetimeGold", value: 180 } },
    { id: "wheat", name: "金穗小麥", emoji: "🌾", image: "wheat-stalk.png", seedCost: 420, hp: 8, coins: 65, growSeconds: 480, color: "#e0b94f", unlock: { type: "tool", value: "garden_shears" } },
    { id: "corn", name: "蜜香玉米", emoji: "🌽", image: "corn-stalk-row.png", seedCost: 900, hp: 11, coins: 135, growSeconds: 720, color: "#d8bd45", unlock: { type: "harvested", value: 200 } },
    { id: "berry", name: "紅莓叢", emoji: "🍓", image: "strawberry-plant.png", seedCost: 1900, hp: 15, coins: 290, growSeconds: 1200, color: "#cf4c56", unlock: { type: "plots", value: 10 } },
    { id: "zucchini", name: "碧綠櫛瓜", emoji: "🥒", image: "zucchini-plant.png", seedCost: 4200, hp: 22, coins: 620, growSeconds: 1800, color: "#5e9b57", unlock: { type: "lifetimeGold", value: 5000 } },
    { id: "pumpkin", name: "月光南瓜", emoji: "🎃", image: "pumpkin-patch.png", seedCost: 8500, hp: 30, coins: 1250, growSeconds: 2700, color: "#d6a34c", unlock: { type: "tool", value: "short_sickle" } },
    { id: "eggplant", name: "夜紫茄", emoji: "🍆", image: "eggplant-plant.png", seedCost: 18000, hp: 42, coins: 2700, growSeconds: 4500, color: "#795da5", unlock: { type: "harvested", value: 800 } },
    { id: "lavender", name: "紫晶薰衣草", emoji: "🪻", image: "lavender-bush.png", seedCost: 40000, hp: 60, coins: 6000, growSeconds: 7200, color: "#9475bd", unlock: { type: "plots", value: 16 } },
    { id: "blueberry", name: "藍莓灌木", emoji: "🫐", image: "blueberry-bush.png", seedCost: 85000, hp: 80, coins: 12750, growSeconds: 10800, color: "#536a9e", unlock: { type: "lifetimeGold", value: 100000 } },
    { id: "pepper", name: "赤焰火椒", emoji: "🌶️", image: "pepper-plant.png", seedCost: 190000, hp: 110, coins: 29000, growSeconds: 21600, color: "#d85043", unlock: { type: "tool", value: "rotary_cutter" } },
    { id: "rose", name: "晨露玫瑰", emoji: "🌹", image: "rose-bush.png", seedCost: 420000, hp: 155, coins: 63000, growSeconds: 36000, color: "#c65367", unlock: { type: "harvested", value: 5000 } },
    { id: "starfruit", name: "星輝果", emoji: "🌻", image: "sunflower-row.png", seedCost: 950000, hp: 220, coins: 145000, growSeconds: 64800, color: "#e7c74b", unlock: { type: "plots", value: 25 } },
    { id: "cotton", name: "雲絮棉花", emoji: "☁️", image: "cotton-plant.png", seedCost: 2200000, hp: 320, coins: 335000, growSeconds: 108000, color: "#e8e4d6", unlock: { type: "lifetimeGold", value: 2000000 } },
    { id: "sugarcane", name: "翡翠甘蔗", emoji: "🎋", image: "sugar-cane.png", seedCost: 5000000, hp: 460, coins: 760000, growSeconds: 172800, color: "#6ba663", unlock: { type: "tool", value: "steel_harvester" } },
    { id: "rice", name: "月白稻束", emoji: "🍚", image: "rice-paddy-bundle.png", seedCost: 11000000, hp: 650, coins: 1700000, growSeconds: 259200, color: "#d6c983", unlock: { type: "harvested", value: 25000 } },
    { id: "grape", name: "暮色葡萄", emoji: "🍇", image: "grape-vine.png", seedCost: 25000000, hp: 900, coins: 3800000, growSeconds: 432000, color: "#735893", unlock: { type: "plots", value: 36 } },
    { id: "vanilla", name: "銀香香草", emoji: "🌼", image: "vanilla-vine.png", seedCost: 60000000, hp: 1300, coins: 9000000, growSeconds: 691200, color: "#e7dfb0", unlock: { type: "lifetimeGold", value: 75000000 } },
    { id: "coffee", name: "曜石咖啡", emoji: "☕", image: "coffee-bean-plant.png", seedCost: 150000000, hp: 1800, coins: 23000000, growSeconds: 1036800, color: "#7f4b34", unlock: { type: "plots", value: 49 } },
    { id: "apple_tree", name: "晨紅蘋果樹", emoji: "🍎", image: "apple-tree.png", type: "tree", footprint: 1, seedCost: 400000000, hp: 2400, coins: 60000000, growSeconds: 1296000, color: "#76a947", unlock: { type: "lifetimeGold", value: 150000000 } },
    { id: "orange_tree", name: "蜜香橙樹", emoji: "🍊", image: "orange-tree.png", type: "tree", footprint: 3, seedCost: 1200000000, hp: 3600, coins: 190000000, growSeconds: 1468800, color: "#dc8d36", unlock: { type: "tool", value: "forester_axe" } },
    { id: "cherry_tree", name: "緋櫻果樹", emoji: "🍒", image: "cherry-tree.png", type: "tree", footprint: 5, seedCost: 3500000000, hp: 5200, coins: 560000000, growSeconds: 1728000, color: "#ce4f5e", unlock: { type: "harvested", value: 90000 } },
    { id: "peach_tree", name: "霞蜜桃樹", emoji: "🍑", image: "peach-tree.png", type: "tree", footprint: 7, seedCost: 9000000000, hp: 7600, coins: 1400000000, growSeconds: 2073600, color: "#e9a477", unlock: { type: "tool", value: "steel_hatchet" } },
    { id: "lemon_tree", name: "金露檸檬樹", emoji: "🍋", image: "lemon-tree.png", type: "tree", footprint: 9, seedCost: 22000000000, hp: 10500, coins: 3600000000, growSeconds: 2419200, color: "#e0ca4e", unlock: { type: "plots", value: 64 } },
    { id: "banana_tree", name: "月彎香蕉樹", emoji: "🍌", image: "banana-tree.png", type: "tree", footprint: 11, seedCost: 55000000000, hp: 14500, coins: 9000000000, growSeconds: 2851200, color: "#dfc448", unlock: { type: "lifetimeGold", value: 30000000000 } },
    { id: "coconut_tree", name: "海風椰子樹", emoji: "🥥", image: "coconut-palm.png", type: "tree", footprint: 13, seedCost: 135000000000, hp: 19000, coins: 22000000000, growSeconds: 3369600, color: "#5d9e58", unlock: { type: "tool", value: "crosscut_saw" } },
    { id: "ginkgo_tree", name: "黃金銀杏樹", emoji: "🍂", image: "ginkgo-tree-yellow.png", type: "tree", footprint: 15, seedCost: 320000000000, hp: 24500, coins: 52000000000, growSeconds: 3974400, color: "#e5b735", unlock: { type: "harvested", value: 150000 } },
    { id: "maple_tree", name: "赤霞楓樹", emoji: "🍁", image: "maple-tree-red-autumn.png", type: "tree", footprint: 17, seedCost: 760000000000, hp: 31000, coins: 125000000000, growSeconds: 4665600, color: "#c95036", unlock: { type: "tool", value: "double_bit_axe" } },
    { id: "cypress_tree", name: "千年檜木", emoji: "🌲", image: "cypress-tree.png", type: "tree", footprint: 19, seedCost: 1800000000000, hp: 39000, coins: 300000000000, growSeconds: 5529600, color: "#3f7351", unlock: { type: "tool", value: "power_saw" } }
  ]);
}(globalThis));
