import test from "node:test";
import assert from "node:assert/strict";
await import("./game-config.js");
await import("./data/plants.js");
await import("./data/tools.js");
await import("./data/automation.js");
await import("./data/fertilizers.js");
await import("./data/decorations.js");
await import("./game-core.js");
const {
  createInitialState, manualHarvest, simulateTo, sowPlot, sowPlantAt, fertilizePlot,
  getToolTargetIndexes, automationTargetIndexes, indexesForPlot, buyPlot, validateState,
  INITIAL_PLOT_ID, INITIAL_PLOT_IDS, BOARD_SIZE, PLOTS,
  PLANTS, TOOLS, HARVESTERS, SPRINKLERS, FERTILIZERS, DECORATIONS, getDecoration, getProductPrice,
  getLandPrice, getPlantFootprint, getPlantPlacementIndexes, normalizeStateData, isFertilizerUnlocked
} = globalThis.HarvestCore;

test("舊存檔的胡蘿蔔植株與種子會無損轉成樁架番茄", () => {
  const state = createInitialState(0);
  const index = indexesForPlot(INITIAL_PLOT_ID)[0];
  state.cells[index].plantId = "carrot";
  state.inventory = { seed_carrot: 2, seed_tomato: 1 };
  normalizeStateData(state);
  assert.equal(state.cells[index].plantId, "tomato");
  assert.equal(state.inventory.seed_tomato, 3);
  assert.equal("seed_carrot" in state.inventory, false);
  assert.ok(validateState(state));
});

test("舊存檔中未記錄輪數的肥料保留一次效果", () => {
  const state = createInitialState(0);
  const index = indexesForPlot(INITIAL_PLOT_ID)[0];
  state.cells[index].fertilizerId = "quick";
  delete state.cells[index].fertilizerRounds;
  normalizeStateData(state);
  assert.equal(state.cells[index].fertilizerRounds, 1);
  assert.ok(validateState(state));
});

test("所有商品售價與規格書一致且為有效金額", () => {
  assert.deepEqual(TOOLS.map((item) => item.cost), [
    0, 45, 160, 420, 1800, 6000, 22000, 85000, 300000, 1200000, 6000000, 30000000,
    120000000, 350000000, 1100000000, 4000000000, 15000000000
  ]);
  assert.deepEqual(PLANTS.map((item) => item.seedCost), [
    0, 18, 90, 220, 420, 900, 1900, 4200, 8500, 18000, 40000,
    85000, 190000, 420000, 950000, 2200000, 5000000, 11000000,
    25000000, 60000000, 150000000, 400000000, 1200000000, 3500000000,
    9000000000, 22000000000, 55000000000, 135000000000,
    320000000000, 760000000000, 1800000000000
  ]);
  assert.deepEqual(HARVESTERS.map((item) => item.cost), [25000, 120000, 450000, 1800000, 8000000, 25000000000, 180000000000]);
  assert.deepEqual(SPRINKLERS.map((item) => item.cost), [18000, 75000, 260000, 900000, 5500000]);
  assert.deepEqual(FERTILIZERS.map((item) => item.cost), [300, 1200, 6000, 28000, 120000, 300000, 900000, 2800000, 9000000, 30000000]);
  assert.deepEqual(FERTILIZERS.map((item) => item.rounds), [3, 4, 5, 5, 8, 6, 8, 9, 10, 12]);
  assert.equal(FERTILIZERS.length, 10);
  assert.ok(FERTILIZERS.every((item) => item.purpose && item.unlock));
  assert.equal(PLOTS.length, 81);
  const landPrices = Array.from({ length: PLOTS.length - INITIAL_PLOT_IDS.length }, (_, index) => getLandPrice(INITIAL_PLOT_IDS.length + index));
  assert.equal(landPrices[0], 1200);
  assert.equal(landPrices.at(-1), 340000000000000);
  assert.ok(landPrices.slice(1).every((price, index) => price >= landPrices[index]));
  assert.equal(getLandPrice(PLOTS.length), null);

  const pricedItems = [
    ...TOOLS.map((item) => [item.name, item.cost]),
    ...PLANTS.map((item) => [item.name, item.seedCost]),
    ...HARVESTERS.map((item) => [item.name, item.cost]),
    ...SPRINKLERS.map((item) => [item.name, item.cost]),
    ...FERTILIZERS.map((item) => [item.name, item.cost]),
    ...landPrices.map((price, index) => [`第 ${INITIAL_PLOT_IDS.length + index + 1} 塊土地`, price])
  ];
  for (const [name, price] of pricedItems) {
    assert.ok(Number.isSafeInteger(price) && price >= 0, `${name} 的售價必須是非負安全整數`);
  }
  for (const plant of PLANTS) assert.equal(getProductPrice("seed", plant), plant.seedCost, `${plant.name} 購買流程使用種子包價格`);
  for (const [kind, items] of [
    ["tool", TOOLS], ["harvester", HARVESTERS], ["sprinkler", SPRINKLERS], ["fertilizer", FERTILIZERS]
  ]) {
    for (const item of items) assert.equal(getProductPrice(kind, item), item.cost, `${item.name} 購買流程使用商品價格`);
  }
});

