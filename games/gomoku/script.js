(function () {
  "use strict";

  const BOARD_SIZE = 15;
  const EMPTY = 0;
  const BLACK = 1;
  const WHITE = 2;
  const AI_MOVE_INTERVAL = 360;

  const boardElement = document.getElementById("gomoku-board");
  const gomokuPanel = document.querySelector(".gomoku-panel");
  const statusElement = document.getElementById("gomoku-status");
  const playerLabelElement = document.getElementById("current-player-label");
  const moveCountElement = document.getElementById("move-count");
  const undoButton = document.getElementById("undo-gomoku-move");
  const newGameButton = document.getElementById("new-gomoku-game");
  const gameModeElement = document.getElementById("gomoku-game-mode");
  const computerSettingsElement = document.getElementById("gomoku-computer-settings");
  const difficultyElement = document.getElementById("gomoku-difficulty");
  const humanColorElement = document.getElementById("gomoku-human-color");

  let board = [];
  let currentPlayer = BLACK;
  let moveCount = 0;
  let gameOver = false;
  let moveHistory = [];
  let gameMode = "local";
  let difficulty = "medium";
  let humanColor = BLACK;
  let aiColor = WHITE;
  let aiThinking = false;
  let aiTimerId = null;
  let aiTurnToken = 0;
  let victoryCover = null;
  let saveController = null;

  function getNow() {
    return window.performance && typeof window.performance.now === "function" ? window.performance.now() : Date.now();
  }

  function createEmptyBoard() {
    return Array.from({ length: BOARD_SIZE }, function () {
      return Array(BOARD_SIZE).fill(EMPTY);
    });
  }

  function serializeBoard() {
    return board.reduce(function (cells, row) {
      return cells.concat(row);
    }, []);
  }

  function deserializeBoard(savedBoard) {
    if (savedBoard.length === BOARD_SIZE * BOARD_SIZE && !Array.isArray(savedBoard[0])) {
      return Array.from({ length: BOARD_SIZE }, function (_, row) {
        return savedBoard.slice(row * BOARD_SIZE, (row + 1) * BOARD_SIZE);
      });
    }
    return savedBoard.map(function (row) { return row.slice(); });
  }

  function playerName(player) {
    return player === BLACK ? "黑棋" : "白棋";
  }

  function playerClass(player) {
    return player === BLACK ? "black" : "white";
  }

  function getCell(row, column) {
    return boardElement.querySelector('[data-row="' + row + '"][data-column="' + column + '"]');
  }

  function createMoveOrderMap() {
    const moveOrderMap = createEmptyBoard();
    moveHistory.forEach(function (move, index) {
      if (moveOrderMap[move.row][move.column] === EMPTY) {
        moveOrderMap[move.row][move.column] = index + 1;
      }
    });
    return moveOrderMap;
  }

  function createBoard() {
    boardElement.innerHTML = "";

    for (let row = 0; row < BOARD_SIZE; row += 1) {
      for (let column = 0; column < BOARD_SIZE; column += 1) {
        const cell = document.createElement("button");
        cell.className = "gomoku-cell";
        cell.type = "button";
        cell.dataset.row = String(row);
        cell.dataset.column = String(column);
        cell.setAttribute("role", "gridcell");
        cell.setAttribute("aria-label", "第 " + (row + 1) + " 行，第 " + (column + 1) + " 列，空位");

        if ([3, 7, 11].includes(row) && [3, 7, 11].includes(column)) {
          const starPoint = document.createElement("span");
          starPoint.className = "gomoku-star";
          starPoint.setAttribute("aria-hidden", "true");
          cell.appendChild(starPoint);
        }

        boardElement.appendChild(cell);
      }
    }
  }

  function updateCell(cell, player, moveNumber) {
    cell.classList.remove("is-forbidden");
    cell.dataset.player = player ? playerClass(player) : "empty";
    const row = Number(cell.dataset.row);
    const column = Number(cell.dataset.column);
    let moveNumberElement = cell.querySelector(".gomoku-move-number");

    if (!player) {
      if (moveNumberElement) moveNumberElement.remove();
    } else if (moveNumber) {
      if (!moveNumberElement) {
        moveNumberElement = document.createElement("span");
        moveNumberElement.className = "gomoku-move-number";
        moveNumberElement.setAttribute("aria-hidden", "true");
        cell.appendChild(moveNumberElement);
      }
      moveNumberElement.textContent = moveNumber ? String(moveNumber) : "";
    }

    const orderLabel = moveNumber ? "，第 " + moveNumber + " 手" : "";
    cell.setAttribute("aria-label", "第 " + (row + 1) + " 行，第 " + (column + 1) + " 列，" + (player ? playerName(player) + orderLabel : "空位"));
  }

  function updateTurnDisplay() {
    const name = playerName(currentPlayer);
    const computerTurn = gameMode === "computer" && currentPlayer === aiColor;
    playerLabelElement.textContent = computerTurn ? "電腦・" + name : name;
    playerLabelElement.dataset.player = playerClass(currentPlayer);
    statusElement.className = "gomoku-status is-" + playerClass(currentPlayer);
    statusElement.textContent = aiThinking ? "電腦思考中…" : (computerTurn ? "電腦回合，請稍候。" : name + "回合，請落子。");
    moveCountElement.textContent = String(moveCount) + " 手";
    undoButton.disabled = moveHistory.length === 0 || aiThinking;
    computerSettingsElement.hidden = gameMode !== "computer";
  }

  function highlightWinningLine(line) {
    line.forEach(function (position) {
      const cell = getCell(position.row, position.column);
      if (cell) {
        cell.classList.add("is-winning");
      }
    });
  }

  function finishGame(message, statusClass) {
    gameOver = true;
    aiThinking = false;
    statusElement.className = "gomoku-status " + statusClass;
    statusElement.textContent = message;
    gomokuPanel.classList.toggle("is-finished", statusClass.indexOf("is-winner-") === 0);
  }

  function finishWinner(message, statusClass) {
    finishGame(message, statusClass);
    showVictoryDialog(message);
  }

  function closeVictoryDialog() {
    if (!victoryCover) return;
    victoryCover.remove();
    victoryCover = null;
  }

  function showVictoryDialog(message) {
    closeVictoryDialog();
    const cover = document.createElement("div");
    cover.className = "gomoku-result-cover";
    cover.setAttribute("role", "dialog");
    cover.setAttribute("aria-modal", "true");
    cover.setAttribute("aria-labelledby", "gomoku-result-title");

    const dialog = document.createElement("div");
    dialog.className = "gomoku-result-dialog";
    const kicker = document.createElement("p");
    kicker.className = "gomoku-result-kicker";
    kicker.textContent = "GAME OVER";
    const title = document.createElement("h2");
    title.id = "gomoku-result-title";
    title.textContent = "恭喜！";
    const result = document.createElement("p");
    result.className = "gomoku-result-message";
    result.textContent = message;
    const actions = document.createElement("div");
    actions.className = "gomoku-result-actions";

    const viewButton = document.createElement("button");
    viewButton.className = "button button-quiet";
    viewButton.type = "button";
    viewButton.dataset.action = "view";
    viewButton.textContent = "觀看棋盤";
    const newGameButtonElement = document.createElement("button");
    newGameButtonElement.className = "button button-primary";
    newGameButtonElement.type = "button";
    newGameButtonElement.dataset.action = "new";
    newGameButtonElement.textContent = "開新一局";

    actions.append(viewButton, newGameButtonElement);
    dialog.append(kicker, title, result, actions);
    cover.appendChild(dialog);
    document.body.appendChild(cover);
    victoryCover = cover;

    cover.addEventListener("click", function (event) {
      const actionButton = event.target.closest("button[data-action]");
      if (!actionButton) return;
      if (actionButton.dataset.action === "new") {
        startNewGame();
      } else {
        closeVictoryDialog();
      }
    });
    viewButton.focus();
  }

  function cancelComputerTurn() {
    if (aiTimerId !== null) {
      window.clearTimeout(aiTimerId);
      aiTimerId = null;
    }
    aiThinking = false;
    aiTurnToken += 1;
  }

  function isHumanTurn() {
    return gameMode !== "computer" || currentPlayer === humanColor;
  }

  function applyMove(row, column, player) {
    const analysis = window.GomokuRules.analyzeMove(board, row, column, player);
    if (!analysis.legal && !analysis.forbidden) {
      return false;
    }

    board[row][column] = player;
    moveCount += 1;
    moveHistory.push({ row: row, column: column, player: player });
    updateCell(getCell(row, column), player, moveCount);
    moveCountElement.textContent = String(moveCount) + " 手";

    if (analysis.forbidden) {
      getCell(row, column).classList.add("is-forbidden");
      finishWinner("黑棋禁手（" + analysis.forbiddenType + "），白棋獲勝！", "is-winner-white");
      return false;
    }

    if (analysis.wins) {
      highlightWinningLine(analysis.winningLine);
      finishWinner(playerName(player) + "獲勝！", "is-winner-" + playerClass(player));
      return false;
    }

    if (moveCount === BOARD_SIZE * BOARD_SIZE) {
      finishGame("和棋！棋盤已填滿。", "is-draw");
      return false;
    }

    currentPlayer = currentPlayer === BLACK ? WHITE : BLACK;
    updateTurnDisplay();
    return true;
  }

  function scheduleComputerTurn() {
    if (gameMode !== "computer" || gameOver || currentPlayer !== aiColor) {
      return;
    }

    cancelComputerTurn();
    aiThinking = true;
    updateTurnDisplay();
    const token = aiTurnToken;
    aiTimerId = window.setTimeout(function () {
      aiTimerId = null;
      if (token !== aiTurnToken || gameOver || currentPlayer !== aiColor) {
        return;
      }

      const moveStartedAt = getNow();
      const move = window.GomokuAI.chooseMove(board, aiColor, difficulty, {
        maxThinkMs: AI_MOVE_INTERVAL - 60,
        isLegalMove: function (nextBoard, row, column, player) {
          return window.GomokuRules.isLegalMove(nextBoard, row, column, player);
        }
      });
      const remainingDelay = Math.max(0, AI_MOVE_INTERVAL - (getNow() - moveStartedAt));
      aiTimerId = window.setTimeout(function () {
        aiTimerId = null;
        if (token !== aiTurnToken || gameOver || currentPlayer !== aiColor) {
          return;
        }
        aiThinking = false;
        if (move) {
          applyMove(move.row, move.column, aiColor);
        } else {
          updateTurnDisplay();
        }
      }, remainingDelay);
    }, 0);
  }

  function handleMove(row, column) {
    if (gameOver || aiThinking || !isHumanTurn() || board[row][column] !== EMPTY) {
      return;
    }

    if (applyMove(row, column, currentPlayer) && currentPlayer === aiColor) {
      scheduleComputerTurn();
    }
  }

  function resetGame() {
    cancelComputerTurn();
    closeVictoryDialog();
    board = createEmptyBoard();
    currentPlayer = BLACK;
    moveCount = 0;
    gameOver = false;
    moveHistory = [];
    gomokuPanel.classList.remove("is-finished");
    boardElement.querySelectorAll(".gomoku-cell").forEach(function (cell) {
      cell.classList.remove("is-winning");
      updateCell(cell, EMPTY);
    });
    updateTurnDisplay();
    if (gameMode === "computer" && currentPlayer === aiColor) {
      scheduleComputerTurn();
    }
  }

  function removeLastMove() {
    const lastMove = moveHistory.pop();
    board[lastMove.row][lastMove.column] = EMPTY;
    moveCount -= 1;
    updateCell(getCell(lastMove.row, lastMove.column), EMPTY);
  }

  function startNewGame() {
    closeVictoryDialog();
    if (saveController) saveController.clear();
    resetGame();
    if (saveController) saveController.save(true);
  }

  function undoMove() {
    if (moveHistory.length === 0 || aiThinking) {
      return;
    }

    cancelComputerTurn();
    const lastPlayer = moveHistory[moveHistory.length - 1].player;
    removeLastMove();
    if (gameMode === "computer" && lastPlayer === aiColor && moveHistory.length > 0 && moveHistory[moveHistory.length - 1].player === humanColor) {
      removeLastMove();
    }
    currentPlayer = gameMode === "computer" ? humanColor : lastPlayer;
    gameOver = false;

    boardElement.querySelectorAll(".gomoku-cell").forEach(function (cell) {
      cell.classList.remove("is-winning");
    });
    gomokuPanel.classList.remove("is-finished");
    updateTurnDisplay();
  }

  function syncSettingsControls() {
    gameModeElement.value = gameMode;
    difficultyElement.value = difficulty;
    humanColorElement.value = String(humanColor);
    computerSettingsElement.hidden = gameMode !== "computer";
  }

  function changeSettings() {
    const nextMode = gameModeElement.value === "computer" ? "computer" : "local";
    const nextDifficulty = ["easy", "medium", "hard"].includes(difficultyElement.value) ? difficultyElement.value : "medium";
    const nextHumanColor = Number(humanColorElement.value) === WHITE ? WHITE : BLACK;
    const changed = nextMode !== gameMode || nextDifficulty !== difficulty || nextHumanColor !== humanColor;

    if (!changed) {
      updateTurnDisplay();
      return;
    }
    if (moveCount > 0 && !window.confirm("切換設定會重新開始本局，確定要繼續嗎？")) {
      syncSettingsControls();
      return;
    }

    gameMode = nextMode;
    difficulty = nextDifficulty;
    humanColor = nextHumanColor;
    aiColor = humanColor === BLACK ? WHITE : BLACK;
    syncSettingsControls();
    resetGame();
  }

  function restoreGame(saved) {
    cancelComputerTurn();
    gameMode = saved.gameMode === "computer" ? "computer" : "local";
    difficulty = ["easy", "medium", "hard"].includes(saved.difficulty) ? saved.difficulty : "medium";
    humanColor = Number(saved.humanColor) === WHITE ? WHITE : BLACK;
    aiColor = humanColor === BLACK ? WHITE : BLACK;
    board = deserializeBoard(saved.board);
    currentPlayer = saved.currentPlayer;
    moveCount = saved.moveCount;
    gameOver = Boolean(saved.gameOver);
    moveHistory = Array.isArray(saved.history) ? saved.history.map(function (move) {
      return { row: move.row, column: move.column, player: move.player };
    }) : [];
    const moveOrderMap = createMoveOrderMap();
    syncSettingsControls();
    boardElement.querySelectorAll(".gomoku-cell").forEach(function (cell) {
      const value = board[Number(cell.dataset.row)][Number(cell.dataset.column)];
      cell.classList.remove("is-winning");
      updateCell(cell, value, moveOrderMap[Number(cell.dataset.row)][Number(cell.dataset.column)]);
    });
    gomokuPanel.classList.toggle("is-finished", gameOver && (saved.statusClass || "").indexOf("is-winner-") === 0);
    updateTurnDisplay();
    if (gameOver) {
      statusElement.className = saved.statusClass || "gomoku-status is-draw";
      statusElement.textContent = saved.statusText || "本局已結束。";
    } else if (gameMode === "computer" && currentPlayer === aiColor) {
      scheduleComputerTurn();
    }
  }

  boardElement.addEventListener("click", function (event) {
    const cell = event.target.closest(".gomoku-cell");
    if (!cell) {
      return;
    }
    handleMove(Number(cell.dataset.row), Number(cell.dataset.column));
  });

  undoButton.addEventListener("click", undoMove);
  newGameButton.addEventListener("click", startNewGame);
  gameModeElement.addEventListener("change", changeSettings);
  difficultyElement.addEventListener("change", changeSettings);
  humanColorElement.addEventListener("change", changeSettings);
  createBoard();
  saveController = window.PuzzleSave.create({
    key: "gomoku",
    fresh: resetGame,
    restore: restoreGame,
    hasProgress: function (saved) {
      return Boolean(saved && Array.isArray(saved.history) && saved.history.length > 0);
    },
    validate: function (saved) {
      const boardIsNested = Array.isArray(saved?.board) && saved.board.length === BOARD_SIZE &&
        saved.board.every(function (row) { return Array.isArray(row) && row.length === BOARD_SIZE; });
      const boardIsFlat = Array.isArray(saved?.board) && saved.board.length === BOARD_SIZE * BOARD_SIZE &&
        saved.board.every(function (cell) { return !Array.isArray(cell); });
      return saved && (boardIsNested || boardIsFlat) &&
        [BLACK, WHITE].includes(saved.currentPlayer) && Number.isInteger(saved.moveCount) &&
        (!saved.history || (Array.isArray(saved.history) && saved.history.every(function (move) {
          return move && Number.isInteger(move.row) && move.row >= 0 && move.row < BOARD_SIZE &&
            Number.isInteger(move.column) && move.column >= 0 && move.column < BOARD_SIZE &&
            [BLACK, WHITE].includes(move.player);
        })));
    },
    getState: function () {
      return {
        board: serializeBoard(),
        currentPlayer: currentPlayer,
        moveCount: moveCount,
        gameOver: gameOver,
        history: moveHistory,
        gameMode: gameMode,
        difficulty: difficulty,
        humanColor: humanColor,
        aiColor: aiColor,
        statusClass: statusElement.className,
        statusText: statusElement.textContent
      };
    }
  });
}());
