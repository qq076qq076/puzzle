import { GAME_HEIGHT, GAME_WIDTH } from "../config.js";
import { playEnvironmentAnimation } from "../systems/actor-animations.js";
import { createSideDoor } from "../systems/door-system.js";
import { getSideVector } from "../data/rooms.js";
import { createBreakableBottle } from "../systems/destructible-system.js";
import { getCorridorDoorGeometry, getCorridorDoorway, getCorridorRenderFloorCells } from "../systems/corridor-geometry.js";
import { getCorridorWallCells } from "../systems/corridor-wall-geometry.js";
import { getDungeonWallTexture } from "../systems/wall-texture.js";

function uniqueCells(cells) {
  return [...new Map(cells.map((cell) => [cell.join(","), cell])).values()];
}

function createLayout(corridor) {
  const floorCells = uniqueCells(getCorridorRenderFloorCells(corridor));
  const xs = floorCells.map(([x]) => x);
  const ys = floorCells.map(([, y]) => y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const columns = maxX - minX + 1;
  const rows = maxY - minY + 1;
  const cellSize = Math.max(28, Math.min(56, Math.floor(670 / (columns + 2)), Math.floor(310 / (rows + 2))));
  const offsetX = GAME_WIDTH / 2 - ((minX + maxX) / 2) * cellSize;
  const offsetY = 310 - ((minY + maxY) / 2) * cellSize;
  const toPixel = ([x, y]) => [x * cellSize + offsetX, y * cellSize + offsetY];
  const doorways = [getCorridorDoorway(corridor, true), getCorridorDoorway(corridor, false)];
  return {
    floorCells,
    wallCells: getCorridorWallCells(floorCells, doorways),
    collisionWallCells: getCorridorWallCells(floorCells, doorways, false),
    cellSize,
    toPixel,
  };
}

function offsetBySide(point, side, distance) {
  const [dx, dy] = getSideVector(side);
  return [point[0] + dx * distance, point[1] + dy * distance];
}

export function buildCorridorWorld(scene, corridor) {
  const layout = createLayout(corridor);
  const machine = corridor.theme === "machine";
  const floorKey = machine ? "room-floor-machine" : "room-floor-fantasy";
  scene.cameras.main.setBackgroundColor(machine ? "#080d16" : "#090b13");

  layout.floorCells.forEach((cell) => {
    const [x, y] = layout.toPixel(cell);
    const floor = scene.add.image(x, y, floorKey).setDisplaySize(layout.cellSize, layout.cellSize).setDepth(-5);
    floor.setTint(machine ? 0xaec4df : 0xd3c0c9);
  });

  const walls = scene.physics.add.staticGroup();
  const collisionWallKeys = new Set(layout.collisionWallCells.map((cell) => cell.join(",")));
  layout.wallCells.forEach((cell) => {
    const [x, y] = layout.toPixel(cell);
    const wallKey = getDungeonWallTexture(machine, cell[0], cell[1], 1, 1);
    if (collisionWallKeys.has(cell.join(","))) {
      const body = walls.create(x, y, wallKey).setVisible(false).setDisplaySize(layout.cellSize, layout.cellSize);
      body.refreshBody();
    }
    const visual = scene.add.image(x, y, wallKey).setDisplaySize(layout.cellSize, layout.cellSize).setDepth(-1);
    if (machine) visual.setTint(0x72758d);
  });

  const entryGeometry = getCorridorDoorGeometry(layout, corridor, true);
  const exitGeometry = getCorridorDoorGeometry(layout, corridor, false);
  const { side: entrySide, center: entryCenter, doorPoint: entryDoorPoint } = entryGeometry;
  const { side: exitSide, center: exitCenter, doorPoint: exitDoorPoint } = exitGeometry;
  const entryPortalPoint = offsetBySide(entryDoorPoint, entrySide, 14);
  const exitPortalPoint = offsetBySide(exitDoorPoint, exitSide, 14);
  const entryPortal = scene.add.sprite(entryPortalPoint[0], entryPortalPoint[1], "portal").setScale(0.5).setAlpha(0.75).setDepth(2);
  const exitPortal = scene.add.sprite(exitPortalPoint[0], exitPortalPoint[1], "portal").setScale(0.5).setAlpha(0.9).setDepth(2);
  playEnvironmentAnimation(entryPortal, "portal-idle");
  playEnvironmentAnimation(exitPortal, "portal-idle");
  entryPortal.setTint(machine ? 0x75b8d0 : 0xb593d8);
  exitPortal.setTint(machine ? 0x75b8d0 : 0xb593d8);

  const entryDoor = createSideDoor(scene, { x: entryDoorPoint[0], y: entryDoorPoint[1], side: entrySide, walls, machine, initiallyOpen: true });
  const exitDoor = createSideDoor(scene, { x: exitDoorPoint[0], y: exitDoorPoint[1], side: exitSide, walls, machine, initiallyOpen: true });
  const traps = corridor.trapCells.map((cell, index) => {
    const [x, y] = layout.toPixel(cell);
    const node = scene.add.sprite(x, y, "trap", 0).setScale(Math.max(1.7, layout.cellSize / 18)).setAlpha(0.28).setDepth(1);
    return { x, y, node, phaseOffset: index * 530, phase: "idle", active: false, damagedActors: new Set() };
  });
  const chest = corridor.chest ? (() => {
    const [x, y] = layout.toPixel(corridor.chest.cell);
    const node = scene.add.image(x, y, "reward-chest").setScale(Math.max(2.4, layout.cellSize / 13)).setDepth(3);
    return { x, y, node, reward: { ...corridor.chest.reward }, active: true };
  })() : null;
  const bottles = (corridor.bottles || []).map((plan) => {
    const [x, y] = layout.toPixel(plan.cell);
    return createBreakableBottle(scene, { ...plan, x, y }, Math.max(3.5, layout.cellSize / 12));
  });
  const ambush = corridor.ambush ? {
    trigger: layout.toPixel(corridor.ambush.triggerCell),
    spawnPoints: corridor.ambush.spawnCells.map(layout.toPixel),
    enemyIds: [...corridor.ambush.enemyIds],
    state: "pending",
  } : null;
  return {
    layout,
    walls,
    entryDoor,
    exitDoor,
    entryPortal,
    exitPortal,
    traps,
    chest,
    bottles,
    ambush,
    spawn: offsetBySide(entryCenter, entrySide, -layout.cellSize * 0.35),
    exitTrigger: offsetBySide(exitDoorPoint, exitSide, layout.cellSize * 0.48),
  };
}