test("裝飾靜態設定由核心載入且使用田埂槽位", () => {
  assert.equal(DECORATIONS.length, 10);
  assert.equal(getDecoration("stone_ridge").slotType, "edge");
  assert.equal(getDecoration("farm_sign").slotType, "corner");
  assert.ok(DECORATIONS.every((item) => item.effect === null && item.cost >= 0));
});

test("舊存檔會建立獨立的裝飾陣列", () => {
  const state = createInitialState(0);
  delete state.decorations;
  normalizeStateData(state);
  assert.deepEqual(state.decorations, []);
  state.decorations.push({ id: "stone_ridge", slotType: "edge", row: 13, col: 13, direction: "horizontal" });
  assert.ok(validateState(state));
});

test("所有作物收割時都發放各自設定的單格金幣", () => {
  const index = indexesForPlot(INITIAL_PLOT_ID)[4];
  for (const plant of PLANTS) {
    const state = createInitialState(0);
    state.cells[index] = {
      plantId: plant.id,
      phase: "mature",
      growthProgress: 1,
      currentHp: 1,
      nextGrowthMultiplier: 1,
      fertilizerId: null,
      fertilizerRounds: 0
    };
    const result = manualHarvest(state, index);
    assert.equal(result.totalCoins, plant.coins, `${plant.name} 的本次收割金幣`);
    assert.equal(state.gold, plant.coins, `${plant.name} 的玩家金幣入帳`);
    assert.equal(state.lifetimeGold, plant.coins, `${plant.name} 的終身金幣入帳`);
  }
});

test("新增的十種作物全為樹木且具備獨立素材與有效數值", () => {
  const trees = PLANTS.filter((plant) => plant.type === "tree");
  assert.equal(trees.length, 10);
  assert.equal(new Set(trees.map((tree) => tree.image)).size, 10);
  assert.ok(trees.every((tree) => tree.image && tree.hp > 0 && tree.coins > 0 && tree.growSeconds > 0));
  assert.ok(trees.every((tree) => Number.isSafeInteger(tree.seedCost) && Number.isSafeInteger(tree.coins)));
  assert.equal(getPlantFootprint("weed"), 1);
  assert.equal(getPlantFootprint("clover"), 3);
  assert.deepEqual(trees.map((tree) => getPlantFootprint(tree)), [1, 3, 5, 7, 9, 11, 13, 15, 17, 19]);
  assert.ok(trees.every((tree) => tree.seedCost > 0 && tree.coins > tree.seedCost / 8));
});

test("樹木種子一次只種一棵，且依正方形占地完整驗證土地", () => {
  const state = createInitialState(0);
  const centerIndex = indexesForPlot(INITIAL_PLOT_ID)[4];
  const tree = PLANTS.find((plant) => plant.id === "orange_tree");
  const footprintIndexes = getPlantPlacementIndexes(centerIndex, tree.id);
  assert.equal(footprintIndexes.length, 9);
  assert.equal(sowPlantAt(state, centerIndex, tree.id), true);
  assert.ok(footprintIndexes.every((index) => state.cells[index].plantId === tree.id));
  assert.equal(state.cells.filter((cell) => cell.plantId === tree.id).length, 9);
  assert.equal(state.cells[footprintIndexes[0]].plantRootIndex, footprintIndexes[0]);
  assert.equal(state.cells[footprintIndexes[0]].plantAnchorIndex, centerIndex);

  const edgeState = createInitialState(0);
  assert.equal(sowPlantAt(edgeState, indexesForPlot(INITIAL_PLOT_ID)[0], "coconut_tree"), false);
  assert.equal(getPlantPlacementIndexes(0, "orange_tree").length, 4);
});

