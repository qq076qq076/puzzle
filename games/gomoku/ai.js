(function () {
  "use strict";

  const BOARD_SIZE = 15;
  const WIN_LENGTH = 5;
  const EMPTY = 0;
  const DIRECTIONS = [
    { row: 1, column: 0 },
    { row: 0, column: 1 },
    { row: 1, column: 1 },
    { row: 1, column: -1 }
  ];

  function now() {
    return typeof performance !== "undefined" && typeof performance.now === "function" ? performance.now() : Date.now();
  }

  function isInsideBoard(row, column) {
    return row >= 0 && row < BOARD_SIZE && column >= 0 && column < BOARD_SIZE;
  }

  function countDirection(board, row, column, direction, player) {
    let count = 0;
    let nextRow = row + direction.row;
    let nextColumn = column + direction.column;

    while (isInsideBoard(nextRow, nextColumn) && board[nextRow][nextColumn] === player) {
      count += 1;
      nextRow += direction.row;
      nextColumn += direction.column;
    }

    return count;
  }

  function createsFive(board, row, column, player) {
    return DIRECTIONS.some(function (direction) {
      return 1 + countDirection(board, row, column, direction, player) +
        countDirection(board, row, column, { row: -direction.row, column: -direction.column }, player) >= WIN_LENGTH;
    });
  }

  function getLineScore(board, row, column, direction, player) {
    const forwardCount = countDirection(board, row, column, direction, player);
    const backwardDirection = { row: -direction.row, column: -direction.column };
    const backwardCount = countDirection(board, row, column, backwardDirection, player);
    const forwardRow = row + direction.row * (forwardCount + 1);
    const forwardColumn = column + direction.column * (forwardCount + 1);
    const backwardRow = row + backwardDirection.row * (backwardCount + 1);
    const backwardColumn = column + backwardDirection.column * (backwardCount + 1);
    const openEnds = (isInsideBoard(forwardRow, forwardColumn) && board[forwardRow][forwardColumn] === EMPTY ? 1 : 0) +
      (isInsideBoard(backwardRow, backwardColumn) && board[backwardRow][backwardColumn] === EMPTY ? 1 : 0);
    const count = forwardCount + backwardCount + 1;

    if (count >= WIN_LENGTH) return 10000000;
    if (count === 4 && openEnds === 2) return 1000000;
    if (count === 4 && openEnds === 1) return 100000;
    if (count === 3 && openEnds === 2) return 10000;
    if (count === 3 && openEnds === 1) return 1000;
    if (count === 2 && openEnds === 2) return 100;
    if (count === 2 && openEnds === 1) return 20;
    if (count === 1 && openEnds === 2) return 5;
    return 1;
  }

  function scoreMove(board, row, column, player, opponent) {
    if (board[row][column] !== EMPTY) return -Infinity;

    board[row][column] = player;
    const ownScore = DIRECTIONS.reduce(function (total, direction) {
      return total + getLineScore(board, row, column, direction, player);
    }, 0);
    board[row][column] = opponent;
    const defenseScore = DIRECTIONS.reduce(function (total, direction) {
      return total + getLineScore(board, row, column, direction, opponent);
    }, 0);
    board[row][column] = EMPTY;

    return ownScore + defenseScore * 0.9;
  }

  function collectCandidateMoves(board, player, legalMove, limit) {
    const occupied = [];
    const candidates = [];
    const seen = new Set();

    for (let row = 0; row < BOARD_SIZE; row += 1) {
      for (let column = 0; column < BOARD_SIZE; column += 1) {
        if (board[row][column] !== EMPTY) occupied.push({ row: row, column: column });
      }
    }

    if (occupied.length === 0) {
      const center = Math.floor(BOARD_SIZE / 2);
      return legalMove(board, center, center, player) ? [{ row: center, column: center }] : [];
    }

    occupied.forEach(function (stone) {
      for (let row = Math.max(0, stone.row - 2); row <= Math.min(BOARD_SIZE - 1, stone.row + 2); row += 1) {
        for (let column = Math.max(0, stone.column - 2); column <= Math.min(BOARD_SIZE - 1, stone.column + 2); column += 1) {
          const key = row + ":" + column;
          if (board[row][column] === EMPTY && !seen.has(key) && legalMove(board, row, column, player)) {
            seen.add(key);
            candidates.push({ row: row, column: column });
          }
        }
      }
    });

    if (candidates.length === 0) {
      for (let row = 0; row < BOARD_SIZE; row += 1) {
        for (let column = 0; column < BOARD_SIZE; column += 1) {
          if (board[row][column] === EMPTY && legalMove(board, row, column, player)) {
            candidates.push({ row: row, column: column });
          }
        }
      }
    }

    return candidates.sort(function (first, second) {
      return scoreMove(board, second.row, second.column, player, player === 1 ? 2 : 1) -
        scoreMove(board, first.row, first.column, player, player === 1 ? 2 : 1);
    }).slice(0, limit);
  }

  function findWinningMove(board, player, candidates) {
    return candidates.find(function (move) {
      board[move.row][move.column] = player;
      const winning = createsFive(board, move.row, move.column, player);
      board[move.row][move.column] = EMPTY;
      return winning;
    }) || null;
  }

  function evaluateBoard(board, maximizingPlayer, minimizingPlayer, legalMove) {
    const ownMoves = collectCandidateMoves(board, maximizingPlayer, legalMove, 12);
    const opponentMoves = collectCandidateMoves(board, minimizingPlayer, legalMove, 12);
    const ownScore = ownMoves.reduce(function (total, move) {
      return total + scoreMove(board, move.row, move.column, maximizingPlayer, minimizingPlayer);
    }, 0);
    const opponentScore = opponentMoves.reduce(function (total, move) {
      return total + scoreMove(board, move.row, move.column, minimizingPlayer, maximizingPlayer);
    }, 0);
    return ownScore - opponentScore;
  }

  function minimax(board, player, maximizingPlayer, minimizingPlayer, depth, alpha, beta, legalMove, deadline, searchState) {
    if (now() >= deadline) {
      searchState.aborted = true;
      return 0;
    }

    const candidates = collectCandidateMoves(board, player, legalMove, 16);
    if (candidates.length === 0) return 0;
    if (depth === 0) return evaluateBoard(board, maximizingPlayer, minimizingPlayer, legalMove);

    const isMaximizing = player === maximizingPlayer;
    let bestScore = isMaximizing ? -Infinity : Infinity;

    for (const move of candidates) {
      if (now() >= deadline) {
        searchState.aborted = true;
        break;
      }
      board[move.row][move.column] = player;
      const score = createsFive(board, move.row, move.column, player)
        ? (isMaximizing ? 100000000 : -100000000)
        : minimax(board, player === 1 ? 2 : 1, maximizingPlayer, minimizingPlayer, depth - 1, alpha, beta, legalMove, deadline, searchState);
      board[move.row][move.column] = EMPTY;

      if (searchState.aborted) break;

      if (isMaximizing) {
        bestScore = Math.max(bestScore, score);
        alpha = Math.max(alpha, bestScore);
      } else {
        bestScore = Math.min(bestScore, score);
        beta = Math.min(beta, bestScore);
      }
      if (beta <= alpha) break;
    }

    return bestScore;
  }

  function searchBestMove(board, player, candidates, depth, legalMove, deadline) {
    const opponent = player === 1 ? 2 : 1;
    const searchState = { aborted: false };
    let bestMove = candidates[0];
    let bestScore = -Infinity;

    for (const move of candidates) {
      if (now() >= deadline) {
        searchState.aborted = true;
        break;
      }

      board[move.row][move.column] = player;
      const score = createsFive(board, move.row, move.column, player)
        ? 100000000
        : minimax(board, opponent, player, opponent, depth - 1, -Infinity, Infinity, legalMove, deadline, searchState);
      board[move.row][move.column] = EMPTY;

      if (searchState.aborted) break;
      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }

    return searchState.aborted ? null : bestMove;
  }

  function chooseMove(board, player, difficulty, options) {
    const legalMove = options && typeof options.isLegalMove === "function" ? options.isLegalMove : function () { return true; };
    const opponent = player === 1 ? 2 : 1;
    const limit = difficulty === "hard" ? 24 : 28;
    const candidates = collectCandidateMoves(board, player, legalMove, limit);
    if (candidates.length === 0) return null;

    const winningMove = findWinningMove(board, player, candidates);
    if (winningMove) return winningMove;

    const blockingMove = findWinningMove(board, opponent, candidates);
    if (blockingMove) return blockingMove;

    if (difficulty === "easy") {
      return candidates.slice(0, 8).sort(function (first, second) {
        return scoreMove(board, second.row, second.column, player, opponent) -
          scoreMove(board, first.row, first.column, player, opponent);
      })[0];
    }

    const searchCandidates = candidates.slice(0, difficulty === "hard" ? 14 : 12);
    if (difficulty === "medium") {
      return searchBestMove(board, player, searchCandidates, 2, legalMove, Infinity) || searchCandidates[0];
    }

    const maxThinkMs = options && Number.isFinite(options.maxThinkMs) ? options.maxThinkMs : 280;
    const deadline = now() + Math.max(1, maxThinkMs);
    let bestMove = searchCandidates[0];
    for (let depth = 1; depth <= 4; depth += 1) {
      const candidate = searchBestMove(board, player, searchCandidates, depth, legalMove, deadline);
      if (!candidate) break;
      bestMove = candidate;
    }
    return bestMove;
  }

  window.GomokuAI = {
    chooseMove: chooseMove
  };
}());
