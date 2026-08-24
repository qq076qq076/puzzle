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
  const HARD_PATTERN_GROUPS = {
    openFour: [".XXXX.", ".XXX.X.", ".XX.XX.", ".X.XXX."],
    closedFour: ["XXXX.", ".XXXX", "XXX.X", "X.XXX", "XX.XX", "BXXXX.", ".XXXXB", "BXXX.X.", ".XXX.XB", "BXX.XX.", ".XX.XXB", "BX.XXX.", ".X.XXXB"],
    openThree: [".XXX.", "..XXX.", ".XXX..", ".XX.X.", ".X.XX.", "..XX.X.", ".XX.X..", "..X.XX.", ".X.XX.."],
    splitThree: [".XX..X.", ".X..XX.", ".X.X.X.", "..XX.X..", "..X.XX..", ".XX.X..", "..X.XX."]
  };

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

  function lineContainsCenteredPattern(line, pattern) {
    let start = line.indexOf(pattern);
    while (start !== -1) {
      if (start <= 4 && start + pattern.length > 4) return true;
      start = line.indexOf(pattern, start + 1);
    }
    return false;
  }

  function buildLineSignature(board, row, column, direction, player) {
    let signature = "";

    for (let offset = -4; offset <= 4; offset += 1) {
      const nextRow = row + direction.row * offset;
      const nextColumn = column + direction.column * offset;

      if (!isInsideBoard(nextRow, nextColumn)) {
        signature += "B";
      } else if (board[nextRow][nextColumn] === player) {
        signature += "X";
      } else if (board[nextRow][nextColumn] === EMPTY) {
        signature += ".";
      } else {
        signature += "B";
      }
    }

    return signature;
  }

  function summarizeMoveThreats(board, row, column, player) {
    const summary = {
      five: 0,
      openFour: 0,
      closedFour: 0,
      openThree: 0,
      splitThree: 0
    };

    for (const direction of DIRECTIONS) {
      const line = buildLineSignature(board, row, column, direction, player);

      if (lineContainsCenteredPattern(line, "XXXXX")) {
        summary.five += 1;
      }
      if (HARD_PATTERN_GROUPS.openFour.some(function (pattern) {
        return lineContainsCenteredPattern(line, pattern);
      })) {
        summary.openFour += 1;
      } else if (HARD_PATTERN_GROUPS.closedFour.some(function (pattern) {
        return lineContainsCenteredPattern(line, pattern);
      })) {
        summary.closedFour += 1;
      }
      if (HARD_PATTERN_GROUPS.openThree.some(function (pattern) {
        return lineContainsCenteredPattern(line, pattern);
      })) {
        summary.openThree += 1;
      } else if (HARD_PATTERN_GROUPS.splitThree.some(function (pattern) {
        return lineContainsCenteredPattern(line, pattern);
      })) {
        summary.splitThree += 1;
      }
    }

    return summary;
  }

  function scoreThreatSummary(summary) {
    let total = 0;

    total += summary.five * WIN_SCORE;
    total += summary.openFour * 3200000;
    total += summary.closedFour * 540000;
    total += summary.openThree * 95000;
    total += summary.splitThree * 22000;

    if (summary.openFour >= 1 && summary.openThree >= 1) total += 1500000;
    if (summary.closedFour >= 2) total += 750000;
    if (summary.openThree >= 2) total += 680000;
    if (summary.openThree >= 1 && summary.splitThree >= 1) total += 180000;

    return total;
  }

  function scoreMoveAdvanced(board, row, column, player, opponent) {
    if (board[row][column] !== EMPTY) return -Infinity;

    board[row][column] = player;
    const ownBase = DIRECTIONS.reduce(function (total, direction) {
      return total + getLineScore(board, row, column, direction, player);
    }, 0);
    const ownThreatScore = scoreThreatSummary(summarizeMoveThreats(board, row, column, player));
    board[row][column] = opponent;
    const defenseBase = DIRECTIONS.reduce(function (total, direction) {
      return total + getLineScore(board, row, column, direction, opponent);
    }, 0);
    const defenseThreatScore = scoreThreatSummary(summarizeMoveThreats(board, row, column, opponent));
    board[row][column] = EMPTY;

    const center = Math.floor(BOARD_SIZE / 2);
    const centerBonus = BOARD_SIZE - (Math.abs(row - center) + Math.abs(column - center));
    return ownBase * 1.08 + ownThreatScore + defenseBase * 0.92 + defenseThreatScore * 0.98 + centerBonus * 0.12;
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

  function compareMoves(board, first, second, player, opponent, scorer) {
    const moveScorer = typeof scorer === "function" ? scorer : scoreMove;
    const secondScore = moveScorer(board, second.row, second.column, player, opponent);
    const firstScore = moveScorer(board, first.row, first.column, player, opponent);
    if (secondScore !== firstScore) return secondScore - firstScore;

    const center = Math.floor(BOARD_SIZE / 2);
    return (Math.abs(first.row - center) + Math.abs(first.column - center)) -
      (Math.abs(second.row - center) + Math.abs(second.column - center));
  }

  function collectCandidateMoves(board, player, legalMove, limit, context, scorer) {
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
      return compareMoves(board, first, second, player, opponent, scorer);
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

  function evaluateBoard(board, maximizingPlayer, minimizingPlayer, legalMove, context, scorer, limit) {
    const moveScorer = typeof scorer === "function" ? scorer : scoreMove;
    const candidateLimit = Number.isFinite(limit) ? limit : 12;
    const ownMoves = collectCandidateMoves(board, maximizingPlayer, legalMove, candidateLimit, context, moveScorer);
    const opponentMoves = collectCandidateMoves(board, minimizingPlayer, legalMove, candidateLimit, context, moveScorer);
    const ownScore = ownMoves.reduce(function (total, move) {
      return total + moveScorer(board, move.row, move.column, maximizingPlayer, minimizingPlayer);
    }, 0);
    const opponentScore = opponentMoves.reduce(function (total, move) {
      return total + moveScorer(board, move.row, move.column, minimizingPlayer, maximizingPlayer);
    }, 0);
    return ownScore - opponentScore;
  }

  function getBoardKey(board, player, depth, tag) {
    return (tag || "base") + ":" + player + ":" + depth + ":" + board.map(function (row) { return row.join(""); }).join("");
  }

  function minimax(board, player, maximizingPlayer, minimizingPlayer, depth, alpha, beta, legalMove, context, config) {
    if (isExpired(context)) return 0;

    const key = getBoardKey(board, player, depth, config.keyTag);
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
      const evaluated = evaluateBoard(
        board,
        maximizingPlayer,
        minimizingPlayer,
        legalMove,
        context,
        config.scorer,
        config.evalCandidateLimit
      );
      if (!context.aborted) context.table.set(key, { value: evaluated, flag: "exact" });
      return evaluated;
    }

    const candidates = collectCandidateMoves(
      board,
      player,
      legalMove,
      config.nodeCandidateLimit,
      context,
      config.scorer
    );
    if (candidates.length === 0) return 0;

    const isMaximizing = player === maximizingPlayer;
    let bestScore = isMaximizing ? -Infinity : Infinity;
    const nextPlayer = player === 1 ? 2 : 1;

    for (const move of candidates) {
      if (isExpired(context)) break;

      board[move.row][move.column] = player;
      const score = createsFive(board, move.row, move.column, player)
        ? (isMaximizing ? WIN_SCORE : -WIN_SCORE)
        : minimax(board, nextPlayer, maximizingPlayer, minimizingPlayer, depth - 1, alpha, beta, legalMove, context, config);
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

  function searchBestMove(board, player, candidates, depth, legalMove, context, config) {
    const opponent = player === 1 ? 2 : 1;
    let bestMove = candidates[0];
    let bestScore = -Infinity;

    for (const move of candidates) {
      if (isExpired(context)) break;

      board[move.row][move.column] = player;
      const score = createsFive(board, move.row, move.column, player)
        ? WIN_SCORE
        : minimax(board, opponent, player, opponent, depth - 1, -Infinity, Infinity, legalMove, context, config);
      board[move.row][move.column] = EMPTY;

      if (context.aborted) break;
      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }

    return context.aborted ? null : bestMove;
  }

  function createSearchContext(maxThinkMs) {
    return {
      deadline: Number.isFinite(maxThinkMs) ? now() + Math.max(1, maxThinkMs) : Infinity,
      aborted: false,
      table: new Map()
    };
  }

  function chooseEasyMove(board, player, legalMove) {
    const opponent = player === 1 ? 2 : 1;
    const context = createSearchContext(Infinity);
    const candidates = collectCandidateMoves(board, player, legalMove, 28, context, scoreMove);
    if (candidates.length === 0) return findAnyLegalMove(board, player, legalMove);

    const winningMove = findWinningMove(board, player, candidates, context);
    if (winningMove) return ensureLegalMove(board, player, winningMove, legalMove);

    const opponentCandidates = collectCandidateMoves(board, opponent, legalMove, 28, context, scoreMove);
    const blockingMove = findWinningMove(board, opponent, opponentCandidates, context);
    if (blockingMove) return ensureLegalMove(board, player, blockingMove, legalMove);

    const easyMove = candidates.slice(0, 8).sort(function (first, second) {
      return scoreMove(board, second.row, second.column, player, opponent) -
        scoreMove(board, first.row, first.column, player, opponent);
    })[0];
    return ensureLegalMove(board, player, easyMove, legalMove);
  }

  function chooseStrategicMove(board, player, legalMove, maxThinkMs) {
    const opponent = player === 1 ? 2 : 1;
    const context = createSearchContext(maxThinkMs);
    const config = {
      scorer: scoreMove,
      keyTag: "strategic",
      nodeCandidateLimit: 16,
      evalCandidateLimit: 12
    };
    const candidates = collectCandidateMoves(board, player, legalMove, 24, context, config.scorer);
    if (candidates.length === 0) return findAnyLegalMove(board, player, legalMove);

    const winningMove = findWinningMove(board, player, candidates, context);
    if (winningMove) return ensureLegalMove(board, player, winningMove, legalMove);

    const opponentCandidates = collectCandidateMoves(board, opponent, legalMove, 24, context, config.scorer);
    const blockingMove = findWinningMove(board, opponent, opponentCandidates, context);
    if (blockingMove) return ensureLegalMove(board, player, blockingMove, legalMove);

    const ownFork = findForkMove(board, player, candidates.slice(0, 18), legalMove, context);
    if (ownFork) return ensureLegalMove(board, player, ownFork, legalMove);

    const opponentFork = findForkMove(board, opponent, opponentCandidates.slice(0, 18), legalMove, context);
    if (opponentFork) return ensureLegalMove(board, player, opponentFork, legalMove);
    if (context.aborted) return ensureLegalMove(board, player, candidates[0], legalMove);

    const searchCandidates = candidates.slice(0, 18);
    let bestMove = searchCandidates[0];
    for (let depth = 1; depth <= 6; depth += 1) {
      const candidate = searchBestMove(board, player, searchCandidates, depth, legalMove, context, config);
      if (!candidate) break;
      bestMove = candidate;
    }
    return ensureLegalMove(board, player, bestMove, legalMove);
  }

  function hasWinningFollowUp(board, player, legalMove, context, scorer) {
    const followUps = collectCandidateMoves(board, player, legalMove, 12, context, scorer);
    if (followUps.length === 0 || context.aborted) return false;

    const winningMove = findWinningMove(board, player, followUps, context);
    if (winningMove) return true;

    return Boolean(findForkMove(board, player, followUps.slice(0, 10), legalMove, context));
  }

  function findForcingSequenceMove(board, player, candidates, legalMove, context, scorer) {
    const opponent = player === 1 ? 2 : 1;

    for (const move of candidates) {
      if (isExpired(context)) return null;

      board[move.row][move.column] = player;
      const opponentWinningMove = findWinningMove(
        board,
        opponent,
        collectCandidateMoves(board, opponent, legalMove, 10, context, scorer),
        context
      );
      if (opponentWinningMove) {
        board[move.row][move.column] = EMPTY;
        continue;
      }

      const opponentReplies = collectCandidateMoves(board, opponent, legalMove, 8, context, scorer);
      let forcing = opponentReplies.length === 0;

      for (const reply of opponentReplies) {
        if (isExpired(context)) {
          forcing = false;
          break;
        }

        board[reply.row][reply.column] = opponent;
        forcing = hasWinningFollowUp(board, player, legalMove, context, scorer);
        board[reply.row][reply.column] = EMPTY;

        if (!forcing || context.aborted) break;
      }

      board[move.row][move.column] = EMPTY;
      if (forcing && !context.aborted) return move;
    }

    return null;
  }

  function chooseAdvancedHardMove(board, player, legalMove, maxThinkMs) {
    const opponent = player === 1 ? 2 : 1;
    const context = createSearchContext(maxThinkMs);
    const config = {
      scorer: scoreMoveAdvanced,
      keyTag: "advanced",
      nodeCandidateLimit: 20,
      evalCandidateLimit: 16
    };
    const candidates = collectCandidateMoves(board, player, legalMove, 30, context, config.scorer);
    if (candidates.length === 0) return findAnyLegalMove(board, player, legalMove);

    const winningMove = findWinningMove(board, player, candidates, context);
    if (winningMove) return ensureLegalMove(board, player, winningMove, legalMove);

    const opponentCandidates = collectCandidateMoves(board, opponent, legalMove, 30, context, config.scorer);
    const blockingMove = findWinningMove(board, opponent, opponentCandidates, context);
    if (blockingMove) return ensureLegalMove(board, player, blockingMove, legalMove);

    const ownFork = findForkMove(board, player, candidates.slice(0, 22), legalMove, context);
    if (ownFork) return ensureLegalMove(board, player, ownFork, legalMove);

    const opponentFork = findForkMove(board, opponent, opponentCandidates.slice(0, 22), legalMove, context);
    if (opponentFork) return ensureLegalMove(board, player, opponentFork, legalMove);
    if (context.aborted) return ensureLegalMove(board, player, candidates[0], legalMove);

    const forcingMove = findForcingSequenceMove(board, player, candidates.slice(0, 10), legalMove, context, config.scorer);
    if (forcingMove) return ensureLegalMove(board, player, forcingMove, legalMove);

    const defensiveSequenceBlock = findForcingSequenceMove(board, opponent, opponentCandidates.slice(0, 10), legalMove, context, config.scorer);
    if (defensiveSequenceBlock) return ensureLegalMove(board, player, defensiveSequenceBlock, legalMove);
    if (context.aborted) return ensureLegalMove(board, player, candidates[0], legalMove);

    const searchCandidates = candidates.slice(0, 22);
    let bestMove = searchCandidates[0];
    const maxDepth = searchCandidates.length <= 10 ? 9 : 8;
    for (let depth = 1; depth <= maxDepth; depth += 1) {
      const candidate = searchBestMove(board, player, searchCandidates, depth, legalMove, context, config);
      if (!candidate) break;
      bestMove = candidate;
    }
    return ensureLegalMove(board, player, bestMove, legalMove);
  }

  function chooseMove(board, player, difficulty, options) {
    const legalMove = options && typeof options.isLegalMove === "function" ? options.isLegalMove : function () { return true; };
    const requestedThinkMs = options && Number.isFinite(options.maxThinkMs) ? options.maxThinkMs : null;

    if (difficulty === "easy") {
      return chooseEasyMove(board, player, legalMove);
    }

    if (difficulty === "medium") {
      return chooseStrategicMove(board, player, legalMove, requestedThinkMs ?? 280);
    }

    return chooseAdvancedHardMove(board, player, legalMove, requestedThinkMs ?? 320);
  }

  window.GomokuAI = {
    chooseMove: chooseMove,
    findLegalMove: function (board, player, legalMove) {
      const checker = typeof legalMove === "function" ? legalMove : function () { return true; };
      return findAnyLegalMove(board, player, checker);
    }
  };
}());
