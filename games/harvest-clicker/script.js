"use strict";

const {
  BOARD_SIZE, PLOT_GRID_SIZE, INITIAL_PLOT_ID, PLANTS, TOOLS, PLOTS, HARVESTERS, SPRINKLERS, FERTILIZERS,
  createInitialState, validateState, simulateTo, manualHarvest, sowPlot,
  fertilizePlot, buyPlot, formatNumber, formatTime, getPlant, getTool,
  getHarvester, getSprinkler, getFertilizer, getProductPrice, getLandPrice, plotIdForIndex, indexesForPlot,
  automationTargetIndexes,
  isToolUnlocked, isPlantUnlocked, isFertilizerUnlocked, isAutomationUnlocked,
  growthDurationSeconds, normalizeStateData
} = globalThis.HarvestCore;

const STORAGE_KEY = "puzzle-club-save:harvest-clicker:v4";
const LEGACY_STORAGE_KEYS = ["puzzle-club-save:harvest-clicker:v3"];
const ASSET_ROOT = "assets/";
const TILE_W = 96;
const TILE_H = 48;
const TILE_DEPTH = 13;
const MIN_ZOOM = 0.35;
const MAX_ZOOM = 2.4;
const $ = (selector) => document.querySelector(selector);
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const LOW_POWER_RENDER = Boolean(window.matchMedia?.("(pointer: coarse)")?.matches || (navigator.hardwareConcurrency || 8) <= 4);
const FRAME_INTERVAL = LOW_POWER_RENDER ? 1000 / 24 : 0;

const elements = {
  gold: $("#gold-value"), shop: $("#shop-panel"),
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
  landPrice: $("#land-price"), landBuy: $("#land-buy-button"),
  actionConfirm: $("#action-confirm-popover"), actionConfirmArt: $("#action-confirm-art"),
  actionConfirmTitle: $("#action-confirm-title"), actionConfirmText: $("#action-confirm-text"),
  actionConfirmButton: $("#action-confirm-button")
};

const ctx = elements.canvas.getContext("2d", { alpha: true });
const images = new Map();
const effects = [];
const swingMarks = [];
const plantBursts = [];
const deviceBursts = [];
const activePointers = new Map();
const TALL_PLANT_IDS = new Set(["corn", "wheat", "lavender", "cotton", "sugarcane", "grape", "vanilla", "coffee"]);
const ALL_PLOT_IDS = PLOTS.map((plot) => plot.id);
const CELL_PAINT_ORDER = Array.from({ length: BOARD_SIZE * BOARD_SIZE }, (_, index) => index)
  .sort((a, b) => {
    const aRow = Math.floor(a / BOARD_SIZE); const aCol = a % BOARD_SIZE;
    const bRow = Math.floor(b / BOARD_SIZE); const bCol = b % BOARD_SIZE;
    return (aRow + aCol) - (bRow + bCol) || aRow - bRow;
  });
const camera = { scale: 1, x: 0, y: 0 };
let state;
let activeTab = "tools";
let selection = null;
let selectedLandPlot = null;
let pendingActionPlotId = null;
let pendingActionIndex = null;
let selectedShopProduct = null;
let keyboardIndex = indexesForPlot(INITIAL_PLOT_ID)[4];
let toastTimer = 0;
let passiveBecauseOtherTab = false;
let audioContext = null;
let rustleBuffer = null;
let canvasWidth = 0;
let canvasHeight = 0;
let singleGesture = null;
let pinchGesture = null;
let didInitialFocus = false;
let hoverIndex = -1;
let plotPaintOrder = null;
let fullFarmBounds = null;
let cameraFocusAnimation = null;
let focusedPlotId = null;
let focusedPlotStartedAt = -Infinity;
let lastFarmFrameAt = -Infinity;
const toolCursor = { x: 0, y: 0, visible: false, swingStartedAt: -Infinity };

function formatMoney(value) {
  return `${formatNumber(value)}$`;
}

function remainingGrowthTime(index) {
  const cell = state.cells[index];
  if (!cell || cell.phase !== "growing") return 0;
  const progress = clamp(Number(cell.growthProgress) || 0, 0, 1);
  return Math.max(1, Math.ceil((1 - progress) * growthDurationSeconds(state, cell, plotIdForIndex(index), index)));
}

function formatGrowthCountdown(seconds) {
  const total = Math.max(1, Math.ceil(seconds));
  const days = Math.floor(total / 86400);
  const hours = Math.floor(total % 86400 / 3600);
  const minutes = Math.floor(total % 3600 / 60);
  const remainder = total % 60;
  if (days) return `${days} 天${hours ? ` ${hours} 小時` : ""}`;
  if (hours) return `${hours} 小時${minutes ? ` ${minutes} 分鐘` : ""}`;
  if (minutes) return `${minutes} 分鐘${remainder ? ` ${remainder} 秒` : ""}`;
  return `${remainder} 秒`;
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
    const raw = localStorage.getItem(STORAGE_KEY) || LEGACY_STORAGE_KEYS.map((key) => localStorage.getItem(key)).find(Boolean);
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

function saveNow() {
  if (!state) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn("無法儲存農場進度", error);
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

function scheduleNote(startAt, frequency, duration, volume, type = "sine", endFrequency = frequency) {
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, startAt);
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), startAt + duration);
  gain.gain.setValueAtTime(Math.max(.0001, volume), startAt);
  gain.gain.exponentialRampToValueAtTime(.0001, startAt + duration);
  oscillator.connect(gain).connect(audioContext.destination);
  oscillator.start(startAt);
  oscillator.stop(startAt + duration + .02);
}

function scheduleRustle(startAt, bright = false) {
  if (!rustleBuffer || rustleBuffer.sampleRate !== audioContext.sampleRate) {
    const frameCount = Math.ceil(audioContext.sampleRate * .16);
    rustleBuffer = audioContext.createBuffer(1, frameCount, audioContext.sampleRate);
    const samples = rustleBuffer.getChannelData(0);
    for (let index = 0; index < samples.length; index += 1) {
      const envelope = 1 - index / samples.length;
      samples[index] = (Math.random() * 2 - 1) * envelope;
    }
  }
  const source = audioContext.createBufferSource();
  const filter = audioContext.createBiquadFilter();
  const gain = audioContext.createGain();
  source.buffer = rustleBuffer;
  filter.type = "bandpass";
  filter.frequency.value = bright ? 1450 : 820;
  filter.Q.value = .8;
  gain.gain.setValueAtTime(bright ? .075 : .055, startAt);
  gain.gain.exponentialRampToValueAtTime(.0001, startAt + .15);
  source.connect(filter).connect(gain).connect(audioContext.destination);
  source.start(startAt);
}

