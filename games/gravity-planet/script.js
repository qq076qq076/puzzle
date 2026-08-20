const LEVELS = [
  { name: "碎星微石", mass: 0, bodyMass: 1, radius: 0.5, drift: 3.5, gravity: 3.5, color: 0x8190a7, accent: 0xb7c7df, spin: 0.45, description: "最初的漂浮碎石。它很輕，能快速穿過星塵帶，靠近小碎片就能將它們吸入核心。" },
  { name: "小行星", mass: 10, bodyMass: 4, radius: 0.78, drift: 3.2, gravity: 4.5, color: 0x8f7773, accent: 0xe0b19c, spin: 0.38, description: "核心聚合成穩定的小行星，隕石坑與碎石環開始受到自身引力牽引。" },
  { name: "月岩", mass: 50, bodyMass: 12, radius: 1.18, drift: 2.9, gravity: 5.5, color: 0xa9bedc, accent: 0xd9e6ff, spin: 0.32, description: "冷色月岩擁有更寬廣的引力場，漂浮碎石會在靠近時自然改變方向。" },
  { name: "行星胚", mass: 180, bodyMass: 35, radius: 1.8, drift: 2.6, gravity: 7, color: 0xd75948, accent: 0xffb347, spin: 0.28, description: "熔岩核心正在成形。熱裂縫讓你的引力變得明亮，也更容易捕捉遠處碎片。" },
  { name: "岩質行星", mass: 600, bodyMass: 100, radius: 2.7, drift: 2.3, gravity: 9, color: 0x297db9, accent: 0x76e2d3, spin: 0.24, description: "大氣層包住藍綠色地表，你已經足以影響周圍星體的漂移軌跡。" },
  { name: "氣體巨行星", mass: 1800, bodyMass: 280, radius: 4, drift: 2, gravity: 12, color: 0xd58fae, accent: 0xffd09d, spin: 0.2, description: "氣體條紋與巨大風暴圍繞核心旋轉，鄰近星體會被你的引力慢慢拉成群。" },
  { name: "冰巨星", mass: 5000, bodyMass: 750, radius: 5.8, drift: 1.7, gravity: 15, color: 0x5dbddc, accent: 0x9e9cff, spin: 0.16, description: "藍紫冰晶與極光形成新的重力景觀，你的引力場已能改寫更大的星體路線。" },
  { name: "棕矮星", mass: 14000, bodyMass: 2000, radius: 8.2, drift: 1.4, gravity: 19, color: 0xd07b45, accent: 0xffb96d, spin: 0.13, description: "等離子體在核心周圍翻湧，磁場與引力同時牽引著附近的星塵與小星體。" },
  { name: "恆星", mass: 38000, bodyMass: 5500, radius: 11.6, drift: 1.1, gravity: 24, color: 0xffa522, accent: 0xffe69b, spin: 0.1, description: "耀斑與日冕照亮黑暗，你已經成為一個會讓其他星體繞行的恆星。" },
  { name: "黑洞", mass: 100000, bodyMass: 15000, radius: 16, drift: 0.8, gravity: 30, color: 0x0a0818, accent: 0xff8e52, spin: 0.07, description: "最後的形態。吸積盤吞吐星光，連光線與空間都開始在你的核心周圍彎曲。" },
];

const REGIONS = [
  { id: "debris", name: "碎石帶", description: "碎石密度提高，收集路線更容易形成連鎖。", color: 0x62e6ff, gridColor: 0x234c73, gravityMultiplier: 1, bodyDriftMultiplier: 1, playerAccelerationMultiplier: 1.04, anomalyBonus: 0.02 },
  { id: "nebula", name: "幽暗星雲", description: "視野被星雲染深，高階星體的警戒距離縮短。", color: 0xc58cff, gridColor: 0x3b2860, gravityMultiplier: 0.84, bodyDriftMultiplier: 0.92, playerAccelerationMultiplier: 1, anomalyBonus: 0.06 },
  { id: "gravity-well", name: "重力井", description: "所有星體的牽引更強，靠近時要提早規劃逃生路線。", color: 0xff9b70, gridColor: 0x6a3e3c, gravityMultiplier: 1.28, bodyDriftMultiplier: 0.88, playerAccelerationMultiplier: 0.95, anomalyBonus: 0.01 },
  { id: "crystal", name: "晶體星域", description: "稀有異常星體更常出現，適合冒險尋找高額回饋。", color: 0x9deeff, gridColor: 0x28627a, gravityMultiplier: 0.94, bodyDriftMultiplier: 1.12, playerAccelerationMultiplier: 1.08, anomalyBonus: 0.14 },
  { id: "solar", name: "耀斑邊境", description: "星體漂移加快，但太陽能量讓你的推進器更靈敏。", color: 0xffd17b, gridColor: 0x6d4d32, gravityMultiplier: 1.08, bodyDriftMultiplier: 1.22, playerAccelerationMultiplier: 1.2, anomalyBonus: 0.04 },
];

const ANOMALIES = [
  { id: "golden", name: "黃金核心", color: 0xffd77c, description: "吸收後提供 2.4 倍質量與額外星能。", massMultiplier: 2.4, energyBonus: 4 },
  { id: "time", name: "時間碎片", color: 0x8ee9ff, description: "吸收後延長連擊窗口，讓下一條路線更容易接上。", massMultiplier: 1, energyBonus: 2, comboBonus: 3.2 },
  { id: "crystal", name: "重力晶簇", color: 0xc58cff, description: "吸收後釋放大量星能，適合提前強化引力核心。", massMultiplier: 1.35, energyBonus: 12 },
  { id: "unstable", name: "不穩定反物質", color: 0xff7b9a, description: "高風險高回報，吸收時會產生更強的衝擊粒子。", massMultiplier: 3.2, energyBonus: 8, comboBonus: 1.6 },
];

const EVOLUTION_PERKS = [
  { id: "collector", name: "引力收集器", description: "吸收半徑 +8%，不用更靠近碎石。", color: "#62e6ff" },
  { id: "thruster", name: "脈衝推進器", description: "移動加速度 +16%，轉向更快。", color: "#9deeff" },
  { id: "mass-core", name: "質量核心", description: "每次吸收的質量收益 +12%。", color: "#ffd77c" },
  { id: "rebound", name: "反作用護甲", description: "碰撞反作用力 +22%，更容易脫離黏著。", color: "#ff9ca8" },
  { id: "fracture", name: "裂變晶格", description: "相差一階的碰撞多產生 2 個碎星。", color: "#c58cff" },
  { id: "shield", name: "護盾穩定器", description: "護盾上限 +1，進化時也會補回護盾。", color: "#a8f4ff" },
];

const COSMIC_EVENTS = [
  { id: "meteor", name: "流星雨", description: "畫面外高速碎石湧入，連鎖與星能收益提高。", color: "#ffd77c", duration: 13, gravityMultiplier: 1, bodyDriftMultiplier: 1.18, playerAccelerationMultiplier: 1, anomalyBonus: 0.03 },
  { id: "gravity-storm", name: "重力風暴", description: "所有星體的牽引短暫增強，碰撞路線會快速改變。", color: "#c58cff", duration: 11, gravityMultiplier: 1.72, bodyDriftMultiplier: 0.94, playerAccelerationMultiplier: 1, anomalyBonus: 0 },
  { id: "solar-flare", name: "太陽耀斑", description: "推進器吸收耀斑能量，移動加速度暫時提升。", color: "#ff9b70", duration: 10, gravityMultiplier: 1.06, bodyDriftMultiplier: 1.08, playerAccelerationMultiplier: 1.42, anomalyBonus: 0.06 },
  { id: "anti-gravity", name: "反重力潮", description: "牽引變弱，星體漂移加快；適合穿越危險區域。", color: "#8ee9ff", duration: 9, gravityMultiplier: 0.38, bodyDriftMultiplier: 1.34, playerAccelerationMultiplier: 1.12, anomalyBonus: 0.02 },
];

const BOSSES = [
  { id: "rogue-black-hole", name: "流浪黑洞", description: "會把附近星體拖向自己，撐過完整週期即可獲得星能。", color: 0xff8e52, duration: 27, gravityMultiplier: 1.65, sizeScale: 1.42, health: 3 },
  { id: "star-eater", name: "吞星獸", description: "移動較快、會吞食小星體；讓它在場上停留太久會越來越危險。", color: 0xff7b9a, duration: 23, gravityMultiplier: 1.35, sizeScale: 1.34, health: 4 },
  { id: "binary-warden", name: "雙星守門者", description: "雙重引力核心形成擺動路徑，碰撞時會釋放強烈反作用力。", color: 0x9deeff, duration: 30, gravityMultiplier: 1.5, sizeScale: 1.28, health: 5 },
];

const MISSIONS = [
  { id: "absorb", title: "星塵採集者", description: "吸收 30 個星體", target: 30, reward: 10, format: (value, target) => `${value}/${target}` },
  { id: "reach-level", title: "跨越天體", description: "進化到第 5 階", target: 5, reward: 20, format: (value, target) => `LV ${value}/${target}` },
  { id: "anomaly", title: "異常觀測員", description: "吸收 3 個異常星體", target: 3, reward: 18, format: (value, target) => `${value}/${target}` },
  { id: "chain", title: "碰撞藝術家", description: "完成 8 次星體連鎖碰撞", target: 8, reward: 22, format: (value, target) => `${value}/${target}` },
  { id: "survive", title: "長途漂流", description: "存活 180 秒", target: 180, reward: 35, format: (value, target) => `${formatTime(value)}/${formatTime(target)}` },
  { id: "boss", title: "巨物倖存者", description: "完成 1 次 Boss 遭遇", target: 1, reward: 45, format: (value, target) => `${value}/${target}` },
];

const WORLD = { maxBodies: 90, recycleRadius: 96, spawnRadius: 72, gridTileSize: 70 };
const VIEWPORT_SPAWN_MARGIN = 0.24;
const PLAYER_RADIUS = 1.25;
const GRAVITY_CONSTANT = 32;
const GRAVITY_SOFTENING = 3.75;
const GRAVITY_MAX_ACCELERATION = 8.5;
const COLLISION_RESTITUTION = 0.78;
const COLLISION_SEPARATION_SPEED = 2.1;
const COLLISION_SEPARATION_GAP = 0.18;
const FRACTURE_SEPARATION_SPEED = 7.2;
const EQUAL_SPLIT_SEPARATION_SPEED = 5;
const FRAGMENT_GRAVITY_GRACE = 0.75;
const NATURAL_SPAWN_TANGENT_BIAS = 0.68;
const NATURAL_SPAWN_CLEARANCE = 1.2;
const NATURAL_SPAWN_MAX_SPEED = 3;
const COMET_TAIL_MIN_SPEED = 2.6;
const COMET_TAIL_AXIS = new THREE.Vector3(0, 1, 0);
const COSMIC_EVENT_FIRST_DELAY = 18;
const COSMIC_EVENT_COOLDOWN = 17;
const BOSS_FIRST_DELAY = 32;
const BOSS_COOLDOWN = 48;
const input = new Set();
const directionMap = { up: "up", down: "down", left: "left", right: "right" };
const joystickInput = new THREE.Vector2();
let joystickPointerId = null;

const ui = {
  container: document.querySelector("#scene-container"),
  canvasFrame: document.querySelector("#canvas-frame"),
  mobileJoystick: document.querySelector("#mobile-joystick"),
  joystickBase: document.querySelector("#joystick-base"),
  joystickStick: document.querySelector("#joystick-stick"),
  pauseButton: document.querySelector("#pause-button"),
  resumeButton: document.querySelector("#resume-button"),
  restartButton: document.querySelector("#restart-button"),
  gameoverRestart: document.querySelector("#gameover-restart"),
  pauseCover: document.querySelector("#pause-cover"),
  gameoverCover: document.querySelector("#gameover-cover"),
  evolutionPopup: document.querySelector("#evolution-popup"),
  evolutionName: document.querySelector("#evolution-name"),
  evolutionDescription: document.querySelector("#evolution-description"),
  evolutionContinue: document.querySelector("#evolution-continue"),
  dangerAlert: document.querySelector("#danger-alert"),
  dangerName: document.querySelector("#danger-name"),
  dangerDistance: document.querySelector("#danger-distance"),
  comboPill: document.querySelector("#combo-pill"),
  comboValue: document.querySelector("#combo-value"),
  cosmicEvent: document.querySelector("#cosmic-event"),
  cosmicEventName: document.querySelector("#cosmic-event-name"),
  cosmicEventDescription: document.querySelector("#cosmic-event-description"),
  cosmicEventTime: document.querySelector("#cosmic-event-time"),
  regionBadge: document.querySelector("#region-badge"),
  missionTracker: document.querySelector("#mission-tracker"),
  missionName: document.querySelector("#mission-name"),
  missionProgress: document.querySelector("#mission-progress"),
  evolutionChoices: document.querySelector("#evolution-choices"),
  evolutionNote: document.querySelector("#evolution-note"),
  sceneToast: document.querySelector("#scene-toast"),
  massProgress: document.querySelector("#mass-progress"),
  massProgressFill: document.querySelector("#mass-progress-fill"),
  timeValue: document.querySelector("#time-value"),
  bestValue: document.querySelector("#best-value"),
  resultLevel: document.querySelector("#result-level"),
  resultMass: document.querySelector("#result-mass"),
  resultTime: document.querySelector("#result-time"),
  gameoverCopy: document.querySelector("#gameover-copy"),
};

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setClearColor(0x06091b, 1);
if ("outputColorSpace" in renderer && THREE.SRGBColorSpace) renderer.outputColorSpace = THREE.SRGBColorSpace;
else if ("outputEncoding" in renderer && THREE.sRGBEncoding) renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
ui.container.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(54, 1, 0.1, 320);
camera.position.set(0, 33, 28);
camera.lookAt(0, 0, 0);