test("大樹占用多格但收割只結算一次樹木收益", () => {
  const state = createInitialState(0);
  const centerIndex = indexesForPlot(INITIAL_PLOT_ID)[4];
  assert.equal(sowPlantAt(state, centerIndex, "orange_tree"), true);
  const tree = PLANTS.find((plant) => plant.id === "orange_tree");
  const footprintIndexes = getPlantPlacementIndexes(centerIndex, tree.id);
  const rootIndex = footprintIndexes[0];
  state.cells[rootIndex].phase = "mature";
  state.cells[rootIndex].growthProgress = 1;
  state.cells[rootIndex].currentHp = 1;
  state.equippedToolId = "steel_harvester";
  const result = manualHarvest(state, centerIndex);
  assert.equal(result.totalCoins, tree.coins);
  assert.equal(result.results.length, 1);
  assert.equal(state.harvestedCells, 1);
  assert.ok(footprintIndexes.every((index) => state.cells[index].phase === "growing"));
  assert.equal(manualHarvest(state, centerIndex).totalCoins, 0);
});

test("肥料可以從樹木所在的 3×3 地塊套用到整棵樹", () => {
  const state = createInitialState(0);
  const centerIndex = indexesForPlot(INITIAL_PLOT_ID)[4];
  assert.equal(sowPlantAt(state, centerIndex, "orange_tree"), true);
  assert.equal(fertilizePlot(state, INITIAL_PLOT_ID, "quick"), true);
  const treeIndexes = getPlantPlacementIndexes(centerIndex, "orange_tree");
  assert.ok(treeIndexes.every((index) => state.cells[index].fertilizerId === "quick"));
  assert.ok(treeIndexes.every((index) => state.cells[index].fertilizerRounds === 3));
});

test("舊版以 3×3 種下的樹木會遷移成單棵樹", () => {
  const state = createInitialState(0);
  const indexes = indexesForPlot(INITIAL_PLOT_ID);
  for (const index of indexes) {
    state.cells[index] = {
      plantId: "orange_tree", phase: "mature", growthProgress: 1, currentHp: 1,
      nextGrowthMultiplier: 1, fertilizerId: null, fertilizerRounds: 0
    };
  }
  normalizeStateData(state);
  assert.equal(new Set(indexes.map((index) => state.cells[index].plantRootIndex)).size, 1);
  assert.equal(new Set(indexes.map((index) => state.cells[index].plantAnchorIndex)).size, 1);
  const result = manualHarvest(state, indexes[4]);
  assert.equal(result.totalCoins, PLANTS.find((plant) => plant.id === "orange_tree").coins);
  assert.equal(state.harvestedCells, 1);
});

test("新遊戲從中央 9×9 成熟雜草與小刀開始", () => {
  const state = createInitialState(0);
  const initialIndexes = INITIAL_PLOT_IDS.flatMap(indexesForPlot);
  assert.equal(state.gold, 0);
  assert.equal(BOARD_SIZE, 27);
  assert.equal(PLOTS.length, 81);
  assert.equal(state.ownedPlots.length, 9);
  assert.equal(state.equippedToolId, "small_knife");
  assert.deepEqual(state.decorations, []);
  assert.equal(initialIndexes.length, 81);
  assert.ok(initialIndexes.every((index) => state.cells[index].phase === "mature"));
  assert.ok(validateState(state));
});

test("小刀一次只收割一格並發放一次金幣", () => {
  const state = createInitialState(0);
  const index = indexesForPlot(INITIAL_PLOT_ID)[0];
  const first = manualHarvest(state, index);
  const second = manualHarvest(state, index);
  assert.equal(first.totalCoins, 1);
  assert.equal(second.totalCoins, 0);
  assert.equal(state.gold, 1);
  assert.equal(state.harvestedCells, 1);
  assert.equal(state.cells[index].phase, "growing");
});

test("範圍工具會依棋盤邊界與已購土地裁切", () => {
  const state = createInitialState(0);
  const centerOfPlot = indexesForPlot(INITIAL_PLOT_ID)[4];
  assert.equal(getToolTargetIndexes("short_sickle", centerOfPlot, state.ownedPlots).length, 5);
  assert.equal(getToolTargetIndexes("rotary_cutter", centerOfPlot, state.ownedPlots).length, 13);
  assert.equal(getToolTargetIndexes("prosperity_blade", centerOfPlot, state.ownedPlots).length, 25);
  assert.equal(getToolTargetIndexes("grand_harvester", centerOfPlot, state.ownedPlots).length, 49);
});

