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
    }

    preload() {
      const staticData = globalThis.HarvestStaticData || {};
      for (const plant of staticData.PLANTS || []) {
        if (!plant.image) continue;
        this.load.image(`plant-${plant.id}`, `assets/${plant.image}`);
      }
    }

    create() {
      this.ground = this.add.graphics();
      this.cells = this.add.graphics();
      this.shadow = this.add.graphics();
      this.overlays = this.add.graphics();
      this.ground.setDepth(-100000);
      this.cells.setDepth(-90000);
      this.shadow.setDepth(0);
      this.overlays.setDepth(FARMER_LAYER_Z);
      this.events.on("shutdown", () => this.destroyPlantObjects());
      this.renderSnapshot();
    }

    setSnapshot(snapshot) {
      this.snapshot = snapshot;
    }

    update() {
      this.renderSnapshot();
    }

    destroyPlantObjects() {
      for (const object of this.plantObjects.values()) {
        object.sprite?.destroy();
        object.label?.destroy();
      }
      this.plantObjects.clear();
    }

    ensurePlantObject(index, plant) {
      const key = `${index}:${plant.id}`;
      let object = this.plantObjects.get(key);
      if (object) return object;
      const textureKey = `plant-${plant.id}`;
      const sprite = this.textures.exists(textureKey)
        ? this.add.image(0, 0, textureKey)
        : null;
      const label = sprite ? null : this.add.text(0, 0, plant.emoji || "🌱", {
        fontFamily: "Apple Color Emoji, Segoe UI Emoji, sans-serif",
        fontSize: "34px",
        color: "#fffaf0",
        stroke: "#3b2e20",
        strokeThickness: 4
      }).setOrigin(.5, 1);
      sprite?.setOrigin(.5, 1);
      object = { sprite, label, key };
      this.plantObjects.set(key, object);
      return object;
    }

    hideUnusedPlantObjects(usedKeys) {
      for (const [key, object] of this.plantObjects) {
        if (usedKeys.has(key)) continue;
        object.sprite?.setVisible(false);
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
      this.ground.clear();
      this.cells.clear();
      this.shadow.clear();
      this.overlays.clear();
      this.ground.fillStyle(0x86ad69, 1);
      this.ground.fillRect(-2600, -900, 5200, 3400);

      const ownedPlots = new Set(snapshot.state.ownedPlots || []);
      for (const plot of core.PLOTS || staticData.PLOTS || []) this.drawPlot(plot, ownedPlots.has(plot.id), boardSize, plotGridSize);
      const ownedIndexes = new Set((snapshot.state.ownedPlots || []).flatMap(core.indexesForPlot));
      for (const index of ownedIndexes) this.drawCellGrid(index, boardSize, true);

      const usedKeys = new Set();
      for (let index = 0; index < (snapshot.state.cells || []).length; index += 1) {
        if (!ownedIndexes.has(index)) continue;
        this.drawPlant(index, snapshot.state.cells[index], boardSize, core, snapshot.now || performance.now(), usedKeys);
      }
      this.hideUnusedPlantObjects(usedKeys);
    }
  }

  class FarmRenderer {
    constructor({ parent }) {
      this.parent = parent;
      this.game = null;
      this.scene = null;
      this.snapshot = null;
      this.active = false;
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

    update(snapshot) {
      this.snapshot = snapshot;
      if (!this.scene && this.game?.scene) this.scene = this.game.scene.getScene("HarvestFarmScene");
      this.scene?.setSnapshot(snapshot);
    }

    isActive() {
      return this.active;
    }

    destroy() {
      this.game?.destroy(true);
      this.game = null;
      this.scene = null;
      this.active = false;
    }
  }

  globalThis.HarvestPhaserFarmRenderer = FarmRenderer;
}(globalThis));
