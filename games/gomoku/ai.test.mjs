import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

const rulesSource = fs.readFileSync(new URL("./rules.js", import.meta.url), "utf8");
const aiSource = fs.readFileSync(new URL("./ai.js", import.meta.url), "utf8");

function createAI() {
  const context = {
    window: {},
    performance: { now: () => Date.now() }
  };
  vm.createContext(context);
  vm.runInContext(rulesSource, context);
  vm.runInContext(aiSource, context);
  return context.window;
}

function emptyBoard() {
  return Array.from({ length: 15 }, () => Array(15).fill(0));
}

function choose(window, board, player, difficulty = "hard") {
  return window.GomokuAI.chooseMove(board, player, difficulty, {
    maxThinkMs: 300,
    isLegalMove: window.GomokuRules.isLegalMove
  });
}

function crossForkBoard(player) {
  const board = emptyBoard();
  [[7, 5], [7, 6], [7, 8], [5, 7], [6, 7], [8, 7]].forEach(([row, column]) => {
    board[row][column] = player;
  });
  return board;
}

function assertMove(move, row, column) {
  assert.ok(move);
  assert.equal(move.row, row);
  assert.equal(move.column, column);
}

test("困難難度會落在自己的立即勝著", () => {
  const window = createAI();
  const board = emptyBoard();
  [3, 4, 5, 6].forEach((column) => { board[7][column] = 1; });

  assertMove(choose(window, board, 1), 7, 7);
});

test("困難難度會封鎖對手的立即勝著", () => {
  const window = createAI();
  const board = emptyBoard();
  [3, 4, 5, 6].forEach((column) => { board[5][column] = 2; });

  assertMove(choose(window, board, 1), 5, 7);
});

test("困難難度會找出自己的雙重威脅", () => {
  const window = createAI();
  const board = crossForkBoard(2);

  assertMove(choose(window, board, 2), 7, 7);
});

test("困難難度會在對手形成叉攻前封鎖", () => {
  const window = createAI();
  const board = crossForkBoard(2);

  assertMove(choose(window, board, 1), 7, 7);
});

test("搜尋不會修改原始棋盤，且三種難度都回傳合法著法", () => {
  const window = createAI();
  const board = emptyBoard();
  board[7][7] = 1;
  const snapshot = board.map((row) => row.slice());

  for (const difficulty of ["easy", "medium", "hard"]) {
    const move = window.GomokuAI.chooseMove(board, 2, difficulty, {
      maxThinkMs: 40,
      isLegalMove: window.GomokuRules.isLegalMove
    });
    assert.ok(move);
    assert.equal(window.GomokuRules.isLegalMove(board, move.row, move.column, 2), true);
    assert.deepEqual(board, snapshot);
  }
});

test("電腦執黑時不會選擇長連或雙四禁手", () => {
  const window = createAI();
  const overlineBoard = emptyBoard();
  [3, 4, 5, 6, 7].forEach((column) => { overlineBoard[7][column] = 1; });

  const doubleFourBoard = crossForkBoard(1);
  assert.equal(window.GomokuRules.isLegalMove(doubleFourBoard, 7, 7, 1), false);

  for (const difficulty of ["easy", "medium", "hard"]) {
    const overlineMove = choose(window, overlineBoard, 1, difficulty);
    assert.ok(overlineMove);
    assert.equal(window.GomokuRules.isLegalMove(overlineBoard, overlineMove.row, overlineMove.column, 1), true);

    const doubleFourMove = choose(window, doubleFourBoard, 1, difficulty);
    assert.ok(doubleFourMove);
    assert.equal(window.GomokuRules.isLegalMove(doubleFourBoard, doubleFourMove.row, doubleFourMove.column, 1), true);
    assert.notDeepEqual(doubleFourMove, { row: 7, column: 7 });
  }
});

test("AI 合法性防線失效時仍能找到安全著法", () => {
  const window = createAI();
  const board = emptyBoard();
  board[7][7] = 2;
  const move = window.GomokuAI.chooseMove(board, 1, "hard", {
    maxThinkMs: 1,
    isLegalMove: (nextBoard, row, column, player) =>
      window.GomokuRules.isLegalMove(nextBoard, row, column, player) &&
      !(row === 7 && column === 6)
  });

  assert.ok(move);
  assert.notDeepEqual(move, { row: 7, column: 6 });
  assert.equal(window.GomokuRules.isLegalMove(board, move.row, move.column, 1), true);
});
