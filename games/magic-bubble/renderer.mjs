import * as THREE from "three";
import { BOARD, CELL, COLORS, colorConfig } from "./config.mjs";
import { getHardDropDistance, getPairCells, indexToCell } from "./core.mjs";

const MAX_INSTANCES = BOARD.columns * BOARD.totalRows + 2;
const MAX_PARTICLES = 220;
const POP_DURATION_MS = 110;
const DROP_DURATION_MS = 190;
const STEP_DURATION_MS = POP_DURATION_MS + DROP_DURATION_MS;

function worldPosition(x, y, z = 0) {
  return new THREE.Vector3(x - (BOARD.columns - 1) / 2, (BOARD.visibleRows - 1) / 2 - y, z);
}

function starShape() {
  const shape = new THREE.Shape();
  for (let index = 0; index < 10; index += 1) {
    const angle = Math.PI / 2 + index * Math.PI / 5;
    const radius = index % 2 === 0 ? 0.25 : 0.105;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (index === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
  }
  shape.closePath();
  return shape;
}

function dropShape() {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0.31);
  shape.bezierCurveTo(0.08, 0.12, 0.25, -0.04, 0.25, -0.16);
  shape.bezierCurveTo(0.25, -0.36, -0.25, -0.36, -0.25, -0.16);
  shape.bezierCurveTo(-0.25, -0.04, -0.08, 0.12, 0, 0.31);
  return shape;
}

function leafShape() {
  const shape = new THREE.Shape();
  shape.moveTo(-0.28, -0.2);
  shape.bezierCurveTo(-0.22, 0.23, 0.14, 0.34, 0.3, 0.25);
  shape.bezierCurveTo(0.28, -0.05, 0.04, -0.29, -0.28, -0.2);
  return shape;
}

function flameShape() {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0.34);
  shape.bezierCurveTo(0.07, 0.08, 0.3, 0.01, 0.23, -0.2);
  shape.bezierCurveTo(0.17, -0.39, -0.2, -0.38, -0.25, -0.14);
  shape.bezierCurveTo(-0.29, 0.04, -0.08, 0.12, 0, 0.34);
  return shape;
}

function sealShape() {
  const shape = new THREE.Shape();
  shape.moveTo(-0.24, 0.16);
  shape.lineTo(-0.16, 0.24);
  shape.lineTo(0, 0.08);
  shape.lineTo(0.16, 0.24);
  shape.lineTo(0.24, 0.16);
  shape.lineTo(0.08, 0);
  shape.lineTo(0.24, -0.16);
  shape.lineTo(0.16, -0.24);
  shape.lineTo(0, -0.08);
  shape.lineTo(-0.16, -0.24);
  shape.lineTo(-0.24, -0.16);
  shape.lineTo(-0.08, 0);
  shape.closePath();
  return shape;
}

function symbolGeometry(type) {
  const shape = type === CELL.red ? flameShape()
    : type === CELL.yellow ? starShape()
      : type === CELL.green ? leafShape()
        : type === CELL.blue ? dropShape()
          : sealShape();
  return new THREE.ShapeGeometry(shape, 6);
}

function makeInstanced(geometry, material, count = MAX_INSTANCES) {
  const mesh = new THREE.InstancedMesh(geometry, material, count);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.count = 0;
  mesh.frustumCulled = false;
  return mesh;
}

