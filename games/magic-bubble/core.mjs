import {
  BOARD, CELL, SPEED_MS, CHAIN_BONUS, COLOR_BONUS, ROTATION_OFFSETS, TIMING
} from "./config.mjs";
import { normalizeSeed, randomInt } from "./rng.mjs";

const LEGAL_CELLS = new Set([CELL.empty, CELL.red, CELL.yellow, CELL.green, CELL.blue, CELL.garbage]);
const BOARD_LENGTH = BOARD.columns * BOARD.totalRows;
const CHAR_TO_CELL = Object.freeze({ ".": CELL.empty, R: CELL.red, Y: CELL.yellow, G: CELL.green, B: CELL.blue, "#": CELL.garbage });

export function boardIndex(x, y) {
  return (y + BOARD.hiddenRows) * BOARD.columns + x;
}

export function indexToCell(index) {
  return {
    x: index % BOARD.columns,
    y: Math.floor(index / BOARD.columns) - BOARD.hiddenRows
  };
}

export function isInside(x, y) {
  return x >= 0 && x < BOARD.columns && y >= -BOARD.hiddenRows && y < BOARD.visibleRows;
}

export function createEmptyBoard() {
  return new Uint8Array(BOARD_LENGTH);
}

export function parseBoard(rows) {
  if (!Array.isArray(rows) || rows.length !== BOARD.totalRows) {
    throw new Error(`初始盤面必須有 ${BOARD.totalRows} 列`);
  }
  const board = createEmptyBoard();
  rows.forEach((row, internalY) => {
    if (typeof row !== "string" || row.length !== BOARD.columns) throw new Error(`初始盤面第 ${internalY + 1} 列寬度錯誤`);
    for (let x = 0; x < BOARD.columns; x += 1) {
      const value = CHAR_TO_CELL[row[x]];
      if (value === undefined) throw new Error(`初始盤面包含未知字元：${row[x]}`);
      board[internalY * BOARD.columns + x] = value;
    }
  });
  return board;
}

export function serializeBoard(board) {
  return Array.from({ length: BOARD.totalRows }, (_, internalY) => {
    return Array.from({ length: BOARD.columns }, (_, x) => {
      const value = board[internalY * BOARD.columns + x];
      return Object.entries(CHAR_TO_CELL).find(([, cell]) => cell === value)?.[0] || ".";
    }).join("");
  });
}

function pairCells(pair, rotation = pair.rotation, pivotX = pair.pivotX, pivotY = pair.pivotY) {
  const offset = ROTATION_OFFSETS[rotation];
  return [
    { x: pivotX, y: pivotY, color: pair.pivotColor, role: "pivot" },
    { x: pivotX + offset.x, y: pivotY + offset.y, color: pair.satelliteColor, role: "satellite" }
  ];
}

export function getPairCells(pair) {
  return pairCells(pair).map((cell) => ({ ...cell }));
}

export function canOccupy(board, cells) {
  const seen = new Set();
  return cells.every((cell) => {
    if (!isInside(cell.x, cell.y)) return false;
    const index = boardIndex(cell.x, cell.y);
    if (seen.has(index) || board[index] !== CELL.empty) return false;
    seen.add(index);
    return true;
  });
}

function drawColor(state) {
  const roll = randomInt(state.rngState, 0, state.allowedColors.length - 1);
  state.rngState = roll.state;
  return state.allowedColors[roll.value];
}

function drawPair(state) {
  if (state.fixedPairIndex < state.fixedPairs.length) {
    const pair = state.fixedPairs[state.fixedPairIndex];
    state.fixedPairIndex += 1;
    return { pivotColor: pair[0], satelliteColor: pair[1] };
  }
  return { pivotColor: drawColor(state), satelliteColor: drawColor(state) };
}

function makeActivePair(colors) {
  return {
    pivotX: BOARD.spawnX,
    pivotY: BOARD.spawnY,
    pivotColor: colors.pivotColor,
    satelliteColor: colors.satelliteColor,
    rotation: 0,
    fallAccumulatorMs: 0,
    lockElapsedMs: 0,
    lockResetCount: 0
  };
}