test("一般與林業自動設備依階級覆蓋指定範圍", () => {
  const state = createInitialState(0);
  assert.deepEqual(HARVESTERS.map((item) => item.range), [1, 3, 5, 7, 9, 5, 9]);
  assert.deepEqual(SPRINKLERS.map((item) => item.range), [1, 3, 5, 7, 9]);
  assert.deepEqual(HARVESTERS.map((item) => automationTargetIndexes(item.range, INITIAL_PLOT_ID, state.ownedPlots).length), [1, 9, 25, 49, 81, 25, 81]);
  const edgeCell = indexesForPlot(INITIAL_PLOT_ID)[0];
  assert.deepEqual(automationTargetIndexes(1, INITIAL_PLOT_ID, state.ownedPlots, edgeCell), [edgeCell]);
  assert.deepEqual(HARVESTERS.filter((item) => item.targetType === "tree").map((item) => item.id), ["tree_sawmill", "tree_lumber_mill"]);

  state.harvesters.push({ id: "micro", plotId: INITIAL_PLOT_ID, centerIndex: edgeCell, nextRunAt: 45000 });
  simulateTo(state, 45000);
  assert.equal(state.cells[edgeCell].phase, "growing");
  assert.equal(state.cells[indexesForPlot(INITIAL_PLOT_ID)[4]].phase, "mature");
});

test("林業自動設備只採伐樹木，不會攻擊一般作物", () => {
  const state = createInitialState(0);
  const [treeIndex, cropIndex] = indexesForPlot(INITIAL_PLOT_ID);
  state.cells[treeIndex] = { plantId: "apple_tree", phase: "mature", growthProgress: 1, currentHp: 2400, nextGrowthMultiplier: 1, fertilizerId: null, fertilizerRounds: 0 };
  state.cells[cropIndex] = { plantId: "tomato", phase: "mature", growthProgress: 1, currentHp: 4, nextGrowthMultiplier: 1, fertilizerId: null, fertilizerRounds: 0 };
  state.harvesters.push({ id: "tree_sawmill", plotId: INITIAL_PLOT_ID, nextRunAt: 8000 });

  const summary = simulateTo(state, 16000);
  assert.equal(summary.harvested, 1);
  assert.equal(summary.gold, 60000000);
  assert.equal(state.cells[treeIndex].phase, "growing");
  assert.equal(state.cells[cropIndex].phase, "mature");
  assert.equal(state.cells[cropIndex].currentHp, 4);
});

test("十種肥料依各自條件解鎖", () => {
  const state = createInitialState(0);
  assert.equal(isFertilizerUnlocked(FERTILIZERS.find((item) => item.id === "quick"), state), false);
  assert.equal(isFertilizerUnlocked(FERTILIZERS.find((item) => item.id === "bounty"), state), true);
  state.inventory.seed_tomato = 1;
  state.harvestedCells = 5000;
  state.lifetimeGold = 10000000;
  state.ownedPlots = PLOTS.slice(0, 49).map((plot) => plot.id);
  state.ownedToolIds.push("prosperity_blade");
  assert.ok(FERTILIZERS.every((item) => isFertilizerUnlocked(item, state)));
});

test("單點滴灌器只加速中心一格", () => {
  const state = createInitialState(0);
  for (const plotId of INITIAL_PLOT_IDS) sowPlot(state, plotId, "clover");
  state.sprinklers.push({ id: "drop", plotId: INITIAL_PLOT_ID });
  simulateTo(state, 54000);
  const indexes = indexesForPlot(INITIAL_PLOT_ID);
  assert.equal(state.cells[indexes[4]].phase, "mature");
  assert.equal(state.cells[indexes[0]].phase, "growing");
  assert.equal(state.cells[indexes[0]].growthProgress, 0.9);
});

test("沒有自動收割機時離線只推進生長、不產生金幣", () => {
  const state = createInitialState(0);
  sowPlot(state, INITIAL_PLOT_ID, "clover");
  const summary = simulateTo(state, 60000);
  assert.equal(summary.gold, 0);
  assert.equal(state.gold, 0);
  assert.ok(indexesForPlot(INITIAL_PLOT_ID).every((index) => state.cells[index].phase === "mature"));
});

