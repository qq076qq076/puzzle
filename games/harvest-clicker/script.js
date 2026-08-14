"use strict";

const {
  BOARD_SIZE, PLOT_GRID_SIZE, INITIAL_PLOT_ID, PLANTS, TOOLS, PLOTS, HARVESTERS, SPRINKLERS, FERTILIZERS,
  createInitialState, validateState, simulateTo, manualHarvest, sowPlot,
  fertilizePlot, buyPlot, formatNumber, formatTime, getPlant, getTool,
  getHarvester, getSprinkler, getFertilizer, getProductPrice, plotIdForIndex, indexesForPlot,
  isToolUnlocked, isPlantUnlocked, isFertilizerUnlocked, isAutomationUnlocked,
  normalizeStateData
} = globalThis.HarvestCore;

const STORAGE_KEY = "puzzle-club-save:harvest-clicker:v3";
const ASSET_ROOT = "assets/";
const TILE_W = 96;
const TILE_H = 48;
const TILE_DEPTH = 13;
const MIN_ZOOM = 0.35;
const MAX_ZOOM = 2.4;
const $ = (selector) => document.querySelector(selector);
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const elements = {
  gold: $("#gold-value"), saveState: $("#save-state"), shop: $("#shop-panel"),
  tabs: $("#shop-tabs"), shopList: $("#shop-list"), canvas: $("#farm-canvas"),
  canvasShell: $("#farm-canvas-shell"), quickbar: $("#quickbar"),
  toast: $("#toast"), backdrop: $("#shop-backdrop"),
  mobileShop: $("#mobile-shop-button"),
  offlineDialog: $("#offline-dialog"), settingsDialog: $("#settings-dialog"),
  settingSound: $("#setting-sound"), settingMotion: $("#setting-motion"),
  importInput: $("#import-input"), shopDialog: $("#shop-dialog"),
  shopDialogArt: $("#shop-dialog-art"), shopDialogTitle: $("#shop-dialog-title"),
  shopDialogCopy: $("#shop-dialog-copy"), shopDialogPrice: $("#shop-dialog-price"),
  shopDialogBuy: $("#shop-dialog-buy"),
  landPopover: $("#land-popover"), landIcon: $("#land-state-icon"),
  landTitle: $("#land-title"), landCondition: $("#land-condition"),
  landPrice: $("#land-price"), landBuy: $("#land-buy-button")
};

const ctx = elements.canvas.getContext("2d", { alpha: true });
const images = new Map();
const effects = [];
const activePointers = new Map();
const camera = { scale: 1, x: 0, y: 0 };
let state;
let activeTab = "tools";
let selection = null;
let selectedLandPlot = null;
let selectedShopProduct = null;
let keyboardIndex = indexesForPlot(INITIAL_PLOT_ID)[4];
let toastTimer = 0;
let saveTimer = 0;
let passiveBecauseOtherTab = false;
let audioContext = null;
let canvasWidth = 0;
let canvasHeight = 0;
let singleGesture = null;
let pinchGesture = null;
let didInitialFocus = false;
let hoverIndex = -1;
const toolCursor = { x: 0, y: 0, visible: false };

function formatMoney(value) {
  return `${formatNumber(value)}$`;
}

function assetMarkup(fileName, fallback, className = "shop-art") {
  return fileName
    ? `<img class="${className}" src="${ASSET_ROOT}${fileName}" alt="" draggable="false">`
    : `<span aria-hidden="true">${fallback}</span>`;
}

function preloadAssets() {
  const files = new Set();
  for (const item of [...PLANTS, ...TOOLS, ...HARVESTERS, ...SPRINKLERS]) {
    if (item.image) files.add(item.image);
  }
  for (const file of files) {
    const image = new Image();
    image.decoding = "async";
    image.addEventListener("load", () => images.set(file, image));
    image.src = `${ASSET_ROOT}${file}`;
  }
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = normalizeStateData(JSON.parse(raw));
      if (validateState(parsed)) {
        parsed.inventory ||= {};
        parsed.harvesters ||= [];
        parsed.sprinklers ||= [];
        parsed.stats ||= { manualClicks: 0, offlineGold: 0 };
        parsed.settings ||= { sound: true, reducedMotion: false };
        state = parsed;
        const summary = simulateTo(state, Date.now());
        state.stats.offlineGold = (state.stats.offlineGold || 0) + summary.gold;
        if (summary.elapsedMs >= 60000 || summary.gold > 0) showOfflineSummary(summary);
        saveNow(true);
        return;
      }
    }
  } catch (error) {
    console.warn("無法讀取農場存檔", error);
  }
  state = createInitialState(Date.now());
  saveNow(true);
}

function saveNow(silent = false) {
  if (!state) return;
  if (!silent) {
    elements.saveState.textContent = "儲存中";
    elements.saveState.className = "save-state is-saving";
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(() => {
      elements.saveState.textContent = "已儲存";
      elements.saveState.className = "save-state";
    }, silent ? 0 : 350);
  } catch (error) {
    elements.saveState.textContent = "儲存失敗";
    elements.saveState.className = "save-state is-error";
  }
}

function showOfflineSummary(summary) {
  window.setTimeout(() => {
    $("#offline-time").textContent = `你離開了 ${formatTime(summary.elapsedMs / 1000)}，期間的生長與設備作業已完成。`;
    $("#offline-harvests").textContent = `${formatNumber(summary.harvested)} 格`;
    $("#offline-gold").textContent = `＋${formatMoney(summary.gold)}`;
    if (!elements.offlineDialog.open) elements.offlineDialog.showModal();
  }, 120);
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("is-visible");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => elements.toast.classList.remove("is-visible"), 2100);
}

function playTone(kind = "hit") {
  if (!state.settings.sound) return;
  try {
    audioContext ||= new AudioContext();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = kind === "coin" ? "sine" : "triangle";
    oscillator.frequency.value = kind === "coin" ? 720 : 185;
    gain.gain.setValueAtTime(kind === "coin" ? 0.035 : 0.022, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + (kind === "coin" ? 0.12 : 0.06));
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.13);
  } catch (error) { /* Audio is optional. */ }
}

function worldPoint(row, col) {
  return { x: (col - row) * TILE_W / 2, y: (col + row) * TILE_H / 2 };
}

