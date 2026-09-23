import { TIMING, colorConfig } from "./config.mjs";
import { createGame, applyCommand, stepGame, pauseGame, resumeGame } from "./core.mjs";
import { LEVELS, TUTORIALS, getLevel, getTutorial, objectiveText } from "./levels.mjs";
import { browserSeed } from "./rng.mjs";
import { InputController } from "./input.mjs";
import { MagicBubbleRenderer } from "./renderer.mjs";
import { AudioController } from "./audio.mjs";

const elements = {
  canvas: document.getElementById("game-canvas"),
  stage: document.getElementById("game-stage"),
  controls: document.getElementById("touch-controls"),
  score: document.getElementById("score"),
  best: document.getElementById("best"),
  level: document.getElementById("speed-level"),
  chain: document.getElementById("max-chain"),
  mode: document.getElementById("mode-label"),
  objective: document.getElementById("objective-text"),
  objectiveBar: document.getElementById("objective-bar"),
  nextPivot: document.getElementById("next-pivot"),
  nextSatellite: document.getElementById("next-satellite"),
  menu: document.getElementById("menu-cover"),
  stageSelect: document.getElementById("stage-select"),
  stageGrid: document.getElementById("stage-grid"),
  pause: document.getElementById("pause-cover"),
  result: document.getElementById("result-cover"),
  resultKicker: document.getElementById("result-kicker"),
  resultTitle: document.getElementById("result-title"),
  resultCopy: document.getElementById("result-copy"),
  resultScore: document.getElementById("result-score"),
  resultChain: document.getElementById("result-chain"),
  resultStars: document.getElementById("result-stars"),
  resultNext: document.getElementById("result-next"),
  chainBanner: document.getElementById("chain-banner"),
  live: document.getElementById("live-region"),
  error: document.getElementById("load-error"),
  pauseButton: document.getElementById("pause-button"),
  muteButton: document.getElementById("mute-button"),
  fullscreenButton: document.getElementById("fullscreen-button")
};

const defaultProfile = () => ({
  version: 1,
  tutorialStep: 0,
  unlockedStage: 1,
  stages: {},
  endless: { highScore: 0, maxChain: 0, longestMs: 0 },
  settings: {
    volume: 0.65,
    muted: false,
    reducedMotion: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches || false
  }
});

let profile = defaultProfile();
let state = null;
let currentLevel = null;
let renderer = null;
let input = null;
let saveController = null;
let lastNow = performance.now();
let accumulator = 0;
let chainBannerTimer = 0;
const audio = new AudioController();

function validateProfile(saved) {
  return Boolean(saved && saved.version === 1 && Number.isInteger(saved.unlockedStage) && saved.unlockedStage >= 1 && saved.stages && saved.endless && saved.settings);
}

function normalizeProfile(saved) {
  const fresh = defaultProfile();
  return {
    ...fresh,
    ...saved,
    tutorialStep: Math.max(0, Math.min(TUTORIALS.length, Math.floor(saved.tutorialStep || 0))),
    unlockedStage: Math.max(1, Math.min(LEVELS.length, Math.floor(saved.unlockedStage || 1))),
    stages: saved.stages && typeof saved.stages === "object" ? saved.stages : {},
    endless: { ...fresh.endless, ...(saved.endless || {}) },
    settings: { ...fresh.settings, ...(saved.settings || {}) }
  };
}

function saveProfile() {
  saveController?.save(true);
}

function applySettings() {
  audio.setVolume(profile.settings.volume);
  audio.setMuted(profile.settings.muted);
  document.documentElement.classList.toggle("reduce-motion", Boolean(profile.settings.reducedMotion));
  elements.muteButton.textContent = profile.settings.muted ? "開啟音效" : "靜音";
  elements.muteButton.setAttribute("aria-pressed", String(profile.settings.muted));
}

function initializeSave() {
  if (!window.PuzzleSave) {
    applySettings();
    renderStageGrid();
    return;
  }
  saveController = window.PuzzleSave.create({
    key: "magic-bubble",
    autoRestore: true,
    fresh() {
      profile = defaultProfile();
      applySettings();
      renderStageGrid();
    },
    restore(saved) {
      profile = normalizeProfile(saved);
      applySettings();
      renderStageGrid();
    },
    validate: validateProfile,
    hasProgress(saved) {
      return saved.tutorialStep > 0 || saved.unlockedStage > 1 || saved.endless?.highScore > 0;
    },
    getState() {
      return profile;
    }
  });
}

