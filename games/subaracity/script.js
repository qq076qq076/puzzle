(function () {
  "use strict";

  const BOARD_ROWS = 5;
  const BOARD_COLUMNS = 6;
  const WHITE_LEVEL = 10;
  const MAYOR_REWARD_LEVEL = 15;
  const MERGE_DURATION = 260;
  const RESULT_PAUSE_DURATION = 170;
  const FALL_DURATION = 138;
  const START_YEAR = 2000;
  const START_MAYOR_MARKS = 2;
  const BEST_SCORE_KEY = "puzzle-club-subaracity-best-population-v2";
  const BUILDING_ASSETS = [
    "assets/building-a.png",
    "assets/building-b.png",
    "assets/building-c.png",
    "assets/building-d.png",
    "assets/building-e.png",
    "assets/building-f.png"
  ];
  const COLORS = [
    { id: "lime", label: "黃綠色" },
    { id: "green", label: "綠色" },
    { id: "brown", label: "棕色" },
    { id: "gray", label: "灰色" },
    { id: "white", label: "白色" }
  ];
  const DIRECTIONS = [[-1, 0], [1, 0], [0, -1], [0, 1]];

  const boardElement = document.getElementById("city-board");
  const yearElement = document.getElementById("year");
  const populationElement = document.getElementById("population");
  const highestLevelElement = document.getElementById("highest-level");
  const bestPopulationElement = document.getElementById("best-population");
  const statusElement = document.getElementById("city-status");
  const mayorButton = document.getElementById("mayor-button");
  const mayorCountElement = document.getElementById("mayor-count");
  const mayorHintElement = document.getElementById("mayor-hint");
  const restartButton = document.getElementById("restart-game");
  const gameoverElement = document.getElementById("city-gameover");
  const gameoverDescriptionElement = document.getElementById("gameover-description");
  const gameoverRestartButton = document.getElementById("gameover-restart");

  let board = [];
  let year = START_YEAR;
  let population = 0;
  let highestLevel = 1;
  let bestPopulation = readBestPopulation();
  let mayorMarks = START_MAYOR_MARKS;
  let mayorMode = false;
  let gameOver = false;
  let isAnimating = false;

  function readBestPopulation() {
    try {
      return Number(window.localStorage.getItem(BEST_SCORE_KEY)) || 0;
    } catch (error) {
      return 0;
    }
  }

  function saveBestPopulation() {
    try {
      window.localStorage.setItem(BEST_SCORE_KEY, String(bestPopulation));
    } catch (error) {
      // 儲存功能被瀏覽器限制時，仍保留本局遊戲。
    }
  }

  function formatNumber(number) {
    return number.toLocaleString("en-US");
  }

  function createEmptyBoard() {
    return Array.from({ length: BOARD_ROWS }, function () {
      return Array(BOARD_COLUMNS).fill(null);
    });
  }

  function getAvailableColors() {
    // 原作一般模式使用四種顏色；白色只保留給 Lv.10 以上建築。
    return COLORS.slice(0, 4);
  }

  function createRandomTile() {
    const availableColors = getAvailableColors();
    const color = availableColors[Math.floor(Math.random() * availableColors.length)];
    return { color: color.id, level: 1 };
  }

  function seedBoard() {
    let attempt = 0;
    do {
      board = createEmptyBoard();
      for (let row = 0; row < BOARD_ROWS; row += 1) {
        for (let column = 0; column < BOARD_COLUMNS; column += 1) {
          board[row][column] = createRandomTile();
        }
      }
      attempt += 1;
    } while (!hasAvailableMerge() && attempt < 30);
  }

  function getColor(colorId) {
    return COLORS.find(function (color) {
      return color.id === colorId;
    }) || COLORS[0];
  }

  function getGroup(row, column) {
    const startTile = board[row] && board[row][column];
    if (!startTile) {
      return [];
    }

    const group = [];
    const visited = new Set();
    const queue = [[row, column]];
    visited.add(row + ":" + column);

    while (queue.length > 0) {
      const current = queue.shift();
      const currentRow = current[0];
      const currentColumn = current[1];
      group.push({ row: currentRow, column: currentColumn });

      DIRECTIONS.forEach(function (direction) {
        const nextRow = currentRow + direction[0];
        const nextColumn = currentColumn + direction[1];
        const key = nextRow + ":" + nextColumn;
        const nextTile = board[nextRow] && board[nextRow][nextColumn];

        if (!visited.has(key) && nextTile && nextTile.color === startTile.color) {
          visited.add(key);
          queue.push([nextRow, nextColumn]);
        }
      });
    }

    return group;
  }

  function hasAvailableMerge() {
    for (let row = 0; row < BOARD_ROWS; row += 1) {
      for (let column = 0; column < BOARD_COLUMNS; column += 1) {
        if (board[row][column] && getGroup(row, column).length >= 2) {
          return true;
        }
      }
    }
    return false;
  }

  function applyGravityAndRefill() {
    for (let column = 0; column < BOARD_COLUMNS; column += 1) {
      const tiles = [];
      for (let row = BOARD_ROWS - 1; row >= 0; row -= 1) {
        if (board[row][column]) {
          tiles.push(board[row][column]);
        }
      }

      for (let row = BOARD_ROWS - 1; row >= 0; row -= 1) {
        board[row][column] = tiles[BOARD_ROWS - 1 - row] || createRandomTile();
      }
    }
  }

  function setStatus(message, tone) {
    statusElement.textContent = message;
    statusElement.className = "subaracity-status" + (tone ? " is-" + tone : "");
  }

  function updateStats() {
    yearElement.textContent = String(year);
    populationElement.textContent = formatNumber(population);
    highestLevelElement.textContent = "L" + highestLevel;
    bestPopulationElement.textContent = "BEST POPULATION " + formatNumber(bestPopulation);
    mayorCountElement.textContent = String(mayorMarks);
    mayorButton.disabled = mayorMarks === 0 || gameOver || isAnimating;
    restartButton.disabled = isAnimating;
    mayorButton.classList.toggle("is-active", mayorMode);
    mayorButton.setAttribute("aria-pressed", String(mayorMode));
    boardElement.classList.toggle("is-mayor-mode", mayorMode);
    boardElement.classList.toggle("is-animating", isAnimating);
    mayorHintElement.textContent = mayorMode
      ? "點選一棟建築，把它從城市中清除。"
      : "清出一格，讓城市繼續成長。";
  }

  function renderBoard(animationState) {
    const animation = animationState || {};
    boardElement.innerHTML = "";

    for (let row = 0; row < BOARD_ROWS; row += 1) {
      for (let column = 0; column < BOARD_COLUMNS; column += 1) {
        const tileData = board[row][column];
        const tileKey = row + ":" + column;

        if (!tileData) {
          const emptyTile = document.createElement("div");
          emptyTile.className = "city-tile is-empty";
          emptyTile.setAttribute("aria-hidden", "true");
          boardElement.appendChild(emptyTile);
          continue;
        }

        const tile = document.createElement("button");
        const color = getColor(tileData.color);
        const classes = ["city-tile", "is-" + color.id];
        tile.type = "button";
        tile.dataset.row = String(row);
        tile.dataset.column = String(column);
        tile.dataset.level = String(tileData.level);
        tile.setAttribute("role", "gridcell");
        tile.setAttribute("aria-label", color.label + "，等級 " + tileData.level + " 建築" + (tileData.level >= WHITE_LEVEL ? "，白色建築" : ""));

        if (tileData.level >= WHITE_LEVEL) {
          classes.push("is-white-building");
        }

        if (animation.mergeGroup && animation.mergeGroup.has(tileKey)) {
          if (tileKey === animation.mergeAnchor) {
            classes.push("is-merge-anchor");
          } else {
            classes.push("is-merging");
            tile.style.setProperty("--merge-x", String((animation.mergeAnchorColumn - column) * 100) + "%");
            tile.style.setProperty("--merge-y", String((animation.mergeAnchorRow - row) * 100) + "%");
          }
        }

        const gravityMotion = animation.gravity && animation.gravity[tileKey];
        if (gravityMotion) {
          classes.push("is-falling");
          tile.style.setProperty("--fall-steps", String(gravityMotion.steps));
        }

        tile.className = classes.join(" ");

        const image = document.createElement("img");
        image.src = BUILDING_ASSETS[Math.min(tileData.level, BUILDING_ASSETS.length) - 1];
        image.alt = "";
        image.draggable = false;

        const levelBadge = document.createElement("span");
        levelBadge.className = "city-tile-level";
        levelBadge.textContent = "L" + tileData.level;

        tile.appendChild(image);
        tile.appendChild(levelBadge);
        boardElement.appendChild(tile);
      }
    }
  }

  function finishGame() {
    gameOver = true;
    mayorMode = false;
    if (population > bestPopulation) {
      bestPopulation = population;
      saveBestPopulation();
    }
    gameoverDescriptionElement.textContent = "城市走到了第 " + year + " 年，人口 " + formatNumber(population) + "，最高建築 Lv." + highestLevel + "。";
    gameoverElement.hidden = false;
    setStatus("城市暫時沒有可合併的建築。", "fail");
    updateStats();
  }

  function checkGameState() {
    if (!hasAvailableMerge() && mayorMarks === 0) {
      finishGame();
      return;
    }

    if (!hasAvailableMerge()) {
      setStatus("沒有可合併的區域了，可以使用市長標記清出空間。", "ready");
    }
  }

  function advanceYear() {
    year += 1;
    if (year % 100 === 0) {
      mayorMarks += 1;
    }
  }

  function getMergeLevel(group) {
    const firstTile = board[group[0].row][group[0].column];
    const highestLevelInGroup = group.reduce(function (highest, position) {
      return Math.max(highest, board[position.row][position.column].level);
    }, 0);

    if (firstTile.color === "white") {
      // 原作的白色 Lv.10 建築會以數量繼續升級：兩棟成 Lv.11、三棟成 Lv.12。
      return Math.max(WHITE_LEVEL - 1 + group.length, highestLevelInGroup + 1);
    }

    return highestLevelInGroup + 1;
  }

  function getPopulationGain(group, level) {
    const levelValue = Math.pow(2, Math.min(level - 1, 20));
    const highLevelBonus = level >= WHITE_LEVEL ? 10000 : 0;
    return group.length * levelValue * 10 + highLevelBonus;
  }

  function awardMayorMark(level) {
    if (level >= MAYOR_REWARD_LEVEL) {
      mayorMarks += 1;
      return " 獲得 1 個市長標記！";
    }
    return "";
  }

  function cloneBoard() {
    return board.map(function (boardRow) {
      return boardRow.slice();
    });
  }

  function getGravityAnimationState(previousBoard) {
    const previousPositions = new Map();
    previousBoard.forEach(function (boardRow, row) {
      boardRow.forEach(function (tile, column) {
        if (tile) {
          previousPositions.set(tile, { row: row, column: column });
        }
      });
    });

    const animationState = {};
    board.forEach(function (boardRow, row) {
      boardRow.forEach(function (tile, column) {
        const tileKey = row + ":" + column;
        const previousPosition = previousPositions.get(tile);
        if (previousPosition) {
          const steps = Math.max(0, row - previousPosition.row);
          if (steps > 0) {
            animationState[tileKey] = { steps: steps };
          }
          return;
        }

        animationState[tileKey] = { steps: row + 1 };
      });
    });

    return animationState;
  }

  function waitForAnimation(duration) {
    return new Promise(function (resolve) {
      window.setTimeout(resolve, duration);
    });
  }

  async function mergeGroup(row, column) {
    if (isAnimating) {
      return;
    }

    const group = getGroup(row, column);
    if (group.length < 2) {
      setStatus("需要至少兩個相同顏色、相鄰的建築才能合併。", "fail");
      return;
    }

    // 點選哪一格，合併後的建築就保留在哪一格，讓玩家能安排落下後的版面。
    const anchor = { row: row, column: column };
    const anchorKey = row + ":" + column;
    const currentTile = board[row][column];
    const nextLevel = getMergeLevel(group);
    const nextColor = nextLevel >= WHITE_LEVEL ? "white" : currentTile.color;

    isAnimating = true;
    updateStats();
    setStatus("同色建築正在合併，請看它們集中到你點選的位置。", "ready");
    renderBoard({
      mergeGroup: new Set(group.map(function (position) {
        return position.row + ":" + position.column;
      })),
      mergeAnchor: anchorKey,
      mergeAnchorRow: anchor.row,
      mergeAnchorColumn: anchor.column
    });
    await waitForAnimation(MERGE_DURATION);

    group.forEach(function (position) {
      board[position.row][position.column] = null;
    });
    board[anchor.row][anchor.column] = { color: nextColor, level: nextLevel };

    population += getPopulationGain(group, nextLevel);
    highestLevel = Math.max(highestLevel, nextLevel);
    const mayorReward = awardMayorMark(nextLevel);
    advanceYear();
    updateStats();
    renderBoard();
    setStatus("合併完成，新的建築即將落下並補入城市。", "ready");
    await waitForAnimation(RESULT_PAUSE_DURATION);

    const previousBoard = cloneBoard();
    applyGravityAndRefill();
    renderBoard({ gravity: getGravityAnimationState(previousBoard) });
    setStatus("建築正在下落，新建築從上方補入。", "ready");
    await waitForAnimation(FALL_DURATION);

    isAnimating = false;
    renderBoard();
    updateStats();
    setStatus("合併完成，建築留在你點選的位置。" + mayorReward, "success");
    checkGameState();
  }

  async function removeWithMayor(row, column) {
    if (isAnimating) {
      return;
    }

    if (mayorMarks === 0) {
      setStatus("已經沒有市長標記了。", "fail");
      return;
    }

    board[row][column] = null;
    mayorMarks -= 1;
    advanceYear();
    mayorMode = false;
    isAnimating = true;
    updateStats();
    renderBoard();
    setStatus("市長標記正在清出空間。", "ready");
    await waitForAnimation(RESULT_PAUSE_DURATION);

    const previousBoard = cloneBoard();
    applyGravityAndRefill();
    renderBoard({ gravity: getGravityAnimationState(previousBoard) });
    setStatus("建築正在下落，新建築從上方補入。", "ready");
    await waitForAnimation(FALL_DURATION);

    isAnimating = false;
    renderBoard();
    updateStats();
    setStatus("市長標記已使用，新的空間出現了。", "success");
    checkGameState();
  }

  function restartGame() {
    if (isAnimating) {
      return;
    }

    year = START_YEAR;
    population = 0;
    highestLevel = 1;
    mayorMarks = START_MAYOR_MARKS;
    mayorMode = false;
    gameOver = false;
    gameoverElement.hidden = true;
    seedBoard();
    renderBoard();
    updateStats();
    setStatus("找一片相同顏色的建築，開始你的城市。", "ready");
  }

  boardElement.addEventListener("click", function (event) {
    const tile = event.target.closest(".city-tile");
    if (!tile || gameOver || isAnimating || tile.classList.contains("is-empty")) {
      return;
    }

    const row = Number(tile.dataset.row);
    const column = Number(tile.dataset.column);
    if (mayorMode) {
      removeWithMayor(row, column);
      return;
    }

    mergeGroup(row, column);
  });

  mayorButton.addEventListener("click", function () {
    if (gameOver || mayorMarks === 0 || isAnimating) {
      return;
    }
    mayorMode = !mayorMode;
    updateStats();
    setStatus(
      mayorMode ? "市長標記已啟用，請選擇要清除的建築。" : "市長標記已取消，繼續規劃你的城市。",
      "ready"
    );
  });

  restartButton.addEventListener("click", restartGame);
  gameoverRestartButton.addEventListener("click", restartGame);
  restartGame();
})();