function resizeCanvas() {
  const rect = elements.canvasShell.getBoundingClientRect();
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvasWidth = Math.max(1, rect.width);
  canvasHeight = Math.max(1, rect.height);
  elements.canvas.width = Math.round(canvasWidth * dpr);
  elements.canvas.height = Math.round(canvasHeight * dpr);
  elements.canvas.style.width = `${canvasWidth}px`;
  elements.canvas.style.height = `${canvasHeight}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (!didInitialFocus && state) {
    focusOwnedFarm();
    didInitialFocus = true;
  } else constrainCamera();
}

function ownedFarmSurfaceBounds() {
  const indexes = state.ownedPlots.flatMap(indexesForPlot);
  const points = indexes.map((index) => worldPoint(Math.floor(index / BOARD_SIZE), index % BOARD_SIZE));
  return {
    minX: Math.min(...points.map((point) => point.x)) - TILE_W / 2,
    maxX: Math.max(...points.map((point) => point.x)) + TILE_W / 2,
    minY: Math.min(...points.map((point) => point.y)) - TILE_H / 2,
    maxY: Math.max(...points.map((point) => point.y)) + TILE_H / 2 + TILE_DEPTH
  };
}

function constrainCamera() {
  if (!state || !canvasWidth || !canvasHeight || !state.ownedPlots.length) return;
  const bounds = ownedFarmSurfaceBounds();
  const scaledWidth = (bounds.maxX - bounds.minX) * camera.scale;
  const scaledHeight = (bounds.maxY - bounds.minY) * camera.scale;
  const visibleX = Math.min(150, canvasWidth * 0.24, scaledWidth * 0.45);
  const visibleY = Math.min(110, canvasHeight * 0.24, scaledHeight * 0.45);
  const minCameraX = visibleX - bounds.maxX * camera.scale;
  const maxCameraX = canvasWidth - visibleX - bounds.minX * camera.scale;
  const minCameraY = visibleY - bounds.maxY * camera.scale;
  const maxCameraY = canvasHeight - visibleY - bounds.minY * camera.scale;
  camera.x = clamp(camera.x, minCameraX, maxCameraX);
  camera.y = clamp(camera.y, minCameraY, maxCameraY);
}

function setZoom(nextScale, anchorX = canvasWidth / 2, anchorY = canvasHeight / 2) {
  const oldScale = camera.scale;
  const next = clamp(nextScale, MIN_ZOOM, MAX_ZOOM);
  const worldX = (anchorX - camera.x) / oldScale;
  const worldY = (anchorY - camera.y) / oldScale;
  camera.scale = next;
  camera.x = anchorX - worldX * next;
  camera.y = anchorY - worldY * next;
  constrainCamera();
}

function focusOwnedFarm() {
  if (!state || !canvasWidth || !canvasHeight) return;
  const indexes = state.ownedPlots.flatMap(indexesForPlot);
  const points = indexes.map((index) => worldPoint(Math.floor(index / BOARD_SIZE), index % BOARD_SIZE));
  const minX = Math.min(...points.map((point) => point.x)) - TILE_W * 0.7;
  const maxX = Math.max(...points.map((point) => point.x)) + TILE_W * 0.7;
  const minY = Math.min(...points.map((point) => point.y)) - TILE_W * 0.78;
  const maxY = Math.max(...points.map((point) => point.y)) + TILE_H + TILE_DEPTH;
  const scale = clamp(Math.min((canvasWidth - 70) / (maxX - minX), (canvasHeight - 70) / (maxY - minY)), MIN_ZOOM, 1.95);
  camera.scale = scale;
  camera.x = canvasWidth / 2 - ((minX + maxX) / 2) * scale;
  camera.y = canvasHeight / 2 - ((minY + maxY) / 2) * scale;
  constrainCamera();
}

function pathDiamond(context, x, y) {
  context.beginPath();
  context.moveTo(x, y - TILE_H / 2);
  context.lineTo(x + TILE_W / 2, y);
  context.lineTo(x, y + TILE_H / 2);
  context.lineTo(x - TILE_W / 2, y);
  context.closePath();
}

function plotGeometry(plotId) {
  const plotRow = Math.floor(plotId / PLOT_GRID_SIZE) * 3;
  const plotCol = (plotId % PLOT_GRID_SIZE) * 3;
  const topCell = worldPoint(plotRow, plotCol);
  const rightCell = worldPoint(plotRow, plotCol + 2);
  const bottomCell = worldPoint(plotRow + 2, plotCol + 2);
  const leftCell = worldPoint(plotRow + 2, plotCol);
  return {
    plotRow,
    plotCol,
    top: { x: topCell.x, y: topCell.y - TILE_H / 2 },
    right: { x: rightCell.x + TILE_W / 2, y: rightCell.y },
    bottom: { x: bottomCell.x, y: bottomCell.y + TILE_H / 2 },
    left: { x: leftCell.x - TILE_W / 2, y: leftCell.y },
    center: worldPoint(plotRow + 1, plotCol + 1)
  };
}

function pathPlotTop(geometry) {
  ctx.beginPath();
  ctx.moveTo(geometry.top.x, geometry.top.y);
  ctx.lineTo(geometry.right.x, geometry.right.y);
  ctx.lineTo(geometry.bottom.x, geometry.bottom.y);
  ctx.lineTo(geometry.left.x, geometry.left.y);
  ctx.closePath();
}

function drawPlotBase(plot) {
  const geometry = plotGeometry(plot.id);
  const owned = state.ownedPlots.includes(plot.id);
  const target = selection && isValidSelectionPlot(plot.id);

  ctx.beginPath();
  ctx.moveTo(geometry.left.x, geometry.left.y);
  ctx.lineTo(geometry.bottom.x, geometry.bottom.y);
  ctx.lineTo(geometry.bottom.x, geometry.bottom.y + TILE_DEPTH);
  ctx.lineTo(geometry.left.x, geometry.left.y + TILE_DEPTH);
  ctx.closePath();
  ctx.fillStyle = owned ? "#70452c" : "rgba(46,76,48,.36)";
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(geometry.right.x, geometry.right.y);
  ctx.lineTo(geometry.bottom.x, geometry.bottom.y);
  ctx.lineTo(geometry.bottom.x, geometry.bottom.y + TILE_DEPTH);
  ctx.lineTo(geometry.right.x, geometry.right.y + TILE_DEPTH);
  ctx.closePath();
  ctx.fillStyle = owned ? "#5b3825" : "rgba(36,65,43,.42)";
  ctx.fill();

  pathPlotTop(geometry);
  const gradient = ctx.createLinearGradient(geometry.top.x, geometry.top.y, geometry.bottom.x, geometry.bottom.y);
  if (owned) {
    gradient.addColorStop(0, "#b97e52");
    gradient.addColorStop(.52, "#9b623f");
    gradient.addColorStop(1, "#845036");
  } else {
    gradient.addColorStop(0, "rgba(104,137,78,.62)");
    gradient.addColorStop(1, "rgba(61,93,59,.68)");
  }
  ctx.fillStyle = gradient;
  ctx.fill();

  if (owned) {
    ctx.save();
    pathPlotTop(geometry);
    ctx.clip();
    ctx.strokeStyle = "rgba(67,37,24,.18)";
    ctx.lineWidth = 2;
    for (let offset = -240; offset <= 240; offset += 18) {
      ctx.beginPath();
      ctx.moveTo(geometry.left.x + offset, geometry.left.y - 90);
      ctx.lineTo(geometry.left.x + offset + 360, geometry.left.y + 90);
      ctx.stroke();
    }
    for (let speck = 0; speck < 24; speck += 1) {
      const angle = (speck * 2.399) + plot.id;
      const radius = 18 + (speck % 7) * 14;
      const x = geometry.center.x + Math.cos(angle) * radius * 1.35;
      const y = geometry.center.y + Math.sin(angle) * radius * .48;
      ctx.fillStyle = speck % 3 ? "rgba(67,38,25,.2)" : "rgba(230,174,112,.18)";
      ctx.beginPath();
      ctx.ellipse(x, y, 2.2, 1.2, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    for (const index of indexesForPlot(plot.id)) {
      const row = Math.floor(index / BOARD_SIZE);
      const col = index % BOARD_SIZE;
      const point = worldPoint(row, col);
      pathDiamond(ctx, point.x, point.y);
      ctx.strokeStyle = "rgba(255,235,187,.12)";
      ctx.lineWidth = 1 / camera.scale;
      ctx.stroke();
    }
  }

  pathPlotTop(geometry);
  ctx.strokeStyle = target ? "#ffe27c" : owned ? "rgba(255,239,195,.5)" : "rgba(225,239,198,.15)";
  ctx.lineWidth = (target ? 4 : 2) / camera.scale;
  ctx.stroke();
}

function drawWeed(x, y, progress, mature) {
  const size = mature ? 1 : 0.35 + progress * 0.65;
  ctx.save();
  ctx.translate(x, y + TILE_H * 0.4);
  ctx.scale(size, size);
  ctx.fillStyle = "rgba(42,42,24,.22)";
  ctx.beginPath();
  ctx.ellipse(0, 4, 25, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  const blades = [-22, -15, -8, 0, 8, 15, 22];
  blades.forEach((offset, bladeIndex) => {
    ctx.beginPath();
    ctx.moveTo(offset * 0.35, 3);
    ctx.quadraticCurveTo(offset * 0.7, -15 - (bladeIndex % 3) * 5, offset, -27 - (bladeIndex % 2) * 7);
    ctx.quadraticCurveTo(offset * 0.3, -19, offset * 0.35, 3);
    ctx.fillStyle = bladeIndex % 2 ? "#648f43" : "#86a852";
    ctx.fill();
  });
  ctx.restore();
}

function plantMetrics(cell) {
  const plant = getPlant(cell.plantId);
  const mature = cell.phase === "mature";
  const progress = mature ? 1 : clamp(cell.growthProgress, 0, 1);
  const growthScale = 0.28 + progress * 0.72;
  const image = plant.image ? images.get(plant.image) : null;
  const base = plant.id === "lavender" ? 92 : plant.id === "wheat" ? 74 : 82;
  const ratio = image ? (image.naturalWidth / image.naturalHeight || 1) : 1;
  const height = plant.image ? base * growthScale : 42 * growthScale;
  const width = plant.image ? Math.min(base * 1.18, height * ratio) : 52 * growthScale;
  return { plant, mature, progress, growthScale, image, height, width, contactY: TILE_H * 0.42 };
}

function drawPlant(cell, x, y, now) {
  const { plant, mature, progress, growthScale, image, height, width, contactY } = plantMetrics(cell);
  if (!plant.image) {
    drawWeed(x, y, progress, mature);
    return;
  }
  if (!image) {
    ctx.font = `${20 + progress * 16}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillText(plant.emoji, x, y + contactY);
    return;
  }
  const bob = mature && !state.settings.reducedMotion ? Math.sin(now / 650 + x * 0.03) * .65 : 0;
  ctx.save();
  ctx.fillStyle = "rgba(47,35,22,.25)";
  ctx.beginPath();
  ctx.ellipse(x, y + contactY - 2, 23 * growthScale, 7 * growthScale, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowColor = "rgba(39,28,19,.28)";
  ctx.shadowBlur = 7;
  ctx.shadowOffsetY = 5;
  ctx.globalAlpha = mature ? 1 : 0.82;
  ctx.drawImage(image, x - width / 2, y + contactY - height + bob, width, height);
  ctx.restore();
}