const clock = new THREE.Clock();
const worldGroup = new THREE.Group();
const bodyGroup = new THREE.Group();
const playerRoot = new THREE.Group();
const effectGroup = new THREE.Group();
scene.add(worldGroup, bodyGroup, playerRoot, effectGroup);

const infiniteWorld = { gridGroup: null, gridTiles: [], gridDivisions: null, starfield: null, chunkX: null, chunkZ: null };

const state = {
  status: "ready",
  time: 0,
  highMass: 1,
  highLevel: 1,
  spawnTimer: 0,
  region: REGIONS[0],
  regionKey: null,
  cosmicEvent: { event: null, remaining: 0, cooldown: COSMIC_EVENT_FIRST_DELAY, spawnTimer: 0 },
  bossCooldown: BOSS_FIRST_DELAY,
  evolutionChoice: null,
  missions: Object.fromEntries(MISSIONS.map((mission) => [mission.id, { progress: 0, completed: false }])),
  chainCombo: 0,
  chainTimer: 0,
  lastUiUpdate: 0,
  evolutionAnimation: null,
  effects: [],
  bodies: [],
  player: {
    mass: 1,
    level: 1,
    shield: 3,
    shieldMax: 3,
    energy: 0,
    coreUpgrade: 0,
    position: new THREE.Vector3(0, 0, 0),
    velocity: new THREE.Vector3(),
    invulnerable: 0,
    combo: 0,
    comboTimer: 0,
    perks: {
      collector: 0,
      thruster: 0,
      "mass-core": 0,
      rebound: 0,
      fracture: 0,
      shield: 0,
    },
    model: null,
    field: null,
  },
};

let glowTexture;
let planetBandTexture;
let cometTailGeometry;
let timeFrame = 0;

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function formatNumber(value) {
  return Math.round(value).toLocaleString("en-US");
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
}

function upgradeCost() {
  return Math.round(25 * Math.pow(1.35, state.player.coreUpgrade));
}

function levelForMass(mass) {
  let level = 1;
  for (let index = 0; index < LEVELS.length; index += 1) {
    if (mass >= LEVELS[index].mass) level = index + 1;
  }
  return level;
}

function dataForId(collection, id) {
  return collection.find((item) => item.id === id) || null;
}

function activeCosmicEvent() {
  return state.cosmicEvent.event ? dataForId(COSMIC_EVENTS, state.cosmicEvent.event) : null;
}

function activeBossData(body) {
  return body?.bossType ? dataForId(BOSSES, body.bossType) : null;
}

function randomAnomalyForLevel(level, forced = false) {
  const event = activeCosmicEvent();
  const chance = forced ? 1 : 0.055 + (state.region?.anomalyBonus || 0) + (event?.anomalyBonus || 0);
  if (!forced && Math.random() > chance) return null;
  const available = ANOMALIES.filter((anomaly) => anomaly.id !== "unstable" || level >= 3);
  return available[Math.floor(Math.random() * available.length)].id;
}

function missionStateFor(id) {
  if (!state.missions[id]) state.missions[id] = { progress: 0, completed: false };
  return state.missions[id];
}

function updateMission(id, amount = 1) {
  const mission = MISSIONS.find((item) => item.id === id);
  if (!mission) return;
  const progress = missionStateFor(id);
  if (progress.completed) return;
  progress.progress = Math.min(mission.target, progress.progress + amount);
  if (progress.progress < mission.target) return;
  progress.completed = true;
  state.player.energy += mission.reward;
  addToast(`成就完成 · ${mission.title} · 星能 +${mission.reward}`, "#ffd77c");
  try {
    const saved = JSON.parse(window.localStorage.getItem("gravityPlanetAchievements") || "[]");
    if (!saved.includes(id)) {
      saved.push(id);
      window.localStorage.setItem("gravityPlanetAchievements", JSON.stringify(saved));
    }
  } catch {
    // 儲存空間被限制時，成就仍只在本局生效。
  }
}

function updateMissionAbsolute(id, value) {
  const mission = MISSIONS.find((item) => item.id === id);
  if (!mission) return;
  const progress = missionStateFor(id);
  if (progress.completed) return;
  progress.progress = Math.min(mission.target, Math.max(progress.progress, value));
  if (progress.progress >= mission.target) updateMission(id, 0);
}

function currentMission() {
  return MISSIONS.find((mission) => !missionStateFor(mission.id).completed) || MISSIONS[MISSIONS.length - 1];
}

function updateMissionUi() {
  if (!ui.missionTracker) return;
  const mission = currentMission();
  const progress = missionStateFor(mission.id);
  ui.missionTracker.hidden = !mission;
  ui.missionName.textContent = mission.title;
  ui.missionProgress.textContent = `${mission.description} · ${mission.format(progress.progress, mission.target)}`;
}

function hexRgb(hex) {
  const color = new THREE.Color(hex);
  return `${Math.round(color.r * 255)}, ${Math.round(color.g * 255)}, ${Math.round(color.b * 255)}`;
}

function makeGlowTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext("2d");
  const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.12, "rgba(255,255,255,0.95)");
  gradient.addColorStop(0.38, "rgba(255,255,255,0.35)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(canvas);
  if ("colorSpace" in texture && THREE.SRGBColorSpace) texture.colorSpace = THREE.SRGBColorSpace;
  else if ("encoding" in texture && THREE.sRGBEncoding) texture.encoding = THREE.sRGBEncoding;
  return texture;
}

function makeBandTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const context = canvas.getContext("2d");
  const gradient = context.createLinearGradient(0, 0, 512, 0);
  gradient.addColorStop(0, "#9a5b88");
  gradient.addColorStop(0.24, "#e8b6b3");
  gradient.addColorStop(0.48, "#b96d9b");
  gradient.addColorStop(0.7, "#f7d0bb");
  gradient.addColorStop(1, "#85537e");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 512, 256);
  const bands = [24, 52, 83, 113, 141, 176, 211, 238];
  bands.forEach((y, index) => {
    context.fillStyle = `rgba(45, 27, 69, ${0.16 + (index % 2) * 0.09})`;
    context.fillRect(0, y, 512, 6 + (index % 3) * 3);
  });
  const texture = new THREE.CanvasTexture(canvas);
  if ("colorSpace" in texture && THREE.SRGBColorSpace) texture.colorSpace = THREE.SRGBColorSpace;
  else if ("encoding" in texture && THREE.sRGBEncoding) texture.encoding = THREE.sRGBEncoding;
  return texture;
}

function makeSprite(color, size, opacity = 1) {
  const material = new THREE.SpriteMaterial({
    map: glowTexture,
    color,
    transparent: true,
    opacity,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(size, size, 1);
  return sprite;
}

function addRing(group, radius, tube, color, opacity, tilt = 0.18, rotationSpeed = 0.15) {
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(radius, tube, 8, 72),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending }),
  );
  ring.rotation.x = Math.PI / 2 + tilt;
  ring.userData.spinSpeed = rotationSpeed;
  group.add(ring);
  return ring;
}

