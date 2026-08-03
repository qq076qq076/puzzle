(() => {
  "use strict";

  const GRID_SIZE = 180;
  const TICK_MS = 250;
  const CANVAS_SIZE = 1250;
  const BODY_SIZE = 5;
  const TRAIL_LENGTH = 8;
  const DIRECTIONS = [
    { x: 0, y: -1 },
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: -1, y: 0 }
  ];
  const INITIAL_OFFSETS = [
    { x: 0, y: 0 },
    { x: 0, y: -1 },
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: -1, y: 0 }
  ];

  const canvas = document.querySelector("#microbe-canvas");
  const context = canvas.getContext("2d");
  const statusValue = document.querySelector("#micro-status");
  const volumeValue = document.querySelector("#micro-volume");
  const stepsValue = document.querySelector("#micro-steps");
  const boardStatus = document.querySelector("#micro-board-status");
  const coordinateValue = document.querySelector("#micro-coordinate");
  const centerValue = document.querySelector("#micro-center");
  const eventLog = document.querySelector("#micro-event-log");
  const pauseButton = document.querySelector("#pause-button");
  const restartButton = document.querySelector("#restart-button");

  let microbe = null;
  let paused = true;
  let timerId = null;
  let hoverCell = null;
  let trail = [];

  canvas.width = CANVAS_SIZE;
  canvas.height = CANVAS_SIZE;

  function indexOf(x, y) {
    return y * GRID_SIZE + x;
  }

  function pointOf(index) {
    return {
      x: index % GRID_SIZE,
      y: Math.floor(index / GRID_SIZE)
    };
  }

  function isInside(x, y) {
    return x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE;
  }

  function randomItem(items) {
    return items[Math.floor(Math.random() * items.length)];
  }

  function neighborsOf(index) {
    const point = pointOf(index);
    return DIRECTIONS
      .map((direction) => ({ x: point.x + direction.x, y: point.y + direction.y }))
      .filter((point) => isInside(point.x, point.y))
      .map((point) => indexOf(point.x, point.y));
  }

  function getPlacementCells(center) {
    const safeCenter = {
      x: Math.max(1, Math.min(GRID_SIZE - 2, center.x)),
      y: Math.max(1, Math.min(GRID_SIZE - 2, center.y))
    };
    return new Set(INITIAL_OFFSETS.map((offset) => indexOf(safeCenter.x + offset.x, safeCenter.y + offset.y)));
  }

  function centerOfBody() {
    if (!microbe || microbe.cells.size === 0) return null;
    let x = 0;
    let y = 0;
    microbe.cells.forEach((index) => {
      const point = pointOf(index);
      x += point.x;
      y += point.y;
    });
    return {
      x: Math.round(x / microbe.cells.size),
      y: Math.round(y / microbe.cells.size)
    };
  }

  function setBoardStatus(message) {
    boardStatus.textContent = message;
  }

  function addEvent(message) {
    const item = document.createElement("li");
    const dot = document.createElement("span");
    const text = document.createElement("span");
    dot.className = "micro-event-dot";
    text.textContent = message;
    item.append(dot, text);
    eventLog.prepend(item);
    while (eventLog.children.length > 8) {
      eventLog.lastElementChild.remove();
    }
  }

  function updateUi() {
    const center = centerOfBody();
    canvas.dataset.gridSize = String(GRID_SIZE);
    canvas.dataset.bodySize = String(microbe ? microbe.cells.size : 0);
    canvas.dataset.bodyConnected = String(Boolean(microbe && isConnected(microbe.cells)));
    statusValue.textContent = !microbe ? "等待放置" : paused ? "已暫停" : "正在移動";
    volumeValue.textContent = `${microbe ? microbe.cells.size : 0} / ${BODY_SIZE}`;
    stepsValue.textContent = String(microbe ? microbe.steps : 0);
    pauseButton.disabled = !microbe;
    pauseButton.textContent = paused ? "繼續" : "暫停";
    centerValue.textContent = center ? `(${center.x}, ${center.y})` : "—";

    if (hoverCell) {
      coordinateValue.textContent = `座標 ${hoverCell.x}, ${hoverCell.y}`;
    } else if (center) {
      coordinateValue.textContent = `中心 ${center.x}, ${center.y}`;
    } else {
      coordinateValue.textContent = "座標 —";
    }
  }

  function roundedRect(context2d, x, y, width, height, radius) {
    const safeRadius = Math.min(radius, width / 2, height / 2);
    context2d.beginPath();
    context2d.moveTo(x + safeRadius, y);
    context2d.arcTo(x + width, y, x + width, y + height, safeRadius);
    context2d.arcTo(x + width, y + height, x, y + height, safeRadius);
    context2d.arcTo(x, y + height, x, y, safeRadius);
    context2d.arcTo(x, y, x + width, y, safeRadius);
    context2d.closePath();
  }

  function drawCell(index, fillStyle, inset, radius) {
    const point = pointOf(index);
    const cellSize = CANVAS_SIZE / GRID_SIZE;
    const x = point.x * cellSize + inset;
    const y = point.y * cellSize + inset;
    const size = cellSize - inset * 2;
    roundedRect(context, x, y, size, size, radius);
    context.fillStyle = fillStyle;
    context.fill();
  }

  function drawGrid() {
    const cellSize = CANVAS_SIZE / GRID_SIZE;
    context.fillStyle = "#eee8df";
    context.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    context.lineWidth = 1;
    for (let i = 0; i <= GRID_SIZE; i += 1) {
      const position = i * cellSize + 0.5;
      const isMajor = i % 50 === 0;
      const isSection = i % 10 === 0;
      context.strokeStyle = isMajor
        ? "rgba(23, 23, 23, 0.16)"
        : isSection
          ? "rgba(23, 23, 23, 0.08)"
          : "rgba(23, 23, 23, 0.035)";

      context.beginPath();
      context.moveTo(position, 0);
      context.lineTo(position, CANVAS_SIZE);
      context.stroke();

      context.beginPath();
      context.moveTo(0, position);
      context.lineTo(CANVAS_SIZE, position);
      context.stroke();
    }
  }

  function drawTrail() {
    const cellSize = CANVAS_SIZE / GRID_SIZE;
    trail.forEach((move) => {
      const from = pointOf(move.oldCell);
      const to = pointOf(move.newCell);
      const alpha = Math.max(0, move.remaining / TRAIL_LENGTH) * 0.22;
      context.strokeStyle = `rgba(23, 23, 23, ${alpha})`;
      context.lineWidth = Math.max(2, cellSize * 0.8);
      context.lineCap = "round";
      context.beginPath();
      context.moveTo((from.x + 0.5) * cellSize, (from.y + 0.5) * cellSize);
      context.lineTo((to.x + 0.5) * cellSize, (to.y + 0.5) * cellSize);
      context.stroke();
    });
  }

  function drawBody() {
    if (!microbe) return;
    microbe.cells.forEach((index) => {
      drawCell(index, "#111111", 0.45, 0.9);
    });

    const center = centerOfBody();
    if (center) {
      const cellSize = CANVAS_SIZE / GRID_SIZE;
      context.fillStyle = "rgba(255, 255, 255, 0.3)";
      context.beginPath();
      context.arc((center.x + 0.34) * cellSize, (center.y + 0.3) * cellSize, 0.42, 0, Math.PI * 2);
      context.fill();
    }
  }

  function drawPlacementPreview() {
    if (!hoverCell || microbe) return;
    getPlacementCells(hoverCell).forEach((index) => {
      drawCell(index, "rgba(17, 17, 17, 0.12)", 0.75, 0.8);
    });
  }

  function drawHover() {
    if (!hoverCell) return;
    const cellSize = CANVAS_SIZE / GRID_SIZE;
    const index = indexOf(hoverCell.x, hoverCell.y);
    context.strokeStyle = "rgba(200, 78, 59, 0.8)";
    context.lineWidth = 2;
    context.strokeRect(index % GRID_SIZE * cellSize + 1, Math.floor(index / GRID_SIZE) * cellSize + 1, cellSize - 2, cellSize - 2);
  }

  function render() {
    drawGrid();
    drawTrail();
    drawPlacementPreview();
    drawBody();
    drawHover();
    updateUi();
  }

  function getCellFromPointer(event) {
    const bounds = canvas.getBoundingClientRect();
    const x = Math.floor((event.clientX - bounds.left) / bounds.width * GRID_SIZE);
    const y = Math.floor((event.clientY - bounds.top) / bounds.height * GRID_SIZE);
    if (!isInside(x, y)) return null;
    return { x, y };
  }

  function startTimer() {
    window.clearInterval(timerId);
    timerId = window.setInterval(stepMicrobe, TICK_MS);
  }

  function stopTimer() {
    window.clearInterval(timerId);
    timerId = null;
  }

  function placeMicrobe(center) {
    if (microbe) {
      setBoardStatus("微生物已經在培養區中；請使用重置重新放置。");
      return;
    }

    microbe = {
      id: "black-microbe-1",
      color: "#111111",
      cells: getPlacementCells(center),
      steps: 0,
      placed: true,
      lastMove: null
    };
    paused = false;
    trail = [];
    addEvent(`黑色微生物放置完成，佔用 ${BODY_SIZE} 格。`);
    setBoardStatus("微生物已放置，每 250 毫秒隨機爬行。");
    startTimer();
    render();
  }

  function getGrowthCandidates() {
    if (!microbe) return [];
    const candidates = new Set();
    microbe.cells.forEach((index) => {
      neighborsOf(index).forEach((neighbor) => {
        if (!microbe.cells.has(neighbor)) candidates.add(neighbor);
      });
    });
    return Array.from(candidates);
  }

  function isConnected(cellSet) {
    if (cellSet.size === 0) return true;
    const firstCell = cellSet.values().next().value;
    const visited = new Set([firstCell]);
    const pending = [firstCell];

    while (pending.length) {
      const current = pending.pop();
      neighborsOf(current).forEach((neighbor) => {
        if (cellSet.has(neighbor) && !visited.has(neighbor)) {
          visited.add(neighbor);
          pending.push(neighbor);
        }
      });
    }

    return visited.size === cellSet.size;
  }

  function getConnectedRetractions(newCell) {
    return neighborsOf(newCell).filter((oldCell) => {
      if (!microbe.cells.has(oldCell)) return false;
      const nextCells = new Set(microbe.cells);
      nextCells.add(newCell);
      nextCells.delete(oldCell);
      return isConnected(nextCells);
    });
  }

  function stepMicrobe() {
    if (!microbe || paused) return;

    const candidates = getGrowthCandidates();
    if (candidates.length === 0) {
      setBoardStatus("等待可用鄰近格，身體維持原狀。");
      addEvent(`第 ${microbe.steps + 1} 次更新：沒有合法鄰近格。`);
      render();
      return;
    }

    const movementOptions = candidates
      .map((newCell) => ({ newCell, retractableCells: getConnectedRetractions(newCell) }))
      .filter((option) => option.retractableCells.length > 0);
    if (movementOptions.length === 0) {
      setBoardStatus("等待能維持連通的鄰近格，身體維持原狀。");
      addEvent(`第 ${microbe.steps + 1} 次更新：沒有能維持連通的移動。`);
      render();
      return;
    }

    const movement = randomItem(movementOptions);
    const newCell = movement.newCell;
    const oldCell = randomItem(movement.retractableCells);

    microbe.cells.add(newCell);
    microbe.cells.delete(oldCell);
    microbe.steps += 1;
    microbe.lastMove = { newCell, oldCell };
    trail = trail
      .map((move) => ({ ...move, remaining: move.remaining - 1 }))
      .filter((move) => move.remaining > 0);
    trail.push({ newCell, oldCell, remaining: TRAIL_LENGTH });

    const newPoint = pointOf(newCell);
    const oldPoint = pointOf(oldCell);
    setBoardStatus(`第 ${microbe.steps} 次移動：延伸至 (${newPoint.x}, ${newPoint.y})，收回 (${oldPoint.x}, ${oldPoint.y})。`);
    addEvent(`第 ${microbe.steps} 次：(${newPoint.x}, ${newPoint.y}) 延伸，(${oldPoint.x}, ${oldPoint.y}) 收回。`);
    render();
  }

  function togglePause() {
    if (!microbe) return;
    paused = !paused;
    if (paused) {
      stopTimer();
      setBoardStatus("已暫停；按繼續讓微生物恢復每 250 毫秒移動。");
      addEvent("培養區暫停，身體保持目前五格。 ");
    } else {
      startTimer();
      setBoardStatus("已繼續，微生物每 250 毫秒隨機爬行。");
      addEvent("培養區繼續運作。 ");
    }
    render();
  }

  function resetGame() {
    stopTimer();
    microbe = null;
    paused = true;
    trail = [];
    setBoardStatus("點擊培養區放置黑色微生物。");
    eventLog.innerHTML = "";
    addEvent("等待放置第一隻微生物。");
    render();
  }

  canvas.addEventListener("pointermove", (event) => {
    hoverCell = getCellFromPointer(event);
    render();
  });

  canvas.addEventListener("pointerleave", () => {
    hoverCell = null;
    render();
  });

  canvas.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    const point = getCellFromPointer(event);
    if (point) placeMicrobe(point);
  });

  pauseButton.addEventListener("click", togglePause);
  restartButton.addEventListener("click", resetGame);

  window.addEventListener("keydown", (event) => {
    if (event.key === " " || event.code === "Space") {
      event.preventDefault();
      togglePause();
    }
    if (event.key.toLowerCase() === "r") resetGame();
  });

  window.addEventListener("beforeunload", stopTimer);
  render();
})();