function drawBar(x, y, ratio, color) {
  const width = 48;
  const height = 5;
  ctx.fillStyle = "rgba(26,31,22,.45)";
  ctx.fillRect(x - width / 2, y, width, height);
  ctx.fillStyle = color;
  ctx.fillRect(x - width / 2 + 1, y + 1, (width - 2) * clamp(ratio, 0, 1), height - 2);
}

function drawDevices(plotId, x, y) {
  const harvester = state.harvesters.find((item) => item.plotId === plotId);
  const sprinkler = state.sprinklers.find((item) => item.plotId === plotId);
  if (!harvester && !sprinkler) return;
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "18px sans-serif";
  ctx.fillStyle = "rgba(255,250,232,.92)";
  ctx.beginPath();
  ctx.arc(x + 26, y - 28, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#203b28";
  ctx.fillText(harvester ? getHarvester(harvester.id).emoji : getSprinkler(sprinkler.id).emoji, x + 26, y - 28);
  if (harvester && sprinkler) {
    ctx.fillStyle = "rgba(255,250,232,.92)";
    ctx.beginPath();
    ctx.arc(x - 26, y - 28, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#203b28";
    ctx.fillText(getSprinkler(sprinkler.id).emoji, x - 26, y - 28);
  }
  ctx.restore();
}

function plotOutline(plotId, color, lineWidth = 3) {
  const geometry = plotGeometry(plotId);
  pathPlotTop(geometry);
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth / camera.scale;
  ctx.stroke();
}

function drawLockedPlots() {
  for (const plot of PLOTS) {
    if (state.ownedPlots.includes(plot.id)) continue;
    const indexes = indexesForPlot(plot.id);
    const centerIndex = indexes[4];
    const point = worldPoint(Math.floor(centerIndex / BOARD_SIZE), centerIndex % BOARD_SIZE);
    const isNext = PLOTS[state.ownedPlots.length]?.id === plot.id;
    plotOutline(plot.id, isNext ? "rgba(255,223,109,.72)" : "rgba(231,241,209,.2)", isNext ? 3 : 2);
    ctx.save();
    ctx.translate(point.x, point.y - 8);
    ctx.fillStyle = isNext ? "rgba(20,55,35,.88)" : "rgba(25,51,34,.62)";
    ctx.beginPath();
    ctx.arc(0, 0, 23, 0, Math.PI * 2);
    ctx.fill();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "22px sans-serif";
    ctx.fillText("🔒", 0, 1);
    ctx.restore();
  }
}

function cellPaintOrder() {
  return Array.from({ length: BOARD_SIZE * BOARD_SIZE }, (_, index) => index)
    .sort((a, b) => {
      const aRow = Math.floor(a / BOARD_SIZE); const aCol = a % BOARD_SIZE;
      const bRow = Math.floor(b / BOARD_SIZE); const bCol = b % BOARD_SIZE;
      return (aRow + aCol) - (bRow + bCol) || aRow - bRow;
    });
}

function drawEffects(now) {
  for (let i = effects.length - 1; i >= 0; i -= 1) {
    const effect = effects[i];
    const age = now - effect.startedAt;
    if (age > 760) {
      effects.splice(i, 1);
      continue;
    }
    const progress = age / 760;
    ctx.save();
    ctx.globalAlpha = 1 - progress;
    ctx.fillStyle = effect.color;
    ctx.font = "900 17px sans-serif";
    ctx.textAlign = "center";
    ctx.shadowColor = "rgba(49,30,18,.75)";
    ctx.shadowBlur = 3;
    ctx.fillText(effect.text, effect.x, effect.y - progress * 38);
    ctx.restore();
  }
}

function drawFarm(now = performance.now()) {
  if (!state || !canvasWidth || !canvasHeight) return;
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  ctx.save();
  ctx.translate(camera.x, camera.y);
  ctx.scale(camera.scale, camera.scale);
  const owned = new Set(state.ownedPlots);
  const plotOrder = [...PLOTS].sort((a, b) => {
    const aCenter = plotGeometry(a.id).center;
    const bCenter = plotGeometry(b.id).center;
    return aCenter.y - bCenter.y || aCenter.x - bCenter.x;
  });
  for (const plot of plotOrder) drawPlotBase(plot);

  const order = cellPaintOrder();
  for (const index of order) {
    const row = Math.floor(index / BOARD_SIZE);
    const col = index % BOARD_SIZE;
    const plotId = plotIdForIndex(index);
    if (!owned.has(plotId)) continue;
    const point = worldPoint(row, col);
    const cell = state.cells[index];
    const metrics = plantMetrics(cell);
    const statusBarY = point.y + metrics.contactY - metrics.height - 10;
    drawPlant(cell, point.x, point.y, now);
    if (cell.phase === "growing") drawBar(point.x, statusBarY, cell.growthProgress, "#d5ed97");
    else {
      const plant = getPlant(cell.plantId);
      if (cell.currentHp < plant.hp) drawBar(point.x, statusBarY, cell.currentHp / plant.hp, "#ffce60");
    }
    if (cell.fertilizerId) {
      ctx.font = "13px sans-serif";
      ctx.fillText(`✦${cell.fertilizerRounds}`, point.x - 31, point.y - 15);
    }
    if (index === indexesForPlot(plotId)[4]) drawDevices(plotId, point.x, point.y);
  }

  drawLockedPlots();
  if (hoverIndex >= 0) {
    const row = Math.floor(hoverIndex / BOARD_SIZE);
    const col = hoverIndex % BOARD_SIZE;
    const point = worldPoint(row, col);
    pathDiamond(ctx, point.x, point.y);
    ctx.fillStyle = "rgba(255,230,121,.13)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255,239,168,.74)";
    ctx.lineWidth = 2 / camera.scale;
    ctx.stroke();
  }
  if (elements.canvas === document.activeElement) {
    const row = Math.floor(keyboardIndex / BOARD_SIZE);
    const col = keyboardIndex % BOARD_SIZE;
    const point = worldPoint(row, col);
    pathDiamond(ctx, point.x, point.y);
    ctx.strokeStyle = "#ffe06d";
    ctx.lineWidth = 3 / camera.scale;
    ctx.stroke();
  }
  drawEffects(now);
  ctx.restore();

  if (toolCursor.visible) {
    const tool = getTool(state.equippedToolId);
    const image = tool.image ? images.get(tool.image) : null;
    ctx.save();
    ctx.translate(toolCursor.x, toolCursor.y);
    ctx.rotate(-0.18);
    ctx.shadowColor = "rgba(22,31,20,.45)";
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 3;
    if (image) ctx.drawImage(image, -9, -39, 44, 44);
    else {
      ctx.font = "30px sans-serif";
      ctx.fillText(tool.emoji, -5, -8);
    }
    ctx.restore();
  }
  window.requestAnimationFrame(drawFarm);
}

function isValidSelectionPlot(plotId) {
  if (!selection || !state.ownedPlots.includes(plotId)) return false;
  if (selection.kind === "fertilizer") return indexesForPlot(plotId).every((index) => state.cells[index].plantId !== "weed");
  return true;
}

function renderHeader() {
  elements.gold.textContent = formatMoney(state.gold);
  document.body.classList.toggle("reduce-motion", state.settings.reducedMotion);
}

function unlockText(item, type) {
  if (type === "tool") {
    if (item.unlock.type === "harvested") return `條件：累積收割 ${formatNumber(item.unlock.value)} 格`;
    if (item.unlock.type === "plots") return `條件：擁有 ${item.unlock.value} 塊土地`;
  }
  if (type === "plant") {
    const messages = {
      clover: "條件：累積獲得 15$", tomato: "條件：累積收割 40 格", wheat: "條件：購買園藝剪",
      berry: "條件：擁有 6 塊土地", pumpkin: "條件：購買短柄鐮刀", lavender: "條件：擁有 9 塊土地",
      pepper: "條件：購買銅製十字鎬", starfruit: "條件：擁有 16 塊土地"
    };
    return messages[item.id] || "尚未達成條件";
  }
  if (type === "fertilizer") {
    return item.id === "quick" ? "條件：開放樁架番茄" : item.id === "bounty" ? "條件：擁有 9 塊土地" : "條件：開放自動化設備";
  }
  return "條件：收割 1,500 格並擁有 9 塊土地";
}

function shopCard({ image, icon, title, price, locked, kind, id }) {
  return `<button class="shop-card ${locked ? "is-locked" : ""}" type="button" data-product-kind="${kind}" data-product-id="${id}">
    <span class="shop-card-icon" aria-hidden="true">${assetMarkup(image, icon)}</span>
    <span class="shop-card-title"><h3>${title}</h3><strong>${formatMoney(price)}</strong></span>
    ${locked ? '<span class="shop-lock" aria-hidden="true">🔒</span>' : ""}
  </button>`;
}

function renderToolsShop() {
  return TOOLS.map((tool) => {
    const unlocked = isToolUnlocked(tool, state);
    return shopCard({ image: tool.image, icon: tool.emoji, title: tool.name, price: tool.cost, locked: !unlocked, kind: "tool", id: tool.id });
  }).join("");
}

function renderSeedsShop() {
  return PLANTS.filter((plant) => plant.id !== "weed").map((plant) => {
    const unlocked = isPlantUnlocked(plant, state);
    return shopCard({ image: plant.image, icon: plant.emoji, title: plant.name, price: plant.seedCost, locked: !unlocked, kind: "seed", id: plant.id });
  }).join("");
}

function renderAutomationShop() {
  const unlocked = isAutomationUnlocked(state);
  let html = HARVESTERS.map((item) => shopCard({
    image: item.image, icon: item.emoji, title: item.name, price: item.cost, locked: !unlocked, kind: "harvester", id: item.id
  })).join("");
  html += SPRINKLERS.map((item) => shopCard({
    image: item.image, icon: item.emoji, title: item.name, price: item.cost, locked: !unlocked, kind: "sprinkler", id: item.id
  })).join("");
  return html;
}

function renderFertilizerShop() {
  return FERTILIZERS.map((item) => {
    const unlocked = isFertilizerUnlocked(item, state);
    return shopCard({
      icon: item.emoji, title: item.name, price: item.cost, locked: !unlocked, kind: "fertilizer", id: item.id
    });
  }).join("");
}

function getShopProduct(kind, id) {
  if (kind === "tool") return getTool(id);
  if (kind === "seed") return getPlant(id);
  if (kind === "harvester") return getHarvester(id);
  if (kind === "sprinkler") return getSprinkler(id);
  if (kind === "fertilizer") return getFertilizer(id);
  return null;
}

function isShopProductUnlocked(kind, item) {
  if (kind === "tool") return isToolUnlocked(item, state);
  if (kind === "seed") return isPlantUnlocked(item, state);
  if (kind === "fertilizer") return isFertilizerUnlocked(item, state);
  return isAutomationUnlocked(state);
}

function isShopProductOwned(kind, item) {
  return kind === "tool" && state.ownedToolIds.includes(item.id);
}

function shopProductDescription(kind, item) {
  if (kind === "tool") return `${item.damage} 傷害 · ${item.cells} 格${item.regrowth < 1 ? ` · 再生時間 ×${item.regrowth}` : ""}`;
  if (kind === "seed") return `一次種滿 3×3 · HP ${item.hp} · 每格收成 ${formatMoney(item.coins)} · ${formatTime(item.growSeconds)}`;
  if (kind === "harvester") return `每 ${item.intervalSeconds} 秒對指定 3×3 各造成 ${item.damage} 傷害`;
  if (kind === "sprinkler") return `指定 3×3 生長時間 ×${item.growthMultiplier}`;
  return `立即生效 · 生長 ×${item.growthMultiplier} · 金幣 ×${item.coinMultiplier} · 持續 ${item.rounds} 輪`;
}

function openShopProduct(kind, id) {
  const item = getShopProduct(kind, id);
  if (!item) return;
  selectedShopProduct = { kind, id };
  const unlocked = isShopProductUnlocked(kind, item);
  const owned = isShopProductOwned(kind, item);
  const price = getProductPrice(kind, item);
  elements.shopDialogArt.innerHTML = assetMarkup(item.image, item.emoji);
  elements.shopDialogTitle.textContent = item.name;
  elements.shopDialogCopy.textContent = unlocked ? shopProductDescription(kind, item) : unlockText(item, kind === "seed" ? "plant" : kind === "harvester" || kind === "sprinkler" ? "automation" : kind);
  elements.shopDialogPrice.textContent = unlocked ? (owned ? "已擁有" : formatMoney(price)) : "";
  elements.shopDialogBuy.disabled = !unlocked || owned || state.gold < price;
  elements.shopDialogBuy.textContent = !unlocked ? "🔒" : owned ? "已擁有" : state.gold < price ? "金幣不足" : `購買 ${formatMoney(price)}`;
  if (!elements.shopDialog.open) elements.shopDialog.showModal();
}

function renderShop() {
  const renderers = { tools: renderToolsShop, seeds: renderSeedsShop, automation: renderAutomationShop, fertilizer: renderFertilizerShop };
  if (!renderers[activeTab]) activeTab = "tools";
  elements.shopList.innerHTML = renderers[activeTab]();
  elements.tabs.querySelectorAll("button").forEach((button) => button.classList.toggle("is-active", button.dataset.tab === activeTab));
}

function inventoryCount(key) {
  return Math.max(0, Number(state.inventory[key]) || 0);
}

function quickButton({ image, emoji, title, attributes, count, equipped, selected, installed }) {
  const art = image ? assetMarkup(image, emoji, "quick-art") : emoji;
  return `<button class="quick-item ${equipped ? "is-equipped" : ""} ${selected ? "is-selected" : ""}" type="button" title="${title}" aria-label="${title}" ${attributes}>${art}${count ? `<small>${count}</small>` : ""}${installed ? '<span class="installed-dot"></span>' : ""}</button>`;
}

function renderQuickbar() {
  const tools = TOOLS.filter((tool) => state.ownedToolIds.includes(tool.id)).map((tool) => quickButton({
    image: tool.image, emoji: tool.emoji, title: `${tool.name}｜${tool.damage} 傷害`, attributes: `data-tool-id="${tool.id}"`, equipped: tool.id === state.equippedToolId
  }));
  const items = [];
  for (const plant of PLANTS.filter((item) => item.id !== "weed")) {
    const count = inventoryCount(`seed_${plant.id}`);
    if (count) items.push(quickButton({ image: plant.image, emoji: plant.emoji, title: `${plant.name}種子 ×${count}`, attributes: `data-inventory-kind="seed" data-inventory-id="${plant.id}"`, count, selected: selection?.kind === "seed" && selection.id === plant.id }));
  }
  for (const item of FERTILIZERS) {
    const count = inventoryCount(`fertilizer_${item.id}`);
    if (count) items.push(quickButton({ emoji: item.emoji, title: `${item.name} ×${count}`, attributes: `data-inventory-kind="fertilizer" data-inventory-id="${item.id}"`, count, selected: selection?.kind === "fertilizer" && selection.id === item.id }));
  }
  for (const item of HARVESTERS) {
    const count = inventoryCount(`harvester_${item.id}`);
    if (count) items.push(quickButton({ image: item.image, emoji: item.emoji, title: `${item.name} ×${count}`, attributes: `data-inventory-kind="harvester" data-inventory-id="${item.id}"`, count, selected: selection?.kind === "harvester" && selection.id === item.id && selection.sourcePlot == null }));
  }
  for (const item of SPRINKLERS) {
    const count = inventoryCount(`sprinkler_${item.id}`);
    if (count) items.push(quickButton({ image: item.image, emoji: item.emoji, title: `${item.name} ×${count}`, attributes: `data-inventory-kind="sprinkler" data-inventory-id="${item.id}"`, count, selected: selection?.kind === "sprinkler" && selection.id === item.id && selection.sourcePlot == null }));
  }
  for (const placed of state.harvesters) {
    const item = getHarvester(placed.id);
    items.push(quickButton({ image: item.image, emoji: item.emoji, title: `${item.name}｜點擊可移動`, attributes: `data-installed-kind="harvester" data-inventory-id="${item.id}" data-source-plot="${placed.plotId}"`, installed: true, selected: selection?.kind === "harvester" && selection.sourcePlot === placed.plotId }));
  }
  for (const placed of state.sprinklers) {
    const item = getSprinkler(placed.id);
    items.push(quickButton({ image: item.image, emoji: item.emoji, title: `${item.name}｜點擊可移動`, attributes: `data-installed-kind="sprinkler" data-inventory-id="${item.id}" data-source-plot="${placed.plotId}"`, installed: true, selected: selection?.kind === "sprinkler" && selection.sourcePlot === placed.plotId }));
  }
  const cancel = selection ? '<button class="quick-item quick-cancel" type="button" data-cancel-selection aria-label="取消使用物品">×</button>' : "";
  elements.quickbar.innerHTML = tools.join("") + (items.length ? '<span class="quick-divider" aria-hidden="true"></span>' + items.join("") : "") + cancel;
}

function renderAll() {
  renderHeader();
  renderShop();
  renderQuickbar();
  if (selectedLandPlot != null) showLandPopover(selectedLandPlot);
}

function setActiveTab(tab) {
  activeTab = tab;
  renderShop();
}

function closeMobileShop() {
  elements.shop.classList.remove("is-open");
  elements.backdrop.hidden = true;
  elements.mobileShop.setAttribute("aria-expanded", "false");
}

function buyItem(kind, id) {
  simulateTo(state, Date.now());
  let item;
  if (kind === "tool") item = getTool(id);
  if (kind === "seed") item = getPlant(id);
  if (kind === "harvester") item = getHarvester(id);
  if (kind === "sprinkler") item = getSprinkler(id);
  if (kind === "fertilizer") item = getFertilizer(id);
  if (!item || !isShopProductUnlocked(kind, item)) return;
  const price = getProductPrice(kind, item);
  if (state.gold < price) { showToast("金幣還不夠"); return; }

  if (kind === "tool") {
    if (!isToolUnlocked(item, state) || state.ownedToolIds.includes(id)) return;
    state.gold -= price;
    state.ownedToolIds.push(id);
    state.equippedToolId = id;
    showToast(`已購買並裝備 ${item.name}`);
  } else {
    state.gold -= price;
    const key = `${kind}_${id}`;
    state.inventory[key] = inventoryCount(key) + 1;
    selection = { kind, id, sourcePlot: null };
    showToast(`${item.name}已放入下方工具列`);
  }
  playTone("coin");
  saveNow();
  if (elements.shopDialog.open) elements.shopDialog.close();
  selectedShopProduct = null;
  renderAll();
  if (window.innerWidth <= 980 && kind !== "tool") closeMobileShop();
}

function consumeInventory(kind, id) {
  const key = `${kind}_${id}`;
  const count = inventoryCount(key);
  if (count <= 0) return false;
  if (count === 1) delete state.inventory[key];
  else state.inventory[key] = count - 1;
  return true;
}

function placeDevice(kind, id, plotId) {
  const list = kind === "harvester" ? state.harvesters : state.sprinklers;
  const currentAtTarget = list.find((item) => item.plotId === plotId);
  if (selection.sourcePlot === plotId) { selection = null; showToast("設備留在原地"); return; }
  if (currentAtTarget && !window.confirm("這塊土地已有同類設備。要替換並把原設備收回工具列嗎？")) return;
  if (currentAtTarget) {
    state.inventory[`${kind}_${currentAtTarget.id}`] = inventoryCount(`${kind}_${currentAtTarget.id}`) + 1;
    list.splice(list.indexOf(currentAtTarget), 1);
  }
  if (selection.sourcePlot != null) {
    const source = list.find((item) => item.plotId === selection.sourcePlot);
    if (source) list.splice(list.indexOf(source), 1);
  } else if (!consumeInventory(kind, id)) {
    showToast("工具列中已沒有這件設備");
    selection = null;
    return;
  }
  if (kind === "harvester") list.push({ id, plotId, nextRunAt: Date.now() + getHarvester(id).intervalSeconds * 1000 });
  else list.push({ id, plotId });
  showToast(`${kind === "harvester" ? getHarvester(id).name : getSprinkler(id).name}已配置`);
  selection = null;
}

function useSelection(plotId) {
  if (!state.ownedPlots.includes(plotId)) { showToast("請先購買這塊土地"); return; }
  if (selection.kind === "seed") {
    const indexes = indexesForPlot(plotId);
    const replacing = indexes.some((index) => state.cells[index].plantId !== "weed" || state.cells[index].fertilizerId);
    if (replacing && !window.confirm("播種會覆蓋這塊土地現有的作物、成長進度與肥料。確定繼續嗎？")) return;
    if (!consumeInventory("seed", selection.id)) return;
    sowPlot(state, plotId, selection.id);
    showToast(`${getPlant(selection.id).name}已種滿 3×3 土地`);
    selection = null;
  } else if (selection.kind === "fertilizer") {
    if (!isValidSelectionPlot(plotId)) { showToast("含有雜草的地塊不能施肥"); return; }
    const hasFertilizer = indexesForPlot(plotId).some((index) => state.cells[index].fertilizerId);
    if (hasFertilizer && !window.confirm("這會覆蓋目前剩餘的肥料輪數。確定繼續嗎？")) return;
    if (!consumeInventory("fertilizer", selection.id)) return;
    fertilizePlot(state, plotId, selection.id);
    showToast(`${getFertilizer(selection.id).name}已施用，立即生效 ${getFertilizer(selection.id).rounds} 輪`);
    selection = null;
  } else if (selection.kind === "harvester" || selection.kind === "sprinkler") {
    placeDevice(selection.kind, selection.id, plotId);
  }
  playTone("coin");
  saveNow();
  renderAll();
}

function showLandPopover(plotId) {
  const plot = PLOTS.find((item) => item.id === plotId);
  if (!plot || state.ownedPlots.includes(plotId)) {
    closeLandPopover();
    return;
  }
  selectedLandPlot = plotId;
  const plotOrder = PLOTS.findIndex((item) => item.id === plotId);
  const nextOrder = state.ownedPlots.length;
  const isNext = plotOrder === nextOrder;
  const affordable = state.gold >= plot.cost;
  elements.landPopover.hidden = false;
  elements.landIcon.textContent = isNext ? (affordable ? "🌱" : "🔒") : "🔒";
  elements.landTitle.textContent = plot.name;
  elements.landPrice.textContent = formatMoney(plot.cost);
  if (!isNext) {
    elements.landCondition.textContent = `條件：先購買 ${PLOTS[nextOrder]?.name || "前一塊土地"}`;
    elements.landBuy.disabled = true;
    elements.landBuy.innerHTML = '<span aria-hidden="true">🔒</span><span class="sr-only">尚未解鎖</span>';
  } else if (!affordable) {
    elements.landCondition.textContent = `可購買 3×3 土地，還差 ${formatMoney(plot.cost - state.gold)}`;
    elements.landBuy.disabled = true;
    elements.landBuy.textContent = "金幣不足";
  } else {
    elements.landCondition.textContent = "可購買 3×3 土地，購買後會長出 9 格雜草。";
    elements.landBuy.disabled = false;
    elements.landBuy.textContent = "購買";
  }
}

function closeLandPopover() {
  selectedLandPlot = null;
  elements.landPopover.hidden = true;
}

function purchaseSelectedLand() {
  if (selectedLandPlot == null) return;
  const plot = PLOTS.find((item) => item.id === selectedLandPlot);
  if (!plot || state.gold < plot.cost || PLOTS[state.ownedPlots.length]?.id !== plot.id) return;
  if (!window.confirm(`要以 ${formatMoney(plot.cost)} 購買「${plot.name}」嗎？`)) return;
  if (!buyPlot(state, plot.id)) return;
  closeLandPopover();
  playTone("coin");
  showToast(`${plot.name}已加入農場`);
  saveNow();
  renderAll();
  window.setTimeout(focusOwnedFarm, 80);
}

function addHarvestEffects(result) {
  const now = performance.now();
  for (const hit of result.results) {
    const row = Math.floor(hit.index / BOARD_SIZE);
    const col = hit.index % BOARD_SIZE;
    const point = worldPoint(row, col);
    effects.push({
      x: point.x,
      y: point.y - 34,
      text: hit.coins ? `+${formatMoney(hit.coins)}` : `-${getTool(state.equippedToolId).damage}`,
      color: hit.coins ? "#ffe16d" : "#fff4c3",
      startedAt: now
    });
  }
}

function handleBoardClick(index) {
  const plotId = plotIdForIndex(index);
  keyboardIndex = index;
  if (!state.ownedPlots.includes(plotId)) {
    showLandPopover(plotId);
    return;
  }
  closeLandPopover();
  if (selection) { useSelection(plotId); return; }
  simulateTo(state, Date.now());
  const result = manualHarvest(state, index);
  addHarvestEffects(result);
  renderHeader();
  renderShop();
  renderQuickbar();
  if (result.results.length) playTone(result.totalCoins ? "coin" : "hit");
  else showToast("這株植物還在生長");
  saveNow();
}

function canvasPosition(event) {
  const rect = elements.canvas.getBoundingClientRect();
  return { x: event.clientX - rect.left, y: event.clientY - rect.top };
}

function tileIndexAtScreen(x, y) {
  const worldX = (x - camera.x) / camera.scale;
  const worldY = (y - camera.y) / camera.scale;
  const col = Math.round(worldX / TILE_W + worldY / TILE_H);
  const row = Math.round(worldY / TILE_H - worldX / TILE_W);
  if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) return -1;
  const center = worldPoint(row, col);
  const diamondDistance = Math.abs(worldX - center.x) / (TILE_W / 2) + Math.abs(worldY - center.y) / (TILE_H / 2);
  return diamondDistance <= 1 ? row * BOARD_SIZE + col : -1;
}

function actionIndexAtScreen(x, y) {
  const worldX = (x - camera.x) / camera.scale;
  const worldY = (y - camera.y) / camera.scale;
  const owned = new Set(state.ownedPlots);
  const frontToBack = cellPaintOrder().reverse();
  for (const index of frontToBack) {
    if (!owned.has(plotIdForIndex(index))) continue;
    const row = Math.floor(index / BOARD_SIZE);
    const col = index % BOARD_SIZE;
    const center = worldPoint(row, col);
    const metrics = plantMetrics(state.cells[index]);
    if (
      worldX >= center.x - metrics.width / 2 && worldX <= center.x + metrics.width / 2 &&
      worldY >= center.y + metrics.contactY - metrics.height - 5 && worldY <= center.y + metrics.contactY + 7
    ) return index;
  }
  return tileIndexAtScreen(x, y);
}

function beginPinch() {
  const pointers = [...activePointers.values()];
  if (pointers.length < 2) return;
  const [a, b] = pointers;
  const midpoint = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  pinchGesture = {
    startDistance: Math.hypot(a.x - b.x, a.y - b.y),
    startScale: camera.scale,
    worldX: (midpoint.x - camera.x) / camera.scale,
    worldY: (midpoint.y - camera.y) / camera.scale
  };
  singleGesture = null;
}

elements.tabs.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-tab]");
  if (button) setActiveTab(button.dataset.tab);
});