export function spawnPair(state) {
  const colors = state.nextPairs.shift() || drawPair(state);
  state.nextPairs.push(drawPair(state));
  const pair = makeActivePair(colors);
  if (!canOccupy(state.board, pairCells(pair))) {
    state.activePair = null;
    state.phase = "gameOver";
    return [{ type: "GAME_OVER" }];
  }
  state.activePair = pair;
  state.phase = "active";
  return [{ type: "PAIR_SPAWNED", cells: getPairCells(pair), nextPair: { ...state.nextPairs[0] } }];
}

export function createGame(options = {}) {
  const level = options.level || null;
  const state = {
    schemaVersion: 1,
    mode: options.mode || "endless",
    levelId: level?.id || null,
    phase: "active",
    previousPhase: null,
    board: level?.initialBoard ? parseBoard(level.initialBoard) : createEmptyBoard(),
    activePair: null,
    nextPairs: [],
    score: 0,
    chain: 0,
    maxChain: 0,
    speedLevel: Math.max(1, Math.min(15, level?.startLevel || 1)),
    placedPairCount: 0,
    elapsedMs: 0,
    rngState: normalizeSeed(options.seed),
    allowedColors: [...(level?.colors || [1, 2, 3, 4])],
    fixedPairs: [...(level?.fixedPairs || [])],
    fixedPairIndex: 0,
    objective: level?.objective ? { ...level.objective } : null,
    objectiveProgress: 0,
    stats: {
      totalColoredCleared: 0,
      totalGarbageCleared: 0,
      clearedByColor: { 1: 0, 2: 0, 3: 0, 4: 0 }
    },
    stars: 0,
    starScores: [...(level?.starScores || [0, 10000, 25000])]
  };
  state.nextPairs.push(drawPair(state));
  const events = spawnPair(state);
  assertValidState(state);
  return { state, events };
}

function downwardOpen(state) {
  if (!state.activePair) return false;
  const pair = state.activePair;
  return canOccupy(state.board, pairCells(pair, pair.rotation, pair.pivotX, pair.pivotY + 1));
}

export function tryMove(state, dx, dy) {
  if (!state.activePair || (state.phase !== "active" && state.phase !== "locking")) return { changed: false, events: [] };
  const pair = state.activePair;
  const cells = pairCells(pair, pair.rotation, pair.pivotX + dx, pair.pivotY + dy);
  if (!canOccupy(state.board, cells)) return { changed: false, events: [] };
  pair.pivotX += dx;
  pair.pivotY += dy;
  if (state.phase === "locking") {
    if (downwardOpen(state)) {
      state.phase = "active";
      pair.lockElapsedMs = 0;
    } else if ((dx !== 0 || dy === 0) && pair.lockResetCount < TIMING.maxLockResets) {
      pair.lockElapsedMs = 0;
      pair.lockResetCount += 1;
    }
  }
  return { changed: true, events: [{ type: "PAIR_MOVED", dx, dy, cells: getPairCells(pair) }] };
}

function modulo(value, divisor) {
  return ((value % divisor) + divisor) % divisor;
}

export function tryRotate(state, direction) {
  if (!state.activePair || (state.phase !== "active" && state.phase !== "locking")) return { changed: false, events: [] };
  const pair = state.activePair;
  const targetRotation = modulo(pair.rotation + direction, 4);
  const kicks = [{ x: 0, y: 0 }, { x: -1, y: 0 }, { x: 1, y: 0 }];
  if (targetRotation === 2) kicks.push({ x: 0, y: -1 });
  for (const kick of kicks) {
    const cells = pairCells(pair, targetRotation, pair.pivotX + kick.x, pair.pivotY + kick.y);
    if (!canOccupy(state.board, cells)) continue;
    pair.rotation = targetRotation;
    pair.pivotX += kick.x;
    pair.pivotY += kick.y;
    if (state.phase === "locking") {
      if (downwardOpen(state)) {
        state.phase = "active";
        pair.lockElapsedMs = 0;
      } else if (pair.lockResetCount < TIMING.maxLockResets) {
        pair.lockElapsedMs = 0;
        pair.lockResetCount += 1;
      }
    }
    return { changed: true, events: [{ type: "PAIR_ROTATED", direction, kick, cells: getPairCells(pair) }] };
  }
  return { changed: false, events: [{ type: "ROTATION_BLOCKED" }] };
}

