(function () {
  "use strict";

  const SIZE = 4;
  const WINNING_TILE = 2048;
  const MOVE_DURATION = 150;
  const BEST_SCORE_KEY = "2048-best-score";
  const DIRECTIONS = {
    up: "up",
    right: "right",
    down: "down",
    left: "left"
  };

  const boardElement = document.getElementById("board");
  const tileLayerElement = document.getElementById("tile-layer");
  const boardShellElement = document.getElementById("board-shell");
  const scoreElement = document.getElementById("score");
  const bestScoreElement = document.getElementById("best-score");
  const newGameButton = document.getElementById("new-game");
  const messageElement = document.getElementById("message");
  const messageKickerElement = document.getElementById("message-kicker");
  const messageTitleElement = document.getElementById("message-title");
  const messageDescriptionElement = document.getElementById("message-description");
  const keepPlayingButton = document.getElementById("keep-playing");
  const messageNewGameButton = document.getElementById("message-new-game");

  let board = [];
  let score = 0;
  let bestScore = readBestScore();
  let hasWon = false;
  let keepPlaying = false;
  let touchStart = null;
  let isAnimating = false;
  let animationFrame = null;
  let animationTimer = null;

  function emptyBoard() {
    return Array.from({ length: SIZE }, function () {
      return Array(SIZE).fill(0);
    });
  }

  function readBestScore() {
    try {
      return Number.parseInt(window.localStorage.getItem(BEST_SCORE_KEY), 10) || 0;
    } catch (error) {
      return 0;
    }
  }

  function saveBestScore() {
    try {
      window.localStorage.setItem(BEST_SCORE_KEY, String(bestScore));
    } catch (error) {
      // The game remains fully playable when storage is unavailable.
    }
  }

  function newGame() {
    cancelMoveAnimation();
    board = emptyBoard();
    score = 0;
    hasWon = false;
    keepPlaying = false;
    hideMessage();
    spawnTile();
    spawnTile();
    render();
  }

  function restoreGame(saved) {
    cancelMoveAnimation();
    board = saved.board.map(function (row) { return row.slice(); });
    score = saved.score;
    hasWon = Boolean(saved.hasWon);
    keepPlaying = Boolean(saved.keepPlaying);
    hideMessage();
    render();
    if (hasWon && !keepPlaying) showWinMessage();
    else if (!movesAvailable()) showGameOverMessage();
  }

  function spawnTile() {
    const availableCells = [];

    board.forEach(function (row, rowIndex) {
      row.forEach(function (value, columnIndex) {
        if (value === 0) {
          availableCells.push({ row: rowIndex, column: columnIndex });
        }
      });
    });

    if (availableCells.length === 0) {
      return;
    }

    const cell = availableCells[Math.floor(Math.random() * availableCells.length)];
    board[cell.row][cell.column] = Math.random() < 0.9 ? 2 : 4;
    return cell;
  }

  function getOrderedPositions(direction, index) {
    const positions = [];
    const isHorizontal = direction === DIRECTIONS.left || direction === DIRECTIONS.right;
    const isReversed = direction === DIRECTIONS.right || direction === DIRECTIONS.down;

    for (let offset = 0; offset < SIZE; offset += 1) {
      const lineOffset = isReversed ? SIZE - 1 - offset : offset;
      positions.push(isHorizontal
        ? { row: index, column: lineOffset }
        : { row: lineOffset, column: index });
    }
    return positions;
  }

  function getDestination(direction, index, outputIndex) {
    const isHorizontal = direction === DIRECTIONS.left || direction === DIRECTIONS.right;
    const isReversed = direction === DIRECTIONS.right || direction === DIRECTIONS.down;
    const lineOffset = isReversed ? SIZE - 1 - outputIndex : outputIndex;

    return isHorizontal
      ? { row: index, column: lineOffset }
      : { row: lineOffset, column: index };
  }

  function buildMove(direction) {
    const nextBoard = emptyBoard();
    const transitions = [];
    const mergedDestinations = [];
    let gained = 0;

    for (let index = 0; index < SIZE; index += 1) {
      const orderedPositions = getOrderedPositions(direction, index).filter(function (position) {
        return board[position.row][position.column] !== 0;
      });
      let sourceIndex = 0;
      let outputIndex = 0;

      while (sourceIndex < orderedPositions.length) {
        const source = orderedPositions[sourceIndex];
        const nextSource = orderedPositions[sourceIndex + 1];
        const sourceValue = board[source.row][source.column];
        const destination = getDestination(direction, index, outputIndex);

        if (nextSource && sourceValue === board[nextSource.row][nextSource.column]) {
          const mergedValue = sourceValue * 2;
          nextBoard[destination.row][destination.column] = mergedValue;
          transitions.push({ from: source, to: destination });
          transitions.push({ from: nextSource, to: destination });
          mergedDestinations.push(destination);
          gained += mergedValue;
          sourceIndex += 2;
        } else {
          nextBoard[destination.row][destination.column] = sourceValue;
          transitions.push({ from: source, to: destination });
          sourceIndex += 1;
        }
        outputIndex += 1;
      }
    }

    return {
      nextBoard: nextBoard,
      transitions: transitions,
      mergedDestinations: mergedDestinations,
      gained: gained
    };
  }

  function boardsAreEqual(firstBoard, secondBoard) {
    return firstBoard.every(function (row, rowIndex) {
      return row.every(function (value, columnIndex) {
        return value === secondBoard[rowIndex][columnIndex];
      });
    });
  }

  function move(direction) {
    if (isAnimating || (hasWon && !keepPlaying)) {
      return;
    }

    const moveResult = buildMove(direction);

    if (boardsAreEqual(board, moveResult.nextBoard)) {
      return;
    }

    board = moveResult.nextBoard;
    score += moveResult.gained;
    if (score > bestScore) {
      bestScore = score;
      saveBestScore();
    }
    const spawnedPosition = spawnTile();
    animateMove(moveResult.transitions, spawnedPosition, moveResult.mergedDestinations);
  }

  function cancelMoveAnimation() {
    if (animationFrame !== null) {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = null;
    }
    if (animationTimer !== null) {
      window.clearTimeout(animationTimer);
      animationTimer = null;
    }
    tileLayerElement.querySelectorAll(".tile").forEach(function (tileElement) {
      tileElement.classList.remove("is-moving");
      tileElement.style.transition = "";
      tileElement.style.left = "";
      tileElement.style.top = "";
      tileElement.style.transform = "";
    });
    isAnimating = false;
  }

  function getTileMetrics() {
    const layerRect = tileLayerElement.getBoundingClientRect();
    const styles = window.getComputedStyle(boardElement);
    const columnGap = Number.parseFloat(styles.columnGap) || 0;
    const cellSize = (layerRect.width - columnGap * (SIZE - 1)) / SIZE;
    return { cellSize: cellSize, step: cellSize + columnGap };
  }

  function animateMove(transitions, spawnedPosition, mergedDestinations) {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) {
      finishMove(spawnedPosition, mergedDestinations);
      return;
    }

    isAnimating = true;
    const metrics = getTileMetrics();
    const movingTiles = [];

    transitions.forEach(function (transition) {
      const tileElement = tileLayerElement.querySelector(
        '[data-row="' + transition.from.row + '"][data-column="' + transition.from.column + '"]'
      );
      if (!tileElement) {
        return;
      }

      tileElement.classList.add("is-moving");
      tileElement.style.transition = "none";
      tileElement.style.left = String(transition.to.column * metrics.step) + "px";
      tileElement.style.top = String(transition.to.row * metrics.step) + "px";
      tileElement.style.transform = "translate3d(" +
        ((transition.from.column - transition.to.column) * metrics.step) + "px, " +
        ((transition.from.row - transition.to.row) * metrics.step) + "px, 0)";
      movingTiles.push(tileElement);
    });

    tileLayerElement.offsetWidth;
    animationFrame = window.requestAnimationFrame(function () {
      movingTiles.forEach(function (tileElement) {
        tileElement.style.transition = "";
        tileElement.style.transform = "translate3d(0, 0, 0)";
      });
      animationFrame = null;
    });

    animationTimer = window.setTimeout(function () {
      movingTiles.forEach(function (tileElement) {
        tileElement.classList.remove("is-moving");
        tileElement.style.transform = "";
      });
      animationTimer = null;
      finishMove(spawnedPosition, mergedDestinations);
    }, MOVE_DURATION + 35);
  }

  function finishMove(spawnedPosition, mergedDestinations) {
    render({
      spawnedPosition: spawnedPosition,
      mergedDestinations: mergedDestinations
    });
    isAnimating = false;

    if (!hasWon && board.some(function (row) {
      return row.some(function (value) { return value >= WINNING_TILE; });
    })) {
      hasWon = true;
      showWinMessage();
      return;
    }

    if (!movesAvailable()) {
      showGameOverMessage();
    }
  }

  function movesAvailable() {
    for (let row = 0; row < SIZE; row += 1) {
      for (let column = 0; column < SIZE; column += 1) {
        if (board[row][column] === 0) {
          return true;
        }
        if (column + 1 < SIZE && board[row][column] === board[row][column + 1]) {
          return true;
        }
        if (row + 1 < SIZE && board[row][column] === board[row + 1][column]) {
          return true;
        }
      }
    }
    return false;
  }

  function render(options) {
    const renderOptions = options || {};
    const spawnedPosition = renderOptions.spawnedPosition;
    const mergedDestinations = renderOptions.mergedDestinations || [];
    const metrics = getTileMetrics();

    scoreElement.textContent = String(score);
    bestScoreElement.textContent = String(bestScore);
    tileLayerElement.innerHTML = "";

    board.forEach(function (row, rowIndex) {
      row.forEach(function (value, columnIndex) {
        if (value === 0) {
          return;
        }

        const tileElement = document.createElement("div");
        tileElement.className = "tile";
        tileElement.dataset.value = String(value);
        tileElement.dataset.row = String(rowIndex);
        tileElement.dataset.column = String(columnIndex);
        tileElement.style.width = String(metrics.cellSize) + "px";
        tileElement.style.height = String(metrics.cellSize) + "px";
        tileElement.style.left = String(columnIndex * metrics.step) + "px";
        tileElement.style.top = String(rowIndex * metrics.step) + "px";
        if (spawnedPosition && spawnedPosition.row === rowIndex && spawnedPosition.column === columnIndex) {
          tileElement.classList.add("tile-new");
        }
        if (mergedDestinations.some(function (position) {
          return position.row === rowIndex && position.column === columnIndex;
        })) {
          tileElement.classList.add("tile-merged");
        }
        tileElement.textContent = String(value);
        tileLayerElement.appendChild(tileElement);
      });
    });

    const boardDescription = board.map(function (row) {
      return row.map(function (value) { return value || "空格"; }).join(", ");
    }).join("；");
    boardElement.setAttribute("aria-label", "2048 棋盤，目前數字：" + boardDescription);
  }

  function showWinMessage() {
    messageKickerElement.textContent = "NICE WORK";
    messageTitleElement.textContent = "你達成了 2048！";
    messageDescriptionElement.textContent = "很漂亮。還要繼續挑戰更高的數字嗎？";
    keepPlayingButton.hidden = false;
    messageElement.hidden = false;
  }

  function showGameOverMessage() {
    messageKickerElement.textContent = "NO MORE MOVES";
    messageTitleElement.textContent = "棋盤滿了。";
    messageDescriptionElement.textContent = "沒有可以合併的方塊了，再試一次吧。";
    keepPlayingButton.hidden = true;
    messageElement.hidden = false;
  }

  function hideMessage() {
    messageElement.hidden = true;
  }

  function directionFromKey(key) {
    const keyMap = {
      ArrowUp: DIRECTIONS.up,
      ArrowRight: DIRECTIONS.right,
      ArrowDown: DIRECTIONS.down,
      ArrowLeft: DIRECTIONS.left,
      w: DIRECTIONS.up,
      d: DIRECTIONS.right,
      s: DIRECTIONS.down,
      a: DIRECTIONS.left
    };
    return keyMap[key] || keyMap[key.toLowerCase()];
  }

  function directionFromSwipe(deltaX, deltaY) {
    const minimumSwipe = 24;
    if (Math.max(Math.abs(deltaX), Math.abs(deltaY)) < minimumSwipe) {
      return null;
    }
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      return deltaX > 0 ? DIRECTIONS.right : DIRECTIONS.left;
    }
    return deltaY > 0 ? DIRECTIONS.down : DIRECTIONS.up;
  }

  function handlePointerDown(event) {
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }
    touchStart = { x: event.clientX, y: event.clientY };
  }

  function handlePointerUp(event) {
    if (!touchStart || event.target.closest("button")) {
      touchStart = null;
      return;
    }
    const direction = directionFromSwipe(event.clientX - touchStart.x, event.clientY - touchStart.y);
    touchStart = null;
    if (direction) {
      move(direction);
    }
  }

  document.addEventListener("keydown", function (event) {
    const direction = directionFromKey(event.key);
    if (!direction) {
      return;
    }
    event.preventDefault();
    move(direction);
  });

  boardShellElement.addEventListener("pointerdown", handlePointerDown);
  boardShellElement.addEventListener("pointerup", handlePointerUp);
  boardShellElement.addEventListener("pointercancel", function () { touchStart = null; });
  window.addEventListener("resize", function () {
    if (!isAnimating) {
      render();
    }
  });
  newGameButton.addEventListener("click", newGame);
  messageNewGameButton.addEventListener("click", newGame);
  keepPlayingButton.addEventListener("click", function () {
    keepPlaying = true;
    hideMessage();
  });

  for (let index = 0; index < SIZE * SIZE; index += 1) {
    const cell = document.createElement("div");
    cell.className = "cell";
    cell.setAttribute("role", "gridcell");
    cell.setAttribute("aria-hidden", "true");
    boardElement.appendChild(cell);
  }

  window.PuzzleSave.create({
    key: "2048",
    fresh: newGame,
    restore: restoreGame,
    validate: function (saved) {
      return saved && Array.isArray(saved.board) && saved.board.length === SIZE &&
        saved.board.every(function (row) { return Array.isArray(row) && row.length === SIZE; }) && Number.isFinite(saved.score);
    },
    getState: function () { return { board: board, score: score, hasWon: hasWon, keepPlaying: keepPlaying }; }
  });
}());