elements.shopList.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-product-kind]");
  if (button) openShopProduct(button.dataset.productKind, button.dataset.productId);
});

elements.shopDialogBuy.addEventListener("click", () => {
  if (!selectedShopProduct || elements.shopDialogBuy.disabled) return;
  buyItem(selectedShopProduct.kind, selectedShopProduct.id);
});
elements.shopDialog.addEventListener("close", () => { selectedShopProduct = null; });

elements.canvas.addEventListener("pointerdown", (event) => {
  if (event.button > 0) return;
  event.preventDefault();
  elements.canvas.setPointerCapture(event.pointerId);
  const point = canvasPosition(event);
  activePointers.set(event.pointerId, point);
  if (activePointers.size === 1) {
    singleGesture = { id: event.pointerId, startX: point.x, startY: point.y, cameraX: camera.x, cameraY: camera.y, moved: false };
  } else {
    beginPinch();
  }
});

elements.canvas.addEventListener("pointermove", (event) => {
  const point = canvasPosition(event);
  if (event.pointerType === "mouse") {
    toolCursor.x = point.x;
    toolCursor.y = point.y;
    toolCursor.visible = true;
    hoverIndex = tileIndexAtScreen(point.x, point.y);
  }
  if (!activePointers.has(event.pointerId)) return;
  activePointers.set(event.pointerId, point);
  if (activePointers.size >= 2) {
    if (!pinchGesture) beginPinch();
    const [a, b] = [...activePointers.values()];
    const distance = Math.hypot(a.x - b.x, a.y - b.y);
    const midpoint = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const nextScale = clamp(pinchGesture.startScale * distance / Math.max(1, pinchGesture.startDistance), MIN_ZOOM, MAX_ZOOM);
    camera.scale = nextScale;
    camera.x = midpoint.x - pinchGesture.worldX * nextScale;
    camera.y = midpoint.y - pinchGesture.worldY * nextScale;
    constrainCamera();
    closeLandPopover();
  } else if (singleGesture?.id === event.pointerId) {
    const dx = point.x - singleGesture.startX;
    const dy = point.y - singleGesture.startY;
    if (Math.hypot(dx, dy) > 6) singleGesture.moved = true;
    if (singleGesture.moved) {
      camera.x = singleGesture.cameraX + dx;
      camera.y = singleGesture.cameraY + dy;
      constrainCamera();
      closeLandPopover();
    }
  }
});

