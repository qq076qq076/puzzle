(() => {
  "use strict";

  const GRID_SIZE = 150;
  const TICK_MS = 150;
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
  const countValue = document.querySelector("#micro-count");
  const volumeValue = document.querySelector("#micro-volume");
  const stepsValue = document.querySelector("#micro-steps");
  const boardStatus = document.querySelector("#micro-board-status");
  const coordinateValue = document.querySelector("#micro-coordinate");
  const centerValue = document.querySelector("#micro-center");
  const eventLog = document.querySelector("#micro-event-log");
  const pauseButton = document.querySelector("#pause-button");
  const restartButton = document.querySelector("#restart-button");

  let microbes = [];
  let nextMicrobeId = 1;
  let paused = true;
  let timerId = null;
  let hoverCell = null;
  let tickCount = 0;
  let totalMoves = 0;
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

  function centerOfBody(microbe) {
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

  function getOccupiedCells(excludedMicrobeId) {
    const occupied = new Set();
    microbes.forEach((microbe) => {
      if (microbe.id === excludedMicrobeId) return;
      microbe.cells.forEach((index) => occupied.add(index));
    });
    return occupied;
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

  function updateUi() {
    const latestMicrobe = microbes[microbes.length - 1] || null;
    const latestCenter = centerOfBody(latestMicrobe);
    const allConnected = microbes.length > 0 && microbes.every((microbe) => isConnected(microbe.cells));

    canvas.dataset.gridSize = String(GRID_SIZE);
    canvas.dataset.microbeCount = String(microbes.length);
    canvas.dataset.bodySize = String(microbes.length ? BODY_SIZE : 0);
    canvas.dataset.bodyConnected = String(allConnected);
    statusValue.textContent = !microbes.length ? "等待放置" : paused ? "已暫停" : "正在移動";
    countValue.textContent = String(microbes.length);
    volumeValue.textContent = `${microbes.length * BODY_SIZE} 格`;
    stepsValue.textContent = String(totalMoves);
    pauseButton.disabled = !microbes.length;
    pauseButton.textContent = paused ? "繼續" : "暫停";
    centerValue.textContent = latestCenter ? `#${latestMicrobe.id} · (${latestCenter.x}, ${latestCenter.y})` : "—";

    if (hoverCell) {
      coordinateValue.textContent = `座標 ${hoverCell.x}, ${hoverCell.y}`;
    } else if (latestCenter) {
      coordinateValue.textContent = `中心 ${latestCenter.x}, ${latestCenter.y}`;
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

  function drawBodies() {
    microbes.forEach((microbe) => {
      microbe.cells.forEach((index) => {
        drawCell(index, "#111111", 0.45, 0.9);
      });

      const center = centerOfBody(microbe);
      if (center) {
        const cellSize = CANVAS_SIZE / GRID_SIZE;
        context.fillStyle = "rgba(255, 255, 255, 0.3)";
        context.beginPath();
        context.arc((center.x + 0.34) * cellSize, (center.y + 0.3) * cellSize, 0.42, 0, Math.PI * 2);
        context.fill();
      }
    });
  }

  function drawPlacementPreview() {
    if (!hoverCell) return;
    const previewCells = getPlacementCells(hoverCell);
    const occupied = getOccupiedCells();
    const canPlace = Array.from(previewCells).every((index) => !occupied.has(index));
    previewCells.forEach((index) => {
      drawCell(index, canPlace ? "rgba(17, 17, 17, 0.12)" : "rgba(200, 78, 59, 0.16)", 0.75, 0.8);
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
    drawBodies();
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
    timerId = window.setInterval(stepAllMicrobes, TICK_MS);
  }

  function stopTimer() {
    window.clearInterval(timerId);
    timerId = null;
  }

  function placeMicrobe(center) {
    const cells = getPlacementCells(center);
    const occupied = getOccupiedCells();
    if (Array.from(cells).some((index) => occupied.has(index))) {
      setBoardStatus("這裡已有微生物，請點擊沒有被佔用的空白區。");
      addEvent("放置失敗：五格種子區與既有微生物重疊。");
      render();
      return;
    }

    const microbe = {
      id: nextMicrobeId,
      color: "#111111",
      cells,
      steps: 0,
      placed: true,
      lastMove: null
    };
    nextMicrobeId += 1;
    microbes.push(microbe);
    paused = false;
    addEvent(`黑色微生物 #${microbe.id} 放置完成，佔用 ${BODY_SIZE} 格。`);
    setBoardStatus(`已放置 ${microbes.length} 隻微生物，每隻每 150 毫秒隨機爬行。`);
    startTimer();
    render();
  }

  function getGrowthCandidates(microbe) {
    const candidates = new Set();
    const occupiedByOthers = getOccupiedCells(microbe.id);
    microbe.cells.forEach((index) => {
      neighborsOf(index).forEach((neighbor) => {
        if (!microbe.cells.has(neighbor) && !occupiedByOthers.has(neighbor)) candidates.add(neighbor);
      });
    });
    return Array.from(candidates);
  }

  function getConnectedRetractions(microbe, newCell) {
    return neighborsOf(newCell).filter((oldCell) => {
      if (!microbe.cells.has(oldCell)) return false;
      const nextCells = new Set(microbe.cells);
      nextCells.add(newCell);
      nextCells.delete(oldCell);
      return isConnected(nextCells);
    });
  }

  function moveMicrobe(microbe) {
    const candidates = getGrowthCandidates(microbe);
    const movementOptions = candidates
      .map((newCell) => ({ newCell, retractableCells: getConnectedRetractions(microbe, newCell) }))
      .filter((option) => option.retractableCells.length > 0);
    if (movementOptions.length === 0) return null;

    const movement = randomItem(movementOptions);
    const newCell = movement.newCell;
    const oldCell = randomItem(movement.retractableCells);
    microbe.cells.add(newCell);
    microbe.cells.delete(oldCell);
    microbe.steps += 1;
    microbe.lastMove = { newCell, oldCell };
    trail.push({ newCell, oldCell, remaining: TRAIL_LENGTH });
    totalMoves += 1;
    return { newCell, oldCell };
  }

  function stepAllMicrobes() {
    if (!microbes.length || paused) return;
    tickCount += 1;
    trail = trail
      .map((move) => ({ ...move, remaining: move.remaining - 1 }))
      .filter((move) => move.remaining > 0);

    let movedCount = 0;
    microbes.forEach((microbe) => {
      if (moveMicrobe(microbe)) movedCount += 1;
    });

    setBoardStatus(`第 ${tickCount} 次更新：${movedCount}/${microbes.length} 隻微生物移動，總體積 ${microbes.length * BODY_SIZE} 格。`);
    addEvent(`第 ${tickCount} 次更新：${movedCount}/${microbes.length} 隻微生物完成移動。`);
    render();
  }

  function togglePause() {
    if (!microbes.length) return;
    paused = !paused;
    if (paused) {
      stopTimer();
      setBoardStatus("已暫停；所有微生物保持目前五格身體。");
      addEvent("培養區暫停，所有微生物保持原位。");
    } else {
      startTimer();
      setBoardStatus("已繼續，所有微生物每 150 毫秒隨機爬行。");
      addEvent("培養區繼續運作。");
    }
    render();
  }

  function resetGame() {
    stopTimer();
    microbes = [];
    nextMicrobeId = 1;
    paused = true;
    tickCount = 0;
    totalMoves = 0;
    trail = [];
    setBoardStatus("點擊培養區放置黑色微生物，可放置多隻。");
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