function addParticleBelt(group, radius, count, color, spread = 0.25) {
  const positions = new Float32Array(count * 3);
  for (let index = 0; index < count; index += 1) {
    const angle = (index / count) * Math.PI * 2 + rand(-0.08, 0.08);
    const ringRadius = radius + rand(-spread, spread);
    positions[index * 3] = Math.cos(angle) * ringRadius;
    positions[index * 3 + 1] = rand(-spread * 0.35, spread * 0.35);
    positions[index * 3 + 2] = Math.sin(angle) * ringRadius;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const particles = new THREE.Points(
    geometry,
    new THREE.PointsMaterial({ color, size: Math.max(0.08, radius * 0.045), map: glowTexture, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending }),
  );
  particles.userData.spinSpeed = 0.3;
  group.add(particles);
  return particles;
}

function addCrater(group, radius, position, scale = 1) {
  const crater = new THREE.Mesh(
    new THREE.SphereGeometry(radius * 0.12 * scale, 8, 5),
    new THREE.MeshStandardMaterial({ color: 0x4c536e, roughness: 1, metalness: 0 }),
  );
  crater.position.copy(position).normalize().multiplyScalar(radius * 0.96);
  crater.scale.set(1.4, 0.25, 1.1);
  crater.lookAt(new THREE.Vector3(0, 0, 0));
  group.add(crater);
}

function createCelestialModel(level, isPlayer = false) {
  const data = LEVELS[level - 1];
  const group = new THREE.Group();
  group.userData.rotationSpeed = data.spin * (isPlayer ? 1.15 : 1);
  group.userData.phase = rand(0, Math.PI * 2);
  group.userData.level = level;

  if (!glowTexture) glowTexture = makeGlowTexture();
  if (!planetBandTexture) planetBandTexture = makeBandTexture();

  const radius = data.radius;
  const isEmissive = level >= 4;
  const material = new THREE.MeshStandardMaterial({
    color: data.color,
    roughness: level >= 8 ? 0.45 : 0.8,
    metalness: level >= 6 ? 0.08 : 0.02,
    emissive: isEmissive ? data.color : 0x000000,
    emissiveIntensity: level >= 9 ? 1.1 : level >= 4 ? 0.12 : 0,
    flatShading: level <= 2,
  });

  let core;
  if (level === 1) {
    core = new THREE.Mesh(new THREE.IcosahedronGeometry(radius, 1), material);
  } else if (level === 2) {
    core = new THREE.Mesh(new THREE.IcosahedronGeometry(radius, 2), material);
    core.scale.set(1.15, 0.9, 1.05);
    [[0.5, 0.4, 0.6], [-0.7, 0.1, 0.35], [0.1, -0.8, 0.3], [-0.4, 0.65, -0.5]].forEach((point, index) => {
      addCrater(group, radius, new THREE.Vector3(...point), index % 2 ? 0.7 : 1);
    });
    addRing(group, radius * 1.08, radius * 0.02, data.accent, 0.25, 0.35, 0.18);
  } else if (level === 3) {
    core = new THREE.Mesh(new THREE.SphereGeometry(radius, 24, 16), material);
    [[0.4, 0.6, 0.7], [-0.7, 0.2, 0.45], [0.1, -0.8, 0.3], [-0.5, -0.5, -0.65], [0.65, -0.1, -0.4]].forEach((point, index) => addCrater(group, radius, new THREE.Vector3(...point), index % 3 === 0 ? 1.2 : 0.75));
    addRing(group, radius * 1.11, radius * 0.016, data.accent, 0.32, 0.2, 0.13);
  } else if (level === 4) {
    core = new THREE.Mesh(new THREE.IcosahedronGeometry(radius, 3), material);
    for (let index = 0; index < 4; index += 1) {
      const crack = new THREE.Mesh(
        new THREE.TorusGeometry(radius * rand(0.26, 0.52), radius * 0.018, 5, 20, rand(1.1, 2.3)),
        new THREE.MeshBasicMaterial({ color: data.accent, transparent: true, opacity: 0.82, blending: THREE.AdditiveBlending }),
      );
      crack.rotation.set(rand(0, Math.PI), rand(0, Math.PI), rand(0, Math.PI));
      group.add(crack);
    }
    group.add(makeSprite(data.accent, radius * 2.7, 0.09));
  } else if (level === 5) {
    core = new THREE.Mesh(new THREE.SphereGeometry(radius, 32, 20), material);
    const cloud = new THREE.Mesh(
      new THREE.SphereGeometry(radius * 1.025, 32, 20),
      new THREE.MeshStandardMaterial({ color: 0x9be7ec, transparent: true, opacity: 0.29, roughness: 1, depthWrite: false }),
    );
    cloud.userData.spinSpeed = -0.16;
    group.add(cloud);
    addRing(group, radius * 1.12, radius * 0.018, data.accent, 0.25, 0.72, 0.11);
    group.add(makeSprite(data.accent, radius * 2.5, 0.07));
  } else if (level === 6) {
    const stripedMaterial = material.clone();
    stripedMaterial.map = planetBandTexture;
    stripedMaterial.color.setHex(0xffffff);
    stripedMaterial.emissive.setHex(0x391f49);
    stripedMaterial.emissiveIntensity = 0.18;
    core = new THREE.Mesh(new THREE.SphereGeometry(radius, 36, 24), stripedMaterial);
    addRing(group, radius * 1.38, radius * 0.07, 0xffd39d, 0.42, 0.38, 0.12);
    addRing(group, radius * 1.48, radius * 0.018, 0x90b8ff, 0.35, 0.38, -0.16);
    const storm = makeSprite(0xffb3bd, radius * 0.75, 0.18);
    storm.position.set(radius * 0.45, radius * 0.25, radius * 0.76);
    group.add(storm);
  } else if (level === 7) {
    core = new THREE.Mesh(new THREE.SphereGeometry(radius, 36, 24), material);
    const iceShell = new THREE.Mesh(
      new THREE.SphereGeometry(radius * 1.035, 32, 20),
      new THREE.MeshBasicMaterial({ color: 0x9fe9ff, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    group.add(iceShell);
    addRing(group, radius * 1.28, radius * 0.055, 0x9deeff, 0.5, 0.58, 0.11);
    addRing(group, radius * 1.43, radius * 0.016, 0xb495ff, 0.52, 0.58, -0.13);
    addParticleBelt(group, radius * 1.36, 90, 0xbdf7ff, 0.13);
    for (let index = 0; index < 3; index += 1) {
      const aurora = makeSprite(index % 2 ? 0x90a5ff : 0x78f2ff, radius * 1.8, 0.08);
      aurora.position.set(Math.cos(index * 2.1) * radius * 0.8, 0, Math.sin(index * 2.1) * radius * 0.8);
      group.add(aurora);
    }
  } else if (level === 8) {
    core = new THREE.Mesh(new THREE.SphereGeometry(radius, 32, 20), material);
    core.material.emissive.setHex(0x7b2c19);
    core.material.emissiveIntensity = 0.5;
    addRing(group, radius * 1.02, radius * 0.07, 0xff964c, 0.62, 0.2, 0.1);
    addRing(group, radius * 1.2, radius * 0.025, 0xb36bff, 0.52, 0.2, -0.2);
    addParticleBelt(group, radius * 1.16, 140, 0xffb26a, 0.28);
    group.add(makeSprite(0xff9f52, radius * 2.9, 0.13));
  } else if (level === 9) {
    core = new THREE.Mesh(new THREE.SphereGeometry(radius, 36, 24), new THREE.MeshBasicMaterial({ color: 0xffb62e }));
    const corona = new THREE.Mesh(
      new THREE.SphereGeometry(radius * 1.08, 32, 20),
      new THREE.MeshBasicMaterial({ color: 0xff8d30, transparent: true, opacity: 0.24, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    group.add(corona);
    group.add(makeSprite(0xffac37, radius * 3.25, 0.28));
    addParticleBelt(group, radius * 1.2, 170, 0xffd78c, 0.32);
    for (let index = 0; index < 5; index += 1) {
      const flare = makeSprite(index % 2 ? 0xffe4a7 : 0xff852f, radius * rand(0.65, 1.15), 0.25);
      flare.position.set(Math.cos(index * 1.25) * radius * 0.75, Math.sin(index * 1.7) * radius * 0.65, Math.sin(index * 1.25) * radius * 0.75);
      group.add(flare);
    }
  } else {
    core = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.55, 32, 24), new THREE.MeshBasicMaterial({ color: 0x010106 }));
    const disk = new THREE.Mesh(
      new THREE.TorusGeometry(radius * 0.75, radius * 0.22, 12, 96),
      new THREE.MeshBasicMaterial({ color: 0xff8d52, transparent: true, opacity: 0.86, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    disk.rotation.x = Math.PI / 2;
    disk.rotation.z = 0.22;
    disk.userData.spinSpeed = 0.42;
    group.add(disk);
    const outerDisk = new THREE.Mesh(
      new THREE.TorusGeometry(radius * 1.18, radius * 0.065, 10, 96),
      new THREE.MeshBasicMaterial({ color: 0xb86aff, transparent: true, opacity: 0.48, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    outerDisk.rotation.x = Math.PI / 2;
    outerDisk.rotation.z = -0.26;
    outerDisk.userData.spinSpeed = -0.26;
    group.add(outerDisk);
    addParticleBelt(group, radius * 1.02, 220, 0xffbf82, 0.22);
    group.add(makeSprite(0x8f69ff, radius * 3.1, 0.19));
    const jetMaterial = new THREE.MeshBasicMaterial({ color: 0x6d8dff, transparent: true, opacity: 0.38, blending: THREE.AdditiveBlending, depthWrite: false });
    const topJet = new THREE.Mesh(new THREE.ConeGeometry(radius * 0.11, radius * 1.4, 12), jetMaterial);
    topJet.position.y = radius * 1.02;
    group.add(topJet);
    const bottomJet = topJet.clone();
    bottomJet.position.y = -radius * 1.02;
    bottomJet.rotation.z = Math.PI;
    group.add(bottomJet);
  }

  group.add(core);
  group.userData.core = core;
  group.userData.glow = group.children.find((child) => child.isSprite) || null;
  if (isPlayer) {
    const playerGlow = makeSprite(data.accent, radius * (level >= 8 ? 3 : 2.2), 0.16);
    playerGlow.position.y = -0.03;
    group.add(playerGlow);
    group.userData.glow = playerGlow;
    if (level >= 5) {
      const light = new THREE.PointLight(data.accent, level >= 9 ? 3.1 : 1.3, radius * 7, 2);
      light.position.y = 1.2;
      group.add(light);
    }
  }
  return group;
}

function createGravityField() {
  const field = new THREE.Group();
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.91, 1, 80),
    new THREE.MeshBasicMaterial({ color: 0x67e7ff, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }),
  );
  ring.rotation.x = -Math.PI / 2;
  field.add(ring);
  const inner = new THREE.Mesh(
    new THREE.CircleGeometry(0.89, 64),
    new THREE.MeshBasicMaterial({ color: 0x5e97ff, transparent: true, opacity: 0.022, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }),
  );
  inner.rotation.x = -Math.PI / 2;
  field.add(inner);
  field.userData.ring = ring;
  return field;
}

function createStars() {
  const positions = new Float32Array(1100 * 3);
  const colors = new Float32Array(1100 * 3);
  const colorOptions = [new THREE.Color(0x91bbff), new THREE.Color(0xc4a5ff), new THREE.Color(0xffd9a3), new THREE.Color(0xeef8ff)];
  for (let index = 0; index < 1100; index += 1) {
    const radius = rand(55, 150);
    const angle = rand(0, Math.PI * 2);
    positions[index * 3] = Math.cos(angle) * radius;
    positions[index * 3 + 1] = rand(-25, 75);
    positions[index * 3 + 2] = Math.sin(angle) * radius - 25;
    const color = colorOptions[index % colorOptions.length];
    colors[index * 3] = color.r;
    colors[index * 3 + 1] = color.g;
    colors[index * 3 + 2] = color.b;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const stars = new THREE.Points(geometry, new THREE.PointsMaterial({ size: 0.28, vertexColors: true, transparent: true, opacity: 0.75, map: glowTexture, depthWrite: false, blending: THREE.AdditiveBlending }));
  infiniteWorld.starfield = stars;
  worldGroup.add(stars);

  const gridDivisions = currentGridDivisions();
  const gridGroup = new THREE.Group();
  for (let gridX = -1; gridX <= 1; gridX += 1) {
    for (let gridZ = -1; gridZ <= 1; gridZ += 1) {
      const tile = new THREE.Group();
      const grid = createWorldGrid(gridDivisions);
      tile.add(grid);
      const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(WORLD.gridTileSize, WORLD.gridTileSize),
        new THREE.MeshBasicMaterial({ color: 0x08112b, transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false }),
      );
      floor.rotation.x = -Math.PI / 2;
      floor.position.y = -0.82;
      tile.add(floor);
      tile.userData.offsetX = gridX;
      tile.userData.offsetZ = gridZ;
      tile.userData.grid = grid;
      gridGroup.add(tile);
      infiniteWorld.gridTiles.push(tile);
    }
  }
  infiniteWorld.gridGroup = gridGroup;
  infiniteWorld.gridDivisions = gridDivisions;
  worldGroup.add(gridGroup);
}

function currentGridDivisions() {
  const scaleFromStartingLevel = LEVELS[state.player.level - 1].radius / LEVELS[0].radius;
  return Math.max(14, Math.round(14 * scaleFromStartingLevel));
}

function createWorldGrid(divisions) {
  const grid = new THREE.GridHelper(WORLD.gridTileSize, divisions, 0x203f69, 0x15294e);
  grid.position.y = -0.8;
  grid.material.transparent = true;
  grid.material.opacity = 0.22;
  return grid;
}

function updateGridDensity() {
  const divisions = currentGridDivisions();
  if (divisions === infiniteWorld.gridDivisions) return;
  infiniteWorld.gridDivisions = divisions;
  infiniteWorld.gridTiles.forEach((tile) => {
    const oldGrid = tile.userData.grid;
    const newGrid = createWorldGrid(divisions);
    if (oldGrid) {
      tile.remove(oldGrid);
      oldGrid.geometry.dispose();
      oldGrid.material.dispose();
    }
    tile.userData.grid = newGrid;
    tile.add(newGrid);
  });
}

function regionForChunk(chunkX, chunkZ) {
  const hash = Math.abs((chunkX * 92821 + chunkZ * 68917 + chunkX * chunkZ * 31) % REGIONS.length);
  return REGIONS[hash];
}

function updateRegionVisuals() {
  const region = state.region || REGIONS[0];
  infiniteWorld.gridTiles.forEach((tile) => {
    const grid = tile.userData.grid;
    const materials = Array.isArray(grid?.material) ? grid.material : [grid?.material];
    materials.filter(Boolean).forEach((material) => {
      material.color.setHex(region.gridColor);
      material.opacity = region.id === "nebula" ? 0.17 : 0.22;
    });
  });
  if (ui.regionBadge) {
    ui.regionBadge.textContent = region.name;
    ui.regionBadge.style.setProperty("--region-color", `#${region.color.toString(16).padStart(6, "0")}`);
  }
}

function updateRegionForPosition(chunkX, chunkZ) {
  const key = `${chunkX}:${chunkZ}`;
  if (key === state.regionKey) return;
  const previous = state.region;
  state.regionKey = key;
  state.region = regionForChunk(chunkX, chunkZ);
  updateRegionVisuals();
  if (previous && previous.id !== state.region.id) {
    addToast(`進入 ${state.region.name} · ${state.region.description}`, `#${state.region.color.toString(16).padStart(6, "0")}`);
  }
}

function updateInfiniteWorld() {
  const tileSize = WORLD.gridTileSize;
  const chunkX = Math.floor(state.player.position.x / tileSize);
  const chunkZ = Math.floor(state.player.position.z / tileSize);
  if (chunkX !== infiniteWorld.chunkX || chunkZ !== infiniteWorld.chunkZ) {
    infiniteWorld.chunkX = chunkX;
    infiniteWorld.chunkZ = chunkZ;
    infiniteWorld.gridTiles.forEach((tile) => {
      tile.position.set(
        (chunkX + tile.userData.offsetX) * tileSize,
        0,
        (chunkZ + tile.userData.offsetZ) * tileSize,
      );
    });
    if (infiniteWorld.starfield) {
      infiniteWorld.starfield.position.x = Math.round(state.player.position.x / 100) * 100;
      infiniteWorld.starfield.position.z = Math.round(state.player.position.z / 100) * 100;
    }
  }
  updateRegionForPosition(chunkX, chunkZ);
}

function updateModel(model, time, delta) {
  if (!model) return;
  model.rotation.y += model.userData.rotationSpeed * delta;
  model.rotation.x = Math.sin(time * 0.4 + model.userData.phase) * 0.025;
  model.traverse((child) => {
    if (child === model) return;
    if (child.userData.spinSpeed) child.rotation.y += child.userData.spinSpeed * delta;
  });
  if (model.userData.glow) {
    const baseOpacity = model.userData.level >= 9 ? 0.23 : 0.13;
    model.userData.glow.material.opacity = baseOpacity + Math.sin(time * 2.1 + model.userData.phase) * baseOpacity * 0.25;
  }
}

function randomSpawnVelocity(level, position) {
  const data = LEVELS[level - 1];
  const radial = position.clone().sub(state.player.position).setY(0);
  if (radial.lengthSq() < 0.0001) radial.set(1, 0, 0);
  radial.normalize();

  const tangent = new THREE.Vector3(-radial.z, 0, radial.x);
  if (Math.random() < 0.5) tangent.negate();
  const randomAngle = rand(0, Math.PI * 2);
  const randomDirection = new THREE.Vector3(Math.cos(randomAngle), 0, Math.sin(randomAngle));
  const tangentBias = clamp(NATURAL_SPAWN_TANGENT_BIAS + rand(-0.12, 0.12), 0.5, 0.82);
  const direction = tangent.multiplyScalar(tangentBias)
    .addScaledVector(randomDirection, 1 - tangentBias);
  if (direction.lengthSq() < 0.0001) direction.copy(randomDirection);
  direction.normalize();

  const minimumSpeed = 1.1 + (10 - level) * 0.08;
  const speed = Math.min(NATURAL_SPAWN_MAX_SPEED, Math.max(minimumSpeed, data.drift * rand(1.15, 1.7)));
  return direction.multiplyScalar(speed);
}

function createBody(level, forcedPosition = null, options = {}) {
  const data = LEVELS[level - 1];
  const position = forcedPosition
    ? forcedPosition.clone()
    : options.insideViewport ? randomInitialBodyPosition(level) : randomBodyPosition(level);
  const initialVelocity = options.velocity ? options.velocity.clone() : randomSpawnVelocity(level, position);
  const body = {
    id: `${Date.now()}-${Math.random()}`,
    level,
    mass: options.mass ?? data.bodyMass,
    baseRadius: data.radius,
    baseGravityRadius: data.gravity,
    radius: data.radius,
    gravityRadius: data.gravity,
    sizeScale: options.sizeScale ?? 1,
    gravitySignal: 0,
    anomaly: Object.prototype.hasOwnProperty.call(options, "anomaly") ? options.anomaly : randomAnomalyForLevel(level),
    isBoss: options.isBoss ?? false,
    bossType: options.bossType ?? null,
    bossHealth: options.bossHealth ?? 0,
    bossTimer: 0,
    position,
    velocity: initialVelocity,
    phase: rand(0, Math.PI * 2),
    collisionCooldown: options.collisionCooldown ?? 0,
    gravityGrace: options.gravityGrace ?? 0,
    cometTail: null,
    group: createCelestialModel(level),
  };
  body.gravityAura = new THREE.Mesh(
    new THREE.RingGeometry(0.94, 1, 48),
    new THREE.MeshBasicMaterial({ color: data.accent, transparent: true, opacity: 0.025, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }),
  );
  body.gravityAura.rotation.x = -Math.PI / 2;
  body.gravityAura.scale.setScalar(data.gravity * 0.55);
  body.group.add(body.gravityAura);
  body.group.position.copy(position);
  bodyGroup.add(body.group);
  state.bodies.push(body);
  updateBodyVisualScale(body);
  if (body.anomaly) decorateAnomaly(body);
  if (body.isBoss) decorateBoss(body);
  return body;
}

function decorateAnomaly(body) {
  const anomaly = dataForId(ANOMALIES, body.anomaly);
  if (!anomaly) return;
  const baseRadius = LEVELS[body.level - 1].radius;
  const ring = addRing(body.group, baseRadius * 1.28, Math.max(0.025, baseRadius * 0.035), anomaly.color, 0.82, 0.52, 0.55);
  const sprite = makeSprite(anomaly.color, baseRadius * 2.25, 0.2);
  sprite.position.y = baseRadius * 0.15;
  body.group.add(sprite);
  body.anomalyVisual = { ring, sprite, phase: rand(0, Math.PI * 2) };
}

function decorateBoss(body) {
  const boss = activeBossData(body);
  if (!boss) return;
  const baseRadius = LEVELS[body.level - 1].radius;
  const outer = addRing(body.group, baseRadius * 1.5, Math.max(0.06, baseRadius * 0.045), boss.color, 0.85, 0.34, 0.22);
  const core = makeSprite(boss.color, baseRadius * 3.25, 0.18);
  core.position.y = baseRadius * 0.12;
  body.group.add(core);
  body.bossVisual = { outer, core, phase: rand(0, Math.PI * 2) };
}

function randomBodyPosition(level) {
  const player = state.player.position;
  const isThreat = level > state.player.level;
  const minDistance = isThreat ? 18 : 12;
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const angle = rand(0, Math.PI * 2);
    const distance = rand(minDistance, WORLD.spawnRadius);
    const position = new THREE.Vector3(
      player.x + Math.cos(angle) * distance,
      0,
      player.z + Math.sin(angle) * distance,
    );
    if (position.distanceTo(player) >= minDistance
      && isPointOutsideViewport(position, VIEWPORT_SPAWN_MARGIN)
      && hasSpawnClearance(position, level)) return position;
  }

  // 避免極端螢幕比例下隨機嘗試不足，沿著多個方向尋找真正的畫面外位置。
  const fallbackAngles = Array.from({ length: 24 }, (_, index) => (index / 24) * Math.PI * 2);
  const fallbackDistances = [WORLD.spawnRadius, WORLD.spawnRadius + 10, WORLD.recycleRadius - 5];
  for (const distance of fallbackDistances) {
    for (const angle of fallbackAngles) {
      const position = new THREE.Vector3(
        player.x + Math.cos(angle) * distance,
        0,
        player.z + Math.sin(angle) * distance,
      );
      if (isPointOutsideViewport(position, 0.08) && hasSpawnClearance(position, level)) return position;
    }
  }

  return player.clone().add(new THREE.Vector3(WORLD.recycleRadius - 5, 0, 0));
}

function randomInitialBodyPosition(level) {
  const player = state.player.position;
  const minDistance = level > state.player.level ? 18 : 5.5;
  for (let attempt = 0; attempt < 160; attempt += 1) {
    const angle = rand(0, Math.PI * 2);
    const distance = rand(minDistance, 34);
    const position = new THREE.Vector3(
      player.x + Math.cos(angle) * distance,
      0,
      player.z + Math.sin(angle) * distance,
    );
    if (isPointInsideViewport(position, 0.12) && hasSpawnClearance(position, level)) return position;
  }

  const fallbackAngles = Array.from({ length: 24 }, (_, index) => (index / 24) * Math.PI * 2);
  for (const distance of [8, 12, 18, 24, 30]) {
    if (distance < minDistance) continue;
    for (const angle of fallbackAngles) {
      const position = new THREE.Vector3(
        player.x + Math.cos(angle) * distance,
        0,
        player.z + Math.sin(angle) * distance,
      );
      if (isPointInsideViewport(position, 0.06) && hasSpawnClearance(position, level)) return position;
    }
  }

  return randomBodyPosition(level);
}

function hasSpawnClearance(position, level) {
  const candidateRadius = LEVELS[level - 1].radius * bodyScaleRelativeToPlayer();
  return state.bodies.every((body) => (
    position.distanceTo(body.position) >= candidateRadius + body.radius + NATURAL_SPAWN_CLEARANCE
  ));
}

function isPointOutsideViewport(position, margin = 0) {
  camera.updateMatrixWorld(true);
  const projected = position.clone().project(camera);
  return projected.z < -1 || projected.z > 1
    || projected.x < -1 - margin || projected.x > 1 + margin
    || projected.y < -1 - margin || projected.y > 1 + margin;
}

function isPointInsideViewport(position, margin = 0) {
  camera.updateMatrixWorld(true);
  const projected = position.clone().project(camera);
  return projected.z >= -1 && projected.z <= 1
    && projected.x >= -1 + margin && projected.x <= 1 - margin
    && projected.y >= -1 + margin && projected.y <= 1 - margin;
}

function bodyScaleRelativeToPlayer() {
  return PLAYER_RADIUS / LEVELS[state.player.level - 1].radius;
}

function updateBodyVisualScale(body) {
  const scale = bodyScaleRelativeToPlayer();
  body.radius = body.baseRadius * scale * body.sizeScale;
  body.gravityRadius = body.baseGravityRadius * scale * body.sizeScale;
  body.group.scale.setScalar(scale * body.sizeScale);
}

function updateAllBodyScales() {
  state.bodies.forEach(updateBodyVisualScale);
}

function createCometTail(body) {
  if (!cometTailGeometry) cometTailGeometry = new THREE.ConeGeometry(1, 1, 12, 1, true);
  const color = LEVELS[body.level - 1].accent;
  const outerMaterial = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.2,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const innerMaterial = outerMaterial.clone();
  innerMaterial.color = new THREE.Color(0xeafcff);
  innerMaterial.opacity = 0.32;
  const group = new THREE.Group();
  const outer = new THREE.Mesh(cometTailGeometry, outerMaterial);
  const inner = new THREE.Mesh(cometTailGeometry, innerMaterial);
  inner.scale.set(0.42, 0.82, 0.42);
  inner.position.y = -0.04;
  group.add(outer, inner);
  bodyGroup.add(group);
  body.cometTail = { group, outerMaterial, innerMaterial };
}

function updateCometTail(body) {
  const speedSquared = body.velocity.x * body.velocity.x + body.velocity.z * body.velocity.z;
  const isBelowPlayerLevel = body.level <= state.player.level - 1;
  const shouldShow = isBelowPlayerLevel
    && speedSquared >= COMET_TAIL_MIN_SPEED * COMET_TAIL_MIN_SPEED;
  if (!shouldShow) {
    if (body.cometTail) body.cometTail.group.visible = false;
    return;
  }
  if (!body.cometTail) createCometTail(body);

  const speed = Math.sqrt(speedSquared);
  const awayFromMotion = new THREE.Vector3(-body.velocity.x, 0, -body.velocity.z).normalize();
  const tailLength = clamp(1.9 + speed * 0.42 + body.radius * 0.45, 2.2, 6.2);
  const tailWidth = clamp(body.radius * 0.58, 0.12, 0.72);
  const tail = body.cometTail;
  tail.group.visible = true;
  tail.group.position.copy(body.position).addScaledVector(awayFromMotion, body.radius + tailLength * 0.5);
  tail.group.position.y = body.group.position.y;
  tail.group.quaternion.setFromUnitVectors(COMET_TAIL_AXIS, awayFromMotion);
  tail.group.scale.set(tailWidth, tailLength, tailWidth);
  const pulse = 0.88 + Math.sin(state.time * 7 + body.phase) * 0.12;
  tail.outerMaterial.opacity = clamp(0.12 + speed * 0.025, 0.12, 0.28) * pulse;
  tail.innerMaterial.opacity = clamp(0.22 + speed * 0.035, 0.22, 0.44) * pulse;
}

function removeCometTail(body) {
  if (!body.cometTail) return;
  bodyGroup.remove(body.cometTail.group);
  body.cometTail.outerMaterial.dispose();
  body.cometTail.innerMaterial.dispose();
  body.cometTail = null;
}

function removeBody(body) {
  removeCometTail(body);
  bodyGroup.remove(body.group);
  const index = state.bodies.indexOf(body);
  if (index >= 0) state.bodies.splice(index, 1);
}

function createBurst(position, color, count = 24, power = 2.4) {
  if (!glowTexture) glowTexture = makeGlowTexture();
  const positions = new Float32Array(count * 3);
  const velocities = [];
  for (let index = 0; index < count; index += 1) {
    positions[index * 3] = position.x;
    positions[index * 3 + 1] = 0.1;
    positions[index * 3 + 2] = position.z;
    const direction = new THREE.Vector3(rand(-1, 1), rand(-0.12, 0.5), rand(-1, 1)).normalize();
    velocities.push(direction.multiplyScalar(rand(power * 0.35, power)));
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({ color, size: 0.42, map: glowTexture, transparent: true, opacity: 0.95, depthWrite: false, blending: THREE.AdditiveBlending });
  const points = new THREE.Points(geometry, material);
  effectGroup.add(points);
  state.effects.push({ points, geometry, material, velocities, life: 0, maxLife: rand(0.45, 0.9) });
}

function createDamageFragments(position, impactDirection, level) {
  const group = new THREE.Group();
  const data = LEVELS[level - 1];
  const fragments = [];
  const fragmentMaterial = new THREE.MeshStandardMaterial({
    color: data.color,
    emissive: data.accent,
    emissiveIntensity: level >= 4 ? 0.45 : 0.12,
    roughness: 0.62,
    metalness: 0.08,
    transparent: true,
    opacity: 0.95,
  });
  for (let index = 0; index < 11; index += 1) {
    const size = rand(0.08, 0.2) * (level >= 7 ? 1.2 : 1);
    const fragment = new THREE.Mesh(new THREE.IcosahedronGeometry(size, 0), fragmentMaterial.clone());
    const direction = impactDirection.clone().multiplyScalar(rand(1.1, 2.2));
    direction.x += rand(-0.8, 0.8);
    direction.y = rand(0.3, 1.4);
    direction.z += rand(-0.8, 0.8);
    fragments.push({
      mesh: fragment,
      velocity: direction,
      spin: new THREE.Vector3(rand(-7, 7), rand(-7, 7), rand(-7, 7)),
    });
    group.add(fragment);
  }
  group.position.copy(position);
  effectGroup.add(group);
  state.effects.push({ group, fragments, life: 0, maxLife: 0.82, isFragments: true });
}

function createEvolutionBurst(position, color) {
  createBurst(position, color, 120, 7.5);
  const halo = makeSprite(color, 18, 0.5);
  halo.position.copy(position);
  effectGroup.add(halo);
  state.effects.push({ halo, material: halo.material, life: 0, maxLife: 0.8, isHalo: true });
}

function addToast(text, color = "#eafbff") {
  const item = document.createElement("div");
  item.className = "toast-item";
  item.textContent = text;
  item.style.color = color;
  ui.sceneToast.appendChild(item);
  window.setTimeout(() => item.remove(), 950);
}

function updateEffects(delta) {
  for (let index = state.effects.length - 1; index >= 0; index -= 1) {
    const effect = state.effects[index];
    effect.life += delta;
    const ratio = effect.life / effect.maxLife;
    if (effect.isFragments) {
      effect.fragments.forEach((fragment) => {
        fragment.mesh.position.addScaledVector(fragment.velocity, delta);
        fragment.velocity.y -= 3.2 * delta;
        fragment.mesh.rotation.x += fragment.spin.x * delta;
        fragment.mesh.rotation.y += fragment.spin.y * delta;
        fragment.mesh.rotation.z += fragment.spin.z * delta;
        fragment.mesh.material.opacity = Math.max(0, 1 - ratio);
      });
    } else if (effect.isHalo) {
      effect.halo.scale.setScalar(1 + ratio * 1.8);
      effect.material.opacity = 0.5 * (1 - ratio);
    } else {
      const position = effect.points.geometry.attributes.position;
      for (let particle = 0; particle < effect.velocities.length; particle += 1) {
        position.array[particle * 3] += effect.velocities[particle].x * delta;
        position.array[particle * 3 + 1] += effect.velocities[particle].y * delta;
        position.array[particle * 3 + 2] += effect.velocities[particle].z * delta;
        effect.velocities[particle].y -= 2.5 * delta;
      }
      position.needsUpdate = true;
      effect.material.opacity = Math.max(0, 1 - ratio);
    }
    if (effect.life >= effect.maxLife) {
      effectGroup.remove(effect.points || effect.halo || effect.group);
      effect.geometry?.dispose();
      effect.material?.dispose();
      if (effect.isFragments) effect.fragments.forEach((fragment) => {
        fragment.mesh.geometry.dispose();
        fragment.mesh.material.dispose();
      });
      state.effects.splice(index, 1);
    }
  }
}

function currentGravityRadius() {
  return LEVELS[state.player.level - 1].gravity * (1 + state.player.coreUpgrade * 0.05);
}

function currentGravityFieldRadius() {
  return Math.min(9, currentGravityRadius() * 0.55);
}

function currentPlayerRadius() {
  return PLAYER_RADIUS;
}

function currentPlayerAbsorbRadius() {
  return PLAYER_RADIUS * (1 + state.player.perks.collector * 0.08);
}

function gravityMassFor(entity) {
  if (entity === state.player) return entity.mass * (1 + entity.coreUpgrade * 0.1);
  const boss = activeBossData(entity);
  if (boss) return entity.mass * boss.gravityMultiplier;
  return entity.mass;
}

function gravityRadiusFor(entity) {
  return entity === state.player ? currentGravityRadius() : entity.gravityRadius;
}

function collisionRadiusFor(entity) {
  return entity === state.player ? currentPlayerRadius() : entity.radius;
}

function inverseMassFor(entity) {
  return 1 / Math.max(1, entity.mass);
}

function accelerationResponseFor(entity) {
  return clamp(Math.pow(Math.max(1, entity.mass), -0.12), 0.28, 1);
}

function applyGravityPair(first, second, delta) {
  if ((first.gravityGrace ?? 0) > 0 || (second.gravityGrace ?? 0) > 0) return;
  const offset = second.position.clone().sub(first.position);
  const distanceSquared = offset.lengthSq();
  const distance = Math.max(0.5, Math.sqrt(distanceSquared));
  const direction = distanceSquared > 0.0001 ? offset.clone().normalize() : new THREE.Vector3();
  const softenedDistanceCubed = Math.pow(distanceSquared + GRAVITY_SOFTENING * GRAVITY_SOFTENING, 1.5);
  let firstAcceleration = clamp(
    GRAVITY_CONSTANT * gravityMassFor(second) * distance / softenedDistanceCubed,
    0,
    GRAVITY_MAX_ACCELERATION,
  ) * accelerationResponseFor(first);
  let secondAcceleration = clamp(
    GRAVITY_CONSTANT * gravityMassFor(first) * distance / softenedDistanceCubed,
    0,
    GRAVITY_MAX_ACCELERATION,
  ) * accelerationResponseFor(second);
  const regionMultiplier = state.region?.gravityMultiplier || 1;
  const eventMultiplier = activeCosmicEvent()?.gravityMultiplier || 1;
  const combinedMultiplier = regionMultiplier * eventMultiplier;
  firstAcceleration *= combinedMultiplier;
  secondAcceleration *= combinedMultiplier;
  first.velocity.addScaledVector(direction, firstAcceleration * delta);
  second.velocity.addScaledVector(direction, -secondAcceleration * delta);

  const signalRange = Math.max(gravityRadiusFor(first), gravityRadiusFor(second)) * 1.35;
  const signal = clamp((signalRange - distance) / signalRange, 0, 1);
  if (first.gravitySignal !== undefined) first.gravitySignal = Math.max(first.gravitySignal, signal);
  if (second.gravitySignal !== undefined) second.gravitySignal = Math.max(second.gravitySignal, signal);
}

function resolveSolidCollision(first, second) {
  const offset = second.position.clone().sub(first.position);
  const distanceSquared = offset.lengthSq();
  const distance = Math.sqrt(distanceSquared);
  const minimumDistance = collisionRadiusFor(first) + collisionRadiusFor(second);
  if (distance >= minimumDistance) return null;

  const normal = distance > 0.0001 ? offset.multiplyScalar(1 / distance) : new THREE.Vector3(1, 0, 0);
  const firstInverseMass = inverseMassFor(first);
  const secondInverseMass = inverseMassFor(second);
  const inverseMassTotal = firstInverseMass + secondInverseMass;
  const penetration = minimumDistance - distance;
  const separationGap = Math.min(COLLISION_SEPARATION_GAP, minimumDistance * 0.08);
  const correctionDistance = penetration + separationGap;
  first.position.addScaledVector(normal, -correctionDistance * firstInverseMass / inverseMassTotal);
  second.position.addScaledVector(normal, correctionDistance * secondInverseMass / inverseMassTotal);

  const relativeVelocity = second.velocity.clone().sub(first.velocity);
  const velocityAlongNormal = relativeVelocity.dot(normal);
  if (velocityAlongNormal < COLLISION_SEPARATION_SPEED) {
    const penetrationRatio = clamp(penetration / Math.max(0.001, minimumDistance), 0, 1);
    const repulsionSpeed = COLLISION_SEPARATION_SPEED * (1 + penetrationRatio * 0.75);
    const playerReboundBonus = first === state.player || second === state.player
      ? 1 + state.player.perks.rebound * 0.22
      : 1;
    const targetSeparationSpeed = Math.max(repulsionSpeed * playerReboundBonus, -velocityAlongNormal * COLLISION_RESTITUTION * playerReboundBonus);
    const impulse = (targetSeparationSpeed - velocityAlongNormal) / inverseMassTotal;
    first.velocity.addScaledVector(normal, -impulse * firstInverseMass);
    second.velocity.addScaledVector(normal, impulse * secondInverseMass);
  }

  return {
    position: first.position.clone().lerp(second.position, 0.5),
    normal,
  };
}

function rebuildPlayerModel() {
  state.evolutionAnimation = null;
  playerRoot.clear();
  state.player.model = createCelestialModel(state.player.level, true);
  state.player.field = createGravityField();
  playerRoot.add(state.player.model, state.player.field);
  updatePlayerVisual();
}

function updatePlayerVisual() {
  const scale = PLAYER_RADIUS / LEVELS[state.player.level - 1].radius;
  state.player.model.scale.setScalar(scale);
  const fieldScale = currentGravityFieldRadius();
  state.player.field.scale.setScalar(fieldScale);
  state.player.field.userData.ring.material.opacity = 0.28 + state.player.coreUpgrade * 0.02;
  state.player.field.userData.ring.rotation.z += 0.0018;
}

function absorbBody(body) {
  if (!state.bodies.includes(body)) return;
  const anomaly = dataForId(ANOMALIES, body.anomaly);
  const gain = body.mass * (anomaly?.massMultiplier || 1) * (1 + state.player.perks["mass-core"] * 0.12);
  const oldLevel = state.player.level;
  state.player.mass += gain;
  state.player.energy += Math.max(1, Math.round(gain * 0.15)) + (anomaly?.energyBonus || 0);
  state.player.combo += 1;
  state.player.comboTimer = 1.8;
  state.chainCombo = Math.max(state.chainCombo, state.player.combo);
  state.chainTimer = Math.max(state.chainTimer, 1.8);
  state.highMass = Math.max(state.highMass, state.player.mass);
  state.highLevel = Math.max(state.highLevel, state.player.level);
  removeBody(body);
  createBurst(body.position, LEVELS[body.level - 1].accent, 18, 2.4);
  addToast(`+${formatNumber(gain)} 質量`, anomaly ? `#${anomaly.color.toString(16).padStart(6, "0")}` : "#a8f4ff");
  updateMission("absorb");
  if (anomaly) {
    state.player.comboTimer += anomaly.comboBonus || 0;
    updateMission("anomaly");
    addToast(`${anomaly.name} · 星能 +${anomaly.energyBonus || 0}`, `#${anomaly.color.toString(16).padStart(6, "0")}`);
  }
  if (state.player.combo >= 3) {
    state.player.energy += 1;
    ui.comboValue.textContent = state.player.combo;
    ui.comboPill.hidden = false;
    addToast(`連擊 ×${state.player.combo}  ·  星能 +1`, "#ffd77c");
  }
  maybeAutoUpgrade();
  const nextLevel = levelForMass(state.player.mass);
  if (nextLevel > oldLevel) {
    triggerEvolution(nextLevel);
  } else {
    updatePlayerVisual();
  }
}

function maybeAutoUpgrade() {
  while (state.player.energy >= upgradeCost()) {
    const cost = upgradeCost();
    state.player.energy -= cost;
    state.player.coreUpgrade += 1;
    updatePlayerVisual();
    createBurst(state.player.position, 0xffd77c, 30, 3.6);
    addToast(`引力核心自動升級 · LV ${state.player.coreUpgrade}`, "#ffd77c");
  }
}

function evolutionChoicesForLevel() {
  const choices = [...EVOLUTION_PERKS];
  for (let index = choices.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [choices[index], choices[swapIndex]] = [choices[swapIndex], choices[index]];
  }
  return choices.slice(0, 3);
}

function renderEvolutionChoices() {
  if (!ui.evolutionChoices) return;
  ui.evolutionChoices.innerHTML = "";
  state.evolutionChoice = null;
  const choices = evolutionChoicesForLevel();
  state.evolutionChoices = choices;
  choices.forEach((perk, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "evolution-choice";
    button.dataset.index = String(index);
    button.style.setProperty("--choice-color", perk.color);
    button.innerHTML = `<strong>${perk.name}</strong><span>${perk.description}</span>`;
    button.addEventListener("click", () => chooseEvolutionPerk(index));
    ui.evolutionChoices.appendChild(button);
  });
  ui.evolutionNote.textContent = "選擇一項進化分支；按空白鍵會採用第一項並繼續探索。";
  ui.evolutionContinue.disabled = false;
}

function chooseEvolutionPerk(index) {
  const perk = state.evolutionChoices?.[index];
  if (!perk || state.evolutionChoice) return;
  state.evolutionChoice = perk.id;
  state.player.perks[perk.id] += 1;
  if (perk.id === "shield") state.player.shieldMax += 1;
  if (perk.id === "shield") state.player.shield = Math.min(state.player.shieldMax, state.player.shield + 1);
  document.querySelectorAll(".evolution-choice").forEach((button, buttonIndex) => {
    button.classList.toggle("selected", buttonIndex === index);
    button.disabled = buttonIndex !== index;
  });
  ui.evolutionNote.textContent = `已選擇「${perk.name}」：${perk.description}`;
  addToast(`進化分支 · ${perk.name}`, perk.color);
  updatePlayerVisual();
}

function triggerEvolution(nextLevel) {
  state.status = "evolving";
  state.player.level = nextLevel;
  updateMissionAbsolute("reach-level", nextLevel);
  state.player.shield = Math.min(state.player.shieldMax, state.player.shield + 1);
  state.highLevel = Math.max(state.highLevel, nextLevel);
  const data = LEVELS[nextLevel - 1];
  const oldModel = state.player.model;
  const newModel = createCelestialModel(nextLevel, true);
  const oldScale = oldModel.scale.x;
  const newScale = PLAYER_RADIUS / data.radius;
  newModel.scale.setScalar(newScale * 0.04);
  oldModel.visible = true;
  playerRoot.add(newModel);
  state.player.model = newModel;
  createEvolutionBurst(state.player.position, data.accent);
  updateAllBodyScales();
  updateGridDensity();
  ui.evolutionName.textContent = data.name;
  ui.evolutionDescription.textContent = data.description;
  ui.evolutionPopup.hidden = true;
  if (ui.evolutionChoices) ui.evolutionChoices.innerHTML = "";
  state.evolutionAnimation = {
    oldModel,
    newModel,
    oldScale,
    newScale,
    accent: data.accent,
    elapsed: 0,
    duration: 1.2,
    finalBurst: false,
  };
  addToast(`進化中 · ${data.name}`, "#d6fbff");
  ui.canvasFrame.classList.add("evolving-flash");
  window.setTimeout(() => ui.canvasFrame.classList.remove("evolving-flash"), 500);
}

function updateEvolutionAnimation(delta) {
  const animation = state.evolutionAnimation;
  if (!animation) return;
  animation.elapsed += delta;
  const progress = clamp(animation.elapsed / animation.duration, 0, 1);
  const eased = 1 - Math.pow(1 - progress, 3);
  const oldScale = Math.max(animation.oldScale * (1 - eased), 0.015);
  const newScale = animation.newScale * (0.04 + eased * 0.96);
  animation.oldModel.scale.setScalar(oldScale);
  animation.newModel.scale.setScalar(newScale);
  animation.oldModel.rotation.y += delta * 3.4;
  animation.newModel.rotation.y += delta * 1.7;
  updateModel(animation.oldModel, state.time, delta);
  updateModel(animation.newModel, state.time, delta);
  if (progress > 0.52 && !animation.finalBurst) {
    animation.finalBurst = true;
    createEvolutionBurst(state.player.position, animation.accent);
  }
  if (progress < 1) return;
  playerRoot.remove(animation.oldModel);
  animation.newModel.scale.setScalar(animation.newScale);
  state.evolutionAnimation = null;
  updatePlayerVisual();
  renderEvolutionChoices();
  ui.evolutionPopup.hidden = false;
  addToast(`進化完成 · ${LEVELS[state.player.level - 1].name}`, "#d6fbff");
}

function continueAfterEvolution() {
  if (state.status !== "evolving") return;
  if (!state.evolutionChoice) chooseEvolutionPerk(0);
  state.status = "playing";
  ui.evolutionPopup.hidden = true;
  updateInfiniteWorld();
}

function takeHit(body) {
  if (state.player.invulnerable > 0 || state.status !== "playing") return;
  const damage = body.isBoss || body.level - state.player.level >= 2 ? 2 : 1;
  const lossRate = damage === 2 ? 0.35 : 0.15;
  state.player.shield -= damage;
  state.player.mass = Math.max(1, Math.round(state.player.mass * (1 - lossRate)));
  state.player.invulnerable = 1.5;
  const impactDirection = state.player.position.clone().sub(body.position).setY(0).normalize();
  state.player.velocity.add(impactDirection.clone().multiplyScalar(5));
  createBurst(state.player.position, 0xff7b8b, 42, 4.6);
  createDamageFragments(state.player.position, impactDirection, state.player.level);
  addToast(`引力撞擊 · 護盾 -${damage}`, "#ff9ca8");
  const newLevel = levelForMass(state.player.mass);
  if (newLevel < state.player.level) {
    state.player.level = newLevel;
    rebuildPlayerModel();
    updateAllBodyScales();
    updateGridDensity();
    addToast(`星體退化 · ${LEVELS[newLevel - 1].name}`, "#ffb0bd");
  }
  if (state.player.shield <= 0) endGame();
}

function updatePlayer(delta) {
  const player = state.player;
  const movement = new THREE.Vector3(
    (input.has("right") ? 1 : 0) - (input.has("left") ? 1 : 0) + joystickInput.x,
    0,
    (input.has("down") ? 1 : 0) - (input.has("up") ? 1 : 0) + joystickInput.y,
  );
  if (movement.lengthSq() > 0) movement.normalize();
  const playerSpeed = 12.5;
  const playerAcceleration = 28
    * (1 + player.perks.thruster * 0.16)
    * (state.region?.playerAccelerationMultiplier || 1)
    * (activeCosmicEvent()?.playerAccelerationMultiplier || 1);
  player.velocity.addScaledVector(movement, playerAcceleration * delta);

  let nearestDanger = null;
  for (const body of state.bodies) {
    const offset = body.position.clone().sub(player.position);
    const distance = Math.max(0.1, offset.length());
    const bodyIsThreat = body.level > player.level;
    if (bodyIsThreat) {
      const dangerRadius = body.gravityRadius * (body.level >= player.level + 2 ? 1.08 : 0.92)
        * (body.isBoss ? 1.18 : 1);
      if (distance < dangerRadius) {
        if (!nearestDanger || distance < nearestDanger.distance) nearestDanger = { body, distance };
      }
    }
  }

  player.velocity.multiplyScalar(Math.exp(-5.2 * delta));
  if (player.velocity.length() > playerSpeed) player.velocity.setLength(playerSpeed);
  player.position.addScaledVector(player.velocity, delta);
  updateInfiniteWorld();
  player.invulnerable = Math.max(0, player.invulnerable - delta);
  player.comboTimer -= delta;
  if (player.comboTimer <= 0) {
    player.combo = 0;
  }
  player.comboTimer = Math.max(0, player.comboTimer);
  state.chainTimer -= delta;
  if (state.chainTimer <= 0) state.chainCombo = 0;
  updateMissionAbsolute("survive", Math.floor(state.time));
  playerRoot.position.copy(player.position);
  playerRoot.position.y = Math.sin(state.time * 2.2) * 0.16;
  if (player.invulnerable > 0) state.player.model.visible = Math.floor(state.time * 16) % 2 === 0;
  else state.player.model.visible = true;

  if (nearestDanger) {
    ui.dangerAlert.hidden = false;
    ui.dangerName.textContent = `${LEVELS[nearestDanger.body.level - 1].name}靠近`;
    ui.dangerDistance.textContent = `距離 ${nearestDanger.distance.toFixed(1)} · 立即逃離`;
  } else {
    ui.dangerAlert.hidden = true;
  }
}

function updateBodyGravity(delta) {
  for (const body of state.bodies) body.gravitySignal = 0;
  for (const body of state.bodies) applyGravityPair(state.player, body, delta);
  for (let firstIndex = 0; firstIndex < state.bodies.length; firstIndex += 1) {
    const first = state.bodies[firstIndex];
    for (let secondIndex = firstIndex + 1; secondIndex < state.bodies.length; secondIndex += 1) {
      const second = state.bodies[secondIndex];
      applyGravityPair(first, second, delta);
    }
  }
  const playerVelocityCap = 12.5;
  if (state.player.velocity.lengthSq() > playerVelocityCap * playerVelocityCap) state.player.velocity.setLength(playerVelocityCap);
  state.bodies.forEach((body) => {
    const bodyVelocityCap = Math.max(6, LEVELS[body.level - 1].drift * 3.5) * (body.isBoss ? 0.82 : 1);
    if (body.velocity.lengthSq() > bodyVelocityCap * bodyVelocityCap) body.velocity.setLength(bodyVelocityCap);
  });
  for (const body of state.bodies) {
    body.gravityAura.material.opacity = 0.025 + body.gravitySignal * 0.085;
    body.gravityAura.rotation.z += delta * 0.5;
  }
}

function updateBodies(delta) {
  const toRemove = [];
  for (const body of state.bodies) {
    body.collisionCooldown = Math.max(0, body.collisionCooldown - delta);
    body.gravityGrace = Math.max(0, body.gravityGrace - delta);
    if (body.isBoss) {
      body.bossTimer += delta;
      const boss = activeBossData(body);
      if (boss && body.bossTimer >= boss.duration) {
        defeatBoss(body);
        continue;
      }
    }
    const driftResponse = accelerationResponseFor(body);
    const drift = body.velocity.clone();
    const driftMultiplier = (state.region?.bodyDriftMultiplier || 1) * (activeCosmicEvent()?.bodyDriftMultiplier || 1);
    drift.x += Math.sin(state.time * 0.36 + body.phase) * 0.12 * driftResponse * driftMultiplier;
    drift.z += Math.cos(state.time * 0.31 + body.phase * 1.3) * 0.12 * driftResponse * driftMultiplier;
    body.position.addScaledVector(drift, delta);
    body.group.position.copy(body.position);
    body.group.position.y = Math.sin(state.time * 1.1 + body.phase) * 0.25;
    updateModel(body.group, state.time, delta);
    updateCometTail(body);
    updateAnomalyVisual(body, delta);
    updateBossVisual(body, delta);

    const distance = body.position.distanceTo(state.player.position);
    if (distance > WORLD.recycleRadius) {
      if (body.isBoss) defeatBoss(body, true);
      else toRemove.push(body);
    }
  }
  toRemove.forEach(removeBody);
}

function updateAnomalyVisual(body, delta) {
  if (!body.anomalyVisual) return;
  const { ring, sprite, phase } = body.anomalyVisual;
  ring.rotation.y += delta * 0.55;
  sprite.material.opacity = 0.15 + Math.sin(state.time * 4 + phase) * 0.05;
}

function updateBossVisual(body, delta) {
  if (!body.bossVisual) return;
  const { outer, core, phase } = body.bossVisual;
  outer.rotation.z += delta * 0.28;
  core.material.opacity = 0.14 + Math.sin(state.time * 3.2 + phase) * 0.05;
}

function registerChainCollision(position, level) {
  const previousCombo = state.chainCombo;
  state.chainCombo = Math.min(12, state.chainCombo + 1);
  state.chainTimer = 2.6;
  updateMission("chain");
  if (state.chainCombo > previousCombo && state.chainCombo >= 2 && (state.chainCombo === 2 || state.chainCombo % 2 === 0)) {
    const reward = Math.min(5, 1 + Math.floor(state.chainCombo / 4));
    state.player.energy += reward;
    ui.comboValue.textContent = state.chainCombo;
    ui.comboPill.hidden = false;
    addToast(`碰撞連鎖 ×${state.chainCombo} · 星能 +${reward}`, `#${LEVELS[level - 1].accent.toString(16).padStart(6, "0")}`);
  }
}

function spawnBoss() {
  if (state.bodies.some((body) => body.isBoss) || state.player.level < 3) return;
  const boss = BOSSES[Math.floor(Math.random() * BOSSES.length)];
  const level = clamp(state.player.level + 2, 3, 10);
  const position = randomBodyPosition(level);
  createBody(level, position, {
    isBoss: true,
    bossType: boss.id,
    bossHealth: boss.health + Math.floor(state.player.level / 4),
    mass: LEVELS[level - 1].bodyMass * (1.8 + state.player.level * 0.12),
    sizeScale: boss.sizeScale,
    anomaly: null,
    velocity: randomSpawnVelocity(level, position).multiplyScalar(0.48),
    collisionCooldown: 0.8,
    gravityGrace: 0.8,
  });
  addToast(`Boss 出現 · ${boss.name}`, `#${boss.color.toString(16).padStart(6, "0")}`);
}

function defeatBoss(body, escaped = false) {
  if (!body || !state.bodies.includes(body)) return;
  const boss = activeBossData(body);
  const position = body.position.clone();
  removeBody(body);
  state.player.energy += escaped ? 18 : 26;
  updateMission("boss");
  createBurst(position, boss?.color || 0xffd77c, escaped ? 48 : 76, escaped ? 4.6 : 6.2);
  addToast(`${boss?.name || "Boss"} ${escaped ? "離開" : "崩解"} · 星能 +${escaped ? 18 : 26}`, `#${(boss?.color || 0xffd77c).toString(16).padStart(6, "0")}`);
}

function damageBoss(body, position, fromPlayer = true) {
  if (!body || !state.bodies.includes(body) || !body.isBoss) return;
  body.bossHealth -= fromPlayer ? 1 : 1;
  createBurst(position || body.position, activeBossData(body)?.color || 0xffd77c, 18, 2.8);
  addToast(`${activeBossData(body)?.name || "Boss"} · HP ${Math.max(0, body.bossHealth)}`, "#ffcf92");
  if (body.bossHealth <= 0) defeatBoss(body);
}

function resolveBossBodyCollision(boss, other, collision) {
  if (!state.bodies.includes(boss) || !state.bodies.includes(other)) return;
  registerChainCollision(collision.position, boss.level);
  if (other.level >= boss.level - 1) {
    damageBoss(boss, collision.position, false);
    if (state.bodies.includes(other)) removeBody(other);
    return;
  }
  absorbBodyIntoBody(boss, other, collision);
}

function updateBossSystem(delta) {
  state.bossCooldown = Math.max(0, state.bossCooldown - delta);
  if (state.time < BOSS_FIRST_DELAY || state.player.level < 3) return;
  if (state.bodies.some((body) => body.isBoss) || state.bossCooldown > 0) return;
  spawnBoss();
  state.bossCooldown = BOSS_COOLDOWN;
}

function startCosmicEvent() {
  if (activeCosmicEvent()) return;
  const previousId = state.cosmicEvent.lastEventId;
  const available = COSMIC_EVENTS.filter((event) => event.id !== previousId);
  const event = available[Math.floor(Math.random() * available.length)];
  state.cosmicEvent.event = event.id;
  state.cosmicEvent.lastEventId = event.id;
  state.cosmicEvent.remaining = event.duration;
  state.cosmicEvent.spawnTimer = 0;
  addToast(`宇宙事件 · ${event.name}`, `#${event.color.toString(16).padStart(6, "0")}`);
}

function endCosmicEvent() {
  const event = activeCosmicEvent();
  if (!event) return;
  addToast(`${event.name} 結束 · 宇宙恢復穩定`, "#a8f4ff");
  state.cosmicEvent.event = null;
  state.cosmicEvent.remaining = 0;
  state.cosmicEvent.cooldown = COSMIC_EVENT_COOLDOWN;
}

function spawnMeteorDuringEvent() {
  if (state.bodies.length >= WORLD.maxBodies) return;
  const level = clamp(state.player.level - (Math.random() < 0.72 ? 1 : 0), 1, 10);
  const position = randomBodyPosition(level);
  createBody(level, position, {
    anomaly: Math.random() < 0.15 ? "golden" : null,
    sizeScale: rand(0.65, 0.9),
    velocity: randomSpawnVelocity(level, position).multiplyScalar(rand(1.35, 1.8)),
    collisionCooldown: 0.35,
  });
}

function updateCosmicEvents(delta) {
  const event = activeCosmicEvent();
  if (event) {
    state.cosmicEvent.remaining -= delta;
    if (event.id === "meteor") {
      state.cosmicEvent.spawnTimer -= delta;
      if (state.cosmicEvent.spawnTimer <= 0) {
        spawnMeteorDuringEvent();
        state.cosmicEvent.spawnTimer = 0.7;
      }
    }
    if (state.cosmicEvent.remaining <= 0) endCosmicEvent();
    return;
  }
  state.cosmicEvent.cooldown -= delta;
  if (state.time >= COSMIC_EVENT_FIRST_DELAY && state.cosmicEvent.cooldown <= 0) startCosmicEvent();
}

function absorbBodyIntoBody(larger, smaller, collision) {
  if (!state.bodies.includes(larger) || !state.bodies.includes(smaller)) return;
  const largerMass = larger.mass;
  const smallerMass = smaller.mass;
  const totalMass = largerMass + smallerMass;
  const momentum = larger.velocity.clone().multiplyScalar(largerMass)
    .add(smaller.velocity.clone().multiplyScalar(smallerMass));
  const centerOfMassPosition = larger.position.clone().multiplyScalar(largerMass)
    .add(smaller.position.clone().multiplyScalar(smallerMass))
    .multiplyScalar(1 / totalMass);
  const impactPosition = collision.position.clone();
  larger.mass = totalMass;
  larger.position.copy(centerOfMassPosition);
  larger.velocity.copy(momentum.multiplyScalar(1 / totalMass));
  larger.sizeScale = Math.min(1.28, larger.sizeScale + (smallerMass / totalMass) * 0.16);
  larger.collisionCooldown = 0.3;
  removeBody(smaller);
  updateBodyVisualScale(larger);
  createBurst(impactPosition, LEVELS[larger.level - 1].accent, 24, 3.1);
}

function fractureBody(smaller, larger, collision) {
  if (!state.bodies.includes(smaller) || !state.bodies.includes(larger)) return;
  const sourcePosition = smaller.position.clone();
  const awayFromLarger = sourcePosition.clone().sub(larger.position).setY(0);
  if (awayFromLarger.lengthSq() < 0.0001) awayFromLarger.copy(collision.normal).negate();
  else awayFromLarger.normalize();
  const combinedMass = smaller.mass + larger.mass;
  const combinedVelocity = smaller.velocity.clone().multiplyScalar(smaller.mass)
    .add(larger.velocity.clone().multiplyScalar(larger.mass))
    .multiplyScalar(1 / Math.max(1, combinedMass));

  const fragmentLevel = Math.max(1, smaller.level - 1);
  const fragmentSizeScale = Math.max(0.42, Math.min(0.82, smaller.sizeScale * 0.72));
  const fragmentCollisionRadius = LEVELS[fragmentLevel - 1].radius
    * bodyScaleRelativeToPlayer()
    * fragmentSizeScale;

  removeBody(smaller);
  const desiredFragmentCount = Math.min(14, 6 + Math.floor(Math.random() * 5) + state.player.perks.fracture * 2);
  const slotsNeeded = Math.max(0, desiredFragmentCount - (WORLD.maxBodies - state.bodies.length));
  if (slotsNeeded > 0) {
    [...state.bodies]
      .filter((body) => body !== larger)
      .sort((first, second) => second.position.distanceToSquared(state.player.position)
        - first.position.distanceToSquared(state.player.position))
      .slice(0, slotsNeeded)
      .forEach(removeBody);
  }
  const fragmentCount = Math.min(desiredFragmentCount, WORLD.maxBodies - state.bodies.length);
  if (fragmentCount <= 0) {
    createBurst(sourcePosition, LEVELS[smaller.level - 1].accent, 28, 3.7);
    return;
  }
  const fragmentMass = Math.max(0.05, (smaller.mass * 0.86) / fragmentCount);
  const fragmentCloudMass = fragmentMass * fragmentCount;
  const outputMass = larger.mass + fragmentCloudMass;
  const fragmentCloudVelocity = combinedVelocity.clone()
    .addScaledVector(awayFromLarger, FRACTURE_SEPARATION_SPEED * larger.mass / outputMass);
  larger.velocity.copy(combinedVelocity)
    .addScaledVector(awayFromLarger, -FRACTURE_SEPARATION_SPEED * fragmentCloudMass / outputMass);
  larger.collisionCooldown = Math.max(larger.collisionCooldown, FRAGMENT_GRAVITY_GRACE);
  createBurst(sourcePosition, LEVELS[smaller.level - 1].accent, 28, 3.7);

  const angularStep = (Math.PI * 2) / fragmentCount;
  const fragmentOrbitRadius = Math.max(
    0.8,
    smaller.radius * 0.9,
    fragmentCollisionRadius * 1.15 / Math.sin(Math.PI / fragmentCount),
  );
  const fragmentCloudCenter = larger.position.clone().addScaledVector(
    awayFromLarger,
    larger.radius + fragmentOrbitRadius + fragmentCollisionRadius + COLLISION_SEPARATION_GAP + 0.35,
  );
  const baseAngle = rand(0, Math.PI * 2);
  const fragmentEjections = [];
  const averageEjection = new THREE.Vector3();
  for (let index = 0; index < fragmentCount; index += 1) {
    const angle = baseAngle + index * angularStep;
    const offset = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle)).multiplyScalar(fragmentOrbitRadius);
    const ejection = offset.clone().normalize().multiplyScalar(rand(0.9, 2.1));
    fragmentEjections.push({ offset, ejection });
    averageEjection.add(ejection);
  }
  averageEjection.multiplyScalar(1 / fragmentCount);

  for (const fragment of fragmentEjections) {
    const fragmentVelocity = fragmentCloudVelocity.clone()
      .add(fragment.ejection)
      .sub(averageEjection);
    const fragmentPosition = fragmentCloudCenter.clone().add(fragment.offset);
    createBody(fragmentLevel, fragmentPosition, {
      mass: fragmentMass,
      sizeScale: fragmentSizeScale,
      velocity: fragmentVelocity,
      collisionCooldown: FRAGMENT_GRAVITY_GRACE,
      gravityGrace: FRAGMENT_GRAVITY_GRACE,
    });
  }
}

function splitEqualBodies(first, second, collision) {
  if (!state.bodies.includes(first) || !state.bodies.includes(second)) return;
  if (first.level !== second.level || first.level < 4) return;

  const sourceLevel = first.level;
  const downgradedLevel = sourceLevel - 2;
  const fragmentLevel = sourceLevel - 3;
  const firstPosition = first.position.clone();
  const secondPosition = second.position.clone();
  const totalMass = first.mass + second.mass;
  const centerVelocity = first.velocity.clone().multiplyScalar(first.mass)
    .add(second.velocity.clone().multiplyScalar(second.mass))
    .multiplyScalar(1 / Math.max(1, totalMass));
  const firstVelocity = centerVelocity.clone()
    .addScaledVector(collision.normal, -EQUAL_SPLIT_SEPARATION_SPEED * 0.5);
  const secondVelocity = centerVelocity.clone()
    .addScaledVector(collision.normal, EQUAL_SPLIT_SEPARATION_SPEED * 0.5);
  const impactPosition = collision.position.clone();
  const impactAngle = Math.atan2(collision.normal.z, collision.normal.x) + Math.PI / 2;
  const ejectDistance = Math.max(0.8, (first.radius + second.radius) * 0.38);

  removeBody(first);
  removeBody(second);
  createBody(downgradedLevel, firstPosition, {
    mass: LEVELS[downgradedLevel - 1].bodyMass,
    anomaly: null,
    velocity: firstVelocity,
    collisionCooldown: 0.55,
    gravityGrace: 0.45,
  });
  createBody(downgradedLevel, secondPosition, {
    mass: LEVELS[downgradedLevel - 1].bodyMass,
    anomaly: null,
    velocity: secondVelocity,
    collisionCooldown: 0.55,
    gravityGrace: 0.45,
  });

  createBurst(impactPosition, LEVELS[sourceLevel - 1].accent, 54, 4.8);
  for (let index = 0; index < 3; index += 1) {
    const angle = impactAngle + (index / 3) * Math.PI * 2;
    const direction = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
    const fragmentVelocity = centerVelocity.clone().addScaledVector(direction, 4.2);
    createBody(fragmentLevel, impactPosition.clone().addScaledVector(direction, ejectDistance), {
      mass: LEVELS[fragmentLevel - 1].bodyMass,
      sizeScale: 0.84,
      anomaly: null,
      velocity: fragmentVelocity,
      collisionCooldown: FRAGMENT_GRAVITY_GRACE,
      gravityGrace: FRAGMENT_GRAVITY_GRACE,
    });
  }
}

function resolveBodyCollisionOutcome(first, second, collision) {
  const levelDifference = Math.abs(first.level - second.level);
  if (levelDifference === 0) {
    splitEqualBodies(first, second, collision);
    return;
  }
  if (levelDifference >= 2) {
    const larger = first.level > second.level ? first : second;
    const smaller = larger === first ? second : first;
    absorbBodyIntoBody(larger, smaller, collision);
    return;
  }
  if (levelDifference === 1) {
    const smaller = first.level < second.level ? first : second;
    const larger = smaller === first ? second : first;
    fractureBody(smaller, larger, collision);
  }
}

function updateBodyCollisions() {
  const bodies = [...state.bodies];
  for (let firstIndex = 0; firstIndex < bodies.length; firstIndex += 1) {
    const first = bodies[firstIndex];
    for (let secondIndex = firstIndex + 1; secondIndex < bodies.length; secondIndex += 1) {
      const second = bodies[secondIndex];
      if (!state.bodies.includes(first) || !state.bodies.includes(second)) continue;
      const collision = resolveSolidCollision(first, second);
      if (!collision) continue;
      if (first.collisionCooldown > 0 || second.collisionCooldown > 0) continue;
      const level = Math.max(first.level, second.level);
      createBurst(collision.position, LEVELS[level - 1].accent, 7, 0.75);
      first.collisionCooldown = 0.14;
      second.collisionCooldown = 0.14;
      if (first.isBoss || second.isBoss) {
        const boss = first.isBoss ? first : second;
        const other = boss === first ? second : first;
        resolveBossBodyCollision(boss, other, collision);
      } else {
        registerChainCollision(collision.position, level);
        resolveBodyCollisionOutcome(first, second, collision);
      }
    }
  }

  for (const body of [...state.bodies]) {
    if (!state.bodies.includes(body)) continue;
    const offset = body.position.clone().sub(state.player.position);
    const distance = offset.length();
    if (distance >= currentPlayerAbsorbRadius() + body.radius) continue;

    if (body.isBoss) {
      resolveSolidCollision(state.player, body);
      damageBoss(body, state.player.position, true);
      takeHit(body);
      if (state.status === "gameover") break;
      continue;
    }

    if (body.level <= state.player.level) {
      absorbBody(body);
      continue;
    }

    resolveSolidCollision(state.player, body);
    takeHit(body);
    if (state.status === "gameover") break;
  }

  for (const body of state.bodies) {
    body.group.position.x = body.position.x;
    body.group.position.z = body.position.z;
  }
  playerRoot.position.copy(state.player.position);
}

function spawnMoreBodies() {
  const available = WORLD.maxBodies - state.bodies.length;
  if (available <= 0) return;
  const playerLevel = state.player.level;
  const amount = Math.min(available, Math.random() < 0.45 ? 1 : Math.random() < 0.72 ? 2 : 3);
  for (let index = 0; index < amount; index += 1) {
    const roll = Math.random();
    let difference;
    if (roll < 0.55) difference = -Math.floor(rand(0, Math.min(3, playerLevel)));
    else if (roll < 0.8) difference = -1;
    else if (roll < 0.92) difference = 0;
    else if (roll < 0.98) difference = 1;
    else difference = 2;
    const level = clamp(playerLevel + difference, 1, Math.min(10, playerLevel + 2));
    createBody(level);
  }
}

function updateSpawning(delta) {
  state.spawnTimer += delta;
  if (state.spawnTimer >= 1.2) {
    state.spawnTimer = 0;
    spawnMoreBodies();
  }
}

function updateCamera(delta) {
  const target = state.player.position;
  const desired = new THREE.Vector3(target.x, 33, target.z + 28);
  camera.position.lerp(desired, 1 - Math.pow(0.001, delta));
  camera.lookAt(target.x, 0, target.z);
}

function updateUi(force = false) {
  if (!force && state.time - state.lastUiUpdate < 0.08) return;
  state.lastUiUpdate = state.time;
  const levelIndex = state.player.level - 1;
  const currentThreshold = LEVELS[levelIndex].mass;
  const nextThreshold = LEVELS[levelIndex + 1]?.mass;
  const massProgress = nextThreshold === undefined
    ? 1
    : clamp((state.player.mass - currentThreshold) / (nextThreshold - currentThreshold), 0, 1);
  ui.massProgressFill.style.transform = `scaleX(${massProgress})`;
  ui.massProgress.setAttribute("aria-valuenow", String(Math.round(massProgress * 100)));
  ui.timeValue.textContent = formatTime(state.time);
  ui.bestValue.textContent = formatNumber(Math.max(getBestMass(), state.highMass));
  ui.pauseButton.textContent = state.status === "paused" ? "繼續" : "暫停";
  const comboValue = Math.max(state.player.combo, state.chainCombo);
  ui.comboValue.textContent = comboValue;
  ui.comboPill.hidden = comboValue < 3;
  const event = activeCosmicEvent();
  if (ui.cosmicEvent) {
    ui.cosmicEvent.hidden = !event;
    if (event) {
      ui.cosmicEventName.textContent = event.name;
      ui.cosmicEventDescription.textContent = event.description;
      ui.cosmicEventTime.textContent = `${Math.ceil(state.cosmicEvent.remaining)}s`;
      ui.cosmicEvent.style.setProperty("--event-color", `#${event.color.toString(16).padStart(6, "0")}`);
    }
  }
  updateMissionUi();
}

function getBestMass() {
  try { return Number(window.localStorage.getItem("gravityPlanetBestMass")) || 1; } catch { return 1; }
}

function saveBest() {
  try {
    window.localStorage.setItem("gravityPlanetBestMass", String(Math.max(getBestMass(), state.highMass)));
    window.localStorage.setItem("gravityPlanetBestLevel", String(Math.max(Number(window.localStorage.getItem("gravityPlanetBestLevel")) || 1, state.highLevel)));
  } catch {
    // 儲存空間被瀏覽器限制時，遊戲仍可正常進行。
  }
}

function endGame() {
  state.status = "gameover";
  saveBest();
  ui.resultLevel.textContent = state.highLevel;
  ui.resultMass.textContent = formatNumber(state.highMass);
  ui.resultTime.textContent = formatTime(state.time);
  ui.gameoverCopy.textContent = `你曾經成為 ${LEVELS[state.highLevel - 1].name}，在宇宙中留下了漂亮的軌跡。`;
  ui.gameoverCover.hidden = false;
  ui.pauseCover.hidden = true;
  ui.dangerAlert.hidden = true;
  addToast("引力坍縮 · 本局結束", "#ff9ca8");
  updateUi(true);
}

function togglePause() {
  if (state.status === "gameover" || state.status === "evolving") return;
  state.status = state.status === "paused" ? "playing" : "paused";
  ui.pauseCover.hidden = state.status !== "paused";
  updateUi(true);
}

function restartGame() {
  state.status = "playing";
  state.time = 0;
  state.highMass = 1;
  state.highLevel = 1;
  state.spawnTimer = 0;
  state.region = REGIONS[0];
  state.regionKey = null;
  state.cosmicEvent = { event: null, remaining: 0, cooldown: COSMIC_EVENT_FIRST_DELAY, spawnTimer: 0, lastEventId: null };
  state.bossCooldown = BOSS_FIRST_DELAY;
  state.evolutionChoice = null;
  state.evolutionChoices = [];
  state.missions = Object.fromEntries(MISSIONS.map((mission) => [mission.id, { progress: 0, completed: false }]));
  state.chainCombo = 0;
  state.chainTimer = 0;
  state.lastUiUpdate = 0;
  state.effects.forEach((effect) => effectGroup.remove(effect.points || effect.halo || effect.group));
  state.effects.length = 0;
  [...state.bodies].forEach(removeBody);
  state.player.mass = 1;
  state.player.level = 1;
  state.player.shield = 3;
  state.player.shieldMax = 3;
  state.player.energy = 0;
  state.player.coreUpgrade = 0;
  state.player.position.set(0, 0, 0);
  state.player.velocity.set(0, 0, 0);
  state.player.invulnerable = 0;
  state.player.combo = 0;
  state.player.comboTimer = 0;
  Object.keys(state.player.perks).forEach((key) => { state.player.perks[key] = 0; });
  input.clear();
  resetJoystick();
  ui.sceneToast.innerHTML = "";
  updateGridDensity();
  updateInfiniteWorld();
  updateRegionVisuals();
  rebuildPlayerModel();
  camera.position.set(0, 33, 28);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld(true);
  for (let index = 0; index < 8; index += 1) createBody(1, null, { insideViewport: true });
  for (let index = 0; index < 4; index += 1) createBody(1);
  createBody(2, null, { insideViewport: true });
  createBody(2);
  ui.pauseCover.hidden = true;
  ui.gameoverCover.hidden = true;
  ui.evolutionPopup.hidden = true;
  ui.comboPill.hidden = true;
  ui.dangerAlert.hidden = true;
  addToast("開始收集星塵", "#a8f4ff");
  updateUi(true);
}

function getSavedGame() {
  if (state.status === "evolving") return null;
  return {
    status: state.status,
    time: state.time,
    highMass: state.highMass,
    highLevel: state.highLevel,
    spawnTimer: state.spawnTimer,
    player: {
      mass: state.player.mass,
      level: state.player.level,
      shield: state.player.shield,
      shieldMax: state.player.shieldMax,
      energy: state.player.energy,
      coreUpgrade: state.player.coreUpgrade,
      position: state.player.position.toArray(),
      velocity: state.player.velocity.toArray(),
      invulnerable: state.player.invulnerable,
      combo: state.player.combo,
      comboTimer: state.player.comboTimer,
      perks: { ...state.player.perks },
    },
    missions: state.missions,
    chainCombo: state.chainCombo,
    chainTimer: state.chainTimer,
    bossCooldown: state.bossCooldown,
    regionKey: state.regionKey,
    bodies: state.bodies.map((body) => ({
      level: body.level,
      mass: body.mass,
      sizeScale: body.sizeScale,
      anomaly: body.anomaly,
      isBoss: body.isBoss,
      bossType: body.bossType,
      bossHealth: body.bossHealth,
      bossTimer: body.bossTimer,
      position: body.position.toArray(),
      velocity: body.velocity.toArray(),
      collisionCooldown: body.collisionCooldown,
      gravityGrace: body.gravityGrace,
    })),
  };
}

function restoreGame(saved) {
  restartGame();
  [...state.bodies].forEach(removeBody);
  state.status = saved.status === "gameover" ? "gameover" : "playing";
  state.time = saved.time;
  state.highMass = saved.highMass;
  state.highLevel = saved.highLevel;
  state.spawnTimer = saved.spawnTimer;
  Object.assign(state.player, {
    mass: saved.player.mass,
    level: saved.player.level,
    shield: saved.player.shield,
    shieldMax: saved.player.shieldMax || 3,
    energy: saved.player.energy,
    coreUpgrade: saved.player.coreUpgrade,
    invulnerable: saved.player.invulnerable,
    combo: saved.player.combo,
    comboTimer: saved.player.comboTimer,
  });
  Object.assign(state.player.perks, saved.player.perks || {});
  state.missions = saved.missions || Object.fromEntries(MISSIONS.map((mission) => [mission.id, { progress: 0, completed: false }]));
  state.chainCombo = saved.chainCombo || 0;
  state.chainTimer = saved.chainTimer || 0;
  state.bossCooldown = saved.bossCooldown ?? BOSS_FIRST_DELAY;
  state.regionKey = null;
  state.player.position.fromArray(saved.player.position);
  state.player.velocity.fromArray(saved.player.velocity);
  rebuildPlayerModel();
  saved.bodies.forEach((body) => {
    createBody(body.level, new THREE.Vector3().fromArray(body.position), {
      mass: body.mass,
      sizeScale: body.sizeScale,
      anomaly: body.anomaly ?? null,
      isBoss: body.isBoss ?? false,
      bossType: body.bossType ?? null,
      bossHealth: body.bossHealth ?? 0,
      velocity: new THREE.Vector3().fromArray(body.velocity),
      collisionCooldown: body.collisionCooldown,
      gravityGrace: body.gravityGrace,
    });
    const restoredBody = state.bodies[state.bodies.length - 1];
    if (restoredBody) restoredBody.bossTimer = body.bossTimer || 0;
  });
  updateGridDensity();
  updateInfiniteWorld();
  ui.pauseCover.hidden = true;
  ui.gameoverCover.hidden = state.status !== "gameover";
  addToast("已恢復上次的星球進度", "#a8f4ff");
  updateUi(true);
}

function resetJoystick() {
  joystickPointerId = null;
  joystickInput.set(0, 0);
  if (ui.joystickStick) {
    ui.joystickStick.style.setProperty("--stick-x", "0px");
    ui.joystickStick.style.setProperty("--stick-y", "0px");
  }
}

function updateJoystick(event) {
  if (!ui.joystickBase || event.pointerId !== joystickPointerId) return;
  const rect = ui.joystickBase.getBoundingClientRect();
  const centerX = rect.left + rect.width * 0.5;
  const centerY = rect.top + rect.height * 0.5;
  const stickRadius = (ui.joystickStick?.getBoundingClientRect().width || 54) * 0.5;
  const maxRadius = Math.max(1, rect.width * 0.5 - stickRadius - 8);
  let offsetX = event.clientX - centerX;
  let offsetY = event.clientY - centerY;
  const distance = Math.hypot(offsetX, offsetY);
  if (distance > maxRadius) {
    const ratio = maxRadius / distance;
    offsetX *= ratio;
    offsetY *= ratio;
  }
  joystickInput.set(offsetX / maxRadius, offsetY / maxRadius);
  ui.joystickStick?.style.setProperty("--stick-x", `${offsetX}px`);
  ui.joystickStick?.style.setProperty("--stick-y", `${offsetY}px`);
}

function setupInput() {
  const keyDirections = { ArrowUp: "up", w: "up", W: "up", ArrowDown: "down", s: "down", S: "down", ArrowLeft: "left", a: "left", A: "left", ArrowRight: "right", d: "right", D: "right" };
  window.addEventListener("keydown", (event) => {
    if (keyDirections[event.key]) {
      input.add(keyDirections[event.key]);
      event.preventDefault();
    }
    if (event.key === " ") {
      event.preventDefault();
      if (event.repeat) return;
      if (state.status === "evolving" && !ui.evolutionPopup.hidden) continueAfterEvolution();
      else togglePause();
    }
    if (event.key.toLowerCase() === "r") restartGame();
  });
  window.addEventListener("keyup", (event) => {
    if (keyDirections[event.key]) input.delete(keyDirections[event.key]);
  });
  window.addEventListener("blur", () => {
    input.clear();
    resetJoystick();
  });

  document.querySelectorAll(".dpad button").forEach((button) => {
    const direction = directionMap[button.dataset.dir];
    const release = () => { input.delete(direction); button.classList.remove("active"); };
    button.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      input.add(direction);
      button.classList.add("active");
      button.setPointerCapture?.(event.pointerId);
    });
    button.addEventListener("pointerup", release);
    button.addEventListener("pointercancel", release);
    button.addEventListener("lostpointercapture", release);
    button.addEventListener("pointerleave", (event) => { if (event.buttons === 0) release(); });
  });

  if (ui.joystickBase) {
    ui.joystickBase.addEventListener("pointerdown", (event) => {
      if (joystickPointerId !== null) return;
      event.preventDefault();
      joystickPointerId = event.pointerId;
      ui.joystickBase.setPointerCapture?.(event.pointerId);
      updateJoystick(event);
    });
    ui.joystickBase.addEventListener("pointermove", (event) => {
      event.preventDefault();
      updateJoystick(event);
    });
    const releaseJoystick = (event) => {
      if (event.pointerId !== joystickPointerId) return;
      event.preventDefault();
      resetJoystick();
    };
    ui.joystickBase.addEventListener("pointerup", releaseJoystick);
    ui.joystickBase.addEventListener("pointercancel", releaseJoystick);
    ui.joystickBase.addEventListener("lostpointercapture", releaseJoystick);
  }
}

function resize() {
  const width = ui.container.clientWidth;
  const height = ui.container.clientHeight;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.05);
  if (state.status === "playing") {
    state.time += delta;
    updatePlayer(delta);
    updateBodyGravity(delta);
    updateBodies(delta);
    updateBodyCollisions();
    updateCamera(delta);
    updateCosmicEvents(delta);
    updateBossSystem(delta);
    updateSpawning(delta);
  } else if (state.status === "evolving") {
    updateEvolutionAnimation(delta);
    updateCamera(delta);
  }
  updateModel(state.player.model, state.time, delta);
  updateEffects(delta);
  updateUi();
  renderer.render(scene, camera);
}

function init() {
  glowTexture = makeGlowTexture();
  createStars();
  scene.add(new THREE.HemisphereLight(0x9bb9ff, 0x07091d, 1.25));
  const keyLight = new THREE.DirectionalLight(0x99baff, 1.6);
  keyLight.position.set(-12, 24, 16);
  scene.add(keyLight);
  rebuildPlayerModel();
  setupInput();
  ui.pauseButton.addEventListener("click", togglePause);
  ui.resumeButton.addEventListener("click", togglePause);
  ui.restartButton.addEventListener("click", restartGame);
  ui.gameoverRestart.addEventListener("click", restartGame);
  ui.evolutionContinue.addEventListener("click", continueAfterEvolution);
  window.addEventListener("resize", resize);
  resize();
  window.PuzzleSave.create({
    key: "gravity-planet",
    interval: 3000,
    fresh: restartGame,
    restore: restoreGame,
    validate: (saved) => saved && saved.player && Array.isArray(saved.bodies) &&
      Number.isFinite(saved.player.mass) && Number.isInteger(saved.player.level) &&
      Array.isArray(saved.player.position) && Array.isArray(saved.player.velocity),
    getState: getSavedGame,
  });
  animate();
}

init();