elements.canvas.addEventListener("pointerenter", (event) => {
  if (event.pointerType !== "mouse") return;
  const point = canvasPosition(event);
  toolCursor.x = point.x;
  toolCursor.y = point.y;
  toolCursor.visible = true;
  hoverIndex = tileIndexAtScreen(point.x, point.y);
});
elements.canvas.addEventListener("pointerleave", () => {
  if (activePointers.size) return;
  toolCursor.visible = false;
  hoverIndex = -1;
});

function endPointer(event) {
  const point = activePointers.get(event.pointerId) || canvasPosition(event);
  const wasTap = event.type !== "pointercancel" && singleGesture?.id === event.pointerId && !singleGesture.moved;
  activePointers.delete(event.pointerId);
  if (wasTap) {
    const index = actionIndexAtScreen(point.x, point.y);
    if (index >= 0) handleBoardClick(index);
  }
  if (activePointers.size === 1) {
    const [id, remaining] = [...activePointers.entries()][0];
    singleGesture = { id, startX: remaining.x, startY: remaining.y, cameraX: camera.x, cameraY: camera.y, moved: true };
  } else {
    singleGesture = null;
  }
  if (activePointers.size < 2) pinchGesture = null;
}

elements.canvas.addEventListener("pointerup", endPointer);
elements.canvas.addEventListener("pointercancel", endPointer);
elements.canvas.addEventListener("wheel", (event) => {
  event.preventDefault();
  const point = canvasPosition(event);
  setZoom(camera.scale * Math.exp(-event.deltaY * 0.0015), point.x, point.y);
  closeLandPopover();
}, { passive: false });

