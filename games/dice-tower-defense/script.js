(function () {
  "use strict";

  const COLS = 10;
  const ROWS = 8;
  const PREPARATION_SECONDS = 25;
  const WAVE_REWARD = 35;
  const BUY_COST = 25;
  const MAX_PURCHASES_PER_WAVE = 5;
  const MAX_DICE_BAG = 8;
  const MAX_REROLL_TICKETS = 5;
  const INITIAL_CORE_HP = 20;
  const GATE_DISTANCE = 14.75;
  const PATH = [
    [0, 1], [1, 1], [2, 1], [2, 2], [2, 3],
    [3, 3], [4, 3], [5, 3], [5, 4], [5, 5],
    [6, 5], [7, 5], [7, 6], [8, 6], [9, 6]
  ];
  const BUILD_SLOTS = [
    [0, 0], [1, 0], [3, 0], [3, 1],
    [0, 2], [1, 2], [3, 2], [4, 2], [6, 2], [7, 2],
    [1, 3],
    [2, 4], [3, 4], [4, 4], [6, 4], [4, 5]
  ];

  const FACE_MULTIPLIERS = {
    1: 0.60,
    2: 0.75,
    3: 0.90,
    4: 1.05,
    5: 1.25,
    6: 1.50
  };

  const TOWER_TYPES = {
    cannon: {
      name: "炮擊骰",
      symbol: "✹",
      color: "#ff9b65",
      description: "穩定的單體輸出，滿充能後以目標為中心爆炸。",
      tiers: [
        { damage: 18, range: 3, interval: 1.2 },
        { damage: 38, range: 3.5, interval: 1.0 },
        { damage: 82, range: 4, interval: 0.8 }
      ]
    },
    frost: {
      name: "霜凍骰",
      symbol: "❄",
      color: "#71d8f4",
      description: "降低敵人速度，滿充能後將目標凍結。",
      slow: [0.20, 0.28, 0.38],
      tiers: [
        { damage: 7, range: 3, interval: 1.0 },
        { damage: 15, range: 3.5, interval: 0.95 },
        { damage: 32, range: 4, interval: 0.9 }
      ]
    },
    poison: {
      name: "毒蝕骰",
      symbol: "☣",
      color: "#9ad86f",
      description: "施加持續毒傷，滿充能後讓毒液跳向附近敵人。",
      tiers: [
        { damage: 5, range: 2.5, interval: 0.9 },
        { damage: 11, range: 3, interval: 0.85 },
        { damage: 24, range: 3.5, interval: 0.8 }
      ]
    },
    chain: {
      name: "連鎖骰",
      symbol: "⚡",
      color: "#f6cf63",
      description: "讓傷害跳向敵群，滿充能後連鎖不衰減。",
      chainCount: [2, 3, 5],
      tiers: [
        { damage: 10, range: 3, interval: 1.1 },
        { damage: 22, range: 3.5, interval: 1.0 },
        { damage: 48, range: 4, interval: 0.9 }
      ]
    },
    pierce: {
      name: "穿刺骰",
      symbol: "➹",
      color: "#d4a4ff",
      description: "沿道路順序穿透敵人，滿充能後貫穿整條道路。",
      pierceCount: [2, 4, 7],
      tiers: [
        { damage: 13, range: 4, interval: 1.4 },
        { damage: 28, range: 4.5, interval: 1.25 },
        { damage: 60, range: 5, interval: 1.1 }
      ]
    },
    inspire: {
      name: "鼓舞骰",
      symbol: "✦",
      color: "#ffcf85",
      description: "強化周圍骰塔的攻速，滿充能後短暫提高傷害。",
      bonus: [0.08, 0.14, 0.22],
      tiers: [
        { range: 2.5, interval: 1.4 },
        { range: 3, interval: 1.25 },
        { range: 3.5, interval: 1.1 }
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

  const WAVES = [
    [{ type: "runner", count: 8, interval: 1.4 }],
    [{ type: "runner", count: 10, interval: 1.3 }, { type: "armor", count: 3, interval: 1.3 }],
    [{ type: "runner", count: 8, interval: 1.2 }, { type: "armor", count: 5, interval: 1.2 }, { type: "runner", count: 4, interval: 1.2 }],
    [{ type: "armor", count: 8, interval: 1.1 }, { type: "runner", count: 8, interval: 1.1 }],
    [{ type: "runner", count: 8, interval: 1.2 }, { type: "armor", count: 5, interval: 1.2 }, { type: "boss", count: 1, interval: 1.2 }],
    [{ type: "runner", count: 12, interval: 1.1 }, { type: "split", count: 4, interval: 1.1 }],
    [{ type: "armor", count: 8, interval: 1.0 }, { type: "split", count: 6, interval: 1.0 }, { type: "runner", count: 8, interval: 1.0 }],
    [{ type: "ghost", count: 6, interval: 1.0 }, { type: "runner", count: 12, interval: 1.0 }, { type: "armor", count: 6, interval: 1.0 }],
    [{ type: "split", count: 8, interval: 0.95 }, { type: "ghost", count: 8, interval: 0.95 }, { type: "armor", count: 8, interval: 0.95 }],
    [{ type: "runner", count: 10, interval: 1.0 }, { type: "ghost", count: 8, interval: 1.0 }, { type: "boss", count: 1, interval: 1.0 }],
    [{ type: "healer", count: 4, interval: 1.0 }, { type: "armor", count: 8, interval: 1.0 }, { type: "runner", count: 10, interval: 1.0 }],
    [{ type: "healer", count: 6, interval: 0.9 }, { type: "split", count: 8, interval: 0.9 }, { type: "ghost", count: 8, interval: 0.9 }],
    [{ type: "armor", count: 10, interval: 0.85 }, { type: "healer", count: 6, interval: 0.85 }, { type: "runner", count: 12, interval: 0.85 }],
    [{ type: "ghost", count: 10, interval: 0.8 }, { type: "split", count: 10, interval: 0.8 }, { type: "healer", count: 8, interval: 0.8 }],
    [
      { type: "runner", count: 12, interval: 0.85 }, { type: "armor", count: 10, interval: 0.85 },
      { type: "split", count: 8, interval: 0.85 }, { type: "ghost", count: 8, interval: 0.85 },
      { type: "healer", count: 5, interval: 0.85 }, { type: "boss", count: 1, interval: 0.85 }
    ]
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
    gateHp: document.getElementById("gate-hp-badge"),
    gold: document.getElementById("gold-value"),
    reroll: document.getElementById("reroll-value"),
    best: document.getElementById("best-value"),
    nextWave: document.getElementById("next-wave-label"),
    wavePreview: document.getElementById("wave-preview"),
    start: document.getElementById("start-button"),
    pause: document.getElementById("pause-button"),
    resume: document.getElementById("resume-button"),
    restart: document.getElementById("restart-button"),
    resultRestart: document.getElementById("result-restart"),
    buy: document.getElementById("buy-button"),
    purchaseCount: document.getElementById("purchase-count"),
    tray: document.getElementById("dice-tray"),
    trayHint: document.getElementById("tray-hint"),
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
  let state;
  let animationFrame = null;
  let lastFrameTime = null;
  let nextId = 1;
  let canvasMetrics = { width: 0, height: 0, dpr: 1, cell: 0, offsetX: 0, offsetY: 0 };
  let pointerStart = null;
  let uiDirty = true;
  let profile = loadProfile();

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

  function randomFace() {
    return Math.floor(Math.random() * 6) + 1;
  }

  function createTower(type, x, y, face, tier, totalInvested) {
    return {
      id: createId("tower"),
      type,
      x,
      y,
      face: face || randomFace(),
      tier: tier || 1,
      charge: 0,
      cooldown: 0.2,
      totalInvested: totalInvested || 0,
      specialRemaining: 0
    };
  }

  function createInitialState() {
    return {
      phase: "preparation",
      paused: false,
      wave: 1,
      clearedWaves: 0,
      prepRemaining: PREPARATION_SECONDS,
      resultRemaining: 0,
      gold: 120,
      coreHp: INITIAL_CORE_HP,
      rerollTickets: 2,
      score: 0,
      killGold: 0,
      bossKills: 0,
      purchasesThisWave: 0,
      towers: [
        createTower("cannon", 0, 0, 4, 1, 0),
        createTower("cannon", 1, 0, 3, 1, 0),
        createTower("frost", 3, 0, 4, 1, 0)
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
      pendingMerge: null,
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
    elements.resultCover.hidden = true;
    elements.pauseCover.hidden = true;
    showToast("準備你的防線。", 2.5);
    markUiDirty();
  }

  function isPreparation() {
    return state.phase === "preparation" && !state.paused;
  }

  function getWaveEntries(wave) {
    return WAVES[Math.max(0, Math.min(WAVES.length - 1, wave - 1))];
  }

  function wavePreviewText(wave) {
    const entries = getWaveEntries(wave);
    return entries.map(function (entry) {
      return ENEMY_TYPES[entry.type].name + " × " + entry.count;
    }).join("、");
  }

  function beginCombat() {
    if (state.phase !== "preparation" || state.paused) return;
    state.phase = "combat";
    state.spawnSegments = getWaveEntries(state.wave).map(function (entry) {
      return { type: entry.type, remaining: entry.count, interval: entry.interval };
    });
    state.spawnTimer = 0;
    state.waveStats = { kills: 0, leaks: 0 };
    state.selectedDieId = null;
    state.pendingMerge = null;
    showToast("第 " + state.wave + " 波開始！", 1.6);
    markUiDirty();
  }

  function beginNextWave() {
    state.wave += 1;
    state.gold += WAVE_REWARD;
    state.rerollTickets = Math.min(MAX_REROLL_TICKETS, state.rerollTickets + 2);
    state.prepRemaining = PREPARATION_SECONDS;
    state.resultRemaining = 0;
    state.phase = "preparation";
    state.purchasesThisWave = 0;
    state.selectedTowerId = null;
    state.selectedDieId = null;
    state.pendingMerge = null;
    showToast("獲得 " + WAVE_REWARD + " 金幣與 2 張重骰券。", 2.5);
    markUiDirty();
  }

  function finishWave() {
    state.clearedWaves = Math.max(state.clearedWaves, state.wave);
    state.score = calculateScore();
    if (state.wave >= WAVES.length) {
      finishGame(true);
      return;
    }
    state.phase = "waveResult";
    state.resultRemaining = 2;
    showToast("第 " + state.wave + " 波守住了。", 2);
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
      ? "你成功守住 15 波敵人，骰塔之間的配合非常漂亮。"
      : "核心耐久歸零了。調整塔的位置或保留重骰券，再試一次。";
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
    if (state.resultRemaining <= 0) beginNextWave();
  }

  function updateCombat(deltaTime) {
    state.waveElapsed = (state.waveElapsed || 0) + deltaTime;
    updateSpawner(deltaTime);
    updateEnemyStatuses(deltaTime);
    updateTowers(deltaTime);
    updateEnemyMovement(deltaTime);
    cleanupEntities();
    updateEffects(deltaTime);

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
    const waveMultiplier = 1 + (state.wave - 1) * 0.12;
    const bossMultiplier = definition.boss ? 1.25 : 1;
    const enemy = {
      id: createId("enemy"),
      order: state.enemyOrder,
      type,
      pathDistance: startingDistance === undefined ? 0 : startingDistance,
      hp: definition.hp * waveMultiplier * bossMultiplier,
      maxHp: definition.hp * waveMultiplier * bossMultiplier,
      speed: Math.min(definition.speed * (1 + (state.wave - 1) * 0.015), definition.speed * 1.35),
      shield: definition.boss ? getBossShield() : 0,
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
    if (state.wave >= 15) return 10;
    if (state.wave >= 10) return 6;
    return 3;
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
          if (state.wave >= 10 && enemy.hp <= enemy.maxHp * 0.5 && !enemy.hasSummoned) {
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
      tower.cooldown -= deltaTime;
      tower.specialRemaining = Math.max(0, tower.specialRemaining - deltaTime);
      if (tower.cooldown > 0 || state.phase !== "combat") return;

      const type = TOWER_TYPES[tower.type];
      const tierData = type.tiers[tower.tier - 1];
      tower.cooldown = getTowerInterval(tower);

      if (tower.type === "inspire") {
        pulseInspire(tower, tierData);
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

  function getTowerDamageMultiplier(tower) {
    let multiplier = 1;
    const inspire = state.towers.find(function (otherTower) {
      return otherTower.type === "inspire" && otherTower.specialRemaining > 0 && isTowerInRange(otherTower, tower.x, tower.y) && otherTower.id !== tower.id;
    });
    if (inspire) multiplier += 0.30;
    return multiplier;
  }

  function getStrongestInspireBonus(tower) {
    return state.towers.reduce(function (best, inspire) {
      if (inspire.type !== "inspire" || inspire.id === tower.id) return best;
      if (!isTowerInRange(inspire, tower.x, tower.y)) return best;
      const tierData = TOWER_TYPES.inspire.tiers[inspire.tier - 1];
      return Math.max(best, TOWER_TYPES.inspire.bonus[inspire.tier - 1] * FACE_MULTIPLIERS[inspire.face]);
    }, 0);
  }

  function pulseInspire(tower, tierData) {
    const affected = state.towers.some(function (otherTower) {
      return otherTower.id !== tower.id && isTowerInRange(tower, otherTower.x, otherTower.y);
    });
    if (!affected) return;
    const ready = tower.charge >= 3;
    if (ready) {
      tower.charge = 0;
      tower.specialRemaining = 5;
      addEffect({ kind: "inspire", x: tower.x, y: tower.y, color: TOWER_TYPES.inspire.color, ttl: 0.8 });
      showToast("鼓舞骰爆發！附近骰塔傷害提升。", 1.5);
    } else if (tower.face === 6) {
      tower.charge = Math.min(3, tower.charge + 1);
    }
    addEffect({ kind: "pulse", x: tower.x, y: tower.y, color: TOWER_TYPES.inspire.color, ttl: 0.35 });
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

  function fireTower(tower, target, tierData) {
    const faceMultiplier = FACE_MULTIPLIERS[tower.face];
    const specialReady = tower.charge >= 3;
    const damageMultiplier = getTowerDamageMultiplier(tower);
    let hit = false;
    const baseDamage = tierData.damage * faceMultiplier * damageMultiplier;

    if (tower.type === "cannon") {
      hit = damageEnemy(target, baseDamage, "direct");
      addEffect({ kind: "beam", x1: tower.x, y1: tower.y, x2: getPathPosition(target.pathDistance).x, y2: getPathPosition(target.pathDistance).y, color: TOWER_TYPES.cannon.color, ttl: 0.18 });
      if (specialReady && hit) {
        const targetPosition = getPathPosition(target.pathDistance);
        state.enemies.forEach(function (enemy) {
          if (!enemy.dead && Math.hypot(getPathPosition(enemy.pathDistance).x - targetPosition.x, getPathPosition(enemy.pathDistance).y - targetPosition.y) <= 1) {
            damageEnemy(enemy, baseDamage * 0.8, "direct");
          }
        });
        addEffect({ kind: "burst", x: targetPosition.x, y: targetPosition.y, color: TOWER_TYPES.cannon.color, ttl: 0.45 });
      }
    } else if (tower.type === "frost") {
      hit = damageEnemy(target, baseDamage, "direct");
      if (hit) applySlow(target, TOWER_TYPES.frost.slow[tower.tier - 1], 2);
      if (specialReady && hit) {
        target.frozenRemaining = Math.max(target.frozenRemaining, 1.2);
        addEffect({ kind: "freeze", x: getPathPosition(target.pathDistance).x, y: getPathPosition(target.pathDistance).y, color: TOWER_TYPES.frost.color, ttl: 0.7 });
      }
    } else if (tower.type === "poison") {
      hit = damageEnemy(target, baseDamage, "direct");
      if (hit) applyPoison(target, baseDamage, tower.tier);
      if (specialReady && hit) {
        const targetPosition = getPathPosition(target.pathDistance);
        const nearby = getNearbyEnemies(targetPosition.x, targetPosition.y, 1.5, [target]).slice(0, 2);
        nearby.forEach(function (enemy) {
          damageEnemy(enemy, baseDamage, "direct");
          applyPoison(enemy, baseDamage, tower.tier);
        });
        addEffect({ kind: "burst", x: targetPosition.x, y: targetPosition.y, color: TOWER_TYPES.poison.color, ttl: 0.45 });
      }
    } else if (tower.type === "chain") {
      const maximum = specialReady ? state.enemies.length : TOWER_TYPES.chain.chainCount[tower.tier - 1];
      const targets = getNearbyEnemies(getPathPosition(target.pathDistance).x, getPathPosition(target.pathDistance).y, tierData.range, [target]).slice(0, Math.max(0, maximum - 1));
      const chainTargets = [target].concat(targets);
      chainTargets.forEach(function (enemy, index) {
        const attenuation = specialReady ? 1 : [1, 0.65, 0.45, 0.32, 0.24][index] || 0.2;
        hit = damageEnemy(enemy, baseDamage * attenuation, "direct") || hit;
        if (index > 0) {
          addEffect({ kind: "beam", x1: getPathPosition(chainTargets[index - 1].pathDistance).x, y1: getPathPosition(chainTargets[index - 1].pathDistance).y, x2: getPathPosition(enemy.pathDistance).x, y2: getPathPosition(enemy.pathDistance).y, color: TOWER_TYPES.chain.color, ttl: 0.22 });
        }
      });
      addEffect({ kind: "beam", x1: tower.x, y1: tower.y, x2: getPathPosition(target.pathDistance).x, y2: getPathPosition(target.pathDistance).y, color: TOWER_TYPES.chain.color, ttl: 0.22 });
    } else if (tower.type === "pierce") {
      const maximum = specialReady ? state.enemies.length : TOWER_TYPES.pierce.pierceCount[tower.tier - 1];
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
      addEffect({ kind: "beam", x1: tower.x, y1: tower.y, x2: 9, y2: 6, color: TOWER_TYPES.pierce.color, ttl: 0.24 });
    }

    if (specialReady && hit) {
      tower.charge = 0;
    } else if (tower.face === 6 && hit) {
      tower.charge = Math.min(3, tower.charge + 1);
    }
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
    enemy.poisonRemaining = Math.max(enemy.poisonRemaining, [4, 5, 6][tier - 1]);
    enemy.poisonTick = Math.min(enemy.poisonTick, 1);
  }

  function killEnemy(enemy) {
    if (!enemy || enemy.dead) return;
    enemy.dead = true;
    const definition = ENEMY_TYPES[enemy.type];
    state.waveStats.kills += 1;
    state.killGold += definition.reward;
    state.gold += definition.reward;
    if (definition.boss) state.bossKills += 1;
    addEffect({ kind: "death", x: getPathPosition(enemy.pathDistance).x, y: getPathPosition(enemy.pathDistance).y, color: definition.color, ttl: 0.55 });
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
    if (!isPreparation()) return;
    if (state.gold < BUY_COST) {
      showToast("金幣不足，需要 25 金幣。", 1.8);
      return;
    }
    if (state.diceBag.length >= MAX_DICE_BAG) {
      showToast("骰子欄已滿，先放置或合成骰子。", 1.8);
      return;
    }
    if (state.purchasesThisWave >= MAX_PURCHASES_PER_WAVE) {
      showToast("本波最多購買 5 顆骰子。", 1.8);
      return;
    }
    const types = Object.keys(TOWER_TYPES);
    const type = types[Math.floor(Math.random() * types.length)];
    state.gold -= BUY_COST;
    state.purchasesThisWave += 1;
    state.diceBag.push({ id: createId("die"), type, tier: 1, face: randomFace(), totalInvested: BUY_COST });
    state.selectedDieId = state.diceBag[state.diceBag.length - 1].id;
    state.selectedTowerId = null;
    markUiDirty();
  }

  function selectDie(id) {
    if (!isPreparation()) return;
    state.selectedDieId = state.selectedDieId === id ? null : id;
    state.selectedTowerId = null;
    state.pendingMerge = null;
    markUiDirty();
  }

  function placeDieAt(x, y) {
    const slotIndex = getSlotIndex(x, y);
    if (slotIndex < 0 || findTowerAt(x, y)) {
      showToast("請選擇空的建造格。", 1.5);
      return;
    }
    const die = findDieById(state.selectedDieId);
    if (!die) return;
    state.towers.push(createTower(die.type, x, y, die.face, die.tier, die.totalInvested));
    state.diceBag = state.diceBag.filter(function (item) { return item.id !== die.id; });
    state.selectedDieId = null;
    showToast(TOWER_TYPES[die.type].name + " 已部署。", 1.2);
    markUiDirty();
  }

  function selectTower(tower) {
    state.selectedTowerId = tower ? tower.id : null;
    state.selectedDieId = null;
    state.pendingMerge = null;
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

  function requestMerge(first, second) {
    if (!isPreparation()) return;
    if (!first || !second || first.id === second.id) return;
    if (first.type !== second.type || first.tier !== second.tier || first.tier >= 3) {
      showToast("需要同種類、同階級且未達 III 階。", 1.8);
      return;
    }
    state.pendingMerge = { firstId: first.id, secondId: second.id };
    state.selectedTowerId = first.id;
    state.selectedDieId = null;
    markUiDirty();
  }

  function confirmMerge() {
    if (!isPreparation() || !state.pendingMerge) return;
    const first = findTowerById(state.pendingMerge.firstId);
    const second = findTowerById(state.pendingMerge.secondId);
    if (!first || !second || first.type !== second.type || first.tier !== second.tier || first.tier >= 3) {
      state.pendingMerge = null;
      markUiDirty();
      return;
    }
    first.tier += 1;
    first.face = randomFace();
    first.charge = 0;
    first.cooldown = 0.2;
    first.totalInvested += second.totalInvested;
    state.towers = state.towers.filter(function (tower) { return tower.id !== second.id; });
    state.pendingMerge = null;
    showToast(TOWER_TYPES[first.type].name + " 升至 " + toTierLabel(first.tier) + "！", 1.7);
    markUiDirty();
  }

  function cancelMerge() {
    state.pendingMerge = null;
    markUiDirty();
  }

  function rerollSelected() {
    const tower = findTowerById(state.selectedTowerId);
    if (!isPreparation() || !tower) return;
    if (state.rerollTickets <= 0) {
      showToast("沒有可用的重骰券。", 1.5);
      return;
    }
    state.rerollTickets -= 1;
    tower.face = randomFace();
    tower.charge = 0;
    showToast("骰面重擲為 " + tower.face + "。", 1.3);
    markUiDirty();
  }

  function sellSelected() {
    const tower = findTowerById(state.selectedTowerId);
    if (!isPreparation() || !tower) return;
    const refund = Math.floor(tower.totalInvested * 0.6);
    state.gold += refund;
    state.towers = state.towers.filter(function (item) { return item.id !== tower.id; });
    state.selectedTowerId = null;
    state.pendingMerge = null;
    showToast("出售骰塔，返還 " + refund + " 金幣。", 1.5);
    markUiDirty();
  }

  function handleBoardAction(start, end) {
    if (!isPreparation()) return;
    if (!start || !end) return;
    const startTower = findTowerAt(start.x, start.y);
    const endTower = findTowerAt(end.x, end.y);

    if (start.x !== end.x || start.y !== end.y) {
      if (!startTower) {
        if (state.selectedDieId) placeDieAt(end.x, end.y);
        return;
      }
      if (endTower && startTower.id !== endTower.id) {
        requestMerge(startTower, endTower);
      } else if (!endTower) {
        selectTower(startTower);
        moveTowerTo(startTower, end.x, end.y);
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
      if (endTower && selected && endTower.id !== selected.id) requestMerge(selected, endTower);
      else if (!endTower && selected) moveTowerTo(selected, end.x, end.y);
      else if (endTower) selectTower(endTower);
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
        button.title = type.name + "，骰面 " + die.face;
        button.innerHTML = '<span class="die-tier">I</span><span class="die-symbol">' + type.symbol + '</span><span class="die-face">' + die.face + '</span>';
        elements.tray.appendChild(button);
      });
    }
    elements.trayHint.textContent = state.selectedDieId
      ? "已選取骰子，點擊空的建造格放置。"
      : "選一顆骰子，再點擊空建造格放置。";
  }

  function renderInspector() {
    const tower = findTowerById(state.selectedTowerId);
    if (!tower) {
      elements.inspector.innerHTML = '<div class="empty-inspector"><span class="inspector-icon">✦</span><strong>選取一座骰塔</strong><p>查看骰面、射程與特殊能力。</p></div>';
      return;
    }

    const type = TOWER_TYPES[tower.type];
    const tierData = type.tiers[tower.tier - 1];
    const damage = tower.type === "inspire" ? "—" : String(Math.max(1, Math.floor(tierData.damage * FACE_MULTIPLIERS[tower.face] * getTowerDamageMultiplier(tower))));
    const interval = getTowerInterval(tower).toFixed(1) + "s";
    const merge = state.pendingMerge;
    const mergeHtml = merge
      ? '<div class="merge-preview"><strong>合成預覽</strong>將兩座 ' + type.name + ' 合成為 ' + toTierLabel(tower.tier + 1) + '，骰面重新隨機，充能歸零。<div class="inspector-actions"><button class="button button-primary" data-inspector-action="confirm-merge" type="button">確認合成</button><button class="button button-quiet" data-inspector-action="cancel-merge" type="button">取消</button></div></div>'
      : "";
    const chargeBars = [0, 1, 2].map(function (index) { return '<i class="' + (tower.charge > index ? "is-on" : "") + '"></i>'; }).join("");
    elements.inspector.innerHTML = '<div class="tower-inspector">' +
      '<div class="tower-inspector-heading"><span class="tower-symbol" style="--tower-color:' + type.color + '">' + type.symbol + '</span><div><strong>' + type.name + ' · ' + toTierLabel(tower.tier) + '</strong><small>骰面 ' + tower.face + ' · 位置 ' + tower.x + ',' + tower.y + '</small></div></div>' +
      '<div class="tower-stat-grid"><div class="tower-stat"><span>傷害／增益</span><strong>' + damage + (tower.type === "inspire" ? "%" : "") + '</strong></div><div class="tower-stat"><span>射程</span><strong>' + tierData.range + '</strong></div><div class="tower-stat"><span>間隔</span><strong>' + interval + '</strong></div></div>' +
      '<div class="charge-row"><span>特殊充能</span><div class="charge-bar">' + chargeBars + '</div><b>' + tower.charge + '/3</b></div>' +
      '<p class="inspector-description">' + type.description + '</p>' +
      mergeHtml +
      (merge ? "" : '<div class="inspector-actions"><button class="button button-quiet" data-inspector-action="reroll" type="button">重骰（' + state.rerollTickets + '）</button><button class="button button-danger" data-inspector-action="sell" type="button">出售（' + Math.floor(tower.totalInvested * 0.6) + ' G）</button></div>') +
      '</div>';
  }

  function toTierLabel(tier) {
    return ["", "I", "II", "III"][tier] || "?";
  }

  function renderHud() {
    const phaseName = { preparation: "準備中", combat: "戰鬥中", waveResult: "結算中", victory: "已勝利", defeat: "已失守" }[state.phase];
    elements.wave.textContent = state.wave + " / " + WAVES.length;
    elements.phase.textContent = state.paused ? "已暫停" : phaseName;
    elements.core.textContent = state.coreHp + " / " + INITIAL_CORE_HP;
    elements.coreFill.style.transform = "scaleX(" + (state.coreHp / INITIAL_CORE_HP) + ")";
    elements.gateHp.textContent = String(state.coreHp);
    elements.gold.textContent = String(state.gold);
    elements.reroll.textContent = String(state.rerollTickets);
    elements.best.textContent = String(Math.max(profile.bestScore, state.score));
    elements.purchaseCount.textContent = state.purchasesThisWave + " / " + MAX_PURCHASES_PER_WAVE;
    elements.nextWave.textContent = state.wave <= WAVES.length ? "第 " + state.wave + " 波" : "完成";
    elements.wavePreview.textContent = state.wave <= WAVES.length ? wavePreviewText(state.wave) : "所有敵人已清除";
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
    elements.buy.disabled = !isPreparation() || state.gold < BUY_COST || state.diceBag.length >= MAX_DICE_BAG || state.purchasesThisWave >= MAX_PURCHASES_PER_WAVE;
    elements.pause.disabled = state.phase === "victory" || state.phase === "defeat";
    elements.pause.textContent = state.paused ? "繼續" : "暫停";
  }

  function getStatusText() {
    if (state.paused) return "戰場暫停中。";
    if (state.phase === "preparation") return state.selectedDieId ? "選好的骰子，現在可以部署。" : "準備你的防線。";
    if (state.phase === "combat") return "骰塔自動索敵，守住核心。";
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

    PATH.forEach(function (slot) {
      const padding = cell * 0.08;
      roundedRect(ctx, slot[0] * cell + padding, slot[1] * cell + padding, cell - padding * 2, cell - padding * 2, cell * 0.16);
      ctx.fillStyle = "#243b4c";
      ctx.fill();
      ctx.strokeStyle = "rgba(144, 207, 225, 0.12)";
      ctx.stroke();
    });

    ctx.beginPath();
    PATH.forEach(function (slot, index) {
      const center = gridCenter(slot[0], slot[1]);
      if (index === 0) ctx.moveTo(center.x, center.y);
      else ctx.lineTo(center.x, center.y);
    });
    ctx.strokeStyle = "rgba(88, 144, 163, 0.42)";
    ctx.lineWidth = cell * 0.34;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();

    BUILD_SLOTS.forEach(function (slot) {
      const padding = cell * 0.16;
      roundedRect(ctx, slot[0] * cell + padding, slot[1] * cell + padding, cell - padding * 2, cell - padding * 2, cell * 0.14);
      ctx.fillStyle = "rgba(113, 227, 244, 0.09)";
      ctx.fill();
      ctx.strokeStyle = "rgba(113, 227, 244, 0.3)";
      ctx.lineWidth = 1.3;
      ctx.stroke();
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
    const size = canvasMetrics.cell * 0.62;
    const selected = state.selectedTowerId === tower.id;
    ctx.save();
    ctx.translate(center.x, center.y);
    if (tower.specialRemaining > 0) {
      ctx.shadowColor = type.color;
      ctx.shadowBlur = canvasMetrics.cell * 0.28;
    }
    roundedRect(ctx, -size / 2, -size / 2, size, size, canvasMetrics.cell * 0.12);
    ctx.fillStyle = type.color;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = selected ? "#fff4c7" : "rgba(255,255,255,0.35)";
    ctx.lineWidth = selected ? 3 : 1;
    ctx.stroke();
    ctx.fillStyle = "#071226";
    ctx.font = "900 " + Math.max(12, canvasMetrics.cell * 0.28) + "px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(type.symbol, 0, 1);
    ctx.fillStyle = "rgba(7, 18, 38, 0.78)";
    ctx.font = "950 " + Math.max(9, canvasMetrics.cell * 0.13) + "px sans-serif";
    ctx.fillText(toTierLabel(tower.tier), -size * 0.31, -size * 0.31);
    ctx.fillStyle = tower.face === 6 ? "#fff2b5" : "#071226";
    ctx.beginPath();
    ctx.arc(size * 0.3, size * 0.3, Math.max(7, canvasMetrics.cell * 0.13), 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = tower.face === 6 ? "#4b3c17" : type.color;
    ctx.font = "950 " + Math.max(9, canvasMetrics.cell * 0.14) + "px sans-serif";
    ctx.fillText(String(tower.face), size * 0.3, size * 0.31);
    ctx.restore();
  }

  function drawEnemy(enemy) {
    const definition = ENEMY_TYPES[enemy.type];
    const position = getPathPosition(enemy.pathDistance);
    const center = gridCenter(position.x, position.y);
    const radius = canvasMetrics.cell * (definition.boss ? 0.3 : 0.22);
    ctx.save();
    ctx.globalAlpha = enemy.invisibleRemaining > 0 ? 0.2 : 1;
    ctx.beginPath();
    ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = definition.color;
    ctx.shadowColor = definition.color;
    ctx.shadowBlur = enemy.frozenRemaining > 0 ? canvasMetrics.cell * 0.22 : 0;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = enemy.shield > 0 ? "#ffe0a6" : "rgba(255,255,255,0.44)";
    ctx.lineWidth = enemy.shield > 0 ? 2 : 1;
    ctx.stroke();
    ctx.fillStyle = "#071226";
    ctx.font = "950 " + Math.max(8, canvasMetrics.cell * (definition.boss ? 0.16 : 0.13)) + "px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(definition.symbol, center.x, center.y + 1);

    const barWidth = canvasMetrics.cell * (definition.boss ? 0.75 : 0.48);
    const barHeight = Math.max(3, canvasMetrics.cell * 0.055);
    ctx.fillStyle = "rgba(2, 8, 18, 0.78)";
    ctx.fillRect(center.x - barWidth / 2, center.y - radius - barHeight - 3, barWidth, barHeight);
    ctx.fillStyle = enemy.shield > 0 ? "#ffe0a6" : "#7ce0ae";
    ctx.fillRect(center.x - barWidth / 2, center.y - radius - barHeight - 3, barWidth * Math.max(0, enemy.hp / enemy.maxHp), barHeight);
    if (enemy.slowRemaining > 0 || enemy.frozenRemaining > 0) {
      ctx.beginPath(); ctx.arc(center.x, center.y, radius + 4, 0, Math.PI * 2);
      ctx.strokeStyle = enemy.frozenRemaining > 0 ? "#d6f8ff" : "#71d8f4";
      ctx.lineWidth = 2; ctx.stroke();
    }
    if (enemy.poisonRemaining > 0) {
      ctx.beginPath(); ctx.arc(center.x, center.y, radius + 6, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(154, 216, 111, 0.75)";
      ctx.lineWidth = 1; ctx.stroke();
    }
    ctx.restore();
  }

  function drawEffect(effect) {
    const progress = 1 - effect.ttl / effect.maxTtl;
    const alpha = Math.max(0, effect.ttl / effect.maxTtl);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.lineCap = "round";
    if (effect.kind === "beam") {
      const first = gridCenter(effect.x1, effect.y1);
      const second = gridCenter(effect.x2, effect.y2);
      ctx.beginPath(); ctx.moveTo(first.x, first.y); ctx.lineTo(second.x, second.y);
      ctx.strokeStyle = effect.color; ctx.lineWidth = Math.max(2, canvasMetrics.cell * 0.08); ctx.shadowColor = effect.color; ctx.shadowBlur = 10; ctx.stroke();
    } else if (effect.kind === "burst" || effect.kind === "bossPulse" || effect.kind === "inspire" || effect.kind === "pulse") {
      const center = gridCenter(effect.x, effect.y);
      ctx.beginPath(); ctx.arc(center.x, center.y, canvasMetrics.cell * (0.22 + progress * (effect.kind === "bossPulse" ? 1.5 : 0.75)), 0, Math.PI * 2);
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
  elements.tray.addEventListener("click", function (event) {
    const button = event.target.closest("[data-die-id]");
    if (button) selectDie(button.dataset.dieId);
  });
  elements.inspector.addEventListener("click", function (event) {
    const button = event.target.closest("[data-inspector-action]");
    if (!button) return;
    const action = button.dataset.inspectorAction;
    if (action === "reroll") rerollSelected();
    if (action === "sell") sellSelected();
    if (action === "confirm-merge") confirmMerge();
    if (action === "cancel-merge") cancelMerge();
  });
  elements.canvas.addEventListener("pointerdown", function (event) {
    if (state.paused || state.phase !== "preparation") return;
    pointerStart = getCellFromPointer(event);
    elements.canvas.setPointerCapture(event.pointerId);
  });
  elements.canvas.addEventListener("pointerup", function (event) {
    if (!pointerStart) return;
    const end = getCellFromPointer(event);
    handleBoardAction(pointerStart, end);
    pointerStart = null;
  });
  elements.canvas.addEventListener("pointercancel", function () { pointerStart = null; });
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
