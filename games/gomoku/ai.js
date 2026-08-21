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
  const WIN_SCORE = 100000000;

  function now() {
    return typeof performance !== "undefined" && typeof performance.now === "function" ? performance.now() : Date.now();
  }

  function isExpired(context) {
    if (!context || !Number.isFinite(context.deadline)) return false;
    if (now() >= context.deadline) {
      context.aborted = true;
      return true;
    }
    return false;
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

    const center = Math.floor(BOARD_SIZE / 2);
    const centerBonus = BOARD_SIZE - (Math.abs(row - center) + Math.abs(column - center));
    return ownScore + defenseScore * 0.9 + centerBonus * 0.1;
  }

  function getPotentialMoves(board, radius) {
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
      return [{ row: center, column: center }];
    }

    occupied.forEach(function (stone) {
      for (let row = Math.max(0, stone.row - radius); row <= Math.min(BOARD_SIZE - 1, stone.row + radius); row += 1) {
        for (let column = Math.max(0, stone.column - radius); column <= Math.min(BOARD_SIZE - 1, stone.column + radius); column += 1) {
          const key = row + ":" + column;
          if (board[row][column] === EMPTY && !seen.has(key)) {
            seen.add(key);
            candidates.push({ row: row, column: column });
          }
        }
      }
    });

    if (candidates.length > 0) return candidates;

    for (let row = 0; row < BOARD_SIZE; row += 1) {
      for (let column = 0; column < BOARD_SIZE; column += 1) {
        if (board[row][column] === EMPTY) candidates.push({ row: row, column: column });
      }
    }
    return candidates;
  }

  function compareMoves(board, first, second, player, opponent) {
    const secondScore = scoreMove(board, second.row, second.column, player, opponent);
    const firstScore = scoreMove(board, first.row, first.column, player, opponent);
    if (secondScore !== firstScore) return secondScore - firstScore;

    const center = Math.floor(BOARD_SIZE / 2);
    return (Math.abs(first.row - center) + Math.abs(first.column - center)) -
      (Math.abs(second.row - center) + Math.abs(second.column - center));
  }

  function collectCandidateMoves(board, player, legalMove, limit, context) {
    const opponent = player === 1 ? 2 : 1;
    const candidates = [];
    const potentialMoves = getPotentialMoves(board, 2);

    for (const move of potentialMoves) {
      if (isExpired(context)) break;
      if (legalMove(board, move.row, move.column, player)) candidates.push(move);
    }

    if (candidates.length === 0 && !isExpired(context)) {
      for (let row = 0; row < BOARD_SIZE; row += 1) {
        for (let column = 0; column < BOARD_SIZE; column += 1) {
          if (board[row][column] === EMPTY && legalMove(board, row, column, player)) {
            candidates.push({ row: row, column: column });
          }
        }
      }
    }

    return candidates.sort(function (first, second) {
      return compareMoves(board, first, second, player, opponent);
    }).slice(0, limit);
  }

  function isLegalCandidate(board, move, player, legalMove) {
    return Boolean(move) && isInsideBoard(move.row, move.column) &&
      board[move.row][move.column] === EMPTY && legalMove(board, move.row, move.column, player);
  }

  function findAnyLegalMove(board, player, legalMove) {
    const potentialMoves = getPotentialMoves(board, 2);
    for (const move of potentialMoves) {
      if (isLegalCandidate(board, move, player, legalMove)) return move;
    }

    for (let row = 0; row < BOARD_SIZE; row += 1) {
      for (let column = 0; column < BOARD_SIZE; column += 1) {
        const move = { row: row, column: column };
        if (isLegalCandidate(board, move, player, legalMove)) return move;
      }
    }
    return null;
  }

  function ensureLegalMove(board, player, move, legalMove) {
    if (isLegalCandidate(board, move, player, legalMove)) return move;
    return findAnyLegalMove(board, player, legalMove);
  }

  function findWinningMove(board, player, candidates, context) {
    for (const move of candidates) {
      if (isExpired(context)) return null;
      board[move.row][move.column] = player;
      const winning = createsFive(board, move.row, move.column, player);
      board[move.row][move.column] = EMPTY;
      if (winning) return move;
    }
    return null;
  }

  function findWinningReplies(board, player, legalMove, context, limit) {
    const winningMoves = [];
    const potentialMoves = getPotentialMoves(board, 2);

    for (const move of potentialMoves) {
      if (isExpired(context)) break;
      if (!legalMove(board, move.row, move.column, player)) continue;

      board[move.row][move.column] = player;
      const winning = createsFive(board, move.row, move.column, player);
      board[move.row][move.column] = EMPTY;
      if (winning) {
        winningMoves.push(move);
        if (winningMoves.length >= limit) break;
      }
    }

    return winningMoves;
  }

  function findForkMove(board, player, candidates, legalMove, context) {
    for (const move of candidates) {
      if (isExpired(context)) return null;

      board[move.row][move.column] = player;
      const winningReplies = findWinningReplies(board, player, legalMove, context, 2);
      board[move.row][move.column] = EMPTY;
      if (context && context.aborted) return null;
      if (winningReplies.length >= 2) return move;
    }
    return null;
  }

  function evaluateBoard(board, maximizingPlayer, minimizingPlayer, legalMove, context) {
    const ownMoves = collectCandidateMoves(board, maximizingPlayer, legalMove, 12, context);
    const opponentMoves = collectCandidateMoves(board, minimizingPlayer, legalMove, 12, context);
    const ownScore = ownMoves.reduce(function (total, move) {
      return total + scoreMove(board, move.row, move.column, maximizingPlayer, minimizingPlayer);
    }, 0);
    const opponentScore = opponentMoves.reduce(function (total, move) {
      return total + scoreMove(board, move.row, move.column, minimizingPlayer, maximizingPlayer);
    }, 0);
    return ownScore - opponentScore;
  }

  function getBoardKey(board, player, depth) {
    return player + ":" + depth + ":" + board.map(function (row) { return row.join(""); }).join("");
  }

  function minimax(board, player, maximizingPlayer, minimizingPlayer, depth, alpha, beta, legalMove, context) {
    if (isExpired(context)) return 0;

    const key = getBoardKey(board, player, depth);
    const cached = context.table.get(key);
    const originalAlpha = alpha;
    const originalBeta = beta;
    if (cached) {
      if (cached.flag === "exact") return cached.value;
      if (cached.flag === "lower") alpha = Math.max(alpha, cached.value);
      if (cached.flag === "upper") beta = Math.min(beta, cached.value);
      if (alpha >= beta) return cached.value;
    }

    if (depth === 0) {
      const evaluated = evaluateBoard(board, maximizingPlayer, minimizingPlayer, legalMove, context);
      if (!context.aborted) context.table.set(key, { value: evaluated, flag: "exact" });
      return evaluated;
    }

    const candidates = collectCandidateMoves(board, player, legalMove, 16, context);
    if (candidates.length === 0) return 0;

    const isMaximizing = player === maximizingPlayer;
    let bestScore = isMaximizing ? -Infinity : Infinity;
    const nextPlayer = player === 1 ? 2 : 1;

    for (const move of candidates) {
      if (isExpired(context)) break;

      board[move.row][move.column] = player;
      const score = createsFive(board, move.row, move.column, player)
        ? (isMaximizing ? WIN_SCORE : -WIN_SCORE)
        : minimax(board, nextPlayer, maximizingPlayer, minimizingPlayer, depth - 1, alpha, beta, legalMove, context);
      board[move.row][move.column] = EMPTY;

      if (context.aborted) break;

      if (isMaximizing) {
        bestScore = Math.max(bestScore, score);
        alpha = Math.max(alpha, bestScore);
      } else {
        bestScore = Math.min(bestScore, score);
        beta = Math.min(beta, bestScore);
      }
      if (beta <= alpha) break;
    }

    if (!context.aborted) {
      const flag = bestScore <= originalAlpha ? "upper" : (bestScore >= originalBeta ? "lower" : "exact");
      context.table.set(key, { value: bestScore, flag: flag });
    }
    return bestScore;
  }

  function searchBestMove(board, player, candidates, depth, legalMove, context) {
    const opponent = player === 1 ? 2 : 1;
    let bestMove = candidates[0];
    let bestScore = -Infinity;

    for (const move of candidates) {
      if (isExpired(context)) break;

      board[move.row][move.column] = player;
      const score = createsFive(board, move.row, move.column, player)
        ? WIN_SCORE
        : minimax(board, opponent, player, opponent, depth - 1, -Infinity, Infinity, legalMove, context);
      board[move.row][move.column] = EMPTY;

      if (context.aborted) break;
      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }

    return context.aborted ? null : bestMove;
  }

  function chooseMove(board, player, difficulty, options) {
    const legalMove = options && typeof options.isLegalMove === "function" ? options.isLegalMove : function () { return true; };
    const opponent = player === 1 ? 2 : 1;
    const isHard = difficulty === "hard";
    const maxThinkMs = isHard && options && Number.isFinite(options.maxThinkMs) ? options.maxThinkMs : 280;
    const context = {
      deadline: isHard ? now() + Math.max(1, maxThinkMs) : Infinity,
      aborted: false,
      table: new Map()
    };
    const candidateLimit = isHard ? 24 : 28;
    const candidates = collectCandidateMoves(board, player, legalMove, candidateLimit, context);
    if (candidates.length === 0) return findAnyLegalMove(board, player, legalMove);

    const winningMove = findWinningMove(board, player, candidates, context);
    if (winningMove) return ensureLegalMove(board, player, winningMove, legalMove);

    const opponentCandidates = collectCandidateMoves(board, opponent, legalMove, candidateLimit, context);
    const blockingMove = findWinningMove(board, opponent, opponentCandidates, context);
    if (blockingMove) return ensureLegalMove(board, player, blockingMove, legalMove);

    if (difficulty === "easy") {
      const easyMove = candidates.slice(0, 8).sort(function (first, second) {
        return scoreMove(board, second.row, second.column, player, opponent) -
          scoreMove(board, first.row, first.column, player, opponent);
      })[0];
      return ensureLegalMove(board, player, easyMove, legalMove);
    }

    if (isHard) {
      const ownFork = findForkMove(board, player, candidates.slice(0, 18), legalMove, context);
      if (ownFork) return ensureLegalMove(board, player, ownFork, legalMove);

      const opponentFork = findForkMove(board, opponent, opponentCandidates.slice(0, 18), legalMove, context);
      if (opponentFork) return ensureLegalMove(board, player, opponentFork, legalMove);
      if (context.aborted) return ensureLegalMove(board, player, candidates[0], legalMove);
    }

    const searchCandidates = candidates.slice(0, isHard ? 18 : 12);
    if (difficulty === "medium") {
      return ensureLegalMove(
        board,
        player,
        searchBestMove(board, player, searchCandidates, 2, legalMove, context) || searchCandidates[0],
        legalMove
      );
    }

    let bestMove = searchCandidates[0];
    for (let depth = 1; depth <= 6; depth += 1) {
      const candidate = searchBestMove(board, player, searchCandidates, depth, legalMove, context);
      if (!candidate) break;
      bestMove = candidate;
    }
    return ensureLegalMove(board, player, bestMove, legalMove);
  }

  window.GomokuAI = {
    chooseMove: chooseMove,
    findLegalMove: function (board, player, legalMove) {
      const checker = typeof legalMove === "function" ? legalMove : function () { return true; };
      return findAnyLegalMove(board, player, checker);
    }
  };
}());