export function getHardDropDistance(state) {
  if (!state.activePair) return 0;
  const pair = state.activePair;
  let distance = 0;
  while (canOccupy(state.board, pairCells(pair, pair.rotation, pair.pivotX, pair.pivotY + distance + 1))) distance += 1;
  return distance;
}

function groupBonus(size) {
  if (size <= 4) return 0;
  if (size <= 10) return size - 3;
  return 10;
}

export function calculateClearScore({ chain, groupSizes, colorCount }) {
  const coloredCount = groupSizes.reduce((sum, size) => sum + size, 0);
  const chainBonus = CHAIN_BONUS[Math.min(chain, CHAIN_BONUS.length - 1)] ?? CHAIN_BONUS.at(-1);
  const sizeBonus = groupSizes.reduce((sum, size) => sum + groupBonus(size), 0);
  const colorBonus = COLOR_BONUS[colorCount] || 0;
  const multiplier = Math.min(999, Math.max(1, chainBonus + sizeBonus + colorBonus));
  return 10 * coloredCount * multiplier;
}

function neighborIndexes(index) {
  const { x, y } = indexToCell(index);
  return [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]
    .filter(([nextX, nextY]) => isInside(nextX, nextY))
    .map(([nextX, nextY]) => boardIndex(nextX, nextY));
}

export function findClearGroups(board) {
  const visited = new Uint8Array(BOARD_LENGTH);
  const groups = [];
  for (let start = 0; start < BOARD_LENGTH; start += 1) {
    const color = board[start];
    if (visited[start] || color === CELL.empty || color === CELL.garbage) continue;
    const queue = [start];
    const indexes = [];
    visited[start] = 1;
    for (let cursor = 0; cursor < queue.length; cursor += 1) {
      const index = queue[cursor];
      indexes.push(index);
      for (const neighbor of neighborIndexes(index)) {
        if (!visited[neighbor] && board[neighbor] === color) {
          visited[neighbor] = 1;
          queue.push(neighbor);
        }
      }
    }
    if (indexes.length >= 4) groups.push({ color, indexes });
  }
  return groups;
}

export function collectAdjacentGarbage(board, colorIndexes) {
  const garbage = new Set();
  for (const index of colorIndexes) {
    for (const neighbor of neighborIndexes(index)) {
      if (board[neighbor] === CELL.garbage) garbage.add(neighbor);
    }
  }
  return [...garbage];
}

export function applyGravity(board) {
  const transitions = [];
  for (let x = 0; x < BOARD.columns; x += 1) {
    let writeY = BOARD.visibleRows - 1;
    for (let y = BOARD.visibleRows - 1; y >= -BOARD.hiddenRows; y -= 1) {
      const from = boardIndex(x, y);
      const value = board[from];
      if (value === CELL.empty) continue;
      const to = boardIndex(x, writeY);
      if (from !== to) {
        board[to] = value;
        board[from] = CELL.empty;
        transitions.push({ from, to, value });
      }
      writeY -= 1;
    }
    for (let y = writeY; y >= -BOARD.hiddenRows; y -= 1) board[boardIndex(x, y)] = CELL.empty;
  }
  return transitions;
}

