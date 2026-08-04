(() => {
  "use strict";

  const CONFIG = Object.freeze({
    gridSize: 150,
    baseTickMs: 50,
    canvasSize: 1250,
    trailDurationMs: 520,
    moveAnimationMs: 115,
    maxCatchUpTicks: 4
  });

  const DIRECTIONS = [
    { x: 0, y: -1 },
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: -1, y: 0 }
  ];

  const MICROBE_TYPES = Object.freeze({
    black: Object.freeze({
      id: "black",
      name: "黑色微生物",
      color: "#111111",
      bodySize: 4,
      tickMs: 150,
      movement: "random-connected-crawl",
      seedOffsets: Object.freeze([
        { x: 0, y: 0 },
        { x: 0, y: -1 },
        { x: 1, y: 0 },
        { x: -1, y: 0 }
      ]),
      description: "四格連通身體，從整個身體邊緣隨機延伸並收回一格。",
      movementLabel: "身體鄰近隨機延伸／收回"
    }),
    green: Object.freeze({
      id: "green",
      name: "綠色條蟲",
      color: "#58c96d",
      headColor: "#218d43",
      bodySize: 4,
      tickMs: 250,
      movement: "head-random-crawl",
      seedOffsets: Object.freeze([
        { x: 0, y: 0 },
        { x: -1, y: 0 },
        { x: -2, y: 0 },
        { x: -3, y: 0 }
      ]),
      orderOffsets: Object.freeze([
        { x: 0, y: 0 },
        { x: -1, y: 0 },
        { x: -2, y: 0 },
        { x: -3, y: 0 }
      ]),
      headOffset: { x: 0, y: 0 },
      description: "條狀身體，頭部每 250ms 往相鄰空格隨機前進一格。",
      movementLabel: "頭部相鄰隨機一格"
    })
  });

  const canvas = document.querySelector("#microbe-canvas");
  const context = canvas.getContext("2d");
  const gridCanvas = document.createElement("canvas");
  const gridContext = gridCanvas.getContext("2d");
  const statusValue = document.querySelector("#micro-status");
  const countValue = document.querySelector("#micro-count");
  const volumeValue = document.querySelector("#micro-volume");
  const stepsValue = document.querySelector("#micro-steps");
  const bodySizeValue = document.querySelector("#micro-body-size");
  const intervalValue = document.querySelector("#micro-interval");
  const infoTitle = document.querySelector("#microbe-info-title");
  const infoCopy = document.querySelector("#microbe-info-copy");
  const infoSwatch = document.querySelector("#microbe-info-swatch");
  const movementModeValue = document.querySelector("#micro-movement-mode");
  const typeButtons = Array.from(document.querySelectorAll(".micro-type-option"));
  const boardStatus = document.querySelector("#micro-board-status");
  const coordinateValue = document.querySelector("#micro-coordinate");
  const centerValue = document.querySelector("#micro-center");
  const eventLog = document.querySelector("#micro-event-log");
  const pauseButton = document.querySelector("#pause-button");
  const restartButton = document.querySelector("#restart-button");

  const state = {
    microbes: [],
    occupancy: new Map(),
    nextMicrobeId: 1,
    selectedTypeId: "black",
    paused: true,
    tickCount: 0,
    totalMoves: 0,
    accumulator: 0,
    lastFrameAt: null,
    frameId: null,
    hoverCell: null,
    trail: [],
    renderDirty: true,
    allConnected: true
  };

  canvas.width = CONFIG.canvasSize;
  canvas.height = CONFIG.canvasSize;
  gridCanvas.width = CONFIG.canvasSize;
  gridCanvas.height = CONFIG.canvasSize;

  function indexOf(x, y) {
    return y * CONFIG.gridSize + x;
  }

  function pointOf(index) {
    return {
      x: index % CONFIG.gridSize,
      y: Math.floor(index / CONFIG.gridSize)
    };
  }

  function isInside(x, y) {
    return x >= 0 && x < CONFIG.gridSize && y >= 0 && y < CONFIG.gridSize;
  }

  function randomItem(items) {
    return items[Math.floor(Math.random() * items.length)];
  }

  function shuffle(items) {
    for (let index = items.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
    }
    return items;
  }

  function neighborsOf(index) {
    const point = pointOf(index);
    return DIRECTIONS
      .map((direction) => ({ x: point.x + direction.x, y: point.y + direction.y }))
      .filter((point) => isInside(point.x, point.y))
      .map((point) => indexOf(point.x, point.y));
  }

  function getPlacementAnchor(center, type) {
    const xOffsets = type.seedOffsets.map((offset) => offset.x);
    const yOffsets = type.seedOffsets.map((offset) => offset.y);
    const minX = -Math.min(...xOffsets);
    const maxX = CONFIG.gridSize - 1 - Math.max(...xOffsets);
    const minY = -Math.min(...yOffsets);
    const maxY = CONFIG.gridSize - 1 - Math.max(...yOffsets);
    return {
      x: Math.max(minX, Math.min(maxX, center.x)),
      y: Math.max(minY, Math.min(maxY, center.y))
    };
  }

  function getPlacementCells(center, type) {
    const anchor = getPlacementAnchor(center, type);
    return new Set(type.seedOffsets.map((offset) => indexOf(anchor.x + offset.x, anchor.y + offset.y)));
  }

  function getCellsFromOffsets(anchor, offsets) {
    return offsets.map((offset) => indexOf(anchor.x + offset.x, anchor.y + offset.y));
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

  function setDirty() {
    state.renderDirty = true;
  }

  function setBoardStatus(message) {
    boardStatus.textContent = message;
  }

  function selectMicrobeType(typeId) {
    const type = MICROBE_TYPES[typeId];
    if (!type) return;
    state.selectedTypeId = typeId;
    typeButtons.forEach((button) => {
      const isSelected = button.dataset.type === typeId;
      button.classList.toggle("is-selected", isSelected);
      button.setAttribute("aria-pressed", String(isSelected));
    });
    setBoardStatus(`${type.name}已選取，每格移動間隔 ${type.tickMs}ms。`);
    setDirty();
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

  function refreshConnectivity() {
    state.allConnected = state.microbes.length > 0 && state.microbes.every((microbe) => microbe.connected);
  }

  function getTotalVolume() {
    return state.microbes.reduce((total, microbe) => total + microbe.type.bodySize, 0);
  }

  function claimCells(microbe, cells) {
    cells.forEach((index) => state.occupancy.set(index, microbe.id));
  }

  function releaseCell(microbe, index) {
    if (state.occupancy.get(index) === microbe.id) state.occupancy.delete(index);
  }

  function isCellFree(index, microbeId) {
    const owner = state.occupancy.get(index);
    return owner === undefined || owner === microbeId;
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
    const latestMicrobe = state.microbes[state.microbes.length - 1] || null;
    const latestCenter = centerOfBody(latestMicrobe);
    const totalVolume = getTotalVolume();
    const selectedType = MICROBE_TYPES[state.selectedTypeId];

    canvas.dataset.gridSize = String(CONFIG.gridSize);
    canvas.dataset.microbeCount = String(state.microbes.length);
    canvas.dataset.bodySize = String(latestMicrobe ? latestMicrobe.type.bodySize : 0);
    canvas.dataset.bodyConnected = String(state.allConnected);
    statusValue.textContent = !state.microbes.length ? "等待放置" : state.paused ? "已暫停" : "正在移動";
    countValue.textContent = String(state.microbes.length);
    volumeValue.textContent = `${totalVolume} 格`;
    stepsValue.textContent = String(state.totalMoves);
    if (bodySizeValue) bodySizeValue.textContent = latestMicrobe ? `${latestMicrobe.type.bodySize} 格` : "4 格";
    if (intervalValue) intervalValue.textContent = `${selectedType.tickMs}ms`;
    if (infoTitle) infoTitle.textContent = `${selectedType.name}選項`;
    if (infoCopy) infoCopy.textContent = selectedType.description;
    if (infoSwatch) {
      infoSwatch.classList.toggle("is-black", selectedType.id === "black");
      infoSwatch.classList.toggle("is-green", selectedType.id === "green");
    }
    if (movementModeValue) movementModeValue.textContent = selectedType.movementLabel;
    pauseButton.disabled = !state.microbes.length;
    pauseButton.textContent = state.paused ? "繼續" : "暫停";
    centerValue.textContent = latestCenter ? `#${latestMicrobe.id} · (${latestCenter.x}, ${latestCenter.y})` : "—";

    if (state.hoverCell) {
      coordinateValue.textContent = `座標 ${state.hoverCell.x}, ${state.hoverCell.y}`;
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

  function drawCellAt(context2d, xCell, yCell, fillStyle, inset, radius) {
    const cellSize = CONFIG.canvasSize / CONFIG.gridSize;
    const x = xCell * cellSize + inset;
    const y = yCell * cellSize + inset;
    const size = cellSize - inset * 2;
    roundedRect(context2d, x, y, size, size, radius);
    context2d.fillStyle = fillStyle;
    context2d.fill();
  }

  function drawCell(index, fillStyle, inset, radius) {
    const point = pointOf(index);
    drawCellAt(context, point.x, point.y, fillStyle, inset, radius);
  }

  function drawHeadMarkerAt(xCell, yCell, type) {
    if (!type.headColor) return;
    const cellSize = CONFIG.canvasSize / CONFIG.gridSize;
    context.fillStyle = "rgba(8, 62, 28, 0.85)";
    context.beginPath();
    context.arc((xCell + 0.34) * cellSize, (yCell + 0.34) * cellSize, Math.max(1.2, cellSize * 0.08), 0, Math.PI * 2);
    context.fill();
  }

  function buildGridCache() {
    const cellSize = CONFIG.canvasSize / CONFIG.gridSize;
    gridContext.fillStyle = "#eee8df";
    gridContext.fillRect(0, 0, CONFIG.canvasSize, CONFIG.canvasSize);
    gridContext.lineWidth = 1;

    for (let index = 0; index <= CONFIG.gridSize; index += 1) {
      const position = index * cellSize + 0.5;
      const isMajor = index % 50 === 0;
      const isSection = index % 10 === 0;
      gridContext.strokeStyle = isMajor
        ? "rgba(23, 23, 23, 0.16)"
        : isSection
          ? "rgba(23, 23, 23, 0.08)"
          : "rgba(23, 23, 23, 0.035)";

      gridContext.beginPath();
      gridContext.moveTo(position, 0);
      gridContext.lineTo(position, CONFIG.canvasSize);
      gridContext.stroke();

      gridContext.beginPath();
      gridContext.moveTo(0, position);
      gridContext.lineTo(CONFIG.canvasSize, position);
      gridContext.stroke();
    }
  }

  function drawTrail(now) {
    const cellSize = CONFIG.canvasSize / CONFIG.gridSize;
    state.trail.forEach((move) => {
      const from = pointOf(move.oldCell);
      const to = pointOf(move.newCell);
      const alpha = Math.max(0, (move.expiresAt - now) / CONFIG.trailDurationMs) * 0.22;
      if (alpha <= 0) return;
      context.strokeStyle = `rgba(23, 23, 23, ${alpha})`;
      context.lineWidth = Math.max(2, cellSize * 0.8);
      context.lineCap = "round";
      context.beginPath();
      context.moveTo((from.x + 0.5) * cellSize, (from.y + 0.5) * cellSize);
      context.lineTo((to.x + 0.5) * cellSize, (to.y + 0.5) * cellSize);
      context.stroke();
    });
  }

  function drawBodies(now) {
    state.microbes.forEach((microbe) => {
      const visualMove = microbe.visualMove;
      const progress = visualMove
        ? Math.min(1, Math.max(0, (now - visualMove.startedAt) / visualMove.duration))
        : 1;

      microbe.cells.forEach((index) => {
        const isHead = index === microbe.head;
        const cellColor = isHead && microbe.type.headColor ? microbe.type.headColor : microbe.type.color;
        if (visualMove && index === visualMove.newCell) {
          const from = pointOf(visualMove.oldCell);
          const to = pointOf(visualMove.newCell);
          const visualX = from.x + (to.x - from.x) * progress;
          const visualY = from.y + (to.y - from.y) * progress;
          drawCellAt(
            context,
            visualX,
            visualY,
            cellColor,
            0.45,
            0.9
          );
          if (isHead) drawHeadMarkerAt(visualX, visualY, microbe.type);
        } else {
          drawCell(index, cellColor, 0.45, 0.9);
          if (isHead) {
            const point = pointOf(index);
            drawHeadMarkerAt(point.x, point.y, microbe.type);
          }
        }
      });

      const center = centerOfBody(microbe);
      if (center) {
        const cellSize = CONFIG.canvasSize / CONFIG.gridSize;
        context.fillStyle = "rgba(255, 255, 255, 0.3)";
        context.beginPath();
        context.arc((center.x + 0.34) * cellSize, (center.y + 0.3) * cellSize, 0.42, 0, Math.PI * 2);
        context.fill();
      }

      if (visualMove && progress >= 1) microbe.visualMove = null;
    });
  }

  function drawPlacementPreview() {
    if (!state.hoverCell) return;
    const type = MICROBE_TYPES[state.selectedTypeId];
    const previewCells = getPlacementCells(state.hoverCell, type);
    const canPlace = Array.from(previewCells).every((index) => !state.occupancy.has(index));
    previewCells.forEach((index) => {
      drawCell(index, canPlace ? "rgba(17, 17, 17, 0.12)" : "rgba(200, 78, 59, 0.16)", 0.75, 0.8);
    });
  }

  function drawHover() {
    if (!state.hoverCell) return;
    const cellSize = CONFIG.canvasSize / CONFIG.gridSize;
    const index = indexOf(state.hoverCell.x, state.hoverCell.y);
    context.strokeStyle = "rgba(200, 78, 59, 0.8)";
    context.lineWidth = 2;
    context.strokeRect(index % CONFIG.gridSize * cellSize + 1, Math.floor(index / CONFIG.gridSize) * cellSize + 1, cellSize - 2, cellSize - 2);
  }

  function render(now) {
    context.clearRect(0, 0, CONFIG.canvasSize, CONFIG.canvasSize);
    context.drawImage(gridCanvas, 0, 0);
    drawTrail(now);
    drawPlacementPreview();
    drawBodies(now);
    drawHover();
    updateUi();
    state.renderDirty = false;
  }

  function getCellFromPointer(event) {
    const bounds = canvas.getBoundingClientRect();
    const x = Math.floor((event.clientX - bounds.left) / bounds.width * CONFIG.gridSize);
    const y = Math.floor((event.clientY - bounds.top) / bounds.height * CONFIG.gridSize);
    if (!isInside(x, y)) return null;
    return { x, y };
  }

  function createMicrobe(typeId, center) {
    const type = MICROBE_TYPES[typeId];
    if (!type) return null;
    if (type.seedOffsets.length !== type.bodySize) {
      throw new Error(`${type.name} 的 seedOffsets 數量必須等於 bodySize。`);
    }
    const cells = getPlacementCells(center, type);
    if (Array.from(cells).some((index) => state.occupancy.has(index))) return null;
    const anchor = getPlacementAnchor(center, type);
    const bodyOrder = type.orderOffsets ? getCellsFromOffsets(anchor, type.orderOffsets) : null;
    const head = type.headOffset
      ? indexOf(anchor.x + type.headOffset.x, anchor.y + type.headOffset.y)
      : null;

    const microbe = {
      id: state.nextMicrobeId,
      typeId,
      type,
      cells,
      steps: 0,
      connected: true,
      visualMove: null,
      moveAccumulator: 0,
      bodyOrder,
      head
    };
    state.nextMicrobeId += 1;
    state.microbes.push(microbe);
    claimCells(microbe, cells);
    refreshConnectivity();
    return microbe;
  }

  function placeSelectedMicrobe(center) {
    const microbe = createMicrobe(state.selectedTypeId, center);
    if (!microbe) {
      setBoardStatus("這裡已有微生物，請點擊沒有被佔用的空白區。");
      addEvent("放置失敗：四格種子區與既有微生物重疊。");
      setDirty();
      return;
    }

    state.paused = false;
    addEvent(`${microbe.type.name} #${microbe.id} 放置完成，佔用 ${microbe.type.bodySize} 格。`);
    setBoardStatus(`已放置 ${state.microbes.length} 隻微生物，${microbe.type.name}每 ${microbe.type.tickMs} 毫秒移動。`);
    state.accumulator = 0;
    setDirty();
  }

  function getGrowthCandidates(microbe) {
    const candidates = new Set();
    microbe.cells.forEach((index) => {
      neighborsOf(index).forEach((neighbor) => {
        if (!microbe.cells.has(neighbor) && isCellFree(neighbor, microbe.id)) candidates.add(neighbor);
      });
    });
    return Array.from(candidates);
  }

  function getConnectedRetractions(microbe, newCell) {
    return Array.from(microbe.cells).filter((oldCell) => {
      if (oldCell === newCell) return false;
      if (!microbe.cells.has(oldCell)) return false;
      const nextCells = new Set(microbe.cells);
      nextCells.add(newCell);
      nextCells.delete(oldCell);
      return isConnected(nextCells);
    });
  }

  function getNonBreakingGrowthCandidates(microbe) {
    return getGrowthCandidates(microbe).filter((newCell) => {
      return getConnectedRetractions(microbe, newCell).length > 0;
    });
  }

  function moveRandomConnected(microbe, now) {
    const growthCandidates = getNonBreakingGrowthCandidates(microbe);
    if (growthCandidates.length === 0) return false;

    const newCell = randomItem(growthCandidates);
    microbe.cells.add(newCell);
    state.occupancy.set(newCell, microbe.id);

    const retractableCells = getConnectedRetractions(microbe, newCell);
    if (retractableCells.length === 0) {
      microbe.cells.delete(newCell);
      releaseCell(microbe, newCell);
      return false;
    }

    const oldCell = randomItem(retractableCells);
    releaseCell(microbe, oldCell);
    microbe.cells.delete(oldCell);
    microbe.steps += 1;
    microbe.connected = isConnected(microbe.cells);
    microbe.visualMove = {
      oldCell,
      newCell,
      startedAt: now,
      duration: CONFIG.moveAnimationMs
    };
    state.trail.push({
      oldCell,
      newCell,
      expiresAt: now + CONFIG.trailDurationMs
    });
    state.totalMoves += 1;
    return true;
  }

  function moveHeadRandom(microbe, now) {
    if (microbe.head === null || !microbe.bodyOrder) return false;
    const candidates = neighborsOf(microbe.head).filter((index) => {
      return !microbe.cells.has(index) && !state.occupancy.has(index);
    });
    if (!candidates.length) return false;

    const newHead = randomItem(candidates);
    const oldHead = microbe.head;
    const oldTail = microbe.bodyOrder[microbe.bodyOrder.length - 1];
    releaseCell(microbe, oldTail);
    microbe.cells.delete(oldTail);
    microbe.bodyOrder = [newHead, ...microbe.bodyOrder.slice(0, -1)];
    microbe.cells.add(newHead);
    microbe.head = newHead;
    state.occupancy.set(newHead, microbe.id);
    microbe.steps += 1;
    microbe.connected = isConnected(microbe.cells);
    microbe.visualMove = {
      oldCell: oldHead,
      newCell: newHead,
      startedAt: now,
      duration: CONFIG.moveAnimationMs
    };
    state.trail.push({
      oldCell: oldHead,
      newCell: newHead,
      expiresAt: now + CONFIG.trailDurationMs
    });
    state.totalMoves += 1;
    return true;
  }

  const MOVEMENT_STRATEGIES = Object.freeze({
    "random-connected-crawl": moveRandomConnected,
    "head-random-crawl": moveHeadRandom
  });

  function stepAllMicrobes(now) {
    if (!state.microbes.length || state.paused) return;
    state.tickCount += 1;
    const movementOrder = shuffle(state.microbes.slice());
    let movedCount = 0;

    movementOrder.forEach((microbe) => {
      microbe.moveAccumulator += CONFIG.baseTickMs;
      if (microbe.moveAccumulator < microbe.type.tickMs) return;
      microbe.moveAccumulator -= microbe.type.tickMs;
      const moveStrategy = MOVEMENT_STRATEGIES[microbe.type.movement];
      if (moveStrategy && moveStrategy(microbe, now)) movedCount += 1;
    });

    state.trail = state.trail.filter((move) => move.expiresAt > now);
    refreshConnectivity();
    if (movedCount > 0) setBoardStatus(`第 ${state.tickCount} 次模擬更新：${movedCount}/${state.microbes.length} 隻微生物移動，總體積 ${getTotalVolume()} 格。`);
    if (movedCount > 0 && (state.tickCount === 1 || state.tickCount % 5 === 0)) {
      addEvent(`第 ${state.tickCount} 次更新：${movedCount}/${state.microbes.length} 隻微生物完成移動。`);
    }
    setDirty();
  }

  function animationFrame(now) {
    if (state.lastFrameAt === null) state.lastFrameAt = now;
    const elapsed = Math.min(1000, now - state.lastFrameAt);
    state.lastFrameAt = now;

    if (!state.paused && state.microbes.length) {
      state.accumulator += elapsed;
      let catchUpTicks = 0;
      while (state.accumulator >= CONFIG.baseTickMs && catchUpTicks < CONFIG.maxCatchUpTicks) {
        state.accumulator -= CONFIG.baseTickMs;
        stepAllMicrobes(now);
        catchUpTicks += 1;
      }
      if (catchUpTicks === CONFIG.maxCatchUpTicks) state.accumulator = 0;
    } else {
      state.accumulator = 0;
    }

    const hasVisualAnimation = state.trail.length > 0 || state.microbes.some((microbe) => microbe.visualMove);
    if (state.renderDirty || hasVisualAnimation || (!state.paused && state.microbes.length > 0)) {
      render(now);
    }
    state.frameId = window.requestAnimationFrame(animationFrame);
  }

  function togglePause() {
    if (!state.microbes.length) return;
    state.paused = !state.paused;
    state.accumulator = 0;
    if (state.paused) {
      setBoardStatus("已暫停；所有微生物保持目前四格身體。");
      addEvent("培養區暫停，所有微生物保持原位。");
    } else {
      setBoardStatus("已繼續，所有微生物依各自選項的間隔隨機爬行。");
      addEvent("培養區繼續運作。");
    }
    setDirty();
  }

  function resetGame() {
    state.microbes = [];
    state.occupancy.clear();
    state.nextMicrobeId = 1;
    state.paused = true;
    state.tickCount = 0;
    state.totalMoves = 0;
    state.accumulator = 0;
    state.trail = [];
    state.allConnected = true;
    const selectedType = MICROBE_TYPES[state.selectedTypeId];
    setBoardStatus(`點擊空白區放置${selectedType.name}，可放置多隻。`);
    eventLog.innerHTML = "";
    addEvent("等待放置第一隻微生物。");
    setDirty();
  }

  canvas.addEventListener("pointermove", (event) => {
    state.hoverCell = getCellFromPointer(event);
    setDirty();
  });

  canvas.addEventListener("pointerleave", () => {
    state.hoverCell = null;
    setDirty();
  });

  canvas.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    const point = getCellFromPointer(event);
    if (point) placeSelectedMicrobe(point);
  });

  pauseButton.addEventListener("click", togglePause);
  restartButton.addEventListener("click", resetGame);
  typeButtons.forEach((button) => {
    button.addEventListener("click", () => selectMicrobeType(button.dataset.type));
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === " " || event.code === "Space") {
      event.preventDefault();
      togglePause();
    }
    if (event.key.toLowerCase() === "r") resetGame();
  });

  window.addEventListener("beforeunload", () => {
    if (state.frameId !== null) window.cancelAnimationFrame(state.frameId);
  });

  buildGridCache();
  state.frameId = window.requestAnimationFrame(animationFrame);
})();
