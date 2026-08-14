import test from "node:test";
import assert from "node:assert/strict";
await import("./game-core.js");
const {
  createInitialState, manualHarvest, simulateTo, sowPlot, fertilizePlot,
  getToolTargetIndexes, indexesForPlot, buyPlot, validateState,
  INITIAL_PLOT_ID, INITIAL_PLOT_IDS, BOARD_SIZE, PLOTS,
  PLANTS, TOOLS, HARVESTERS, SPRINKLERS, FERTILIZERS, getProductPrice,
  normalizeStateData
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
  assert.deepEqual(TOOLS.map((item) => item.cost), [0, 45, 280, 1800, 12000, 85000, 650000, 6000000]);
  assert.deepEqual(PLANTS.map((item) => item.seedCost), [0, 18, 90, 420, 1900, 8500, 40000, 190000, 950000]);
  assert.deepEqual(HARVESTERS.map((item) => item.cost), [120000, 900000, 8000000]);
  assert.deepEqual(SPRINKLERS.map((item) => item.cost), [75000, 600000, 5500000]);
  assert.deepEqual(FERTILIZERS.map((item) => item.cost), [300, 6000, 120000]);
  assert.deepEqual(FERTILIZERS.map((item) => item.rounds), [3, 5, 8]);
  assert.deepEqual(PLOTS.map((item) => item.cost), [
    0, 0, 0, 0, 0, 1200, 5000, 20000, 80000, 300000,
    1200000, 5000000, 20000000, 80000000, 320000000, 1200000000,
    4800000000, 19000000000, 75000000000, 300000000000,
    1200000000000, 4800000000000, 19000000000000, 75000000000000,
    300000000000000
  ]);

  const pricedItems = [
    ...TOOLS.map((item) => [item.name, item.cost]),
    ...PLANTS.map((item) => [item.name, item.seedCost]),
    ...HARVESTERS.map((item) => [item.name, item.cost]),
    ...SPRINKLERS.map((item) => [item.name, item.cost]),
    ...FERTILIZERS.map((item) => [item.name, item.cost]),
    ...PLOTS.map((item) => [item.name, item.cost])
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

test("新遊戲從中央十字五塊成熟雜草與小刀開始", () => {
  const state = createInitialState(0);
  const initialIndexes = INITIAL_PLOT_IDS.flatMap(indexesForPlot);
  assert.equal(state.gold, 0);
  assert.equal(BOARD_SIZE, 15);
  assert.equal(PLOTS.length, 25);
  assert.equal(state.ownedPlots.length, 5);
  assert.equal(state.equippedToolId, "small_knife");
  assert.equal(initialIndexes.length, 45);
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
  assert.equal(getToolTargetIndexes("short_sickle", centerOfPlot, state.ownedPlots).length, 3);
  assert.equal(getToolTargetIndexes("rotary_cutter", centerOfPlot, state.ownedPlots).length, 9);
  assert.equal(getToolTargetIndexes("prosperity_blade", centerOfPlot, state.ownedPlots).length, 21);
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

test("土地只能依順序購買並扣除指定金額", () => {
  const state = createInitialState(0);
  state.gold = 20000;
  assert.equal(buyPlot(state, 18), false);
  assert.equal(buyPlot(state, 8), true);
  assert.equal(state.gold, 18800);
  assert.deepEqual(state.ownedPlots, [...INITIAL_PLOT_IDS, 8]);
  assert.ok(indexesForPlot(8).every((index) => state.cells[index].phase === "growing"));
});