export class MagicBubbleRenderer {
  constructor(canvas, container) {
    this.canvas = canvas;
    this.container = container;
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-4, 4, 7, -7, 0.1, 60);
    this.camera.position.set(0, 0.1, 18);
    this.camera.lookAt(0, 0, 0);
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.setClearColor(0x000000, 0);
    this.solidMeshes = new Map();
    this.symbolMeshes = new Map();
    this.ghostMeshes = new Map();
    this.particles = [];
    this.resolutionAnimation = null;
    this.lastTime = 0;
    this.tempMatrix = new THREE.Matrix4();
    this.tempPosition = new THREE.Vector3();
    this.tempQuaternion = new THREE.Quaternion();
    this.tempScale = new THREE.Vector3();
    this.buildScene();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.resize();
  }

  buildScene() {
    this.scene.add(new THREE.HemisphereLight(0xc8e8ff, 0x130923, 2.35));
    const key = new THREE.DirectionalLight(0xfff0d0, 3.4);
    key.position.set(-4, 7, 9);
    this.scene.add(key);
    const rim = new THREE.PointLight(0x9368ff, 9, 24, 2);
    rim.position.set(5, 1, 6);
    this.scene.add(rim);

    this.boardGroup = new THREE.Group();
    this.scene.add(this.boardGroup);
    const back = new THREE.Mesh(
      new THREE.BoxGeometry(6.55, 12.55, 0.32),
      new THREE.MeshPhysicalMaterial({ color: 0x12142d, roughness: 0.35, metalness: 0.25, clearcoat: 0.55, transparent: true, opacity: 0.94 })
    );
    back.position.z = -0.52;
    this.boardGroup.add(back);

    const frameMaterial = new THREE.MeshStandardMaterial({ color: 0x7a5cff, emissive: 0x24125f, emissiveIntensity: 1.8, metalness: 0.62, roughness: 0.22 });
    const vertical = new THREE.BoxGeometry(0.16, 12.85, 0.34);
    const horizontal = new THREE.BoxGeometry(6.72, 0.16, 0.34);
    [-3.34, 3.34].forEach((x) => {
      const bar = new THREE.Mesh(vertical, frameMaterial);
      bar.position.set(x, 0, -0.16);
      this.boardGroup.add(bar);
    });
    [-6.34, 6.34].forEach((y) => {
      const bar = new THREE.Mesh(horizontal, frameMaterial);
      bar.position.set(0, y, -0.16);
      this.boardGroup.add(bar);
    });

    const holeGeometry = new THREE.CircleGeometry(0.42, 24);
    const holeMaterial = new THREE.MeshBasicMaterial({ color: 0x2a2d50, transparent: true, opacity: 0.55, depthWrite: false });
    const holes = makeInstanced(holeGeometry, holeMaterial, BOARD.columns * BOARD.visibleRows);
    let holeIndex = 0;
    for (let y = 0; y < BOARD.visibleRows; y += 1) {
      for (let x = 0; x < BOARD.columns; x += 1) {
        this.setInstance(holes, holeIndex, worldPosition(x, y, -0.32), 1);
        holeIndex += 1;
      }
    }
    holes.count = holeIndex;
    holes.instanceMatrix.needsUpdate = true;
    this.boardGroup.add(holes);

    const bubbleGeometry = new THREE.SphereGeometry(0.45, 20, 14);
    const symbolMaterial = new THREE.MeshBasicMaterial({ color: 0xfffbec, transparent: true, opacity: 0.92, depthWrite: false, side: THREE.DoubleSide });
    const types = [...COLORS.map((entry) => entry.id), CELL.garbage];
    for (const type of types) {
      const config = colorConfig(type);
      const material = new THREE.MeshPhysicalMaterial({
        color: config?.color || 0x8d86a8,
        emissive: config?.emissive || 0x231d38,
        emissiveIntensity: 1.15,
        roughness: 0.18,
        metalness: type === CELL.garbage ? 0.46 : 0.08,
        clearcoat: 1,
        clearcoatRoughness: 0.12,
        transmission: type === CELL.garbage ? 0 : 0.12,
        thickness: 0.6
      });
      const solid = makeInstanced(bubbleGeometry, material);
      this.solidMeshes.set(type, solid);
      this.boardGroup.add(solid);
      const symbol = makeInstanced(symbolGeometry(type), symbolMaterial);
      this.symbolMeshes.set(type, symbol);
      this.boardGroup.add(symbol);
      const ghost = makeInstanced(
        bubbleGeometry,
        new THREE.MeshBasicMaterial({ color: config?.color || 0xaaa4bd, wireframe: true, transparent: true, opacity: 0.2, depthWrite: false }),
        2
      );
      this.ghostMeshes.set(type, ghost);
      this.boardGroup.add(ghost);
    }

    const ringMaterial = new THREE.MeshBasicMaterial({ color: 0x8c72ff, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false });
    this.magicRings = [0, 1].map((index) => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(4.5 + index * 0.65, 0.025, 5, 96), ringMaterial.clone());
      ring.position.z = -1.2 - index * 0.2;
      ring.scale.y = 1.28;
      this.scene.add(ring);
      return ring;
    });

    const starPositions = new Float32Array(240 * 3);
    for (let index = 0; index < 240; index += 1) {
      starPositions[index * 3] = (Math.random() - 0.5) * 28;
      starPositions[index * 3 + 1] = (Math.random() - 0.5) * 30;
      starPositions[index * 3 + 2] = -3 - Math.random() * 8;
    }
    const starGeometry = new THREE.BufferGeometry();
    starGeometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
    this.stars = new THREE.Points(starGeometry, new THREE.PointsMaterial({ color: 0xc9d8ff, size: 0.045, transparent: true, opacity: 0.7, depthWrite: false }));
    this.scene.add(this.stars);

    this.particlePositions = new Float32Array(MAX_PARTICLES * 3);
    this.particleColors = new Float32Array(MAX_PARTICLES * 3);
    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute("position", new THREE.BufferAttribute(this.particlePositions, 3));
    particleGeometry.setAttribute("color", new THREE.BufferAttribute(this.particleColors, 3));
    particleGeometry.setDrawRange(0, 0);
    this.particlePoints = new THREE.Points(
      particleGeometry,
      new THREE.PointsMaterial({ size: 0.13, vertexColors: true, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    this.particlePoints.frustumCulled = false;
    this.scene.add(this.particlePoints);
  }

  setInstance(mesh, index, position, scale = 1) {
    this.tempScale.setScalar(scale);
    this.tempMatrix.compose(position, this.tempQuaternion.identity(), this.tempScale);
    mesh.setMatrixAt(index, this.tempMatrix);
  }

  drawState(state) {
    this.drawBoard(state.board, state.activePair, null, null, true);
  }

  drawBoard(board, activePair = null, positionOverrides = null, scaleOverrides = null, showGhost = false) {
    const solidBuckets = new Map([...this.solidMeshes.keys()].map((type) => [type, []]));
    for (let index = 0; index < board.length; index += 1) {
      const value = board[index];
      if (!solidBuckets.has(value)) continue;
      const cell = indexToCell(index);
      if (cell.y >= 0) solidBuckets.get(value).push({ ...cell, boardIndex: index });
    }
    if (activePair) {
      for (const cell of getPairCells(activePair)) solidBuckets.get(cell.color)?.push(cell);
    }
    for (const [type, cells] of solidBuckets) {
      const mesh = this.solidMeshes.get(type);
      const symbols = this.symbolMeshes.get(type);
      cells.forEach((cell, index) => {
        const override = cell.boardIndex === undefined ? null : positionOverrides?.get(cell.boardIndex);
        const x = override?.x ?? cell.x;
        const y = override?.y ?? cell.y;
        const scale = cell.boardIndex === undefined ? 1 : scaleOverrides?.get(cell.boardIndex) ?? 1;
        const position = worldPosition(x, y, cell.role ? 0.08 : 0);
        this.setInstance(mesh, index, position, Math.max(0.001, 0.98 * scale));
        this.setInstance(symbols, index, position.clone().setZ(0.43), Math.max(0.001, scale));
      });
      mesh.count = cells.length;
      symbols.count = cells.length;
      mesh.instanceMatrix.needsUpdate = true;
      symbols.instanceMatrix.needsUpdate = true;
    }

    for (const [type, mesh] of this.ghostMeshes) mesh.count = 0;
    if (showGhost && activePair) {
      const distance = getHardDropDistance({ board, activePair });
      const ghostBuckets = new Map([...this.ghostMeshes.keys()].map((type) => [type, []]));
      for (const cell of getPairCells(activePair)) ghostBuckets.get(cell.color)?.push({ ...cell, y: cell.y + distance });
      for (const [type, cells] of ghostBuckets) {
        const mesh = this.ghostMeshes.get(type);
        cells.forEach((cell, index) => this.setInstance(mesh, index, worldPosition(cell.x, cell.y, -0.02), 1.03));
        mesh.count = cells.length;
        mesh.instanceMatrix.needsUpdate = true;
      }
    }
  }

  update(state, events = []) {
    const chainSteps = events.filter((event) => event.type === "CHAIN_STEP");
    if (!chainSteps.length || document.documentElement.classList.contains("reduce-motion")) {
      this.resolutionAnimation = null;
      this.drawState(state);
      if (chainSteps.length) chainSteps.forEach((step) => this.spawnClearParticles(step));
      return;
    }
    this.resolutionAnimation = {
      steps: chainSteps,
      stepIndex: 0,
      phase: "pop",
      phaseStartedAt: performance.now(),
      finalState: {
        board: new Uint8Array(state.board),
        activePair: state.activePair ? { ...state.activePair } : null
      }
    };
    this.drawBoard(chainSteps[0].beforeBoard);
  }

  isAnimating() {
    return this.resolutionAnimation !== null;
  }

  remainingAnimationMs(now = performance.now()) {
    const animation = this.resolutionAnimation;
    if (!animation) return 0;
    const currentDuration = animation.phase === "pop" ? POP_DURATION_MS : DROP_DURATION_MS;
    const currentRemaining = Math.max(0, currentDuration - (now - animation.phaseStartedAt));
    const futurePhases = animation.phase === "pop" ? DROP_DURATION_MS : 0;
    const futureSteps = Math.max(0, animation.steps.length - animation.stepIndex - 1) * STEP_DURATION_MS;
    return currentRemaining + futurePhases + futureSteps;
  }

  spawnClearParticles(step) {
    const cells = [...step.clearedCells, ...step.garbageCells];
    for (const cell of cells) {
      const config = colorConfig(cell.value);
      const color = new THREE.Color(config?.color || 0xb8aecb);
      for (let count = 0; count < 5 && this.particles.length < MAX_PARTICLES; count += 1) {
        const position = worldPosition(cell.x, cell.y, 0.5);
        this.particles.push({
          position,
          velocity: new THREE.Vector3((Math.random() - 0.5) * 2.8, (Math.random() - 0.2) * 3, 0.3 + Math.random()),
          color,
          life: 0.55 + Math.random() * 0.35,
          maxLife: 0.9
        });
      }
    }
  }

  updateResolutionAnimation(now) {
    const animation = this.resolutionAnimation;
    if (!animation) return;
    const step = animation.steps[animation.stepIndex];
    if (animation.phase === "pop") {
      const progress = Math.min(1, (now - animation.phaseStartedAt) / POP_DURATION_MS);
      const scaleOverrides = new Map();
      const popScale = progress < 0.4
        ? 1 + Math.sin(progress / 0.4 * Math.PI) * 0.18
        : Math.max(0.001, 1 - (progress - 0.4) / 0.6);
      for (const cell of [...step.clearedCells, ...step.garbageCells]) scaleOverrides.set(cell.index, popScale);
      this.drawBoard(step.beforeBoard, null, null, scaleOverrides, false);
      if (progress >= 1) {
        this.spawnClearParticles(step);
        animation.phase = "drop";
        animation.phaseStartedAt = now;
      }
      return;
    }

    const progress = Math.min(1, (now - animation.phaseStartedAt) / DROP_DURATION_MS);
    const eased = 1 - ((1 - progress) ** 3);
    const positionOverrides = new Map();
    for (const transition of step.gravityTransitions) {
      const from = indexToCell(transition.from);
      const to = indexToCell(transition.to);
      positionOverrides.set(transition.from, {
        x: from.x + (to.x - from.x) * eased,
        y: from.y + (to.y - from.y) * eased
      });
    }
    this.drawBoard(step.afterClearBoard, null, positionOverrides, null, false);
    if (progress < 1) return;

    animation.stepIndex += 1;
    if (animation.stepIndex < animation.steps.length) {
      animation.phase = "pop";
      animation.phaseStartedAt = now;
      this.drawBoard(animation.steps[animation.stepIndex].beforeBoard);
      return;
    }
    const finalState = animation.finalState;
    this.resolutionAnimation = null;
    this.drawState(finalState);
  }

  updateParticles(deltaSeconds) {
    let write = 0;
    for (const particle of this.particles) {
      particle.life -= deltaSeconds;
      if (particle.life <= 0) continue;
      particle.velocity.y -= 3.8 * deltaSeconds;
      particle.position.addScaledVector(particle.velocity, deltaSeconds);
      this.particles[write] = particle;
      this.particlePositions[write * 3] = particle.position.x;
      this.particlePositions[write * 3 + 1] = particle.position.y;
      this.particlePositions[write * 3 + 2] = particle.position.z;
      this.particleColors[write * 3] = particle.color.r;
      this.particleColors[write * 3 + 1] = particle.color.g;
      this.particleColors[write * 3 + 2] = particle.color.b;
      write += 1;
    }
    this.particles.length = write;
    this.particlePoints.geometry.setDrawRange(0, write);
    this.particlePoints.geometry.attributes.position.needsUpdate = true;
    this.particlePoints.geometry.attributes.color.needsUpdate = true;
  }

  render(now = performance.now()) {
    const delta = this.lastTime ? Math.min(0.05, (now - this.lastTime) / 1000) : 0;
    this.lastTime = now;
    this.updateResolutionAnimation(now);
    this.updateParticles(delta);
    this.magicRings[0].rotation.z = now * 0.00008;
    this.magicRings[1].rotation.z = -now * 0.000055;
    this.stars.rotation.z = now * 0.000002;
    this.stars.material.opacity = 0.62 + Math.sin(now * 0.001) * 0.1;
    this.renderer.render(this.scene, this.camera);
  }

  resize() {
    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);
    this.renderer.setSize(width, height, false);
    const aspect = width / height;
    const vertical = 14.3;
    this.camera.top = vertical / 2;
    this.camera.bottom = -vertical / 2;
    this.camera.left = -vertical * aspect / 2;
    this.camera.right = vertical * aspect / 2;
    this.camera.updateProjectionMatrix();
  }

  destroy() {
    this.resizeObserver.disconnect();
    this.scene.traverse((object) => {
      object.geometry?.dispose?.();
      if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose());
      else object.material?.dispose?.();
    });
    this.renderer.dispose();
  }
}
