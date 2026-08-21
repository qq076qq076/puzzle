(function () {
  "use strict";

  const BOARD_SIZE = 15;
  const WIN_LENGTH = 5;
  const EMPTY = 0;
  const BLACK = 1;
  const WHITE = 2;
  const DIRECTIONS = [
    { row: 1, column: 0 },
    { row: 0, column: 1 },
    { row: 1, column: 1 },
    { row: 1, column: -1 }
  ];

  const boardElement = document.getElementById("gomoku-board");
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

  function isInsideBoard(row, column) {
    return row >= 0 && row < BOARD_SIZE && column >= 0 && column < BOARD_SIZE;
  }

  function getCell(row, column) {
    return boardElement.querySelector('[data-row="' + row + '"][data-column="' + column + '"]');
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

  function countDirection(row, column, direction, player) {
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

  function getWinningLine(row, column, player) {
    for (const direction of DIRECTIONS) {
      const line = [{ row: row, column: column }];
      const forwardCount = countDirection(row, column, direction, player);
      const backwardDirection = { row: -direction.row, column: -direction.column };
      const backwardCount = countDirection(row, column, backwardDirection, player);

      for (let index = 1; index <= forwardCount; index += 1) {
        line.push({ row: row + direction.row * index, column: column + direction.column * index });
      }
      for (let index = 1; index <= backwardCount; index += 1) {
        line.push({ row: row - direction.row * index, column: column - direction.column * index });
      }

      if (line.length >= WIN_LENGTH) {
        return line;
      }
    }

    return null;
  }

  function updateCell(cell, player) {
    cell.dataset.player = player ? playerClass(player) : "empty";
    const row = Number(cell.dataset.row);
    const column = Number(cell.dataset.column);
    cell.setAttribute("aria-label", "第 " + (row + 1) + " 行，第 " + (column + 1) + " 列，" + (player ? playerName(player) : "空位"));
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
    board[row][column] = player;
    moveCount += 1;
    moveHistory.push({ row: row, column: column, player: player });
    updateCell(getCell(row, column), player);
    moveCountElement.textContent = String(moveCount) + " 手";

    const winningLine = getWinningLine(row, column, player);
    if (winningLine) {
      highlightWinningLine(winningLine);
      finishGame(playerName(player) + "獲勝！", "is-winner-" + playerClass(player));
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

      const move = window.GomokuAI.chooseMove(board, aiColor, difficulty);
      aiThinking = false;
      if (move) {
        applyMove(move.row, move.column, aiColor);
      } else {
        updateTurnDisplay();
      }
    }, 360);
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
    board = createEmptyBoard();
    currentPlayer = BLACK;
    moveCount = 0;
    gameOver = false;
    moveHistory = [];
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
    currentPlayer = gameMode === "computer" ? humanColor : (moveHistory.length > 0 ? (currentPlayer === BLACK ? WHITE : BLACK) : BLACK);
    gameOver = false;

    boardElement.querySelectorAll(".gomoku-cell").forEach(function (cell) {
      cell.classList.remove("is-winning");
    });
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
    syncSettingsControls();
    boardElement.querySelectorAll(".gomoku-cell").forEach(function (cell) {
      const value = board[Number(cell.dataset.row)][Number(cell.dataset.column)];
      cell.classList.remove("is-winning");
      updateCell(cell, value);
    });
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
  newGameButton.addEventListener("click", resetGame);
  gameModeElement.addEventListener("change", changeSettings);
  difficultyElement.addEventListener("change", changeSettings);
  humanColorElement.addEventListener("change", changeSettings);
  createBoard();
  window.PuzzleSave.create({
    key: "gomoku",
    fresh: resetGame,
    restore: restoreGame,
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