export function resolveBoard(sourceBoard) {
  const board = new Uint8Array(sourceBoard);
  const steps = [];
  const clearedByColor = { 1: 0, 2: 0, 3: 0, 4: 0 };
  let chain = 0;
  let totalScore = 0;
  let totalColoredCleared = 0;
  let totalGarbageCleared = 0;
  while (true) {
    const groups = findClearGroups(board);
    if (!groups.length) break;
    chain += 1;
    const colorIndexes = groups.flatMap((group) => group.indexes);
    const garbageIndexes = collectAdjacentGarbage(board, colorIndexes);
    const colors = [...new Set(groups.map((group) => group.color))];
    const score = calculateClearScore({ chain, groupSizes: groups.map((group) => group.indexes.length), colorCount: colors.length });
    const clearedCells = colorIndexes.map((index) => ({ index, value: board[index], ...indexToCell(index) }));
    const garbageCells = garbageIndexes.map((index) => ({ index, value: CELL.garbage, ...indexToCell(index) }));
    for (const group of groups) {
      clearedByColor[group.color] += group.indexes.length;
      for (const index of group.indexes) board[index] = CELL.empty;
    }
    for (const index of garbageIndexes) board[index] = CELL.empty;
    const gravityTransitions = applyGravity(board);
    totalScore += score;
    totalColoredCleared += colorIndexes.length;
    totalGarbageCleared += garbageIndexes.length;
    steps.push({ chain, groups, clearedCells, garbageCells, colors, score, gravityTransitions });
  }
  return { board, steps, totalScore, finalChain: chain, totalColoredCleared, totalGarbageCleared, clearedByColor };
}

function dropSingleBubble(board, cell) {
  let y = cell.y;
  while (isInside(cell.x, y + 1) && board[boardIndex(cell.x, y + 1)] === CELL.empty) y += 1;
  board[boardIndex(cell.x, y)] = cell.color;
  return { from: { x: cell.x, y: cell.y }, to: { x: cell.x, y }, value: cell.color, role: cell.role };
}

function updateObjective(state, resolution) {
  if (!state.objective) return;
  if (state.objective.type === "score") state.objectiveProgress = state.score;
  if (state.objective.type === "chain") state.objectiveProgress = Math.max(state.objectiveProgress, resolution.finalChain);
  if (state.objective.type === "clearGarbage") state.objectiveProgress += resolution.totalGarbageCleared;
  if (state.objective.type === "clearColor") state.objectiveProgress += resolution.clearedByColor[state.objective.color] || 0;
}

export function isObjectiveComplete(state) {
  return Boolean(state.objective && state.objectiveProgress >= state.objective.amount);
}

function calculateStars(score, starScores) {
  if (score >= starScores[2]) return 3;
  if (score >= starScores[1]) return 2;
  return 1;
}

export function lockPair(state) {
  if (!state.activePair) return { changed: false, events: [] };
  const cells = pairCells(state.activePair).sort((a, b) => b.y - a.y);
  const drops = cells.map((cell) => dropSingleBubble(state.board, cell));
  state.activePair = null;
  state.phase = "resolving";
  state.placedPairCount += 1;
  if (state.mode === "endless") state.speedLevel = Math.min(15, 1 + Math.floor(state.placedPairCount / 12));
  const resolution = resolveBoard(state.board);
  state.board = resolution.board;
  state.score += resolution.totalScore;
  state.chain = resolution.finalChain;
  state.maxChain = Math.max(state.maxChain, resolution.finalChain);
  state.stats.totalColoredCleared += resolution.totalColoredCleared;
  state.stats.totalGarbageCleared += resolution.totalGarbageCleared;
  for (let color = 1; color <= 4; color += 1) state.stats.clearedByColor[color] += resolution.clearedByColor[color];
  updateObjective(state, resolution);
  const events = [{ type: "PAIR_LOCKED", drops }, ...resolution.steps.map((step) => ({ type: "CHAIN_STEP", ...step }))];
  if ((state.mode === "stage" || state.mode === "tutorial") && isObjectiveComplete(state)) {
    state.stars = calculateStars(state.score, state.starScores);
    state.phase = "stageClear";
    events.push({ type: "STAGE_CLEAR", stars: state.stars, score: state.score });
  } else if (state.board[boardIndex(BOARD.spawnX, BOARD.spawnY)] !== CELL.empty) {
    state.phase = "gameOver";
    events.push({ type: "GAME_OVER" });
  } else {
    events.push(...spawnPair(state));
  }
  assertValidState(state);
  return { changed: true, events, resolution };
}

