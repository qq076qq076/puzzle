import test from "node:test";
import assert from "node:assert/strict";

import { CELL } from "../config.mjs";
import { LEVELS, TUTORIALS, getLevel } from "../levels.mjs";
import {
  applyCommand,
  applyGravity,
  boardIndex,
  calculateClearScore,
  collectAdjacentGarbage,
  createEmptyBoard,
  createGame,
  findClearGroups,
  getHardDropDistance,
  getPairCells,
  parseBoard,
  resolveBoard,
  serializeBoard,
  tryRotate
} from "../core.mjs";

function place(board, x, y, value) {
  board[boardIndex(x, y)] = value;
}

test("初始盤面可以在字串與 Uint8Array 間轉換", () => {
  const rows = [
    "......", "......", "......", "......", "......", "......", "......",
    "......", "......", "......", "......", "RYGB#.", "##...."
  ];
  assert.deepEqual(serializeBoard(parseBoard(rows)), rows);
});

test("四方向相連會消除，只有斜向相鄰不會消除", () => {
  const board = createEmptyBoard();
  place(board, 0, 11, CELL.red);
  place(board, 1, 11, CELL.red);
  place(board, 1, 10, CELL.red);
  place(board, 2, 10, CELL.red);
  place(board, 4, 9, CELL.blue);
  place(board, 5, 10, CELL.blue);
  place(board, 4, 11, CELL.blue);
  place(board, 3, 10, CELL.blue);
  const groups = findClearGroups(board);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].color, CELL.red);
  assert.equal(groups[0].indexes.length, 4);
});

test("只移除彩色群組四方向相鄰的封印石", () => {
  const board = createEmptyBoard();
  const colors = [];
  for (let x = 1; x <= 4; x += 1) {
    place(board, x, 10, CELL.green);
    colors.push(boardIndex(x, 10));
  }
  place(board, 0, 10, CELL.garbage);
  place(board, 5, 11, CELL.garbage);
  assert.deepEqual(collectAdjacentGarbage(board, colors), [boardIndex(0, 10)]);
});

test("重力保持同欄氣泡的上下順序", () => {
  const board = createEmptyBoard();
  place(board, 2, 3, CELL.red);
  place(board, 2, 7, CELL.blue);
  place(board, 2, 10, CELL.green);
  const transitions = applyGravity(board);
  assert.equal(board[boardIndex(2, 9)], CELL.red);
  assert.equal(board[boardIndex(2, 10)], CELL.blue);
  assert.equal(board[boardIndex(2, 11)], CELL.green);
  assert.equal(transitions.length, 3);
});

test("盤面解析能產生正確的二連鎖與分數", () => {
  const board = createEmptyBoard();
  place(board, 0, 11, CELL.green);
  place(board, 1, 11, CELL.green);
  place(board, 2, 11, CELL.green);
  place(board, 3, 11, CELL.red);
  place(board, 4, 11, CELL.red);
  place(board, 5, 11, CELL.red);
  place(board, 3, 10, CELL.red);
  place(board, 3, 9, CELL.green);
  const result = resolveBoard(board);
  assert.equal(result.finalChain, 2);
  assert.equal(result.steps.length, 2);
  assert.equal(result.totalScore, 360);
  assert.equal(result.totalColoredCleared, 8);
  assert.ok(result.board.every((value) => value === CELL.empty));
});

test("計分倍率涵蓋群組、顏色與連鎖加成", () => {
  assert.equal(calculateClearScore({ chain: 1, groupSizes: [4], colorCount: 1 }), 40);
  assert.equal(calculateClearScore({ chain: 2, groupSizes: [4], colorCount: 1 }), 320);
  assert.equal(calculateClearScore({ chain: 1, groupSizes: [5, 4], colorCount: 2 }), 450);
});

test("相同 seed 產生相同的目前與下一組氣泡", () => {
  const first = createGame({ seed: 42 }).state;
  const second = createGame({ seed: 42 }).state;
  assert.deepEqual(getPairCells(first.activePair), getPairCells(second.activePair));
  assert.deepEqual(first.nextPairs, second.nextPairs);
});

test("旋轉靠牆時會踢回合法位置", () => {
  const state = createGame({ seed: 7 }).state;
  state.activePair.pivotX = 0;
  state.activePair.rotation = 0;
  assert.equal(tryRotate(state, -1).changed, true);
  assert.equal(state.activePair.rotation, 3);
  assert.equal(state.activePair.pivotX, 1);
  assert.ok(getPairCells(state.activePair).every((cell) => cell.x >= 0));
});

test("幽靈落點與硬降使用相同距離並落到盤底", () => {
  const state = createGame({ seed: 99 }).state;
  const distance = getHardDropDistance(state);
  assert.equal(distance, 11);
  const result = applyCommand(state, "HARD_DROP");
  assert.equal(result.changed, true);
  assert.equal(state.score, 22);
  assert.equal(state.placedPairCount, 1);
  assert.equal(state.board[boardIndex(2, 11)] !== CELL.empty, true);
  assert.equal(state.board[boardIndex(2, 10)] !== CELL.empty, true);
});

test("關卡目標達成後進入過關狀態", () => {
  const level = { ...getLevel("stage-01"), objective: { type: "score", amount: 1 } };
  const state = createGame({ mode: "stage", level, seed: 123 }).state;
  state.score = 1;
  state.objectiveProgress = 1;
  state.activePair.pivotX = 0;
  const result = applyCommand(state, "HARD_DROP");
  assert.equal(result.changed, true);
  assert.equal(state.phase, "stageClear");
  assert.ok(state.stars >= 1);
});

test("十二個正式關卡與四個教學盤面都可建立", () => {
  assert.equal(LEVELS.length, 12);
  assert.equal(TUTORIALS.length, 4);
  for (const level of [...LEVELS, ...TUTORIALS]) {
    const mode = level.id.startsWith("tutorial") ? "tutorial" : "stage";
    const state = createGame({ mode, level, seed: 1 }).state;
    assert.equal(state.board.length, 78, level.id);
    assert.notEqual(state.phase, "gameOver", level.id);
  }
});