function playTone(kind = "hit") {
  if (!state.settings.sound) return;
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    audioContext ||= new AudioContextClass();
    const schedule = () => {
      const now = audioContext.currentTime + .008;
      if (kind === "purchase") {
        scheduleNote(now, 523.25, .14, .035);
        scheduleNote(now + .075, 659.25, .16, .032);
        scheduleNote(now + .15, 783.99, .22, .035);
      } else if (kind === "damage") {
        scheduleRustle(now, false);
        scheduleNote(now, 175, .085, .027, "triangle", 105);
      } else if (kind === "cutComplete") {
        scheduleRustle(now, true);
        scheduleNote(now, 360, .11, .028, "triangle", 620);
        scheduleNote(now + .075, 820, .16, .026, "sine", 1040);
      } else if (kind === "plant") {
        scheduleRustle(now, false);
        scheduleNote(now + .035, 260, .16, .025, "sine", 430);
      } else if (kind === "machine") {
        scheduleNote(now, 120, .16, .035, "square", 82);
        scheduleNote(now + .09, 520, .12, .022, "triangle", 690);
      } else if (kind === "water") {
        scheduleNote(now, 680, .13, .022, "sine", 430);
        scheduleNote(now + .09, 840, .16, .018, "sine", 560);
      } else if (kind === "fertilizer") {
        scheduleRustle(now, false);
        scheduleNote(now, 145, .15, .03, "square", 105);
        scheduleNote(now + .08, 330, .14, .022, "triangle", 460);
      } else if (kind === "place") {
        scheduleNote(now, 310, .1, .024, "triangle", 390);
      } else {
        scheduleNote(now, 190, .075, .026, "triangle", 120);
      }
    };
    if (audioContext.state === "suspended") audioContext.resume().then(schedule).catch(() => {});
    else schedule();
  } catch (error) { /* Audio is optional. */ }
}

function worldPoint(row, col) {
  return { x: (col - row) * TILE_W / 2, y: (col + row) * TILE_H / 2 };
}

