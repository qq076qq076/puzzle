(function () {
  "use strict";

  const COLS = 10;
  const ROWS = 8;
  const WAVE_REWARD = 35;
  const BUY_COST = 25;
  const MAX_TIER = 6;
  const BUILD_TIMES = [1.2, 2.4, 4, 5.8, 7.8, 10];
  const INITIAL_CORE_HP = 20;
  const CRIT_CHANCES = [0.10, 0.20, 0.35, 0.48, 0.60, 0.72];
  const POISON_DURATIONS = [4, 5, 6, 7, 8, 9];
  const CRIT_DAMAGE_MULTIPLIER = 1.75;
  const ATTACK_PULSE_DURATION = 0.18;
  const MERGE_EFFECT_DURATION = 0.95;
  const ENEMY_VISUAL_SCALE = 3 / 4;
  const LEGAL_DROP_BRIGHTNESS = 0.65;
  const SHIELDED_WAVE_START = 23;
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
      description: "施加持續毒傷；爆擊造成 1.75 倍傷害並跳向附近敵人。",
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
        { damage: 3.2, range: 3, interval: 0.46 },
        { damage: 7.2, range: 3.5, interval: 0.42 },
        { damage: 17.1, range: 4, interval: 0.38 },
        { damage: 30.6, range: 4.5, interval: 0.35 },
        { damage: 58, range: 5, interval: 0.32 },
        { damage: 96, range: 5.5, interval: 0.29 }
      ]
    },
    pierce: {
      name: "穿刺骰",
      symbol: "➹",
      color: "#d4a4ff",
      description: "沿道路順序穿透敵人；爆擊造成 1.75 倍傷害並貫穿所有合法目標。",
      pierceCount: [2, 4, 7, 10, 14, 20],
      tiers: [
        { damage: 4, range: 4, interval: 0.59 },
        { damage: 8.8, range: 4.5, interval: 0.53 },
        { damage: 21.6, range: 5, interval: 0.46 },
        { damage: 37.8, range: 5.5, interval: 0.42 },
        { damage: 72, range: 6, interval: 0.38 },
        { damage: 120, range: 6.5, interval: 0.34 }
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
    runner: { name: "迅捷蟲", symbol: "S", color: "#ff8d83", hp: 35, speed: 1.8, leakDamage: 1, reward: 2 },
    armor: { name: "裝甲蟲", symbol: "A", color: "#b3bdca", hp: 95, speed: 0.8, leakDamage: 1, reward: 3, directResistance: 0.35 },
    split: { name: "分裂蟲", symbol: "D", color: "#dc9b76", hp: 70, speed: 1.0, leakDamage: 1, reward: 3, splits: true },
    child: { name: "分裂幼體", symbol: "d", color: "#e4bf7b", hp: 20, speed: 1.35, leakDamage: 1, reward: 1 },
    ghost: { name: "幽影蟲", symbol: "G", color: "#b898ec", hp: 110, speed: 1.1, leakDamage: 1, reward: 4 },
    healer: { name: "治療蟲", symbol: "H", color: "#78d8ae", hp: 80, speed: 0.7, leakDamage: 2, reward: 5 },
    boss: { name: "巨甲王", symbol: "B", color: "#ffbf62", hp: 900, speed: 0.45, leakDamage: 5, reward: 30, boss: true }
  };

  const ENEMY_SPRITE_PATHS = {
    runner: "assets/enemies/swift-bat.png",
    armor: "assets/enemies/armored-knight.png",
    split: "assets/enemies/splitter-slime.png",
    child: "assets/enemies/child-spider.png",
    ghost: "assets/enemies/shadow-ghost.png",
    healer: "assets/enemies/healer-wizard.png",
    boss: "assets/enemies/boss-demon.png"
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
    [{ type: "runner", count: 12, interval: 0.95 }, { type: "split", count: 4, interval: 1.15 }],
    [{ type: "armor", count: 7, interval: 1.00 }, { type: "split", count: 5, interval: 1.00 }, { type: "runner", count: 8, interval: 0.90 }],
    [{ type: "ghost", count: 5, interval: 1.05 }, { type: "runner", count: 12, interval: 0.85 }, { type: "armor", count: 6, interval: 0.95 }],
    [{ type: "split", count: 8, interval: 0.90 }, { type: "ghost", count: 7, interval: 0.90 }, { type: "armor", count: 8, interval: 0.90 }],
    [{ type: "runner", count: 12, interval: 0.80 }, { type: "ghost", count: 8, interval: 0.90 }, { type: "boss", count: 1, interval: 1.20 }],
    [{ type: "healer", count: 4, interval: 1.00 }, { type: "armor", count: 9, interval: 0.85 }, { type: "runner", count: 12, interval: 0.75 }],
    [{ type: "healer", count: 5, interval: 0.90 }, { type: "split", count: 9, interval: 0.80 }, { type: "ghost", count: 8, interval: 0.80 }],
    [{ type: "armor", count: 12, interval: 0.75 }, { type: "healer", count: 6, interval: 0.85 }, { type: "runner", count: 14, interval: 0.65 }],
    [{ type: "ghost", count: 12, interval: 0.70 }, { type: "split", count: 11, interval: 0.72 }, { type: "healer", count: 7, interval: 0.80 }],
    [
      { type: "runner", count: 14, interval: 0.65 }, { type: "armor", count: 12, interval: 0.70 },
      { type: "split", count: 10, interval: 0.70 }, { type: "ghost", count: 10, interval: 0.70 },
      { type: "healer", count: 6, interval: 0.80 }, { type: "boss", count: 1, interval: 1.00 }
    ],
    [{ type: "runner", count: 20, interval: 0.58 }, { type: "split", count: 12, interval: 0.66 }, { type: "ghost", count: 8, interval: 0.72 }],
    [{ type: "armor", count: 16, interval: 0.68 }, { type: "healer", count: 8, interval: 0.75 }, { type: "ghost", count: 12, interval: 0.65 }],
    [{ type: "split", count: 16, interval: 0.62 }, { type: "runner", count: 20, interval: 0.55 }, { type: "healer", count: 7, interval: 0.72 }],
    [{ type: "ghost", count: 18, interval: 0.58 }, { type: "armor", count: 14, interval: 0.62 }, { type: "healer", count: 9, interval: 0.70 }],
    [
      { type: "armor", count: 14, interval: 0.60 }, { type: "split", count: 12, interval: 0.62 },
      { type: "ghost", count: 12, interval: 0.60 }, { type: "healer", count: 8, interval: 0.68 },
      { type: "boss", count: 2, interval: 1.00 }
    ],
    [
      { type: "runner", count: 24, interval: 0.48 }, { type: "armor", count: 16, interval: 0.55 },
      { type: "split", count: 14, interval: 0.56 }, { type: "ghost", count: 12, interval: 0.54 },
      { type: "healer", count: 8, interval: 0.65 }
    ],
    [
      { type: "armor", count: 18, interval: 0.52 }, { type: "split", count: 16, interval: 0.54 },
      { type: "ghost", count: 16, interval: 0.52 }, { type: "healer", count: 10, interval: 0.60 },
      { type: "boss", count: 2, interval: 0.90 }
    ],
    [
      { type: "runner", count: 20, interval: 0.46 }, { type: "armor", count: 16, interval: 0.52 },
      { type: "split", count: 14, interval: 0.52 }, { type: "ghost", count: 14, interval: 0.50 },
      { type: "healer", count: 10, interval: 0.58 }, { type: "boss", count: 2, interval: 0.85 }
    ],
    [
      { type: "armor", count: 20, interval: 0.46 }, { type: "split", count: 18, interval: 0.48 },
      { type: "ghost", count: 18, interval: 0.46 }, { type: "healer", count: 12, interval: 0.54 },
      { type: "boss", count: 3, interval: 0.80 }
    ],
    [{ type: "boss", count: 8, interval: 1.50 }]
  ];

  const elements = {
    canvas: document.getElementById("game-canvas"),
    boardFrame: document.getElementById("board-frame"),
    status: document.getElementById("status-line"),
    toast: document.getElementById("board-toast"),
    wave: document.getElementById("wave-value"),
    phase: document.getElementById("phase-value"),
    countdown: document.getElementById("countdown-value"),
    core: document.getElementById("core-value"),
    coreFill: document.getElementById("core-meter-fill"),
    gold: document.getElementById("gold-value"),
    best: document.getElementById("best-value"),
    start: document.getElementById("start-button"),
    pause: document.getElementById("pause-button"),
    resume: document.getElementById("resume-button"),
    restart: document.getElementById("restart-button"),
    resultRestart: document.getElementById("result-restart"),
    buy: document.getElementById("buy-button"),
    purchaseCount: document.getElementById("purchase-count"),
    tray: document.getElementById("dice-tray"),
    trayHint: document.getElementById("tray-hint"),
    dragPreview: document.getElementById("drag-preview"),
    inspector: document.getElementById("inspector"),
    pauseCover: document.getElementById("pause-cover"),
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
      const stored = window.localStorage.getItem("puzzle.diceTowerDefense.v1");
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
      window.localStorage.setItem("puzzle.diceTowerDefense.v1", JSON.stringify(profile));
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
    if (wave >= 23) return 50;
    if (wave >= 20) return 45;
    if (wave >= 15) return 40;
    if (wave >= 10) return 35;
    if (wave >= 5) return 30;
    return 25;
  }

  function getEnemyHpMultiplier(wave) {
    const standardGrowth = (wave - 1) * 0.12;
    const midGameGrowth = Math.max(0, wave - 4) * 0.03;
    const lateGameGrowth = Math.max(0, wave - 9) * 0.04;
    const baseMultiplier = 1 + standardGrowth + midGameGrowth + lateGameGrowth;
    const bracketMultiplier = wave >= 21 ? 2 : wave >= 16 ? 1.75 : wave >= 11 ? 1.5 : wave >= 6 ? 1.25 : 1;
    return baseMultiplier * bracketMultiplier;
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
      totalInvested: totalInvested || 0,
      forcedCrit: false,
      buildDuration: constructionTime,
      buildRemaining: constructionTime,
      attackPulseRemaining: 0
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
      score: 0,
      killGold: 0,
      bossKills: 0,
      towers: [
        createTower("cannon", 1, 0, 1, 0),
        createTower("cannon", 3, 0, 1, 0),
        createTower("frost", 5, 0, 1, 0)
      ],
      diceBag: [],
      enemies: [],
      effects: [],
      spawnSegments: [],
      spawnTimer: 0,
      enemyOrder: 0,
      waveStats: { kills: 0, leaks: 0 },
      selectedTowerId: null,
      selectedDieId: null,
      toastRemaining: 0,
      toastText: ""
    };
  }

  function markUiDirty() {
    uiDirty = true;
  }

  function resetGame() {
    nextId = 1;
    state = createInitialState();
    pointerStart = null;
    canvasDragState = null;
    trayDragState = null;
    hideDragPreview();
    elements.resultCover.hidden = true;
    elements.pauseCover.hidden = true;
    showToast("準備你的防線。", 2.5);
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
    state.spawnSegments = getWaveEntries(state.wave).map(function (entry) {
      return { type: entry.type, remaining: entry.count, interval: entry.interval };
    });
    state.spawnTimer = 0;
    state.waveStats = { kills: 0, leaks: 0 };
    showToast("第 " + state.wave + " 波開始！", 1.6);
    markUiDirty();
  }

  function beginNextWave() {
    state.wave += 1;
    state.gold += WAVE_REWARD;
    state.prepRemaining = getPreparationSeconds(state.wave);
    state.resultRemaining = 0;
    state.phase = "preparation";
    finishAllConstruction();
    state.selectedTowerId = null;
    state.selectedDieId = null;
    showToast("獲得 " + WAVE_REWARD + " 金幣。", 2.5);
    markUiDirty();
  }

  function finishWave() {
    state.clearedWaves = Math.max(state.clearedWaves, state.wave);
    state.score = calculateScore();
    state.effects = state.effects.filter(function (effect) { return effect.kind === "bossExplosion"; });
    state.phase = "waveResult";
    state.resultRemaining = state.wave >= WAVES.length ? 1.5 : 2;
    showToast(state.wave >= WAVES.length ? "最終首領已擊破！" : "第 " + state.wave + " 波守住了。", 2);
    markUiDirty();
  }

  function finishGame(won) {
    state.phase = won ? "victory" : "defeat";
    state.paused = false;
    state.score = calculateScore();
    profile.bestScore = Math.max(profile.bestScore, state.score);
    profile.bestWave = Math.max(profile.bestWave, state.clearedWaves);
    saveProfile();
    elements.pauseCover.hidden = true;
    elements.resultCover.hidden = false;
    elements.resultKicker.textContent = won ? "CORE SECURED" : "DEFENSE BROKEN";
    elements.resultTitle.textContent = won ? "守住了！" : "城門失守。";
    elements.resultCopy.textContent = won
      ? "你成功守住 " + WAVES.length + " 波敵人，骰塔之間的配合非常漂亮。"
      : "核心耐久歸零了。調整塔的位置與合成時機，再試一次。";
    elements.resultWave.textContent = String(state.clearedWaves);
    elements.resultScore.textContent = String(state.score);
    elements.resultCore.textContent = String(state.coreHp);
    markUiDirty();
  }

  function calculateScore() {
    return state.killGold * 10 + state.clearedWaves * 100 + state.coreHp * 25 + state.bossKills * 250;
  }

  function updatePreparation(deltaTime) {
    state.prepRemaining -= deltaTime;
    if (state.prepRemaining <= 0) {
      state.prepRemaining = 0;
      beginCombat();
    }
  }

  function updateWaveResult(deltaTime) {
    state.resultRemaining -= deltaTime;
    if (state.resultRemaining > 0) return;
    if (state.wave >= WAVES.length) finishGame(true);
    else beginNextWave();
  }

  function updateCombat(deltaTime) {
    state.waveElapsed = (state.waveElapsed || 0) + deltaTime;
    updateSpawner(deltaTime);
    updateEnemyStatuses(deltaTime);
    updateTowers(deltaTime);
    updateEnemyMovement(deltaTime);
    cleanupEntities();

    if (state.phase === "combat" && state.spawnSegments.length === 0 && state.enemies.length === 0) {
      finishWave();
    }
  }

  function updateSpawner(deltaTime) {
    if (state.spawnSegments.length === 0) return;
    state.spawnTimer -= deltaTime;
    if (state.spawnTimer > 0) return;

    const segment = state.spawnSegments[0];
    spawnEnemy(segment.type);
    segment.remaining -= 1;
    if (segment.remaining <= 0) {
      state.spawnSegments.shift();
      state.spawnTimer = 0;
    } else {
      state.spawnTimer = segment.interval;
    }
  }

  function spawnEnemy(type, startingDistance) {
    const definition = ENEMY_TYPES[type];
    const waveMultiplier = getEnemyHpMultiplier(state.wave);
    const bossMultiplier = definition.boss ? 1.25 : 1;
    const maximumHp = Math.round(definition.hp * waveMultiplier * bossMultiplier);
    const enemy = {
      id: createId("enemy"),
      order: state.enemyOrder,
      type,
      pathDistance: startingDistance === undefined ? 0 : startingDistance,
      hp: maximumHp,
      maxHp: maximumHp,
      speed: Math.min(definition.speed * (1 + (state.wave - 1) * 0.015), definition.speed * 1.35),
      shield: getEnemyShield(definition, maximumHp),
      slow: 0,
      slowRemaining: 0,
      frozenRemaining: 0,
      poisonRemaining: 0,
      poisonDps: 0,
      poisonTick: 1,
      invisibleRemaining: 0,
      ghostTimer: type === "ghost" ? 6 : 0,
      healerTimer: type === "healer" ? 3 : 0,
      bossTimer: definition.boss ? 8 : 0,
      dead: false
    };
    state.enemyOrder += 1;
    state.enemies.push(enemy);
    addEffect({ kind: "spawn", x: getPathPosition(enemy.pathDistance).x, y: getPathPosition(enemy.pathDistance).y, color: definition.color, ttl: 0.45 });
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
    const shieldRatio = 0.12 + (state.wave - SHIELDED_WAVE_START) * 0.04;
    return Math.max(bossShield, Math.round(maximumHp * shieldRatio));
  }

  function updateEnemyStatuses(deltaTime) {
    state.enemies.forEach(function (enemy) {
      if (enemy.dead) return;

      if (enemy.poisonRemaining > 0) {
        enemy.poisonRemaining -= deltaTime;
        enemy.poisonTick -= deltaTime;
        if (enemy.poisonTick <= 0) {
          enemy.poisonTick += 1;
          damageEnemy(enemy, enemy.poisonDps, "poison");
        }
      }

      enemy.slowRemaining = Math.max(0, enemy.slowRemaining - deltaTime);
      if (enemy.slowRemaining === 0) enemy.slow = 0;
      enemy.frozenRemaining = Math.max(0, enemy.frozenRemaining - deltaTime);

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
          enemy.healerTimer = 3;
          healNearbyEnemies(enemy);
        }
      }

      if (enemy.type === "boss") {
        enemy.bossTimer -= deltaTime;
        if (enemy.bossTimer <= 0) {
          enemy.bossTimer = 8;
          if (state.wave >= 15) {
            state.enemies.forEach(function (otherEnemy) {
              if (!otherEnemy.dead && otherEnemy.type !== "boss") otherEnemy.speedBoostRemaining = 3;
            });
            addEffect({ kind: "bossPulse", x: getPathPosition(enemy.pathDistance).x, y: getPathPosition(enemy.pathDistance).y, color: "#ffbf62", ttl: 0.8 });
          }
          if (state.wave >= 10 && state.wave < WAVES.length && enemy.hp <= enemy.maxHp * 0.5 && !enemy.hasSummoned) {
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
    const sourcePosition = getPathPosition(source.pathDistance);
    state.enemies.forEach(function (enemy) {
      if (enemy.dead || enemy === source) return;
      const position = getPathPosition(enemy.pathDistance);
      if (Math.hypot(position.x - sourcePosition.x, position.y - sourcePosition.y) <= 2) {
        enemy.hp = Math.min(enemy.maxHp, enemy.hp + enemy.maxHp * 0.08);
        addEffect({ kind: "heal", x: position.x, y: position.y, color: "#78d8ae", ttl: 0.55 });
      }
    });
  }

  function updateEnemyMovement(deltaTime) {
    state.enemies.forEach(function (enemy) {
      if (enemy.dead) return;
      if (enemy.frozenRemaining > 0) return;
      const slowMultiplier = 1 - (enemy.slowRemaining > 0 ? enemy.slow : 0);
      const boostMultiplier = enemy.speedBoostRemaining > 0 ? 1.2 : 1;
      enemy.pathDistance += enemy.speed * slowMultiplier * boostMultiplier * deltaTime;
      if (enemy.pathDistance >= GATE_DISTANCE) leakEnemy(enemy);
    });
  }

  function leakEnemy(enemy) {
    if (enemy.dead) return;
    enemy.dead = true;
    state.waveStats.leaks += 1;
    state.coreHp = Math.max(0, state.coreHp - ENEMY_TYPES[enemy.type].leakDamage);
    const position = getPathPosition(GATE_DISTANCE);
    addEffect({ kind: "leak", x: position.x, y: position.y, color: "#ff7d78", ttl: 0.8 });
    showToast("核心受到 " + ENEMY_TYPES[enemy.type].leakDamage + " 點傷害！", 1.5);
    if (state.coreHp <= 0) finishGame(false);
  }

  function updateTowers(deltaTime) {
    state.towers.forEach(function (tower) {
      tower.attackPulseRemaining = Math.max(0, tower.attackPulseRemaining - deltaTime);
      if (isTowerConstructing(tower)) {
        tower.buildRemaining = Math.max(0, tower.buildRemaining - deltaTime);
        if (tower.buildRemaining === 0) finishTowerConstruction(tower, true);
        else if (state.selectedTowerId === tower.id) markUiDirty();
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
    let interval = tierData.interval;
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
    const tierIndex = Math.max(0, Math.min(CRIT_CHANCES.length - 1, tower.tier - 1));
    return CRIT_CHANCES[tierIndex];
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
    return state.enemies
      .filter(function (enemy) {
        if (enemy.dead || enemy.invisibleRemaining > 0) return false;
        return isTowerInRange(tower, getPathPosition(enemy.pathDistance).x, getPathPosition(enemy.pathDistance).y, range);
      })
      .sort(function (first, second) {
        const remainingDifference = (GATE_DISTANCE - first.pathDistance) - (GATE_DISTANCE - second.pathDistance);
        return remainingDifference || first.order - second.order;
      })[0] || null;
  }

  function isTowerInRange(tower, x, y, range) {
    const tierData = TOWER_TYPES[tower.type].tiers[tower.tier - 1];
    const actualRange = range === undefined ? tierData.range : range;
    return Math.hypot(tower.x - x, tower.y - y) <= actualRange;
  }

  function addProjectileEffect(tower, target, style, color, duration) {
    const targetPosition = getPathPosition(target.pathDistance);
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
    const baseDamage = tierData.damage * (critical ? CRIT_DAMAGE_MULTIPLIER : 1);

    if (tower.type === "cannon") {
      addProjectileEffect(tower, target, "cannon", TOWER_TYPES.cannon.color, 0.34);
      hit = damageEnemy(target, baseDamage, "direct");
      if (critical && hit) {
        const targetPosition = getPathPosition(target.pathDistance);
        state.enemies.forEach(function (enemy) {
          if (!enemy.dead && Math.hypot(getPathPosition(enemy.pathDistance).x - targetPosition.x, getPathPosition(enemy.pathDistance).y - targetPosition.y) <= 1) {
            damageEnemy(enemy, baseDamage * 0.8, "direct");
          }
        });
        addEffect({ kind: "burst", x: targetPosition.x, y: targetPosition.y, color: TOWER_TYPES.cannon.color, ttl: 0.45 });
      }
    } else if (tower.type === "frost") {
      addProjectileEffect(tower, target, "frost", TOWER_TYPES.frost.color, 0.28);
      hit = damageEnemy(target, baseDamage, "direct");
      if (hit) applySlow(target, TOWER_TYPES.frost.slow[tower.tier - 1], 2);
      if (critical && hit) {
        target.frozenRemaining = Math.max(target.frozenRemaining, 1.2);
        addEffect({ kind: "freeze", x: getPathPosition(target.pathDistance).x, y: getPathPosition(target.pathDistance).y, color: TOWER_TYPES.frost.color, ttl: 0.7 });
      }
    } else if (tower.type === "poison") {
      addProjectileEffect(tower, target, "poison", TOWER_TYPES.poison.color, 0.36);
      hit = damageEnemy(target, baseDamage, "direct");
      if (hit) applyPoison(target, baseDamage, tower.tier);
      if (critical && hit) {
        const targetPosition = getPathPosition(target.pathDistance);
        const nearby = getNearbyEnemies(targetPosition.x, targetPosition.y, 1.5, [target]).slice(0, 2);
        nearby.forEach(function (enemy) {
          damageEnemy(enemy, baseDamage, "direct");
          applyPoison(enemy, baseDamage, tower.tier);
        });
        addEffect({ kind: "burst", x: targetPosition.x, y: targetPosition.y, color: TOWER_TYPES.poison.color, ttl: 0.45 });
      }
    } else if (tower.type === "chain") {
      const maximum = critical ? state.enemies.length : TOWER_TYPES.chain.chainCount[tower.tier - 1];
      const targets = getNearbyEnemies(getPathPosition(target.pathDistance).x, getPathPosition(target.pathDistance).y, tierData.range, [target]).slice(0, Math.max(0, maximum - 1));
      const chainTargets = [target].concat(targets);
      chainTargets.forEach(function (enemy, index) {
        const attenuation = critical ? 1 : [1, 0.65, 0.45, 0.32, 0.24][index] || 0.2;
        hit = damageEnemy(enemy, baseDamage * attenuation, "direct") || hit;
        if (index > 0) {
          addEffect({ kind: "lightning", x1: getPathPosition(chainTargets[index - 1].pathDistance).x, y1: getPathPosition(chainTargets[index - 1].pathDistance).y, x2: getPathPosition(enemy.pathDistance).x, y2: getPathPosition(enemy.pathDistance).y, color: TOWER_TYPES.chain.color, ttl: 0.3 });
        }
      });
      addEffect({ kind: "lightning", x1: tower.x, y1: tower.y, x2: getPathPosition(target.pathDistance).x, y2: getPathPosition(target.pathDistance).y, color: TOWER_TYPES.chain.color, ttl: 0.3 });
    } else if (tower.type === "pierce") {
      const maximum = critical ? state.enemies.length : TOWER_TYPES.pierce.pierceCount[tower.tier - 1];
      const targets = state.enemies.filter(function (enemy) {
        if (enemy.dead || enemy.invisibleRemaining > 0) return false;
        const position = getPathPosition(enemy.pathDistance);
        return isTowerInRange(tower, position.x, position.y, tierData.range);
      }).sort(function (first, second) {
        return first.pathDistance - second.pathDistance;
      }).slice(0, maximum);
      targets.forEach(function (enemy) {
        hit = damageEnemy(enemy, baseDamage, "direct") || hit;
      });
      if (targets.length > 0) addProjectileEffect(tower, targets[targets.length - 1], "pierce", TOWER_TYPES.pierce.color, 0.3);
    }

    if (critical && hit) {
      const targetPosition = getPathPosition(target.pathDistance);
      addEffect({ kind: "critical", x: targetPosition.x, y: targetPosition.y, color: "#ffd477", ttl: 0.72 });
    }
    if (state.selectedTowerId === tower.id) markUiDirty();
  }

  function getNearbyEnemies(x, y, range, excluded) {
    return state.enemies.filter(function (enemy) {
      if (enemy.dead || enemy.invisibleRemaining > 0 || excluded.indexOf(enemy) !== -1) return false;
      const position = getPathPosition(enemy.pathDistance);
      return Math.hypot(position.x - x, position.y - y) <= range;
    }).sort(function (first, second) {
      return (GATE_DISTANCE - first.pathDistance) - (GATE_DISTANCE - second.pathDistance) || first.order - second.order;
    });
  }

  function damageEnemy(enemy, amount, source) {
    if (!enemy || enemy.dead) return false;
    let finalDamage = amount;
    const definition = ENEMY_TYPES[enemy.type];
    if (source === "direct" && definition.directResistance) finalDamage *= 1 - definition.directResistance;
    if (enemy.shield > 0) {
      const absorbed = Math.min(enemy.shield, finalDamage);
      enemy.shield -= absorbed;
      finalDamage -= absorbed;
      if (absorbed > 0) addEffect({ kind: "shield", x: getPathPosition(enemy.pathDistance).x, y: getPathPosition(enemy.pathDistance).y, color: "#ffe0a6", ttl: 0.28 });
    }
    if (finalDamage > 0) enemy.hp -= finalDamage;
    addEffect({ kind: source === "poison" ? "poisonHit" : "hit", x: getPathPosition(enemy.pathDistance).x, y: getPathPosition(enemy.pathDistance).y, color: source === "poison" ? "#9ad86f" : definition.color, ttl: 0.32 });
    if (enemy.hp <= 0) killEnemy(enemy);
    return true;
  }

  function applySlow(enemy, amount, duration) {
    if (!enemy || enemy.dead) return;
    if (enemy.frozenRemaining > 0) return;
    if (amount >= enemy.slow) enemy.slow = amount;
    enemy.slowRemaining = Math.max(enemy.slowRemaining, duration);
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
    const position = getPathPosition(enemy.pathDistance);
    state.waveStats.kills += 1;
    state.killGold += definition.reward;
    state.gold += definition.reward;
    addEffect({ kind: "gold", x: position.x, y: position.y, amount: definition.reward, color: "#ffd477", ttl: 1 });
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
    state.enemies = state.enemies.filter(function (enemy) { return !enemy.dead; });
  }

  function addEffect(effect) {
    if (profile.settings.reducedEffects && (effect.kind === "beam" || effect.kind === "hit" || effect.kind === "poisonHit")) return;
    state.effects.push({ ...effect, maxTtl: effect.ttl });
  }

  function updateEffects(deltaTime) {
    state.effects.forEach(function (effect) { effect.ttl -= deltaTime; });
    state.effects = state.effects.filter(function (effect) { return effect.ttl > 0; });
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

  function purchaseDie() {
    if (!isMarketOpen()) return;
    if (state.gold < BUY_COST) {
      showToast("金幣不足，需要 25 金幣。", 1.8);
      return;
    }
    const types = Object.keys(TOWER_TYPES);
    const type = types[Math.floor(Math.random() * types.length)];
    state.gold -= BUY_COST;
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
    target.tier += 1;
    target.forcedCrit = false;
    target.totalInvested += material.totalInvested;
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
    target.tier += 1;
    target.forcedCrit = false;
    target.totalInvested += die.totalInvested;
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
    const refund = Math.floor(tower.totalInvested * 0.6);
    state.gold += refund;
    state.towers = state.towers.filter(function (item) { return item.id !== tower.id; });
    state.selectedTowerId = null;
    showToast("出售骰塔，返還 " + refund + " 金幣。", 1.5);
    markUiDirty();
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
      : formatDamage(tierData.damage);
    const interval = getTowerInterval(tower).toFixed(2) + "s";
    const canEdit = isPreparation();
    const canSell = isMarketOpen();
    const constructing = isTowerConstructing(tower);
    const constructionHtml = constructing
      ? '<div class="construction-row"><span>施工中</span><strong>' + tower.buildRemaining.toFixed(1) + 's</strong><b>暫停所有功能</b></div>'
      : "";
    const actionHtml = canSell
      ? (canEdit ? "" : '<div class="inspector-mode-note">戰鬥中可建造、拖曳合成與出售；移動及交換位置需等到準備階段。</div>') + '<div class="inspector-actions is-single"><button class="button button-danger" data-inspector-action="sell" type="button">出售（' + Math.floor(tower.totalInvested * 0.6) + ' G）</button></div>'
      : '<div class="inspector-mode-note">目前只能查看骰塔資訊。</div>';
    const critStatus = constructing ? '<b>施工中停用</b>' : tower.forcedCrit ? '<b class="is-ready">下一擊必定爆擊</b>' : '<b>自然爆擊</b>';
    elements.inspector.innerHTML = '<div class="tower-inspector">' +
      '<div class="tower-inspector-heading"><span class="tower-symbol" style="--tower-color:' + type.color + '">' + type.symbol + '</span><div><strong>' + type.name + ' · 等級 ' + tower.tier + '</strong><small>位置 ' + tower.x + ',' + tower.y + '</small></div></div>' +
      '<div class="tower-stat-grid"><div class="tower-stat"><span>傷害／增益</span><strong>' + damage + '</strong></div><div class="tower-stat"><span>射程</span><strong>' + tierData.range + '</strong></div><div class="tower-stat"><span>間隔</span><strong>' + interval + '</strong></div></div>' +
      constructionHtml +
      '<div class="crit-row"><span>爆擊機率</span><strong>' + Math.round(getCritChance(tower) * 100) + '%</strong>' + critStatus + '</div>' +
      '<p class="inspector-description">' + type.description + '</p>' +
      actionHtml +
      '</div>';
  }

  function renderHud() {
    const phaseName = { preparation: "準備中", combat: "戰鬥中", waveResult: "結算中", victory: "已勝利", defeat: "已失守" }[state.phase];
    elements.wave.textContent = state.wave + " / " + WAVES.length;
    elements.phase.textContent = state.paused ? "已暫停" : phaseName;
    elements.core.textContent = state.coreHp + " / " + INITIAL_CORE_HP;
    elements.coreFill.style.transform = "scaleX(" + (state.coreHp / INITIAL_CORE_HP) + ")";
    elements.gold.textContent = String(state.gold);
    elements.best.textContent = String(Math.max(profile.bestScore, state.score));
    if (elements.purchaseCount) elements.purchaseCount.textContent = "不限";
    elements.status.textContent = getStatusText();

    if (state.phase === "preparation") {
      elements.countdown.textContent = Math.ceil(state.prepRemaining) + "s";
      elements.start.innerHTML = "開始第 " + state.wave + " 波 <span aria-hidden=\"true\">→</span>";
    } else if (state.phase === "combat") {
      elements.countdown.textContent = "LIVE";
      elements.start.textContent = "戰鬥進行中";
    } else if (state.phase === "waveResult") {
      elements.countdown.textContent = Math.ceil(state.resultRemaining) + "s";
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

  function getStatusText() {
    if (state.paused) return "戰場暫停中。";
    if (state.phase === "preparation") return state.selectedDieId ? "選好的骰子，現在可以部署。" : "準備你的防線。";
    if (state.phase === "combat") return "骰塔自動索敵；戰鬥中可購買、建造、合成與出售。";
    if (state.phase === "waveResult") return "波次結算中，下一波很快開始。";
    if (state.phase === "victory") return "所有波次完成，城門安全。";
    return "核心耐久歸零，防線需要重新部署。";
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
    state.enemies.forEach(drawEnemy);
    state.effects.forEach(drawEffect);
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

  function drawEnemy(enemy) {
    const definition = ENEMY_TYPES[enemy.type];
    const position = getPathPosition(enemy.pathDistance);
    const center = gridCenter(position.x, position.y);
    const radius = canvasMetrics.cell * (definition.boss ? 0.34 : 0.25) * ENEMY_VISUAL_SCALE;
    const sprite = enemySprites[enemy.type];
    const spriteScale = definition.boss ? 0.82 : enemy.type === "child" ? 0.46 : 0.6;
    const spriteSize = canvasMetrics.cell * spriteScale * ENEMY_VISUAL_SCALE;
    const bob = Math.sin(performance.now() / 155 + enemy.order * 1.7) * canvasMetrics.cell * 0.025 * ENEMY_VISUAL_SCALE;
    ctx.save();
    ctx.globalAlpha = enemy.invisibleRemaining > 0 ? 0.2 : 1;
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
      ctx.drawImage(sprite, center.x - spriteSize / 2, center.y - spriteSize / 2 + bob, spriteSize, spriteSize);
      ctx.restore();
    } else {
      ctx.fillStyle = definition.color;
      ctx.font = "950 " + Math.max(8, canvasMetrics.cell * (definition.boss ? 0.16 : 0.13)) * ENEMY_VISUAL_SCALE + "px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(definition.symbol, center.x, center.y + ENEMY_VISUAL_SCALE);
    }

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
    ctx.fillText("+" + effect.amount + " G", center.x - size * 0.06, y);
    ctx.restore();
  }

  function drawEffect(effect) {
    const progress = 1 - effect.ttl / effect.maxTtl;
    const alpha = Math.max(0, effect.ttl / effect.maxTtl);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.lineCap = "round";
    if (effect.kind === "gold") {
      drawGoldEffect(effect, progress);
    } else if (effect.kind === "critical") {
      drawCriticalEffect(effect, progress);
    } else if (effect.kind === "merge") {
      drawMergeEffect(effect, progress);
    } else if (effect.kind === "bossExplosion") {
      drawBossExplosion(effect, progress);
    } else if (effect.kind === "projectile") {
      drawProjectile(effect, progress);
    } else if (effect.kind === "lightning") {
      drawLightning(effect, progress);
    } else if (effect.kind === "burst" || effect.kind === "bossPulse" || effect.kind === "inspire" || effect.kind === "pulse" || effect.kind === "critReady" || effect.kind === "buildComplete") {
      const center = gridCenter(effect.x, effect.y);
      const expansion = effect.kind === "bossPulse" ? 1.5 : effect.kind === "critReady" ? 0.45 : 0.75;
      ctx.beginPath(); ctx.arc(center.x, center.y, canvasMetrics.cell * (0.22 + progress * expansion), 0, Math.PI * 2);
      ctx.strokeStyle = effect.color; ctx.lineWidth = Math.max(2, canvasMetrics.cell * 0.055); ctx.shadowColor = effect.color; ctx.shadowBlur = 12; ctx.stroke();
    } else if (effect.kind === "hit" || effect.kind === "poisonHit" || effect.kind === "shield" || effect.kind === "heal" || effect.kind === "freeze" || effect.kind === "death" || effect.kind === "spawn" || effect.kind === "leak") {
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
    if (state.phase === "victory" || state.phase === "defeat") return;
    state.paused = !state.paused;
    elements.pauseCover.hidden = !state.paused;
    showToast(state.paused ? "戰場暫停中。" : "繼續守住核心。", 1.2);
    markUiDirty();
  }

  function handleKeyDown(event) {
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
  elements.restart.addEventListener("click", function () {
    if (window.confirm("要重新開始這一局嗎？")) resetGame();
  });
  elements.resultRestart.addEventListener("click", resetGame);
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
    if (document.visibilityState === "hidden" && !state.paused && state.phase !== "victory" && state.phase !== "defeat") togglePause();
  });
  window.addEventListener("resize", resizeCanvas);

  resetGame();
  resizeCanvas();
  render();
  animationFrame = window.requestAnimationFrame(loop);
})();
