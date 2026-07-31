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
  const newGameButton = document.getElementById("new-gomoku-game");

  let board = [];
  let currentPlayer = BLACK;
  let moveCount = 0;
  let gameOver = false;

  function createEmptyBoard() {
    return Array.from({ length: BOARD_SIZE }, function () {
      return Array(BOARD_SIZE).fill(EMPTY);
    });
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
    playerLabelElement.textContent = name;
    playerLabelElement.dataset.player = playerClass(currentPlayer);
    statusElement.className = "gomoku-status is-" + playerClass(currentPlayer);
    statusElement.textContent = name + "回合，請落子。";
    moveCountElement.textContent = String(moveCount) + " 手";
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
    statusElement.className = "gomoku-status " + statusClass;
    statusElement.textContent = message;
  }

  function handleMove(row, column) {
    if (gameOver || board[row][column] !== EMPTY) {
      return;
    }

    board[row][column] = currentPlayer;
    moveCount += 1;
    updateCell(getCell(row, column), currentPlayer);
    moveCountElement.textContent = String(moveCount) + " 手";

    const winningLine = getWinningLine(row, column, currentPlayer);
    if (winningLine) {
      highlightWinningLine(winningLine);
      finishGame(playerName(currentPlayer) + "獲勝！", "is-winner-" + playerClass(currentPlayer));
      return;
    }

    if (moveCount === BOARD_SIZE * BOARD_SIZE) {
      finishGame("和棋！棋盤已填滿。", "is-draw");
      return;
    }

    currentPlayer = currentPlayer === BLACK ? WHITE : BLACK;
    updateTurnDisplay();
  }

  function resetGame() {
    board = createEmptyBoard();
    currentPlayer = BLACK;
    moveCount = 0;
    gameOver = false;
    boardElement.querySelectorAll(".gomoku-cell").forEach(function (cell) {
      cell.classList.remove("is-winning");
      updateCell(cell, EMPTY);
    });
    updateTurnDisplay();
  }

  boardElement.addEventListener("click", function (event) {
    const cell = event.target.closest(".gomoku-cell");
    if (!cell) {
      return;
    }
    handleMove(Number(cell.dataset.row), Number(cell.dataset.column));
  });

  newGameButton.addEventListener("click", resetGame);
  createBoard();
  resetGame();
}());
