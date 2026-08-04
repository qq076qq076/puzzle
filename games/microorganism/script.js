(() => {
  "use strict";

  const CONFIG = Object.freeze({
    gridSize: 150,
    baseTickMs: 50,
    canvasSize: 1250,
    trailDurationMs: 520,
    moveAnimationMs: 115,
    maxCatchUpTicks: 4,
    redSplitThreshold: 12,
    electricArcDurationMs: 500,
    sporeDurationMs: 1500,
    mirrorDurationMs: 600,
    auroraDurationMs: 900
  });

  const DIRECTIONS = [
    { x: 0, y: -1 },
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: -1, y: 0 }
  ];

  const EIGHT_DIRECTIONS = [
    { x: 0, y: -1 },
    { x: 1, y: -1 },
    { x: 1, y: 0 },
    { x: 1, y: 1 },
    { x: 0, y: 1 },
    { x: -1, y: 1 },
    { x: -1, y: 0 },
    { x: -1, y: -1 }
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
    }),
    red: Object.freeze({
      id: "red",
      name: "紅色微生物",
      color: "#d94a42",
      bodySize: 5,
      tickMs: 250,
      movement: "predatory-two-step",
      seedOffsets: Object.freeze([
        { x: 0, y: 0 },
        { x: 0, y: -1 },
        { x: 1, y: 0 },
        { x: 0, y: 1 },
        { x: -1, y: 0 }
      ]),
      description: "五格身體，延伸兩格後停留 250ms，再收回兩格並停留 250ms；超過 12 格會斷裂成兩隻。",
      movementLabel: "延伸／250ms／收回／250ms／>12格斷裂"
    }),
    "light-blue": Object.freeze({
      id: "light-blue",
      name: "淺藍水母",
      color: "#8ad9ed",
      headColor: "#2c9fbd",
      bodySize: 7,
      tickMs: 500,
      movement: "jellyfish-swim",
      jelly: true,
      seedOffsets: Object.freeze([
        { x: 0, y: -1 },
        { x: -2, y: 0 },
        { x: -1, y: 0 },
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 2, y: 0 },
        { x: 0, y: 1 }
      ]),
      expandedOffsets: Object.freeze([
        { x: 0, y: -1 },
        { x: -2, y: 0 },
        { x: -1, y: 0 },
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 2, y: 0 },
        { x: 0, y: 1 }
      ]),
      contractedOffsets: Object.freeze([
        { x: 0, y: -2 },
        { x: 0, y: -1 },
        { x: -1, y: 0 },
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 0, y: 1 }
      ]),
      expandedHeadOffset: { x: 0, y: -1 },
      contractedHeadOffset: { x: 0, y: -2 },
      description: "七格淺藍水母，張開蓄力後收縮揮動，沿八方向前進兩格。",
      movementLabel: "張開／揮動前進 2 格／收縮"
    }),
    purple: Object.freeze({
      id: "purple",
      name: "紫色微生物",
      color: "#9b59d6",
      coreColor: "#5b2d86",
      bodySize: 5,
      tickMs: 50,
      intervalLabel: "階段制",
      movement: "purple-core-step",
      purple: true,
      seedOffsets: Object.freeze([
        { x: 0, y: 0 },
        { x: 0, y: -1 },
        { x: 1, y: 0 },
        { x: 0, y: 1 },
        { x: -1, y: 0 }
      ]),
      expandedOffsets: Object.freeze([
        { x: 0, y: -2 },
        { x: 0, y: -1 },
        { x: -1, y: -1 },
        { x: 1, y: -1 },
        { x: -2, y: 0 },
        { x: -1, y: 0 },
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 2, y: 0 },
        { x: -1, y: 1 },
        { x: 0, y: 1 },
        { x: 1, y: 1 },
        { x: 0, y: 2 }
      ]),
      description: "核心五格，朝核心四方向之一移動後張開；偏好空白區，能吞噬紅色微生物。",
      movementLabel: "移動／張開 100ms／收回 500ms／停留 250ms"
    }),
    gold: Object.freeze({
      id: "gold",
      name: "金色電弧菌",
      color: "#f5c542",
      coreColor: "#fff3a3",
      bodySize: 5,
      tickMs: 300,
      movement: "electric-dash",
      electric: true,
      seedOffsets: Object.freeze([
        { x: 0, y: 0 },
        { x: 0, y: -1 },
        { x: 1, y: 0 },
        { x: 0, y: 1 },
        { x: -1, y: 0 }
      ]),
      description: "五格金色雷核，蓄電後沿米字方向跳躍兩格並留下電弧。",
      movementLabel: "蓄電／米字跳躍 2 格／電弧 500ms"
    }),
    orange: Object.freeze({
      id: "orange",
      name: "橙色煙火孢子菌",
      color: "#f28c28",
      coreColor: "#ffd166",
      bodySize: 5,
      tickMs: 50,
      intervalLabel: "階段制",
      movement: "firework-bloom",
      firework: true,
      seedOffsets: Object.freeze([
        { x: 0, y: 0 },
        { x: 0, y: -1 },
        { x: 1, y: 0 },
        { x: 0, y: 1 },
        { x: -1, y: 0 }
      ]),
      expandedOffsets: Object.freeze([
        { x: 0, y: -2 },
        { x: -1, y: -1 },
        { x: 0, y: -1 },
        { x: 1, y: -1 },
        { x: -2, y: 0 },
        { x: -1, y: 0 },
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 2, y: 0 },
        { x: -1, y: 1 },
        { x: 0, y: 1 },
        { x: 1, y: 1 },
        { x: 0, y: 2 }
      ]),
      description: "五格花朵核心，蓄力 300ms 後綻放並發射 3 顆發光孢子。",
      movementLabel: "蓄力 300ms／綻放 400ms／收回／孢子"
    }),
    silver: Object.freeze({
      id: "silver",
      name: "白色鏡像水晶菌",
      color: "#f7fbff",
      coreColor: "#bba2ff",
      bodySize: 5,
      tickMs: 400,
      movement: "mirror-crystal",
      mirror: true,
      seedOffsets: Object.freeze([
        { x: 0, y: 0 },
        { x: 0, y: -1 },
        { x: 1, y: 0 },
        { x: 0, y: 1 },
        { x: -1, y: 0 }
      ]),
      description: "五格水晶身體，模仿附近微生物方向並留下 600ms 半透明鏡像。",
      movementLabel: "八方向移動 1 格／鏡像 600ms"
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
      allConnected: true,
      blackContacts: new Set(),
      blackProductionCooldownUntil: 0,
      effects: {
        electricArcs: [],
        spores: [],
        mirrorImages: [],
        pulses: [],
        auroras: []
      }
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

  function weightedRandomItem(items) {
    if (!items.length) return null;
    const totalWeight = items.reduce((total, item) => total + item.weight, 0);
    let cursor = Math.random() * totalWeight;
    for (const item of items) {
      cursor -= item.weight;
      if (cursor <= 0) return item;
    }
    return items[items.length - 1];
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

  function neighborsWithDirectionsOf(index, directions) {
    const point = pointOf(index);
    return directions
      .map((direction) => ({ x: point.x + direction.x, y: point.y + direction.y }))
      .filter((nextPoint) => isInside(nextPoint.x, nextPoint.y))
      .map((nextPoint) => indexOf(nextPoint.x, nextPoint.y));
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

  function transformLocalOffset(offset, direction) {
    const right = { x: -direction.y, y: direction.x };
    return {
      x: right.x * offset.x - direction.x * offset.y,
      y: right.y * offset.x - direction.y * offset.y
    };
  }

  function transformJellyOffset(offset, direction) {
    return transformLocalOffset(offset, direction);
  }

  function getJellyCells(anchor, direction, phase, type = MICROBE_TYPES["light-blue"]) {
    const offsets = phase === "contracted" ? type.contractedOffsets : type.expandedOffsets;
    return new Set(offsets.map((offset) => {
      const transformed = transformJellyOffset(offset, direction);
      return indexOf(anchor.x + transformed.x, anchor.y + transformed.y);
    }));
  }

  function getJellyHeadCell(anchor, direction, phase, type = MICROBE_TYPES["light-blue"]) {
    const offset = phase === "contracted" ? type.contractedHeadOffset : type.expandedHeadOffset;
    const transformed = transformJellyOffset(offset, direction);
    return isInside(anchor.x + transformed.x, anchor.y + transformed.y)
      ? indexOf(anchor.x + transformed.x, anchor.y + transformed.y)
      : null;
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
    const timingLabel = type.intervalLabel || `每格移動間隔 ${type.tickMs}ms`;
    setBoardStatus(`${type.name}已選取，${timingLabel}。`);
    setDirty();
  }

  function addEvent() {}

  function refreshConnectivity() {
    state.allConnected = state.microbes.length === 0 || state.microbes.every((microbe) => microbe.connected);
  }

  function getTotalVolume() {
    return state.microbes.reduce((total, microbe) => total + microbe.cells.size, 0);
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

  function isEightConnected(cellSet) {
    if (cellSet.size === 0) return true;
    const firstCell = cellSet.values().next().value;
    const visited = new Set([firstCell]);
    const pending = [firstCell];

    while (pending.length) {
      const current = pending.pop();
      neighborsWithDirectionsOf(current, EIGHT_DIRECTIONS).forEach((neighbor) => {
        if (cellSet.has(neighbor) && !visited.has(neighbor)) {
          visited.add(neighbor);
          pending.push(neighbor);
        }
      });
    }

    return visited.size === cellSet.size;
  }

  function isBodyConnected(microbe) {
    return microbe.type.jelly ? isEightConnected(microbe.cells) : isConnected(microbe.cells);
  }

  function updateUi() {
    const latestMicrobe = state.microbes[state.microbes.length - 1] || null;
    const latestCenter = centerOfBody(latestMicrobe);
    const totalVolume = getTotalVolume();
    const selectedType = MICROBE_TYPES[state.selectedTypeId];

    canvas.dataset.gridSize = String(CONFIG.gridSize);
    canvas.dataset.microbeCount = String(state.microbes.length);
    canvas.dataset.bodySize = String(latestMicrobe ? latestMicrobe.cells.size : 0);
    canvas.dataset.bodyConnected = String(state.allConnected);
    statusValue.textContent = !state.microbes.length ? "等待放置" : state.paused ? "已暫停" : "正在移動";
    countValue.textContent = String(state.microbes.length);
    volumeValue.textContent = `${totalVolume} 格`;
    stepsValue.textContent = String(state.totalMoves);
    if (bodySizeValue) bodySizeValue.textContent = latestMicrobe ? `${latestMicrobe.cells.size} 格` : "—";
    if (intervalValue) intervalValue.textContent = selectedType.intervalLabel || `${selectedType.tickMs}ms`;
    if (infoTitle) infoTitle.textContent = `${selectedType.name}選項`;
    if (infoCopy) infoCopy.textContent = selectedType.description;
    if (infoSwatch) {
      infoSwatch.classList.toggle("is-black", selectedType.id === "black");
      infoSwatch.classList.toggle("is-green", selectedType.id === "green");
      infoSwatch.classList.toggle("is-red", selectedType.id === "red");
      infoSwatch.classList.toggle("is-light-blue", selectedType.id === "light-blue");
      infoSwatch.classList.toggle("is-purple", selectedType.id === "purple");
      infoSwatch.classList.toggle("is-gold", selectedType.id === "gold");
      infoSwatch.classList.toggle("is-orange", selectedType.id === "orange");
      infoSwatch.classList.toggle("is-silver", selectedType.id === "silver");
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
    context.fillStyle = type.id === "light-blue"
      ? "rgba(20, 112, 139, 0.9)"
      : "rgba(8, 62, 28, 0.85)";
    context.beginPath();
    context.arc((xCell + 0.34) * cellSize, (yCell + 0.34) * cellSize, Math.max(1.2, cellSize * 0.08), 0, Math.PI * 2);
    context.fill();
  }

  function drawCoreMarkerAt(xCell, yCell, type) {
    if (!type.coreColor) return;
    const cellSize = CONFIG.canvasSize / CONFIG.gridSize;
    context.fillStyle = type.coreColor;
    context.beginPath();
    context.arc((xCell + 0.5) * cellSize, (yCell + 0.5) * cellSize, Math.max(1.5, cellSize * 0.16), 0, Math.PI * 2);
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

  function drawEffects(now) {
    const cellSize = CONFIG.canvasSize / CONFIG.gridSize;

    state.effects.auroras.forEach((aurora) => {
      const point = pointOf(aurora.index);
      const progress = Math.max(0, (aurora.expiresAt - now) / CONFIG.auroraDurationMs);
      const radius = cellSize * (2.5 + (1 - progress) * 4);
      const gradient = context.createRadialGradient(
        (point.x + 0.5) * cellSize,
        (point.y + 0.5) * cellSize,
        0,
        (point.x + 0.5) * cellSize,
        (point.y + 0.5) * cellSize,
        radius
      );
      gradient.addColorStop(0, `rgba(255, 210, 92, ${progress * 0.58})`);
      gradient.addColorStop(0.45, `rgba(255, 142, 229, ${progress * 0.22})`);
      gradient.addColorStop(1, "rgba(126, 224, 255, 0)");
      context.fillStyle = gradient;
      context.beginPath();
      context.arc((point.x + 0.5) * cellSize, (point.y + 0.5) * cellSize, radius, 0, Math.PI * 2);
      context.fill();
    });

    state.effects.electricArcs.forEach((arc) => {
      const progress = Math.max(0, (arc.expiresAt - now) / CONFIG.electricArcDurationMs);
      if (!arc.segments.length) return;
      context.save();
      context.strokeStyle = `rgba(255, 215, 73, ${0.72 * progress})`;
      context.shadowColor = "rgba(255, 198, 50, 0.9)";
      context.shadowBlur = cellSize * 1.4;
      context.lineWidth = Math.max(1.5, cellSize * 0.18);
      context.lineCap = "round";
      arc.segments.forEach((segment) => {
        const from = pointOf(segment.oldCell);
        const to = pointOf(segment.newCell);
        context.beginPath();
        context.moveTo((from.x + 0.5) * cellSize, (from.y + 0.5) * cellSize);
        context.lineTo((to.x + 0.5) * cellSize, (to.y + 0.5) * cellSize);
        context.stroke();
      });
      context.restore();
    });

    state.effects.mirrorImages.forEach((image) => {
      const progress = Math.max(0, (image.expiresAt - now) / CONFIG.mirrorDurationMs);
      image.cells.forEach((index) => {
        const point = pointOf(index);
        drawCellAt(context, point.x, point.y, `rgba(255, 255, 255, ${0.08 + progress * 0.22})`, 0.9, 1.2);
        context.strokeStyle = `rgba(184, 162, 255, ${progress * 0.72})`;
        context.lineWidth = Math.max(1, cellSize * 0.1);
        context.strokeRect(point.x * cellSize + 1, point.y * cellSize + 1, cellSize - 2, cellSize - 2);
      });
    });

    state.effects.spores.forEach((spore) => {
      const point = pointOf(spore.index);
      const pulse = 0.75 + Math.sin((now - spore.startedAt) / 100) * 0.2;
      const progress = Math.max(0, (spore.expiresAt - now) / CONFIG.sporeDurationMs);
      context.save();
      context.fillStyle = `rgba(255, 207, 73, ${progress * pulse})`;
      context.shadowColor = "rgba(255, 132, 38, 0.9)";
      context.shadowBlur = cellSize * 1.25;
      context.beginPath();
      context.arc((point.x + 0.5) * cellSize, (point.y + 0.5) * cellSize, cellSize * 0.23, 0, Math.PI * 2);
      context.fill();
      context.restore();
    });

    state.effects.pulses.forEach((pulse) => {
      const point = pointOf(pulse.index);
      const progress = Math.max(0, (pulse.expiresAt - now) / 600);
      const radius = cellSize * (0.5 + (1 - progress) * 2.5);
      context.strokeStyle = pulse.color.replace(")", `, ${progress})`).replace("rgb(", "rgba(");
      context.lineWidth = Math.max(1, cellSize * 0.12);
      context.beginPath();
      context.arc((point.x + 0.5) * cellSize, (point.y + 0.5) * cellSize, radius, 0, Math.PI * 2);
      context.stroke();
    });
  }

  function drawMicrobeAura(microbe, now) {
    if (microbe.core === null || microbe.core === undefined) return;
    const point = pointOf(microbe.core);
    const cellSize = CONFIG.canvasSize / CONFIG.gridSize;
    const centerX = (point.x + 0.5) * cellSize;
    const centerY = (point.y + 0.5) * cellSize;

    if (microbe.type.electric && microbe.electricCharge > 0) {
      const pulse = 0.72 + Math.sin(now / 90) * 0.18;
      context.strokeStyle = `rgba(255, 211, 60, ${pulse})`;
      context.lineWidth = Math.max(1, cellSize * 0.12);
      context.beginPath();
      context.arc(centerX, centerY, cellSize * (0.34 + microbe.electricCharge * 0.08), 0, Math.PI * 2);
      context.stroke();
    }
    if (microbe.type.firework && ["charging", "bloomed"].includes(microbe.fireworkPhase)) {
      const pulse = 0.35 + Math.sin(now / 75) * 0.15;
      context.fillStyle = `rgba(255, 174, 49, ${pulse})`;
      context.beginPath();
      context.arc(centerX, centerY, cellSize * 0.7, 0, Math.PI * 2);
      context.fill();
    }
    if (microbe.type.mirror) {
      context.strokeStyle = "rgba(187, 162, 255, 0.7)";
      context.lineWidth = Math.max(1, cellSize * 0.1);
      context.beginPath();
      context.moveTo(centerX, centerY - cellSize * 0.35);
      context.lineTo(centerX + cellSize * 0.35, centerY);
      context.lineTo(centerX, centerY + cellSize * 0.35);
      context.lineTo(centerX - cellSize * 0.35, centerY);
      context.closePath();
      context.stroke();
    }
    if (microbe.jellyConductedUntil > now) {
      context.strokeStyle = "rgba(255, 213, 74, 0.75)";
      context.lineWidth = Math.max(1, cellSize * 0.14);
      context.beginPath();
      context.arc(centerX, centerY, cellSize * 0.72, 0, Math.PI * 2);
      context.stroke();
    }
    if (microbe.electricStunnedUntil > now) {
      context.strokeStyle = "rgba(255, 240, 151, 0.82)";
      context.lineWidth = Math.max(1, cellSize * 0.14);
      context.beginPath();
      context.arc(centerX, centerY, cellSize * 0.95, 0, Math.PI * 2);
      context.stroke();
    }
  }

  function drawBodies(now) {
    state.microbes.forEach((microbe) => {
      const visualMove = microbe.visualMove;
      const progress = visualMove
        ? Math.min(1, Math.max(0, (now - visualMove.startedAt) / visualMove.duration))
        : 1;
      const visualSegments = visualMove
        ? visualMove.segments || [{ oldCell: visualMove.oldCell, newCell: visualMove.newCell }]
        : [];

      microbe.cells.forEach((index) => {
        const isHead = index === microbe.head;
        const cellColor = isHead && microbe.type.headColor ? microbe.type.headColor : microbe.type.color;
        const visualSegment = visualSegments.find((segment) => segment.newCell === index);
        if (visualSegment) {
          const from = pointOf(visualSegment.oldCell);
          const to = pointOf(visualSegment.newCell);
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
        if (microbe.type.mirror) {
          const point = pointOf(index);
          const cellSize = CONFIG.canvasSize / CONFIG.gridSize;
          context.strokeStyle = "rgba(159, 130, 224, 0.72)";
          context.lineWidth = Math.max(1, cellSize * 0.08);
          context.strokeRect(point.x * cellSize + 0.9, point.y * cellSize + 0.9, cellSize - 1.8, cellSize - 1.8);
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

      if (microbe.core !== null && microbe.core !== undefined) {
        const corePoint = pointOf(microbe.core);
        drawCoreMarkerAt(corePoint.x, corePoint.y, microbe.type);
      }
      drawMicrobeAura(microbe, now);

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
    drawEffects(now);
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

  function createMicrobeState(typeId, cells, anchor) {
    const type = MICROBE_TYPES[typeId];
    if (!type) return null;
    const bodyOrder = type.orderOffsets ? getCellsFromOffsets(anchor, type.orderOffsets) : null;
    const jellyDirection = type.jelly ? { x: 0, y: -1 } : null;
    const jellyPhase = type.jelly ? "expanded" : null;
    const purpleCore = type.purple ? { ...anchor } : null;
    const purplePhase = type.purple ? "ready" : null;
    const head = type.jelly
      ? getJellyHeadCell(anchor, jellyDirection, jellyPhase, type)
      : type.headOffset
        ? indexOf(anchor.x + type.headOffset.x, anchor.y + type.headOffset.y)
        : null;

    const microbe = {
      id: state.nextMicrobeId,
      typeId,
      type,
      cells: new Set(cells),
      bodySize: cells.size,
      steps: 0,
      connected: type.jelly ? isEightConnected(cells) : isConnected(cells),
      visualMove: null,
      moveAccumulator: 0,
      bodyOrder,
      head,
      core: type.coreColor ? indexOf(anchor.x, anchor.y) : null,
      purpleCore,
      purpleDirection: null,
      purplePhase,
      purplePhaseStartedAt: type.purple ? performance.now() : null,
      purpleHuntingRed: false,
      purpleFastAction: false,
      jellyAnchor: type.jelly ? { ...anchor } : null,
      jellyDirection,
      jellyDirectionPrepared: type.jelly ? true : null,
      jellyPhase,
      jellyRecovering: false,
      jellyRecoveryUntil: 0,
      jellyRecoverySnapshot: null,
      consumedCells: 0,
      growthLevel: 0,
      predatoryPhase: "ready",
      pendingPredatoryMove: null,
      lastMoveDirection: null,
      electricCharge: type.electric ? 0 : null,
      electricChargePulseUntil: 0,
      electricBonusUntil: 0,
      electricStunnedUntil: 0,
      fireworkPhase: type.firework ? "ready" : null,
      fireworkPhaseStartedAt: type.firework ? performance.now() : null,
      fireworkBonusUntil: 0,
      mirrorDecoyHits: 0,
      mirrorBonusUntil: 0,
      mirrorDistractedUntil: 0,
      mirrorDistractedCell: null,
      jellyConductedUntil: 0,
      jellyConductedDirection: null
    };
    state.nextMicrobeId += 1;
    return microbe;
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
    const microbe = createMicrobeState(typeId, cells, anchor);
    state.microbes.push(microbe);
    claimCells(microbe, cells);
    refreshConnectivity();
    return microbe;
  }

  function placeSelectedMicrobe(center) {
    const microbe = createMicrobe(state.selectedTypeId, center);
    if (!microbe) {
      setBoardStatus("這裡已有微生物，請點擊沒有被佔用的空白區。");
      addEvent(`放置失敗：${MICROBE_TYPES[state.selectedTypeId].bodySize} 格種子區與既有微生物重疊。`);
      setDirty();
      return;
    }

    state.paused = false;
    addEvent(`${microbe.type.name} #${microbe.id} 放置完成，佔用 ${microbe.cells.size} 格。`);
    const timingLabel = microbe.type.intervalLabel || `每 ${microbe.type.tickMs} 毫秒移動`;
    setBoardStatus(`已放置 ${state.microbes.length} 隻微生物，${microbe.type.name}${timingLabel}。`);
    processBlackContacts(performance.now());
    refreshConnectivity();
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

  function isJellyPoseInside(anchor, direction, phase, type) {
    const offsets = phase === "contracted" ? type.contractedOffsets : type.expandedOffsets;
    return offsets.every((offset) => {
      const transformed = transformJellyOffset(offset, direction);
      return isInside(anchor.x + transformed.x, anchor.y + transformed.y);
    });
  }

  function getCellOwner(index) {
    const ownerId = state.occupancy.get(index);
    return state.microbes.find((microbe) => microbe.id === ownerId) || null;
  }

  function getTranslatedCells(cells, direction, distance = 1) {
    return new Set(Array.from(cells).map((index) => {
      const point = pointOf(index);
      const nextX = point.x + direction.x * distance;
      const nextY = point.y + direction.y * distance;
      return isInside(nextX, nextY) ? indexOf(nextX, nextY) : -1;
    }));
  }

  function areCellsInside(cells) {
    return Array.from(cells).every((index) => {
      const point = pointOf(index);
      return isInside(point.x, point.y);
    });
  }

  function canOccupyCells(microbe, cells) {
    return areCellsInside(cells) && Array.from(cells).every((index) => {
      const owner = getCellOwner(index);
      return !owner || owner.id === microbe.id;
    });
  }

  function moveBodyTo(microbe, cells, direction, now, countMove = true, distance = 1) {
    const oldCells = new Set(microbe.cells);
    const segments = Array.from(oldCells).map((oldCell) => {
      const point = pointOf(oldCell);
      return {
        oldCell,
        newCell: indexOf(point.x + direction.x * distance, point.y + direction.y * distance)
      };
    });
    oldCells.forEach((index) => releaseCell(microbe, index));
    microbe.cells = new Set(cells);
    claimCells(microbe, microbe.cells);
    microbe.bodySize = microbe.cells.size;
    microbe.connected = isBodyConnected(microbe);
    if (microbe.core !== null && microbe.core !== undefined) {
      const corePoint = pointOf(microbe.core);
      microbe.core = indexOf(corePoint.x + direction.x * distance, corePoint.y + direction.y * distance);
    }
    microbe.lastMoveDirection = { ...direction };
    microbe.visualMove = {
      segments,
      startedAt: now,
      duration: CONFIG.moveAnimationMs
    };
    state.trail.push(...segments.map((segment) => ({
      ...segment,
      expiresAt: now + CONFIG.trailDurationMs
    })));
    if (countMove) {
      microbe.steps += 1;
      state.totalMoves += 1;
    }
    return segments;
  }

  function getNearestOtherMicrobe(microbe, origin = microbe.core) {
    if (origin === null || origin === undefined) return null;
    const originPoint = typeof origin === "number" ? pointOf(origin) : origin;
    return state.microbes
      .filter((otherMicrobe) => otherMicrobe !== microbe && otherMicrobe.cells.size > 0)
      .map((otherMicrobe) => {
        const target = centerOfBody(otherMicrobe);
        return {
          microbe: otherMicrobe,
          target,
          distance: Math.hypot(target.x - originPoint.x, target.y - originPoint.y)
        };
      })
      .sort((first, second) => first.distance - second.distance)[0] || null;
  }

  function getMirrorImageHits(path) {
    return state.effects.mirrorImages.filter((image) => {
      return image.cells && Array.from(image.cells).some((index) => path.includes(index));
    });
  }

  function removeSpore(spore) {
    const index = state.effects.spores.indexOf(spore);
    if (index >= 0) state.effects.spores.splice(index, 1);
  }

  function getSporeHits(cells) {
    return state.effects.spores.filter((spore) => cells.has(spore.index));
  }

  function addPulse(index, color, now, duration = 600) {
    state.effects.pulses.push({ index, color, startedAt: now, expiresAt: now + duration });
  }

  function addElectricArc(segments, now) {
    state.effects.electricArcs.push({
      segments,
      startedAt: now,
      expiresAt: now + CONFIG.electricArcDurationMs
    });
  }

  function addMirrorImages(microbe, now) {
    const count = microbe.mirrorBonusUntil > now ? 5 : 3;
    const cells = Array.from(microbe.cells);
    const selectedCells = shuffle(cells).slice(0, Math.min(count, cells.length));
    state.effects.mirrorImages.push({
      ownerId: microbe.id,
      cells: new Set(selectedCells),
      startedAt: now,
      expiresAt: now + CONFIG.mirrorDurationMs
    });
  }

  function spawnFireworkSpores(microbe, now) {
    if (microbe.core === null || microbe.core === undefined) return;
    const center = pointOf(microbe.core);
    const directions = shuffle(EIGHT_DIRECTIONS.slice());
    const count = microbe.fireworkBonusUntil > now ? 4 : 3;
    let spawned = 0;
    for (const direction of directions) {
      if (spawned >= count) break;
      const x = center.x + direction.x * 2;
      const y = center.y + direction.y * 2;
      if (!isInside(x, y)) continue;
      const index = indexOf(x, y);
      if (state.occupancy.has(index) || state.effects.spores.some((spore) => spore.index === index)) continue;
      state.effects.spores.push({
        ownerId: microbe.id,
        index,
        startedAt: now,
        expiresAt: now + CONFIG.sporeDurationMs
      });
      addPulse(index, "rgb(255, 176, 49)", now, 500);
      spawned += 1;
    }
  }

  function getNearestMirrorImageTarget(microbe, origin) {
    const originPoint = typeof origin === "number" ? pointOf(origin) : origin;
    return state.effects.mirrorImages
      .filter((image) => image.ownerId !== microbe.id && image.cells.size > 0)
      .flatMap((image) => Array.from(image.cells).map((index) => ({
        image,
        point: pointOf(index),
        distance: Math.hypot(pointOf(index).x - originPoint.x, pointOf(index).y - originPoint.y)
      })))
      .sort((first, second) => first.distance - second.distance)[0] || null;
  }

  function findMicrobeById(id) {
    return state.microbes.find((microbe) => microbe.id === id) || null;
  }

  function triggerAurora(arcMicrobe, spore, mirrorMicrobe, now) {
    removeSpore(spore);
    arcMicrobe.electricBonusUntil = now + 1200;
    const orangeMicrobe = findMicrobeById(spore.ownerId);
    if (orangeMicrobe) orangeMicrobe.fireworkBonusUntil = now + 1200;
    mirrorMicrobe.mirrorBonusUntil = now + 1200;
    state.effects.auroras.push({
      index: spore.index,
      startedAt: now,
      expiresAt: now + CONFIG.auroraDurationMs
    });
    addPulse(spore.index, "rgb(255, 188, 84)", now, CONFIG.auroraDurationMs);
    addEvent(`金色電弧菌 #${arcMicrobe.id} 點燃煙火孢子，與鏡像水晶菌形成極光煙火場。`);
  }

  function tryTriggerAurora(arcMicrobe, arcSegments, now) {
    const arcCells = new Set(arcSegments.flatMap((segment) => [segment.oldCell, segment.newCell]));
    const spore = state.effects.spores.find((candidate) => {
      if (arcCells.has(candidate.index)) return true;
      return Array.from(arcCells).some((index) => neighborsOf(index).includes(candidate.index));
    });
    if (!spore) return false;
    const mirror = state.microbes.find((microbe) => {
      if (!microbe.type.mirror || microbe.cells.size === 0) return false;
      return Array.from(microbe.cells).some((index) => {
        return arcCells.has(index) || Array.from(arcCells).some((arcIndex) => neighborsOf(arcIndex).includes(index));
      });
    });
    if (!mirror) return false;
    triggerAurora(arcMicrobe, spore, mirror, now);
    return true;
  }

  function conductElectricArc(microbe, cells, now) {
    const arc = state.effects.electricArcs.find((candidate) => {
      const arcCells = candidate.segments.flatMap((segment) => [segment.oldCell, segment.newCell]);
      return arcCells.some((index) => cells.has(index));
    });
    if (!arc) return false;
    microbe.jellyConductedUntil = now + 1000;
    microbe.jellyConductedDirection = microbe.jellyDirection ? { ...microbe.jellyDirection } : null;
    addPulse(microbe.head ?? Array.from(cells)[0], "rgb(255, 215, 74)", now, 700);
    addEvent(`${microbe.type.name} #${microbe.id} 導出金色電弧，下一次收縮固定目前方向。`);
    return true;
  }

  function cleanupEffects(now) {
    state.effects.electricArcs = state.effects.electricArcs.filter((effect) => effect.expiresAt > now);
    state.effects.spores = state.effects.spores.filter((effect) => effect.expiresAt > now);
    state.effects.mirrorImages = state.effects.mirrorImages.filter((effect) => effect.expiresAt > now);
    state.effects.pulses = state.effects.pulses.filter((effect) => effect.expiresAt > now);
    state.effects.auroras = state.effects.auroras.filter((effect) => effect.expiresAt > now);
  }

  function startJellyfishRecovery(microbe, now) {
    if (!microbe.type.jelly) return;
    const wasRecovering = microbe.jellyRecovering;
    const direction = microbe.jellyDirection || { x: 0, y: -1 };
    if (!microbe.jellyRecoverySnapshot) {
      microbe.jellyRecoverySnapshot = {
        anchor: { ...microbe.jellyAnchor },
        direction: { ...direction }
      };
    }
    microbe.jellyRecovering = true;
    microbe.jellyRecoveryUntil = Math.max(microbe.jellyRecoveryUntil, now + 3000);
    microbe.jellyPhase = "recovery";
    microbe.visualMove = null;
    if (!wasRecovering) {
      addEvent(`${microbe.type.name} #${microbe.id} 受到損失，停止 3 秒後恢復原狀。`);
    }
  }

  function restoreJellyfishIfReady(microbe, now) {
    if (!microbe.type.jelly || !microbe.jellyRecovering || now < microbe.jellyRecoveryUntil) return false;
    const snapshot = microbe.jellyRecoverySnapshot;
    if (!snapshot || !isJellyPoseInside(snapshot.anchor, snapshot.direction, "expanded", microbe.type)) {
      microbe.jellyRecoveryUntil = now + 100;
      return false;
    }

    const restoredCells = getJellyCells(snapshot.anchor, snapshot.direction, "expanded", microbe.type);
    const blocked = Array.from(restoredCells).some((index) => {
      const ownerId = state.occupancy.get(index);
      return ownerId !== undefined && ownerId !== microbe.id;
    });
    if (blocked) {
      microbe.jellyRecoveryUntil = now + 100;
      return false;
    }

    microbe.cells.forEach((index) => releaseCell(microbe, index));
    microbe.cells = restoredCells;
    claimCells(microbe, restoredCells);
    microbe.bodySize = restoredCells.size;
    microbe.jellyAnchor = { ...snapshot.anchor };
    microbe.jellyDirection = { ...snapshot.direction };
    microbe.jellyDirectionPrepared = true;
    microbe.jellyPhase = "expanded";
    microbe.jellyRecovering = false;
    microbe.jellyRecoveryUntil = 0;
    microbe.jellyRecoverySnapshot = null;
    microbe.head = getJellyHeadCell(microbe.jellyAnchor, microbe.jellyDirection, "expanded", microbe.type);
    microbe.connected = isBodyConnected(microbe);
    addEvent(`${microbe.type.name} #${microbe.id} 已恢復原狀。`);
    setDirty();
    return true;
  }

  function getNonBreakingGrowthCandidates(microbe) {
    return getGrowthCandidates(microbe).filter((newCell) => {
      return getConnectedRetractions(microbe, newCell).length > 0;
    });
  }

  function consumeForeignCell(predator, index) {
    const ownerId = state.occupancy.get(index);
    if (ownerId === undefined || ownerId === predator.id) return null;

    const prey = state.microbes.find((microbe) => microbe.id === ownerId);
    if (!prey) {
      state.occupancy.delete(index);
      return null;
    }
    if (prey.typeId === "red" && predator.typeId !== "purple") return null;
    if (predator.typeId === "red" && prey.typeId === "purple") return null;
    if (predator.typeId === "purple" && prey.typeId !== "red") return null;

    prey.cells.delete(index);
    state.occupancy.set(index, predator.id);
    if (prey.typeId === "light-blue") startJellyfishRecovery(prey, performance.now());
    if (prey.bodyOrder) {
      prey.bodyOrder = prey.bodyOrder.filter((cell) => prey.cells.has(cell));
      if (prey.head !== null && !prey.cells.has(prey.head)) {
        prey.head = prey.bodyOrder[0] ?? null;
      }
    }
    prey.bodySize = prey.cells.size;
    prey.connected = prey.type.jelly ? isEightConnected(prey.cells) : isConnected(prey.cells);
    if (prey.cells.size === 0 && prey.typeId !== "light-blue") {
      state.microbes = state.microbes.filter((microbe) => microbe !== prey);
    }
    return prey;
  }

  function getBlackContacts() {
    const blackMicrobes = state.microbes.filter((microbe) => {
      return microbe.typeId === "black" && microbe.cells.size > 0;
    });
    const contacts = new Map();

    for (let firstIndex = 0; firstIndex < blackMicrobes.length - 1; firstIndex += 1) {
      const firstMicrobe = blackMicrobes[firstIndex];
      for (let secondIndex = firstIndex + 1; secondIndex < blackMicrobes.length; secondIndex += 1) {
        const secondMicrobe = blackMicrobes[secondIndex];
        let contact = null;
        firstMicrobe.cells.forEach((firstCell) => {
          if (contact) return;
          neighborsOf(firstCell).some((secondCell) => {
            if (!secondMicrobe.cells.has(secondCell)) return false;
            contact = { firstCell, secondCell };
            return true;
          });
        });
        if (contact) {
          contacts.set(`${firstMicrobe.id}:${secondMicrobe.id}`, {
            firstMicrobe,
            secondMicrobe,
            ...contact
          });
        }
      }
    }
    return contacts;
  }

  function findBlackOffspringCenter(contact) {
    const basePoints = [
      pointOf(contact.firstCell),
      pointOf(contact.secondCell),
      centerOfBody(contact.firstMicrobe),
      centerOfBody(contact.secondMicrobe)
    ].filter(Boolean);
    const candidates = [];
    const seen = new Set();

    basePoints.forEach((basePoint) => {
      for (let yOffset = -8; yOffset <= 8; yOffset += 1) {
        for (let xOffset = -8; xOffset <= 8; xOffset += 1) {
          const x = basePoint.x + xOffset;
          const y = basePoint.y + yOffset;
          if (!isInside(x, y)) continue;
          const key = `${x},${y}`;
          if (seen.has(key)) continue;
          seen.add(key);
          candidates.push({ x, y });
        }
      }
    });

    shuffle(candidates);
    const type = MICROBE_TYPES.black;
    return candidates.find((center) => {
      const cells = getPlacementCells(center, type);
      return Array.from(cells).every((index) => !state.occupancy.has(index));
    }) || null;
  }

  function processBlackContacts(now) {
    const contacts = getBlackContacts();
    contacts.forEach((contact, key) => {
      if (state.blackContacts.has(key) || now < state.blackProductionCooldownUntil) return;
      if (Math.random() >= 0.5) return;

      const center = findBlackOffspringCenter(contact);
      if (!center) return;
      const offspring = createMicrobe("black", center);
      if (!offspring) return;

      state.blackProductionCooldownUntil = now + 3000;
      addEvent(`黑色微生物 #${contact.firstMicrobe.id} 與 #${contact.secondMicrobe.id} 碰觸，產出黑色微生物 #${offspring.id}，冷卻 3 秒。`);
    });
    state.blackContacts = new Set(contacts.keys());
  }

  function getNearestRedTarget(microbe, origin) {
    const originPoint = pointOf(origin);
    const otherMicrobes = state.microbes.filter((otherMicrobe) => {
      return otherMicrobe !== microbe && otherMicrobe.cells.size > 0;
    });
    const edibleMicrobes = otherMicrobes.filter((otherMicrobe) => {
      return otherMicrobe.typeId !== "red" && otherMicrobe.typeId !== "purple";
    });
    const targetPool = edibleMicrobes.length
      ? edibleMicrobes
      : otherMicrobes.filter((otherMicrobe) => otherMicrobe.typeId !== "purple");

    return targetPool.reduce((nearest, otherMicrobe) => {
      const target = centerOfBody(otherMicrobe);
      const distance = Math.hypot(target.x - originPoint.x, target.y - originPoint.y);
      if (!nearest || distance < nearest.distance) return { target, distance };
      return nearest;
    }, null);
  }

  function getRedDirectionWeight(microbe, origin, direction, now = performance.now()) {
    const originPoint = pointOf(origin);
    const distractedPoint = microbe.mirrorDistractedUntil > now && microbe.mirrorDistractedCell !== null
      ? pointOf(microbe.mirrorDistractedCell)
      : null;
    const mirrorTarget = getNearestMirrorImageTarget(microbe, origin);
    const visualTarget = distractedPoint || mirrorTarget?.point || null;
    const nearestTarget = visualTarget
      ? {
        target: visualTarget,
        distance: Math.hypot(visualTarget.x - originPoint.x, visualTarget.y - originPoint.y)
      }
      : getNearestRedTarget(microbe, origin);
    if (!nearestTarget) return 1;

    const destination = {
      x: originPoint.x + direction.x * 2,
      y: originPoint.y + direction.y * 2
    };
    const destinationDistance = Math.hypot(
      nearestTarget.target.x - destination.x,
      nearestTarget.target.y - destination.y
    );
    const distanceReduction = nearestTarget.distance - destinationDistance;
    return 1 + Math.max(0, distanceReduction) * 8;
  }

  function getRedMoveCandidates(microbe, now) {
    const candidates = [];
    microbe.cells.forEach((origin) => {
      const originPoint = pointOf(origin);
      DIRECTIONS.forEach((direction) => {
        const firstPoint = {
          x: originPoint.x + direction.x,
          y: originPoint.y + direction.y
        };
        const secondPoint = {
          x: originPoint.x + direction.x * 2,
          y: originPoint.y + direction.y * 2
        };
        if (!isInside(firstPoint.x, firstPoint.y) || !isInside(secondPoint.x, secondPoint.y)) return;

        const path = [indexOf(firstPoint.x, firstPoint.y), indexOf(secondPoint.x, secondPoint.y)];
        if (path.some((index) => microbe.cells.has(index))) return;
        const blockedByRed = path.some((index) => {
          const owner = getCellOwner(index);
          return owner?.typeId === "red";
        });
        if (blockedByRed) return;
        const blockedByPurple = path.some((index) => {
          const owner = getCellOwner(index);
          return owner?.typeId === "purple";
        });
        if (blockedByPurple) return;
        const blockedByRecoveringJellyfish = path.some((index) => {
          const owner = getCellOwner(index);
          return owner?.typeId === "light-blue" && owner.jellyRecovering;
        });
        if (blockedByRecoveringJellyfish) return;
        const chargedGoldCells = path.filter((index) => {
          const owner = getCellOwner(index);
          return owner?.typeId === "gold" && owner.electricCharge > 0;
        });
        const mirrorHits = getMirrorImageHits(path);
        const consumedCells = path.filter((index) => {
          const owner = getCellOwner(index);
          return owner
            && owner.id !== microbe.id
            && owner.typeId !== "red"
            && !(owner.typeId === "gold" && owner.electricCharge > 0);
        });
        candidates.push({
          origin,
          direction,
          path,
          consumedCells,
          chargedGoldCells,
          mirrorHits,
          weight: getRedDirectionWeight(microbe, origin, direction, now)
        });
      });
    });
    return candidates;
  }

  function getRedRetractionOptions(microbe, candidate) {
    const totalConsumed = microbe.consumedCells + candidate.consumedCells.length;
    const nextGrowthLevel = Math.floor(totalConsumed / 2);
    const growthGain = Math.max(0, nextGrowthLevel - microbe.growthLevel);
    const retractionCount = Math.max(0, 2 - growthGain);
    const originalCells = Array.from(microbe.cells).filter((index) => index !== candidate.origin);
    const extendedCells = new Set(microbe.cells);
    candidate.path.forEach((index) => extendedCells.add(index));

    if (retractionCount === 0) {
      return isConnected(extendedCells) ? [{ cells: [], growthGain }] : [];
    }
    if (originalCells.length < retractionCount) return [];

    const options = [];
    if (retractionCount === 1) {
      originalCells.forEach((oldCell) => {
        const nextCells = new Set(extendedCells);
        nextCells.delete(oldCell);
        if (isConnected(nextCells)) options.push({ cells: [oldCell], growthGain });
      });
      return options;
    }

    for (let firstIndex = 0; firstIndex < originalCells.length - 1; firstIndex += 1) {
      for (let secondIndex = firstIndex + 1; secondIndex < originalCells.length; secondIndex += 1) {
        const nextCells = new Set(extendedCells);
        nextCells.delete(originalCells[firstIndex]);
        nextCells.delete(originalCells[secondIndex]);
        if (isConnected(nextCells)) {
          options.push({
            cells: [originalCells[firstIndex], originalCells[secondIndex]],
            growthGain
          });
        }
      }
    }
    return options;
  }

  function getRedSplitPartition(cells) {
    const cellList = Array.from(cells);
    if (cellList.length < 2) return null;

    const root = randomItem(cellList);
    const parent = new Map([[root, null]]);
    const traversal = [root];
    for (let cursor = 0; cursor < traversal.length; cursor += 1) {
      const current = traversal[cursor];
      shuffle(neighborsOf(current)).forEach((neighbor) => {
        if (!cells.has(neighbor) || parent.has(neighbor)) return;
        parent.set(neighbor, current);
        traversal.push(neighbor);
      });
    }
    if (traversal.length !== cellList.length) return null;

    const children = new Map(traversal.map((index) => [index, []]));
    traversal.slice(1).forEach((index) => {
      children.get(parent.get(index)).push(index);
    });

    const subtreeSizes = new Map();
    for (let cursor = traversal.length - 1; cursor >= 0; cursor -= 1) {
      const index = traversal[cursor];
      const subtreeSize = children.get(index).reduce((total, child) => {
        return total + subtreeSizes.get(child);
      }, 1);
      subtreeSizes.set(index, subtreeSize);
    }

    const totalSize = cellList.length;
    const cuts = traversal.slice(1).map((child) => {
      const fragmentSize = subtreeSizes.get(child);
      return {
        child,
        fragmentSize,
        difference: Math.abs(totalSize - fragmentSize * 2)
      };
    });
    const bestDifference = Math.min(...cuts.map((cut) => cut.difference));
    const selectedCut = randomItem(cuts.filter((cut) => cut.difference === bestDifference));
    const fragmentCells = new Set();
    const pending = [selectedCut.child];
    while (pending.length) {
      const index = pending.pop();
      fragmentCells.add(index);
      pending.push(...children.get(index));
    }

    let originalCells = new Set(cellList.filter((index) => !fragmentCells.has(index)));
    if (!originalCells.size || !fragmentCells.size) return null;
    if (fragmentCells.size > originalCells.size) {
      const largerSide = new Set(fragmentCells);
      const smallerSide = new Set(originalCells);
      originalCells = largerSide;
      fragmentCells.clear();
      smallerSide.forEach((index) => fragmentCells.add(index));
    }
    return { originalCells, fragmentCells };
  }

  function splitRedIfOvergrown(microbe) {
    if (microbe.typeId !== "red" || microbe.cells.size <= CONFIG.redSplitThreshold) return null;
    const partition = getRedSplitPartition(microbe.cells);
    if (!partition) return null;

    microbe.cells.forEach((index) => releaseCell(microbe, index));
    microbe.cells = partition.originalCells;
    microbe.bodySize = microbe.cells.size;
    microbe.connected = isConnected(microbe.cells);
    microbe.visualMove = null;
    microbe.consumedCells = 0;
    microbe.growthLevel = 0;
    microbe.predatoryPhase = "ready";
    microbe.pendingPredatoryMove = null;
    claimCells(microbe, microbe.cells);

    const fragment = createMicrobeState("red", partition.fragmentCells, null);
    state.microbes.push(fragment);
    claimCells(fragment, fragment.cells);
    return fragment;
  }

  function getDirectionBetween(from, to) {
    const direction = {
      x: Math.sign(to.x - from.x),
      y: Math.sign(to.y - from.y)
    };
    return direction.x === 0 && direction.y === 0 ? { x: 0, y: -1 } : direction;
  }

  function triggerElectricOverload(electricMicrobe, redMicrobe, now) {
    electricMicrobe.electricCharge = 0;
    electricMicrobe.electricChargePulseUntil = now + 700;
    redMicrobe.electricStunnedUntil = Math.max(redMicrobe.electricStunnedUntil, now + 650);
    const electricPoint = pointOf(electricMicrobe.core);
    const redCenter = centerOfBody(redMicrobe);
    const pushDirection = getDirectionBetween(electricPoint, redCenter);
    const pushedCells = getTranslatedCells(redMicrobe.cells, pushDirection, 1);
    if (canOccupyCells(redMicrobe, pushedCells)) {
      moveBodyTo(redMicrobe, pushedCells, pushDirection, now, true);
    }
    addElectricArc([
      { oldCell: electricMicrobe.core, newCell: redMicrobe.core ?? Array.from(redMicrobe.cells)[0] }
    ], now);
    addPulse(electricMicrobe.core, "rgb(255, 211, 60)", now, 700);
    addEvent(`${redMicrobe.type.name} #${redMicrobe.id} 觸碰帶電的${electricMicrobe.type.name}，被過載電擊推回。`);
  }

  function teleportMirrorCrystal(microbe, now) {
    const directions = shuffle(EIGHT_DIRECTIONS.slice());
    for (const direction of directions) {
      const cells = getTranslatedCells(microbe.cells, direction, 1);
      if (!canOccupyCells(microbe, cells)) continue;
      moveBodyTo(microbe, cells, direction, now, true);
      addPulse(microbe.core, "rgb(187, 162, 255)", now, 650);
      addEvent(`${microbe.type.name} #${microbe.id} 被幻影誤導兩次，折射瞬移一格。`);
      return true;
    }
    return false;
  }

  function handleMirrorDecoyHit(redMicrobe, image, now) {
    const mirrorMicrobe = findMicrobeById(image.ownerId);
    if (!mirrorMicrobe) return;
    redMicrobe.mirrorDistractedUntil = now + 700;
    redMicrobe.mirrorDistractedCell = Array.from(image.cells)[0] ?? null;
    mirrorMicrobe.mirrorDecoyHits += 1;
    addPulse(redMicrobe.mirrorDistractedCell, "rgb(187, 162, 255)", now, 500);
    if (mirrorMicrobe.mirrorDecoyHits < 2) return;
    mirrorMicrobe.mirrorDecoyHits = 0;
    teleportMirrorCrystal(mirrorMicrobe, now);
  }

  function beginPredatoryTwoStep(microbe, now) {
    if (microbe.electricStunnedUntil > now) return false;
    const candidates = getRedMoveCandidates(microbe, now)
      .map((candidate) => ({
        ...candidate,
        retractionOptions: getRedRetractionOptions(microbe, candidate)
      }))
      .filter((candidate) => candidate.retractionOptions.length > 0);
    if (candidates.length === 0) return false;

    const candidate = weightedRandomItem(candidates);
    if (candidate.chargedGoldCells.length > 0) {
      const electricMicrobe = getCellOwner(candidate.chargedGoldCells[0]);
      if (electricMicrobe) triggerElectricOverload(electricMicrobe, microbe, now);
      return false;
    }
    const retractionPlan = randomItem(candidate.retractionOptions);
    const consumedPrey = candidate.path
      .map((index) => consumeForeignCell(microbe, index))
      .filter(Boolean);
    candidate.path.forEach((index) => {
      microbe.cells.add(index);
      state.occupancy.set(index, microbe.id);
    });
    candidate.mirrorHits.forEach((image) => handleMirrorDecoyHit(microbe, image, now));

    microbe.consumedCells += candidate.consumedCells.length;
    microbe.growthLevel += retractionPlan.growthGain;
    microbe.bodySize = microbe.cells.size;
    microbe.connected = isConnected(microbe.cells);
    microbe.lastMoveDirection = { ...candidate.direction };
    microbe.predatoryPhase = "extended";
    microbe.pendingPredatoryMove = {
      retractionCells: retractionPlan.cells,
      growthGain: retractionPlan.growthGain,
      consumedCount: candidate.consumedCells.length
    };
    microbe.visualMove = {
      segments: [
        { oldCell: candidate.origin, newCell: candidate.path[0] },
        { oldCell: candidate.path[0], newCell: candidate.path[1] }
      ],
      startedAt: now,
      duration: CONFIG.moveAnimationMs
    };
    state.trail.push(
      { oldCell: candidate.origin, newCell: candidate.path[0], expiresAt: now + CONFIG.trailDurationMs },
      { oldCell: candidate.path[0], newCell: candidate.path[1], expiresAt: now + CONFIG.trailDurationMs }
    );

    if (consumedPrey.length > 0) {
      addEvent(`${microbe.type.name} #${microbe.id} 延伸兩格並吞噬 ${candidate.consumedCells.length} 格其他生物，250ms 後收回。`);
    } else {
      addEvent(`${microbe.type.name} #${microbe.id} 延伸兩格，250ms 後收回。`);
    }
    return true;
  }

  function finishPredatoryTwoStep(microbe) {
    const pendingMove = microbe.pendingPredatoryMove;
    if (!pendingMove) {
      microbe.predatoryPhase = "ready";
      return false;
    }

    pendingMove.retractionCells.forEach((oldCell) => {
      releaseCell(microbe, oldCell);
      microbe.cells.delete(oldCell);
    });
    microbe.pendingPredatoryMove = null;
    microbe.predatoryPhase = "ready";
    microbe.bodySize = microbe.cells.size;
    microbe.steps += 1;
    microbe.connected = isConnected(microbe.cells);
    state.totalMoves += 1;

    const splitFragment = splitRedIfOvergrown(microbe);

    const growthMessage = pendingMove.growthGain > 0
      ? `，身體增加 ${pendingMove.growthGain} 格`
      : "";
    const splitMessage = splitFragment
      ? `，超過 ${CONFIG.redSplitThreshold} 格，斷裂成 #${microbe.id} 與 #${splitFragment.id}`
      : "";
    addEvent(`${microbe.type.name} #${microbe.id} 收回 ${pendingMove.retractionCells.length} 格，完成移動${growthMessage}${splitMessage}，250ms 後再延伸。`);
    return true;
  }

  function movePredatoryTwoStep(microbe, now) {
    return microbe.predatoryPhase === "extended"
      ? finishPredatoryTwoStep(microbe)
      : beginPredatoryTwoStep(microbe, now);
  }

  function getElectricDashCandidates(microbe) {
    if (microbe.core === null || microbe.core === undefined) return [];
    const origin = pointOf(microbe.core);
    const target = getNearestOtherMicrobe(microbe, microbe.core);
    return EIGHT_DIRECTIONS.flatMap((direction) => {
      const cells = getTranslatedCells(microbe.cells, direction, 2);
      if (!canOccupyCells(microbe, cells)) return [];
      const destination = {
        x: origin.x + direction.x * 2,
        y: origin.y + direction.y * 2
      };
      const distanceReduction = target
        ? target.distance - Math.hypot(target.target.x - destination.x, target.target.y - destination.y)
        : 0;
      return [{
        direction,
        cells,
        weight: 1 + Math.max(0, distanceReduction) * (microbe.electricBonusUntil > performance.now() ? 10 : 5)
      }];
    });
  }

  function moveElectricDash(microbe, now) {
    microbe.electricCharge = Math.min(3, (microbe.electricCharge || 0) + 1);
    microbe.electricChargePulseUntil = now + 180;
    const candidates = getElectricDashCandidates(microbe);
    if (!candidates.length) return false;
    const candidate = weightedRandomItem(candidates);
    const segments = moveBodyTo(microbe, candidate.cells, candidate.direction, now, true, 2);
    addElectricArc(segments, now);
    addPulse(microbe.core, "rgb(255, 211, 60)", now, 500);
    tryTriggerAurora(microbe, segments, now);
    addEvent(`${microbe.type.name} #${microbe.id} 蓄電後沿米字方向跳躍兩格，留下金色電弧。`);
    return true;
  }

  function getFireworkMoveCandidates(microbe) {
    if (microbe.core === null || microbe.core === undefined) return [];
    const origin = pointOf(microbe.core);
    return EIGHT_DIRECTIONS.flatMap((direction) => {
      const anchor = {
        x: origin.x + direction.x,
        y: origin.y + direction.y
      };
      if (!isInside(anchor.x, anchor.y)) return [];
      if (MICROBE_TYPES.orange.expandedOffsets.some((offset) => {
        return !isInside(anchor.x + offset.x, anchor.y + offset.y);
      })) return [];
      const expandedCells = new Set(MICROBE_TYPES.orange.expandedOffsets.map((offset) => {
        return indexOf(anchor.x + offset.x, anchor.y + offset.y);
      }));
      const blocked = Array.from(expandedCells).some((index) => {
        const owner = getCellOwner(index);
        return owner && owner.id !== microbe.id;
      });
      if (blocked) return [];
      const emptyCount = Array.from(expandedCells).filter((index) => !state.occupancy.has(index)).length;
      return [{
        direction,
        anchor,
        weight: 1 + emptyCount * 2
      }];
    });
  }

  function applyFireworkPose(microbe, anchor, phase, now, countMove = false) {
    const type = microbe.type;
    const offsets = phase === "bloomed" ? type.expandedOffsets : type.seedOffsets;
    if (offsets.some((offset) => !isInside(anchor.x + offset.x, anchor.y + offset.y))) return false;
    const cells = new Set(offsets.map((offset) => indexOf(anchor.x + offset.x, anchor.y + offset.y)));
    if (!areCellsInside(cells) || !canOccupyCells(microbe, cells)) return false;
    microbe.cells.forEach((index) => releaseCell(microbe, index));
    microbe.cells = cells;
    claimCells(microbe, cells);
    microbe.bodySize = cells.size;
    microbe.core = indexOf(anchor.x, anchor.y);
    microbe.connected = isBodyConnected(microbe);
    if (countMove) {
      microbe.steps += 1;
      state.totalMoves += 1;
    }
    return true;
  }

  function moveFireworkBloom(microbe, now) {
    if (microbe.fireworkPhase === "ready") {
      const candidates = getFireworkMoveCandidates(microbe);
      if (!candidates.length) return false;
      const candidate = weightedRandomItem(candidates);
      if (!applyFireworkPose(microbe, candidate.anchor, "ready", now, true)) return false;
      microbe.lastMoveDirection = { ...candidate.direction };
      microbe.fireworkPhase = "charging";
      microbe.fireworkPhaseStartedAt = now;
      addPulse(microbe.core, "rgb(255, 174, 49)", now, 400);
      addEvent(`${microbe.type.name} #${microbe.id} 找到空白區，開始蓄力 300ms。`);
      return true;
    }

    const elapsed = now - microbe.fireworkPhaseStartedAt;
    if (microbe.fireworkPhase === "charging" && elapsed >= 300) {
      if (!applyFireworkPose(microbe, pointOf(microbe.core), "bloomed", now, false)) {
        microbe.fireworkPhaseStartedAt = now;
        return false;
      }
      spawnFireworkSpores(microbe, now);
      microbe.fireworkPhase = "bloomed";
      microbe.fireworkPhaseStartedAt = now;
      addPulse(microbe.core, "rgb(255, 146, 46)", now, 700);
      addEvent(`${microbe.type.name} #${microbe.id} 綻放並發射發光孢子。`);
      return true;
    }
    if (microbe.fireworkPhase === "bloomed" && elapsed >= 400) {
      if (!applyFireworkPose(microbe, pointOf(microbe.core), "ready", now, false)) {
        microbe.fireworkPhaseStartedAt = now;
        return false;
      }
      microbe.fireworkPhase = "resting";
      microbe.fireworkPhaseStartedAt = now;
      return true;
    }
    if (microbe.fireworkPhase === "resting" && elapsed >= 250) {
      microbe.fireworkPhase = "ready";
      microbe.fireworkPhaseStartedAt = now;
    }
    return false;
  }

  function moveMirrorCrystal(microbe, now) {
    const candidates = EIGHT_DIRECTIONS.flatMap((direction) => {
      const cells = getTranslatedCells(microbe.cells, direction, 1);
      if (!canOccupyCells(microbe, cells)) return [];
      const nearby = getNearestOtherMicrobe(microbe, microbe.core);
      const copiedDirection = nearby?.microbe.lastMoveDirection;
      const copiesNearbyDirection = copiedDirection
        && copiedDirection.x === direction.x
        && copiedDirection.y === direction.y;
      return [{ direction, cells, weight: copiesNearbyDirection ? 10 : nearby ? 2 : 1 }];
    });
    if (!candidates.length) return false;
    const candidate = weightedRandomItem(candidates);
    moveBodyTo(microbe, candidate.cells, candidate.direction, now, true);
    addMirrorImages(microbe, now);
    addPulse(microbe.core, "rgb(187, 162, 255)", now, 450);
    addEvent(`${microbe.type.name} #${microbe.id} 折射移動並留下半透明鏡像。`);
    return true;
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
    const oldPoint = pointOf(oldCell);
    const newPoint = pointOf(newCell);
    microbe.lastMoveDirection = {
      x: Math.sign(newPoint.x - oldPoint.x),
      y: Math.sign(newPoint.y - oldPoint.y)
    };
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
    if (Math.random() < 1 / 3) return false;
    microbe.bodyOrder = microbe.bodyOrder.filter((index) => microbe.cells.has(index));
    if (!microbe.bodyOrder.length) return false;
    if (!microbe.cells.has(microbe.head)) microbe.head = microbe.bodyOrder[0];
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
    microbe.lastMoveDirection = {
      x: Math.sign(pointOf(newHead).x - pointOf(oldHead).x),
      y: Math.sign(pointOf(newHead).y - pointOf(oldHead).y)
    };
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

  function getJellyPoseConflict(microbe, cells) {
    let redHit = false;
    let blocked = false;
    cells.forEach((index) => {
      const owner = getCellOwner(index);
      if (!owner || owner.id === microbe.id) return;
      if (owner.typeId === "red") redHit = true;
      else blocked = true;
    });
    return { redHit, blocked };
  }

  function applyJellyPose(microbe, anchor, direction, phase, cells, now, countMove) {
    const oldHead = microbe.head;
    microbe.cells.forEach((index) => releaseCell(microbe, index));
    microbe.cells = cells;
    claimCells(microbe, cells);
    microbe.bodySize = cells.size;
    microbe.jellyAnchor = { ...anchor };
    microbe.jellyDirection = { ...direction };
    microbe.jellyPhase = phase;
    microbe.head = getJellyHeadCell(anchor, direction, phase, microbe.type);
    microbe.connected = isBodyConnected(microbe);
    microbe.lastMoveDirection = { ...direction };
    if (microbe.type.jelly) conductElectricArc(microbe, cells, now);

    if (countMove) {
      microbe.steps += 1;
      state.totalMoves += 1;
      if (oldHead !== null && microbe.head !== null && oldHead !== microbe.head) {
        microbe.visualMove = {
          oldCell: oldHead,
          newCell: microbe.head,
          startedAt: now,
          duration: CONFIG.moveAnimationMs
        };
        state.trail.push({
          oldCell: oldHead,
          newCell: microbe.head,
          expiresAt: now + CONFIG.trailDurationMs
        });
      }
    }
  }

  function bounceJellyfish(microbe, direction, now) {
    const reverseDirection = { x: -direction.x, y: -direction.y };
    const anchor = {
      x: microbe.jellyAnchor.x + reverseDirection.x * 4,
      y: microbe.jellyAnchor.y + reverseDirection.y * 4
    };
    if (!isJellyPoseInside(anchor, reverseDirection, "contracted", microbe.type)) {
      addEvent(`${microbe.type.name} #${microbe.id} 撞到紅色，但後方四格超出培養區。`);
      return false;
    }
    const cells = getJellyCells(anchor, reverseDirection, "contracted", microbe.type);
    const conflict = getJellyPoseConflict(microbe, cells);
    if (conflict.blocked || conflict.redHit) {
      addEvent(`${microbe.type.name} #${microbe.id} 撞到紅色，但反彈路徑受阻。`);
      return false;
    }
    applyJellyPose(microbe, anchor, reverseDirection, "contracted", cells, now, true);
    microbe.jellyDirectionPrepared = false;
    addEvent(`${microbe.type.name} #${microbe.id} 撞到紅色，立即往回彈四格。`);
    return true;
  }

  function prepareJellyfishDirection(microbe, now) {
    if (!microbe.jellyAnchor) return false;
    const lockedDirection = microbe.jellyConductedUntil > now ? microbe.jellyConductedDirection : null;
    const directionPool = lockedDirection ? [lockedDirection] : EIGHT_DIRECTIONS;
    const candidates = directionPool.flatMap((direction) => {
      if (!isJellyPoseInside(microbe.jellyAnchor, direction, "expanded", microbe.type)) return [];
      const cells = getJellyCells(microbe.jellyAnchor, direction, "expanded", microbe.type);
      const conflict = getJellyPoseConflict(microbe, cells);
      if (conflict.blocked) return [];
      return [{ direction, cells, redHit: conflict.redHit }];
    });
    if (!candidates.length) return false;
    const candidate = randomItem(candidates);
    if (candidate.redHit) return bounceJellyfish(microbe, candidate.direction, now);
    applyJellyPose(
      microbe,
      microbe.jellyAnchor,
      candidate.direction,
      "expanded",
      candidate.cells,
      now,
      false
    );
    microbe.jellyDirectionPrepared = true;
    return true;
  }

  function swingJellyfish(microbe, direction, now) {
    if (!microbe.jellyAnchor || !direction) return false;
    const anchor = {
      x: microbe.jellyAnchor.x + direction.x * 2,
      y: microbe.jellyAnchor.y + direction.y * 2
    };
    if (!isJellyPoseInside(anchor, direction, "contracted", microbe.type)) {
      microbe.jellyDirectionPrepared = false;
      return false;
    }
    const cells = getJellyCells(anchor, direction, "contracted", microbe.type);
    const conflict = getJellyPoseConflict(microbe, cells);
    if (conflict.redHit) return bounceJellyfish(microbe, direction, now);
    if (conflict.blocked) {
      microbe.jellyDirectionPrepared = false;
      return false;
    }
    applyJellyPose(microbe, anchor, direction, "contracted", cells, now, true);
    microbe.jellyDirectionPrepared = false;
    addEvent(`${microbe.type.name} #${microbe.id} 依預備方向揮動前進兩格。`);
    return true;
  }

  function moveJellyfish(microbe, now) {
    if (microbe.jellyRecovering || !microbe.jellyAnchor) return false;
    if (!microbe.jellyDirectionPrepared) return prepareJellyfishDirection(microbe, now);
    return swingJellyfish(microbe, microbe.jellyDirection, now);
  }

  function getPurpleCells(anchor, direction, phase, type = MICROBE_TYPES.purple) {
    const offsets = phase === "expanded" ? type.expandedOffsets : type.seedOffsets;
    return new Set(offsets.map((offset) => {
      const transformed = transformLocalOffset(offset, direction);
      return indexOf(anchor.x + transformed.x, anchor.y + transformed.y);
    }));
  }

  function isPurplePoseInside(anchor, direction, phase, type = MICROBE_TYPES.purple) {
    const offsets = phase === "expanded" ? type.expandedOffsets : type.seedOffsets;
    return offsets.every((offset) => {
      const transformed = transformLocalOffset(offset, direction);
      return isInside(anchor.x + transformed.x, anchor.y + transformed.y);
    });
  }

  function getPurplePoseConflict(microbe, cells) {
    const redCells = [];
    let blocked = false;
    cells.forEach((index) => {
      const owner = getCellOwner(index);
      if (!owner || owner.id === microbe.id) return;
      if (owner.typeId === "red") redCells.push(index);
      else blocked = true;
    });
    return { redCells, blocked };
  }

  function getNearestRedCellTarget(microbe, origin) {
    const originPoint = pointOf(origin);
    return state.microbes
      .filter((otherMicrobe) => otherMicrobe !== microbe && otherMicrobe.typeId === "red" && otherMicrobe.cells.size > 0)
      .reduce((nearest, otherMicrobe) => {
        otherMicrobe.cells.forEach((index) => {
          const point = pointOf(index);
          const distance = Math.hypot(point.x - originPoint.x, point.y - originPoint.y);
          if (!nearest || distance < nearest.distance) nearest = { point, distance };
        });
        return nearest;
      }, null);
  }

  function getPurpleDirectionWeight(microbe, candidate) {
    const openScore = candidate.emptyCount * 3;
    const sporeReward = candidate.sporeCells?.length ? 18 : 0;
    if (!microbe.purpleHuntingRed) return 1 + openScore + sporeReward;

    const target = getNearestRedCellTarget(microbe, microbe.core);
    if (!target) return 1 + openScore;
    const origin = pointOf(microbe.core);
    const destination = pointOf(indexOf(candidate.anchor.x, candidate.anchor.y));
    const currentDistance = Math.hypot(target.point.x - origin.x, target.point.y - origin.y);
    const nextDistance = Math.hypot(target.point.x - destination.x, target.point.y - destination.y);
    const distanceReduction = currentDistance - nextDistance;
    const redReward = candidate.redCells.length ? 40 : 0;
    return 1 + openScore + Math.max(0, distanceReduction) * 10 + redReward + sporeReward;
  }

  function getPurpleMoveCandidates(microbe) {
    if (!microbe.purpleCore) return [];
    return DIRECTIONS.flatMap((direction) => {
      const anchor = {
        x: microbe.purpleCore.x + direction.x,
        y: microbe.purpleCore.y + direction.y
      };
      if (!isPurplePoseInside(anchor, direction, "expanded", microbe.type)) return [];
      const cells = getPurpleCells(anchor, direction, "expanded", microbe.type);
      const conflict = getPurplePoseConflict(microbe, cells);
      if (conflict.blocked || conflict.redCells.length > 1) return [];
      const sporeCells = getSporeHits(cells);
      const emptyCount = Array.from(cells).filter((index) => !state.occupancy.has(index)).length;
      return [{
        anchor,
        cells,
        direction,
        redCells: conflict.redCells,
        sporeCells,
        emptyCount,
        weight: getPurpleDirectionWeight(microbe, {
          anchor,
          direction,
          redCells: conflict.redCells,
          sporeCells,
          emptyCount
        })
      }];
    });
  }

  function applyPurplePose(microbe, anchor, direction, phase, cells, countMove) {
    microbe.cells.forEach((index) => releaseCell(microbe, index));
    microbe.cells = cells;
    claimCells(microbe, cells);
    microbe.bodySize = cells.size;
    microbe.purpleCore = { ...anchor };
    microbe.purpleDirection = { ...direction };
    microbe.core = indexOf(anchor.x, anchor.y);
    microbe.connected = isBodyConnected(microbe);
    microbe.lastMoveDirection = { ...direction };
    if (countMove) {
      microbe.steps += 1;
      state.totalMoves += 1;
    }
  }

  function getPurplePhaseDuration(microbe) {
    const baseDurations = {
      expanded: 100,
      retracting: 500,
      resting: 250
    };
    const duration = baseDurations[microbe.purplePhase] || 0;
    return microbe.purpleFastAction ? duration / 2 : duration;
  }

  function hasRemainingRed() {
    return state.microbes.some((microbe) => microbe.typeId === "red" && microbe.cells.size > 0);
  }

  function beginPurpleMovement(microbe, now) {
    if (Math.random() < 0.25) {
      microbe.purplePhase = "resting";
      microbe.purplePhaseStartedAt = now;
      microbe.purpleFastAction = false;
      return false;
    }

    if (microbe.purpleHuntingRed && !hasRemainingRed()) microbe.purpleHuntingRed = false;
    const candidates = getPurpleMoveCandidates(microbe);
    if (!candidates.length) {
      microbe.purplePhase = "resting";
      microbe.purplePhaseStartedAt = now;
      microbe.purpleFastAction = false;
      return false;
    }

    const candidate = weightedRandomItem(candidates);
    const consumedRed = candidate.redCells.length > 0
      ? consumeForeignCell(microbe, candidate.redCells[0])
      : null;
    if (candidate.redCells.length > 0 && !consumedRed) return false;
    const consumedSpore = candidate.sporeCells.length > 0 ? candidate.sporeCells[0] : null;
    if (consumedSpore) removeSpore(consumedSpore);
    const consumed = Boolean(consumedRed || consumedSpore);

    applyPurplePose(microbe, candidate.anchor, candidate.direction, "expanded", candidate.cells, true);
    microbe.purplePhase = "expanded";
    microbe.purplePhaseStartedAt = now;
    microbe.purpleHuntingRed = Boolean(consumedRed) || microbe.purpleHuntingRed;
    microbe.purpleFastAction = consumed;
    addEvent(consumedRed
      ? `${microbe.type.name} #${microbe.id} 吞噬一格紅色，開始追蹤其他紅色。`
      : consumedSpore
        ? `${microbe.type.name} #${microbe.id} 吞噬發光孢子，進入加速狀態。`
      : `${microbe.type.name} #${microbe.id} 朝空白方向移動並張開。`);
    return true;
  }

  function finishPurpleRetraction(microbe, now) {
    const direction = microbe.purpleDirection || { x: 0, y: -1 };
    const cells = getPurpleCells(microbe.purpleCore, direction, "normal", microbe.type);
    const conflict = getPurplePoseConflict(microbe, cells);
    if (conflict.blocked || conflict.redCells.length > 0) {
      microbe.purplePhaseStartedAt = now;
      return false;
    }
    applyPurplePose(microbe, microbe.purpleCore, direction, "normal", cells, false);
    microbe.purplePhase = "resting";
    microbe.purplePhaseStartedAt = now;
    return true;
  }

  function movePurple(microbe, now) {
    if (microbe.purplePhase === "ready") return beginPurpleMovement(microbe, now);
    if (now - microbe.purplePhaseStartedAt < getPurplePhaseDuration(microbe)) return false;

    if (microbe.purplePhase === "expanded") {
      microbe.purplePhase = "retracting";
      microbe.purplePhaseStartedAt = now;
      return false;
    }
    if (microbe.purplePhase === "retracting") return finishPurpleRetraction(microbe, now);
    if (microbe.purplePhase === "resting") {
      microbe.purplePhase = "ready";
      microbe.purplePhaseStartedAt = now;
      microbe.purpleFastAction = false;
      if (!hasRemainingRed()) microbe.purpleHuntingRed = false;
    }
    return false;
  }

  const MOVEMENT_STRATEGIES = Object.freeze({
    "random-connected-crawl": moveRandomConnected,
    "head-random-crawl": moveHeadRandom,
    "predatory-two-step": movePredatoryTwoStep,
    "jellyfish-swim": moveJellyfish,
    "purple-core-step": movePurple,
    "electric-dash": moveElectricDash,
    "firework-bloom": moveFireworkBloom,
    "mirror-crystal": moveMirrorCrystal
  });

  function stepAllMicrobes(now) {
    if (!state.microbes.length || state.paused) return;
    state.tickCount += 1;
    const movementOrder = shuffle(state.microbes.slice());
    let movedCount = 0;

    movementOrder.forEach((microbe) => {
      if (!state.microbes.includes(microbe)) return;
      if (microbe.type.jelly && microbe.jellyRecovering) {
        restoreJellyfishIfReady(microbe, now);
        return;
      }
      if (microbe.electricStunnedUntil > now) return;
      if (microbe.cells.size === 0) return;
      microbe.moveAccumulator += CONFIG.baseTickMs;
      if (microbe.moveAccumulator < microbe.type.tickMs) return;
      microbe.moveAccumulator -= microbe.type.tickMs;
      const moveStrategy = MOVEMENT_STRATEGIES[microbe.type.movement];
      if (moveStrategy && moveStrategy(microbe, now)) movedCount += 1;
    });

    state.trail = state.trail.filter((move) => move.expiresAt > now);
    cleanupEffects(now);
    processBlackContacts(now);
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
      setBoardStatus("已暫停；所有微生物保持目前身體格數。");
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
    state.blackContacts = new Set();
    state.blackProductionCooldownUntil = 0;
    state.effects = {
      electricArcs: [],
      spores: [],
      mirrorImages: [],
      pulses: [],
      auroras: []
    };
    const selectedType = MICROBE_TYPES[state.selectedTypeId];
    setBoardStatus(`點擊空白區放置${selectedType.name}，可放置多隻。`);
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