function resizeCanvas() {
  const rect = elements.canvasShell.getBoundingClientRect();
  const dpr = Math.min(LOW_POWER_RENDER ? 1.25 : 2, window.devicePixelRatio || 1);
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

function farmSurfaceBounds(plotIds) {
  const indexes = plotIds.flatMap(indexesForPlot);
  const points = indexes.map((index) => worldPoint(Math.floor(index / BOARD_SIZE), index % BOARD_SIZE));
  return {
    minX: Math.min(...points.map((point) => point.x)) - TILE_W / 2,
    maxX: Math.max(...points.map((point) => point.x)) + TILE_W / 2,
    minY: Math.min(...points.map((point) => point.y)) - TILE_H / 2,
    maxY: Math.max(...points.map((point) => point.y)) + TILE_H / 2 + TILE_DEPTH
  };
}

function ownedFarmSurfaceBounds() {
  return farmSurfaceBounds(state.ownedPlots);
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

function focusPlot(plotId) {
  if (!state?.ownedPlots.includes(plotId) || !canvasWidth || !canvasHeight) return false;
  const center = plotGeometry(plotId).center;
  const targetScale = clamp(Math.min(canvasWidth / (TILE_W * 5.2), canvasHeight / (TILE_H * 7)), 0.78, 1.55);
  const from = { scale: camera.scale, x: camera.x, y: camera.y };
  camera.scale = targetScale;
  camera.x = canvasWidth / 2 - center.x * targetScale;
  camera.y = canvasHeight * 0.51 - center.y * targetScale;
  constrainCamera();
  const target = { scale: camera.scale, x: camera.x, y: camera.y };
  camera.scale = from.scale;
  camera.x = from.x;
  camera.y = from.y;
  const now = performance.now();
  cameraFocusAnimation = state.settings.reducedMotion
    ? null
    : { from, target, startedAt: now, duration: 440 };
  if (!cameraFocusAnimation) Object.assign(camera, target);
  focusedPlotId = plotId;
  focusedPlotStartedAt = now;
  keyboardIndex = indexesForPlot(plotId)[4];
  return true;
}

function updateCameraFocus(now) {
  if (!cameraFocusAnimation) return;
  const progress = clamp((now - cameraFocusAnimation.startedAt) / cameraFocusAnimation.duration, 0, 1);
  const eased = 1 - (1 - progress) ** 3;
  camera.scale = cameraFocusAnimation.from.scale + (cameraFocusAnimation.target.scale - cameraFocusAnimation.from.scale) * eased;
  camera.x = cameraFocusAnimation.from.x + (cameraFocusAnimation.target.x - cameraFocusAnimation.from.x) * eased;
  camera.y = cameraFocusAnimation.from.y + (cameraFocusAnimation.target.y - cameraFocusAnimation.from.y) * eased;
  if (progress >= 1) {
    cameraFocusAnimation = null;
    constrainCamera();
  }
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
  const rangeSelection = selection && (selection.kind === "harvester" || selection.kind === "sprinkler");
  const selectedTarget = selection && !rangeSelection && pendingActionPlotId === plot.id;
  const selectable = selection && !rangeSelection && !selectedTarget && isValidSelectionPlot(plot.id);

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

  if (selectedTarget) {
    pathPlotTop(geometry);
    ctx.fillStyle = "rgba(255,226,124,.24)";
    ctx.fill();
  }

  ctx.save();
  pathPlotTop(geometry);
  ctx.strokeStyle = selectedTarget ? "#ffe27c" : selectable ? "rgba(255,226,124,.48)" : owned ? "rgba(255,239,195,.5)" : "rgba(225,239,198,.15)";
  ctx.lineWidth = (selectedTarget ? 5 : selectable ? 2.5 : 2) / camera.scale;
  if (selectable) ctx.setLineDash([7 / camera.scale, 6 / camera.scale]);
  ctx.stroke();
  ctx.restore();
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

function drawMountain(x, y, scale, backColor, frontColor) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = backColor;
  ctx.beginPath();
  ctx.moveTo(-155, 55);
  ctx.lineTo(-42, -98);
  ctx.lineTo(42, 12);
  ctx.lineTo(98, -58);
  ctx.lineTo(185, 55);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "rgba(244,241,213,.72)";
  ctx.beginPath();
  ctx.moveTo(-42, -98);
  ctx.lineTo(-74, -55);
  ctx.lineTo(-35, -64);
  ctx.lineTo(-8, -51);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = frontColor;
  ctx.beginPath();
  ctx.moveTo(-170, 55);
  ctx.quadraticCurveTo(-78, 5, -8, 45);
  ctx.quadraticCurveTo(82, -2, 190, 55);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawTree(x, y, scale = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = "rgba(31,44,27,.18)";
  ctx.beginPath();
  ctx.ellipse(7, 8, 34, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#6d4930";
  ctx.fillRect(-5, -28, 10, 35);
  ctx.fillStyle = "#2e6841";
  ctx.beginPath(); ctx.arc(-15, -40, 22, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#3f8250";
  ctx.beginPath(); ctx.arc(12, -45, 26, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#5a985b";
  ctx.beginPath(); ctx.arc(-2, -65, 25, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawFarmhouse(x, y, scale = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = "rgba(36,42,25,.2)";
  ctx.beginPath(); ctx.ellipse(18, 17, 70, 18, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#dca967";
  ctx.fillRect(-48, -46, 96, 62);
  ctx.fillStyle = "#b86a48";
  ctx.beginPath(); ctx.moveTo(-62, -43); ctx.lineTo(0, -88); ctx.lineTo(62, -43); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#70412d";
  ctx.fillRect(-13, -20, 26, 36);
  ctx.fillStyle = "#9ed0cd";
  ctx.fillRect(-38, -29, 17, 17);
  ctx.fillRect(21, -29, 17, 17);
  ctx.strokeStyle = "rgba(65,54,37,.45)";
  ctx.lineWidth = 3;
  ctx.strokeRect(-38, -29, 17, 17);
  ctx.strokeRect(21, -29, 17, 17);
  ctx.fillStyle = "#f2cf72";
  ctx.beginPath(); ctx.arc(6, -1, 3, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawWorldBackdrop() {
  const grassGradient = ctx.createLinearGradient(0, -700, 0, 2100);
  grassGradient.addColorStop(0, "#a9c983");
  grassGradient.addColorStop(.48, "#86ad69");
  grassGradient.addColorStop(1, "#6f985c");
  ctx.fillStyle = grassGradient;
  ctx.fillRect(-2600, -900, 5200, 3400);

  ctx.save();
  ctx.fillStyle = "rgba(242,232,164,.09)";
  for (let patch = 0; patch < 96; patch += 1) {
    const x = ((patch * 347) % 4400) - 2200;
    const y = ((patch * 193) % 2600) - 500;
    ctx.beginPath();
    ctx.ellipse(x, y, 18 + patch % 5 * 8, 7 + patch % 3 * 4, (patch % 7) * .18, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawSideScenery() {
  fullFarmBounds ||= farmSurfaceBounds(ALL_PLOT_IDS);
  const bounds = fullFarmBounds;
  const centerY = (bounds.minY + bounds.maxY) / 2;

  drawMountain(bounds.minX - 330, centerY - 115, 1.05, "rgba(82,118,86,.72)", "rgba(74,127,75,.82)");
  drawMountain(bounds.maxX + 325, centerY - 85, .92, "rgba(91,126,91,.68)", "rgba(84,137,79,.76)");

  ctx.save();
  ctx.fillStyle = "rgba(82,151,161,.68)";
  ctx.beginPath();
  ctx.ellipse(bounds.minX - 235, centerY + 205, 108, 49, -.18, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(221,239,202,.6)";
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.strokeStyle = "rgba(232,250,233,.42)";
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(bounds.minX - 243, centerY + 202, 62, 18, -.18, .2, 2.3); ctx.stroke();
  ctx.restore();

  drawFarmhouse(bounds.maxX + 145, centerY + 175, .82);
  drawTree(bounds.minX - 145, centerY - 15, 1.05);
  drawTree(bounds.minX - 245, centerY + 55, .78);
  drawTree(bounds.maxX + 115, centerY - 65, .9);
  drawTree(bounds.maxX + 215, centerY + 45, .7);

  ctx.save();
  ctx.fillStyle = "rgba(250,220,102,.8)";
  for (let flower = 0; flower < 13; flower += 1) {
    const side = flower % 2 ? -1 : 1;
    const x = side < 0 ? bounds.minX - 112 - (flower % 4) * 18 : bounds.maxX + 112 + (flower % 3) * 16;
    const y = centerY - 110 + flower * 19;
    ctx.beginPath(); ctx.arc(x, y, 3.2, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

function plantMetrics(cell) {
  const plant = getPlant(cell.plantId);
  const mature = cell.phase === "mature";
  const progress = mature ? 1 : clamp(cell.growthProgress, 0, 1);
  const growthScale = 0.28 + progress * 0.72;
  const image = plant.image ? images.get(plant.image) : null;
  const base = plant.type === "tree" ? 116 : TALL_PLANT_IDS.has(plant.id) ? 94 : plant.id === "cabbage" ? 70 : 82;
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
  const bob = mature && !state.settings.reducedMotion && !LOW_POWER_RENDER ? Math.sin(now / 650 + x * 0.03) * .65 : 0;
  ctx.save();
  ctx.fillStyle = "rgba(47,35,22,.25)";
  ctx.beginPath();
  ctx.ellipse(x, y + contactY - 2, 23 * growthScale, 7 * growthScale, 0, 0, Math.PI * 2);
  ctx.fill();
  if (!LOW_POWER_RENDER) {
    ctx.shadowColor = "rgba(39,28,19,.28)";
    ctx.shadowBlur = 7;
    ctx.shadowOffsetY = 5;
  }
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

function drawDeviceBadge(device, x, y, accent) {
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(255,250,232,.94)";
  ctx.strokeStyle = accent;
  ctx.lineWidth = 2 / camera.scale;
  ctx.beginPath(); ctx.arc(x, y, 20, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  const image = device.image ? images.get(device.image) : null;
  if (image) ctx.drawImage(image, x - 15, y - 15, 30, 30);
  else {
    ctx.fillStyle = "#203b28";
    ctx.font = "18px sans-serif";
    ctx.fillText(device.emoji, x, y);
  }
  ctx.fillStyle = "#173b2a";
  ctx.font = "800 8px sans-serif";
  ctx.fillText(`${device.range}×${device.range}`, x, y + 24);
  ctx.restore();
}

function drawHarvesterOperation(device, plotId, x, y, now) {
  const phase = state.settings.reducedMotion ? .12 : (now / Math.max(3800, 9200 - device.tier * 520) + plotId * .137) % 1;
  const angle = phase * Math.PI * 2;
  const radiusX = 67 + Math.min(9, device.range) * 2;
  const radiusY = 29 + Math.min(9, device.range) * .9;
  const vehicleX = x + Math.cos(angle) * radiusX;
  const vehicleY = y + 7 + Math.sin(angle) * radiusY;
  const direction = Math.cos(angle) >= 0 ? 1 : -1;
  const forestry = device.targetType === "tree";

  ctx.save();
  ctx.strokeStyle = forestry ? "rgba(132,92,54,.58)" : "rgba(239,189,75,.58)";
  ctx.lineWidth = 2 / camera.scale;
  ctx.setLineDash([7 / camera.scale, 8 / camera.scale]);
  ctx.beginPath(); ctx.ellipse(x, y + 7, radiusX, radiusY, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = "rgba(39,32,21,.25)";
  ctx.beginPath(); ctx.ellipse(vehicleX, vehicleY + 10, 22, 7, 0, 0, Math.PI * 2); ctx.fill();

  if (!state.settings.reducedMotion && !LOW_POWER_RENDER) {
    ctx.fillStyle = forestry ? "rgba(126,84,44,.72)" : "rgba(114,145,67,.66)";
    for (let particle = 0; particle < 5; particle += 1) {
      const lag = 11 + particle * 6;
      ctx.beginPath();
      ctx.arc(vehicleX - direction * lag, vehicleY + 4 + (particle % 2) * 4, 1.8 + particle % 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.translate(vehicleX, vehicleY - 6);
  ctx.scale(direction, 1);
  ctx.rotate(Math.sin(angle) * .09);
  const vehicleImage = images.get("combine-harvester.png");
  if (vehicleImage) ctx.drawImage(vehicleImage, -21, -22, 42, 42);
  else {
    ctx.font = "31px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("🚜", 0, 9);
  }
  if (forestry) {
    ctx.font = "13px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("🪵", -17, -8);
  }
  ctx.restore();
}

function drawSprinklerOperation(device, plotId, x, y, now) {
  const phase = state.settings.reducedMotion ? 0 : now / 720 + plotId;
  const reachX = 42 + device.range * 4;
  const reachY = 15 + device.range * 1.6;
  ctx.save();
  ctx.strokeStyle = "rgba(148,226,241,.72)";
  ctx.fillStyle = "rgba(196,242,250,.84)";
  ctx.lineWidth = 2 / camera.scale;
  for (let jet = 0; jet < (LOW_POWER_RENDER ? 2 : 4); jet += 1) {
    const angle = phase + jet * Math.PI / 2;
    const endX = x + Math.cos(angle) * reachX;
    const endY = y + 2 + Math.sin(angle) * reachY;
    ctx.beginPath();
    ctx.moveTo(x, y - 16);
    ctx.quadraticCurveTo((x + endX) / 2, Math.min(y - 42, endY - 35), endX, endY);
    ctx.stroke();
    ctx.beginPath(); ctx.arc(endX, endY, 2.8, 0, Math.PI * 2); ctx.fill();
  }
  const ripple = state.settings.reducedMotion ? 14 : 10 + (now / 45 % 22);
  ctx.globalAlpha = state.settings.reducedMotion ? .45 : 1 - (ripple - 10) / 24;
  ctx.beginPath(); ctx.ellipse(x, y + 8, ripple * 2.2, ripple * .7, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}

function deviceAnchorPoint(placed, fallback) {
  const index = Number.isInteger(placed?.centerIndex) && placed.centerIndex >= 0 && placed.centerIndex < BOARD_SIZE * BOARD_SIZE
    ? placed.centerIndex
    : null;
  if (index == null) return fallback;
  return worldPoint(Math.floor(index / BOARD_SIZE), index % BOARD_SIZE);
}

function drawDevices(plotId, x, y, now) {
  const harvesterState = state.harvesters.find((item) => item.plotId === plotId);
  const sprinklerState = state.sprinklers.find((item) => item.plotId === plotId);
  const harvester = harvesterState ? getHarvester(harvesterState.id) : null;
  const sprinkler = sprinklerState ? getSprinkler(sprinklerState.id) : null;
  if (!harvester && !sprinkler) return;

  const harvesterPoint = harvesterState ? deviceAnchorPoint(harvesterState, { x, y }) : null;
  const sprinklerPoint = sprinklerState ? deviceAnchorPoint(sprinklerState, { x, y }) : null;
  if (harvester) drawHarvesterOperation(harvester, plotId, harvesterPoint.x, harvesterPoint.y, now);
  if (sprinkler) drawSprinklerOperation(sprinkler, plotId, sprinklerPoint.x, sprinklerPoint.y, now);
  const sameAnchor = harvesterPoint && sprinklerPoint && harvesterPoint.x === sprinklerPoint.x && harvesterPoint.y === sprinklerPoint.y;
  if (harvester) drawDeviceBadge(harvester, harvesterPoint.x + (sameAnchor ? -25 : 0), harvesterPoint.y - 38, "rgba(226,174,67,.82)");
  if (sprinkler) drawDeviceBadge(sprinkler, sprinklerPoint.x + (sameAnchor ? 25 : 0), sprinklerPoint.y - 38, "rgba(105,197,218,.82)");
}

function drawFertilizerOperation(plotId, x, y, now) {
  const fertilizedCells = indexesForPlot(plotId).map((index) => state.cells[index]).filter((cell) => cell.fertilizerId);
  if (!fertilizedCells.length) return;
  const fertilizer = getFertilizer(fertilizedCells[0].fertilizerId);
  if (!fertilizer) return;
  const rounds = Math.max(...fertilizedCells.map((cell) => cell.fertilizerRounds));
  const cycle = state.settings.reducedMotion ? .5 : (now / 6200 + plotId * .071) % 1;
  const laneProgress = cycle * 3;
  const lane = Math.min(2, Math.floor(laneProgress));
  const localProgress = laneProgress - lane;
  const direction = lane % 2 === 0 ? 1 : -1;
  const travel = direction > 0 ? localProgress : 1 - localProgress;
  const machineX = x - 58 + travel * 116;
  const machineY = y - 2 + (lane - 1) * 15;
  const wheelSpin = state.settings.reducedMotion ? 0 : now / 95 * direction;

  ctx.save();
  ctx.fillStyle = "rgba(46,33,20,.24)";
  ctx.beginPath(); ctx.ellipse(machineX, machineY + 13, 23, 7, 0, 0, Math.PI * 2); ctx.fill();
  if (!state.settings.reducedMotion) {
    ctx.fillStyle = "rgba(183,133,65,.76)";
    for (let grain = 0; grain < (LOW_POWER_RENDER ? 3 : 7); grain += 1) {
      const drift = 10 + grain * 5;
      const grainX = machineX - direction * drift;
      const grainY = machineY + 8 + Math.sin(now / 120 + grain) * 5;
      ctx.beginPath(); ctx.arc(grainX, grainY, 1.7 + grain % 2, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.translate(machineX, machineY);
  ctx.scale(direction, 1);
  ctx.fillStyle = "#d6a94f";
  ctx.strokeStyle = "#70492e";
  ctx.lineWidth = 2 / camera.scale;
  ctx.beginPath();
  ctx.moveTo(-15, -4); ctx.lineTo(14, -4); ctx.lineTo(11, 10); ctx.lineTo(-13, 10); ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#8d6439";
  ctx.beginPath(); ctx.moveTo(-9, -17); ctx.lineTo(9, -17); ctx.lineTo(13, -4); ctx.lineTo(-13, -4); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = "#5d4935";
  ctx.beginPath(); ctx.moveTo(13, -8); ctx.lineTo(24, -16); ctx.stroke();
  for (const wheelX of [-10, 10]) {
    ctx.save(); ctx.translate(wheelX, 11); ctx.rotate(wheelSpin);
    ctx.fillStyle = "#3d382f";
    ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#c2a06a";
    ctx.beginPath(); ctx.moveTo(-4, 0); ctx.lineTo(4, 0); ctx.moveTo(0, -4); ctx.lineTo(0, 4); ctx.stroke();
    ctx.restore();
  }
  ctx.restore();

  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "800 10px sans-serif";
  ctx.fillStyle = "rgba(255,249,222,.94)";
  ctx.strokeStyle = "rgba(93,73,53,.55)";
  ctx.lineWidth = 1 / camera.scale;
  ctx.beginPath(); ctx.roundRect(machineX - 18, machineY - 32, 36, 15, 7); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#624728";
  ctx.fillText(`${fertilizer.emoji} ×${rounds}`, machineX, machineY - 24.5);
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
  const price = getLandPrice(state.ownedPlots.length);
  const affordable = price != null && state.gold >= price;
  for (const plot of PLOTS) {
    if (state.ownedPlots.includes(plot.id)) continue;
    const indexes = indexesForPlot(plot.id);
    const centerIndex = indexes[4];
    const point = worldPoint(Math.floor(centerIndex / BOARD_SIZE), centerIndex % BOARD_SIZE);
    plotOutline(plot.id, affordable ? "rgba(255,223,109,.72)" : "rgba(231,241,209,.2)", affordable ? 3 : 2);
    ctx.save();
    ctx.translate(point.x, point.y - 8);
    ctx.fillStyle = affordable ? "rgba(20,55,35,.88)" : "rgba(25,51,34,.62)";
    ctx.beginPath();
    ctx.arc(0, 0, 23, 0, Math.PI * 2);
    ctx.fill();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "22px sans-serif";
    ctx.fillText(affordable ? "＋" : "🔒", 0, 1);
    ctx.restore();
  }
}

function drawAutomationSelectionPreview() {
  if (!isRangeSelection() || pendingActionPlotId == null || pendingActionIndex == null) return;
  const item = selection.kind === "harvester" ? getHarvester(selection.id) : getSprinkler(selection.id);
  const targets = selectedAutomationTargetIndexes(pendingActionPlotId, item);
  const center = selectedAutomationCenterIndex();
  ctx.save();
  ctx.fillStyle = selection.kind === "sprinkler" ? "rgba(115,216,236,.16)" : "rgba(245,197,82,.16)";
  ctx.strokeStyle = selection.kind === "sprinkler" ? "rgba(168,239,250,.72)" : "rgba(255,224,105,.74)";
  ctx.lineWidth = 2 / camera.scale;
  for (const index of targets) {
    const row = Math.floor(index / BOARD_SIZE);
    const col = index % BOARD_SIZE;
    const point = worldPoint(row, col);
    pathDiamond(ctx, point.x, point.y);
    ctx.fill();
    ctx.stroke();
  }
  const centerRow = Math.floor(center / BOARD_SIZE);
  const centerCol = center % BOARD_SIZE;
  const centerPoint = worldPoint(centerRow, centerCol);
  pathDiamond(ctx, centerPoint.x, centerPoint.y);
  ctx.fillStyle = "rgba(255,255,255,.12)";
  ctx.fill();
  ctx.strokeStyle = "#fff4ad";
  ctx.lineWidth = 4 / camera.scale;
  ctx.stroke();
  ctx.restore();
}

function cellPaintOrder() {
  return CELL_PAINT_ORDER;
}

function drawActionAnimations(now) {
  for (let i = plantBursts.length - 1; i >= 0; i -= 1) {
    const burst = plantBursts[i];
    const age = now - burst.startedAt;
    const duration = state.settings.reducedMotion ? 180 : 820;
    if (age < 0) continue;
    if (age > duration) {
      plantBursts.splice(i, 1);
      continue;
    }
    const progress = clamp(age / duration, 0, 1);
    const rise = 1 - (1 - progress) ** 3;
    ctx.save();
    ctx.translate(burst.x, burst.y + TILE_H * .39);
    ctx.globalAlpha = Math.sin(progress * Math.PI);
    ctx.strokeStyle = "rgba(91,57,35,.72)";
    ctx.lineWidth = 2 / camera.scale;
    ctx.beginPath();
    ctx.ellipse(0, 2, 9 + progress * 22, 3 + progress * 7, 0, 0, Math.PI * 2);
    ctx.stroke();
    for (let seed = 0; seed < 3; seed += 1) {
      const seedX = (seed - 1) * 10;
      const fall = Math.min(1, progress * 2.2);
      ctx.fillStyle = "#765036";
      ctx.beginPath();
      ctx.ellipse(seedX, -32 + fall * 31 + Math.sin(seed * 2.1) * 3, 2.5, 1.7, seed * .7, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = burst.color;
    ctx.lineWidth = 3 / camera.scale;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -20 * rise); ctx.stroke();
    ctx.fillStyle = burst.color;
    ctx.beginPath(); ctx.ellipse(-6 * rise, -13 * rise, 7 * rise, 3.5 * rise, -.45, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(6 * rise, -18 * rise, 7 * rise, 3.5 * rise, .45, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  for (let i = deviceBursts.length - 1; i >= 0; i -= 1) {
    const burst = deviceBursts[i];
    const duration = state.settings.reducedMotion ? 180 : burst.kind === "fertilizer" ? 1100 : burst.kind === "sprinkler" ? 920 : 760;
    const age = now - burst.startedAt;
    if (age > duration) {
      deviceBursts.splice(i, 1);
      continue;
    }
    const progress = clamp(age / duration, 0, 1);
    const fade = 1 - progress;
    ctx.save();
    ctx.translate(burst.x, burst.y - 8);
    if (burst.kind === "fertilizer") {
      ctx.strokeStyle = `rgba(147,102,55,${fade * .86})`;
      ctx.fillStyle = `rgba(215,174,89,${fade * .92})`;
      ctx.lineWidth = 3 / camera.scale;
      for (let lane = -1; lane <= 1; lane += 1) {
        const sweep = (progress * 2 - 1) * 72 * (lane % 2 ? -1 : 1);
        ctx.beginPath();
        ctx.moveTo(-70, lane * 16 + 16);
        ctx.lineTo(70, lane * 16 + 16);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(sweep, lane * 16 + 10, 6 + fade * 5, 0, Math.PI * 2);
        ctx.fill();
      }
      for (let grain = 0; grain < (LOW_POWER_RENDER ? 7 : 15); grain += 1) {
        const angle = grain * Math.PI * 2 / 15;
        const radius = 15 + progress * (35 + grain % 4 * 8);
        ctx.beginPath();
        ctx.arc(Math.cos(angle) * radius, 10 + Math.sin(angle) * radius * .36, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (burst.kind === "sprinkler") {
      ctx.strokeStyle = `rgba(132,225,241,${fade * .9})`;
      ctx.lineWidth = 3 / camera.scale;
      for (let ring = 0; ring < 3; ring += 1) {
        const ringProgress = clamp(progress * 1.45 - ring * .16, 0, 1);
        ctx.beginPath();
        ctx.ellipse(0, 14, 18 + ringProgress * 70, 7 + ringProgress * 24, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.fillStyle = `rgba(199,244,250,${fade})`;
      for (let drop = 0; drop < 8; drop += 1) {
        const angle = drop * Math.PI / 4;
        const radius = 18 + progress * 72;
        ctx.beginPath();
        ctx.arc(Math.cos(angle) * radius, Math.sin(angle) * radius * .38 - 32 * Math.sin(progress * Math.PI), 3, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      ctx.rotate(progress * Math.PI * 2.5);
      ctx.strokeStyle = `rgba(255,215,106,${fade})`;
      ctx.lineWidth = 4 / camera.scale;
      ctx.beginPath(); ctx.arc(0, 0, 18 + progress * 52, 0, Math.PI * 2); ctx.stroke();
      for (let spark = 0; spark < 10; spark += 1) {
        ctx.rotate(Math.PI / 5);
        const inner = 20 + progress * 45;
        ctx.beginPath(); ctx.moveTo(inner, 0); ctx.lineTo(inner + 12 * fade, 0); ctx.stroke();
      }
    }
    ctx.restore();
  }
}

function drawEffects(now) {
  for (let i = swingMarks.length - 1; i >= 0; i -= 1) {
    const mark = swingMarks[i];
    const duration = state.settings.reducedMotion ? 110 : 320;
    const age = now - mark.startedAt;
    if (age > duration) {
      swingMarks.splice(i, 1);
      continue;
    }
    const progress = clamp(age / duration, 0, 1);
    const sweep = 1 - (1 - progress) ** 3;
    ctx.save();
    ctx.translate(mark.x, mark.y + 4);
    ctx.rotate(-.48 + sweep * .54);
    ctx.globalAlpha = Math.sin(progress * Math.PI) * (mark.harvested ? 1 : .7);
    ctx.strokeStyle = "#fff4b1";
    ctx.lineWidth = 5 / camera.scale;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-34, -15);
    ctx.quadraticCurveTo(0, 9, 35, -11);
    ctx.stroke();
    ctx.globalAlpha *= .55;
    ctx.beginPath();
    ctx.moveTo(-27, -22);
    ctx.quadraticCurveTo(2, 3, 30, -19);
    ctx.stroke();
    ctx.globalAlpha = Math.sin(progress * Math.PI) * (mark.harvested ? 1 : .55);
    ctx.strokeStyle = mark.color || "#7dae50";
    ctx.lineWidth = 2.5 / camera.scale;
    const fragmentCount = mark.harvested ? 7 : 2;
    for (let leaf = 0; leaf < fragmentCount; leaf += 1) {
      const direction = leaf % 2 ? -1 : 1;
      const spread = 6 + (leaf % 4) * 8;
      const offset = direction * spread * progress;
      const lift = Math.sin(progress * Math.PI) * (13 + leaf % 3 * 7);
      ctx.beginPath();
      ctx.moveTo(offset, -4 - lift);
      ctx.lineTo(offset + direction * (5 + leaf % 3), -10 - lift - progress * 7);
      ctx.stroke();
    }
    if (mark.harvested) {
      ctx.fillStyle = `rgba(210,180,126,${(1 - progress) * .34})`;
      for (let dust = 0; dust < 4; dust += 1) {
        const angle = dust * Math.PI / 2 + .4;
        ctx.beginPath();
        ctx.arc(Math.cos(angle) * progress * 24, 6 + Math.sin(angle) * progress * 8, 5 + progress * 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

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
  if (FRAME_INTERVAL && now - lastFarmFrameAt < FRAME_INTERVAL) {
    window.requestAnimationFrame(drawFarm);
    return;
  }
  lastFarmFrameAt = now;
  updateCameraFocus(now);
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  ctx.save();
  ctx.translate(camera.x, camera.y);
  ctx.scale(camera.scale, camera.scale);
  drawWorldBackdrop();
  const owned = new Set(state.ownedPlots);
  plotPaintOrder ||= [...PLOTS].sort((a, b) => {
    const aCenter = plotGeometry(a.id).center;
    const bCenter = plotGeometry(b.id).center;
    return aCenter.y - bCenter.y || aCenter.x - bCenter.x;
  });
  for (const plot of plotPaintOrder) drawPlotBase(plot);
  drawSideScenery();

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
  }

  for (const plotId of state.ownedPlots) {
    const center = plotGeometry(plotId).center;
    drawFertilizerOperation(plotId, center.x, center.y, now);
    drawDevices(plotId, center.x, center.y, now);
  }
  drawAutomationSelectionPreview();

  if (focusedPlotId != null) {
    const age = now - focusedPlotStartedAt;
    if (age > 1800) focusedPlotId = null;
    else {
      const pulse = state.settings.reducedMotion ? .75 : .56 + Math.sin(age / 95) * .2;
      plotOutline(focusedPlotId, `rgba(255,224,105,${pulse})`, 5);
    }
  }

  drawActionAnimations(now);
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
    const swingProgress = clamp((now - toolCursor.swingStartedAt) / (state.settings.reducedMotion ? 80 : 280), 0, 1);
    let toolAngle = -.18;
    if (swingProgress < 1) {
      if (swingProgress < .58) {
        const strike = 1 - (1 - swingProgress / .58) ** 3;
        toolAngle = -.68 + strike * 1.34;
      } else {
        toolAngle = .66 - ((swingProgress - .58) / .42) * .84;
      }
      ctx.scale(1 + Math.sin(swingProgress * Math.PI) * .08, 1 + Math.sin(swingProgress * Math.PI) * .08);
    }
    ctx.rotate(toolAngle);
    if (!LOW_POWER_RENDER) {
      ctx.shadowColor = "rgba(22,31,20,.45)";
      ctx.shadowBlur = 6;
      ctx.shadowOffsetY = 3;
    }
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

function isRangeSelection(value = selection) {
  return value?.kind === "harvester" || value?.kind === "sprinkler";
}

function selectedAutomationCenterIndex(plotId = pendingActionPlotId) {
  return pendingActionIndex ?? (plotId == null ? -1 : indexesForPlot(plotId)[4]);
}

function selectedAutomationTargetIndexes(plotId, item) {
  if (!item || plotId == null) return [];
  return automationTargetIndexes(item.range, plotId, state.ownedPlots, selectedAutomationCenterIndex(plotId));
}

function selectionActionPreview(plotId) {
  if (!selection || !state.ownedPlots.includes(plotId)) return null;
  const plot = PLOTS.find((item) => item.id === plotId);
  if (!plot) return null;
  const indexes = indexesForPlot(plotId);

  if (selection.kind === "seed") {
    const plant = getPlant(selection.id);
    if (!plant) return null;
    const replacing = indexes.some((index) => state.cells[index].plantId !== "weed" || state.cells[index].fertilizerId);
    return {
      icon: plant.emoji,
      image: plant.image,
      title: `在${plot.name}種植${plant.name}？`,
      text: `將種滿這塊 3×3 土地，共 9 格。${replacing ? "現有作物、成長進度與肥料會被覆蓋。" : "確認後才會消耗 1 份種子。"}`,
      button: "確認種植",
      disabled: false
    };
  }

  if (selection.kind === "fertilizer") {
    const fertilizer = getFertilizer(selection.id);
    if (!fertilizer || !isValidSelectionPlot(plotId)) return null;
    const replacing = indexes.some((index) => state.cells[index].fertilizerId);
    return {
      icon: fertilizer.emoji,
      title: `在${plot.name}施用${fertilizer.name}？`,
      text: `立即作用於當下 9 格作物：生長 ×${fertilizer.growthMultiplier}、金幣 ×${fertilizer.coinMultiplier}，持續 ${fertilizer.rounds} 輪。${replacing ? "現有肥料與剩餘輪數會被覆蓋。" : ""}`,
      button: "確認施肥",
      disabled: false
    };
  }

  if (selection.kind === "harvester" || selection.kind === "sprinkler") {
    const isHarvester = selection.kind === "harvester";
    const item = isHarvester ? getHarvester(selection.id) : getSprinkler(selection.id);
    if (!item) return null;
    const list = isHarvester ? state.harvesters : state.sprinklers;
    const currentAtTarget = list.find((placed) => placed.plotId === plotId);
    const staysInPlace = selection.sourcePlot === plotId;
    const coveredCells = selectedAutomationTargetIndexes(plotId, item).length;
    const effect = isHarvester
      ? `${item.targetType === "tree" ? "只處理樹木；" : ""}${item.range}×${item.range} 範圍，每 ${item.intervalSeconds} 秒造成 ${item.damage} 傷害。`
      : `${item.range}×${item.range} 範圍，作物生長時間 ×${item.growthMultiplier}。`;
    const movement = staysInPlace
      ? "設備目前已配置在這塊土地，不需要移動。"
      : currentAtTarget
        ? "這會替換此處的同類設備，原設備將收回工具列。"
        : selection.sourcePlot != null
          ? "設備將從原土地移到這裡。"
          : "確認後才會從工具列取出設備。";
    return {
      icon: item.emoji,
      image: item.image,
      title: `以${plot.name}的選取格為中心配置${item.name}？`,
      text: `${effect}目前會覆蓋已購土地 ${coveredCells} 格；畫面中的金色框是作用中心，可自由選在已購土地內。${movement}`,
      button: staysInPlace ? "已配置於此" : "確認配置",
      disabled: staysInPlace
    };
  }
  return null;
}

function closeActionConfirm() {
  pendingActionPlotId = null;
  pendingActionIndex = null;
  elements.actionConfirm.hidden = true;
}

function renderActionConfirm() {
  const preview = pendingActionPlotId == null ? null : selectionActionPreview(pendingActionPlotId);
  if (!preview) {
    closeActionConfirm();
    return;
  }
  elements.actionConfirmArt.innerHTML = assetMarkup(preview.image, preview.icon);
  elements.actionConfirmTitle.textContent = preview.title;
  elements.actionConfirmText.textContent = preview.text;
  elements.actionConfirmButton.textContent = preview.button;
  elements.actionConfirmButton.disabled = preview.disabled;
  elements.actionConfirm.hidden = false;
}

function stageSelection(plotId, index = indexesForPlot(plotId)[4]) {
  closeActionConfirm();
  if (!state.ownedPlots.includes(plotId)) {
    showToast("請先購買這塊土地");
    return;
  }
  if (selection?.kind === "fertilizer" && !isValidSelectionPlot(plotId)) {
    showToast("含有雜草的地塊不能施肥");
    return;
  }
  pendingActionPlotId = plotId;
  pendingActionIndex = isRangeSelection() ? index : null;
  closeLandPopover();
  renderActionConfirm();
}

function renderHeader() {
  elements.gold.textContent = formatMoney(state.gold);
  document.body.classList.toggle("reduce-motion", state.settings.reducedMotion);
}

function unlockText(item, type) {
  if (type === "tool" || type === "plant" || type === "fertilizer") {
    const unlock = item.unlock;
    if (unlock?.type === "lifetimeGold") return `條件：累積獲得 ${formatMoney(unlock.value)}`;
    if (unlock?.type === "harvested") return `條件：累積收割 ${formatNumber(unlock.value)} 格`;
    if (unlock?.type === "plots") return `條件：擁有 ${unlock.value} 塊土地`;
    if (unlock?.type === "tool") return `條件：購買 ${getTool(unlock.value)?.name || "指定農具"}`;
    if (unlock?.type === "plantOwned") return `條件：擁有或種植 ${getPlant(unlock.value)?.name || "指定作物"}`;
    if (unlock?.type === "automation") return "條件：開放自動化設備";
    return "尚未達成條件";
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
  if (kind === "tool") return `用途：裝備後點擊土地進行手動收割。每格 ${item.damage} 傷害，命中 ${item.cells} 格${item.regrowth < 1 ? `，收割後下輪生長時間 ×${item.regrowth}` : ""}。`;
  if (kind === "seed") return `用途：選取後點擊已購土地，一次種滿 3×3，之後會持續再生。單格 HP ${item.hp}，每格收成 ${formatMoney(item.coins)}，生長 ${formatTime(item.growSeconds)}。`;
  if (kind === "harvester") return `用途：配置到已購土地內任一中心格後，自動攻擊範圍內的成熟${item.targetType === "tree" ? "樹木，不會處理一般作物" : "作物"}，離線也會工作。範圍 ${item.range}×${item.range}（最多 ${item.range ** 2} 格），每 ${item.intervalSeconds} 秒造成 ${item.damage} 傷害。`;
  if (kind === "sprinkler") return `用途：配置到已購土地內任一中心格後，持續加速範圍內作物，離線生長同樣有效。範圍 ${item.range}×${item.range}（最多 ${item.range ** 2} 格），生長時間 ×${item.growthMultiplier}。`;
  return `用途：${item.purpose} 選取後施用於一塊 3×3 作物，當下立即生效；生長 ×${item.growthMultiplier}、金幣 ×${item.coinMultiplier}，持續 ${item.rounds} 輪。`;
}

function openShopProduct(kind, id) {
  const item = getShopProduct(kind, id);
  if (!item) return;
  selectedShopProduct = { kind, id };
  const unlocked = isShopProductUnlocked(kind, item);
  const owned = isShopProductOwned(kind, item);
  const price = getProductPrice(kind, item);
  const description = shopProductDescription(kind, item);
  const unlockType = kind === "seed" ? "plant" : kind === "harvester" || kind === "sprinkler" ? "automation" : kind;
  elements.shopDialogArt.innerHTML = assetMarkup(item.image, item.emoji);
  elements.shopDialogTitle.textContent = item.name;
  elements.shopDialogCopy.textContent = unlocked ? description : `${unlockText(item, unlockType)}。${description}`;
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
    items.push(quickButton({ image: item.image, emoji: item.emoji, title: `${item.name}｜點擊定位，可再選土地移動`, attributes: `data-installed-kind="harvester" data-inventory-id="${item.id}" data-source-plot="${placed.plotId}"`, installed: true, selected: selection?.kind === "harvester" && selection.sourcePlot === placed.plotId }));
  }
  for (const placed of state.sprinklers) {
    const item = getSprinkler(placed.id);
    items.push(quickButton({ image: item.image, emoji: item.emoji, title: `${item.name}｜點擊定位，可再選土地移動`, attributes: `data-installed-kind="sprinkler" data-inventory-id="${item.id}" data-source-plot="${placed.plotId}"`, installed: true, selected: selection?.kind === "sprinkler" && selection.sourcePlot === placed.plotId }));
  }
  const cancel = selection ? '<button class="quick-item quick-cancel" type="button" data-cancel-selection aria-label="取消使用物品">×</button>' : "";
  elements.quickbar.innerHTML = tools.join("") + (items.length ? '<span class="quick-divider" aria-hidden="true"></span>' + items.join("") : "") + cancel;
}

function renderAll() {
  renderHeader();
  renderShop();
  renderQuickbar();
  if (selectedLandPlot != null) showLandPopover(selectedLandPlot);
  if (pendingActionPlotId != null && selection) renderActionConfirm();
  else elements.actionConfirm.hidden = true;
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
    closeActionConfirm();
    selection = { kind, id, sourcePlot: null };
    showToast(`${item.name}已放入下方工具列`);
  }
  playTone("purchase");
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

function placeDevice(kind, id, plotId, centerIndex = indexesForPlot(plotId)[4]) {
  const list = kind === "harvester" ? state.harvesters : state.sprinklers;
  const currentAtTarget = list.find((item) => item.plotId === plotId);
  if (selection.sourcePlot === plotId) { selection = null; showToast("設備留在原地"); return false; }
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
    return false;
  }
  if (kind === "harvester") list.push({ id, plotId, centerIndex, nextRunAt: Date.now() + getHarvester(id).intervalSeconds * 1000 });
  else list.push({ id, plotId, centerIndex });
  showToast(`${kind === "harvester" ? getHarvester(id).name : getSprinkler(id).name}已配置`);
  selection = null;
  return true;
}

function triggerPlantingAnimation(plotId, plantId) {
  const plant = getPlant(plantId);
  const now = performance.now();
  indexesForPlot(plotId).forEach((index, order) => {
    const row = Math.floor(index / BOARD_SIZE);
    const col = index % BOARD_SIZE;
    const point = worldPoint(row, col);
    plantBursts.push({
      x: point.x,
      y: point.y,
      color: plant?.color || "#78a858",
      startedAt: now + (state.settings.reducedMotion ? 0 : order * 32)
    });
  });
}

function triggerDeviceAnimation(kind, plotId, centerIndex = indexesForPlot(plotId)[4]) {
  const point = worldPoint(Math.floor(centerIndex / BOARD_SIZE), centerIndex % BOARD_SIZE);
  deviceBursts.push({ kind, x: point.x, y: point.y, startedAt: performance.now() });
}

function useSelection(plotId) {
  if (!selection || pendingActionPlotId !== plotId || !state.ownedPlots.includes(plotId)) {
    showToast(isRangeSelection() ? "請先選取設備中心格" : "請先選取要施作的 3×3 土地");
    return;
  }
  let feedbackSound = "place";
  if (selection.kind === "seed") {
    const plantId = selection.id;
    if (!consumeInventory("seed", plantId)) return;
    sowPlot(state, plotId, plantId);
    triggerPlantingAnimation(plotId, plantId);
    showToast(`${getPlant(plantId).name}已種滿 3×3 土地`);
    selection = null;
    feedbackSound = "plant";
  } else if (selection.kind === "fertilizer") {
    if (!isValidSelectionPlot(plotId)) { closeActionConfirm(); showToast("含有雜草的地塊不能施肥"); return; }
    const fertilizerId = selection.id;
    if (!consumeInventory("fertilizer", fertilizerId)) return;
    fertilizePlot(state, plotId, fertilizerId);
    triggerDeviceAnimation("fertilizer", plotId);
    showToast(`${getFertilizer(fertilizerId).name}已施用，施肥機開始運作 ${getFertilizer(fertilizerId).rounds} 輪`);
    selection = null;
    feedbackSound = "fertilizer";
  } else if (selection.kind === "harvester" || selection.kind === "sprinkler") {
    const deviceKind = selection.kind;
    const deviceId = selection.id;
    const centerIndex = selectedAutomationCenterIndex(plotId);
    if (!placeDevice(deviceKind, deviceId, plotId, centerIndex)) {
      renderAll();
      return;
    }
    triggerDeviceAnimation(deviceKind, plotId, centerIndex);
    feedbackSound = deviceKind === "sprinkler" ? "water" : "machine";
  }
  closeActionConfirm();
  playTone(feedbackSound);
  saveNow();
  renderAll();
}

function showLandPopover(plotId) {
  const plot = PLOTS.find((item) => item.id === plotId);
  if (!plot || state.ownedPlots.includes(plotId)) {
    closeLandPopover();
    return;
  }
  closeActionConfirm();
  selectedLandPlot = plotId;
  const price = getLandPrice(state.ownedPlots.length);
  const affordable = price != null && state.gold >= price;
  elements.landPopover.hidden = false;
  elements.landIcon.textContent = affordable ? "🌱" : "🔒";
  elements.landTitle.textContent = plot.name;
  elements.landPrice.textContent = price == null ? "已購完" : formatMoney(price);
  if (price == null) {
    elements.landCondition.textContent = "所有土地都已購買。";
    elements.landBuy.disabled = true;
    elements.landBuy.textContent = "已購完";
  } else if (!affordable) {
    elements.landCondition.textContent = `位置可自由選擇；下一塊土地還差 ${formatMoney(price - state.gold)}`;
    elements.landBuy.disabled = true;
    elements.landBuy.textContent = "金幣不足";
  } else {
    elements.landCondition.textContent = `位置可自由選擇；這是第 ${state.ownedPlots.length + 1} 塊土地。`;
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
  const price = getLandPrice(state.ownedPlots.length);
  if (!plot || state.ownedPlots.includes(plot.id) || price == null || state.gold < price) return;
  if (!window.confirm(`要以 ${formatMoney(price)} 購買「${plot.name}」嗎？`)) return;
  if (!buyPlot(state, plot.id)) return;
  closeLandPopover();
  playTone("purchase");
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

function triggerHarvestSwing(result) {
  const now = performance.now();
  toolCursor.swingStartedAt = now;
  const targets = state.settings.reducedMotion && result.targets.length
    ? [result.targets[Math.floor(result.targets.length / 2)]]
    : result.targets;
  const hitByIndex = new Map(result.results.map((hit) => [hit.index, hit]));
  for (const index of targets) {
    const row = Math.floor(index / BOARD_SIZE);
    const col = index % BOARD_SIZE;
    const point = worldPoint(row, col);
    const plant = getPlant(state.cells[index].plantId);
    swingMarks.push({
      x: point.x,
      y: point.y,
      color: plant?.color || "#7dae50",
      harvested: Boolean(hitByIndex.get(index)?.harvested),
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
  if (selection) { stageSelection(plotId, index); return; }
  simulateTo(state, Date.now());
  const result = manualHarvest(state, index);
  triggerHarvestSwing(result);
  addHarvestEffects(result);
  renderHeader();
  renderShop();
  renderQuickbar();
  const harvestedHits = result.results.filter((hit) => hit.harvested);
  if (harvestedHits.length) {
    playTone("cutComplete");
  } else if (result.results.length) {
    playTone("damage");
  } else {
    playTone("hit");
    const plant = getPlant(state.cells[index].plantId);
    showToast(`${plant?.name || "這株植物"}還要 ${formatGrowthCountdown(remainingGrowthTime(index))}成熟`);
  }
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
  cameraFocusAnimation = null;
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
  cameraFocusAnimation = null;
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
$("#action-confirm-close").addEventListener("click", () => { closeActionConfirm(); renderAll(); });
$("#action-confirm-cancel").addEventListener("click", () => { closeActionConfirm(); renderAll(); });
elements.actionConfirmButton.addEventListener("click", () => {
  if (pendingActionPlotId == null || elements.actionConfirmButton.disabled) return;
  useSelection(pendingActionPlotId);
});

elements.quickbar.addEventListener("click", (event) => {
  if (event.target.closest("[data-cancel-selection]")) {
    selection = null;
    closeActionConfirm();
    renderAll();
    return;
  }
  const tool = event.target.closest("[data-tool-id]");
  if (tool) {
    state.equippedToolId = tool.dataset.toolId;
    selection = null;
    closeActionConfirm();
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
  closeActionConfirm();
  selection = sameSelection ? null : nextSelection;
  closeLandPopover();
  renderAll();
  if (nextSelection.sourcePlot != null && focusPlot(nextSelection.sourcePlot)) {
    const device = nextSelection.kind === "harvester" ? getHarvester(nextSelection.id) : getSprinkler(nextSelection.id);
    const plot = PLOTS.find((candidate) => candidate.id === nextSelection.sourcePlot);
    showToast(`${device?.name || "設備"}位於${plot?.name || "這塊土地"}`);
  }
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
    selection = null;
    closeActionConfirm();
    closeLandPopover();
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
  closeActionConfirm();
  closeLandPopover();
  saveNow(true); renderAll(); focusOwnedFarm(); elements.settingsDialog.close();
  showToast("已建立新的農場");
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    if (pendingActionPlotId != null) { closeActionConfirm(); renderAll(); }
    else if (selection) { selection = null; renderAll(); }
    else closeLandPopover();
  }
  const number = Number(event.key);
  if (number >= 1 && number <= 8 && !event.metaKey && !event.ctrlKey && !event.altKey && document.activeElement !== elements.canvas) {
    const owned = TOOLS.filter((tool) => state.ownedToolIds.includes(tool.id));
    if (owned[number - 1]) {
      state.equippedToolId = owned[number - 1].id;
      selection = null;
      closeActionConfirm();
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