elements.canvas.addEventListener("keydown", (event) => {
  const row = Math.floor(keyboardIndex / BOARD_SIZE);
  const col = keyboardIndex % BOARD_SIZE;
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    handleBoardClick(keyboardIndex);
    return;
  }
  const offsets = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
  if (!offsets[event.key]) return;
  event.preventDefault();
  keyboardIndex = clamp(row + offsets[event.key][0], 0, BOARD_SIZE - 1) * BOARD_SIZE + clamp(col + offsets[event.key][1], 0, BOARD_SIZE - 1);
});

$("#land-close").addEventListener("click", closeLandPopover);
elements.landBuy.addEventListener("click", purchaseSelectedLand);

elements.quickbar.addEventListener("click", (event) => {
  if (event.target.closest("[data-cancel-selection]")) {
    selection = null;
    renderAll();
    return;
  }
  const tool = event.target.closest("[data-tool-id]");
  if (tool) {
    state.equippedToolId = tool.dataset.toolId;
    selection = null;
    showToast(`已裝備 ${getTool(state.equippedToolId).name}`);
    saveNow(); renderAll(); return;
  }
  const item = event.target.closest("[data-inventory-kind], [data-installed-kind]");
  if (!item) return;
  const nextSelection = {
    kind: item.dataset.inventoryKind || item.dataset.installedKind,
    id: item.dataset.inventoryId,
    sourcePlot: item.dataset.sourcePlot == null ? null : Number(item.dataset.sourcePlot)
  };
  const sameSelection = selection && selection.kind === nextSelection.kind && selection.id === nextSelection.id && selection.sourcePlot === nextSelection.sourcePlot;
  selection = sameSelection ? null : nextSelection;
  closeLandPopover();
  renderAll();
});

