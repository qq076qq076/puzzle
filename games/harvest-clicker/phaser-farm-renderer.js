(function (globalThis) {
  "use strict";

  /**
   * Phaser is introduced as a render-only layer first.  The existing DOM UI,
   * pointer handlers and game-core remain the source of truth while the farm
   * view moves across in small, testable steps.
   */
  const TILE_W = 96;
  const TILE_H = 48;
  const TILE_DEPTH = 13;
  const CELL_W = 76;
  const CELL_H = 38;
  const FARMER_LAYER_Z = 100000;

  function worldPoint(row, col) {
    return { x: (col - row) * TILE_W / 2, y: (col + row) * TILE_H / 2 };
  }

  function pathDiamond(graphics, x, y, width = TILE_W, height = TILE_H) {
    graphics.beginPath();
    graphics.moveTo(x, y - height / 2);
    graphics.lineTo(x + width / 2, y);
    graphics.lineTo(x, y + height / 2);
    graphics.lineTo(x - width / 2, y);
    graphics.closePath();
  }

  function safeNumber(value, fallback = 0) {
    return Number.isFinite(Number(value)) ? Number(value) : fallback;
  }

  class FarmScene extends globalThis.Phaser.Scene {
    constructor() {
      super({ key: "HarvestFarmScene" });
      this.snapshot = null;
      this.plantObjects = new Map();
      this.shadow = null;
      this.ground = null;
      this.cells = null;
      this.overlays = null;
      this.devices = null;
      this.decorations = null;
      this.effects = null;
      this.deviceObjects = new Map();
      this.decorationObjects = new Map();
      this.farmerSprite = null;
      this.farmerActionLabel = null;
      this.toolCursorSprite = null;
      this.staticFarmSignature = "";
      this.pathCache = new Map();
      this.effectLabels = [];
      this.lowPower = Boolean(globalThis.matchMedia?.("(pointer: coarse)")?.matches || (globalThis.navigator?.hardwareConcurrency || 8) <= 4);
      this.lastRenderAt = -Infinity;
      this.frameInterval = this.lowPower ? 1000 / 24 : 0;
    }

    preload() {
      const staticData = globalThis.HarvestStaticData || {};
      for (const plant of staticData.PLANTS || []) {
        if (!plant.image) continue;
        this.load.image(`plant-${plant.id}`, `assets/${plant.image}`);
      }
      for (const tool of staticData.TOOLS || []) {
        if (tool.image) this.load.image(`tool-${tool.id}`, `assets/${tool.image}`);
      }
      this.load.spritesheet("farmer", "assets/farmer-green-cap.png", { frameWidth: 16, frameHeight: 18 });
      for (const item of [...(staticData.HARVESTERS || []), ...(staticData.SPRINKLERS || [])]) {
        for (const [direction, file] of Object.entries(item.directionImages || {})) {
          this.load.image(`device-${item.id}-${direction}`, `assets/${file}`);
        }
        if (item.image) this.load.image(`device-${item.id}-default`, `assets/${item.image}`);
      }
      for (const item of staticData.DECORATIONS || []) {
        for (const file of new Set([item.image, item.imageHorizontal, item.imageVertical].filter(Boolean))) {
          this.load.image(`decoration-${file}`, `assets/${file}`);
        }
      }
      for (const file of [
        "kenney-truck-flat.png",
        "kenney-truck-flat-down-left.png",
        "kenney-truck-flat-down-right.png",
        "kenney-truck-flat-up-left.png",
        "kenney-truck-flat-up-right.png"
      ]) this.load.image(`fertilizer-${file}`, `assets/${file}`);
    }

    create() {
      this.ground = this.add.graphics();
      this.cells = this.add.graphics();
      this.shadow = this.add.graphics();
      this.overlays = this.add.graphics();
      this.devices = this.add.graphics();
      this.decorations = this.add.graphics();
      this.effects = this.add.graphics();
      this.ground.setDepth(-100000);
      this.cells.setDepth(-90000);
      this.shadow.setDepth(0);
      this.overlays.setDepth(FARMER_LAYER_Z);
      this.devices.setDepth(50000);
      this.decorations.setDepth(45000);
      this.effects.setDepth(FARMER_LAYER_Z + 100);
      this.farmerSprite = this.add.sprite(0, 0, "farmer").setOrigin(.5, 1).setScale(2.75).setDepth(FARMER_LAYER_Z);
      this.farmerActionLabel = this.add.text(0, 0, "", {
        fontFamily: "sans-serif",
        fontSize: "17px",
        color: "#fffaf0",
        stroke: "#3b2e20",
        strokeThickness: 4
      }).setOrigin(.5, 1).setDepth(FARMER_LAYER_Z + 1);
      this.toolCursorSprite = this.add.image(0, 0, "tool-small_knife").setOrigin(.5, 1).setDepth(FARMER_LAYER_Z + 2).setVisible(false);
      this.events.on("shutdown", () => this.destroyPlantObjects());
      this.renderSnapshot();
    }

    setSnapshot(snapshot) {
      this.snapshot = snapshot;
    }

    update() {
      const now = this.snapshot?.now || performance.now();
      if (this.frameInterval && now - this.lastRenderAt < this.frameInterval) return;
      this.lastRenderAt = now;
      this.renderSnapshot();
    }

    destroyPlantObjects() {
      for (const object of this.plantObjects.values()) {
        object.sprite?.destroy();
        object.graphic?.destroy();
        object.label?.destroy();
      }
      this.plantObjects.clear();
      for (const object of this.deviceObjects.values()) {
        object.sprite?.destroy();
        object.label?.destroy();
      }
      this.deviceObjects.clear();
      for (const object of this.decorationObjects.values()) object.destroy?.();
      this.decorationObjects.clear();
      this.farmerSprite?.destroy();
      this.farmerActionLabel?.destroy();
      this.toolCursorSprite?.destroy();
      for (const label of this.effectLabels) label.destroy();
      this.effectLabels = [];
    }

    ensurePlantObject(index, plant) {
      const key = `${index}:${plant.id}`;
      let object = this.plantObjects.get(key);
      if (object) return object;
      const textureKey = `plant-${plant.id}`;
      const sprite = this.textures.exists(textureKey)
        ? this.add.image(0, 0, textureKey)
        : null;
      const graphic = sprite || plant.id !== "weed" ? null : this.add.graphics();
      const label = sprite || graphic ? null : this.add.text(0, 0, plant.emoji || "🌱", {
        fontFamily: "Apple Color Emoji, Segoe UI Emoji, sans-serif",
        fontSize: "34px",
        color: "#fffaf0",
        stroke: "#3b2e20",
        strokeThickness: 4
      }).setOrigin(.5, 1);
      sprite?.setOrigin(.5, 1);
      object = { sprite, graphic, label, key };
      this.plantObjects.set(key, object);
      return object;
    }

    hideUnusedPlantObjects(usedKeys) {
      for (const [key, object] of this.plantObjects) {
        if (usedKeys.has(key)) continue;
        object.sprite?.setVisible(false);
        object.graphic?.setVisible(false);
        object.label?.setVisible(false);
      }
    }

    plotGeometry(plotId, boardSize, plotGridSize) {
      const plotRow = Math.floor(plotId / plotGridSize) * 3;
      const plotCol = (plotId % plotGridSize) * 3;
      const top = worldPoint(plotRow, plotCol);
      const right = worldPoint(plotRow, plotCol + 2);
      const bottom = worldPoint(plotRow + 2, plotCol + 2);
      const left = worldPoint(plotRow + 2, plotCol);
      return {
        top: { x: top.x, y: top.y - TILE_H / 2 },
        right: { x: right.x + TILE_W / 2, y: right.y },
        bottom: { x: bottom.x, y: bottom.y + TILE_H / 2 },
        left: { x: left.x - TILE_W / 2, y: left.y }
      };
    }

    visibleWorldBounds(padding = TILE_W * 2) {
      const snapshot = this.snapshot;
      const camera = this.cameras?.main;
      const scale = Math.max(.01, safeNumber(camera?.zoom, safeNumber(snapshot?.camera?.scale, 1)));
      // Use Phaser's actual camera scroll and viewport dimensions. Comparing
      // against the DOM size plus the app camera offset can drift when the
      // Scale Manager resizes the canvas or when the viewport has a CSS offset.
      const scrollX = safeNumber(camera?.scrollX, -safeNumber(snapshot?.camera?.x) / scale);
      const scrollY = safeNumber(camera?.scrollY, -safeNumber(snapshot?.camera?.y) / scale);
      const viewportWidth = Math.max(1, safeNumber(camera?.width, this.parent?.clientWidth || 1));
      const viewportHeight = Math.max(1, safeNumber(camera?.height, this.parent?.clientHeight || 1));
      return {
        left: scrollX - padding,
        right: scrollX + viewportWidth / scale + padding,
        top: scrollY - padding,
        bottom: scrollY + viewportHeight / scale + padding
      };
    }

    isWorldVisible(x, y, padding = TILE_W * 2) {
      const bounds = this.visibleWorldBounds(padding);
      return x >= bounds.left && x <= bounds.right && y >= bounds.top && y <= bounds.bottom;
    }

    farmSignature(state) {
      return (state.ownedPlots || []).join(",");
    }

    drawPlot(plot, owned, boardSize, plotGridSize) {
      const geometry = this.plotGeometry(plot.id, boardSize, plotGridSize);
      const color = owned ? 0x6d5437 : 0x476b45;
      const sideColor = owned ? 0x563824 : 0x315338;
      this.ground.fillStyle(sideColor, owned ? .95 : .7);
      this.ground.beginPath();
      this.ground.moveTo(geometry.left.x, geometry.left.y);
      this.ground.lineTo(geometry.bottom.x, geometry.bottom.y);
      this.ground.lineTo(geometry.bottom.x, geometry.bottom.y + TILE_DEPTH);
      this.ground.lineTo(geometry.left.x, geometry.left.y + TILE_DEPTH);
      this.ground.closePath();
      this.ground.fillPath();
      this.ground.beginPath();
      this.ground.moveTo(geometry.right.x, geometry.right.y);
      this.ground.lineTo(geometry.bottom.x, geometry.bottom.y);
      this.ground.lineTo(geometry.bottom.x, geometry.bottom.y + TILE_DEPTH);
      this.ground.lineTo(geometry.right.x, geometry.right.y + TILE_DEPTH);
      this.ground.closePath();
      this.ground.fillPath();

      this.ground.fillStyle(color, owned ? 1 : .7);
      this.ground.beginPath();
      this.ground.moveTo(geometry.top.x, geometry.top.y);
      this.ground.lineTo(geometry.right.x, geometry.right.y);
      this.ground.lineTo(geometry.bottom.x, geometry.bottom.y);
      this.ground.lineTo(geometry.left.x, geometry.left.y);
      this.ground.closePath();
      this.ground.fillPath();

      this.ground.lineStyle(1.5, owned ? 0x94774e : 0x6f9870, .7);
      this.ground.beginPath();
      this.ground.moveTo(geometry.top.x, geometry.top.y);
      this.ground.lineTo(geometry.right.x, geometry.right.y);
      this.ground.lineTo(geometry.bottom.x, geometry.bottom.y);
      this.ground.lineTo(geometry.left.x, geometry.left.y);
      this.ground.closePath();
      this.ground.strokePath();
    }

    drawCellGrid(index, boardSize, owned) {
      const row = Math.floor(index / boardSize);
      const col = index % boardSize;
      const point = worldPoint(row, col);
      pathDiamond(this.cells, point.x, point.y, CELL_W, CELL_H);
      this.cells.lineStyle(1, owned ? 0xb39769 : 0x587d52, owned ? .35 : .2);
      this.cells.strokePath();
    }

    plantAnchorPoint(cell, fallbackIndex, boardSize, core) {
      const anchorIndex = Number.isInteger(cell?.plantAnchorIndex) ? cell.plantAnchorIndex : fallbackIndex;
      const plant = core.getPlant(cell?.plantId);
      if (!plant || plant.type !== "tree") {
        return worldPoint(Math.floor(fallbackIndex / boardSize), fallbackIndex % boardSize);
      }
      const indexes = core.getPlantPlacementIndexes(anchorIndex, plant.id);
      if (!indexes.length) return worldPoint(Math.floor(anchorIndex / boardSize), anchorIndex % boardSize);
      const points = indexes.map((index) => worldPoint(Math.floor(index / boardSize), index % boardSize));
      return {
        x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
        y: points.reduce((sum, point) => sum + point.y, 0) / points.length
      };
    }

    drawPlant(index, cell, boardSize, core, now, usedKeys) {
      const plant = core.getPlant(cell?.plantId);
      if (!plant || !cell?.plantId) return;
      const anchorIndex = Number.isInteger(cell.plantRootIndex) ? cell.plantRootIndex : index;
      if (anchorIndex !== index) return;
      const point = this.plantAnchorPoint(cell, index, boardSize, core);
      const objectKey = `${index}:${plant.id}`;
      if (!this.isWorldVisible(point.x, point.y, TILE_W * 5)) {
        const offscreen = this.plantObjects.get(objectKey);
        offscreen?.sprite?.setVisible(false);
        offscreen?.graphic?.setVisible(false);
        offscreen?.label?.setVisible(false);
        usedKeys.add(objectKey);
        return;
      }
      const object = this.ensurePlantObject(index, plant);
      usedKeys.add(object.key);
      const progress = cell.phase === "mature" ? 1 : Math.min(1, Math.max(0, safeNumber(cell.growthProgress)));
      const growthScale = .28 + progress * .72;
      const footprint = core.getPlantFootprint(plant);
      const image = object.sprite ? this.textures.get(`plant-${plant.id}`).getSourceImage() : null;
      const base = plant.type === "tree" ? Math.max(104, footprint * 74) : 82;
      const ratio = image ? safeNumber(image.naturalWidth / image.naturalHeight, 1) : 1;
      const height = plant.image ? base * growthScale : 42 * growthScale;
      const width = plant.image ? Math.min(base * 1.18, height * ratio) : 52 * growthScale;
      const contactY = TILE_H * .42;
      const bob = cell.phase === "mature" && !this.snapshot.reducedMotion
        ? Math.sin(now / 650 + point.x * .03) * .65
        : 0;

      this.shadow.fillStyle(0x2f2316, .24);
      this.shadow.fillEllipse(point.x + 2, point.y + contactY - 2,
        Math.max(46, footprint * TILE_W * .72) * growthScale,
        Math.max(14, footprint * TILE_H * .32) * growthScale);
      if (object.sprite) {
        object.sprite.setVisible(true);
        object.sprite.setPosition(point.x, point.y + contactY + bob);
        object.sprite.setDisplaySize(width, height);
        object.sprite.setAlpha(cell.phase === "mature" ? 1 : .82);
        object.sprite.setDepth(point.y + contactY);
      } else if (object.graphic) {
        object.graphic.clear();
        object.graphic.setVisible(true).setPosition(point.x, point.y + contactY);
        object.graphic.setDepth(point.y + contactY);
        const leafScale = Math.max(.35, growthScale);
        object.graphic.fillStyle(0x6f9c4d, cell.phase === "mature" ? 1 : .82);
        object.graphic.fillEllipse(-7 * leafScale, -17 * leafScale, 15 * leafScale, 7 * leafScale);
        object.graphic.fillEllipse(7 * leafScale, -22 * leafScale, 15 * leafScale, 7 * leafScale);
        object.graphic.fillEllipse(-2 * leafScale, -29 * leafScale, 14 * leafScale, 7 * leafScale);
        object.graphic.lineStyle(2, 0x4d7138, .9);
        object.graphic.beginPath();
        object.graphic.moveTo(0, 0);
        object.graphic.lineTo(0, -31 * leafScale);
        object.graphic.strokePath();
        object.graphic.fillStyle(0xf1e5a0, cell.phase === "mature" ? .95 : .55);
        object.graphic.fillCircle(0, -34 * leafScale, 3.2 * leafScale);
      } else {
        object.label.setVisible(true);
        object.label.setPosition(point.x, point.y + contactY);
        object.label.setFontSize(`${Math.max(12, 20 + progress * 16)}px`);
        object.label.setAlpha(cell.phase === "mature" ? 1 : .82);
        object.label.setDepth(point.y + contactY);
      }

      this.overlays.fillStyle(0x1a1f16, .45);
      this.overlays.fillRect(point.x - 24, point.y + contactY - height - 10, 48, 5);
      this.overlays.fillStyle(cell.phase === "growing" ? 0xd5ed97 : 0xffce60, .95);
      const ratioValue = cell.phase === "growing" ? progress : safeNumber(cell.currentHp / Math.max(1, plant.hp), 1);
      this.overlays.fillRect(point.x - 23, point.y + contactY - height - 9, 46 * Math.min(1, Math.max(0, ratioValue)), 3);
    }

    hash(value) {
      let result = 0;
      for (let index = 0; index < String(value).length; index += 1) result = (result * 31 + String(value).charCodeAt(index)) >>> 0;
      return result;
    }

    directionForVector(dx, dy) {
      if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? "down-right" : "up-left";
      return dy >= 0 ? "down-left" : "up-right";
    }

    automationPath(targets, boardSize) {
      const rows = new Map();
      for (const index of targets) {
        const row = Math.floor(index / boardSize);
        const col = index % boardSize;
        if (!rows.has(row)) rows.set(row, []);
        rows.get(row).push(col);
      }
      const path = [];
      [...rows.keys()].sort((a, b) => a - b).forEach((row, order) => {
        const columns = rows.get(row).sort((a, b) => a - b);
        if (order % 2) columns.reverse();
        for (const col of columns) path.push(row * boardSize + col);
      });
      return path;
    }

    pathPosition(path, now, speed, offset, boardSize) {
      if (!path.length) return null;
      if (path.length === 1) {
        const row = Math.floor(path[0] / boardSize);
        return { ...worldPoint(row, path[0] % boardSize), dx: 0, dy: 0 };
      }
      const cycle = (path.length - 1) * 2;
      const travel = ((now / 1000) * speed + offset) % cycle;
      const distance = travel <= path.length - 1 ? travel : cycle - travel;
      const start = Math.floor(distance);
      const progress = distance - start;
      const a = path[Math.min(path.length - 1, start)];
      const b = path[Math.min(path.length - 1, start + 1)];
      const pointA = worldPoint(Math.floor(a / boardSize), a % boardSize);
      const pointB = worldPoint(Math.floor(b / boardSize), b % boardSize);
      return {
        x: pointA.x + (pointB.x - pointA.x) * progress,
        y: pointA.y + (pointB.y - pointA.y) * progress,
        dx: pointB.x - pointA.x,
        dy: pointB.y - pointA.y
      };
    }

    ensureDeviceObject(key, item, kind) {
      let object = this.deviceObjects.get(key);
      if (object) return object;
      const textureKey = `device-${item.id}-default`;
      const sprite = this.textures.exists(textureKey) ? this.add.image(0, 0, textureKey) : null;
      const label = sprite ? null : this.add.text(0, 0, item.emoji || (kind === "sprinkler" ? "💧" : "🚜"), {
        fontFamily: "Apple Color Emoji, Segoe UI Emoji, sans-serif",
        fontSize: "24px",
        color: "#fffaf0",
        stroke: "#3b2e20",
        strokeThickness: 4
      }).setOrigin(.5, 1);
      sprite?.setOrigin(.5, 1);
      object = { sprite, label, kind, key };
      this.deviceObjects.set(key, object);
      return object;
    }

    hideUnusedDeviceObjects(usedKeys) {
      for (const [key, object] of this.deviceObjects) {
        if (usedKeys.has(key)) continue;
        object.sprite?.setVisible(false);
        object.label?.setVisible(false);
      }
    }

    deviceCenter(placed, core, boardSize) {
      const index = Number.isInteger(placed?.centerIndex) ? placed.centerIndex : core.indexesForPlot(placed.plotId)[4];
      return worldPoint(Math.floor(index / boardSize), index % boardSize);
    }

    drawAutomation(state, core, boardSize, now, snapshot) {
      const usedObjects = new Set();
      const drawRanges = (list, kind, getter, color, activeColor) => {
        for (const placed of list || []) {
          const item = getter(placed.id);
          if (!item) continue;
          const centerIndex = Number.isInteger(placed.centerIndex) ? placed.centerIndex : core.indexesForPlot(placed.plotId)[4];
          const targets = core.automationTargetIndexes(item.range, placed.plotId, state.ownedPlots, centerIndex);
          const focused = snapshot.selection?.sourceInstanceId === placed.instanceId
            || (snapshot.focusedPlotId === placed.plotId && snapshot.selection?.kind === kind);
          if (focused) {
            for (const index of targets) {
              const point = worldPoint(Math.floor(index / boardSize), index % boardSize);
              pathDiamond(this.devices, point.x, point.y, CELL_W, CELL_H);
              this.devices.fillStyle(color, .18);
              this.devices.fillPath();
              this.devices.lineStyle(2, activeColor, .72);
              this.devices.strokePath();
            }
          }
          const key = `${kind}:${placed.instanceId || placed.plotId}`;
          const deviceCenter = this.deviceCenter(placed, core, boardSize);
          if (!this.isWorldVisible(deviceCenter.x, deviceCenter.y, TILE_W * (item.range + 2))) {
            const offscreen = this.deviceObjects.get(key);
            offscreen?.sprite?.setVisible(false);
            offscreen?.label?.setVisible(false);
            continue;
          }
          const object = this.ensureDeviceObject(key, item, kind);
          usedObjects.add(key);
          const pathKey = `${key}:${item.range}:${centerIndex}:${targets.join(".")}`;
          let path = this.pathCache.get(pathKey);
          if (!path) {
            path = this.automationPath(targets, boardSize);
            this.pathCache.set(pathKey, path);
            if (this.pathCache.size > 128) this.pathCache.delete(this.pathCache.keys().next().value);
          }
          const position = this.pathPosition(path, now, 2, this.hash(key) % 1000 / 1000 * Math.max(1, path.length), boardSize)
            || deviceCenter;
          const heading = this.directionForVector(position.dx || 0, position.dy || 0);
          const directionalTexture = `device-${item.id}-${heading}`;
          if (object.sprite) {
            if (this.textures.exists(directionalTexture)) object.sprite.setTexture(directionalTexture);
            object.sprite.setVisible(true).setPosition(position.x, position.y + 7).setDepth(position.y + 100);
            object.sprite.setDisplaySize(kind === "sprinkler" ? 42 : 58, kind === "sprinkler" ? 42 : 42);
          } else {
            object.label.setVisible(true).setPosition(position.x, position.y + 7).setDepth(position.y + 100);
          }
          this.devices.fillStyle(0x2e2114, .24);
          this.devices.fillEllipse(position.x + 3, position.y + 8, kind === "sprinkler" ? 24 : 38, 10);
          if (kind === "sprinkler") {
            const center = deviceCenter;
            const pulse = snapshot.reducedMotion ? 0 : Math.sin(now / 220) * 4;
            this.devices.lineStyle(2, 0x8fe2ef, .6);
            for (let arm = 0; arm < 4; arm += 1) {
              const angle = now / 900 + arm * Math.PI / 2;
              const endX = center.x + Math.cos(angle) * (18 + item.range * 12 + pulse);
              const endY = center.y + Math.sin(angle) * (8 + item.range * 5 + pulse * .25);
              this.devices.beginPath();
              this.devices.moveTo(center.x, center.y - 10);
              this.devices.lineTo(endX, endY);
              this.devices.strokePath();
              this.devices.fillStyle(0xc7f4fa, .86);
              this.devices.fillCircle(endX, endY, 2.4);
            }
          }
        }
      };
      drawRanges(state.harvesters, "harvester", core.getHarvester.bind(core), 0xffe082, 0xffc34f);
      drawRanges(state.sprinklers, "sprinkler", core.getSprinkler.bind(core), 0x9ceaf0, 0x70d0dc);
      this.hideUnusedDeviceObjects(usedObjects);
    }

    decorationPoint(slot) {
      if (!slot) return null;
      if (slot.slotType === "corner") return worldPoint(slot.row + .5, slot.col + .5);
      if (slot.direction === "vertical") return worldPoint(slot.row, slot.col + .5);
      return worldPoint(slot.row + .5, slot.col);
    }

    drawDecorations(state, core) {
      const used = new Set();
      for (const [index, placed] of (state.decorations || []).entries()) {
        const item = core.getDecoration(placed.id);
        const point = this.decorationPoint(placed);
        if (!item || !point) continue;
        const key = `${placed.id}:${placed.row}:${placed.col}:${placed.direction || ""}:${index}`;
        used.add(key);
        if (!this.isWorldVisible(point.x, point.y, TILE_W * 2)) {
          this.decorationObjects.get(key)?.setVisible(false);
          continue;
        }
        let object = this.decorationObjects.get(key);
        const file = placed.direction === "vertical" ? item.imageVertical || item.image : item.imageHorizontal || item.image;
        const textureKey = `decoration-${file}`;
        if (!object) {
          object = this.textures.exists(textureKey)
            ? this.add.image(0, 0, textureKey).setOrigin(.5, 1)
            : this.add.text(0, 0, item.emoji || "🪵", { fontSize: "24px" }).setOrigin(.5, 1);
          this.decorationObjects.set(key, object);
        }
        if (object.texture && this.textures.exists(textureKey)) object.setTexture(textureKey);
        const image = this.textures.exists(textureKey) ? this.textures.get(textureKey).getSourceImage() : null;
        const width = item.renderWidth || 52;
        const height = image ? width / Math.max(.4, safeNumber(image.naturalWidth / image.naturalHeight, 1)) : width;
        object.setPosition(point.x, point.y + safeNumber(item.contactOffsetY, 8));
        object.setDisplaySize(width, height);
        object.setAlpha(1);
        object.setDepth(point.y + safeNumber(item.contactOffsetY, 8) + (item.layer === "ground" ? -100 : 100));
        object.setVisible(true);
      }
      for (const [key, object] of this.decorationObjects) {
        if (used.has(key)) continue;
        object.setVisible(false);
      }
    }

    drawFarmer(farmer, now, reducedMotion) {
      if (!farmer?.initialized || !this.farmerSprite) return;
      if (!this.isWorldVisible(farmer.x, farmer.y, TILE_W * 2)) {
        this.farmerSprite.setVisible(false);
        this.farmerActionLabel.setVisible(false);
        return;
      }
      const frame = farmer.action === "walk" ? Math.floor(now / 180) % 3 : 1;
      const row = Math.max(0, Math.min(3, Number(farmer.directionRow) || 0));
      this.farmerSprite.setVisible(true).setPosition(farmer.x, farmer.y + TILE_H * .42);
      this.farmerSprite.setFrame(row * 3 + frame);
      this.farmerSprite.setDepth(farmer.y + 100);
      this.farmerSprite.setAlpha(.98);
      const actionLabels = { hoe: "⛏", water: "💧", rest: "💦", sing: "♪", look: "…" };
      const label = farmer.action === "walk" ? "" : actionLabels[farmer.action] || "";
      this.farmerActionLabel.setText(label).setVisible(Boolean(label));
      this.farmerActionLabel.setPosition(farmer.x + 26, farmer.y - 54 + (reducedMotion ? 0 : Math.sin(now / 180) * 2));
    }

    drawSelection(snapshot, state, core, boardSize) {
      const center = Number.isInteger(snapshot.pendingActionIndex) ? snapshot.pendingActionIndex : snapshot.hoverIndex;
      if (!Number.isInteger(center) || center < 0) return;
      const point = worldPoint(Math.floor(center / boardSize), center % boardSize);
      pathDiamond(this.overlays, point.x, point.y, CELL_W, CELL_H);
      this.overlays.fillStyle(0xffe679, .12);
      this.overlays.fillPath();
      this.overlays.lineStyle(2.5, 0xffefaa, .9);
      this.overlays.strokePath();
      const selection = snapshot.selection;
      if (!selection || snapshot.pendingActionPlotId == null) return;
      let indexes = [];
      if (selection.kind === "harvester" || selection.kind === "sprinkler") {
        const item = selection.kind === "harvester" ? core.getHarvester(selection.id) : core.getSprinkler(selection.id);
        indexes = item ? core.automationTargetIndexes(item.range, snapshot.pendingActionPlotId, state.ownedPlots, center) : [];
      } else if (selection.kind === "seed" && core.getPlant(selection.id)?.type === "tree") {
        indexes = core.getPlantPlacementIndexes(center, selection.id);
      } else if (selection.kind === "tool") {
        indexes = core.getToolTargetIndexes(selection.id, center, state.ownedPlots);
      } else {
        indexes = core.indexesForPlot(snapshot.pendingActionPlotId);
      }
      for (const index of indexes) {
        const target = worldPoint(Math.floor(index / boardSize), index % boardSize);
        pathDiamond(this.overlays, target.x, target.y, CELL_W, CELL_H);
        this.overlays.fillStyle(0xffe679, .08);
        this.overlays.fillPath();
        this.overlays.lineStyle(2, 0xffe679, .7);
        this.overlays.strokePath();
      }
    }

    effectLabelAt(index) {
      let label = this.effectLabels[index];
      if (label) return label;
      label = this.add.text(0, 0, "", {
        fontFamily: "sans-serif",
        fontSize: "17px",
        color: "#ffe16d",
        stroke: "#3b2e20",
        strokeThickness: 4
      }).setOrigin(.5, 1).setDepth(FARMER_LAYER_Z + 3).setVisible(false);
      this.effectLabels[index] = label;
      return label;
    }

    drawEffects(snapshot, core, boardSize, now) {
      const reduced = snapshot.reducedMotion;
      this.effects.clear();
      for (const label of this.effectLabels) label.setVisible(false);
      let labelIndex = 0;
      const drawBurst = (burst, color, duration) => {
        const progress = Math.min(1, Math.max(0, (now - burst.startedAt) / duration));
        if (progress >= 1) return false;
        const point = { x: burst.x, y: burst.y + TILE_H * .39 };
        this.effects.lineStyle(2.5, color, Math.sin(progress * Math.PI));
        this.effects.strokeEllipse(point.x, point.y, 18 + progress * 42, 7 + progress * 14);
        this.effects.fillStyle(color, Math.sin(progress * Math.PI) * .72);
        this.effects.fillCircle(point.x, point.y - progress * 24, 4 + progress * 4);
        return true;
      };
      for (let index = snapshot.plantBursts.length - 1; index >= 0; index -= 1) {
        const burst = snapshot.plantBursts[index];
        if (!drawBurst(burst, burst.color || 0x8ab35e, reduced ? 180 : 820)) snapshot.plantBursts.splice(index, 1);
      }
      for (let index = snapshot.swingMarks.length - 1; index >= 0; index -= 1) {
        const mark = snapshot.swingMarks[index];
        const progress = Math.min(1, Math.max(0, (now - mark.startedAt) / (reduced ? 110 : 320)));
        if (progress >= 1) { snapshot.swingMarks.splice(index, 1); continue; }
        this.effects.lineStyle(4, 0xfff4b1, Math.sin(progress * Math.PI));
        this.effects.beginPath();
        const startX = mark.x - 34;
        const startY = mark.y - 15;
        const controlX = mark.x;
        const controlY = mark.y + 9;
        const endX = mark.x + 35;
        const endY = mark.y - 11;
        this.effects.moveTo(startX, startY);
        // Phaser Graphics has no quadraticBezierTo method. Approximate the
        // short slash with a small deterministic polyline instead.
        for (let segment = 1; segment <= 8; segment += 1) {
          const t = segment / 8;
          const inverse = 1 - t;
          this.effects.lineTo(
            inverse * inverse * startX + 2 * inverse * t * controlX + t * t * endX,
            inverse * inverse * startY + 2 * inverse * t * controlY + t * t * endY
          );
        }
        this.effects.strokePath();
      }
      for (let index = snapshot.effects.length - 1; index >= 0; index -= 1) {
        const effect = snapshot.effects[index];
        const progress = Math.min(1, Math.max(0, (now - effect.startedAt) / 760));
        if (progress >= 1) { snapshot.effects.splice(index, 1); continue; }
        const text = this.effectLabelAt(labelIndex++);
        text.setText(effect.text).setColor(effect.color || "#ffe16d");
        text.setPosition(effect.x, effect.y - progress * 38).setAlpha(1 - progress).setVisible(true);
      }
      for (let index = snapshot.deviceBursts.length - 1; index >= 0; index -= 1) {
        const burst = snapshot.deviceBursts[index];
        const duration = reduced ? 180 : burst.kind === "fertilizer" ? 1100 : burst.kind === "sprinkler" ? 920 : 760;
        const progress = Math.min(1, Math.max(0, (now - burst.startedAt) / duration));
        if (progress >= 1) { snapshot.deviceBursts.splice(index, 1); continue; }
        const color = burst.kind === "sprinkler" ? 0x9ceaf0 : burst.kind === "fertilizer" ? 0xf0c95e : 0xffd36a;
        this.effects.lineStyle(3, color, (1 - progress) * .9);
        this.effects.strokeEllipse(burst.x, burst.y + 10, 36 + progress * 120, 14 + progress * 48);
        this.effects.fillStyle(color, (1 - progress) * .65);
        this.effects.fillCircle(burst.x, burst.y - progress * 30, 3 + progress * 3);
      }
      // Keep the graphics path deterministic and bounded even when a user
      // holds a tool on a large range.
      if (snapshot.deviceBursts.length > 48) snapshot.deviceBursts.splice(0, snapshot.deviceBursts.length - 48);
    }

    renderSnapshot() {
      const snapshot = this.snapshot;
      if (!snapshot || !this.ground || !globalThis.HarvestCore) return;
      const core = globalThis.HarvestCore;
      const staticData = globalThis.HarvestStaticData || {};
      const boardSize = safeNumber(staticData.BOARD_SIZE || core.BOARD_SIZE, 27);
      const plotGridSize = safeNumber(staticData.PLOT_GRID_SIZE || core.PLOT_GRID_SIZE, 9);
      const scale = Math.max(.01, safeNumber(snapshot.camera?.scale, 1));
      this.cameras.main.setZoom(scale);
      this.cameras.main.setScroll(-safeNumber(snapshot.camera?.x) / scale, -safeNumber(snapshot.camera?.y) / scale);
      this.shadow.clear();
      this.overlays.clear();
      this.devices.clear();
      this.decorations.clear();
      const ownedPlots = new Set(snapshot.state.ownedPlots || []);
      const signature = this.farmSignature(snapshot.state);
      if (signature !== this.staticFarmSignature) {
        this.ground.clear();
        this.cells.clear();
        this.ground.fillStyle(0x86ad69, 1);
        this.ground.fillRect(-2600, -900, 5200, 3400);
        for (const plot of core.PLOTS || staticData.PLOTS || []) {
          this.drawPlot(plot, ownedPlots.has(plot.id), boardSize, plotGridSize);
        }
        const ownedIndexes = new Set((snapshot.state.ownedPlots || []).flatMap(core.indexesForPlot));
        for (const index of ownedIndexes) this.drawCellGrid(index, boardSize, true);
        this.staticFarmSignature = signature;
      }
      const ownedIndexes = new Set((snapshot.state.ownedPlots || []).flatMap(core.indexesForPlot));

      const usedKeys = new Set();
      for (let index = 0; index < (snapshot.state.cells || []).length; index += 1) {
        if (!ownedIndexes.has(index)) continue;
        this.drawPlant(index, snapshot.state.cells[index], boardSize, core, snapshot.now || performance.now(), usedKeys);
      }
      this.hideUnusedPlantObjects(usedKeys);
      this.drawDecorations(snapshot.state, core);
      this.drawAutomation(snapshot.state, core, boardSize, snapshot.now || performance.now(), snapshot);
      this.drawFarmer(snapshot.farmer, snapshot.now || performance.now(), snapshot.reducedMotion);
      this.drawSelection(snapshot, snapshot.state, core, boardSize);
      this.drawEffects(snapshot, core, boardSize, snapshot.now || performance.now());

      const cursor = snapshot.toolCursor;
      if (cursor?.visible && !snapshot.readOnly) {
        const tool = core.getTool(snapshot.state.equippedToolId);
        const textureKey = `tool-${tool?.id}`;
        if (tool && this.textures.exists(textureKey)) {
          const worldX = (cursor.x - safeNumber(snapshot.camera?.x)) / scale;
          const worldY = (cursor.y - safeNumber(snapshot.camera?.y)) / scale;
          const swingProgress = Math.min(1, Math.max(0, ((snapshot.now || performance.now()) - cursor.swingStartedAt) / (snapshot.reducedMotion ? 80 : 280)));
          this.toolCursorSprite.setTexture(textureKey).setVisible(true).setPosition(worldX, worldY).setDisplaySize(44, 44);
          this.toolCursorSprite.setRotation(-.18 + Math.sin(swingProgress * Math.PI) * .72);
        }
      } else {
        this.toolCursorSprite?.setVisible(false);
      }
    }
  }

  class FarmRenderer {
    constructor({ parent }) {
      this.parent = parent;
      this.game = null;
      this.scene = null;
      this.snapshot = null;
      this.active = false;
      this.inputBridgeDisposers = [];
    }

    mount() {
      if (!globalThis.Phaser || !this.parent) return false;
      try {
        this.game = new globalThis.Phaser.Game({
          type: globalThis.Phaser.AUTO,
          parent: this.parent,
          transparent: true,
          width: Math.max(1, this.parent.clientWidth),
          height: Math.max(1, this.parent.clientHeight),
          render: { antialias: true, roundPixels: false, powerPreference: "high-performance" },
          scale: { mode: globalThis.Phaser.Scale.RESIZE, autoCenter: globalThis.Phaser.Scale.CENTER_BOTH },
          scene: FarmScene
        });
        this.game.events.once("ready", () => {
          this.scene = this.game.scene.getScene("HarvestFarmScene");
          this.active = Boolean(this.scene);
        });
        this.active = true;
        return true;
      } catch (error) {
        console.warn("Phaser farm renderer unavailable; keeping legacy Canvas renderer.", error);
        this.active = false;
        this.parent.hidden = true;
        return false;
      }
    }

    installInputBridge() {
      const source = this.game?.canvas;
      const target = document.querySelector("#farm-canvas");
      if (!source || !target || typeof globalThis.PointerEvent !== "function") return;
      source.tabIndex = 0;
      source.style.touchAction = "none";
      source.setAttribute("aria-label", target.getAttribute("aria-label") || "農田");
      const forwardPointer = (type, event) => {
        if (type === "pointerdown" || type === "pointermove" || type === "pointerup") event.preventDefault();
        if (type === "pointerdown") {
          source.focus({ preventScroll: true });
          try { source.setPointerCapture(event.pointerId); } catch (error) { /* Browser may not expose capture for synthetic input. */ }
        }
        const forwarded = new globalThis.PointerEvent(type, {
          bubbles: true,
          cancelable: true,
          clientX: event.clientX,
          clientY: event.clientY,
          pointerId: event.pointerId,
          pointerType: event.pointerType,
          isPrimary: event.isPrimary,
          button: event.button,
          buttons: event.buttons,
          pressure: event.pressure,
          width: event.width,
          height: event.height,
          altKey: event.altKey,
          ctrlKey: event.ctrlKey,
          metaKey: event.metaKey,
          shiftKey: event.shiftKey
        });
        target.dispatchEvent(forwarded);
        if (forwarded.defaultPrevented) event.preventDefault();
      };
      const pointerEvents = ["pointerdown", "pointermove", "pointerenter", "pointerleave", "pointerup", "pointercancel"];
      for (const type of pointerEvents) {
        const listener = (event) => forwardPointer(type, event);
        source.addEventListener(type, listener, { passive: false });
        this.inputBridgeDisposers.push(() => source.removeEventListener(type, listener));
      }
      const wheelListener = (event) => {
        const forwarded = new WheelEvent("wheel", {
          bubbles: true,
          cancelable: true,
          clientX: event.clientX,
          clientY: event.clientY,
          deltaX: event.deltaX,
          deltaY: event.deltaY,
          deltaZ: event.deltaZ,
          deltaMode: event.deltaMode,
          ctrlKey: event.ctrlKey,
          shiftKey: event.shiftKey,
          altKey: event.altKey,
          metaKey: event.metaKey
        });
        target.dispatchEvent(forwarded);
        if (forwarded.defaultPrevented) event.preventDefault();
      };
      source.addEventListener("wheel", wheelListener, { passive: false });
      this.inputBridgeDisposers.push(() => source.removeEventListener("wheel", wheelListener));
      const keyListener = (event) => target.dispatchEvent(new KeyboardEvent("keydown", {
        bubbles: true,
        cancelable: true,
        key: event.key,
        code: event.code,
        repeat: event.repeat,
        altKey: event.altKey,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        shiftKey: event.shiftKey
      }));
      source.addEventListener("keydown", keyListener);
      this.inputBridgeDisposers.push(() => source.removeEventListener("keydown", keyListener));
    }

    update(snapshot) {
      this.snapshot = snapshot;
      if (!this.scene && this.game?.scene) this.scene = this.game.scene.getScene("HarvestFarmScene");
      this.scene?.setSnapshot(snapshot);
    }

    isActive() {
      return this.active;
    }

    destroy() {
      for (const dispose of this.inputBridgeDisposers.splice(0)) dispose();
      this.game?.destroy(true);
      this.game = null;
      this.scene = null;
      this.active = false;
    }
  }

  globalThis.HarvestPhaserFarmRenderer = FarmRenderer;
}(globalThis));
