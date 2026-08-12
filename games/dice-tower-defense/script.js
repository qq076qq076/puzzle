(function () {
  "use strict";

  const COLS = 10;
  const ROWS = 8;
  const WAVE_REWARD = 35;
  const BUY_COST = 25;
  const PROFILE_STORAGE_KEY = "puzzle.diceTowerDefense.v1";
  const RUN_STORAGE_KEY = "puzzle.diceTowerDefense.run.v1";
  const WAVE_COUNT_MULTIPLIER = 2.5;
  const LATE_WAVE_COUNT_MULTIPLIER = 1.2;
  const ENEMY_GOLD_MULTIPLIER = 1 / 3;
  const TIER_ATTACK_RATE_MULTIPLIERS = [0.5, 0.75, 1, 1, 1, 1];
  const MAX_TIER = 6;
  const BUILD_TIMES = [1.2, 2.4, 4, 5.8, 7.8, 10];
  const INITIAL_CORE_HP = 20;
  const CRIT_CHANCES = [0.10, 0.20, 0.35, 0.48, 0.60, 0.72];
  const FROST_CRIT_CHANCES = [0.02, 0.03, 0.04, 0.06, 0.08, 0.10];
  const POISON_DURATIONS = [4, 5, 6, 7, 8, 9];
  const CRIT_DAMAGE_MULTIPLIER = 1.75;
  const TOWER_DAMAGE_MULTIPLIER = 0.5;
  const ATTACK_PULSE_DURATION = 0.18;
  const MERGE_EFFECT_DURATION = 0.95;
  const BOSS_LANDING_DURATION = 0.9;
  const ENEMY_VISUAL_SCALE = (3 / 4) * 1.5;
  const LEGAL_DROP_BRIGHTNESS = 0.65;
  const SHIELDED_WAVE_START = 28;
  const ENEMY_RESISTANCE_START_WAVE = 12;
  const ENEMY_RESISTANCE_PER_WAVE = 0.02;
  const ENEMY_RESISTANCE_CAP = 0.36;
  const RESISTANCE_STYLES = {
    freeze: { label: "冰凍", icon: "❄", color: "#71d8f4" },
    lightning: { label: "雷電", icon: "⚡", color: "#f6cf63" },
    poison: { label: "毒素", icon: "☣", color: "#9ad86f" },
    physical: { label: "物理", icon: "◆", color: "#c5ced9" }
  };
  const MAGE_DISABLE_RADIUS = 2.6;
  const MAGE_DISABLE_DURATION = 0.7;
  const MAGE_DISABLE_COOLDOWN = 12;
  const HEALER_COOLDOWN = 8.5;
  const HEALER_HEAL_RATIO = 0.05;
  const HEALING_TARGET_COOLDOWN = 6;
  const KNOCKBACK_PROTECTION_DISTANCE = 1.35;
  const KNOCKBACK_PROTECTION_MIN = 0.75;
  const KNOCKBACK_PROTECTION_MAX = 2;
  const BOSS_KNOCKBACK_PROTECTION = 2.5;
  const MAX_ACTIVE_EFFECTS = 420;
  const IMPORTANT_EFFECT_KINDS = new Set(["bossExplosion", "bossLanding", "shieldBreak", "waveTransition", "merge", "goldLoss"]);
  const ROAD_TEXTURE_PATH = "assets/road/pebble-road.png";
  const PATH = [
    [0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1],
    [8, 2], [8, 3], [7, 3], [6, 3], [5, 3], [4, 3], [3, 3], [2, 3], [1, 3],
    [1, 4], [1, 5], [1, 6], [2, 6], [3, 6], [4, 6], [5, 6], [6, 6], [7, 6], [8, 6], [9, 6]
  ];
  const GATE_DISTANCE = PATH.length - 0.25;
  const ROAD_CELL_KEYS = new Set(PATH.map(function (slot) { return slot[0] + "," + slot[1]; }));
  const BUILD_SLOTS = [];
  for (let y = 0; y < ROWS; y += 1) {
    for (let x = 0; x < COLS; x += 1) {
      if (!ROAD_CELL_KEYS.has(x + "," + y)) BUILD_SLOTS.push([x, y]);
    }
  }

  const TOWER_TYPES = {
    cannon: {
      name: "炮擊骰",
      symbol: "✹",
      color: "#ff9b65",
      description: "穩定的單體輸出；爆擊造成 1.75 倍傷害並以目標為中心爆炸。",
      tiers: [
        { damage: 5.6, range: 3, interval: 0.50 },
        { damage: 12, range: 3.5, interval: 0.42 },
        { damage: 29.7, range: 4, interval: 0.34 },
        { damage: 54, range: 4.5, interval: 0.31 },
        { damage: 105, range: 5, interval: 0.28 },
        { damage: 180, range: 5.5, interval: 0.25 }
      ]
    },
    frost: {
      name: "霜凍骰",
      symbol: "❄",
      color: "#71d8f4",
      description: "降低敵人速度；爆擊造成 1.75 倍傷害並將目標凍結。",
      slow: [0.20, 0.28, 0.38, 0.48, 0.58, 0.68],
      tiers: [
        { damage: 2.4, range: 3, interval: 0.42 },
        { damage: 4.8, range: 3.5, interval: 0.40 },
        { damage: 11.7, range: 4, interval: 0.38 },
        { damage: 20.7, range: 4.5, interval: 0.35 },
        { damage: 40, range: 5, interval: 0.32 },
        { damage: 68, range: 5.5, interval: 0.29 }
      ]
    },
    poison: {
      name: "毒蝕骰",
      symbol: "☣",
      color: "#9ad86f",
      description: "施加持續毒傷；爆擊對目標周圍 1 格內所有敵人造成毒傷。",
      tiers: [
        { damage: 1.6, range: 2.5, interval: 0.38 },
        { damage: 3.2, range: 3, interval: 0.36 },
        { damage: 9, range: 3.5, interval: 0.34 },
        { damage: 16.2, range: 4, interval: 0.31 },
        { damage: 32, range: 4.5, interval: 0.28 },
        { damage: 56, range: 5, interval: 0.25 }
      ]
    },
    chain: {
      name: "連鎖骰",
      symbol: "⚡",
      color: "#f6cf63",
      description: "讓傷害跳向敵群；爆擊造成 1.75 倍傷害且連鎖不衰減。",
      chainCount: [2, 3, 5, 7, 9, 12],
      tiers: [
        { damage: 3.2, range: 3, interval: 0.59 },
        { damage: 7.2, range: 3.5, interval: 0.53 },
        { damage: 17.1, range: 4, interval: 0.46 },
        { damage: 30.6, range: 4.5, interval: 0.42 },
        { damage: 58, range: 5, interval: 0.38 },
        { damage: 96, range: 5.5, interval: 0.34 }
      ]
    },
    pierce: {
      name: "穿刺骰",
      symbol: "➹",
      color: "#d4a4ff",
      description: "沿道路順序穿透敵人；爆擊造成 1.75 倍傷害並貫穿所有合法目標。",
      pierceCount: [2, 4, 7, 10, 14, 20],
      tiers: [
        { damage: 4, range: 4, interval: 0.46 },
        { damage: 8.8, range: 4.5, interval: 0.42 },
        { damage: 21.6, range: 5, interval: 0.38 },
        { damage: 37.8, range: 5.5, interval: 0.35 },
        { damage: 72, range: 6, interval: 0.32 },
        { damage: 120, range: 6.5, interval: 0.29 }
      ]
    },
    blade: {
      name: "刃擊骰",
      symbol: "⚔",
      color: "#ff718f",
      description: "近距離物理攻擊；命中讓目標沿道路後退 0.5 格。",
      tiers: [
        { damage: 7.2, range: 2, interval: 0.60 },
        { damage: 15.2, range: 2, interval: 0.56 },
        { damage: 35, range: 2, interval: 0.52 },
        { damage: 63, range: 3, interval: 0.49 },
        { damage: 118, range: 3, interval: 0.46 },
        { damage: 200, range: 3, interval: 0.43 }
      ]
    },
    inspire: {
      name: "鼓舞骰",
      symbol: "✦",
      color: "#ffcf85",
      description: "讓相鄰骰塔加快攻擊；爆擊使相鄰非鼓舞骰塔的下一次攻擊必定爆擊。",
      bonus: [0.08, 0.14, 0.22, 0.30, 0.39, 0.49],
      tiers: [
        { range: 1.5, interval: 0.59 },
        { range: 1.5, interval: 0.52 },
        { range: 1.5, interval: 0.46 },
        { range: 1.5, interval: 0.41 },
        { range: 1.5, interval: 0.37 },
        { range: 1.5, interval: 0.33 }
      ]
    }
  };

  const ENEMY_TYPES = {
    runner: { name: "迅捷蟲", symbol: "S", color: "#ff8d83", hp: 35, speed: 1.8, leakDamage: 1, reward: 2, waveResistanceTypes: ["freeze"] },
    armor: { name: "裝甲蟲", symbol: "A", color: "#b3bdca", hp: 95, speed: 0.8, leakDamage: 1, reward: 3, baseResistances: { physical: 0.35 }, waveResistanceTypes: ["physical"] },
    split: { name: "分裂蟲", symbol: "D", color: "#dc9b76", hp: 70, speed: 1.0, leakDamage: 1, reward: 3, splits: true, waveResistanceTypes: ["lightning"] },
    child: { name: "分裂幼體", symbol: "d", color: "#e4bf7b", hp: 20, speed: 1.35, leakDamage: 1, reward: 1, waveResistanceTypes: ["poison"] },
    ghost: { name: "幽影蟲", symbol: "G", color: "#b898ec", hp: 110, speed: 1.1, leakDamage: 1, reward: 4, canBecomeInvisible: true, waveResistanceTypes: ["physical"] },
    healer: { name: "治療法師", symbol: "H", color: "#78d8ae", hp: 80, speed: 0.7, leakDamage: 2, reward: 5, waveResistanceTypes: ["poison"] },
    boss: { name: "巨甲王", symbol: "B", color: "#ffbf62", hp: 900, speed: 0.45, leakDamage: 5, reward: 30, boss: true, waveResistanceTypes: ["physical"] },
    warder: { name: "結界蟲", symbol: "W", color: "#69e7ef", hp: 145, speed: 0.74, leakDamage: 2, reward: 6, waveResistanceTypes: ["lightning"] },
    burrower: { name: "潛地蟲", symbol: "U", color: "#dfad73", hp: 105, speed: 1.18, leakDamage: 2, reward: 5, waveResistanceTypes: ["freeze"] },
    disruptor: { name: "干擾蟲", symbol: "J", color: "#ed82ff", hp: 175, speed: 0.68, leakDamage: 3, reward: 8, waveResistanceTypes: ["lightning"] },
    overlord: { name: "裂界巨甲王", symbol: "O", color: "#e36eff", hp: 1800, speed: 0.38, leakDamage: 8, reward: 60, boss: true, waveResistanceTypes: ["lightning", "physical"] },
    regenerator: { name: "再生蟲", symbol: "R", color: "#70e58c", hp: 150, speed: 0.78, leakDamage: 2, reward: 6, waveResistanceTypes: ["poison"] },
    berserker: { name: "狂暴蟲", symbol: "K", color: "#ff665f", hp: 120, speed: 1.0, leakDamage: 2, reward: 6, waveResistanceTypes: ["freeze"] },
    thief: { name: "掠金蟲", symbol: "T", color: "#ffd45d", hp: 85, speed: 1.45, leakDamage: 1, reward: 9, goldSteal: 12, waveResistanceTypes: ["freeze"] }
  };

  const ENEMY_SPRITE_PATHS = {
    runner: "assets/enemies/swift-bat.png",
    armor: "assets/enemies/armored-knight.png",
    split: "assets/enemies/splitter-slime.png",
    child: "assets/enemies/child-spider.png",
    ghost: "assets/enemies/shadow-ghost.png",
    healer: "assets/enemies/healer-wizard.png",
    boss: "assets/enemies/boss-demon.png",
    warder: "assets/enemies/armored-knight.png",
    burrower: "assets/enemies/child-spider.png",
    disruptor: "assets/enemies/shadow-ghost.png",
    overlord: "assets/enemies/boss-demon.png",
    regenerator: "assets/enemies/splitter-slime.png",
    berserker: "assets/enemies/armored-knight.png",
    thief: "assets/enemies/child-spider.png"
  };

  const enemySprites = Object.keys(ENEMY_SPRITE_PATHS).reduce(function (sprites, type) {
    const image = new Image();
    image.src = ENEMY_SPRITE_PATHS[type];
    sprites[type] = image;
    return sprites;
  }, {});

  const WAVES = [
    [{ type: "runner", count: 6, interval: 1.50 }],
    [{ type: "runner", count: 8, interval: 1.40 }],
    [{ type: "runner", count: 6, interval: 1.35 }, { type: "armor", count: 2, interval: 1.50 }, { type: "runner", count: 4, interval: 1.25 }],
    [{ type: "armor", count: 4, interval: 1.25 }, { type: "runner", count: 8, interval: 1.10 }],
    [{ type: "runner", count: 10, interval: 0.95 }, { type: "armor", count: 6, interval: 1.10 }, { type: "boss", count: 1, interval: 1.40 }],
    [{ type: "runner", count: 14, interval: 0.95 }, { type: "split", count: 7, interval: 1.15 }],
    [{ type: "armor", count: 7, interval: 1.00 }, { type: "split", count: 5, interval: 1.00 }, { type: "runner", count: 8, interval: 0.90 }],
    [{ type: "ghost", count: 5, interval: 1.05 }, { type: "runner", count: 12, interval: 0.85 }, { type: "armor", count: 6, interval: 0.95 }],
    [{ type: "split", count: 8, interval: 0.90 }, { type: "ghost", count: 7, interval: 0.90 }, { type: "armor", count: 8, interval: 0.90 }],
    [{ type: "runner", count: 12, interval: 0.80 }, { type: "ghost", count: 8, interval: 0.90 }, { type: "boss", count: 1, interval: 1.20 }],
    [{ type: "healer", count: 4, interval: 1.00 }, { type: "armor", count: 9, interval: 0.85 }, { type: "runner", count: 12, interval: 0.75 }],
    [{ type: "healer", count: 5, interval: 0.90 }, { type: "split", count: 9, interval: 0.80 }, { type: "ghost", count: 8, interval: 0.80 }],
    [{ type: "armor", count: 12, interval: 0.75 }, { type: "healer", count: 6, interval: 0.85 }, { type: "runner", count: 14, interval: 0.65 }, { type: "regenerator", count: 4, interval: 0.82 }],
    [{ type: "ghost", count: 12, interval: 0.70 }, { type: "split", count: 11, interval: 0.72 }, { type: "healer", count: 7, interval: 0.80 }],
    [
      { type: "runner", count: 14, interval: 0.65 }, { type: "armor", count: 12, interval: 0.70 },
      { type: "split", count: 10, interval: 0.70 }, { type: "ghost", count: 10, interval: 0.70 },
      { type: "healer", count: 6, interval: 0.80 }, { type: "boss", count: 1, interval: 1.00 }
    ],
    [{ type: "runner", count: 20, interval: 0.58 }, { type: "split", count: 12, interval: 0.66 }, { type: "ghost", count: 8, interval: 0.72 }, { type: "berserker", count: 6, interval: 0.68 }],
    [{ type: "armor", count: 6, interval: 0.68 }, { type: "healer", count: 10, interval: 0.75 }, { type: "ghost", count: 20, interval: 0.65 }],
    [{ type: "split", count: 16, interval: 0.62 }, { type: "runner", count: 20, interval: 0.55 }, { type: "healer", count: 7, interval: 0.72 }, { type: "thief", count: 6, interval: 0.64 }],
    [{ type: "ghost", count: 18, interval: 0.58 }, { type: "armor", count: 14, interval: 0.62 }, { type: "healer", count: 9, interval: 0.70 }],
    [
      { type: "armor", count: 14, interval: 0.60 }, { type: "split", count: 12, interval: 0.62 },
      { type: "ghost", count: 12, interval: 0.60 }, { type: "healer", count: 8, interval: 0.68 },
      { type: "boss", count: 2, interval: 1.00 }
    ],
    [
      { type: "runner", count: 24, interval: 0.48 }, { type: "armor", count: 16, interval: 0.55 },
      { type: "split", count: 14, interval: 0.56 }, { type: "ghost", count: 12, interval: 0.54 },
      { type: "healer", count: 8, interval: 0.65 }, { type: "regenerator", count: 6, interval: 0.62 }
    ],
    [
      { type: "armor", count: 18, interval: 0.52 }, { type: "split", count: 16, interval: 0.54 },
      { type: "ghost", count: 16, interval: 0.52 }, { type: "healer", count: 10, interval: 0.60 },
      { type: "boss", count: 2, interval: 0.90 }
    ],
    [
      { type: "runner", count: 20, interval: 0.46 }, { type: "armor", count: 16, interval: 0.52 },
      { type: "split", count: 14, interval: 0.52 }, { type: "ghost", count: 14, interval: 0.50 },
      { type: "healer", count: 10, interval: 0.58 }, { type: "berserker", count: 6, interval: 0.58 }, { type: "boss", count: 2, interval: 0.85 }
    ],
    [
      { type: "armor", count: 20, interval: 0.46 }, { type: "split", count: 18, interval: 0.48 },
      { type: "ghost", count: 18, interval: 0.46 }, { type: "healer", count: 12, interval: 0.54 }, { type: "thief", count: 6, interval: 0.50 },
      { type: "boss", count: 3, interval: 0.80 }
    ],
    [{ type: "boss", count: 8, interval: 1.50 }],
    [
      { type: "warder", count: 8, interval: 0.52 }, { type: "armor", count: 14, interval: 0.48 },
      { type: "ghost", count: 12, interval: 0.46 }, { type: "healer", count: 6, interval: 0.56 }, { type: "regenerator", count: 8, interval: 0.54 }
    ],
    [
      { type: "burrower", count: 12, interval: 0.48 }, { type: "runner", count: 18, interval: 0.40 },
      { type: "split", count: 12, interval: 0.46 }, { type: "warder", count: 8, interval: 0.50 }, { type: "berserker", count: 8, interval: 0.48 }
    ],
    [
      { type: "disruptor", count: 8, interval: 0.54 }, { type: "armor", count: 16, interval: 0.44 },
      { type: "healer", count: 10, interval: 0.50 }, { type: "thief", count: 8, interval: 0.48 }, { type: "boss", count: 2, interval: 0.82 }
    ],
    [
      { type: "warder", count: 10, interval: 0.46 }, { type: "burrower", count: 14, interval: 0.42 },
      { type: "disruptor", count: 10, interval: 0.48 }, { type: "regenerator", count: 4, interval: 0.46 },
      { type: "berserker", count: 4, interval: 0.44 }, { type: "thief", count: 4, interval: 0.42 }, { type: "boss", count: 3, interval: 0.76 }
    ],
    [{ type: "overlord", count: 3, interval: 1.35 }]
  ];

  const elements = {
    canvas: document.getElementById("game-canvas"),
    boardFrame: document.getElementById("board-frame"),
    toast: document.getElementById("board-toast"),
    wave: document.getElementById("wave-value"),
    phase: document.getElementById("phase-value"),
    score: document.getElementById("score-value"),
    countdown: document.getElementById("countdown-value"),
    gold: document.getElementById("gold-value"),
    start: document.getElementById("start-button"),
    pause: document.getElementById("pause-button"),
    resume: document.getElementById("resume-button"),
    restart: document.getElementById("restart-button"),
    resultRestart: document.getElementById("result-restart"),
    resultClose: document.getElementById("result-close"),
    buy: document.getElementById("buy-button"),
    tray: document.getElementById("dice-tray"),
    trayHint: document.getElementById("tray-hint"),
    dragPreview: document.getElementById("drag-preview"),
    inspector: document.getElementById("inspector"),
    pauseCover: document.getElementById("pause-cover"),
    startupCover: document.getElementById("startup-cover"),
    startupCopy: document.getElementById("startup-copy"),
    continueGame: document.getElementById("continue-button"),
    newGame: document.getElementById("new-game-button"),
    tutorialCover: document.getElementById("tutorial-cover"),
    tutorialButton: document.getElementById("tutorial-button"),
    resultCover: document.getElementById("result-cover"),
    resultKicker: document.getElementById("result-kicker"),
    resultTitle: document.getElementById("result-title"),
    resultCopy: document.getElementById("result-copy"),
    resultWave: document.getElementById("result-wave"),
    resultScore: document.getElementById("result-score"),
    resultCore: document.getElementById("result-core")
  };

  const ctx = elements.canvas.getContext("2d");
  const roadTexture = new Image();
  let roadTextureTile = null;
  let state;
  let animationFrame = null;
  let lastFrameTime = null;
  let nextId = 1;
  let canvasMetrics = { width: 0, height: 0, dpr: 1, cell: 0, offsetX: 0, offsetY: 0 };
  let pointerStart = null;
  let canvasDragState = null;
  let trayDragState = null;
  let uiDirty = true;
  let profile = loadProfile();
  let startupCheckpoint = null;
  let tutorialVisible = false;

  roadTexture.addEventListener("load", function () {
    const tile = document.createElement("canvas");
    const tileContext = tile.getContext("2d");
    tile.width = 32;
    tile.height = 32;
    tileContext.imageSmoothingEnabled = false;
    tileContext.drawImage(roadTexture, 32, 32, 16, 16, 0, 0, tile.width, tile.height);
    roadTextureTile = tile;
  });
  roadTexture.src = ROAD_TEXTURE_PATH;

  function loadProfile() {
    const fallback = {
      version: 1,
      bestScore: 0,
      bestWave: 0,
      settings: { sound: true, reducedEffects: false, vibration: true, tutorialCompleted: false, hints: true }
    };

    try {
      const stored = window.localStorage.getItem(PROFILE_STORAGE_KEY);
      if (!stored) return fallback;
      const parsed = JSON.parse(stored);
      if (!parsed || parsed.version !== 1) return fallback;
      return {
        ...fallback,
        ...parsed,
        settings: { ...fallback.settings, ...(parsed.settings || {}) }
      };
    } catch (error) {
      return fallback;
    }
  }

  function saveProfile() {
    try {
      window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
    } catch (error) {
      // The game remains playable when browser storage is unavailable.
    }
  }

  function clearRunCheckpoint() {
    try {
      window.localStorage.removeItem(RUN_STORAGE_KEY);
    } catch (error) {
      // The game remains playable when browser storage is unavailable.
    }
  }

  function isFiniteNumber(value) {
    return typeof value === "number" && Number.isFinite(value);
  }

  function isValidSavedDie(die) {
    return Boolean(die && typeof die.id === "string" && TOWER_TYPES[die.type] &&
      Number.isInteger(die.tier) && die.tier >= 1 && die.tier <= MAX_TIER &&
      isFiniteNumber(die.totalInvested) && die.totalInvested >= 0);
  }

  function loadRunCheckpoint() {
    try {
      const stored = window.localStorage.getItem(RUN_STORAGE_KEY);
      if (!stored) return null;
      const parsed = JSON.parse(stored);
      const expectedCoreMaxHp = parsed && Number.isInteger(parsed.clearedWaves)
        ? INITIAL_CORE_HP + parsed.clearedWaves
        : INITIAL_CORE_HP;
      const validHeader = parsed && parsed.version === 1 &&
        Number.isInteger(parsed.wave) && parsed.wave >= 1 && parsed.wave <= WAVES.length &&
        Number.isInteger(parsed.clearedWaves) && parsed.clearedWaves === parsed.wave - 1 &&
        Number.isInteger(parsed.gold) && parsed.gold >= 0 &&
        Number.isInteger(parsed.coreHp) && parsed.coreHp > 0 && parsed.coreHp <= expectedCoreMaxHp &&
        (parsed.coreMaxHp === undefined || parsed.coreMaxHp === expectedCoreMaxHp) &&
        Array.isArray(parsed.towers) && Array.isArray(parsed.diceBag);
      if (!validHeader || !parsed.towers.every(isValidSavedDie) || !parsed.diceBag.every(isValidSavedDie)) throw new Error("Invalid checkpoint");
      parsed.coreMaxHp = expectedCoreMaxHp;

      const occupied = new Set();
      for (const tower of parsed.towers) {
        const key = tower.x + "," + tower.y;
        if (!Number.isInteger(tower.x) || !Number.isInteger(tower.y) || getSlotIndex(tower.x, tower.y) < 0 || occupied.has(key)) throw new Error("Invalid tower position");
        occupied.add(key);
      }
      return parsed;
    } catch (error) {
      clearRunCheckpoint();
      return null;
    }
  }

  function saveRunCheckpoint() {
    if (state.wave >= WAVES.length || state.coreHp <= 0) return;
    const checkpoint = {
      version: 1,
      savedAt: new Date().toISOString(),
      wave: state.wave + 1,
      clearedWaves: state.wave,
      gold: roundGold(state.gold + WAVE_REWARD),
      coreHp: state.coreHp,
      coreMaxHp: state.coreMaxHp,
      score: state.score,
      killGold: state.killGold,
      enemyGoldRemainder: state.enemyGoldRemainder,
      bossKills: state.bossKills,
      towers: state.towers.map(function (tower) {
        return { id: tower.id, type: tower.type, x: tower.x, y: tower.y, tier: tower.tier, totalInvested: getInvestedValue(tower) };
      }),
      diceBag: state.diceBag.map(function (die) {
        return { id: die.id, type: die.type, tier: die.tier, totalInvested: getInvestedValue(die) };
      })
    };
    try {
      window.localStorage.setItem(RUN_STORAGE_KEY, JSON.stringify(checkpoint));
    } catch (error) {
      // The game remains playable when browser storage is unavailable.
    }
  }

  function savePreparationCheckpoint() {
    if (!state || state.coreHp <= 0 || state.phase !== "preparation") return;
    const checkpoint = {
      version: 1,
      savedAt: new Date().toISOString(),
      wave: state.wave,
      clearedWaves: state.clearedWaves,
      gold: roundGold(state.gold),
      coreHp: state.coreHp,
      coreMaxHp: state.coreMaxHp,
      score: state.score,
      killGold: state.killGold,
      enemyGoldRemainder: state.enemyGoldRemainder,
      bossKills: state.bossKills,
      towers: state.towers.map(function (tower) {
        return { id: tower.id, type: tower.type, x: tower.x, y: tower.y, tier: tower.tier, totalInvested: getInvestedValue(tower) };
      }),
      diceBag: state.diceBag.map(function (die) {
        return { id: die.id, type: die.type, tier: die.tier, totalInvested: getInvestedValue(die) };
      })
    };
    try {
      window.localStorage.setItem(RUN_STORAGE_KEY, JSON.stringify(checkpoint));
    } catch (error) {
      // The game remains playable when browser storage is unavailable.
    }
  }

  function createId(prefix) {
    const id = prefix + "-" + nextId;
    nextId += 1;
    return id;
  }

  function getPreparationSeconds(wave) {
    if (wave >= 30) return 60;
    if (wave >= 26) return 55;
    if (wave >= 23) return 50;
    if (wave >= 20) return 45;
    if (wave >= 15) return 40;
    if (wave >= 10) return 35;
    if (wave >= 5) return 30;
    return 25;
  }

  function getLegacyEnemyHpMultiplier(wave) {
    const standardGrowth = (wave - 1) * 0.12;
    const midGameGrowth = Math.max(0, wave - 4) * 0.03;
    const lateGameGrowth = Math.max(0, wave - 9) * 0.04;
    const baseMultiplier = 1 + standardGrowth + midGameGrowth + lateGameGrowth;
    const bracketMultiplier = wave >= 21 ? 2 : wave >= 16 ? 1.75 : wave >= 11 ? 1.5 : wave >= 6 ? 1.25 : 1;
    return baseMultiplier * bracketMultiplier;
  }

  function getProgressiveDifficultyMultiplier(wave) {
    if (wave <= 10) return 1;
    if (wave <= 20) return 1 + (wave - 10) * 0.2;
    return Math.min(5, 3 + (wave - 20) * 0.2);
  }

  function getDifficultyHpMultiplier(wave) {
    if (wave <= 7) return 1;
    if (wave <= 15) return 1.85;
    if (wave <= 25) return 2.55;
    return 4.1;
  }

  function getDifficultySpeedMultiplier(wave) {
    if (wave <= 7) return 1;
    if (wave <= 15) return 1.08;
    if (wave <= 25) return 1.1;
    return 1.12;
  }

  function getDifficultyResistanceBonus(wave) {
    if (wave <= 12) return 0;
    if (wave <= 15) return 0.03;
    if (wave <= 25) return 0.06;
    return 0.1;
  }

  function getEnemyHpMultiplier(wave) {
    if (wave === 5) return getLegacyEnemyHpMultiplier(wave) * 0.59;
    const baseMultiplier = wave <= 10
      ? getLegacyEnemyHpMultiplier(wave)
      : getLegacyEnemyHpMultiplier(10) * getProgressiveDifficultyMultiplier(wave);
    return baseMultiplier * getDifficultyHpMultiplier(wave);
  }

  function getWaveResistanceStrength(wave) {
    if (wave <= ENEMY_RESISTANCE_START_WAVE) return 0;
    const baseResistance = Math.min(ENEMY_RESISTANCE_CAP, (wave - ENEMY_RESISTANCE_START_WAVE) * ENEMY_RESISTANCE_PER_WAVE);
    return combineResistances(baseResistance, getDifficultyResistanceBonus(wave));
  }

  function combineResistances(first, second) {
    return 1 - (1 - first) * (1 - second);
  }

  function getEnemyResistances(definition, wave) {
    const resistances = Object.assign({}, definition.baseResistances || {});
    const waveStrength = getWaveResistanceStrength(wave);
    if (waveStrength <= 0) return resistances;
    (definition.waveResistanceTypes || []).forEach(function (type) {
      resistances[type] = combineResistances(resistances[type] || 0, waveStrength);
    });
    return resistances;
  }

  function getEnemyResistance(enemy, type) {
    if (!enemy || !type || !enemy.resistances) return 0;
    return enemy.resistances[type] || 0;
  }

  function getWaveCountMultiplier(wave) {
    return WAVE_COUNT_MULTIPLIER * (wave > 10 ? LATE_WAVE_COUNT_MULTIPLIER : 1);
  }

  function createTower(type, x, y, tier, totalInvested, buildDuration) {
    const constructionTime = Math.max(0, buildDuration || 0);
    return {
      id: createId("tower"),
      type,
      x,
      y,
      tier: tier || 1,
      cooldown: 0.2,
      totalInvested: isFiniteNumber(totalInvested) ? totalInvested : 0,
      forcedCrit: false,
      buildDuration: constructionTime,
      buildRemaining: constructionTime,
      attackPulseRemaining: 0,
      attackDisabledRemaining: 0
    };
  }

  function getBuildTime(tier) {
    return BUILD_TIMES[Math.max(0, Math.min(BUILD_TIMES.length - 1, tier - 1))];
  }

  function isTowerConstructing(tower) {
    return Boolean(tower && tower.buildRemaining > 0);
  }

  function beginTowerConstruction(tower) {
    const duration = state.phase === "combat" ? getBuildTime(tower.tier) : 0;
    tower.buildDuration = duration;
    tower.buildRemaining = duration;
    tower.cooldown = duration > 0 ? duration : 0;
    tower.attackPulseRemaining = 0;
    return duration;
  }

  function finishTowerConstruction(tower, showEffect) {
    tower.buildRemaining = 0;
    tower.buildDuration = 0;
    tower.cooldown = 0;
    if (showEffect) {
      addEffect({ kind: "buildComplete", x: tower.x, y: tower.y, color: TOWER_TYPES[tower.type].color, ttl: 0.65 });
    }
    if (state.selectedTowerId === tower.id) markUiDirty();
  }

  function finishAllConstruction() {
    state.towers.forEach(function (tower) {
      if (isTowerConstructing(tower)) finishTowerConstruction(tower, true);
    });
  }

  function createInitialState() {
    return {
      phase: "preparation",
      paused: false,
      wave: 1,
      clearedWaves: 0,
      prepRemaining: getPreparationSeconds(1),
      resultRemaining: 0,
      gold: 120,
      coreHp: INITIAL_CORE_HP,
      coreMaxHp: INITIAL_CORE_HP,
      score: 0,
      killGold: 0,
      enemyGoldRemainder: 0,
      bossKills: 0,
      towers: [
        createTower("cannon", 1, 0, 1, BUY_COST),
        createTower("cannon", 3, 0, 1, BUY_COST),
        createTower("frost", 5, 0, 1, BUY_COST)
      ],
      diceBag: [],
      enemies: [],
      effects: [],
      enemyOrder: 0,
      waveStats: { kills: 0, leaks: 0 },
      selectedTowerId: null,
      selectedDieId: null,
      toastRemaining: 0,
      toastText: ""
    };
  }

  function createStateFromCheckpoint(checkpoint) {
    const restored = createInitialState();
    restored.wave = checkpoint.wave;
    restored.clearedWaves = checkpoint.clearedWaves;
    restored.prepRemaining = getPreparationSeconds(checkpoint.wave);
    restored.gold = checkpoint.gold;
    restored.coreHp = checkpoint.coreHp;
    restored.coreMaxHp = checkpoint.coreMaxHp || INITIAL_CORE_HP + checkpoint.clearedWaves;
    restored.score = isFiniteNumber(checkpoint.score) ? checkpoint.score : 0;
    restored.killGold = isFiniteNumber(checkpoint.killGold) ? checkpoint.killGold : 0;
    restored.enemyGoldRemainder = isFiniteNumber(checkpoint.enemyGoldRemainder) ? checkpoint.enemyGoldRemainder : 0;
    restored.bossKills = Number.isInteger(checkpoint.bossKills) ? checkpoint.bossKills : 0;
    restored.towers = checkpoint.towers.map(function (tower) {
      return {
        id: tower.id,
        type: tower.type,
        x: tower.x,
        y: tower.y,
        tier: tower.tier,
        cooldown: 0.2,
        totalInvested: getInvestedValue(tower),
        forcedCrit: false,
        buildDuration: 0,
        buildRemaining: 0,
        attackPulseRemaining: 0,
        attackDisabledRemaining: 0
      };
    });
    restored.diceBag = checkpoint.diceBag.map(function (die) {
      return { id: die.id, type: die.type, tier: die.tier, totalInvested: getInvestedValue(die) };
    });
    restored.paused = true;
    syncNextId(restored);
    return restored;
  }

  function syncNextId(restoredState) {
    const ids = restoredState.towers.concat(restoredState.diceBag).map(function (item) {
      const match = /-(\d+)$/.exec(item.id);
      return match ? Number(match[1]) : 0;
    });
    nextId = Math.max(0, ...ids) + 1;
  }

  function markUiDirty() {
    uiDirty = true;
  }

  function resetGame() {
    clearRunCheckpoint();
    nextId = 1;
    state = createInitialState();
    startupCheckpoint = null;
    pointerStart = null;
    canvasDragState = null;
    trayDragState = null;
    hideDragPreview();
    elements.resultCover.hidden = true;
    elements.pauseCover.hidden = true;
    elements.startupCover.hidden = true;
    elements.tutorialCover.hidden = true;
    tutorialVisible = false;
    showToast("準備你的防線。", 2.5);
    savePreparationCheckpoint();
    showTutorialIfNeeded();
    markUiDirty();
  }

  function initializeGame() {
    nextId = 1;
    startupCheckpoint = loadRunCheckpoint();
    if (!startupCheckpoint) {
      state = createInitialState();
      showToast("準備你的防線。", 2.5);
      savePreparationCheckpoint();
      showTutorialIfNeeded();
      return;
    }
    state = createStateFromCheckpoint(startupCheckpoint);
    elements.startupCopy.textContent = "已守住第 " + startupCheckpoint.clearedWaves + " 波，將從第 " + startupCheckpoint.wave + " 波準備階段繼續。";
    elements.startupCover.hidden = false;
  }

  function continueSavedGame() {
    if (!startupCheckpoint) return;
    state.paused = false;
    startupCheckpoint = null;
    elements.startupCover.hidden = true;
    if (showTutorialIfNeeded()) return;
    showToast("已恢復第 " + state.wave + " 波的防線配置。", 2.5);
    markUiDirty();
  }

  function showTutorialIfNeeded() {
    if (profile.settings.tutorialCompleted) return false;
    tutorialVisible = true;
    state.paused = true;
    elements.pauseCover.hidden = true;
    elements.tutorialCover.hidden = false;
    markUiDirty();
    return true;
  }

  function completeTutorial() {
    if (!tutorialVisible) return;
    tutorialVisible = false;
    profile.settings.tutorialCompleted = true;
    saveProfile();
    elements.tutorialCover.hidden = true;
    state.paused = false;
    showToast("拖曳同類同級骰塔即可合成。", 2.8);
    markUiDirty();
  }

  function isPreparation() {
    return state.phase === "preparation" && !state.paused;
  }

  function isMarketOpen() {
    return !state.paused && (state.phase === "preparation" || state.phase === "combat");
  }

  function getWaveEntries(wave) {
    return WAVES[Math.max(0, Math.min(WAVES.length - 1, wave - 1))];
  }

  function beginCombat() {
    if (state.phase !== "preparation" || state.paused) return;
    state.phase = "combat";
    state.waveStats = { kills: 0, leaks: 0 };
    spawnWaveEnemies();
    showToast("第 " + state.wave + " 波開始！", 1.6);
    markUiDirty();
  }

  function beginNextWave() {
    state.wave += 1;
    addGold(WAVE_REWARD);
    state.prepRemaining = getPreparationSeconds(state.wave);
    state.resultRemaining = 0;
    state.phase = "preparation";
    finishAllConstruction();
    state.selectedTowerId = null;
    state.selectedDieId = null;
    showToast("核心 +1，獲得 " + WAVE_REWARD + " 金幣。", 2.5);
    markUiDirty();
  }

  function finishWave() {
    const finalWave = state.wave >= WAVES.length;
    state.clearedWaves = Math.max(state.clearedWaves, state.wave);
    state.coreMaxHp += 1;
    state.coreHp = Math.min(state.coreMaxHp, state.coreHp + 1);
    state.score = calculateScore();
    if (finalWave) clearRunCheckpoint();
    else saveRunCheckpoint();
    state.phase = "waveResult";
    state.towers.forEach(function (tower) { tower.attackDisabledRemaining = 0; });
    state.resultRemaining = finalWave ? 1.5 : 1.15;
    addEffect({ kind: "waveTransition", wave: state.wave, finalWave, color: finalWave ? "#ffd477" : "#71d8f4", ttl: finalWave ? 1.5 : 1.35 });
    showToast(finalWave ? "最終首領已擊破，核心 +1！" : "第 " + state.wave + " 波守住了，核心 +1。", finalWave ? 1.5 : 1.15);
    markUiDirty();
  }

  function finishGame(won) {
    state.phase = won ? "victory" : "defeat";
    state.paused = false;
    state.score = calculateScore();
    profile.bestScore = Math.max(profile.bestScore, state.score);
    profile.bestWave = Math.max(profile.bestWave, state.clearedWaves);
    saveProfile();
    clearRunCheckpoint();
    elements.pauseCover.hidden = true;
    elements.resultCover.hidden = false;
    elements.resultKicker.textContent = won ? "CORE SECURED" : "DEFENSE BROKEN";
    elements.resultTitle.textContent = won ? "守住了！" : "城門失守。";
    elements.resultCopy.textContent = won
      ? "你成功守住 " + WAVES.length + " 波敵人，骰塔之間的配合非常漂亮。"
      : "核心耐久歸零了。調整塔的位置與合成時機，再試一次。";
    elements.resultWave.textContent = String(state.clearedWaves);
    elements.resultScore.textContent = String(state.score);
    elements.resultCore.textContent = state.coreHp + " / " + state.coreMaxHp;
    markUiDirty();
  }

  function closeResultCover() {
    if (state.phase !== "victory" && state.phase !== "defeat") return;
    elements.resultCover.hidden = true;
  }

  function calculateScore() {
    return Math.round(state.killGold * 10 + state.clearedWaves * 100 + state.coreHp * 25 + state.bossKills * 250);
  }

  function updatePreparation(deltaTime) {
    state.prepRemaining -= deltaTime;
    if (state.prepRemaining <= 0) {
      state.prepRemaining = 0;
      beginCombat();
    }
  }

  function updateWaveResult(deltaTime) {
    state.towers.forEach(function (tower) {
      tower.attackPulseRemaining = Math.max(0, tower.attackPulseRemaining - deltaTime);
    });
    state.resultRemaining -= deltaTime;
    if (state.resultRemaining > 0) return;
    if (state.wave >= WAVES.length) finishGame(true);
    else beginNextWave();
  }

  function updateCombat(deltaTime) {
    state.waveElapsed = (state.waveElapsed || 0) + deltaTime;
    updateEnemyStatuses(deltaTime);
    updateTowers(deltaTime);
    updateEnemyMovement(deltaTime);
    cleanupEntities();

    if (state.phase === "combat" && state.enemies.length === 0) {
      finishWave();
    }
  }

  function spawnWaveEnemies() {
    const spawnQueue = [];
    getWaveEntries(state.wave).forEach(function (entry) {
      const count = Math.round(entry.count * getWaveCountMultiplier(state.wave));
      for (let index = 0; index < count; index += 1) {
        spawnQueue.push({ type: entry.type, interval: entry.interval });
      }
    });
    shuffleInPlace(spawnQueue);
    let movementDelay = 0;
    spawnQueue.forEach(function (queuedEnemy, index) {
      spawnEnemy(queuedEnemy.type, undefined, movementDelay, true);
      if (index < spawnQueue.length - 1) movementDelay += queuedEnemy.interval;
    });
  }

  function shuffleInPlace(items) {
    for (let index = items.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      const item = items[index];
      items[index] = items[swapIndex];
      items[swapIndex] = item;
    }
    return items;
  }

  function spawnEnemy(type, startingDistance, movementDelay, showSpawnEffect) {
    const definition = ENEMY_TYPES[type];
    const waveMultiplier = getEnemyHpMultiplier(state.wave);
    const bossMultiplier = definition.boss ? 1.25 : 1;
    const maximumHp = Math.round(definition.hp * waveMultiplier * bossMultiplier);
    const delay = Math.max(0, movementDelay || 0);
    const enemy = {
      id: createId("enemy"),
      order: state.enemyOrder,
      type,
      pathDistance: startingDistance === undefined ? 0 : startingDistance,
      hp: maximumHp,
      maxHp: maximumHp,
      resistances: getEnemyResistances(definition, state.wave),
      speed: Math.min(
        Math.min(definition.speed * (1 + (state.wave - 1) * 0.015), definition.speed * 1.35) * getDifficultySpeedMultiplier(state.wave),
        definition.speed * 1.5
      ),
      movementDelayRemaining: delay,
      spawnEffectPending: showSpawnEffect !== false && delay > 0,
      shield: getEnemyShield(definition, maximumHp),
      slow: 0,
      slowRemaining: 0,
      frozenRemaining: 0,
      poisonRemaining: 0,
      poisonDps: 0,
      poisonTick: 1,
      knockbackCooldown: 0,
      healingCooldown: 0,
      invisibleRemaining: 0,
      ghostTimer: type === "ghost" ? 6 : 0,
      healerTimer: type === "healer" ? HEALER_COOLDOWN : 0,
      mageTimer: type === "healer" ? MAGE_DISABLE_COOLDOWN : 0,
      wardTimer: type === "warder" ? 3.5 + (state.enemyOrder % 4) * 0.45 : 0,
      burrowTimer: type === "burrower" ? 4 + (state.enemyOrder % 5) * 0.35 : 0,
      burrowRemaining: 0,
      disruptTimer: type === "disruptor" ? 4.5 + (state.enemyOrder % 6) * 0.4 : 0,
      overlordTimer: type === "overlord" ? 5.5 + (state.enemyOrder % 3) * 0.55 : 0,
      regenDelayRemaining: type === "regenerator" ? 2.5 : 0,
      regenEffectRemaining: 0,
      berserkTriggered: false,
      bossTimer: definition.boss ? 8 : 0,
      bossLandingRemaining: definition.boss && delay === 0 ? BOSS_LANDING_DURATION : 0,
      dead: false
    };
    state.enemyOrder += 1;
    state.enemies.push(enemy);
    if (showSpawnEffect !== false && delay === 0) playEnemyEntrance(enemy);
  }

  function playEnemyEntrance(enemy) {
    const definition = ENEMY_TYPES[enemy.type];
    const position = getPathPosition(enemy.pathDistance);
    if (definition.boss) {
      enemy.bossLandingRemaining = BOSS_LANDING_DURATION;
      addEffect({ kind: "bossLanding", x: position.x, y: position.y, color: definition.color, ttl: BOSS_LANDING_DURATION });
      return;
    }
    addEffect({ kind: "spawn", x: position.x, y: position.y, color: definition.color, ttl: 0.45 });
  }

  function isEnemyOnField(enemy) {
    return Boolean(enemy && !enemy.dead && enemy.movementDelayRemaining <= 0 && enemy.bossLandingRemaining <= 0);
  }

  function isEnemyTargetable(enemy) {
    return isEnemyOnField(enemy) && enemy.invisibleRemaining <= 0 && enemy.burrowRemaining <= 0;
  }

  function getBossShield() {
    if (state.wave >= 20) return 14;
    if (state.wave >= 15) return 10;
    if (state.wave >= 10) return 6;
    return 3;
  }

  function getEnemyShield(definition, maximumHp) {
    const bossShield = definition.boss ? getBossShield() : 0;
    if (state.wave < SHIELDED_WAVE_START) return bossShield;
    const shieldRatio = Math.min(0.20, 0.12 + (state.wave - SHIELDED_WAVE_START) * 0.04);
    return Math.max(bossShield, Math.round(maximumHp * shieldRatio));
  }

  function updateEnemyStatuses(deltaTime) {
    state.enemies.forEach(function (enemy) {
      if (!isEnemyOnField(enemy)) return;

      if (enemy.poisonRemaining > 0) {
        enemy.poisonRemaining -= deltaTime;
        enemy.poisonTick -= deltaTime;
        if (enemy.poisonTick <= 0) {
          enemy.poisonTick += 1;
          damageEnemy(enemy, enemy.poisonDps, "poison", "poison");
        }
      }
      if (enemy.dead) return;

      enemy.slowRemaining = Math.max(0, enemy.slowRemaining - deltaTime);
      if (enemy.slowRemaining === 0) enemy.slow = 0;
      enemy.frozenRemaining = Math.max(0, enemy.frozenRemaining - deltaTime);
      enemy.knockbackCooldown = Math.max(0, (enemy.knockbackCooldown || 0) - deltaTime);
      enemy.healingCooldown = Math.max(0, (enemy.healingCooldown || 0) - deltaTime);
      enemy.burrowRemaining = Math.max(0, enemy.burrowRemaining - deltaTime);

      if (enemy.type === "ghost") {
        enemy.ghostTimer -= deltaTime;
        if (enemy.ghostTimer <= 0) {
          enemy.invisibleRemaining = enemy.invisibleRemaining > 0 ? 0 : 1;
          enemy.ghostTimer = 6;
        }
        enemy.invisibleRemaining = Math.max(0, enemy.invisibleRemaining - deltaTime);
      }

      if (enemy.type === "healer") {
        enemy.healerTimer -= deltaTime;
        if (enemy.healerTimer <= 0) {
          enemy.healerTimer = HEALER_COOLDOWN;
          healNearbyEnemies(enemy);
        }
        enemy.mageTimer -= deltaTime;
        if (enemy.mageTimer <= 0) {
          enemy.mageTimer = MAGE_DISABLE_COOLDOWN;
          disableNearbyTowers(enemy, MAGE_DISABLE_RADIUS, MAGE_DISABLE_DURATION);
        }
      }

      if (enemy.type === "regenerator") {
        enemy.regenDelayRemaining = Math.max(0, enemy.regenDelayRemaining - deltaTime);
        enemy.regenEffectRemaining = Math.max(0, enemy.regenEffectRemaining - deltaTime);
        if (enemy.regenDelayRemaining === 0 && enemy.hp < enemy.maxHp) {
          enemy.hp = Math.min(enemy.maxHp, enemy.hp + enemy.maxHp * 0.02 * deltaTime);
          if (enemy.regenEffectRemaining === 0) {
            enemy.regenEffectRemaining = 0.6;
            const position = getEnemyPathPosition(enemy);
            addEffect({ kind: "heal", x: position.x, y: position.y, color: ENEMY_TYPES.regenerator.color, ttl: 0.45 });
          }
        }
      }

      if (enemy.type === "berserker" && enemy.hp <= enemy.maxHp * 0.5 && !enemy.berserkTriggered) {
        enemy.berserkTriggered = true;
        const position = getEnemyPathPosition(enemy);
        addEffect({ kind: "bossPulse", x: position.x, y: position.y, color: ENEMY_TYPES.berserker.color, ttl: 0.65 });
      }

      if (enemy.type === "warder") {
        enemy.wardTimer -= deltaTime;
        if (enemy.wardTimer <= 0) {
          enemy.wardTimer = 5.25;
          grantNearbyShields(enemy, 2.2, 0.08, false);
        }
      }

      if (enemy.type === "burrower" && enemy.burrowRemaining <= 0) {
        enemy.burrowTimer -= deltaTime;
        if (enemy.burrowTimer <= 0) {
          enemy.burrowTimer = 5.5;
          enemy.burrowRemaining = 1.25;
          const position = getEnemyPathPosition(enemy);
          addEffect({ kind: "burrow", x: position.x, y: position.y, color: ENEMY_TYPES.burrower.color, ttl: 0.65 });
        }
      }

      if (enemy.type === "disruptor") {
        enemy.disruptTimer -= deltaTime;
        if (enemy.disruptTimer <= 0) {
          enemy.disruptTimer = 6;
          disruptNearbyTowers(enemy, 2.6, 0.45);
        }
      }

      if (enemy.type === "overlord") {
        enemy.overlordTimer -= deltaTime;
        if (enemy.overlordTimer <= 0) {
          enemy.overlordTimer = 7;
          grantNearbyShields(enemy, 3.2, 0.08, true);
          disruptNearbyTowers(enemy, 3.6, 0.35);
        }
      }

      if (enemy.type === "boss") {
        enemy.bossTimer -= deltaTime;
        if (enemy.bossTimer <= 0) {
          enemy.bossTimer = 8;
          if (state.wave >= 15) {
            state.enemies.forEach(function (otherEnemy) {
              if (isEnemyOnField(otherEnemy) && !ENEMY_TYPES[otherEnemy.type].boss) otherEnemy.speedBoostRemaining = 3;
            });
            const position = getEnemyPathPosition(enemy);
            addEffect({ kind: "bossPulse", x: position.x, y: position.y, color: "#ffbf62", ttl: 0.8 });
          }
          if (state.wave >= 10 && state.wave !== 25 && state.wave < WAVES.length && enemy.hp <= enemy.maxHp * 0.5 && !enemy.hasSummoned) {
            enemy.hasSummoned = true;
            for (let index = 0; index < 4; index += 1) spawnEnemy("runner", enemy.pathDistance - 0.1 - index * 0.04);
            showToast("巨甲王召喚了迅捷蟲！", 1.8);
          }
        }
      }

      enemy.speedBoostRemaining = Math.max(0, (enemy.speedBoostRemaining || 0) - deltaTime);
    });
  }

  function healNearbyEnemies(source) {
    const sourcePosition = getEnemyPathPosition(source);
    const radiusSquared = 4;
    state.enemies.forEach(function (enemy) {
      if (!isEnemyOnField(enemy) || enemy === source || enemy.healingCooldown > 0 || enemy.hp >= enemy.maxHp) return;
      const position = getEnemyPathPosition(enemy);
      const deltaX = position.x - sourcePosition.x;
      const deltaY = position.y - sourcePosition.y;
      if (deltaX * deltaX + deltaY * deltaY <= radiusSquared) {
        enemy.hp = Math.min(enemy.maxHp, enemy.hp + enemy.maxHp * HEALER_HEAL_RATIO);
        enemy.healingCooldown = HEALING_TARGET_COOLDOWN;
        addEffect({ kind: "heal", x: position.x, y: position.y, color: "#78d8ae", ttl: 0.55 });
      }
    });
  }

  function grantNearbyShields(source, radius, shieldRatio, includeSource) {
    const sourcePosition = getEnemyPathPosition(source);
    const radiusSquared = radius * radius;
    state.enemies.forEach(function (enemy) {
      if (!isEnemyOnField(enemy) || (!includeSource && enemy === source)) return;
      const position = getEnemyPathPosition(enemy);
      const deltaX = position.x - sourcePosition.x;
      const deltaY = position.y - sourcePosition.y;
      if (deltaX * deltaX + deltaY * deltaY > radiusSquared) return;
      const wardShield = Math.round(enemy.maxHp * shieldRatio);
      if (wardShield <= enemy.shield) return;
      enemy.shield = wardShield;
      addEffect({ kind: "shield", x: position.x, y: position.y, color: source.type === "overlord" ? "#e36eff" : "#69e7ef", ttl: 0.38 });
    });
    addEffect({ kind: "wardPulse", x: sourcePosition.x, y: sourcePosition.y, color: source.type === "overlord" ? "#e36eff" : "#69e7ef", ttl: 0.8 });
  }

  function disruptNearbyTowers(source, radius, delay) {
    const sourcePosition = getEnemyPathPosition(source);
    const radiusSquared = radius * radius;
    state.towers.forEach(function (tower) {
      if (isTowerConstructing(tower)) return;
      const deltaX = tower.x - sourcePosition.x;
      const deltaY = tower.y - sourcePosition.y;
      if (deltaX * deltaX + deltaY * deltaY > radiusSquared) return;
      const cooldownCap = getTowerInterval(tower) * 1.5;
      tower.cooldown = Math.min(cooldownCap, Math.max(0, tower.cooldown) + delay);
    });
    addEffect({ kind: "disruptPulse", x: sourcePosition.x, y: sourcePosition.y, color: source.type === "overlord" ? "#e36eff" : "#ed82ff", ttl: 0.75 });
  }

  function disableNearbyTowers(source, radius, duration) {
    const sourcePosition = getEnemyPathPosition(source);
    const radiusSquared = radius * radius;
    const candidates = state.towers.filter(function (tower) {
      const deltaX = tower.x - sourcePosition.x;
      const deltaY = tower.y - sourcePosition.y;
      return !isTowerConstructing(tower) && deltaX * deltaX + deltaY * deltaY <= radiusSquared;
    });
    if (candidates.length === 0) return;
    const tower = candidates[Math.floor(Math.random() * candidates.length)];
    tower.attackDisabledRemaining = Math.max(tower.attackDisabledRemaining || 0, duration);
    addEffect({ kind: "towerDisable", x: tower.x, y: tower.y, color: "#aa8cff", ttl: duration });
    addEffect({ kind: "magePulse", x: sourcePosition.x, y: sourcePosition.y, color: "#aa8cff", ttl: 0.85 });
  }

  function updateEnemyMovement(deltaTime) {
    state.enemies.forEach(function (enemy) {
      if (enemy.dead) return;
      let movementDelta = deltaTime;
      if (enemy.movementDelayRemaining > 0) {
        movementDelta = Math.max(0, deltaTime - enemy.movementDelayRemaining);
        enemy.movementDelayRemaining = Math.max(0, enemy.movementDelayRemaining - deltaTime);
        if (enemy.movementDelayRemaining === 0 && enemy.spawnEffectPending) {
          enemy.spawnEffectPending = false;
          playEnemyEntrance(enemy);
        }
        if (movementDelta === 0) return;
      }
      if (enemy.bossLandingRemaining > 0) {
        enemy.bossLandingRemaining = Math.max(0, enemy.bossLandingRemaining - movementDelta);
        return;
      }
      if (enemy.frozenRemaining > 0) return;
      enemy.pathDistance += getEnemyMovementSpeed(enemy) * movementDelta;
      if (enemy.pathDistance >= GATE_DISTANCE) leakEnemy(enemy);
    });
  }

  function getEnemyMovementSpeed(enemy) {
    if (!enemy || enemy.frozenRemaining > 0) return 0;
    const slowMultiplier = 1 - (enemy.slowRemaining > 0 ? enemy.slow : 0);
    const boostMultiplier = enemy.speedBoostRemaining > 0 ? 1.2 : 1;
    const burrowMultiplier = enemy.burrowRemaining > 0 ? 1.65 : 1;
    const berserkMultiplier = enemy.type === "berserker" && enemy.berserkTriggered ? 1.7 : 1;
    return enemy.speed * slowMultiplier * boostMultiplier * burrowMultiplier * berserkMultiplier;
  }

  function leakEnemy(enemy) {
    if (enemy.dead) return;
    enemy.dead = true;
    const definition = ENEMY_TYPES[enemy.type];
    state.waveStats.leaks += 1;
    state.coreHp = Math.max(0, state.coreHp - definition.leakDamage);
    const position = getPathPosition(GATE_DISTANCE);
    addEffect({ kind: "leak", x: position.x, y: position.y, color: "#ff7d78", ttl: 0.8 });
    const stolenGold = Math.min(state.gold, definition.goldSteal || 0);
    if (stolenGold > 0) {
      addGold(-stolenGold);
      addEffect({ kind: "goldLoss", x: position.x, y: position.y, amount: stolenGold, color: "#ffcf5b", ttl: 1.1 });
    }
    showToast(stolenGold > 0
      ? "掠金蟲突破！核心受到 " + definition.leakDamage + " 點傷害並損失 " + stolenGold + " 金幣。"
      : "核心受到 " + definition.leakDamage + " 點傷害！", 1.8);
    if (state.coreHp <= 0) finishGame(false);
  }

  function updateTowers(deltaTime) {
    state.towers.forEach(function (tower) {
      tower.attackPulseRemaining = Math.max(0, tower.attackPulseRemaining - deltaTime);
      tower.attackDisabledRemaining = Math.max(0, (tower.attackDisabledRemaining || 0) - deltaTime);
      if (isTowerConstructing(tower)) {
        tower.buildRemaining = Math.max(0, tower.buildRemaining - deltaTime);
        if (tower.buildRemaining === 0) finishTowerConstruction(tower, true);
        else if (state.selectedTowerId === tower.id) markUiDirty();
        return;
      }
      if (tower.attackDisabledRemaining > 0) {
        if (state.selectedTowerId === tower.id) markUiDirty();
        return;
      }
      tower.cooldown -= deltaTime;
      if (tower.cooldown > 0 || state.phase !== "combat") return;

      const type = TOWER_TYPES[tower.type];
      const tierData = type.tiers[tower.tier - 1];
      tower.cooldown = getTowerInterval(tower);

      if (tower.type === "inspire") {
        pulseInspire(tower);
        return;
      }

      const target = findTowerTarget(tower, tierData.range);
      if (!target) return;
      fireTower(tower, target, tierData);
    });
  }

  function getTowerInterval(tower) {
    const tierData = TOWER_TYPES[tower.type].tiers[tower.tier - 1];
    const tierIndex = Math.max(0, Math.min(TIER_ATTACK_RATE_MULTIPLIERS.length - 1, tower.tier - 1));
    let interval = tierData.interval / TIER_ATTACK_RATE_MULTIPLIERS[tierIndex];
    const auraBonus = getStrongestInspireBonus(tower);
    interval /= 1 + auraBonus;
    return interval;
  }

  function getStrongestInspireBonus(tower) {
    return state.towers.reduce(function (best, inspire) {
      if (inspire.type !== "inspire" || inspire.id === tower.id) return best;
      if (isTowerConstructing(inspire)) return best;
      if (!isAdjacentTower(inspire, tower)) return best;
      return Math.max(best, TOWER_TYPES.inspire.bonus[inspire.tier - 1]);
    }, 0);
  }

  function getCritChance(tower) {
    const chances = tower.type === "frost" ? FROST_CRIT_CHANCES : CRIT_CHANCES;
    const tierIndex = Math.max(0, Math.min(chances.length - 1, tower.tier - 1));
    return chances[tierIndex];
  }

  function rollCritical(tower) {
    if (tower.forcedCrit) {
      tower.forcedCrit = false;
      return true;
    }
    return Math.random() < getCritChance(tower);
  }

  function isAdjacentTower(first, second) {
    return Math.max(Math.abs(first.x - second.x), Math.abs(first.y - second.y)) <= 1;
  }

  function triggerAttackPulse(tower) {
    tower.attackPulseRemaining = ATTACK_PULSE_DURATION;
  }

  function pulseInspire(tower) {
    const affectedTowers = state.towers.filter(function (otherTower) {
      return otherTower.id !== tower.id && !isTowerConstructing(otherTower) && isAdjacentTower(tower, otherTower);
    });
    if (affectedTowers.length === 0) return;
    triggerAttackPulse(tower);
    const criticalTargets = affectedTowers.filter(function (otherTower) { return otherTower.type !== "inspire"; });
    const critical = criticalTargets.length > 0 && rollCritical(tower);
    if (critical) {
      criticalTargets.forEach(function (otherTower) {
        otherTower.forcedCrit = true;
        addEffect({ kind: "critReady", x: otherTower.x, y: otherTower.y, color: TOWER_TYPES.inspire.color, ttl: 0.7 });
      });
      addEffect({ kind: "critical", x: tower.x, y: tower.y, color: TOWER_TYPES.inspire.color, ttl: 0.72 });
      showToast("鼓舞爆擊！相鄰骰塔的下一次攻擊必定爆擊。", 1.6);
    }
    affectedTowers.forEach(function (otherTower) {
      addEffect({ kind: "projectile", style: "inspire", x1: tower.x, y1: tower.y, x2: otherTower.x, y2: otherTower.y, color: critical ? "#fff2b5" : TOWER_TYPES.inspire.color, ttl: 0.38 });
    });
    addEffect({ kind: "pulse", x: tower.x, y: tower.y, color: critical ? "#fff2b5" : TOWER_TYPES.inspire.color, ttl: critical ? 0.55 : 0.35 });
    if (critical || state.selectedTowerId === tower.id) markUiDirty();
  }

  function findTowerTarget(tower, range) {
    let target = null;
    for (let index = 0; index < state.enemies.length; index += 1) {
      const enemy = state.enemies[index];
      if (!isEnemyTargetable(enemy)) continue;
      const position = getEnemyPathPosition(enemy);
      if (!isTowerInRange(tower, position.x, position.y, range)) continue;
      if (!target || enemy.pathDistance > target.pathDistance ||
        (enemy.pathDistance === target.pathDistance && enemy.order < target.order)) target = enemy;
    }
    return target;
  }

  function isTowerInRange(tower, x, y, range) {
    const tierData = TOWER_TYPES[tower.type].tiers[tower.tier - 1];
    const actualRange = range === undefined ? tierData.range : range;
    const deltaX = tower.x - x;
    const deltaY = tower.y - y;
    return deltaX * deltaX + deltaY * deltaY <= actualRange * actualRange;
  }

  function addProjectileEffect(tower, target, style, color, duration) {
    const targetPosition = getEnemyPathPosition(target);
    addEffect({
      kind: "projectile",
      style,
      x1: tower.x,
      y1: tower.y,
      x2: targetPosition.x,
      y2: targetPosition.y,
      color,
      ttl: duration
    });
  }

  function fireTower(tower, target, tierData) {
    triggerAttackPulse(tower);
    const critical = rollCritical(tower);
    let hit = false;
    const baseDamage = tierData.damage * TOWER_DAMAGE_MULTIPLIER * (critical ? CRIT_DAMAGE_MULTIPLIER : 1);

    if (tower.type === "cannon") {
      addProjectileEffect(tower, target, "cannon", TOWER_TYPES.cannon.color, 0.34);
      hit = damageEnemy(target, baseDamage, "direct", "physical");
      if (critical && hit) {
        const targetPosition = getEnemyPathPosition(target);
        state.enemies.forEach(function (enemy) {
          if (!isEnemyTargetable(enemy)) return;
          const position = getEnemyPathPosition(enemy);
          const deltaX = position.x - targetPosition.x;
          const deltaY = position.y - targetPosition.y;
          if (deltaX * deltaX + deltaY * deltaY <= 1) {
            damageEnemy(enemy, baseDamage * 0.8, "direct", "physical");
          }
        });
        addEffect({ kind: "burst", x: targetPosition.x, y: targetPosition.y, color: TOWER_TYPES.cannon.color, ttl: 0.45 });
      }
    } else if (tower.type === "frost") {
      addProjectileEffect(tower, target, "frost", TOWER_TYPES.frost.color, 0.28);
      hit = damageEnemy(target, baseDamage, "direct");
      if (hit) applySlow(target, TOWER_TYPES.frost.slow[tower.tier - 1], 2);
      if (critical && hit) {
        const freezeDuration = 1.2 * (1 - getEnemyResistance(target, "freeze"));
        target.frozenRemaining = Math.max(target.frozenRemaining, freezeDuration);
        const targetPosition = getEnemyPathPosition(target);
        addEffect({ kind: "freeze", x: targetPosition.x, y: targetPosition.y, color: TOWER_TYPES.frost.color, ttl: 0.7 });
      }
    } else if (tower.type === "poison") {
      addProjectileEffect(tower, target, "poison", TOWER_TYPES.poison.color, 0.36);
      hit = damageEnemy(target, baseDamage, "direct", "poison");
      if (hit) applyPoison(target, baseDamage, tower.tier);
      if (critical && hit) {
        const targetPosition = getEnemyPathPosition(target);
        const nearby = getNearbyEnemies(targetPosition.x, targetPosition.y, 1, [target]);
        nearby.forEach(function (enemy) {
          damageEnemy(enemy, baseDamage, "direct", "poison");
          applyPoison(enemy, baseDamage, tower.tier);
        });
        addEffect({ kind: "burst", x: targetPosition.x, y: targetPosition.y, color: TOWER_TYPES.poison.color, ttl: 0.45 });
      }
    } else if (tower.type === "chain") {
      const maximum = critical ? state.enemies.length : TOWER_TYPES.chain.chainCount[tower.tier - 1];
      const targetPosition = getEnemyPathPosition(target);
      const targets = getNearbyEnemies(targetPosition.x, targetPosition.y, tierData.range, [target]).slice(0, Math.max(0, maximum - 1));
      const chainTargets = [target].concat(targets);
      chainTargets.forEach(function (enemy, index) {
        const attenuation = critical ? 1 : [1, 0.65, 0.45, 0.32, 0.24][index] || 0.2;
        hit = damageEnemy(enemy, baseDamage * attenuation, "direct", "lightning") || hit;
        if (index > 0) {
          const previousPosition = getEnemyPathPosition(chainTargets[index - 1]);
          const position = getEnemyPathPosition(enemy);
          addEffect({ kind: "lightning", x1: previousPosition.x, y1: previousPosition.y, x2: position.x, y2: position.y, color: TOWER_TYPES.chain.color, ttl: 0.3 });
        }
      });
      addEffect({ kind: "lightning", x1: tower.x, y1: tower.y, x2: targetPosition.x, y2: targetPosition.y, color: TOWER_TYPES.chain.color, ttl: 0.3 });
    } else if (tower.type === "pierce") {
      const maximum = critical ? state.enemies.length : TOWER_TYPES.pierce.pierceCount[tower.tier - 1];
      const targets = state.enemies.filter(function (enemy) {
        if (!isEnemyTargetable(enemy)) return false;
        const position = getEnemyPathPosition(enemy);
        return isTowerInRange(tower, position.x, position.y, tierData.range);
      }).sort(function (first, second) {
        return first.pathDistance - second.pathDistance;
      }).slice(0, maximum);
      targets.forEach(function (enemy) {
        hit = damageEnemy(enemy, baseDamage, "direct", "physical") || hit;
      });
      if (targets.length > 0) addProjectileEffect(tower, targets[targets.length - 1], "pierce", TOWER_TYPES.pierce.color, 0.3);
    } else if (tower.type === "blade") {
      const targetPosition = getEnemyPathPosition(target);
      addEffect({ kind: "bladeSwing", x: tower.x, y: tower.y, targetX: targetPosition.x, targetY: targetPosition.y, range: tierData.range, color: TOWER_TYPES.blade.color, ttl: 0.3 });
      hit = damageEnemy(target, baseDamage, "direct", "physical");
      if (hit) {
        state.enemies.forEach(function (enemy) {
          if (!isEnemyTargetable(enemy)) return;
          const position = getEnemyPathPosition(enemy);
          if (isTowerInRange(tower, position.x, position.y, tierData.range)) applyKnockback(enemy, 0.5);
        });
      }
    }

    if (critical && hit) {
      const targetPosition = getEnemyPathPosition(target);
      addEffect({ kind: "critical", x: targetPosition.x, y: targetPosition.y, color: "#ffd477", ttl: 0.72 });
    }
    if (state.selectedTowerId === tower.id) markUiDirty();
  }

  function getNearbyEnemies(x, y, range, excluded) {
    const rangeSquared = range * range;
    return state.enemies.filter(function (enemy) {
      if (!isEnemyTargetable(enemy) || excluded.indexOf(enemy) !== -1) return false;
      const position = getEnemyPathPosition(enemy);
      const deltaX = position.x - x;
      const deltaY = position.y - y;
      return deltaX * deltaX + deltaY * deltaY <= rangeSquared;
    }).sort(function (first, second) {
      return (GATE_DISTANCE - first.pathDistance) - (GATE_DISTANCE - second.pathDistance) || first.order - second.order;
    });
  }

  function damageEnemy(enemy, amount, source, damageType) {
    if (!isEnemyOnField(enemy) || (source === "direct" && !isEnemyTargetable(enemy))) return false;
    let finalDamage = amount;
    const definition = ENEMY_TYPES[enemy.type];
    if (enemy.type === "regenerator" && amount > 0) enemy.regenDelayRemaining = 2.5;
    const typedResistance = getEnemyResistance(enemy, damageType);
    if (typedResistance > 0) finalDamage *= 1 - typedResistance;
    if (enemy.shield > 0) {
      const shieldBeforeHit = enemy.shield;
      const absorbed = Math.min(enemy.shield, finalDamage);
      enemy.shield -= absorbed;
      finalDamage -= absorbed;
      if (absorbed > 0) {
        const position = getEnemyPathPosition(enemy);
        if (shieldBeforeHit > 0 && enemy.shield <= 0) {
          enemy.shield = 0;
          addEffect({ kind: "shieldBreak", x: position.x, y: position.y, color: "#ffe0a6", ttl: 0.72 });
        } else {
          addEffect({ kind: "shield", x: position.x, y: position.y, color: "#ffe0a6", ttl: 0.28 });
        }
      }
    }
    if (finalDamage > 0) enemy.hp -= finalDamage;
    const hitPosition = getEnemyPathPosition(enemy);
    addEffect({ kind: source === "poison" ? "poisonHit" : "hit", x: hitPosition.x, y: hitPosition.y, color: source === "poison" ? "#9ad86f" : definition.color, ttl: 0.32 });
    if (enemy.hp <= 0) killEnemy(enemy);
    return true;
  }

  function applySlow(enemy, amount, duration) {
    if (!enemy || enemy.dead) return;
    if (enemy.frozenRemaining > 0) return;
    if (amount >= enemy.slow) enemy.slow = amount;
    const adjustedDuration = duration * (1 - getEnemyResistance(enemy, "freeze"));
    enemy.slowRemaining = Math.max(enemy.slowRemaining, adjustedDuration);
  }

  function applyKnockback(enemy, distance) {
    if (!enemy || enemy.dead || enemy.knockbackCooldown > 0) return false;
    const from = getEnemyPathPosition(enemy);
    const previousDistance = enemy.pathDistance;
    enemy.pathDistance = Math.max(0, enemy.pathDistance - distance);
    if (enemy.pathDistance === previousDistance) return false;
    enemy.knockbackCooldown = getKnockbackProtectionDuration(enemy);
    const to = getEnemyPathPosition(enemy);
    addEffect({ kind: "knockback", x1: from.x, y1: from.y, x2: to.x, y2: to.y, color: TOWER_TYPES.blade.color, ttl: 0.42 });
    return true;
  }

  function getKnockbackProtectionDuration(enemy) {
    const definition = ENEMY_TYPES[enemy.type];
    if (definition.canBecomeInvisible) return 0;
    if (definition.boss) return BOSS_KNOCKBACK_PROTECTION;
    const movementSpeed = getEnemyMovementSpeed(enemy);
    if (movementSpeed <= 0) return KNOCKBACK_PROTECTION_MAX;
    return Math.max(
      KNOCKBACK_PROTECTION_MIN,
      Math.min(KNOCKBACK_PROTECTION_MAX, KNOCKBACK_PROTECTION_DISTANCE / movementSpeed)
    );
  }

  function applyPoison(enemy, damage, tier) {
    if (!enemy || enemy.dead) return;
    const dps = damage * 0.35;
    enemy.poisonDps = Math.max(enemy.poisonDps, dps);
    const durationIndex = Math.max(0, Math.min(POISON_DURATIONS.length - 1, tier - 1));
    enemy.poisonRemaining = Math.max(enemy.poisonRemaining, POISON_DURATIONS[durationIndex]);
    enemy.poisonTick = Math.min(enemy.poisonTick, 1);
  }

  function killEnemy(enemy) {
    if (!enemy || enemy.dead) return;
    enemy.dead = true;
    const definition = ENEMY_TYPES[enemy.type];
    const position = getEnemyPathPosition(enemy);
    const reward = getEnemyGoldReward(definition);
    const scoreGain = reward * 10 + (definition.boss ? 250 : 0);
    state.waveStats.kills += 1;
    state.killGold = roundGold(state.killGold + reward);
    state.score += scoreGain;
    addEffect({ kind: "score", x: position.x, y: position.y, amount: scoreGain, color: "#71e3f4", ttl: 1.05 });
    if (reward > 0) {
      addGold(reward);
      addEffect({ kind: "gold", x: position.x, y: position.y, amount: reward, color: "#ffd477", ttl: 1 });
    }
    if (definition.boss) {
      state.bossKills += 1;
      addEffect({ kind: "bossExplosion", x: position.x, y: position.y, color: definition.color, ttl: 1.35 });
      showToast("首領爆炸！威脅已解除。", 1.5);
    } else {
      addEffect({ kind: "death", x: position.x, y: position.y, color: definition.color, ttl: 0.55 });
    }
    if (definition.splits) {
      spawnEnemy("child", enemy.pathDistance - 0.05);
      spawnEnemy("child", enemy.pathDistance - 0.1);
    }
  }

  function cleanupEntities() {
    let writeIndex = 0;
    for (let readIndex = 0; readIndex < state.enemies.length; readIndex += 1) {
      const enemy = state.enemies[readIndex];
      if (enemy.dead) continue;
      state.enemies[writeIndex] = enemy;
      writeIndex += 1;
    }
    state.enemies.length = writeIndex;
  }

  function addEffect(effect) {
    if (profile.settings.reducedEffects && (effect.kind === "beam" || effect.kind === "hit" || effect.kind === "poisonHit")) return;
    if (state.effects.length >= MAX_ACTIVE_EFFECTS) {
      if (!IMPORTANT_EFFECT_KINDS.has(effect.kind)) return;
      const removableIndex = state.effects.findIndex(function (activeEffect) {
        return !IMPORTANT_EFFECT_KINDS.has(activeEffect.kind);
      });
      if (removableIndex >= 0) state.effects.splice(removableIndex, 1);
      else state.effects.shift();
    }
    state.effects.push({ ...effect, maxTtl: effect.ttl });
  }

  function updateEffects(deltaTime) {
    let writeIndex = 0;
    for (let readIndex = 0; readIndex < state.effects.length; readIndex += 1) {
      const effect = state.effects[readIndex];
      effect.ttl -= deltaTime;
      if (effect.ttl <= 0) continue;
      state.effects[writeIndex] = effect;
      writeIndex += 1;
    }
    state.effects.length = writeIndex;
    state.toastRemaining = Math.max(0, state.toastRemaining - deltaTime);
    elements.toast.textContent = state.toastRemaining > 0 ? state.toastText : "";
  }

  function showToast(message, seconds) {
    state.toastText = message;
    state.toastRemaining = seconds;
    elements.toast.textContent = message;
  }

  function getPathPosition(distance) {
    if (distance <= 0) return { x: PATH[0][0], y: PATH[0][1] };
    if (distance >= PATH.length - 1) return { x: PATH[PATH.length - 1][0], y: PATH[PATH.length - 1][1] };
    const index = Math.floor(distance);
    const progress = distance - index;
    const first = PATH[index];
    const second = PATH[index + 1];
    return { x: first[0] + (second[0] - first[0]) * progress, y: first[1] + (second[1] - first[1]) * progress };
  }

  function getEnemyPathPosition(enemy) {
    if (enemy.cachedPathDistance !== enemy.pathDistance || !enemy.cachedPathPosition) {
      enemy.cachedPathDistance = enemy.pathDistance;
      enemy.cachedPathPosition = getPathPosition(enemy.pathDistance);
    }
    return enemy.cachedPathPosition;
  }

  function getEnemyRenderPosition(enemy) {
    if (enemy.movementDelayRemaining > 0) return { x: -1.5, y: PATH[0][1] };
    return getEnemyPathPosition(enemy);
  }

  function getSlotIndex(x, y) {
    return BUILD_SLOTS.findIndex(function (slot) { return slot[0] === x && slot[1] === y; });
  }

  function findTowerAt(x, y) {
    return state.towers.find(function (tower) { return tower.x === x && tower.y === y; }) || null;
  }

  function findTowerById(id) {
    return state.towers.find(function (tower) { return tower.id === id; }) || null;
  }

  function findDieById(id) {
    return state.diceBag.find(function (die) { return die.id === id; }) || null;
  }

  function roundGold(value) {
    return Math.round(value);
  }

  function formatGold(value) {
    return String(roundGold(value));
  }

  function addGold(amount) {
    state.gold = roundGold(state.gold + amount);
  }

  function getEnemyGoldReward(definition) {
    const baseReward = Math.max(1, roundGold(definition.reward * ENEMY_GOLD_MULTIPLIER));
    return baseReward;
  }

  function purchaseDie() {
    if (!isMarketOpen()) return;
    if (state.gold < BUY_COST) {
      showToast("金幣不足，需要 25 金幣。", 1.8);
      return;
    }
    const types = Object.keys(TOWER_TYPES);
    const type = types[Math.floor(Math.random() * types.length)];
    addGold(-BUY_COST);
    const purchasedDie = { id: createId("die"), type, tier: 1, totalInvested: BUY_COST };
    state.diceBag.push(purchasedDie);
    state.selectedDieId = purchasedDie.id;
    state.selectedTowerId = null;
    showToast("已購買骰子，選擇建造格部署。", 1.6);
    markUiDirty();
  }

  function selectDie(id) {
    if (!isMarketOpen()) return;
    state.selectedDieId = state.selectedDieId === id ? null : id;
    state.selectedTowerId = null;
    markUiDirty();
  }

  function placeDieAt(x, y) {
    if (!isMarketOpen()) return;
    const slotIndex = getSlotIndex(x, y);
    if (slotIndex < 0 || findTowerAt(x, y)) {
      showToast("請選擇空的建造格。", 1.5);
      return;
    }
    const die = findDieById(state.selectedDieId);
    if (!die) return;
    const tower = createTower(die.type, x, y, die.tier, die.totalInvested);
    state.towers.push(tower);
    const buildDuration = beginTowerConstruction(tower);
    state.diceBag = state.diceBag.filter(function (item) { return item.id !== die.id; });
    state.selectedDieId = null;
    state.selectedTowerId = tower.id;
    showToast(buildDuration > 0
      ? TOWER_TYPES[die.type].name + " 建造中（" + buildDuration.toFixed(1) + " 秒）。"
      : TOWER_TYPES[die.type].name + " 已部署。", 1.5);
    markUiDirty();
  }

  function selectTower(tower) {
    state.selectedTowerId = tower ? tower.id : null;
    state.selectedDieId = null;
    markUiDirty();
  }

  function moveTowerTo(tower, x, y) {
    if (!isPreparation()) return;
    if (getSlotIndex(x, y) < 0) {
      showToast("只能放在建造格上。", 1.5);
      return;
    }
    if (findTowerAt(x, y)) {
      showToast("這個建造格已經有骰塔。", 1.5);
      return;
    }
    tower.x = x;
    tower.y = y;
    showToast("骰塔位置已調整。", 1.2);
    markUiDirty();
  }

  function swapTowerPositions(first, second) {
    if (!isPreparation() || !first || !second || first.id === second.id) return;
    const firstPosition = { x: first.x, y: first.y };
    first.x = second.x;
    first.y = second.y;
    second.x = firstPosition.x;
    second.y = firstPosition.y;
    showToast("兩座骰塔已交換位置。", 1.2);
    markUiDirty();
  }

  function mergeTowers(target, material) {
    if (!isMarketOpen()) return;
    if (!target || !material || target.id === material.id) return;
    if (isTowerConstructing(target) || isTowerConstructing(material)) {
      showToast("施工中的骰塔不能合成。", 1.8);
      return;
    }
    if (target.type !== material.type || target.tier !== material.tier || target.tier >= MAX_TIER) {
      showToast("需要同種類、同等級且未達 " + MAX_TIER + " 級。", 1.8);
      return;
    }
    addEffect({
      kind: "merge",
      x1: material.x,
      y1: material.y,
      x2: target.x,
      y2: target.y,
      type: material.type,
      tier: material.tier,
      color: TOWER_TYPES[material.type].color,
      ttl: MERGE_EFFECT_DURATION
    });
    const mergedInvestment = getInvestedValue(target) + getInvestedValue(material);
    target.tier += 1;
    target.forcedCrit = false;
    target.totalInvested = mergedInvestment;
    state.towers = state.towers.filter(function (tower) { return tower.id !== material.id; });
    state.selectedTowerId = target.id;
    state.selectedDieId = null;
    const buildDuration = beginTowerConstruction(target);
    showToast(buildDuration > 0
      ? TOWER_TYPES[target.type].name + " 升級施工中（" + buildDuration.toFixed(1) + " 秒）。"
      : TOWER_TYPES[target.type].name + " 升至等級 " + target.tier + "！", 1.7);
    markUiDirty();
  }

  function mergeDieIntoTower(die, target) {
    if (!isMarketOpen() || !die || !target) return false;
    if (isTowerConstructing(target)) {
      showToast("施工中的骰塔不能合成。", 1.8);
      markUiDirty();
      return false;
    }
    if (die.type !== target.type || die.tier !== target.tier || target.tier >= MAX_TIER) {
      showToast("需要同種類、同等級且未達 " + MAX_TIER + " 級。", 1.8);
      markUiDirty();
      return false;
    }
    addEffect({
      kind: "merge",
      x1: COLS + 0.75,
      y1: target.y,
      x2: target.x,
      y2: target.y,
      type: die.type,
      tier: die.tier,
      color: TOWER_TYPES[die.type].color,
      ttl: MERGE_EFFECT_DURATION
    });
    const mergedInvestment = getInvestedValue(target) + getInvestedValue(die);
    target.tier += 1;
    target.forcedCrit = false;
    target.totalInvested = mergedInvestment;
    state.diceBag = state.diceBag.filter(function (item) { return item.id !== die.id; });
    state.selectedDieId = null;
    state.selectedTowerId = target.id;
    const buildDuration = beginTowerConstruction(target);
    showToast(buildDuration > 0
      ? TOWER_TYPES[target.type].name + " 升級施工中（" + buildDuration.toFixed(1) + " 秒）。"
      : TOWER_TYPES[target.type].name + " 升至等級 " + target.tier + "！", 1.7);
    markUiDirty();
    return true;
  }

  function sellSelected() {
    const tower = findTowerById(state.selectedTowerId);
    if (!isMarketOpen() || !tower) return;
    const refund = getSellValue(tower);
    addGold(refund);
    state.towers = state.towers.filter(function (item) { return item.id !== tower.id; });
    state.selectedTowerId = null;
    showToast("出售骰塔，返還 " + refund + " 金幣。", 1.5);
    markUiDirty();
  }

  function getMinimumInvestedValue(tier) {
    const safeTier = Math.max(1, Math.min(MAX_TIER, Number.isInteger(tier) ? tier : 1));
    return BUY_COST * Math.pow(2, safeTier - 1);
  }

  function getInvestedValue(item) {
    const stored = item && isFiniteNumber(item.totalInvested) ? item.totalInvested : 0;
    return Math.max(stored, getMinimumInvestedValue(item ? item.tier : 1));
  }

  function getSellValue(item) {
    return Math.max(1, Math.floor(getInvestedValue(item) * 0.6));
  }

  function handleBoardAction(start, end, dragged) {
    if (!start || !end) return;
    const startTower = findTowerAt(start.x, start.y);
    const endTower = findTowerAt(end.x, end.y);
    const canBuild = isMarketOpen();
    const canMove = isPreparation();
    const isTap = start.x === end.x && start.y === end.y;

    if (!canBuild) {
      const canInspect = state.phase === "combat" || state.phase === "waveResult";
      if (canInspect && isTap && endTower) {
        selectTower(state.selectedTowerId === endTower.id ? null : endTower);
      }
      return;
    }

    if (!isTap) {
      if (!startTower) {
        if (state.selectedDieId) placeDieAt(end.x, end.y);
        return;
      }
      if (endTower && startTower.id !== endTower.id) {
        if (dragged && startTower.type === endTower.type && startTower.tier === endTower.tier) {
          mergeTowers(endTower, startTower);
        } else if (dragged && canMove) {
          selectTower(startTower);
          swapTowerPositions(startTower, endTower);
        } else if (dragged) {
          showToast("戰鬥中只能拖曳合成同種類、同等級骰塔。", 1.8);
        } else {
          selectTower(endTower);
        }
      } else if (!endTower && canMove) {
        selectTower(startTower);
        moveTowerTo(startTower, end.x, end.y);
      } else if (!endTower) {
        showToast("戰鬥中不能移動骰塔。", 1.5);
      }
      return;
    }

    if (state.selectedDieId) {
      if (!endTower) placeDieAt(end.x, end.y);
      else showToast("這個建造格已經有骰塔。", 1.5);
      return;
    }

    if (state.selectedTowerId) {
      const selected = findTowerById(state.selectedTowerId);
      if (endTower && selected && endTower.id === selected.id) selectTower(null);
      else if (endTower) selectTower(endTower);
      else if (!endTower && selected && canMove) moveTowerTo(selected, end.x, end.y);
      return;
    }

    if (endTower) selectTower(endTower);
  }

  function getCellFromPointer(event) {
    const rect = elements.canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left - canvasMetrics.offsetX) / canvasMetrics.cell;
    const y = (event.clientY - rect.top - canvasMetrics.offsetY) / canvasMetrics.cell;
    const cellX = Math.floor(x);
    const cellY = Math.floor(y);
    if (cellX < 0 || cellX >= COLS || cellY < 0 || cellY >= ROWS) return null;
    return { x: cellX, y: cellY };
  }

  function getDieFaceMarkup(typeId, tier) {
    const type = TOWER_TYPES[typeId];
    if (!type) return "";
    const pipCount = Math.max(1, Math.min(MAX_TIER, tier));
    let pips = "";
    for (let index = 0; index < pipCount; index += 1) {
      pips += '<span class="die-pip">' + type.symbol + "</span>";
    }
    return '<span class="die-face is-tier-' + pipCount + '" aria-hidden="true">' + pips + "</span>";
  }

  function showDragPreview(typeId, tier, event) {
    const type = TOWER_TYPES[typeId];
    if (!type) return;
    elements.dragPreview.style.setProperty("--drag-color", type.color);
    elements.dragPreview.innerHTML = getDieFaceMarkup(typeId, tier);
    elements.dragPreview.hidden = false;
    document.body.classList.add("is-dragging");
    moveDragPreview(event);
  }

  function moveDragPreview(event) {
    if (elements.dragPreview.hidden) return;
    const verticalOffset = event.pointerType === "touch" ? -52 : -18;
    elements.dragPreview.style.left = event.clientX + "px";
    elements.dragPreview.style.top = event.clientY + verticalOffset + "px";
  }

  function hideDragPreview() {
    elements.dragPreview.hidden = true;
    elements.dragPreview.innerHTML = "";
    document.body.classList.remove("is-dragging");
  }

  function hasPointerMoved(startX, startY, event) {
    const threshold = event.pointerType === "touch" ? 14 : 10;
    return Math.hypot(event.clientX - startX, event.clientY - startY) > threshold;
  }

  function renderDiceTray() {
    elements.tray.innerHTML = "";
    if (state.diceBag.length === 0) {
      const empty = document.createElement("div");
      empty.className = "die-button is-empty";
      empty.textContent = "尚無待放置骰子";
      empty.style.gridColumn = "1 / -1";
      elements.tray.appendChild(empty);
    } else {
      state.diceBag.forEach(function (die) {
        const type = TOWER_TYPES[die.type];
        const button = document.createElement("button");
        button.type = "button";
        button.className = "die-button" + (state.selectedDieId === die.id ? " is-selected" : "");
        button.style.setProperty("--die-color", type.color);
        button.dataset.dieId = die.id;
        button.title = type.name + "，等級 " + die.tier;
        button.setAttribute("aria-label", type.name + "，等級 " + die.tier);
        button.innerHTML = getDieFaceMarkup(die.type, die.tier);
        elements.tray.appendChild(button);
      });
    }
    elements.trayHint.textContent = state.selectedDieId
      ? (state.phase === "combat" ? "拖到空格開始施工，或拖到同類同級骰塔合成。" : "拖到空格立即放置，或拖到同類同級骰塔合成。")
      : state.phase === "combat"
        ? "戰鬥中可購買並部署；新塔完工前不會攻擊。"
        : "選一顆骰子，再點擊空建造格放置。";
  }

  function formatDamage(value) {
    const rounded = Math.round(value * 10) / 10;
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  }

  function renderInspector() {
    const tower = findTowerById(state.selectedTowerId);
    if (!tower) {
      elements.inspector.innerHTML = '<div class="empty-inspector"><span class="inspector-icon">✦</span><strong>選取一座骰塔</strong><p>查看等級、爆擊率、射程與能力。</p></div>';
      return;
    }

    const type = TOWER_TYPES[tower.type];
    const tierData = type.tiers[tower.tier - 1];
    const damage = tower.type === "inspire"
      ? "+" + Math.round(TOWER_TYPES.inspire.bonus[tower.tier - 1] * 100) + "%"
      : formatDamage(tierData.damage * TOWER_DAMAGE_MULTIPLIER);
    const interval = getTowerInterval(tower).toFixed(2) + "s";
    const canEdit = isPreparation();
    const canSell = isMarketOpen();
    const constructing = isTowerConstructing(tower);
    const attackDisabled = tower.attackDisabledRemaining > 0;
    const constructionHtml = constructing
      ? '<div class="construction-row"><span>施工中</span><strong>' + tower.buildRemaining.toFixed(1) + 's</strong><b>暫停所有功能</b></div>'
      : "";
    const disableHtml = !constructing && attackDisabled
      ? '<div class="construction-row"><span>法術封印</span><strong>' + tower.attackDisabledRemaining.toFixed(1) + 's</strong><b>暫停攻擊</b></div>'
      : "";
    const actionHtml = canSell
      ? (canEdit ? "" : '<div class="inspector-mode-note">戰鬥中可建造、拖曳合成與出售；移動及交換位置需等到準備階段。</div>') + '<div class="inspector-actions is-single"><button class="button button-danger" data-inspector-action="sell" type="button">出售（' + getSellValue(tower) + ' G）</button></div>'
      : '<div class="inspector-mode-note">目前只能查看骰塔資訊。</div>';
    const critStatus = constructing ? '<b>施工中停用</b>' : attackDisabled ? '<b>封印中停火</b>' : tower.forcedCrit ? '<b class="is-ready">下一擊必定爆擊</b>' : '<b>自然爆擊</b>';
    elements.inspector.innerHTML = '<div class="tower-inspector">' +
      '<div class="tower-inspector-heading"><span class="tower-symbol" style="--tower-color:' + type.color + '">' + type.symbol + '</span><div><strong>' + type.name + ' · 等級 ' + tower.tier + '</strong><small>位置 ' + tower.x + ',' + tower.y + '</small></div></div>' +
      '<div class="tower-stat-grid"><div class="tower-stat"><span>傷害／增益</span><strong>' + damage + '</strong></div><div class="tower-stat"><span>射程</span><strong>' + tierData.range + '</strong></div><div class="tower-stat"><span>間隔</span><strong>' + interval + '</strong></div></div>' +
      constructionHtml + disableHtml +
      '<div class="crit-row"><span>爆擊機率</span><strong>' + Math.round(getCritChance(tower) * 100) + '%</strong>' + critStatus + '</div>' +
      '<p class="inspector-description">' + type.description + '</p>' +
      actionHtml +
      '</div>';
  }

  function renderHud() {
    const phaseName = { preparation: "準備中", combat: "戰鬥中", waveResult: "結算中", victory: "已勝利", defeat: "已失守" }[state.phase];
    elements.wave.textContent = state.wave + " / " + WAVES.length;
    elements.phase.textContent = state.paused ? "已暫停" : phaseName;
    elements.score.textContent = String(state.score);
    elements.gold.textContent = formatGold(state.gold);

    if (state.phase === "preparation") {
      elements.countdown.textContent = Math.ceil(state.prepRemaining) + "s";
      elements.start.innerHTML = "開始第 " + state.wave + " 波 <span aria-hidden=\"true\">→</span>";
    } else if (state.phase === "combat") {
      elements.countdown.textContent = "LIVE";
      elements.start.textContent = "戰鬥進行中";
    } else if (state.phase === "waveResult") {
      elements.countdown.textContent = state.wave >= WAVES.length ? "CLEAR" : "NEXT";
      elements.start.textContent = "準備下一波";
    } else {
      elements.countdown.textContent = "—";
      elements.start.textContent = state.phase === "victory" ? "已完成" : "已失守";
    }

    elements.start.disabled = state.phase !== "preparation" || state.paused;
    elements.buy.disabled = !isMarketOpen() || state.gold < BUY_COST;
    elements.pause.disabled = state.phase === "victory" || state.phase === "defeat";
    elements.pause.textContent = state.paused ? "繼續" : "暫停";
  }

  function resizeCanvas() {
    const rect = elements.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = rect.width;
    const height = rect.height;
    elements.canvas.width = Math.max(1, Math.floor(width * dpr));
    elements.canvas.height = Math.max(1, Math.floor(height * dpr));
    canvasMetrics = { width, height, dpr, cell: Math.min(width / COLS, height / ROWS), offsetX: 0, offsetY: 0 };
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function roundedRect(context, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    context.beginPath();
    context.moveTo(x + r, y);
    context.arcTo(x + width, y, x + width, y + height, r);
    context.arcTo(x + width, y + height, x, y + height, r);
    context.arcTo(x, y + height, x, y, r);
    context.arcTo(x, y, x + width, y, r);
    context.closePath();
  }

  function gridCenter(x, y) {
    return { x: canvasMetrics.offsetX + (x + 0.5) * canvasMetrics.cell, y: canvasMetrics.offsetY + (y + 0.5) * canvasMetrics.cell };
  }

  function getDiePipOffsets(tier) {
    const patterns = {
      1: [[0, 0]],
      2: [[-0.23, -0.23], [0.23, 0.23]],
      3: [[-0.25, -0.25], [0, 0], [0.25, 0.25]],
      4: [[-0.25, -0.25], [0.25, -0.25], [-0.25, 0.25], [0.25, 0.25]],
      5: [[-0.25, -0.25], [0.25, -0.25], [0, 0], [-0.25, 0.25], [0.25, 0.25]],
      6: [[-0.25, -0.27], [0.25, -0.27], [-0.25, 0], [0.25, 0], [-0.25, 0.27], [0.25, 0.27]]
    };
    const clampedTier = Math.max(1, Math.min(MAX_TIER, tier));
    return patterns[clampedTier];
  }

  function drawDieIconFace(type, tier, dieSize) {
    const offsets = getDiePipOffsets(tier);
    const fontScales = [0, 0.52, 0.34, 0.27, 0.23, 0.20, 0.18];
    const fontScale = fontScales[offsets.length];
    ctx.save();
    ctx.fillStyle = "#071226";
    ctx.font = "950 " + Math.max(8, dieSize * fontScale) + "px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    offsets.forEach(function (offset) {
      ctx.fillText(type.symbol, offset[0] * dieSize, offset[1] * dieSize + dieSize * 0.015);
    });
    ctx.restore();
  }

  function traceRoadCenterline() {
    const entrance = gridCenter(PATH[0][0], PATH[0][1]);
    ctx.beginPath();
    ctx.moveTo(canvasMetrics.offsetX - canvasMetrics.cell * 0.5, entrance.y);
    PATH.forEach(function (slot) {
      const center = gridCenter(slot[0], slot[1]);
      ctx.lineTo(center.x, center.y);
    });
  }

  function isLegalDragTarget(x, y) {
    if (getSlotIndex(x, y) < 0) return false;
    const target = findTowerAt(x, y);

    if (trayDragState && trayDragState.moved) {
      if (!target) return true;
      return !isTowerConstructing(target) &&
        target.type === trayDragState.type &&
        target.tier === trayDragState.tier &&
        target.tier < MAX_TIER;
    }

    if (canvasDragState && canvasDragState.moved) {
      const source = findTowerById(canvasDragState.towerId);
      if (!source || (target && target.id === source.id)) return false;
      if (!target) return isPreparation();
      const canMerge = !isTowerConstructing(source) &&
        !isTowerConstructing(target) &&
        source.type === target.type &&
        source.tier === target.tier &&
        source.tier < MAX_TIER;
      if (canMerge) return true;
      return isPreparation() && (source.type !== target.type || source.tier !== target.tier);
    }

    return false;
  }

  function renderBoard() {
    resizeCanvasIfNeeded();
    const width = canvasMetrics.width;
    const height = canvasMetrics.height;
    const cell = canvasMetrics.cell;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#07162a";
    ctx.fillRect(0, 0, width, height);

    const shake = getBoardShakeOffset();
    ctx.save();
    ctx.translate(shake.x, shake.y);

    for (let y = 0; y < ROWS; y += 1) {
      for (let x = 0; x < COLS; x += 1) {
        const px = x * cell;
        const py = y * cell;
        ctx.fillStyle = (x + y) % 2 === 0 ? "#0a1b31" : "#09182c";
        ctx.fillRect(px, py, cell, cell);
      }
    }

    ctx.strokeStyle = "rgba(152, 195, 228, 0.08)";
    ctx.lineWidth = 1;
    for (let x = 0; x <= COLS; x += 1) {
      ctx.beginPath(); ctx.moveTo(x * cell, 0); ctx.lineTo(x * cell, height); ctx.stroke();
    }
    for (let y = 0; y <= ROWS; y += 1) {
      ctx.beginPath(); ctx.moveTo(0, y * cell); ctx.lineTo(width, y * cell); ctx.stroke();
    }

    traceRoadCenterline();
    ctx.strokeStyle = "#172633";
    ctx.lineWidth = cell * 0.76;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();

    ctx.save();
    traceRoadCenterline();
    const roadPattern = roadTextureTile ? ctx.createPattern(roadTextureTile, "repeat") : null;
    ctx.strokeStyle = roadPattern || "#5d6669";
    ctx.lineWidth = cell * 0.62;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.globalAlpha = 0.88;
    ctx.stroke();
    ctx.restore();

    ctx.save();
    traceRoadCenterline();
    ctx.setLineDash([cell * 0.10, cell * 0.16]);
    ctx.strokeStyle = "rgba(220, 231, 224, 0.24)";
    ctx.lineWidth = Math.max(1.2, cell * 0.025);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
    ctx.restore();

    const dragActive = Boolean((trayDragState && trayDragState.moved) || (canvasDragState && canvasDragState.moved));
    BUILD_SLOTS.forEach(function (slot) {
      const padding = cell * 0.12;
      const legalTarget = dragActive && isLegalDragTarget(slot[0], slot[1]);
      ctx.save();
      roundedRect(ctx, slot[0] * cell + padding, slot[1] * cell + padding, cell - padding * 2, cell - padding * 2, cell * 0.14);
      ctx.fillStyle = legalTarget ? "rgba(113, 227, 244, " + (0.22 * LEGAL_DROP_BRIGHTNESS) + ")" : "rgba(113, 227, 244, 0.025)";
      ctx.fill();
      ctx.strokeStyle = legalTarget ? "rgba(156, 236, 255, " + (0.88 * LEGAL_DROP_BRIGHTNESS) + ")" : "rgba(113, 227, 244, 0.12)";
      ctx.lineWidth = legalTarget ? 2.2 : 1;
      if (legalTarget) {
        ctx.shadowColor = "rgba(113, 227, 244, " + (0.82 * LEGAL_DROP_BRIGHTNESS) + ")";
        ctx.shadowBlur = cell * 0.16;
      }
      ctx.stroke();
      ctx.restore();
    });

    drawGate();
    drawSelectedRange();
    state.towers.forEach(drawTower);
    state.enemies.forEach(function (enemy) {
      if (!enemy.dead && enemy.movementDelayRemaining <= 0) drawEnemy(enemy);
    });
    state.effects.forEach(drawEffect);
    drawCoreHealthBar();
    ctx.restore();
  }

  function getBoardShakeOffset() {
    if (profile.settings.reducedEffects) return { x: 0, y: 0 };
    const landing = state.effects.find(function (effect) {
      if (effect.kind !== "bossLanding") return false;
      const progress = 1 - effect.ttl / effect.maxTtl;
      return progress >= 0.58;
    });
    if (!landing) return { x: 0, y: 0 };
    const progress = 1 - landing.ttl / landing.maxTtl;
    const impactProgress = Math.min(1, (progress - 0.58) / 0.42);
    const strength = canvasMetrics.cell * 0.075 * (1 - impactProgress);
    const phase = performance.now() * 0.095;
    return {
      x: Math.sin(phase) * strength,
      y: Math.cos(phase * 1.37) * strength * 0.72
    };
  }

  function resizeCanvasIfNeeded() {
    const rect = elements.canvas.getBoundingClientRect();
    if (Math.abs(rect.width - canvasMetrics.width) > 1 || Math.abs(rect.height - canvasMetrics.height) > 1) resizeCanvas();
  }

  function drawGate() {
    const position = gridCenter(9, 6);
    ctx.save();
    ctx.translate(position.x + canvasMetrics.cell * 0.2, position.y);
    ctx.fillStyle = "#d18b3c";
    ctx.shadowColor = "rgba(255, 204, 91, 0.56)";
    ctx.shadowBlur = canvasMetrics.cell * 0.25;
    roundedRect(ctx, -canvasMetrics.cell * 0.18, -canvasMetrics.cell * 0.34, canvasMetrics.cell * 0.36, canvasMetrics.cell * 0.68, canvasMetrics.cell * 0.08);
    ctx.fill();
    ctx.restore();
  }

  function drawCoreHealthBar() {
    const position = gridCenter(9, 6);
    const cell = canvasMetrics.cell;
    const width = cell * 0.82;
    const height = Math.max(6, cell * 0.11);
    const x = position.x - width / 2;
    const y = position.y - cell * 0.47;
    const ratio = Math.max(0, Math.min(1, state.coreHp / state.coreMaxHp));
    const color = ratio > 0.55 ? "#7ce0ae" : ratio > 0.25 ? "#ffd477" : "#ff7d78";
    ctx.save();
    roundedRect(ctx, x - 2, y - 2, width + 4, height + 4, height * 0.5);
    ctx.fillStyle = "rgba(3, 9, 20, 0.86)";
    ctx.fill();
    if (ratio > 0) {
      roundedRect(ctx, x, y, width * ratio, height, height * 0.42);
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = cell * 0.12;
      ctx.fill();
    }
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#f4f8ff";
    ctx.font = "850 " + Math.max(8, cell * 0.13) + "px Avenir Next, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillText("CORE " + state.coreHp + "/" + state.coreMaxHp, position.x, y - cell * 0.05);
    ctx.restore();
  }

  function drawSelectedRange() {
    const tower = findTowerById(state.selectedTowerId);
    if (!tower) return;
    const type = TOWER_TYPES[tower.type];
    const range = type.tiers[tower.tier - 1].range * canvasMetrics.cell;
    const center = gridCenter(tower.x, tower.y);
    ctx.save();
    ctx.beginPath();
    ctx.arc(center.x, center.y, range, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255, 212, 119, 0.06)";
    ctx.fill();
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = "rgba(255, 212, 119, 0.58)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }

  function drawTower(tower) {
    const type = TOWER_TYPES[tower.type];
    const center = gridCenter(tower.x, tower.y);
    const size = canvasMetrics.cell * 0.72;
    const selected = state.selectedTowerId === tower.id;
    const constructing = isTowerConstructing(tower);
    const attackPulseProgress = tower.attackPulseRemaining > 0 ? 1 - tower.attackPulseRemaining / ATTACK_PULSE_DURATION : 0;
    const attackScale = tower.attackPulseRemaining > 0 ? 1 + Math.sin(attackPulseProgress * Math.PI) * 0.1 : 1;
    ctx.save();
    if (canvasDragState && canvasDragState.towerId === tower.id) ctx.globalAlpha = 0.35;
    else if (constructing) ctx.globalAlpha = 0.48;
    ctx.translate(center.x, center.y);
    ctx.scale(attackScale, attackScale);
    if (tower.forcedCrit) {
      ctx.shadowColor = "#ffd477";
      ctx.shadowBlur = canvasMetrics.cell * 0.28;
    }
    roundedRect(ctx, -size / 2, -size / 2, size, size, canvasMetrics.cell * 0.12);
    ctx.fillStyle = type.color;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = selected ? "#fff4c7" : "rgba(255,255,255,0.35)";
    ctx.lineWidth = selected ? 3 : 1;
    ctx.stroke();
    drawDieIconFace(type, tower.tier, size);
    if (tower.forcedCrit) {
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.6, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255, 212, 119, 0.82)";
      ctx.lineWidth = Math.max(2, canvasMetrics.cell * 0.035);
      ctx.stroke();
    }
    if (!constructing && tower.attackDisabledRemaining > 0) {
      ctx.globalAlpha = 1;
      roundedRect(ctx, -size / 2, -size / 2, size, size, canvasMetrics.cell * 0.12);
      ctx.fillStyle = "rgba(36, 18, 67, 0.58)";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.57, 0, Math.PI * 2);
      ctx.strokeStyle = "#bd9cff";
      ctx.lineWidth = Math.max(2, canvasMetrics.cell * 0.04);
      ctx.shadowColor = "#9f72ff";
      ctx.shadowBlur = canvasMetrics.cell * 0.16;
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#f3eaff";
      ctx.font = "950 " + Math.max(11, canvasMetrics.cell * 0.22) + "px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("×", 0, 0);
    }
    if (constructing) {
      const progress = tower.buildDuration > 0 ? 1 - tower.buildRemaining / tower.buildDuration : 1;
      ctx.globalAlpha = 1;
      roundedRect(ctx, -size / 2, -size / 2, size, size, canvasMetrics.cell * 0.12);
      ctx.fillStyle = "rgba(3, 11, 25, 0.52)";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.52, -Math.PI / 2, Math.PI * 1.5);
      ctx.strokeStyle = "rgba(156, 236, 255, 0.22)";
      ctx.lineWidth = Math.max(2, canvasMetrics.cell * 0.045);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.52, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
      ctx.strokeStyle = "#9cecff";
      ctx.shadowColor = "rgba(113, 216, 244, 0.8)";
      ctx.shadowBlur = 8;
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#e6fbff";
      ctx.font = "900 " + Math.max(8, canvasMetrics.cell * 0.12) + "px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(tower.buildRemaining.toFixed(1) + "s", 0, size * 0.02);
    }
    ctx.restore();
  }

  function drawEnemyModelAccents(enemy, center, radius) {
    const time = performance.now() / 1000;
    ctx.save();
    ctx.lineWidth = Math.max(1.5, canvasMetrics.cell * 0.025 * ENEMY_VISUAL_SCALE);
    ctx.shadowColor = ENEMY_TYPES[enemy.type].color;
    ctx.shadowBlur = canvasMetrics.cell * 0.12;

    if (enemy.type === "warder") {
      const accentRadius = radius * 1.42;
      ctx.globalAlpha = 0.84;
      ctx.beginPath();
      for (let index = 0; index < 6; index += 1) {
        const angle = time * 0.22 + index * Math.PI / 3 - Math.PI / 2;
        const x = center.x + Math.cos(angle) * accentRadius;
        const y = center.y + Math.sin(angle) * accentRadius;
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.strokeStyle = "#88f7ff";
      ctx.stroke();
    } else if (enemy.type === "burrower") {
      ctx.globalAlpha = enemy.burrowRemaining > 0 ? 0.92 : 0.58;
      ctx.beginPath();
      ctx.ellipse(center.x, center.y + radius * 0.7, radius * 1.28, radius * 0.46, 0, 0, Math.PI * 2);
      ctx.strokeStyle = "#efc58e";
      ctx.stroke();
      for (let index = 0; index < 4; index += 1) {
        const angle = time * 2.2 + index * Math.PI / 2;
        ctx.beginPath();
        ctx.arc(center.x + Math.cos(angle) * radius * 1.05, center.y + radius * 0.68 + Math.sin(angle) * radius * 0.28, radius * 0.11, 0, Math.PI * 2);
        ctx.fillStyle = index % 2 === 0 ? "#dfad73" : "#8d6848";
        ctx.fill();
      }
    } else if (enemy.type === "disruptor") {
      ctx.globalAlpha = 0.82;
      for (let index = 0; index < 3; index += 1) {
        const angle = -time * 1.15 + index * Math.PI * 2 / 3;
        const orbitRadius = radius * 1.42;
        ctx.beginPath();
        ctx.arc(center.x + Math.cos(angle) * orbitRadius, center.y + Math.sin(angle) * orbitRadius, radius * 0.13, 0, Math.PI * 2);
        ctx.fillStyle = "#f2a0ff";
        ctx.fill();
      }
      ctx.beginPath();
      ctx.arc(center.x, center.y, radius * 1.28, time, time + Math.PI * 1.25);
      ctx.strokeStyle = "#ed82ff";
      ctx.stroke();
    } else if (enemy.type === "overlord") {
      ctx.globalAlpha = 0.9;
      [1.24, 1.52].forEach(function (scale, index) {
        ctx.beginPath();
        ctx.arc(center.x, center.y, radius * scale, time * (index === 0 ? 0.35 : -0.28), time * (index === 0 ? 0.35 : -0.28) + Math.PI * 1.55);
        ctx.strokeStyle = index === 0 ? "#ffb4ff" : "#b56cff";
        ctx.stroke();
      });
      for (let index = 0; index < 3; index += 1) {
        const angle = time * 0.75 + index * Math.PI * 2 / 3;
        const shardX = center.x + Math.cos(angle) * radius * 1.72;
        const shardY = center.y + Math.sin(angle) * radius * 1.72;
        ctx.save();
        ctx.translate(shardX, shardY);
        ctx.rotate(angle + Math.PI / 2);
        ctx.fillStyle = index === 0 ? "#ffd2ff" : "#e36eff";
        ctx.fillRect(-radius * 0.08, -radius * 0.24, radius * 0.16, radius * 0.48);
        ctx.restore();
      }
    } else if (enemy.type === "regenerator") {
      ctx.globalAlpha = 0.88;
      ctx.beginPath();
      ctx.arc(center.x, center.y, radius * 1.3, time * 0.55, time * 0.55 + Math.PI * 1.55);
      ctx.strokeStyle = "#8cff9f";
      ctx.stroke();
      for (let index = 0; index < 4; index += 1) {
        const angle = time * 0.85 + index * Math.PI / 2;
        const leafX = center.x + Math.cos(angle) * radius * 1.45;
        const leafY = center.y + Math.sin(angle) * radius * 1.45;
        ctx.save();
        ctx.translate(leafX, leafY);
        ctx.rotate(angle + Math.PI / 4);
        ctx.fillStyle = index % 2 === 0 ? "#b9ffc4" : "#70e58c";
        ctx.fillRect(-radius * 0.08, -radius * 0.18, radius * 0.16, radius * 0.36);
        ctx.restore();
      }
    } else if (enemy.type === "berserker") {
      const enraged = enemy.berserkTriggered;
      ctx.globalAlpha = enraged ? 0.96 : 0.72;
      [-1, 1].forEach(function (direction) {
        ctx.beginPath();
        ctx.moveTo(center.x + direction * radius * 0.35, center.y - radius * 0.62);
        ctx.lineTo(center.x + direction * radius * 1.18, center.y - radius * (enraged ? 1.34 : 1.08));
        ctx.lineTo(center.x + direction * radius * 0.76, center.y - radius * 0.35);
        ctx.closePath();
        ctx.fillStyle = enraged ? "#ff4f49" : "#ff9b7f";
        ctx.fill();
      });
      ctx.beginPath();
      ctx.arc(center.x, center.y, radius * (enraged ? 1.5 + Math.sin(time * 8) * 0.08 : 1.28), 0, Math.PI * 2);
      ctx.strokeStyle = enraged ? "#ff665f" : "rgba(255, 155, 127, 0.72)";
      ctx.stroke();
    } else if (enemy.type === "thief") {
      ctx.globalAlpha = 0.9;
      for (let index = 0; index < 3; index += 1) {
        const angle = -time * 1.05 + index * Math.PI * 2 / 3;
        const coinX = center.x + Math.cos(angle) * radius * 1.46;
        const coinY = center.y + Math.sin(angle) * radius * 1.46;
        ctx.beginPath();
        ctx.arc(coinX, coinY, radius * 0.16, 0, Math.PI * 2);
        ctx.fillStyle = index === 0 ? "#fff2a3" : "#ffd45d";
        ctx.fill();
        ctx.strokeStyle = "#9b6618";
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(center.x, center.y, radius * 1.25, -time, -time + Math.PI * 1.35);
      ctx.strokeStyle = "#ffd45d";
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawEnemyResistanceIndicators(enemy, center, radius) {
    const activeResistances = Object.keys(RESISTANCE_STYLES).filter(function (type) {
      return getEnemyResistance(enemy, type) > 0;
    });
    if (activeResistances.length === 0) return;

    const fullCircle = Math.PI * 2;
    const segmentSize = fullCircle / activeResistances.length;
    const arcRadius = radius * 1.2;
    const badgeOrbit = radius * 1.48;
    const badgeRadius = Math.max(4, radius * 0.23);
    ctx.save();
    ctx.setLineDash([Math.max(2, radius * 0.2), Math.max(2, radius * 0.12)]);
    ctx.lineWidth = Math.max(1.5, canvasMetrics.cell * 0.02 * ENEMY_VISUAL_SCALE);
    activeResistances.forEach(function (type, index) {
      const style = RESISTANCE_STYLES[type];
      const resistance = getEnemyResistance(enemy, type);
      const startAngle = -Math.PI / 2 + index * segmentSize + 0.1;
      const endAngle = -Math.PI / 2 + (index + 1) * segmentSize - 0.1;
      ctx.beginPath();
      ctx.arc(center.x, center.y, arcRadius, startAngle, endAngle);
      ctx.strokeStyle = style.color;
      ctx.globalAlpha = Math.min(0.95, 0.62 + resistance);
      ctx.shadowColor = style.color;
      ctx.shadowBlur = radius * 0.24;
      ctx.stroke();

      const badgeAngle = -Math.PI / 4 + index * Math.min(0.72, segmentSize);
      const badgeX = center.x + Math.cos(badgeAngle) * badgeOrbit;
      const badgeY = center.y + Math.sin(badgeAngle) * badgeOrbit;
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 0.94;
      ctx.beginPath();
      ctx.arc(badgeX, badgeY, badgeRadius, 0, fullCircle);
      ctx.fillStyle = "rgba(5, 12, 25, 0.9)";
      ctx.fill();
      ctx.strokeStyle = style.color;
      ctx.stroke();
      ctx.fillStyle = style.color;
      ctx.font = "950 " + Math.max(7, badgeRadius * 1.35) + "px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(style.icon, badgeX, badgeY + badgeRadius * 0.06);
    });
    ctx.restore();
  }

  function drawEnemy(enemy) {
    const definition = ENEMY_TYPES[enemy.type];
    const position = getEnemyRenderPosition(enemy);
    const center = gridCenter(position.x, position.y);
    const radius = canvasMetrics.cell * (definition.boss ? 0.34 : 0.25) * ENEMY_VISUAL_SCALE;
    const sprite = enemySprites[enemy.type];
    const spriteScale = enemy.type === "overlord" ? 0.94 : definition.boss ? 0.82 : enemy.type === "child" ? 0.46 : 0.6;
    const spriteSize = canvasMetrics.cell * spriteScale * ENEMY_VISUAL_SCALE;
    const bob = Math.sin(performance.now() / 155 + enemy.order * 1.7) * canvasMetrics.cell * 0.025 * ENEMY_VISUAL_SCALE;
    const burrowOffset = enemy.burrowRemaining > 0 ? canvasMetrics.cell * 0.08 : 0;
    const landingProgress = enemy.bossLandingRemaining > 0
      ? 1 - enemy.bossLandingRemaining / BOSS_LANDING_DURATION
      : 1;
    const landingOffset = enemy.bossLandingRemaining > 0
      ? -canvasMetrics.cell * 2.8 * Math.pow(1 - landingProgress, 2)
      : 0;
    ctx.save();
    ctx.translate(0, landingOffset);
    ctx.globalAlpha = enemy.invisibleRemaining > 0 ? 0.2 : enemy.burrowRemaining > 0 ? 0.24 : 1;
    ctx.beginPath();
    ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(4, 12, 25, 0.72)";
    ctx.shadowColor = definition.color;
    ctx.shadowBlur = (enemy.frozenRemaining > 0 ? canvasMetrics.cell * 0.24 : canvasMetrics.cell * 0.1) * ENEMY_VISUAL_SCALE;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = enemy.shield > 0 ? "#ffe0a6" : "rgba(255,255,255,0.44)";
    ctx.lineWidth = (enemy.shield > 0 ? 2 : 1) * ENEMY_VISUAL_SCALE;
    ctx.stroke();

    if (sprite && sprite.complete && sprite.naturalWidth > 0) {
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(sprite, center.x - spriteSize / 2, center.y - spriteSize / 2 + bob + burrowOffset, spriteSize, spriteSize);
      ctx.restore();
    } else {
      ctx.fillStyle = definition.color;
      ctx.font = "950 " + Math.max(8, canvasMetrics.cell * (definition.boss ? 0.16 : 0.13)) * ENEMY_VISUAL_SCALE + "px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(definition.symbol, center.x, center.y + ENEMY_VISUAL_SCALE);
    }

    if (enemy.frozenRemaining > 0) drawFrozenEnemyOverlay(enemy, center, radius, spriteSize);

    drawEnemyModelAccents(enemy, center, radius);

    drawEnemyResistanceIndicators(enemy, center, radius);

    const barWidth = canvasMetrics.cell * (definition.boss ? 0.75 : 0.48) * ENEMY_VISUAL_SCALE;
    const barHeight = Math.max(3, canvasMetrics.cell * 0.055) * ENEMY_VISUAL_SCALE;
    const barY = center.y - Math.max(radius, spriteSize / 2) - barHeight - 4 * ENEMY_VISUAL_SCALE;
    ctx.fillStyle = "rgba(2, 8, 18, 0.78)";
    ctx.fillRect(center.x - barWidth / 2, barY, barWidth, barHeight);
    ctx.fillStyle = enemy.shield > 0 ? "#ffe0a6" : "#7ce0ae";
    ctx.fillRect(center.x - barWidth / 2, barY, barWidth * Math.max(0, enemy.hp / enemy.maxHp), barHeight);
    if (enemy.slowRemaining > 0 || enemy.frozenRemaining > 0) {
      ctx.beginPath(); ctx.arc(center.x, center.y, radius + 4 * ENEMY_VISUAL_SCALE, 0, Math.PI * 2);
      ctx.strokeStyle = enemy.frozenRemaining > 0 ? "#d6f8ff" : "#71d8f4";
      ctx.lineWidth = 2 * ENEMY_VISUAL_SCALE; ctx.stroke();
    }
    if (enemy.poisonRemaining > 0) {
      ctx.beginPath(); ctx.arc(center.x, center.y, radius + 6 * ENEMY_VISUAL_SCALE, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(154, 216, 111, 0.75)";
      ctx.lineWidth = ENEMY_VISUAL_SCALE; ctx.stroke();
    }
    ctx.restore();
  }

  function drawFrozenEnemyOverlay(enemy, center, radius, spriteSize) {
    const size = canvasMetrics.cell;
    const pulse = 0.88 + Math.sin(performance.now() / 95 + enemy.order) * 0.12;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = 0.34;
    ctx.beginPath();
    ctx.arc(center.x, center.y, Math.max(radius, spriteSize * 0.42), 0, Math.PI * 2);
    ctx.fillStyle = "#8eeaff";
    ctx.shadowColor = "#d8fbff";
    ctx.shadowBlur = size * 0.2;
    ctx.fill();

    ctx.globalAlpha = 0.9;
    for (let index = 0; index < 6; index += 1) {
      const angle = index * Math.PI / 3 - Math.PI / 2;
      const inner = radius * 0.72;
      const outer = radius + size * (0.12 + (index % 2) * 0.05) * pulse;
      const spread = size * 0.045;
      ctx.beginPath();
      ctx.moveTo(center.x + Math.cos(angle) * inner, center.y + Math.sin(angle) * inner);
      ctx.lineTo(center.x + Math.cos(angle - 0.12) * outer - Math.sin(angle) * spread, center.y + Math.sin(angle - 0.12) * outer + Math.cos(angle) * spread);
      ctx.lineTo(center.x + Math.cos(angle + 0.12) * outer + Math.sin(angle) * spread, center.y + Math.sin(angle + 0.12) * outer - Math.cos(angle) * spread);
      ctx.closePath();
      ctx.fillStyle = index % 2 === 0 ? "#e7fdff" : "#71d8f4";
      ctx.fill();
    }

    ctx.globalAlpha = 1;
    ctx.fillStyle = "#f2feff";
    ctx.font = "950 " + Math.max(10, size * 0.17) + "px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "#71d8f4";
    ctx.shadowBlur = size * 0.12;
    ctx.fillText("❄", center.x, center.y - Math.max(radius, spriteSize / 2) - size * 0.16);
    ctx.restore();
  }

  function drawProjectile(effect, progress) {
    const first = gridCenter(effect.x1, effect.y1);
    const second = gridCenter(effect.x2, effect.y2);
    const eased = 1 - Math.pow(1 - Math.min(1, progress), 2);
    const x = first.x + (second.x - first.x) * eased;
    const y = first.y + (second.y - first.y) * eased;
    const angle = Math.atan2(second.y - first.y, second.x - first.x);
    const size = canvasMetrics.cell;
    const baseAlpha = ctx.globalAlpha;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.shadowColor = effect.color;
    ctx.shadowBlur = size * 0.22;

    if (effect.style === "cannon") {
      for (let index = 3; index >= 1; index -= 1) {
        ctx.globalAlpha = baseAlpha * (0.22 + (4 - index) * 0.14);
        ctx.beginPath();
        ctx.arc(-size * 0.09 * index, 0, size * (0.075 - index * 0.01), 0, Math.PI * 2);
        ctx.fillStyle = "#d86e43";
        ctx.fill();
      }
      ctx.globalAlpha = baseAlpha;
      const cannonGradient = ctx.createRadialGradient(-size * 0.035, -size * 0.035, 1, 0, 0, size * 0.115);
      cannonGradient.addColorStop(0, "#fff0bc");
      cannonGradient.addColorStop(0.35, "#ffae65");
      cannonGradient.addColorStop(1, "#a83d30");
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.115, 0, Math.PI * 2);
      ctx.fillStyle = cannonGradient;
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.7)";
      ctx.lineWidth = 1.2;
      ctx.stroke();
    } else if (effect.style === "frost") {
      ctx.beginPath();
      ctx.moveTo(size * 0.15, 0);
      ctx.lineTo(0, -size * 0.09);
      ctx.lineTo(-size * 0.13, 0);
      ctx.lineTo(0, size * 0.09);
      ctx.closePath();
      ctx.fillStyle = "#d9fbff";
      ctx.fill();
      ctx.strokeStyle = effect.color;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    } else if (effect.style === "poison") {
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.105, 0, Math.PI * 2);
      ctx.fillStyle = "#82d94e";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(-size * 0.035, -size * 0.035, size * 0.032, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(235,255,202,0.9)";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(-size * 0.14, size * 0.06, size * 0.035, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(154,216,111,0.6)";
      ctx.fill();
    } else if (effect.style === "pierce") {
      ctx.beginPath();
      ctx.moveTo(size * 0.2, 0);
      ctx.lineTo(-size * 0.1, -size * 0.09);
      ctx.lineTo(-size * 0.04, 0);
      ctx.lineTo(-size * 0.1, size * 0.09);
      ctx.closePath();
      ctx.fillStyle = "#ead5ff";
      ctx.fill();
      ctx.strokeStyle = effect.color;
      ctx.lineWidth = 1.4;
      ctx.stroke();
    } else if (effect.style === "inspire") {
      ctx.rotate(-angle + progress * Math.PI * 2);
      ctx.fillStyle = "#fff2b5";
      ctx.font = "900 " + Math.max(11, size * 0.2) + "px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("✦", 0, 0);
    }
    ctx.restore();

    if (progress > 0.78) {
      const impactProgress = (progress - 0.78) / 0.22;
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - impactProgress);
      ctx.beginPath();
      ctx.arc(second.x, second.y, size * (0.08 + impactProgress * 0.18), 0, Math.PI * 2);
      ctx.strokeStyle = effect.color;
      ctx.lineWidth = Math.max(1.5, size * 0.035);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawLightning(effect, progress) {
    const first = gridCenter(effect.x1, effect.y1);
    const second = gridCenter(effect.x2, effect.y2);
    const currentX = first.x + (second.x - first.x) * Math.min(1, progress * 1.35);
    const currentY = first.y + (second.y - first.y) * Math.min(1, progress * 1.35);
    const dx = currentX - first.x;
    const dy = currentY - first.y;
    const length = Math.max(1, Math.hypot(dx, dy));
    const normalX = -dy / length;
    const normalY = dx / length;
    const segments = 7;

    ctx.beginPath();
    ctx.moveTo(first.x, first.y);
    for (let index = 1; index <= segments; index += 1) {
      const ratio = index / segments;
      const jitter = index === segments ? 0 : Math.sin(index * 8.7 + progress * 15) * canvasMetrics.cell * 0.055;
      ctx.lineTo(first.x + dx * ratio + normalX * jitter, first.y + dy * ratio + normalY * jitter);
    }
    ctx.strokeStyle = effect.color;
    ctx.lineWidth = Math.max(2, canvasMetrics.cell * 0.055);
    ctx.shadowColor = effect.color;
    ctx.shadowBlur = 11;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(currentX, currentY, canvasMetrics.cell * 0.07, 0, Math.PI * 2);
    ctx.fillStyle = "#fff7c7";
    ctx.fill();
  }

  function drawBossExplosion(effect, progress) {
    const center = gridCenter(effect.x, effect.y);
    const size = canvasMetrics.cell;
    const baseAlpha = ctx.globalAlpha;
    const expansion = 1 - Math.pow(1 - Math.min(1, progress), 3);

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const flashRadius = size * (0.12 + expansion * 0.72);
    const flash = ctx.createRadialGradient(center.x, center.y, 0, center.x, center.y, flashRadius);
    flash.addColorStop(0, "rgba(255,255,236,0.98)");
    flash.addColorStop(0.25, "rgba(255,211,91,0.9)");
    flash.addColorStop(0.62, "rgba(255,105,53,0.48)");
    flash.addColorStop(1, "rgba(255,78,45,0)");
    ctx.globalAlpha = baseAlpha * Math.max(0.2, 1 - progress * 0.7);
    ctx.beginPath();
    ctx.arc(center.x, center.y, flashRadius, 0, Math.PI * 2);
    ctx.fillStyle = flash;
    ctx.fill();

    [0, 0.09, 0.18].forEach(function (delay, index) {
      const ringProgress = Math.max(0, Math.min(1, (progress - delay) / (0.72 - delay)));
      if (ringProgress <= 0) return;
      ctx.globalAlpha = baseAlpha * (1 - ringProgress) * (0.95 - index * 0.18);
      ctx.beginPath();
      ctx.arc(center.x, center.y, size * (0.18 + ringProgress * (0.72 + index * 0.2)), 0, Math.PI * 2);
      ctx.strokeStyle = index === 0 ? "#fff7bd" : index === 1 ? "#ffad4f" : "#ff5d45";
      ctx.lineWidth = Math.max(2, size * (0.09 - index * 0.015));
      ctx.stroke();
    });

    const fragmentProgress = Math.min(1, progress * 1.25);
    for (let index = 0; index < 18; index += 1) {
      const angle = index * (Math.PI * 2 / 18) + (index % 3) * 0.14;
      const distance = size * fragmentProgress * (0.58 + (index % 5) * 0.1);
      const x = center.x + Math.cos(angle) * distance;
      const y = center.y + Math.sin(angle) * distance;
      const fragmentSize = size * Math.max(0.025, 0.085 * (1 - progress));
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle + progress * 4 * (index % 2 === 0 ? 1 : -1));
      ctx.globalAlpha = baseAlpha * Math.max(0, 1 - progress * 0.85);
      ctx.fillStyle = index % 3 === 0 ? "#fff2a8" : index % 3 === 1 ? "#ff9c45" : effect.color;
      ctx.fillRect(-fragmentSize / 2, -fragmentSize / 2, fragmentSize, fragmentSize);
      ctx.restore();
    }
    ctx.restore();

    if (progress > 0.3) {
      const smokeProgress = (progress - 0.3) / 0.7;
      ctx.save();
      for (let index = 0; index < 7; index += 1) {
        const angle = index * (Math.PI * 2 / 7) - Math.PI / 2;
        const distance = size * (0.15 + smokeProgress * (0.32 + (index % 2) * 0.12));
        ctx.globalAlpha = baseAlpha * Math.max(0, 0.42 * (1 - smokeProgress));
        ctx.beginPath();
        ctx.arc(center.x + Math.cos(angle) * distance, center.y + Math.sin(angle) * distance - smokeProgress * size * 0.18, size * (0.11 + smokeProgress * 0.12), 0, Math.PI * 2);
        ctx.fillStyle = index % 2 === 0 ? "#5f6978" : "#8b6559";
        ctx.fill();
      }
      ctx.restore();
    }
  }

  function drawMergeEffect(effect, progress) {
    const first = gridCenter(effect.x1, effect.y1);
    const second = gridCenter(effect.x2, effect.y2);
    const size = canvasMetrics.cell;
    const travelEnd = 0.58;
    const travelProgress = Math.min(1, progress / travelEnd);
    const eased = 1 - Math.pow(1 - travelProgress, 3);
    const x = first.x + (second.x - first.x) * eased;
    const y = first.y + (second.y - first.y) * eased - Math.sin(travelProgress * Math.PI) * size * 0.18;

    if (progress <= travelEnd) {
      ctx.save();
      for (let index = 3; index >= 1; index -= 1) {
        const trailProgress = Math.max(0, eased - index * 0.08);
        const trailX = first.x + (second.x - first.x) * trailProgress;
        const trailY = first.y + (second.y - first.y) * trailProgress - Math.sin(trailProgress * Math.PI) * size * 0.18;
        ctx.globalAlpha = (0.28 - index * 0.045) * (1 - travelProgress * 0.45);
        ctx.beginPath();
        ctx.arc(trailX, trailY, size * (0.07 - index * 0.008), 0, Math.PI * 2);
        ctx.fillStyle = effect.color;
        ctx.fill();
      }

      const dieSize = size * (0.58 - travelProgress * 0.18);
      ctx.globalAlpha = Math.max(0.18, 1 - Math.max(0, travelProgress - 0.8) * 3.8);
      ctx.translate(x, y);
      ctx.rotate(travelProgress * Math.PI * 1.6);
      ctx.shadowColor = effect.color;
      ctx.shadowBlur = size * 0.28;
      roundedRect(ctx, -dieSize / 2, -dieSize / 2, dieSize, dieSize, size * 0.11);
      ctx.fillStyle = effect.color;
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.72)";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.shadowBlur = 0;
      drawDieIconFace(TOWER_TYPES[effect.type], effect.tier, dieSize);
      ctx.restore();
    }

    if (progress >= 0.48) {
      const glowProgress = Math.min(1, (progress - 0.48) / 0.52);
      const glowAlpha = Math.sin(glowProgress * Math.PI);
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = glowAlpha * 0.82;
      const glowRadius = size * (0.34 + glowProgress * 0.42);
      const glow = ctx.createRadialGradient(second.x, second.y, 0, second.x, second.y, glowRadius);
      glow.addColorStop(0, "rgba(255,255,225,0.96)");
      glow.addColorStop(0.35, effect.color);
      glow.addColorStop(1, "rgba(255,255,255,0)");
      ctx.beginPath();
      ctx.arc(second.x, second.y, glowRadius, 0, Math.PI * 2);
      ctx.fillStyle = glow;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(second.x, second.y, size * (0.28 + glowProgress * 0.48), 0, Math.PI * 2);
      ctx.strokeStyle = "#fff4ba";
      ctx.lineWidth = Math.max(2, size * 0.05 * (1 - glowProgress));
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawCriticalEffect(effect, progress) {
    const center = gridCenter(effect.x, effect.y);
    const size = canvasMetrics.cell;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.beginPath();
    ctx.arc(center.x, center.y, size * (0.18 + progress * 0.48), 0, Math.PI * 2);
    ctx.strokeStyle = effect.color;
    ctx.lineWidth = Math.max(2, size * 0.07 * (1 - progress));
    ctx.shadowColor = effect.color;
    ctx.shadowBlur = size * 0.24;
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = Math.max(0, 1 - progress * 1.05);
    ctx.fillStyle = "#fff2a8";
    ctx.font = "950 " + Math.max(10, size * 0.2) + "px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "rgba(255, 151, 57, 0.9)";
    ctx.shadowBlur = 8;
    ctx.fillText("CRIT", center.x, center.y - size * (0.34 + progress * 0.25));
    ctx.restore();
  }

  function drawGoldEffect(effect, progress) {
    const center = gridCenter(effect.x, effect.y);
    const size = canvasMetrics.cell;
    const y = center.y - size * (0.18 + progress * 0.62);
    ctx.save();
    ctx.shadowColor = "rgba(255, 174, 54, 0.9)";
    ctx.shadowBlur = 8;
    ctx.fillStyle = effect.color;
    ctx.beginPath();
    ctx.arc(center.x - size * 0.19, y, size * 0.09, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#6f4300";
    ctx.font = "950 " + Math.max(8, size * 0.1) + "px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("G", center.x - size * 0.19, y + 0.5);
    ctx.fillStyle = "#fff2a8";
    ctx.font = "950 " + Math.max(10, size * 0.17) + "px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("+" + formatGold(effect.amount) + " G", center.x - size * 0.06, y);
    ctx.restore();
  }

  function drawGoldLossEffect(effect, progress) {
    const center = gridCenter(effect.x, effect.y);
    const size = canvasMetrics.cell;
    const y = center.y - size * (0.16 + progress * 0.68);
    ctx.save();
    ctx.shadowColor = "rgba(255, 92, 82, 0.9)";
    ctx.shadowBlur = 9;
    ctx.fillStyle = "#ffcf5b";
    ctx.beginPath();
    ctx.arc(center.x - size * 0.2, y, size * 0.09, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#ff665f";
    ctx.lineWidth = Math.max(1.5, size * 0.025);
    ctx.stroke();
    ctx.fillStyle = "#ff8b75";
    ctx.font = "950 " + Math.max(10, size * 0.17) + "px sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText("−" + formatGold(effect.amount) + " G", center.x - size * 0.07, y);
    ctx.restore();
  }

  function drawScoreEffect(effect, progress) {
    const center = gridCenter(effect.x, effect.y);
    const size = canvasMetrics.cell;
    const y = center.y + size * (0.12 - progress * 0.48);
    ctx.save();
    ctx.fillStyle = effect.color;
    ctx.shadowColor = "rgba(113, 227, 244, 0.9)";
    ctx.shadowBlur = 8;
    ctx.font = "950 " + Math.max(9, size * 0.14) + "px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("+" + effect.amount + " PTS", center.x, y);
    ctx.restore();
  }

  function drawShieldBreakEffect(effect, progress) {
    const center = gridCenter(effect.x, effect.y);
    const size = canvasMetrics.cell;
    const baseAlpha = ctx.globalAlpha;
    const expansion = 1 - Math.pow(1 - progress, 3);

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const flashRadius = size * (0.16 + expansion * 0.62);
    const flash = ctx.createRadialGradient(center.x, center.y, 0, center.x, center.y, flashRadius);
    flash.addColorStop(0, "rgba(255,255,255,0.98)");
    flash.addColorStop(0.28, "rgba(255,224,166,0.92)");
    flash.addColorStop(0.62, "rgba(113,216,244,0.46)");
    flash.addColorStop(1, "rgba(113,216,244,0)");
    ctx.globalAlpha = baseAlpha * Math.max(0.18, 1 - progress * 0.72);
    ctx.beginPath();
    ctx.arc(center.x, center.y, flashRadius, 0, Math.PI * 2);
    ctx.fillStyle = flash;
    ctx.fill();

    [0, 0.12].forEach(function (delay, index) {
      const ringProgress = Math.max(0, Math.min(1, (progress - delay) / (0.78 - delay)));
      if (ringProgress <= 0) return;
      ctx.globalAlpha = baseAlpha * (1 - ringProgress) * (0.95 - index * 0.2);
      ctx.beginPath();
      ctx.arc(center.x, center.y, size * (0.2 + ringProgress * (0.56 + index * 0.18)), 0, Math.PI * 2);
      ctx.strokeStyle = index === 0 ? "#fff7d6" : "#71d8f4";
      ctx.lineWidth = Math.max(2, size * (0.08 - index * 0.018));
      ctx.stroke();
    });

    const fragmentProgress = Math.min(1, progress * 1.35);
    for (let index = 0; index < 14; index += 1) {
      const angle = index * (Math.PI * 2 / 14) + (index % 2) * 0.12;
      const distance = size * fragmentProgress * (0.38 + (index % 4) * 0.1);
      const fragmentSize = size * Math.max(0.018, 0.075 * (1 - progress));
      ctx.save();
      ctx.translate(center.x + Math.cos(angle) * distance, center.y + Math.sin(angle) * distance);
      ctx.rotate(angle + progress * 3.5 * (index % 2 === 0 ? 1 : -1));
      ctx.globalAlpha = baseAlpha * Math.max(0, 1 - progress * 0.88);
      ctx.fillStyle = index % 3 === 0 ? "#ffffff" : index % 3 === 1 ? effect.color : "#71d8f4";
      ctx.beginPath();
      ctx.moveTo(fragmentSize, 0);
      ctx.lineTo(-fragmentSize * 0.7, fragmentSize * 0.55);
      ctx.lineTo(-fragmentSize * 0.42, -fragmentSize * 0.72);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  function drawWaveTransition(effect, progress) {
    const width = canvasMetrics.width;
    const height = canvasMetrics.height;
    const cell = canvasMetrics.cell;
    const fadeIn = Math.min(1, progress / 0.18);
    const fadeOut = Math.min(1, (1 - progress) / 0.30);
    const opacity = Math.max(0, Math.min(fadeIn, fadeOut));
    const centerX = width / 2;
    const centerY = height / 2;
    const cardWidth = Math.min(width * 0.56, cell * 5.8);
    const cardHeight = cell * 1.25;
    const sweepX = width * (-0.12 + progress * 1.24);

    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.fillStyle = "rgba(3, 11, 25, 0.38)";
    ctx.fillRect(0, 0, width, height);

    const sweep = ctx.createLinearGradient(sweepX - cell, 0, sweepX + cell, 0);
    sweep.addColorStop(0, "rgba(113, 216, 244, 0)");
    sweep.addColorStop(0.5, effect.finalWave ? "rgba(255, 212, 119, 0.22)" : "rgba(113, 216, 244, 0.18)");
    sweep.addColorStop(1, "rgba(113, 216, 244, 0)");
    ctx.fillStyle = sweep;
    ctx.fillRect(sweepX - cell, 0, cell * 2, height);

    roundedRect(ctx, centerX - cardWidth / 2, centerY - cardHeight / 2, cardWidth, cardHeight, cell * 0.18);
    ctx.fillStyle = "rgba(5, 16, 34, 0.84)";
    ctx.shadowColor = effect.color;
    ctx.shadowBlur = cell * 0.22;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = effect.color;
    ctx.lineWidth = Math.max(1.5, cell * 0.025);
    ctx.stroke();

    ctx.fillStyle = "#f4f8ff";
    ctx.font = "950 " + Math.max(13, cell * 0.28) + "px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(effect.finalWave ? "FINAL WAVE CLEAR" : "WAVE " + effect.wave + " CLEAR", centerX, centerY - cell * 0.12);
    ctx.fillStyle = effect.color;
    ctx.font = "850 " + Math.max(8, cell * 0.11) + "px sans-serif";
    ctx.fillText(effect.finalWave ? "CORE SECURED" : "NEXT WAVE PREPARATION", centerX, centerY + cell * 0.24);
    ctx.restore();
  }

  function drawEnemyAbilityEffect(effect, progress) {
    const center = gridCenter(effect.x, effect.y);
    const size = canvasMetrics.cell;
    const expansion = 1 - Math.pow(1 - progress, 2);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = effect.color;
    ctx.fillStyle = effect.color;
    ctx.shadowColor = effect.color;
    ctx.shadowBlur = size * 0.18;
    ctx.lineWidth = Math.max(2, size * 0.045 * (1 - progress * 0.45));

    if (effect.kind === "wardPulse") {
      const radius = size * (0.24 + expansion * 1.05);
      ctx.beginPath();
      for (let index = 0; index < 6; index += 1) {
        const angle = index * Math.PI / 3 - Math.PI / 2 + progress * 0.35;
        const x = center.x + Math.cos(angle) * radius;
        const y = center.y + Math.sin(angle) * radius;
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
    } else if (effect.kind === "disruptPulse") {
      const radius = size * (0.2 + expansion * 1.25);
      ctx.beginPath();
      ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
      ctx.stroke();
      for (let index = 0; index < 8; index += 1) {
        const angle = index * Math.PI / 4 + progress * 0.5;
        ctx.beginPath();
        ctx.moveTo(center.x + Math.cos(angle) * radius * 0.78, center.y + Math.sin(angle) * radius * 0.78);
        ctx.lineTo(center.x + Math.cos(angle) * radius * 1.08, center.y + Math.sin(angle) * radius * 1.08);
        ctx.stroke();
      }
    } else {
      for (let index = 0; index < 3; index += 1) {
        const localProgress = Math.max(0, Math.min(1, progress * 1.35 - index * 0.12));
        ctx.globalAlpha = Math.max(0, 0.82 - localProgress * 0.72);
        ctx.beginPath();
        ctx.ellipse(center.x, center.y + size * 0.14, size * (0.18 + localProgress * (0.55 + index * 0.12)), size * (0.08 + localProgress * 0.16), 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function drawBossLanding(effect, progress) {
    const center = gridCenter(effect.x, effect.y);
    const size = canvasMetrics.cell;
    const impactProgress = Math.max(0, Math.min(1, (progress - 0.58) / 0.42));
    const descentProgress = Math.min(1, progress / 0.58);
    ctx.save();

    const shadowScale = 0.28 + descentProgress * 0.72;
    ctx.globalAlpha = 0.18 + descentProgress * 0.42;
    ctx.beginPath();
    ctx.ellipse(center.x, center.y + size * 0.22, size * 0.5 * shadowScale, size * 0.16 * shadowScale, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#020711";
    ctx.fill();

    if (progress < 0.68) {
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = Math.max(0, 0.8 - progress * 0.7);
      for (let index = -2; index <= 2; index += 1) {
        ctx.beginPath();
        ctx.moveTo(center.x + index * size * 0.12, center.y - size * (1.65 - descentProgress * 1.15));
        ctx.lineTo(center.x + index * size * 0.07, center.y - size * (0.35 - descentProgress * 0.2));
        ctx.strokeStyle = index % 2 === 0 ? "#fff1bd" : effect.color;
        ctx.lineWidth = Math.max(2, size * 0.045);
        ctx.shadowColor = effect.color;
        ctx.shadowBlur = size * 0.16;
        ctx.stroke();
      }
    }

    if (impactProgress > 0) {
      const eased = 1 - Math.pow(1 - impactProgress, 3);
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = Math.max(0, 1 - impactProgress);
      for (let ring = 0; ring < 2; ring += 1) {
        const local = Math.max(0, Math.min(1, impactProgress * 1.2 - ring * 0.16));
        if (local <= 0) continue;
        ctx.beginPath();
        ctx.ellipse(center.x, center.y + size * 0.18, size * (0.3 + eased * (0.9 + ring * 0.28)), size * (0.1 + eased * (0.24 + ring * 0.06)), 0, 0, Math.PI * 2);
        ctx.strokeStyle = ring === 0 ? "#fff2bd" : effect.color;
        ctx.lineWidth = Math.max(2, size * (0.075 - ring * 0.018) * (1 - local * 0.55));
        ctx.shadowColor = effect.color;
        ctx.shadowBlur = size * 0.2;
        ctx.stroke();
      }
      for (let index = 0; index < 12; index += 1) {
        const angle = Math.PI + index * Math.PI / 11;
        const distance = size * eased * (0.36 + (index % 3) * 0.13);
        const particleSize = size * Math.max(0.015, 0.065 * (1 - impactProgress));
        ctx.beginPath();
        ctx.arc(center.x + Math.cos(angle) * distance, center.y + size * 0.2 + Math.sin(angle) * distance * 0.32, particleSize, 0, Math.PI * 2);
        ctx.fillStyle = index % 2 === 0 ? effect.color : "#d7b980";
        ctx.fill();
      }
    }
    ctx.restore();
  }

  function drawFreezeEffect(effect, progress) {
    const center = gridCenter(effect.x, effect.y);
    const size = canvasMetrics.cell;
    const expansion = 1 - Math.pow(1 - progress, 2);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = "#dffcff";
    ctx.fillStyle = effect.color;
    ctx.shadowColor = effect.color;
    ctx.shadowBlur = size * 0.18;
    ctx.lineWidth = Math.max(2, size * 0.04 * (1 - progress * 0.5));
    ctx.beginPath();
    ctx.arc(center.x, center.y, size * (0.12 + expansion * 0.42), 0, Math.PI * 2);
    ctx.stroke();
    for (let index = 0; index < 8; index += 1) {
      const angle = index * Math.PI / 4 + progress * 0.18;
      const distance = size * expansion * (0.22 + (index % 3) * 0.1);
      const shard = size * Math.max(0.018, 0.075 * (1 - progress));
      ctx.save();
      ctx.translate(center.x + Math.cos(angle) * distance, center.y + Math.sin(angle) * distance);
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.moveTo(shard, 0);
      ctx.lineTo(-shard * 0.55, shard * 0.42);
      ctx.lineTo(-shard * 0.3, -shard * 0.42);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  function drawKnockbackEffect(effect, progress) {
    const first = gridCenter(effect.x1, effect.y1);
    const second = gridCenter(effect.x2, effect.y2);
    const size = canvasMetrics.cell;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = effect.color;
    ctx.shadowColor = effect.color;
    ctx.shadowBlur = size * 0.15;
    ctx.lineWidth = Math.max(2, size * 0.04 * (1 - progress * 0.6));
    for (let index = -1; index <= 1; index += 1) {
      const offset = index * size * 0.08;
      ctx.beginPath();
      ctx.moveTo(first.x, first.y + offset);
      ctx.lineTo(second.x, second.y + offset * 0.45);
      ctx.stroke();
    }
    ctx.globalAlpha = Math.max(0, 1 - progress);
    ctx.beginPath();
    ctx.arc(second.x, second.y, size * (0.12 + progress * 0.3), 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function drawBladeSwing(effect, progress) {
    const center = gridCenter(effect.x, effect.y);
    const target = gridCenter(effect.targetX, effect.targetY);
    const size = canvasMetrics.cell;
    const targetAngle = Math.atan2(target.y - center.y, target.x - center.x);
    const sweepStart = targetAngle - Math.PI * 0.72;
    const sweepEnd = targetAngle + Math.PI * 0.72;
    const eased = 1 - Math.pow(1 - Math.min(1, progress), 3);
    const bladeAngle = sweepStart + (sweepEnd - sweepStart) * eased;
    const radius = size * 0.5;
    const bladeX = center.x + Math.cos(bladeAngle) * radius;
    const bladeY = center.y + Math.sin(bladeAngle) * radius;

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = effect.color;
    ctx.shadowColor = effect.color;
    ctx.shadowBlur = size * 0.2;
    ctx.lineCap = "round";

    const rangeRadius = Math.max(radius, (effect.range || 1) * size);
    const waveProgress = Math.min(1, progress * 1.35);
    ctx.globalAlpha = Math.max(0, 0.42 * (1 - waveProgress));
    ctx.beginPath();
    ctx.arc(center.x, center.y, radius + (rangeRadius - radius) * waveProgress, 0, Math.PI * 2);
    ctx.lineWidth = Math.max(2, size * 0.055 * (1 - waveProgress * 0.5));
    ctx.stroke();

    for (let trail = 0; trail < 3; trail += 1) {
      const trailEnd = bladeAngle - trail * 0.16;
      ctx.globalAlpha = Math.max(0, (0.75 - trail * 0.2) * (1 - progress * 0.45));
      ctx.beginPath();
      ctx.arc(center.x, center.y, radius - trail * size * 0.035, sweepStart, trailEnd);
      ctx.lineWidth = Math.max(2, size * (0.09 - trail * 0.02));
      ctx.stroke();
    }

    ctx.globalAlpha = Math.max(0.25, 1 - progress * 0.38);
    ctx.translate(bladeX, bladeY);
    ctx.rotate(bladeAngle + Math.PI / 2);
    ctx.fillStyle = "#fff3f6";
    ctx.strokeStyle = effect.color;
    ctx.lineWidth = Math.max(1.5, size * 0.025);
    ctx.beginPath();
    ctx.moveTo(-size * 0.24, size * 0.055);
    ctx.quadraticCurveTo(0, -size * 0.14, size * 0.3, -size * 0.035);
    ctx.quadraticCurveTo(size * 0.06, size * 0.12, -size * 0.24, size * 0.055);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(-size * 0.18, size * 0.045, size * 0.045, 0, Math.PI * 2);
    ctx.fillStyle = effect.color;
    ctx.fill();
    ctx.restore();
  }

  function drawEffect(effect) {
    const progress = 1 - effect.ttl / effect.maxTtl;
    const alpha = Math.max(0, effect.ttl / effect.maxTtl);
    ctx.save();
    ctx.lineCap = "round";
    if (effect.kind === "waveTransition") {
      drawWaveTransition(effect, progress);
      ctx.restore();
      return;
    }
    ctx.globalAlpha = alpha;
    if (effect.kind === "gold") {
      drawGoldEffect(effect, progress);
    } else if (effect.kind === "score") {
      drawScoreEffect(effect, progress);
    } else if (effect.kind === "goldLoss") {
      drawGoldLossEffect(effect, progress);
    } else if (effect.kind === "critical") {
      drawCriticalEffect(effect, progress);
    } else if (effect.kind === "merge") {
      drawMergeEffect(effect, progress);
    } else if (effect.kind === "bossExplosion") {
      drawBossExplosion(effect, progress);
    } else if (effect.kind === "bossLanding") {
      drawBossLanding(effect, progress);
    } else if (effect.kind === "shieldBreak") {
      drawShieldBreakEffect(effect, progress);
    } else if (effect.kind === "wardPulse" || effect.kind === "disruptPulse" || effect.kind === "burrow") {
      drawEnemyAbilityEffect(effect, progress);
    } else if (effect.kind === "projectile") {
      drawProjectile(effect, progress);
    } else if (effect.kind === "lightning") {
      drawLightning(effect, progress);
    } else if (effect.kind === "knockback") {
      drawKnockbackEffect(effect, progress);
    } else if (effect.kind === "bladeSwing") {
      drawBladeSwing(effect, progress);
    } else if (effect.kind === "burst" || effect.kind === "bossPulse" || effect.kind === "magePulse" || effect.kind === "towerDisable" || effect.kind === "inspire" || effect.kind === "pulse" || effect.kind === "critReady" || effect.kind === "buildComplete") {
      const center = gridCenter(effect.x, effect.y);
      const expansion = effect.kind === "bossPulse" ? 1.5 : effect.kind === "magePulse" ? 1.3 : effect.kind === "critReady" || effect.kind === "towerDisable" ? 0.45 : 0.75;
      ctx.beginPath(); ctx.arc(center.x, center.y, canvasMetrics.cell * (0.22 + progress * expansion), 0, Math.PI * 2);
      ctx.strokeStyle = effect.color; ctx.lineWidth = Math.max(2, canvasMetrics.cell * 0.055); ctx.shadowColor = effect.color; ctx.shadowBlur = 12; ctx.stroke();
    } else if (effect.kind === "freeze") {
      drawFreezeEffect(effect, progress);
    } else if (effect.kind === "hit" || effect.kind === "poisonHit" || effect.kind === "shield" || effect.kind === "heal" || effect.kind === "death" || effect.kind === "spawn" || effect.kind === "leak") {
      const center = gridCenter(effect.x, effect.y);
      ctx.beginPath(); ctx.arc(center.x, center.y, canvasMetrics.cell * (0.1 + progress * 0.34), 0, Math.PI * 2);
      ctx.strokeStyle = effect.color; ctx.lineWidth = Math.max(2, canvasMetrics.cell * 0.04); ctx.shadowColor = effect.color; ctx.shadowBlur = 8; ctx.stroke();
    }
    ctx.restore();
  }

  function render() {
    renderBoard();
    renderHud();
    if (uiDirty) {
      renderDiceTray();
      renderInspector();
      uiDirty = false;
    }
  }

  function togglePause() {
    if (startupCheckpoint || tutorialVisible) return;
    if (state.phase === "victory" || state.phase === "defeat") return;
    state.paused = !state.paused;
    elements.pauseCover.hidden = !state.paused;
    showToast(state.paused ? "戰場暫停中。" : "繼續守住核心。", 1.2);
    markUiDirty();
  }

  function handleKeyDown(event) {
    if (event.key === "Escape" && (state.phase === "victory" || state.phase === "defeat")) {
      closeResultCover();
      return;
    }
    if (startupCheckpoint || tutorialVisible) return;
    if (event.code === "Space") {
      event.preventDefault();
      if (state.phase === "preparation") beginCombat();
      else togglePause();
    }
    if (event.key.toLowerCase() === "r" && !event.metaKey && !event.ctrlKey) {
      if (window.confirm("要重新開始這一局嗎？")) resetGame();
    }
  }

  function loop(timestamp) {
    if (lastFrameTime === null) lastFrameTime = timestamp;
    const deltaTime = Math.min((timestamp - lastFrameTime) / 1000, 0.1);
    lastFrameTime = timestamp;
    if (!state.paused) {
      if (state.phase === "preparation") updatePreparation(deltaTime);
      else if (state.phase === "combat") updateCombat(deltaTime);
      else if (state.phase === "waveResult") updateWaveResult(deltaTime);
      updateEffects(deltaTime);
    }
    render();
    animationFrame = window.requestAnimationFrame(loop);
  }

  elements.start.addEventListener("click", beginCombat);
  elements.pause.addEventListener("click", togglePause);
  elements.resume.addEventListener("click", togglePause);
  elements.continueGame.addEventListener("click", continueSavedGame);
  elements.newGame.addEventListener("click", resetGame);
  elements.tutorialButton.addEventListener("click", completeTutorial);
  elements.restart.addEventListener("click", function () {
    if (window.confirm("要重新開始這一局嗎？")) resetGame();
  });
  elements.resultRestart.addEventListener("click", resetGame);
  elements.resultClose.addEventListener("click", closeResultCover);
  elements.buy.addEventListener("click", purchaseDie);
  elements.tray.addEventListener("pointerdown", function (event) {
    if (!isMarketOpen()) return;
    const button = event.target.closest("[data-die-id]");
    if (!button) return;
    const die = findDieById(button.dataset.dieId);
    if (!die) return;
    trayDragState = {
      dieId: die.id,
      type: die.type,
      tier: die.tier,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      moved: false
    };
    button.setPointerCapture(event.pointerId);
    event.preventDefault();
  });
  elements.tray.addEventListener("click", function (event) {
    if (event.detail !== 0 || !isMarketOpen()) return;
    const button = event.target.closest("[data-die-id]");
    if (button) selectDie(button.dataset.dieId);
  });
  elements.inspector.addEventListener("click", function (event) {
    const button = event.target.closest("[data-inspector-action]");
    if (!button) return;
    const action = button.dataset.inspectorAction;
    if (action === "sell") sellSelected();
  });
  elements.canvas.addEventListener("pointerdown", function (event) {
    if (state.paused || (state.phase !== "preparation" && state.phase !== "combat" && state.phase !== "waveResult")) return;
    pointerStart = getCellFromPointer(event);
    if (!pointerStart) return;
    elements.canvas.setPointerCapture(event.pointerId);
    const tower = findTowerAt(pointerStart.x, pointerStart.y);
    if ((state.phase === "preparation" || state.phase === "combat") && tower) {
      canvasDragState = {
        towerId: tower.id,
        type: tower.type,
        tier: tower.tier,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        moved: false
      };
    }
    event.preventDefault();
  });
  window.addEventListener("pointermove", function (event) {
    if (trayDragState && trayDragState.pointerId === event.pointerId) {
      if (!trayDragState.moved && hasPointerMoved(trayDragState.startX, trayDragState.startY, event)) {
        trayDragState.moved = true;
        showDragPreview(trayDragState.type, trayDragState.tier, event);
      } else if (trayDragState.moved) {
        moveDragPreview(event);
      }
      if (trayDragState.moved) event.preventDefault();
      return;
    }
    if (canvasDragState && canvasDragState.pointerId === event.pointerId) {
      if (!canvasDragState.moved && hasPointerMoved(canvasDragState.startX, canvasDragState.startY, event)) {
        canvasDragState.moved = true;
        showDragPreview(canvasDragState.type, canvasDragState.tier, event);
      } else if (canvasDragState.moved) {
        moveDragPreview(event);
      }
      if (canvasDragState.moved) event.preventDefault();
    }
  });
  window.addEventListener("pointerup", function (event) {
    if (trayDragState && trayDragState.pointerId === event.pointerId) {
      const drag = trayDragState;
      trayDragState = null;
      hideDragPreview();
      if (!drag.moved) {
        selectDie(drag.dieId);
        event.preventDefault();
        return;
      }

      const die = findDieById(drag.dieId);
      if (!die || !isMarketOpen()) return;
      state.selectedDieId = die.id;
      state.selectedTowerId = null;
      const end = getCellFromPointer(event);
      const endTower = end ? findTowerAt(end.x, end.y) : null;
      if (end && getSlotIndex(end.x, end.y) >= 0 && !endTower) {
        placeDieAt(end.x, end.y);
      } else if (endTower) {
        mergeDieIntoTower(die, endTower);
      } else {
        showToast("拖曳到空建造格部署，或拖到同類同級骰塔合成。", 1.8);
        markUiDirty();
      }
      event.preventDefault();
      return;
    }

    if (!pointerStart) return;
    const drag = canvasDragState;
    const end = getCellFromPointer(event);
    if (drag && !drag.moved) {
      handleBoardAction(pointerStart, pointerStart, false);
    } else if (!(drag && drag.moved && end && end.x === pointerStart.x && end.y === pointerStart.y)) {
      handleBoardAction(pointerStart, end, Boolean(drag && drag.moved));
    }
    pointerStart = null;
    canvasDragState = null;
    hideDragPreview();
    event.preventDefault();
  });
  window.addEventListener("pointercancel", function () {
    trayDragState = null;
    pointerStart = null;
    canvasDragState = null;
    hideDragPreview();
  });
  document.addEventListener("keydown", handleKeyDown);
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "hidden") savePreparationCheckpoint();
    if (document.visibilityState === "hidden" && !state.paused && state.phase !== "victory" && state.phase !== "defeat") togglePause();
  });
  window.addEventListener("resize", resizeCanvas);

  initializeGame();
  resizeCanvas();
  render();
  animationFrame = window.requestAnimationFrame(loop);
})();