elements.mobileShop.addEventListener("click", () => {
  const open = !elements.shop.classList.contains("is-open");
  elements.shop.classList.toggle("is-open", open);
  elements.backdrop.hidden = !open;
  elements.mobileShop.setAttribute("aria-expanded", String(open));
});
elements.backdrop.addEventListener("click", closeMobileShop);

$("#settings-button").addEventListener("click", () => {
  elements.settingSound.checked = state.settings.sound;
  elements.settingMotion.checked = state.settings.reducedMotion;
  elements.settingsDialog.showModal();
});
elements.settingSound.addEventListener("change", () => { state.settings.sound = elements.settingSound.checked; saveNow(); renderHeader(); });
elements.settingMotion.addEventListener("change", () => { state.settings.reducedMotion = elements.settingMotion.checked; saveNow(); renderHeader(); });

$("#export-button").addEventListener("click", () => {
  simulateTo(state, Date.now());
  saveNow(true);
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `harvest-clicker-save-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
  showToast("存檔已匯出");
});
$("#import-button").addEventListener("click", () => elements.importInput.click());
elements.importInput.addEventListener("change", async () => {
  const file = elements.importInput.files?.[0];
  if (!file) return;
  try {
    const imported = normalizeStateData(JSON.parse(await file.text()));
    if (!validateState(imported)) throw new Error("invalid save");
    if (!window.confirm(`匯入後會覆蓋目前農場。存檔金幣：${formatMoney(imported.gold)}，確定繼續嗎？`)) return;
    state = imported;
    state.inventory ||= {};
    state.harvesters ||= [];
    state.sprinklers ||= [];
    state.stats ||= { manualClicks: 0, offlineGold: 0 };
    simulateTo(state, Date.now());
    saveNow(true); renderAll(); focusOwnedFarm(); elements.settingsDialog.close();
    showToast("存檔匯入完成");
  } catch (error) { showToast("這不是有效的格田收割記存檔"); }
  elements.importInput.value = "";
});

$("#reset-button").addEventListener("click", () => {
  if (!window.confirm("確定清除所有金幣、土地、工具與植物，重新建立農場嗎？")) return;
  state = createInitialState(Date.now());
  selection = null;
  closeLandPopover();
  saveNow(true); renderAll(); focusOwnedFarm(); elements.settingsDialog.close();
  showToast("已建立新的農場");
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    if (selection) { selection = null; renderAll(); }
    else closeLandPopover();
  }
  const number = Number(event.key);
  if (number >= 1 && number <= 8 && !event.metaKey && !event.ctrlKey && !event.altKey && document.activeElement !== elements.canvas) {
    const owned = TOOLS.filter((tool) => state.ownedToolIds.includes(tool.id));
    if (owned[number - 1]) {
      state.equippedToolId = owned[number - 1].id;
      selection = null;
      saveNow(); renderAll();
    }
  }
});

window.addEventListener("storage", (event) => {
  if (event.key === STORAGE_KEY && event.newValue && document.visibilityState === "visible") {
    passiveBecauseOtherTab = true;
    showToast("另一個分頁正在使用同一座農場，本頁已暫停計算");
  }
});

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") {
    simulateTo(state, Date.now());
    saveNow(true);
  } else if (!passiveBecauseOtherTab) {
    const summary = simulateTo(state, Date.now());
    if (summary.gold) showToast(`自動收成 +${formatMoney(summary.gold)}`);
    renderAll();
  }
});
window.addEventListener("pagehide", () => { simulateTo(state, Date.now()); saveNow(true); });

preloadAssets();
loadState();
renderAll();
resizeCanvas();
new ResizeObserver(resizeCanvas).observe(elements.canvasShell);
window.requestAnimationFrame(drawFarm);

window.setInterval(() => {
  if (passiveBecauseOtherTab || document.visibilityState === "hidden") return;
  const summary = simulateTo(state, Date.now());
  renderHeader();
  if (summary.gold || summary.harvested) {
    renderShop(); renderQuickbar();
  }
}, 500);
window.setInterval(() => { if (!passiveBecauseOtherTab) saveNow(); }, 10000);

globalThis.__harvestGame = {
  getState: () => state,
  focusOwnedFarm,
  showLandPopover,
  handleBoardClick
};
