(function () {
  "use strict";

  const GRID_SIZE = 120;
  const CANVAS_SIZE = 720;
  const CELL_PIXEL = CANVAS_SIZE / GRID_SIZE;
  const TICK_DURATION = 5000;
  const SEED_RADIUS = 2;
  const MAX_LAYER_INTENSITY = 6;
  const PLACEMENT_RING_DELAY = 110;
  const MAX_EVENTS = 6;
  const BEST_SCORE_KEY = "puzzle-club-petri-best-score";
  const DIRECTIONS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const SPECIES_ORDER = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];
  const BASE_ENVIRONMENT = { temperature: 24, brightness: 45, ph: 7 };
  const ENVIRONMENT_LIMITS = {
    temperature: [0, 60],
    brightness: [0, 100],
    ph: [0, 14]
  };

  const SPECIES = {
    A: {
      name: "蔓延菌",
      color: "#43c46b",
      hint: "趨光，會朝亮度較高的空格優先蔓延。",
      css: "green",
      behavior: "向外擴散",
      preferred: { temperature: [20, 30], brightness: [60, 100], ph: [6, 8] },
      tolerance: { temperature: 8, brightness: 35, ph: 2 },
      effect: { temperature: 0, brightness: 4, ph: 0 },
      tags: ["phototaxis", "expander"]
    },
    B: {
      name: "吸收菌",
      color: "#3b82f6",
      hint: "酸化環境並把外圍菌落拉回中心。",
      css: "blue",
      behavior: "向內吸收",
      preferred: { temperature: [18, 28], brightness: [15, 70], ph: [4.5, 6.5] },
      tolerance: { temperature: 8, brightness: 35, ph: 3 },
      effect: { temperature: 0, brightness: -5, ph: -0.5 },
      tags: ["acidifier", "acidophile", "absorber", "mobile"]
    },
    C: {
      name: "催化菌",
      color: "#f6c945",
      hint: "發亮，讓相鄰菌種的下一次反應更快。",
      css: "yellow",
      behavior: "加速鄰居",
      preferred: { temperature: [18, 34], brightness: [45, 90], ph: [6, 8.5] },
      tolerance: { temperature: 10, brightness: 40, ph: 2.5 },
      effect: { temperature: 0, brightness: 24, ph: 0 },
      neighborEffect: { temperature: 0, brightness: 10, ph: 0 },
      tags: ["lightEmitter", "catalyst"]
    },
    D: {
      name: "爆裂菌",
      color: "#f05a4f",
      hint: "提高溫度並在高溫環境中完成範圍爆發。",
      css: "red",
      behavior: "倒數爆發",
      preferred: { temperature: [32, 44], brightness: [25, 80], ph: [5.5, 8.5] },
      tolerance: { temperature: 14, brightness: 40, ph: 3 },
      effect: { temperature: 6, brightness: 6, ph: 0 },
      neighborEffect: { temperature: 2, brightness: 0, ph: 0 },
      tags: ["heatProducer", "thermophile", "burst"]
    },
    E: {
      name: "結晶菌",
      color: "#a178ff",
      hint: "提高 pH、降低亮度，建立不能穿越的屏障。",
      css: "purple",
      behavior: "建立屏障",
      preferred: { temperature: [16, 32], brightness: [10, 65], ph: [7.5, 9.5] },
      tolerance: { temperature: 10, brightness: 35, ph: 2 },
      effect: { temperature: 0, brightness: -12, ph: 0.8 },
      neighborEffect: { temperature: 0, brightness: -5, ph: 0.3 },
      tags: ["baseFormer", "alkaliphile", "shadeFormer", "barrier"]
    },
    F: {
      name: "冷凝菌",
      color: "#67d9ff",
      hint: "降低溫度，讓熱區冷卻並形成低溫路徑。",
      css: "cyan",
      behavior: "降溫遷徙",
      preferred: { temperature: [8, 20], brightness: [20, 75], ph: [6, 8] },
      tolerance: { temperature: 10, brightness: 40, ph: 2.5 },
      effect: { temperature: -6, brightness: -2, ph: 0 },
      neighborEffect: { temperature: -2, brightness: 0, ph: 0 },
      tags: ["coldProducer", "psychrophile", "thermotaxis"]
    },
    G: {
      name: "緩衝菌",
      color: "#b4d66a",
      hint: "把過酸或過鹼的格子拉回中性 pH 7。",
      css: "lime",
      behavior: "中和環境",
      preferred: { temperature: [20, 30], brightness: [25, 75], ph: [6.5, 7.5] },
      tolerance: { temperature: 10, brightness: 45, ph: 3 },
      effect: { temperature: 0, brightness: 0, ph: 0 },
      bufferStrength: 0.9,
      tags: ["buffer", "neutrophile", "stabilizer"]
    },
    H: {
      name: "暗行菌",
      color: "#6674a9",
      hint: "吸收亮度，偏好陰暗格並沿暗處前進。",
      css: "indigo",
      behavior: "避光潛行",
      preferred: { temperature: [16, 30], brightness: [0, 35], ph: [5.5, 8] },
      tolerance: { temperature: 12, brightness: 35, ph: 3 },
      effect: { temperature: 0, brightness: -20, ph: 0 },
      neighborEffect: { temperature: 0, brightness: -8, ph: 0 },
      tags: ["lightAbsorber", "photophobe", "thermotaxis"]
    },
    I: {
      name: "播孢菌",
      color: "#ff9f5b",
      hint: "把孢子播到附近空格，善用任何尚未被佔領的環境。",
      css: "orange",
      behavior: "遠距播種",
      preferred: { temperature: [15, 36], brightness: [25, 85], ph: [5.5, 8.5] },
      tolerance: { temperature: 15, brightness: 50, ph: 4 },
      effect: { temperature: 0, brightness: 3, ph: 0 },
      tags: ["sporeLauncher", "opportunist"]
    },
    J: {
      name: "轉化菌",
      color: "#e379d4",
      hint: "接觸其他菌後模仿其環境效果，形成新的混合路線。",
      css: "pink",
      behavior: "屬性轉化",
      preferred: { temperature: [15, 35], brightness: [35, 80], ph: [5.5, 8.5] },
      tolerance: { temperature: 15, brightness: 50, ph: 4 },
      effect: { temperature: 0, brightness: 0, ph: 0 },
      tags: ["mimic", "adaptive", "opportunist"]
    }
  };

  const PAIR_RULES = {
    AB: { color: "#36c9b0", name: "潮汐混合", message: "B 吸收後，A 從外緣向外溢出。" },
    AC: { color: "#a8d63b", name: "快速蔓延", message: "A 的趨光蔓延受到 C 的光脈衝加速。" },
    AD: { color: "#f28c3c", name: "孢子爆發", message: "D 的熱區點燃 A 的綠色區域。" },
    AE: { color: "#557c63", name: "沿壁蔓延", message: "A 遇到 E，沿著紫色屏障轉向。" },
    BC: { color: "#2ab7c6", name: "濾化吸收", message: "C 的光脈衝提高 B 的吸收上限。" },
    BD: { color: "#8656c7", name: "壓縮爆破", message: "B 壓縮 D 的爆發範圍，中心強度提高。" },
    BE: { color: "#5559b7", name: "沉澱晶核", message: "B 的吸收在 E 旁邊沉澱成靛藍晶核。" },
    CD: { color: "#eea53d", name: "鏈式引爆", message: "C 立即完成 D 的倒數，鏈式爆發開始。" },
    CE: { color: "#a7894b", name: "孢子網路", message: "C 將紫色屏障連成催化網路。" },
    DE: { color: "#c25ba6", name: "熔融封印", message: "E 擋住 D 的爆發，接觸點形成洋紅封印。" },
    AF: { color: "#61d1c8", name: "冷光追逐", message: "A 追著亮度走，F 把熱區降成冷光路徑。" },
    AG: { color: "#8fcf72", name: "中性蔓延", message: "G 穩定 pH，讓 A 的綠色邊界更容易延伸。" },
    AH: { color: "#405b83", name: "明暗拉鋸", message: "A 的趨光與 H 的吸光在接觸邊界拉扯。" },
    AI: { color: "#d5b86c", name: "光孢播散", message: "A 的亮度方向替 I 找到下一個播孢落點。" },
    AJ: { color: "#a78ccf", name: "模仿蔓延", message: "J 開始模仿 A 的蔓延屬性。" },
    BF: { color: "#4daed0", name: "冷酸沉降", message: "B 的酸化與 F 的降溫形成冷酸沉降。" },
    BG: { color: "#83c6a2", name: "酸鹼緩衝", message: "G 把 B 造成的酸性拉回中性。" },
    BH: { color: "#394c84", name: "暗潮吸收", message: "H 降低亮度，B 在暗處沿吸收方向移動。" },
    BI: { color: "#8a9bca", name: "遠距吸收", message: "I 播出的孢子成為 B 下一個可吸收目標。" },
    BJ: { color: "#b16ebc", name: "轉化吞噬", message: "J 模仿 B 的酸化，B 將外圍顏色拉回。" },
    CF: { color: "#79d6dc", name: "冷光催化", message: "C 的光在 F 的冷區中形成清晰脈衝。" },
    CG: { color: "#d1dc8d", name: "穩定催化", message: "G 穩定環境，C 的催化不再受 pH 干擾。" },
    CH: { color: "#59658b", name: "暗光抑制", message: "H 吸收 C 的光，催化範圍縮短。" },
    CI: { color: "#eab47a", name: "發光播孢", message: "C 為 I 的下一次播孢提供亮度。" },
    CJ: { color: "#d995c6", name: "模仿催化", message: "J 複製 C 的發光效果一個脈衝。" },
    DF: { color: "#9eb9db", name: "熱冷衝擊", message: "D 與 F 抵消溫度，爆發半徑被壓縮。" },
    DG: { color: "#cfaa78", name: "熱區緩衝", message: "G 穩定 D 的熱區，使爆發更可預測。" },
    DH: { color: "#785c75", name: "暗焰", message: "H 吸走 D 的火光，只留下低亮度熱源。" },
    DI: { color: "#ed9e72", name: "熱孢播種", message: "D 的熱浪把 I 的孢子送往外圈。" },
    DJ: { color: "#d17fb5", name: "變形爆裂", message: "J 模仿 D 的升溫並準備一次小型爆裂。" },
    EF: { color: "#77b9d4", name: "封凍晶壁", message: "F 讓 E 的結晶屏障變成低溫封凍線。" },
    EG: { color: "#b7b984", name: "中和晶格", message: "G 讓 E 的鹼性晶格保持穩定。" },
    EH: { color: "#4d557f", name: "暗晶迷宮", message: "H 加深 E 的遮光屏障。" },
    EI: { color: "#d5a77b", name: "結晶播種", message: "E 固定 I 的播孢位置，形成孢子晶點。" },
    EJ: { color: "#bd83c4", name: "轉化封印", message: "J 模仿 E 的封鎖屬性。" }
  };

  const TRAIT_BONUSES = [
    { a: "lightEmitter", b: "phototaxis", value: 0.2, label: "發亮吸引趨光" },
    { a: "heatProducer", b: "thermophile", value: 0.2, label: "產熱餵養嗜高溫" },
    { a: "acidifier", b: "acidophile", value: 0.15, label: "酸化符合嗜酸" },
    { a: "baseFormer", b: "alkaliphile", value: 0.15, label: "鹼化符合嗜鹼" },
    { a: "shadeFormer", b: "phototaxis", value: -0.15, label: "遮光抑制趨光" },
    { a: "coldProducer", b: "psychrophile", value: 0.2, label: "降溫符合嗜低溫" },
    { a: "buffer", b: "neutrophile", value: 0.15, label: "緩衝符合中性" },
    { a: "lightAbsorber", b: "photophobe", value: 0.2, label: "吸光符合避光" },
    { a: "lightEmitter", b: "lightAbsorber", value: -0.2, label: "發光與吸光衝突" },
    { a: "heatProducer", b: "coldProducer", value: -0.25, label: "升溫與降溫衝突" },
    { a: "sporeLauncher", b: "opportunist", value: 0.15, label: "播孢符合機會" }
  ];

  const SEED_OFFSETS = [];
  for (let dy = -SEED_RADIUS; dy <= SEED_RADIUS; dy += 1) {
    for (let dx = -SEED_RADIUS; dx <= SEED_RADIUS; dx += 1) {
      if (dx * dx + dy * dy <= SEED_RADIUS * SEED_RADIUS) {
        SEED_OFFSETS.push({ dx: dx, dy: dy, distance: Math.hypot(dx, dy) });
      }
    }
  }

  const baseCanvas = document.getElementById("dish-base");
  const colorCanvas = document.getElementById("dish-color");
  const effectsCanvas = document.getElementById("dish-effects");
  const previewCanvas = document.getElementById("dish-preview");
  const dishElement = document.getElementById("petri-dish");
  const pulseRingElement = document.querySelector(".petri-pulse-ring");
  const statusElement = document.getElementById("petri-status");
  const selectionHintElement = document.getElementById("selection-hint");
  const eventLogElement = document.getElementById("event-log");
  const pauseButton = document.getElementById("pause-button");
  const restartButton = document.getElementById("restart-button");
  const timeElement = document.getElementById("petri-time");
  const coverageElement = document.getElementById("petri-coverage");
  const mixedElement = document.getElementById("petri-mixed");
  const pulseElement = document.getElementById("petri-pulse");
  const scoreElement = document.getElementById("petri-score");
  const inspectorTitleElement = document.getElementById("cell-inspector-title");
  const temperatureElement = document.getElementById("cell-temperature");
  const brightnessElement = document.getElementById("cell-brightness");
  const phElement = document.getElementById("cell-ph");
  const colonyElement = document.getElementById("cell-colony");
  const inspectorNoteElement = document.getElementById("cell-inspector-note");
  const speciesButtons = Array.from(document.querySelectorAll("[data-species]"));

  const baseContext = baseCanvas.getContext("2d");
  const colorContext = colorCanvas.getContext("2d");
  const effectsContext = effectsCanvas.getContext("2d");
  const previewContext = previewCanvas.getContext("2d");
  const cells = Array(GRID_SIZE * GRID_SIZE).fill(null);
  const validIndices = [];
  const validIndexSet = new Set();
  let entities = [];
  let nextEntityId = 1;
  let selectedSpecies = "A";
  let hoverCell = null;
  let paused = false;
  let elapsed = 0;
  let nextPulseAt = TICK_DURATION;
  let pulseCount = 0;
  let score = 0;
  let bestScore = readBestScore();
  let lastFrameTime = 0;
  let lastUiUpdate = 0;
  let eventMessages = [];
  let effects = [];
  let pendingPlacements = [];
  let queuedEnvironmentDeltas = new Map();

  function clamp(value, minimum, maximum) {
    return Math.max(minimum, Math.min(maximum, value));
  }

  function indexOf(x, y) {
    return y * GRID_SIZE + x;
  }

  function pointFromIndex(index) {
    return { x: index % GRID_SIZE, y: Math.floor(index / GRID_SIZE) };
  }

  function isValidCell(x, y) {
    if (x < 0 || y < 0 || x >= GRID_SIZE || y >= GRID_SIZE) return false;
    const center = (GRID_SIZE - 1) / 2;
    return Math.hypot(x - center, y - center) <= center - 1;
  }

  for (let y = 0; y < GRID_SIZE; y += 1) {
    for (let x = 0; x < GRID_SIZE; x += 1) {
      if (isValidCell(x, y)) {
        const index = indexOf(x, y);
        validIndices.push(index);
        validIndexSet.add(index);
      }
    }
  }

  function readBestScore() {
    try {
      return Number(window.localStorage.getItem(BEST_SCORE_KEY)) || 0;
    } catch (error) {
      return 0;
    }
  }

  function saveBestScore() {
    try {
      window.localStorage.setItem(BEST_SCORE_KEY, String(bestScore));
    } catch (error) {
      // 儲存受限時仍可正常完成本局遊戲。
    }
  }

  function formatTime(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    return String(Math.floor(seconds / 60)).padStart(2, "0") + ":" + String(seconds % 60).padStart(2, "0");
  }

  function formatPulse(milliseconds) {
    return (Math.max(0, milliseconds) / 1000).toFixed(1) + "s";
  }

  function formatEnvironment(environment) {
    return Math.round(environment.temperature) + "°C／亮度" + Math.round(environment.brightness) + "／pH" + environment.ph.toFixed(1);
  }

  function cloneEnvironment(environment) {
    return {
      temperature: environment.temperature,
      brightness: environment.brightness,
      ph: environment.ph
    };
  }

  function hexToRgba(hex, alpha) {
    const value = hex.replace("#", "");
    const red = parseInt(value.slice(0, 2), 16);
    const green = parseInt(value.slice(2, 4), 16);
    const blue = parseInt(value.slice(4, 6), 16);
    return "rgba(" + red + ", " + green + ", " + blue + ", " + alpha + ")";
  }

  function getSpeciesColor(species) {
    return SPECIES[species] ? SPECIES[species].color : "#95a5bd";
  }

  function getPairKey(speciesA, speciesB) {
    return [speciesA, speciesB].sort().join("");
  }

  function createEmptyCell() {
    return {
      environment: cloneEnvironment(BASE_ENVIRONMENT),
      environmentSources: [],
      lastEnvironmentSource: null,
      layers: [],
      species: null,
      owner: null,
      intensity: 0,
      mixedSpecies: null,
      mix: null,
      locked: false,
      age: 0,
      ash: false,
      ashTicks: 0,
      neutralSpore: false,
      neutralSporeTicks: 0
    };
  }

  function resetCells() {
    cells.fill(null);
    validIndices.forEach(function (cellIndex) {
      cells[cellIndex] = createEmptyCell();
    });
  }

  function getCell(x, y) {
    if (!isValidCell(x, y)) return null;
    return cells[indexOf(x, y)];
  }

  function getNeighbors(x, y) {
    return DIRECTIONS.map(function (direction) {
      return { x: x + direction[0], y: y + direction[1] };
    }).filter(function (position) {
      return isValidCell(position.x, position.y);
    });
  }

  function getSeedCells(centerX, centerY) {
    return SEED_OFFSETS.map(function (offset) {
      return { x: centerX + offset.dx, y: centerY + offset.dy, distance: offset.distance };
    }).filter(function (position) {
      return isValidCell(position.x, position.y);
    });
  }

  function isOccupied(cell) {
    return Boolean(cell && cell.layers && cell.layers.length > 0);
  }

  function getCellLayers(cell) {
    return cell && Array.isArray(cell.layers) ? cell.layers : [];
  }

  function getCellLayer(cell, species) {
    return getCellLayers(cell).find(function (layer) {
      return layer.species === species;
    }) || null;
  }

  function getCellOwner(cell, species) {
    const layer = getCellLayer(cell, species);
    return layer ? layer.owner : null;
  }

  function getCellLayerIntensity(cell, species) {
    const layer = getCellLayer(cell, species);
    return layer ? layer.intensity : 0;
  }

  function getEntityById(entityId) {
    return entities.find(function (entity) { return entity.id === entityId; }) || null;
  }

  function createEntity(species) {
    const entity = {
      id: nextEntityId,
      species: species,
      cells: new Set(),
      frontier: new Set(),
      ageTicks: 0,
      growthBoost: 0,
      absorbBonus: 0,
      burstReady: false,
      compressed: false,
      network: false,
      crystalBonus: false,
      mimicSpecies: null,
      movedThisPulse: false
    };
    nextEntityId += 1;
    entities.push(entity);
    return entity;
  }

  function fitValue(value, range, tolerance) {
    if (value >= range[0] && value <= range[1]) return 1;
    const distance = value < range[0] ? range[0] - value : value - range[1];
    return clamp(1 - distance / Math.max(0.001, tolerance), 0, 1);
  }

  function calculateAdaptation(species, environment) {
    const definition = SPECIES[species];
    if (!definition) return 0;
    const temperatureFit = fitValue(environment.temperature, definition.preferred.temperature, definition.tolerance.temperature);
    const brightnessFit = fitValue(environment.brightness, definition.preferred.brightness, definition.tolerance.brightness);
    const phFit = fitValue(environment.ph, definition.preferred.ph, definition.tolerance.ph);
    return temperatureFit * brightnessFit * phFit;
  }

  function calculateEffectiveAdaptation(species, cell, layer) {
    const currentAdaptation = calculateAdaptation(species, cell.environment);
    const arrivalAdaptation = layer && Number.isFinite(layer.adaptationAtArrival)
      ? layer.adaptationAtArrival
      : currentAdaptation;
    return currentAdaptation * 0.6 + arrivalAdaptation * 0.4;
  }

  function getLayerEffect(species, layer, cell) {
    const entity = layer ? getEntityById(layer.owner) : null;
    const mimicSpecies = species === "J" && entity && SPECIES[entity.mimicSpecies] ? entity.mimicSpecies : null;
    const effectSpecies = mimicSpecies || species;
    const definition = SPECIES[effectSpecies];
    const intensityFactor = layer ? clamp(0.7 + layer.intensity * 0.15, 0.7, 1.6) : 1;
    const effect = definition.effect || {};
    let phEffect = (effect.ph || 0) * intensityFactor;
    if (species === "G" && cell) {
      phEffect = (BASE_ENVIRONMENT.ph - cell.environment.ph) * definition.bufferStrength * intensityFactor;
    }
    if (species === "J" && mimicSpecies) {
      phEffect *= 0.65;
    }
    return {
      temperature: (effect.temperature || 0) * intensityFactor * (species === "J" && mimicSpecies ? 0.65 : 1),
      brightness: (effect.brightness || 0) * intensityFactor * (species === "J" && mimicSpecies ? 0.65 : 1),
      ph: phEffect
    };
  }

  function refreshCellAppearance(cell) {
    const layers = getCellLayers(cell);
    if (!isOccupied(cell)) {
      cell.species = null;
      cell.owner = null;
      cell.intensity = 0;
      cell.mixedSpecies = null;
      cell.locked = false;
      return;
    }

    const primaryLayer = layers.slice().sort(function (a, b) { return b.intensity - a.intensity; })[0];
    cell.species = primaryLayer.species;
    cell.owner = primaryLayer.owner;
    cell.intensity = primaryLayer.intensity;
    cell.locked = layers.some(function (layer) { return layer.species === "E"; });
    cell.mixedSpecies = layers.length > 1 ? layers.filter(function (layer) {
      return layer.species !== primaryLayer.species;
    })[0].species : (cell.mix ? cell.mix.species : null);
  }

  function detachLayerOwner(layer, cellIndex) {
    const entity = getEntityById(layer.owner);
    if (entity) {
      entity.cells.delete(cellIndex);
      entity.frontier.delete(cellIndex);
    }
  }

  function markTriadInstability(cell, cellIndex) {
    const layers = getCellLayers(cell).slice();
    layers.forEach(function (layer) { detachLayerOwner(layer, cellIndex); });
    cell.layers = [];
    cell.mix = null;
    cell.mixedSpecies = null;
    cell.neutralSpore = true;
    cell.neutralSporeTicks = 1;
    cell.locked = false;
    recordEvent("三元失衡：三種菌在同一格碰撞，留下中性孢子。", "mixed");
    score = Math.max(0, score - 20);
  }

  function addCellLayer(x, y, entity, intensity, source) {
    const cell = getCell(x, y);
    if (!cell || !entity) return false;

    const cellIndex = indexOf(x, y);
    const existingLayer = getCellLayer(cell, entity.species);
    cell.neutralSpore = false;
    cell.neutralSporeTicks = 0;
    cell.ash = false;
    cell.ashTicks = 0;

    if (existingLayer) {
      existingLayer.intensity = clamp(existingLayer.intensity + (intensity || 1), 1, MAX_LAYER_INTENSITY);
      entity.cells.add(cellIndex);
      refreshCellAppearance(cell);
      return true;
    }

    const environmentSnapshot = cloneEnvironment(cell.environment);
    const layer = {
      species: entity.species,
      owner: entity.id,
      intensity: clamp(intensity || 1, 1, MAX_LAYER_INTENSITY),
      colonizedAt: elapsed,
      colonizedBy: { entityId: entity.id, species: entity.species, source: source || "placement" },
      environmentSnapshot: environmentSnapshot,
      adaptationAtArrival: calculateAdaptation(entity.species, environmentSnapshot),
      effectApplied: getLayerEffect(entity.species, { intensity: intensity || 1, owner: entity.id }, cell),
      exposureTime: 0
    };
    cell.layers.push(layer);
    entity.cells.add(cellIndex);
    refreshCellAppearance(cell);

    if (cell.layers.length > 2) {
      markTriadInstability(cell, cellIndex);
    }
    return true;
  }

  function removeCellLayer(cellIndex, species) {
    const cell = cells[cellIndex];
    if (!cell || !isOccupied(cell)) return null;
    const layerIndex = species
      ? cell.layers.findIndex(function (layer) { return layer.species === species; })
      : 0;
    if (layerIndex < 0 || !cell.layers[layerIndex]) return null;

    const removedLayer = cell.layers.splice(layerIndex, 1)[0];
    detachLayerOwner(removedLayer, cellIndex);
    refreshCellAppearance(cell);
    return removedLayer;
  }

  function getEntityCenter(entity) {
    if (!entity || entity.cells.size === 0) return { x: GRID_SIZE / 2, y: GRID_SIZE / 2 };
    let x = 0;
    let y = 0;
    entity.cells.forEach(function (cellIndex) {
      const point = pointFromIndex(cellIndex);
      x += point.x;
      y += point.y;
    });
    return { x: x / entity.cells.size, y: y / entity.cells.size };
  }

  function addEnvironmentDelta(environmentDeltas, cellIndex, delta, sourceSpecies, sourceWeight) {
    if (!validIndexSet.has(cellIndex)) return;
    let target = environmentDeltas.get(cellIndex);
    if (!target) {
      target = { temperature: 0, brightness: 0, ph: 0, sources: [] };
      environmentDeltas.set(cellIndex, target);
    }
    const weight = sourceWeight || 1;
    target.temperature += (delta.temperature || 0) * weight;
    target.brightness += (delta.brightness || 0) * weight;
    target.ph += (delta.ph || 0) * weight;
    const source = target.sources.find(function (item) { return item.species === sourceSpecies; });
    if (source) {
      source.temperature += (delta.temperature || 0) * weight;
      source.brightness += (delta.brightness || 0) * weight;
      source.ph += (delta.ph || 0) * weight;
    } else {
      target.sources.push({
        species: sourceSpecies,
        temperature: (delta.temperature || 0) * weight,
        brightness: (delta.brightness || 0) * weight,
        ph: (delta.ph || 0) * weight
      });
    }
  }

  function queueEnvironmentDelta(cellIndex, delta, sourceSpecies) {
    const queued = new Map();
    queuedEnvironmentDeltas.forEach(function (value, index) {
      queued.set(index, {
        temperature: value.temperature,
        brightness: value.brightness,
        ph: value.ph,
        sources: value.sources.slice()
      });
    });
    addEnvironmentDelta(queued, cellIndex, delta, sourceSpecies, 1);
    queuedEnvironmentDeltas = queued;
  }

  function updateEnvironments() {
    const environmentDeltas = new Map();
    queuedEnvironmentDeltas.forEach(function (value, cellIndex) {
      environmentDeltas.set(cellIndex, value);
    });
    queuedEnvironmentDeltas = new Map();

    validIndices.forEach(function (cellIndex) {
      const cell = cells[cellIndex];
      if (!isOccupied(cell)) return;
      const point = pointFromIndex(cellIndex);
      getCellLayers(cell).forEach(function (layer) {
        const effect = getLayerEffect(layer.species, layer, cell);
        addEnvironmentDelta(environmentDeltas, cellIndex, effect, layer.species, 1);

        const definition = SPECIES[layer.species];
        if (definition.neighborEffect) {
          getNeighbors(point.x, point.y).forEach(function (neighbor) {
            addEnvironmentDelta(environmentDeltas, indexOf(neighbor.x, neighbor.y), definition.neighborEffect, layer.species, 0.5);
          });
          DIRECTIONS.forEach(function (direction) {
            const distanceTwoX = point.x + direction[0] * 2;
            const distanceTwoY = point.y + direction[1] * 2;
            if (isValidCell(distanceTwoX, distanceTwoY)) {
              addEnvironmentDelta(environmentDeltas, indexOf(distanceTwoX, distanceTwoY), definition.neighborEffect, layer.species, 0.25);
            }
          });
        } else {
          getNeighbors(point.x, point.y).forEach(function (neighbor) {
            addEnvironmentDelta(environmentDeltas, indexOf(neighbor.x, neighbor.y), effect, layer.species, 0.5);
          });
          DIRECTIONS.forEach(function (direction) {
            const distanceTwoX = point.x + direction[0] * 2;
            const distanceTwoY = point.y + direction[1] * 2;
            if (isValidCell(distanceTwoX, distanceTwoY)) {
              addEnvironmentDelta(environmentDeltas, indexOf(distanceTwoX, distanceTwoY), effect, layer.species, 0.25);
            }
          });
        }
      });
    });

    validIndices.forEach(function (cellIndex) {
      const cell = cells[cellIndex];
      const delta = environmentDeltas.get(cellIndex);
      const hasSource = Boolean(delta && delta.sources.length);
      if (delta) {
        const previousPh = cell.environment.ph;
        cell.environment.temperature += delta.temperature;
        cell.environment.brightness += delta.brightness;
        cell.environment.ph += delta.ph;
        const hasBuffer = delta.sources.some(function (source) { return source.species === "G"; });
        if (hasBuffer && ((previousPh < BASE_ENVIRONMENT.ph && cell.environment.ph > BASE_ENVIRONMENT.ph) || (previousPh > BASE_ENVIRONMENT.ph && cell.environment.ph < BASE_ENVIRONMENT.ph))) {
          cell.environment.ph = BASE_ENVIRONMENT.ph;
        }
        cell.environmentSources = delta.sources.map(function (source) {
          return {
            species: source.species,
            temperature: source.temperature,
            brightness: source.brightness,
            ph: source.ph
          };
        });
        const strongest = delta.sources.slice().sort(function (a, b) {
          return Math.abs(b.temperature) + Math.abs(b.brightness) + Math.abs(b.ph) - (Math.abs(a.temperature) + Math.abs(a.brightness) + Math.abs(a.ph));
        })[0];
        cell.lastEnvironmentSource = strongest ? strongest.species : null;
      } else {
        cell.environmentSources = [];
        cell.lastEnvironmentSource = null;
      }

      if (!hasSource) {
        cell.environment.temperature += (BASE_ENVIRONMENT.temperature - cell.environment.temperature) * 0.1;
        cell.environment.brightness += (BASE_ENVIRONMENT.brightness - cell.environment.brightness) * 0.1;
        cell.environment.ph += (BASE_ENVIRONMENT.ph - cell.environment.ph) * 0.1;
      }
      cell.environment.temperature = clamp(cell.environment.temperature, ENVIRONMENT_LIMITS.temperature[0], ENVIRONMENT_LIMITS.temperature[1]);
      cell.environment.brightness = clamp(cell.environment.brightness, ENVIRONMENT_LIMITS.brightness[0], ENVIRONMENT_LIMITS.brightness[1]);
      cell.environment.ph = clamp(cell.environment.ph, ENVIRONMENT_LIMITS.ph[0], ENVIRONMENT_LIMITS.ph[1]);
      getCellLayers(cell).forEach(function (layer) { layer.exposureTime += TICK_DURATION; });
    });
  }

  function getAllTags(speciesA, speciesB) {
    return new Set([].concat(SPECIES[speciesA].tags, SPECIES[speciesB].tags));
  }

  function calculateTraitCompatibility(speciesA, speciesB, environment) {
    const tags = getAllTags(speciesA, speciesB);
    let compatibility = 1;
    TRAIT_BONUSES.forEach(function (bonus) {
      if (tags.has(bonus.a) && tags.has(bonus.b)) {
        compatibility += bonus.value;
      }
    });
    return clamp(compatibility, 0.5, 1.3);
  }

  function getContactPower(layerA, cellA, layerB, cellB, adjacencyWeight) {
    const effectiveA = calculateEffectiveAdaptation(layerA.species, cellA, layerA);
    const effectiveB = calculateEffectiveAdaptation(layerB.species, cellB, layerB);
    const averageAdaptation = (effectiveA + effectiveB) / 2;
    const traitCompatibility = calculateTraitCompatibility(layerA.species, layerB.species, {
      temperature: (cellA.environment.temperature + cellB.environment.temperature) / 2,
      brightness: (cellA.environment.brightness + cellB.environment.brightness) / 2,
      ph: (cellA.environment.ph + cellB.environment.ph) / 2
    });
    const intensityFactor = clamp(Math.min(layerA.intensity, layerB.intensity) / 3, 0.25, 1.4);
    return clamp(averageAdaptation * traitCompatibility * intensityFactor * adjacencyWeight, 0, 1.3);
  }

  function getContactGrade(power) {
    if (power >= 0.75) return "full";
    if (power >= 0.4) return "weak";
    return "trace";
  }

  function markMix(cell, species, pairKey, power, grade) {
    if (!cell || !isOccupied(cell)) return;
    const rule = PAIR_RULES[pairKey];
    const ticksLeft = grade === "full" ? 3 : grade === "weak" ? 2 : 1;
    if (cell.mix && cell.mix.pairKey !== pairKey) {
      cell.mix = null;
    }
    cell.mix = {
      species: species,
      pairKey: pairKey,
      color: rule ? rule.color : "#d9e6ff",
      power: power,
      grade: grade,
      ticksLeft: Math.max(ticksLeft, cell.mix ? cell.mix.ticksLeft : 0)
    };
    cell.mixedSpecies = species;
  }

  function addReactionEffect(speciesA, speciesB, point, type) {
    const pairKey = getPairKey(speciesA, speciesB);
    const rule = PAIR_RULES[pairKey];
    if (!rule && type !== "burst") return;
    effects.push({
      type: type || "mix",
      x: point.x,
      y: point.y,
      color: rule ? rule.color : SPECIES.D.color,
      start: performance.now(),
      duration: type === "burst" ? 900 : 1000
    });
  }

  function applyPairReaction(speciesA, speciesB, layerA, layerB, cellA, cellB, grade, point) {
    const pairKey = getPairKey(speciesA, speciesB);
    const entityA = getEntityById(layerA.owner);
    const entityB = getEntityById(layerB.owner);
    const pairEntities = [entityA, entityB].filter(Boolean);
    const strength = grade === "full" ? 1 : grade === "weak" ? 0.6 : 0;
    if (strength === 0) return;

    pairEntities.forEach(function (entity) {
      if (entity.species === "J") {
        entity.mimicSpecies = entity.species === speciesA ? speciesB : speciesA;
      }
      if (pairKey === "AB" && entity.species === "A") entity.growthBoost = Math.max(entity.growthBoost, strength >= 1 ? 1 : 0.5);
      if (pairKey === "AB" && entity.species === "B") entity.absorbBonus = Math.max(entity.absorbBonus, strength >= 1 ? 1 : 0.5);
      if (pairKey === "AC" && entity.species === "A") entity.growthBoost = Math.max(entity.growthBoost, strength >= 1 ? 1 : 0.5);
      if (pairKey === "AD" && entity.species === "A") entity.growthBoost = Math.max(entity.growthBoost, strength >= 1 ? 1 : 0.5);
      if ((pairKey === "AD" || pairKey === "CD") && entity.species === "D") entity.burstReady = true;
      if (pairKey === "AE" && entity.species === "A") entity.growthBoost = Math.max(entity.growthBoost, strength >= 1 ? 1 : 0.5);
      if ((pairKey === "BC" || pairKey === "BE") && entity.species === "B") entity.absorbBonus = Math.max(entity.absorbBonus, strength >= 1 ? 1 : 0.5);
      if ((pairKey === "BD" || pairKey === "DE") && entity.species === "D") entity.compressed = true;
      if (pairKey === "BD" && entity.species === "B") entity.crystalBonus = true;
      if (pairKey === "CE" && entity.species === "E") entity.network = true;
      if (["AF", "AG", "AI", "AJ"].includes(pairKey) && entity.species === "A") entity.growthBoost = Math.max(entity.growthBoost, strength >= 1 ? 1 : 0.5);
      if (["BF", "BG", "BH", "BI", "BJ"].includes(pairKey) && entity.species === "B") entity.absorbBonus = Math.max(entity.absorbBonus, strength >= 1 ? 1 : 0.5);
      if (["DF", "DH"].includes(pairKey) && entity.species === "D") entity.compressed = true;
      if (["DG", "DJ"].includes(pairKey) && entity.species === "D") entity.burstReady = true;
      if (["EG", "EH", "EI", "EJ"].includes(pairKey) && entity.species === "E") entity.network = true;
    });

    if (pairKey === "AC") queueEnvironmentDelta(indexOf(Math.floor(point.x), Math.floor(point.y)), { temperature: 0, brightness: 5 * strength, ph: 0 }, "C");
    if (pairKey === "AD") queueEnvironmentDelta(indexOf(Math.floor(point.x), Math.floor(point.y)), { temperature: 2 * strength, brightness: 1 * strength, ph: 0 }, "D");
    if (pairKey === "BE") queueEnvironmentDelta(indexOf(Math.floor(point.x), Math.floor(point.y)), { temperature: 0, brightness: -2 * strength, ph: 0.2 * strength }, "E");
    if (pairKey === "DE") {
      cellA.ash = false;
      cellB.ash = false;
    }
  }

  function resolveContacts() {
    const loggedContacts = new Set();
    const reactionContacts = new Set();

    function evaluate(layerA, cellA, layerB, cellB, point, adjacencyWeight, contactKey) {
      if (!layerA || !layerB || layerA.species === layerB.species) return;
      const pairKey = getPairKey(layerA.species, layerB.species);
      const power = getContactPower(layerA, cellA, layerB, cellB, adjacencyWeight);
      const grade = getContactGrade(power);
      markMix(cellA, layerB.species, pairKey, power, grade);
      markMix(cellB, layerA.species, pairKey, power, grade);

      if (!loggedContacts.has(pairKey)) {
        loggedContacts.add(pairKey);
        const rule = PAIR_RULES[pairKey];
        const environment = {
          temperature: (cellA.environment.temperature + cellB.environment.temperature) / 2,
          brightness: (cellA.environment.brightness + cellB.environment.brightness) / 2,
          ph: (cellA.environment.ph + cellB.environment.ph) / 2
        };
        const gradeLabel = grade === "full" ? "完整" : grade === "weak" ? "弱化" : "痕跡";
        recordEvent(pairKey + " " + (rule ? rule.name : "混合") + "（" + gradeLabel + "，接觸值 " + power.toFixed(2) + "；" + formatEnvironment(environment) + "）", "mixed");
        if (grade === "full") score += 25;
        else if (grade === "weak") score += 12;
        else score += 4;
        addReactionEffect(layerA.species, layerB.species, point);
      }

      const ownerKey = pairKey + ":" + [layerA.owner, layerB.owner].sort().join(":");
      if (!reactionContacts.has(ownerKey)) {
        reactionContacts.add(ownerKey);
        applyPairReaction(layerA.species, layerB.species, layerA, layerB, cellA, cellB, grade, point);
      }
    }

    validIndices.forEach(function (cellIndex) {
      const cell = cells[cellIndex];
      const layers = getCellLayers(cell);
      for (let i = 0; i < layers.length; i += 1) {
        for (let j = i + 1; j < layers.length; j += 1) {
          evaluate(layers[i], cell, layers[j], cell, pointFromIndex(cellIndex), 1, "same:" + cellIndex + ":" + getPairKey(layers[i].species, layers[j].species));
        }
      }
    });

    validIndices.forEach(function (cellIndex) {
      const point = pointFromIndex(cellIndex);
      const cell = cells[cellIndex];
      if (!isOccupied(cell)) return;
      [[1, 0], [0, 1]].forEach(function (direction) {
        const otherX = point.x + direction[0];
        const otherY = point.y + direction[1];
        const otherCell = getCell(otherX, otherY);
        if (!otherCell || !isOccupied(otherCell)) return;
        getCellLayers(cell).forEach(function (layerA) {
          getCellLayers(otherCell).forEach(function (layerB) {
            if (layerA.species === layerB.species) return;
            evaluate(
              layerA,
              cell,
              layerB,
              otherCell,
              { x: point.x + 0.5 + direction[0] * 0.5, y: point.y + 0.5 + direction[1] * 0.5 },
              1,
              "edge:" + cellIndex + ":" + indexOf(otherX, otherY) + ":" + getPairKey(layerA.species, layerB.species)
            );
          });
        });
      });
    });
  }

  function getCellsWithinRadius(centerX, centerY, radius) {
    const positions = [];
    const roundedRadius = Math.ceil(radius);
    for (let dy = -roundedRadius; dy <= roundedRadius; dy += 1) {
      for (let dx = -roundedRadius; dx <= roundedRadius; dx += 1) {
        const distance = Math.hypot(dx, dy);
        if (distance > radius) continue;
        const x = centerX + dx;
        const y = centerY + dy;
        if (isValidCell(x, y)) positions.push({ x: x, y: y, distance: distance });
      }
    }
    return positions;
  }

  function getPlacementSpreadRadius(seedCells, species) {
    const sameSpeciesStrength = seedCells.reduce(function (strength, position) {
      return Math.max(strength, getCellLayerIntensity(getCell(position.x, position.y), species));
    }, 0);
    if (sameSpeciesStrength === 0) return SEED_RADIUS;
    return Math.min(SEED_RADIUS + 3, SEED_RADIUS + Math.floor(sameSpeciesStrength / 2));
  }

  function findEntityForSpecies(positions, species) {
    for (const position of positions) {
      const layer = getCellLayer(getCell(position.x, position.y), species);
      const entity = layer ? getEntityById(layer.owner) : null;
      if (entity) return entity;
    }
    return null;
  }

  function getPlacementPreview(centerX, centerY) {
    const seedCells = getSeedCells(centerX, centerY);
    const spreadRadius = getPlacementSpreadRadius(seedCells, selectedSpecies);
    const placementCells = getCellsWithinRadius(centerX, centerY, spreadRadius);
    const touchingSpecies = new Set();
    seedCells.forEach(function (position) {
      getCellLayers(getCell(position.x, position.y)).forEach(function (layer) {
        if (layer.species !== selectedSpecies) touchingSpecies.add(layer.species);
      });
      getNeighbors(position.x, position.y).forEach(function (neighbor) {
        getCellLayers(getCell(neighbor.x, neighbor.y)).forEach(function (layer) {
          if (layer.species !== selectedSpecies) touchingSpecies.add(layer.species);
        });
      });
    });
    return {
      seedCells: seedCells,
      placementCells: placementCells,
      spreadRadius: spreadRadius,
      valid: seedCells.length === SEED_OFFSETS.length,
      touchingSpecies: touchingSpecies
    };
  }

  function getAdjacentEntities(entity) {
    const adjacent = [];
    const seen = new Set();
    if (!entity) return adjacent;
    entity.cells.forEach(function (cellIndex) {
      const point = pointFromIndex(cellIndex);
      getNeighbors(point.x, point.y).forEach(function (neighbor) {
        getCellLayers(getCell(neighbor.x, neighbor.y)).forEach(function (layer) {
          const neighborEntity = getEntityById(layer.owner);
          if (neighborEntity && neighborEntity.id !== entity.id && !seen.has(neighborEntity.id)) {
            seen.add(neighborEntity.id);
            adjacent.push(neighborEntity);
          }
        });
      });
    });
    return adjacent;
  }

  function moveEntityToward(entity, targetPoint, options) {
    const movementOptions = options || {};
    if (!entity || entity.cells.size === 0 || !targetPoint || (entity.movedThisPulse && !movementOptions.allowRepeat)) return false;
    const species = entity.species;
    const center = getEntityCenter(entity);
    const deltaX = targetPoint.x - center.x;
    const deltaY = targetPoint.y - center.y;
    const primaryDirection = Math.abs(deltaX) >= Math.abs(deltaY)
      ? [Math.sign(deltaX), 0]
      : [0, Math.sign(deltaY)];
    const alternateDirection = primaryDirection[0] !== 0 ? [0, Math.sign(deltaY)] : [Math.sign(deltaX), 0];
    const directions = [primaryDirection, alternateDirection].filter(function (direction) {
      return direction[0] !== 0 || direction[1] !== 0;
    });
    const movingIndices = Array.from(entity.cells).filter(function (cellIndex) {
      const layer = getCellLayer(cells[cellIndex], species);
      return layer && layer.owner === entity.id;
    });
    if (!movingIndices.length) return false;

    let chosenDirection = null;
    for (const direction of directions) {
      const canMove = movingIndices.every(function (cellIndex) {
        const point = pointFromIndex(cellIndex);
        const destinationX = point.x + direction[0];
        const destinationY = point.y + direction[1];
        const destination = getCell(destinationX, destinationY);
        if (!destination || (destination.locked && species !== "E")) return false;
        const foreignLayer = getCellLayer(destination, species);
        return !foreignLayer || foreignLayer.owner === entity.id;
      });
      if (canMove) {
        chosenDirection = direction;
        break;
      }
    }
    if (!chosenDirection) return false;

    const movingLayers = movingIndices.map(function (cellIndex) {
      return { index: cellIndex, intensity: getCellLayerIntensity(cells[cellIndex], species) };
    });
    movingIndices.forEach(function (cellIndex) { removeCellLayer(cellIndex, species); });
    movingLayers.forEach(function (movingLayer) {
      const point = pointFromIndex(movingLayer.index);
      addCellLayer(point.x + chosenDirection[0], point.y + chosenDirection[1], entity, movingLayer.intensity, movementOptions.source || "movement");
    });
    entity.movedThisPulse = true;
    effects.push({
      type: "move",
      from: center,
      to: { x: center.x + chosenDirection[0], y: center.y + chosenDirection[1] },
      color: SPECIES[species].color,
      start: performance.now(),
      duration: 650
    });
    if (movementOptions.recordEvent !== false) {
      recordEvent(movementOptions.message || SPECIES[species].name + "朝偏好環境移動一格。", SPECIES[species].css);
    }
    return true;
  }

  function getEntityAverageAdaptation(entity) {
    if (!entity || entity.cells.size === 0) return 0;
    let total = 0;
    let count = 0;
    entity.cells.forEach(function (cellIndex) {
      const cell = cells[cellIndex];
      const layer = getCellLayer(cell, entity.species);
      if (!cell || !layer) return;
      total += calculateEffectiveAdaptation(entity.species, cell, layer);
      count += 1;
    });
    return count ? total / count : 0;
  }

  function findPreferredEnvironmentTarget(entity) {
    if (!entity || entity.cells.size === 0) return null;
    const center = getEntityCenter(entity);
    const currentAdaptation = getEntityAverageAdaptation(entity);
    const candidates = getCellsWithinRadius(Math.round(center.x), Math.round(center.y), 6).filter(function (position) {
      const cell = getCell(position.x, position.y);
      if (!cell || position.distance < 1.5) return false;
      if (cell.locked && entity.species !== "E") return false;
      return calculateAdaptation(entity.species, cell.environment) >= 0.4;
    }).map(function (position) {
      const cell = getCell(position.x, position.y);
      const adaptation = calculateAdaptation(entity.species, cell.environment);
      return {
        x: position.x,
        y: position.y,
        distance: position.distance,
        adaptation: adaptation,
        score: adaptation - position.distance * 0.012
      };
    }).sort(function (a, b) {
      return b.score - a.score;
    });
    const target = candidates[0];
    if (!target || target.adaptation <= currentAdaptation + 0.04) return null;
    return target;
  }

  function processPreferredMovement() {
    entities.slice().forEach(function (entity) {
      if (!entity.cells.size || entity.movedThisPulse) return;
      const target = findPreferredEnvironmentTarget(entity);
      if (!target) return;
      moveEntityToward(entity, target, {
        message: SPECIES[entity.species].name + "朝偏好環境移動一格。",
        source: "preferred-environment"
      });
    });
  }

  function eatSpreadingBacteria(entity) {
    if (!entity || entity.species === "A" || entity.cells.size === 0) return;
    const center = getEntityCenter(entity);
    const candidates = [];
    validIndices.forEach(function (cellIndex) {
      const cell = cells[cellIndex];
      const layer = getCellLayer(cell, "A");
      if (!layer || cell.locked) return;
      const point = pointFromIndex(cellIndex);
      const distance = Math.hypot(point.x - center.x, point.y - center.y);
      if (distance <= 7) candidates.push({ index: cellIndex, point: point, distance: distance });
    });
    candidates.sort(function (a, b) { return b.distance - a.distance; });
    const target = candidates[0];
    if (!target) return;

    const removed = removeCellLayer(target.index, "A");
    if (!removed) return;
    effects.push({ type: "absorb", from: target.point, to: center, color: SPECIES.A.color, start: performance.now(), duration: 700 });
    score += 10;
    const coreIndex = Array.from(entity.cells)[0];
    if (coreIndex !== undefined && cells[coreIndex]) {
      const layer = getCellLayer(cells[coreIndex], entity.species);
      if (layer) layer.intensity = clamp(layer.intensity + 1, 1, MAX_LAYER_INTENSITY);
      refreshCellAppearance(cells[coreIndex]);
    }
    recordEvent(SPECIES[entity.species].name + "吃掉一格蔓延菌。", SPECIES[entity.species].css);
    moveEntityToward(entity, target.point, {
      message: SPECIES[entity.species].name + "吃掉蔓延菌，朝食物方向移動一格。",
      source: "feeding"
    });
  }

  function absorbEntity(entity, amount) {
    if (!entity || entity.species !== "B") return;
    const coreCell = entity.cells.size ? cells[Array.from(entity.cells)[0]] : null;
    if (!coreCell) return;
    const coreLayer = getCellLayer(coreCell, "B");
    if (coreLayer && calculateEffectiveAdaptation("B", coreCell, coreLayer) < 0.4) {
      entity.absorbBonus = 0;
      return;
    }

    const center = getEntityCenter(entity);
    const candidates = [];
    validIndices.forEach(function (cellIndex) {
      const cell = cells[cellIndex];
      const targetLayer = getCellLayers(cell).find(function (layer) {
        return layer.species !== "B" && layer.species !== "E" && layer.species !== "A";
      });
      if (!targetLayer || cell.locked) return;
      const point = pointFromIndex(cellIndex);
      const distance = Math.hypot(point.x - center.x, point.y - center.y);
      if (distance > 1.5 && distance <= 7) candidates.push({ index: cellIndex, distance: distance, species: targetLayer.species });
    });
    candidates.sort(function (a, b) { return b.distance - a.distance; });

    const total = Math.min(Math.ceil(amount + entity.absorbBonus), candidates.length);
    let absorbedCount = 0;
    let movementTarget = null;
    for (let i = 0; i < total; i += 1) {
      const target = candidates[i];
      const removed = removeCellLayer(target.index, target.species);
      if (!removed) continue;
      const targetPoint = pointFromIndex(target.index);
      if (!movementTarget) movementTarget = targetPoint;
      absorbedCount += 1;
      effects.push({ type: "absorb", from: targetPoint, to: center, color: getSpeciesColor(removed.species), start: performance.now(), duration: 700 });
      score += 8;
    }
    entity.absorbBonus = 0;
    const coreIndex = Array.from(entity.cells)[0];
    if (coreIndex !== undefined && cells[coreIndex]) {
      const layer = getCellLayer(cells[coreIndex], "B");
      if (layer) layer.intensity = clamp(layer.intensity + absorbedCount, 1, MAX_LAYER_INTENSITY);
      refreshCellAppearance(cells[coreIndex]);
    }
    if (movementTarget) {
      moveEntityToward(entity, movementTarget, {
        message: "吸收菌朝吸收方向移動一格，追向外圍菌落。",
        source: "absorption"
      });
    }
  }

  function refreshFrontier(entity) {
    if (!entity || entity.species !== "A") return;
    const frontier = new Set();
    entity.cells.forEach(function (cellIndex) {
      const point = pointFromIndex(cellIndex);
      getNeighbors(point.x, point.y).forEach(function (neighbor) {
        const neighborIndex = indexOf(neighbor.x, neighbor.y);
        if (!isOccupied(cells[neighborIndex])) frontier.add(neighborIndex);
      });
    });
    entity.frontier = frontier;
  }

  function growEntity(entity) {
    if (!entity || entity.species !== "A") return;
    refreshFrontier(entity);
    const growthBoost = entity.growthBoost;
    const growthSteps = growthBoost >= 1 ? 2 : growthBoost > 0 ? 1 : 1;
    const candidates = Array.from(entity.frontier).map(function (cellIndex) {
      const cell = cells[cellIndex];
      const point = pointFromIndex(cellIndex);
      const adaptation = calculateAdaptation("A", cell.environment);
      return { index: cellIndex, point: point, adaptation: adaptation, brightness: cell.environment.brightness };
    }).filter(function (candidate) {
      return candidate.adaptation >= 0.4;
    }).sort(function (a, b) {
      return b.brightness - a.brightness || b.adaptation - a.adaptation;
    });

    candidates.slice(0, growthSteps * 18).forEach(function (candidate) {
      if (!isOccupied(cells[candidate.index])) {
        addCellLayer(candidate.point.x, candidate.point.y, entity, 1, "growth");
        effects.push({ type: "wave", x: candidate.point.x, y: candidate.point.y, color: SPECIES.A.color, start: performance.now(), duration: 620 });
        score += 2;
      }
    });
    entity.growthBoost = 0;
    refreshFrontier(entity);
  }

  function explodeEntity(entity) {
    if (!entity || entity.species !== "D" || entity.cells.size === 0) return;
    const center = getEntityCenter(entity);
    const centerIndex = indexOf(Math.round(center.x), Math.round(center.y));
    const centerCell = cells[centerIndex] || createEmptyCell();
    const centerLayer = getCellLayer(centerCell, "D");
    const adaptation = centerLayer ? calculateEffectiveAdaptation("D", centerCell, centerLayer) : 0;
    const temperature = centerCell.environment.temperature;
    let radius = temperature >= 38 ? 3 : 2;
    if (entity.compressed) radius = Math.max(1, radius - 1);
    if (temperature < 20 || adaptation < 0.4) radius = 1;

    Array.from(entity.cells).forEach(function (cellIndex) {
      removeCellLayer(cellIndex, "D");
      if (cells[cellIndex]) {
        cells[cellIndex].ash = true;
        cells[cellIndex].ashTicks = 2;
      }
    });

    for (let dy = -radius; dy <= radius; dy += 1) {
      for (let dx = -radius; dx <= radius; dx += 1) {
        if (dx * dx + dy * dy > radius * radius) continue;
        const x = Math.round(center.x + dx);
        const y = Math.round(center.y + dy);
        if (!isValidCell(x, y)) continue;
        const target = getCell(x, y);
        if (target.locked && !getCellLayer(target, "D")) continue;
        addCellLayer(x, y, entity, adaptation >= 0.75 ? 2 : 1, "burst");
      }
    }

    entity.burstReady = false;
    entity.compressed = false;
    entity.ageTicks = 0;
    addReactionEffect("D", "D", center, "burst");
    score += adaptation >= 0.75 ? 60 : 30;
    recordEvent(
      adaptation >= 0.75
        ? "爆裂菌在 " + Math.round(temperature) + "°C 完成高溫爆發。"
        : "爆裂菌受到環境壓力，只留下小範圍餘燼。",
      "red"
    );
  }

  function processCatalysts() {
    entities.filter(function (entity) { return entity.species === "C"; }).forEach(function (entity) {
      const sampleIndex = Array.from(entity.cells)[0];
      const sampleCell = sampleIndex === undefined ? null : cells[sampleIndex];
      const sampleLayer = sampleCell ? getCellLayer(sampleCell, "C") : null;
      if (!sampleCell || !sampleLayer || calculateEffectiveAdaptation("C", sampleCell, sampleLayer) < 0.4) return;
      getAdjacentEntities(entity).forEach(function (neighbor) {
        if (neighbor.species === "D") neighbor.burstReady = true;
        if (neighbor.species === "A") neighbor.growthBoost = Math.max(neighbor.growthBoost, 1);
        if (neighbor.species === "B") neighbor.absorbBonus = Math.max(neighbor.absorbBonus, 1);
        if (neighbor.species === "E") neighbor.network = true;
      });
    });
  }

  function processSporeLaunchers() {
    entities.filter(function (entity) { return entity.species === "I"; }).forEach(function (entity) {
      const sampleIndex = Array.from(entity.cells)[0];
      const sampleCell = sampleIndex === undefined ? null : cells[sampleIndex];
      const sampleLayer = sampleCell ? getCellLayer(sampleCell, "I") : null;
      if (!sampleCell || !sampleLayer || calculateEffectiveAdaptation("I", sampleCell, sampleLayer) < 0.4) return;

      const center = getEntityCenter(entity);
      const candidates = getCellsWithinRadius(Math.round(center.x), Math.round(center.y), 5).filter(function (position) {
        const cell = getCell(position.x, position.y);
        return !isOccupied(cell) && calculateAdaptation("I", cell.environment) >= 0.4;
      }).sort(function (a, b) {
        return a.distance - b.distance || a.y - b.y || a.x - b.x;
      });
      const target = candidates[0];
      if (!target) return;
      addCellLayer(target.x, target.y, entity, 1, "spore");
      effects.push({ type: "wave", x: target.x, y: target.y, color: SPECIES.I.color, start: performance.now(), duration: 720 });
      recordEvent("播孢菌把一枚孢子送到附近空格。", "orange");
      score += 4;
    });
  }

  function expireMixes() {
    validIndices.forEach(function (cellIndex) {
      const cell = cells[cellIndex];
      if (cell.mix) {
        cell.mix.ticksLeft -= 1;
        if (cell.mix.ticksLeft <= 0) cell.mix = null;
      }
      if (cell.ash) {
        cell.ashTicks -= 1;
        if (cell.ashTicks <= 0) cell.ash = false;
      }
      if (cell.neutralSpore) {
        cell.neutralSporeTicks -= 1;
        if (cell.neutralSporeTicks <= 0) cell.neutralSpore = false;
      }
      cell.age += TICK_DURATION;
      refreshCellAppearance(cell);
    });
  }

  function cleanupEntities() {
    entities = entities.filter(function (entity) { return entity.cells.size > 0; });
  }

  function processPulse() {
    pulseCount += 1;
    entities.forEach(function (entity) {
      entity.ageTicks += 1;
      entity.movedThisPulse = false;
    });
    updateEnvironments();
    resolveContacts();
    processCatalysts();
    processSporeLaunchers();
    entities.slice().forEach(eatSpreadingBacteria);
    processPreferredMovement();

    entities.slice().filter(function (entity) {
      return entity.species === "D" && (entity.ageTicks >= 1 || entity.burstReady);
    }).forEach(explodeEntity);
    entities.slice().filter(function (entity) { return entity.species === "B"; }).forEach(function (entity) {
      absorbEntity(entity, 1);
    });
    entities.slice().filter(function (entity) { return entity.species === "A"; }).forEach(growEntity);
    expireMixes();
    cleanupEntities();
    resolveContacts();
    triggerPulseRing();
    recordEvent("第 " + pulseCount + " 次培養脈衝完成；環境已更新。", "green");
    renderColorLayer();
    renderPreview();
    updateInspector();
  }

  function triggerPulseRing() {
    pulseRingElement.classList.remove("is-active");
    void pulseRingElement.offsetWidth;
    pulseRingElement.classList.add("is-active");
  }

  function recordEvent(message, type) {
    eventMessages.unshift({ message: message, type: type || "green" });
    eventMessages = eventMessages.slice(0, MAX_EVENTS);
    eventLogElement.innerHTML = eventMessages.map(function (event) {
      return "<li><span class=\"event-dot is-" + event.type + "\"></span><span>" + event.message + "</span></li>";
    }).join("");
  }

  function setStatus(message, tone) {
    statusElement.textContent = message;
    statusElement.className = "petri-status" + (tone ? " is-" + tone : "");
  }

  function updateMetrics() {
    const occupied = validIndices.reduce(function (count, cellIndex) {
      return count + (isOccupied(cells[cellIndex]) ? 1 : 0);
    }, 0);
    const mixed = validIndices.reduce(function (count, cellIndex) {
      const cell = cells[cellIndex];
      return count + (cell && (getCellLayers(cell).length > 1 || cell.mix) ? 1 : 0);
    }, 0);
    const coverageValue = (occupied / validIndices.length) * 100;
    coverageElement.textContent = occupied > 0 && coverageValue < 1 ? "<1%" : Math.round(coverageValue) + "%";
    timeElement.textContent = formatTime(elapsed);
    mixedElement.textContent = String(mixed);
    pulseElement.textContent = formatPulse(nextPulseAt - elapsed);
    scoreElement.textContent = "SCORE " + score;
    if (score > bestScore) {
      bestScore = score;
      saveBestScore();
    }
  }

  function renderBaseLayer() {
    const center = CANVAS_SIZE / 2;
    const radius = CANVAS_SIZE * 0.485;
    baseContext.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    baseContext.fillStyle = "#0b1730";
    baseContext.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    baseContext.save();
    baseContext.beginPath();
    baseContext.arc(center, center, radius, 0, Math.PI * 2);
    baseContext.clip();
    const gradient = baseContext.createRadialGradient(center * 0.78, center * 0.7, 20, center, center, radius);
    gradient.addColorStop(0, "#1d3b57");
    gradient.addColorStop(0.55, "#132c4b");
    gradient.addColorStop(1, "#0c1b35");
    baseContext.fillStyle = gradient;
    baseContext.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    baseContext.globalAlpha = 0.24;
    baseContext.strokeStyle = "#8bc8ff";
    baseContext.lineWidth = 1;
    for (let i = 0; i < 14; i += 1) {
      baseContext.beginPath();
      baseContext.arc(center, center, radius * (0.15 + i * 0.06), 0, Math.PI * 2);
      baseContext.stroke();
    }
    baseContext.restore();
  }

  function drawEnvironmentTint(context, cell, x, y) {
    const temperatureOffset = cell.environment.temperature - BASE_ENVIRONMENT.temperature;
    const brightnessOffset = cell.environment.brightness - BASE_ENVIRONMENT.brightness;
    const phOffset = cell.environment.ph - BASE_ENVIRONMENT.ph;
    const px = x * CELL_PIXEL;
    const py = y * CELL_PIXEL;
    if (Math.abs(temperatureOffset) > 0.4) {
      context.globalAlpha = clamp(Math.abs(temperatureOffset) / 55, 0.015, 0.15);
      context.fillStyle = temperatureOffset > 0 ? "#ff6d4d" : "#62a9ff";
      context.fillRect(px, py, CELL_PIXEL + 0.5, CELL_PIXEL + 0.5);
    }
    if (Math.abs(brightnessOffset) > 1) {
      context.globalAlpha = clamp(Math.abs(brightnessOffset) / 160, 0.01, 0.09);
      context.fillStyle = brightnessOffset > 0 ? "#ffe676" : "#263d6d";
      context.fillRect(px, py, CELL_PIXEL + 0.5, CELL_PIXEL + 0.5);
    }
    if (Math.abs(phOffset) > 0.1) {
      context.globalAlpha = clamp(Math.abs(phOffset) / 24, 0.01, 0.08);
      context.fillStyle = phOffset > 0 ? "#f68b63" : "#8d71ff";
      context.fillRect(px, py, CELL_PIXEL + 0.5, CELL_PIXEL + 0.5);
    }
  }

  function drawCellColor(context, cell, x, y) {
    const px = x * CELL_PIXEL;
    const py = y * CELL_PIXEL;
    drawEnvironmentTint(context, cell, x, y);
    const layers = getCellLayers(cell);
    if (layers.length === 0) {
      if (cell.neutralSpore) {
        context.globalAlpha = 0.75;
        context.fillStyle = "#c9d3e4";
        context.beginPath();
        context.arc(px + CELL_PIXEL / 2, py + CELL_PIXEL / 2, CELL_PIXEL * 0.8, 0, Math.PI * 2);
        context.fill();
      } else if (cell.ash) {
        context.globalAlpha = 0.42;
        context.fillStyle = "#f28c3c";
        context.beginPath();
        context.arc(px + CELL_PIXEL / 2, py + CELL_PIXEL / 2, CELL_PIXEL * 0.7, 0, Math.PI * 2);
        context.fill();
      }
      context.globalAlpha = 1;
      return;
    }

    context.save();
    layers.forEach(function (layer, index) {
      context.globalAlpha = Math.min(0.92, 0.34 + layer.intensity * 0.1 + (index > 0 ? 0.04 : 0));
      context.fillStyle = getSpeciesColor(layer.species);
      context.globalCompositeOperation = index === 0 ? "source-over" : "screen";
      context.fillRect(px, py, CELL_PIXEL + 0.6, CELL_PIXEL + 0.6);
    });

    if (cell.mix && cell.mix.species && !getCellLayer(cell, cell.mix.species)) {
      context.globalCompositeOperation = "screen";
      context.globalAlpha = 0.3;
      context.fillStyle = cell.mix.color;
      context.fillRect(px + CELL_PIXEL * 0.5, py, CELL_PIXEL * 0.5 + 0.6, CELL_PIXEL + 0.6);
    }

    if (layers.length > 1 || cell.mix) {
      const primary = layers[0].species;
      const mixedSpecies = cell.mix ? cell.mix.species : layers[1].species;
      context.globalCompositeOperation = "source-over";
      context.globalAlpha = cell.mix && cell.mix.grade === "trace" ? 0.3 : 0.64;
      context.strokeStyle = cell.mix ? cell.mix.color : (PAIR_RULES[getPairKey(primary, mixedSpecies)] || {}).color || "#ffffff";
      context.lineWidth = 0.75;
      context.beginPath();
      context.moveTo(px + CELL_PIXEL * 0.5, py + 0.35);
      context.lineTo(px + CELL_PIXEL * 0.5, py + CELL_PIXEL - 0.35);
      context.stroke();
    }

    if (cell.locked) {
      context.globalCompositeOperation = "source-over";
      context.globalAlpha = 0.68;
      context.strokeStyle = "#d7c5ff";
      context.lineWidth = 0.7;
      context.strokeRect(px + 0.75, py + 0.75, CELL_PIXEL - 1.5, CELL_PIXEL - 1.5);
    }
    context.restore();
    context.globalAlpha = 1;
  }

  function renderColorLayer() {
    colorContext.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    colorContext.save();
    colorContext.beginPath();
    colorContext.arc(CANVAS_SIZE / 2, CANVAS_SIZE / 2, CANVAS_SIZE * 0.485, 0, Math.PI * 2);
    colorContext.clip();
    validIndices.forEach(function (cellIndex) {
      const point = pointFromIndex(cellIndex);
      drawCellColor(colorContext, cells[cellIndex], point.x, point.y);
    });
    colorContext.restore();
  }

  function drawEffectCircle(context, effect, now) {
    const progress = clamp((now - effect.start) / effect.duration, 0, 1);
    const x = effect.x * CELL_PIXEL + CELL_PIXEL / 2;
    const y = effect.y * CELL_PIXEL + CELL_PIXEL / 2;
    if (effect.type === "placement") {
      const eased = 1 - Math.pow(1 - progress, 3);
      const haloRadius = CELL_PIXEL * (1.6 + eased * 4.9);
      const halo = context.createRadialGradient(x, y, 0, x, y, Math.max(haloRadius, 1));
      halo.addColorStop(0, hexToRgba(effect.color, 0.58 * (1 - progress * 0.45)));
      halo.addColorStop(0.25, hexToRgba(effect.color, 0.22 * (1 - progress * 0.4)));
      halo.addColorStop(1, hexToRgba(effect.color, 0));
      context.save();
      context.fillStyle = halo;
      context.beginPath();
      context.arc(x, y, haloRadius, 0, Math.PI * 2);
      context.fill();
      context.globalAlpha = 0.85 * (1 - progress * 0.5);
      context.fillStyle = effect.color;
      context.shadowColor = effect.color;
      context.shadowBlur = 15;
      context.beginPath();
      context.arc(x, y, CELL_PIXEL * (0.55 + eased * 1.1), 0, Math.PI * 2);
      context.fill();
      context.restore();
    } else if (effect.type === "wave" || effect.type === "burst" || effect.type === "mix") {
      context.globalAlpha = (1 - progress) * (effect.type === "mix" ? 0.6 : 0.85);
      context.strokeStyle = effect.color;
      context.lineWidth = effect.type === "burst" ? 5 : 2;
      context.beginPath();
      context.arc(x, y, effect.type === "burst" ? progress * 150 : progress * 75, 0, Math.PI * 2);
      context.stroke();
    } else if (effect.type === "move") {
      const fromX = effect.from.x * CELL_PIXEL + CELL_PIXEL / 2;
      const fromY = effect.from.y * CELL_PIXEL + CELL_PIXEL / 2;
      const toX = effect.to.x * CELL_PIXEL + CELL_PIXEL / 2;
      const toY = effect.to.y * CELL_PIXEL + CELL_PIXEL / 2;
      context.globalAlpha = 0.75 * (1 - progress);
      context.strokeStyle = effect.color;
      context.lineWidth = 2.4;
      context.beginPath();
      context.moveTo(fromX, fromY);
      context.lineTo(toX, toY);
      context.stroke();
      context.fillStyle = effect.color;
      context.beginPath();
      context.arc(toX, toY, 4 + progress * 2, 0, Math.PI * 2);
      context.fill();
    } else if (effect.type === "absorb") {
      const fromX = effect.from.x * CELL_PIXEL + CELL_PIXEL / 2;
      const fromY = effect.from.y * CELL_PIXEL + CELL_PIXEL / 2;
      const toX = effect.to.x * CELL_PIXEL;
      const toY = effect.to.y * CELL_PIXEL;
      const currentX = fromX + (toX - fromX) * progress;
      const currentY = fromY + (toY - fromY) * progress;
      context.globalAlpha = 1 - progress;
      context.fillStyle = effect.color;
      context.beginPath();
      context.arc(currentX, currentY, 4 + (1 - progress) * 4, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = effect.color;
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(fromX, fromY);
      context.lineTo(currentX, currentY);
      context.stroke();
    }
    context.globalAlpha = 1;
  }

  function renderEffects(now) {
    effectsContext.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    effectsContext.save();
    effectsContext.beginPath();
    effectsContext.arc(CANVAS_SIZE / 2, CANVAS_SIZE / 2, CANVAS_SIZE * 0.485, 0, Math.PI * 2);
    effectsContext.clip();
    effects = effects.filter(function (effect) { return now - effect.start <= effect.duration; });
    effects.forEach(function (effect) { drawEffectCircle(effectsContext, effect, now); });

    entities.forEach(function (entity) {
      if (entity.species !== "C") return;
      const entityCenter = getEntityCenter(entity);
      getAdjacentEntities(entity).forEach(function (neighbor) {
        const neighborCenter = getEntityCenter(neighbor);
        effectsContext.globalAlpha = 0.27;
        effectsContext.strokeStyle = SPECIES.C.color;
        effectsContext.lineWidth = 1.4;
        effectsContext.setLineDash([4, 5]);
        effectsContext.beginPath();
        effectsContext.moveTo(entityCenter.x * CELL_PIXEL, entityCenter.y * CELL_PIXEL);
        effectsContext.lineTo(neighborCenter.x * CELL_PIXEL, neighborCenter.y * CELL_PIXEL);
        effectsContext.stroke();
        effectsContext.setLineDash([]);
      });
    });
    effectsContext.restore();
    effectsContext.globalAlpha = 1;
  }

  function renderPreview() {
    previewContext.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    if (!hoverCell) return;
    const preview = getPlacementPreview(hoverCell.x, hoverCell.y);
    const species = SPECIES[selectedSpecies];
    preview.placementCells.forEach(function (position) {
      const cell = getCell(position.x, position.y);
      const sameSpecies = getCellLayer(cell, selectedSpecies);
      previewContext.globalAlpha = sameSpecies ? 0.3 : isOccupied(cell) ? 0.2 : 0.26 + (0.1 * (1 - position.distance / Math.max(1, preview.spreadRadius)));
      previewContext.fillStyle = species.color;
      previewContext.fillRect(position.x * CELL_PIXEL, position.y * CELL_PIXEL, CELL_PIXEL + 0.5, CELL_PIXEL + 0.5);
    });
    previewContext.globalAlpha = preview.valid ? 0.85 : 0.8;
    previewContext.strokeStyle = preview.valid ? species.color : "#ff8b83";
    previewContext.lineWidth = 2;
    previewContext.beginPath();
    previewContext.arc((hoverCell.x + 0.5) * CELL_PIXEL, (hoverCell.y + 0.5) * CELL_PIXEL, CELL_PIXEL * (preview.spreadRadius + 0.7), 0, Math.PI * 2);
    previewContext.stroke();
    previewContext.globalAlpha = 0.7;
    previewContext.strokeStyle = "rgba(225, 240, 255, 0.7)";
    previewContext.lineWidth = 1;
    previewContext.beginPath();
    previewContext.moveTo(hoverCell.x * CELL_PIXEL, (hoverCell.y + 0.5) * CELL_PIXEL);
    previewContext.lineTo((hoverCell.x + 1) * CELL_PIXEL, (hoverCell.y + 0.5) * CELL_PIXEL);
    previewContext.moveTo((hoverCell.x + 0.5) * CELL_PIXEL, hoverCell.y * CELL_PIXEL);
    previewContext.lineTo((hoverCell.x + 0.5) * CELL_PIXEL, (hoverCell.y + 1) * CELL_PIXEL);
    previewContext.stroke();
    previewContext.globalAlpha = 1;
  }

  function updateInspector() {
    const cell = hoverCell ? getCell(hoverCell.x, hoverCell.y) : null;
    const environment = cell ? cell.environment : BASE_ENVIRONMENT;
    temperatureElement.textContent = Math.round(environment.temperature) + "°C";
    brightnessElement.textContent = String(Math.round(environment.brightness));
    phElement.textContent = environment.ph.toFixed(1);
    if (!cell) {
      inspectorTitleElement.textContent = "等待游標";
      colonyElement.textContent = "空白格";
      inspectorNoteElement.textContent = "移動游標查看格子的環境、菌種與進入快照。";
      return;
    }

    inspectorTitleElement.textContent = "格子 " + hoverCell.x + ", " + hoverCell.y;
    if (cell.neutralSpore) {
      colonyElement.textContent = "中性孢子";
      inspectorNoteElement.textContent = "三元失衡後留下的中性孢子，下一個脈衝會消散。";
      return;
    }
    const layers = getCellLayers(cell);
    colonyElement.textContent = layers.length ? layers.map(function (layer) { return layer.species; }).join(" + ") : (cell.ash ? "紅色餘燼" : "空白格");
    if (!layers.length) {
      inspectorNoteElement.textContent = cell.ash ? "爆裂後的餘燼；格子環境仍會逐步回到基準。" : "目前沒有菌種，但此格仍持續保存環境值。";
      return;
    }
    const selectedLayer = getCellLayer(cell, selectedSpecies) || layers[0];
    const snapshot = selectedLayer.environmentSnapshot;
    const adaptation = calculateEffectiveAdaptation(selectedLayer.species, cell, selectedLayer);
    const source = cell.lastEnvironmentSource ? "；最近由 " + cell.lastEnvironmentSource + " 改變" : "";
    inspectorNoteElement.textContent = selectedLayer.species + " 菌進入時 " + formatEnvironment(snapshot) + "；目前適應度 " + adaptation.toFixed(2) + source + "。";
  }

  function getSpeciesSelectionHint(species) {
    const definition = SPECIES[species];
    return definition.name + "：" + definition.hint + " 偏好 " + definition.preferred.temperature[0] + "–" + definition.preferred.temperature[1] + "°C／亮度 " + definition.preferred.brightness[0] + "–" + definition.preferred.brightness[1] + "／pH " + definition.preferred.ph[0] + "–" + definition.preferred.ph[1] + "。";
  }

  function finishPlacement(placement) {
    const entity = placement.entity;
    if (!entity || entity.cells.size === 0) {
      entities = entities.filter(function (item) { return item.id !== (entity && entity.id); });
      return;
    }
    if (entity.species === "A") refreshFrontier(entity);
    if (entity.species === "B") absorbEntity(entity, 2);
    if (entity.species === "D") entity.ageTicks = 0;
    if (entity.species === "E") entity.network = false;
    resolveContacts();
    updateInspector();
    setStatus(SPECIES[placement.species].name + "已從中心向外暈開，格子環境已留下快照。", "success");
  }

  function processPendingPlacements(now) {
    let changed = false;
    pendingPlacements = pendingPlacements.filter(function (placement) {
      while (placement.nextIndex < placement.positions.length && now - placement.startedAt >= placement.positions[placement.nextIndex].delay) {
        const position = placement.positions[placement.nextIndex];
        addCellLayer(position.x, position.y, placement.entity, getSeedIntensity(position.distance), "placement");
        placement.nextIndex += 1;
        changed = true;
      }
      if (placement.nextIndex >= placement.positions.length) {
        finishPlacement(placement);
        return false;
      }
      return true;
    });
    if (changed) {
      renderColorLayer();
      renderPreview();
      updateInspector();
      updateMetrics();
    }
  }

  function getSeedIntensity(distance) {
    if (distance < 0.5) return 3;
    if (distance <= 1.1) return 2;
    return 1;
  }

  function placeSeed(centerX, centerY) {
    if (paused) {
      setStatus("目前已暫停，按下繼續後才能落菌。", "warning");
      return;
    }
    const preview = getPlacementPreview(centerX, centerY);
    if (!preview.valid) {
      setStatus("這片 5×5 種子區超出培養皿，請換一個位置。", "fail");
      return;
    }

    const entity = findEntityForSpecies(preview.placementCells, selectedSpecies) || createEntity(selectedSpecies);
    const startedAt = performance.now();
    const positions = preview.placementCells.slice().sort(function (a, b) {
      return a.distance - b.distance || a.y - b.y || a.x - b.x;
    }).map(function (position) {
      return { x: position.x, y: position.y, distance: position.distance, delay: Math.round(position.distance * PLACEMENT_RING_DELAY) };
    });
    pendingPlacements.push({
      entity: entity,
      species: selectedSpecies,
      positions: positions,
      nextIndex: 0,
      startedAt: startedAt
    });
    effects.push({
      type: "placement",
      x: centerX,
      y: centerY,
      color: SPECIES[selectedSpecies].color,
      start: startedAt,
      duration: Math.max(920, (positions[positions.length - 1] || { delay: 700 }).delay + 220)
    });
    score += 10;
    recordEvent(SPECIES[selectedSpecies].name + "落下，中心先染色並記錄格子環境。", SPECIES[selectedSpecies].css);
    setStatus(SPECIES[selectedSpecies].name + "正在從中心向外暈開。", "success");
    renderColorLayer();
    renderPreview();
    updateMetrics();
  }

  function getCanvasCell(event) {
    const rectangle = previewCanvas.getBoundingClientRect();
    const x = Math.floor(((event.clientX - rectangle.left) / rectangle.width) * GRID_SIZE);
    const y = Math.floor(((event.clientY - rectangle.top) / rectangle.height) * GRID_SIZE);
    return isValidCell(x, y) ? { x: x, y: y } : null;
  }

  function handlePointerMove(event) {
    hoverCell = getCanvasCell(event);
    updateInspector();
    renderPreview();
  }

  function selectSpecies(species) {
    if (!SPECIES[species]) return;
    selectedSpecies = species;
    speciesButtons.forEach(function (button) {
      button.classList.toggle("is-selected", button.dataset.species === species);
    });
    selectionHintElement.textContent = getSpeciesSelectionHint(species);
    updateInspector();
    renderPreview();
  }

  function togglePause() {
    paused = !paused;
    pauseButton.textContent = paused ? "繼續" : "暫停";
    dishElement.classList.toggle("is-paused", paused);
    setStatus(paused ? "培養皿已暫停，可以慢慢規劃下一片種子。" : "培養皿恢復培養。", paused ? "warning" : "ready");
    lastFrameTime = performance.now();
  }

  function resetGame() {
    resetCells();
    entities = [];
    nextEntityId = 1;
    paused = false;
    elapsed = 0;
    nextPulseAt = TICK_DURATION;
    pulseCount = 0;
    score = 0;
    hoverCell = null;
    eventMessages = [];
    effects = [];
    pendingPlacements = [];
    queuedEnvironmentDeltas = new Map();
    pauseButton.textContent = "暫停";
    dishElement.classList.remove("is-paused");
    recordEvent("培養皿已準備；每格都有溫度、亮度與 pH。", "green");
    setStatus("選一種菌，放下一片種子。", "ready");
    renderColorLayer();
    renderPreview();
    updateInspector();
    updateMetrics();
  }

  function gameLoop(timestamp) {
    if (!lastFrameTime) lastFrameTime = timestamp;
    const delta = Math.min(100, timestamp - lastFrameTime);
    lastFrameTime = timestamp;
    if (!paused) {
      processPendingPlacements(timestamp);
      elapsed += delta;
      while (elapsed >= nextPulseAt) {
        processPulse();
        nextPulseAt += TICK_DURATION;
      }
    }
    if (timestamp - lastUiUpdate > 100) {
      updateMetrics();
      updateInspector();
      lastUiUpdate = timestamp;
    }
    renderEffects(timestamp);
    window.requestAnimationFrame(gameLoop);
  }

  baseCanvas.width = CANVAS_SIZE;
  baseCanvas.height = CANVAS_SIZE;
  colorCanvas.width = CANVAS_SIZE;
  colorCanvas.height = CANVAS_SIZE;
  effectsCanvas.width = CANVAS_SIZE;
  effectsCanvas.height = CANVAS_SIZE;
  previewCanvas.width = CANVAS_SIZE;
  previewCanvas.height = CANVAS_SIZE;

  renderBaseLayer();
  speciesButtons.forEach(function (button) {
    button.addEventListener("click", function () { selectSpecies(button.dataset.species); });
  });
  previewCanvas.addEventListener("pointermove", handlePointerMove);
  previewCanvas.addEventListener("pointerleave", function () {
    hoverCell = null;
    updateInspector();
    renderPreview();
  });
  previewCanvas.addEventListener("pointerdown", function (event) {
    event.preventDefault();
    const cell = getCanvasCell(event);
    if (cell) placeSeed(cell.x, cell.y);
  });
  previewCanvas.addEventListener("keydown", function (event) {
    if ((event.key === "Enter" || event.key === " ") && hoverCell) {
      event.preventDefault();
      placeSeed(hoverCell.x, hoverCell.y);
    }
  });
  pauseButton.addEventListener("click", togglePause);
  restartButton.addEventListener("click", resetGame);
  selectionHintElement.textContent = getSpeciesSelectionHint(selectedSpecies);
  resetGame();
  window.requestAnimationFrame(gameLoop);
})();