test("白花苜蓿以小刀收割會正確增加 4$", () => {
  const state = createInitialState(0);
  sowPlot(state, INITIAL_PLOT_ID, "clover");
  simulateTo(state, 60000);
  const index = indexesForPlot(INITIAL_PLOT_ID)[4];
  const firstHit = manualHarvest(state, index);
  const harvestHit = manualHarvest(state, index);
  assert.equal(firstHit.totalCoins, 0);
  assert.equal(harvestHit.totalCoins, 4);
  assert.equal(state.gold, 4);
});

test("自動收割機可跨越多輪生長並精確結算", () => {
  const state = createInitialState(0);
  sowPlot(state, INITIAL_PLOT_ID, "clover");
  state.harvesters.push({ id: "clockwork", plotId: INITIAL_PLOT_ID, nextRunAt: 30000 });
  const summary = simulateTo(state, 180000);
  assert.equal(summary.harvested, 27);
  assert.equal(summary.gold, 108);
  assert.equal(state.gold, 108);
  assert.equal(state.harvestedCells, 27);
});

test("肥料立即加速當下作物並持續指定收割輪數", () => {
  const state = createInitialState(0);
  sowPlot(state, INITIAL_PLOT_ID, "clover");
  simulateTo(state, 30000);
  assert.equal(state.cells[indexesForPlot(INITIAL_PLOT_ID)[0]].growthProgress, 0.5);
  fertilizePlot(state, INITIAL_PLOT_ID, "quick");
  simulateTo(state, 52500);
  assert.ok(indexesForPlot(INITIAL_PLOT_ID).every((index) => state.cells[index].phase === "mature"));
  state.harvesters.push({ id: "clockwork", plotId: INITIAL_PLOT_ID, nextRunAt: 60000 });
  const summary = simulateTo(state, 240000);
  assert.equal(summary.harvested, 36);
  assert.equal(summary.gold, 171);
  assert.ok(indexesForPlot(INITIAL_PLOT_ID).every((index) => state.cells[index].fertilizerId === null));
  assert.ok(indexesForPlot(INITIAL_PLOT_ID).every((index) => state.cells[index].fertilizerRounds === 0));
});

test("土地可任選位置，價格只依已擁有數量增加", () => {
  const state = createInitialState(0);
  const firstPrice = getLandPrice(state.ownedPlots.length);
  const secondPrice = getLandPrice(state.ownedPlots.length + 1);
  const farPlot = PLOTS.at(-1);
  const otherPlot = PLOTS.find((plot) => !INITIAL_PLOT_IDS.includes(plot.id) && plot.id !== farPlot.id);
  state.gold = firstPrice + secondPrice;

  assert.equal(buyPlot(state, farPlot.id), true);
  assert.equal(state.gold, secondPrice);
  assert.equal(getLandPrice(state.ownedPlots.length), secondPrice);
  assert.equal(buyPlot(state, farPlot.id), false);
  assert.equal(buyPlot(state, otherPlot.id), true);
  assert.equal(state.gold, 0);
  assert.deepEqual(state.ownedPlots, [...INITIAL_PLOT_IDS, farPlot.id, otherPlot.id]);
  assert.ok(indexesForPlot(farPlot.id).every((index) => state.cells[index].phase === "growing"));
});

test("v3 的 15×15 存檔會遷移為 v4 的 27×27 農場", () => {
  const state = createInitialState(1234);
  state.schemaVersion = 3;
  state.ownedPlots = [12, 7, 13, 17, 11];
  state.cells = Array.from({ length: 225 }, (_, index) => {
    const row = Math.floor(index / 15);
    const col = index % 15;
    const owned = state.ownedPlots.includes(Math.floor(row / 3) * 5 + Math.floor(col / 3));
    return { plantId: "weed", phase: owned ? "mature" : "growing", growthProgress: owned ? 1 : 0, currentHp: owned ? 1 : 0, nextGrowthMultiplier: 1, fertilizerId: null, fertilizerRounds: 0 };
  });
  state.cells[6 * 15 + 6].plantId = "clover";
  normalizeStateData(state);
  assert.equal(state.schemaVersion, 4);
  assert.equal(state.cells.length, 729);
  assert.equal(state.ownedPlots.length, 9);
  assert.equal(state.cells[indexesForPlot(INITIAL_PLOT_ID)[0]].plantId, "clover");
  assert.ok(validateState(state));
});