export function hardDrop(state) {
  if (!state.activePair || (state.phase !== "active" && state.phase !== "locking")) return { changed: false, events: [] };
  const distance = getHardDropDistance(state);
  state.activePair.pivotY += distance;
  const gained = distance * 2;
  state.score += gained;
  const result = lockPair(state);
  return { ...result, events: [{ type: "HARD_DROP", distance, score: gained }, ...result.events] };
}

export function applyCommand(state, command) {
  if (command === "MOVE_LEFT") return tryMove(state, -1, 0);
  if (command === "MOVE_RIGHT") return tryMove(state, 1, 0);
  if (command === "ROTATE_CCW") return tryRotate(state, -1);
  if (command === "ROTATE_CW") return tryRotate(state, 1);
  if (command === "HARD_DROP") return hardDrop(state);
  return { changed: false, events: [] };
}

export function stepGame(state, deltaMs, options = {}) {
  if (state.phase !== "active" && state.phase !== "locking") return { changed: false, events: [] };
  const delta = Math.max(0, Math.min(Number(deltaMs) || 0, TIMING.maxFrameDeltaMs));
  state.elapsedMs += delta;
  const pair = state.activePair;
  const events = [];
  if (state.phase === "locking") {
    pair.lockElapsedMs += delta;
    if (pair.lockElapsedMs >= TIMING.lockDelayMs) return lockPair(state);
    return { changed: false, events };
  }
  const interval = options.softDrop ? TIMING.softDropMs : SPEED_MS[state.speedLevel - 1];
  pair.fallAccumulatorMs += delta;
  let changed = false;
  let steps = 0;
  while (pair.fallAccumulatorMs >= interval && steps < TIMING.maxStepsPerFrame) {
    pair.fallAccumulatorMs -= interval;
    steps += 1;
    const moved = tryMove(state, 0, 1);
    if (!moved.changed) {
      state.phase = "locking";
      pair.lockElapsedMs = 0;
      events.push({ type: "LOCK_STARTED" });
      break;
    }
    changed = true;
    events.push(...moved.events);
    if (options.softDrop) {
      state.score += 1;
      events.push({ type: "SOFT_DROP_SCORE", amount: 1 });
    }
  }
  return { changed, events };
}

export function pauseGame(state) {
  if (state.phase === "paused" || state.phase === "stageClear" || state.phase === "gameOver") return false;
  state.previousPhase = state.phase;
  state.phase = "paused";
  return true;
}

export function resumeGame(state) {
  if (state.phase !== "paused") return false;
  state.phase = state.previousPhase || "active";
  state.previousPhase = null;
  return true;
}

export function assertValidState(state) {
  if (!(state.board instanceof Uint8Array) || state.board.length !== BOARD_LENGTH) throw new Error("棋盤資料格式錯誤");
  for (const value of state.board) if (!LEGAL_CELLS.has(value)) throw new Error(`棋盤包含非法值：${value}`);
  if (!Number.isSafeInteger(state.score) || state.score < 0) throw new Error("分數必須是非負安全整數");
  if (!Number.isInteger(state.speedLevel) || state.speedLevel < 1 || state.speedLevel > 15) throw new Error("速度等級超出範圍");
  if (state.activePair) {
    if (!Number.isInteger(state.activePair.rotation) || state.activePair.rotation < 0 || state.activePair.rotation > 3) throw new Error("旋轉狀態錯誤");
    if (!canOccupy(state.board, pairCells(state.activePair))) throw new Error("活動氣泡與棋盤碰撞");
  }
  return true;
}

export function cloneState(state) {
  return {
    ...state,
    board: new Uint8Array(state.board),
    activePair: state.activePair ? { ...state.activePair } : null,
    nextPairs: state.nextPairs.map((pair) => ({ ...pair })),
    allowedColors: [...state.allowedColors],
    fixedPairs: state.fixedPairs.map((pair) => [...pair]),
    objective: state.objective ? { ...state.objective } : null,
    stats: { ...state.stats, clearedByColor: { ...state.stats.clearedByColor } },
    starScores: [...state.starScores]
  };
}