function colorCss(id) {
  const value = colorConfig(id)?.color || 0x958cae;
  return `#${value.toString(16).padStart(6, "0")}`;
}

function symbolFor(id) {
  return id === 1 ? "♨" : id === 2 ? "✦" : id === 3 ? "❧" : id === 4 ? "◆" : "✕";
}

function setPreview(element, color) {
  element.style.setProperty("--preview-color", colorCss(color));
  element.textContent = symbolFor(color);
}

function formatTime(ms) {
  const seconds = Math.floor(ms / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function updateHud() {
  if (!state) return;
  elements.score.textContent = state.score.toLocaleString();
  elements.level.textContent = String(state.speedLevel).padStart(2, "0");
  elements.chain.textContent = `${state.maxChain}×`;
  elements.best.textContent = (state.mode === "endless" ? Math.max(profile.endless.highScore, state.score) : profile.stages[state.levelId]?.score || 0).toLocaleString();
  elements.mode.textContent = state.mode === "endless" ? "無盡模式" : currentLevel?.title || (state.mode === "tutorial" ? "新生教學" : "闖關模式");
  const next = state.nextPairs[0];
  if (next) {
    setPreview(elements.nextPivot, next.pivotColor);
    setPreview(elements.nextSatellite, next.satelliteColor);
  }
  if (state.objective) {
    elements.objective.textContent = objectiveText(state.objective, state.objectiveProgress);
    elements.objectiveBar.style.width = `${Math.min(100, state.objectiveProgress / state.objective.amount * 100)}%`;
  } else {
    elements.objective.textContent = `存活 ${formatTime(state.elapsedMs)} · 每 12 組提升速度`;
    elements.objectiveBar.style.width = `${(state.placedPairCount % 12) / 12 * 100}%`;
  }
  elements.pauseButton.disabled = state.phase === "gameOver" || state.phase === "stageClear";
  elements.pauseButton.textContent = state.phase === "paused" ? "繼續" : "暫停";
}

function isPlayable() {
  return Boolean(state && (state.phase === "active" || state.phase === "locking"));
}

function announce(text) {
  elements.live.textContent = "";
  requestAnimationFrame(() => { elements.live.textContent = text; });
}

function showChain(chain) {
  if (chain < 2) return;
  window.clearTimeout(chainBannerTimer);
  elements.chainBanner.textContent = `${chain} CHAIN!`;
  elements.chainBanner.hidden = false;
  elements.chainBanner.classList.remove("is-showing");
  requestAnimationFrame(() => elements.chainBanner.classList.add("is-showing"));
  chainBannerTimer = window.setTimeout(() => {
    elements.chainBanner.hidden = true;
    elements.chainBanner.classList.remove("is-showing");
  }, profile.settings.reducedMotion ? 250 : 900);
}

function completeRun(kind) {
  if (!state) return;
  if (state.mode === "endless") {
    profile.endless.highScore = Math.max(profile.endless.highScore, state.score);
    profile.endless.maxChain = Math.max(profile.endless.maxChain, state.maxChain);
    profile.endless.longestMs = Math.max(profile.endless.longestMs, state.elapsedMs);
  } else if (state.mode === "tutorial" && kind === "clear") {
    const tutorialIndex = TUTORIALS.findIndex((level) => level.id === state.levelId);
    profile.tutorialStep = Math.max(profile.tutorialStep, tutorialIndex + 1);
  } else if (kind === "clear") {
    const previous = profile.stages[state.levelId] || { score: 0, stars: 0 };
    profile.stages[state.levelId] = { score: Math.max(previous.score, state.score), stars: Math.max(previous.stars, state.stars) };
    const levelIndex = LEVELS.findIndex((level) => level.id === state.levelId);
    profile.unlockedStage = Math.max(profile.unlockedStage, Math.min(LEVELS.length, levelIndex + 2));
  }
  saveProfile();
  renderStageGrid();
}

function showResult(kind) {
  completeRun(kind);
  const cleared = kind === "clear";
  elements.resultKicker.textContent = cleared ? "SPELL COMPLETE" : "MAGIC OVERLOAD";
  elements.resultTitle.textContent = cleared ? "試煉完成！" : "氣泡滿出來了";
  elements.resultCopy.textContent = cleared
    ? state.mode === "tutorial"
      ? `${currentLevel?.title || "課程"}已完成，你已掌握新的氣泡技巧。`
      : `${currentLevel?.title || "關卡"}已完成，新的魔法試煉已解鎖。`
    : "再整理一下堆疊順序，就能把連鎖延伸得更遠。";
  elements.resultScore.textContent = state.score.toLocaleString();
  elements.resultChain.textContent = `${state.maxChain}×`;
  elements.resultStars.textContent = cleared ? "★".repeat(state.stars) + "☆".repeat(3 - state.stars) : "—";
  const sequence = state.mode === "tutorial" ? TUTORIALS : LEVELS;
  const levelIndex = currentLevel ? sequence.findIndex((level) => level.id === currentLevel.id) : -1;
  elements.resultNext.hidden = !cleared || levelIndex < 0 || levelIndex >= sequence.length - 1;
  elements.result.hidden = false;
  announce(cleared ? `關卡完成，獲得 ${state.stars} 顆星` : `遊戲結束，分數 ${state.score}`);
}

function syncGame(result = { events: [] }) {
  renderer.update(state);
  renderer.playEvents(result.events || []);
  audio.playEvents(result.events || []);
  if (result.events?.some((event) => event.type === "CHAIN_STEP" || event.type === "STAGE_CLEAR" || event.type === "GAME_OVER")) {
    // Avoid playing effects twice while still routing UI-only reactions.
    for (const event of result.events) {
      if (event.type === "CHAIN_STEP") { showChain(event.chain); announce(`${event.chain} 連鎖，獲得 ${event.score} 分`); }
      if (event.type === "STAGE_CLEAR") window.setTimeout(() => showResult("clear"), profile.settings.reducedMotion ? 60 : 450);
      if (event.type === "GAME_OVER") window.setTimeout(() => showResult("over"), profile.settings.reducedMotion ? 60 : 450);
    }
  }
  updateHud();
}

function sendCommand(command) {
  if (!isPlayable()) return;
  audio.unlock();
  const result = applyCommand(state, command);
  if (result.changed || result.events.length) syncGame(result);
}

function startGame(mode, levelId = null) {
  audio.unlock();
  currentLevel = mode === "stage" ? getLevel(levelId) : mode === "tutorial" ? getTutorial(levelId) : null;
  const created = createGame({ mode, level: currentLevel, seed: browserSeed() });
  state = created.state;
  accumulator = 0;
  lastNow = performance.now();
  elements.menu.hidden = true;
  elements.stageSelect.hidden = true;
  elements.pause.hidden = true;
  elements.result.hidden = true;
  elements.stage.classList.remove("is-paused");
  syncGame(created);
  elements.canvas.focus({ preventScroll: true });
}

function togglePause(reason = "manual") {
  if (!state || state.phase === "gameOver" || state.phase === "stageClear") return;
  if (state.phase === "paused") {
    resumeGame(state);
    elements.pause.hidden = true;
    elements.stage.classList.remove("is-paused");
    lastNow = performance.now();
    accumulator = 0;
    announce("遊戲繼續");
  } else if (pauseGame(state)) {
    input.reset();
    elements.pause.hidden = false;
    elements.stage.classList.add("is-paused");
    elements.pause.querySelector("h2").textContent = reason === "background" ? "已自動暫停" : "魔法暫停中";
    announce("遊戲已暫停");
  }
  updateHud();
}

function restartGame() {
  if (!state) return;
  if (!window.confirm("確定要放棄目前盤面並重新開始嗎？")) return;
  startGame(state.mode, state.levelId);
}

function renderStageGrid() {
  elements.stageGrid.replaceChildren();
  LEVELS.forEach((level, index) => {
    const unlocked = index < profile.unlockedStage;
    const record = profile.stages[level.id] || { score: 0, stars: 0 };
    const button = document.createElement("button");
    button.type = "button";
    button.className = "stage-card";
    button.disabled = !unlocked;
    button.dataset.level = level.id;
    button.innerHTML = `<span>${String(index + 1).padStart(2, "0")}</span><strong>${unlocked ? level.title : "尚未解鎖"}</strong><small>${unlocked ? `${"★".repeat(record.stars)}${"☆".repeat(3 - record.stars)} · ${record.score.toLocaleString()}` : "完成前一關解鎖"}</small>`;
    elements.stageGrid.appendChild(button);
  });
}

function frame(now) {
  const delta = Math.min(TIMING.maxFrameDeltaMs, now - lastNow);
  lastNow = now;
  if (state && state.phase !== "paused" && state.phase !== "gameOver" && state.phase !== "stageClear") {
    input.update(delta);
    accumulator += delta;
    let steps = 0;
    let changed = false;
    const events = [];
    while (accumulator >= TIMING.fixedStepMs && steps < TIMING.maxStepsPerFrame) {
      const result = stepGame(state, TIMING.fixedStepMs, { softDrop: input.softDrop });
      changed ||= result.changed;
      events.push(...result.events);
      accumulator -= TIMING.fixedStepMs;
      steps += 1;
      if (state.phase === "gameOver" || state.phase === "stageClear") break;
    }
    if (steps === TIMING.maxStepsPerFrame) accumulator = 0;
    if (changed || events.length) syncGame({ events });
    else if (Math.floor(state.elapsedMs / 1000) !== Math.floor((state.elapsedMs - delta) / 1000)) updateHud();
  }
  renderer.render(now);
  requestAnimationFrame(frame);
}

function installUi() {
  document.getElementById("start-endless").addEventListener("click", () => startGame("endless"));
  document.getElementById("start-tutorial").addEventListener("click", () => {
    const tutorial = TUTORIALS[Math.min(profile.tutorialStep, TUTORIALS.length - 1)];
    startGame("tutorial", tutorial.id);
  });
  document.getElementById("open-stages").addEventListener("click", () => {
    elements.menu.hidden = true;
    elements.stageSelect.hidden = false;
  });
  document.getElementById("stage-back").addEventListener("click", () => {
    elements.stageSelect.hidden = true;
    elements.menu.hidden = false;
  });
  elements.stageGrid.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-level]");
    if (button && !button.disabled) startGame("stage", button.dataset.level);
  });
  elements.pauseButton.addEventListener("click", () => togglePause());
  document.getElementById("resume-button").addEventListener("click", () => togglePause());
  document.getElementById("pause-menu").addEventListener("click", () => {
    elements.pause.hidden = true;
    elements.menu.hidden = false;
    state = null;
    updateHud();
  });
  document.getElementById("restart-button").addEventListener("click", restartGame);
  document.getElementById("result-retry").addEventListener("click", () => startGame(state.mode, state.levelId));
  document.getElementById("result-menu").addEventListener("click", () => {
    elements.result.hidden = true;
    elements.menu.hidden = false;
    state = null;
  });
  elements.resultNext.addEventListener("click", () => {
    const sequence = state.mode === "tutorial" ? TUTORIALS : LEVELS;
    const index = sequence.findIndex((level) => level.id === state.levelId);
    startGame(state.mode, sequence[Math.min(index + 1, sequence.length - 1)].id);
  });
  elements.muteButton.addEventListener("click", () => {
    profile.settings.muted = !profile.settings.muted;
    applySettings();
    saveProfile();
  });
  elements.fullscreenButton.addEventListener("click", async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.querySelector(".game-app").requestFullscreen();
    } catch (error) {
      console.warn("Fullscreen unavailable", error);
    }
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden" && isPlayable()) togglePause("background");
  });
  window.addEventListener("pointerdown", () => audio.unlock(), { once: true });
}

try {
  renderer = new MagicBubbleRenderer(elements.canvas, elements.stage);
  input = new InputController({
    surface: elements.stage,
    controls: elements.controls,
    onCommand: sendCommand,
    onPause: () => togglePause(),
    onRestart: restartGame,
    enabled: isPlayable
  });
  globalThis.addEventListener("beforeunload", () => input.destroy());
  installUi();
  initializeSave();
  renderStageGrid();
  applySettings();
  requestAnimationFrame(frame);
} catch (error) {
  console.error("Magic Bubble failed to initialize", error);
  elements.error.hidden = false;
  elements.error.querySelector("p").textContent = "無法啟動 3D 畫面。請確認瀏覽器支援 WebGL 2，或更新瀏覽器後重試。";
}
