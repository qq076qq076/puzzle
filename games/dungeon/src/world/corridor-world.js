import { GAME_HEIGHT, GAME_WIDTH } from "../config.js";
import { playEnvironmentAnimation } from "../systems/actor-animations.js";
import { createSideDoor } from "../systems/door-system.js";
import { getSideVector } from "../data/rooms.js";

function uniqueCells(cells) {
  return [...new Map(cells.map((cell) => [cell.join(","), cell])).values()];
}

function getWallCells(floorCells, corridor) {
  const floorKeys = new Set(floorCells.map((cell) => cell.join(",")));
  const walls = new Map();
  floorCells.forEach(([x, y]) => {
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        if (dx === 0 && dy === 0) continue;
        const key = `${x + dx},${y + dy}`;
        if (!floorKeys.has(key)) walls.set(key, [x + dx, y + dy]);
      }
    }
  });
  const removeOpening = (cell, side, atStart) => {
    const [dx, dy] = getSideVector(side);
    const aperture = side === "left" || side === "right"
      ? [[cell[0], cell[1]], [cell[0], cell[1] + 1]]
      : [[cell[0], cell[1]], [cell[0] + (atStart ? 1 : -1), cell[1]]];
    aperture.forEach(([x, y]) => walls.delete(`${x + dx},${y + dy}`));
  };
  removeOpening(corridor.start, corridor.entrySide || "left", true);
  removeOpening(corridor.end, corridor.exitSide || "right", false);
  return [...walls.values()];
}

function createLayout(corridor) {
  const floorCells = uniqueCells(corridor.floorCells);
  const xs = floorCells.map(([x]) => x);
  const ys = floorCells.map(([, y]) => y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const columns = maxX - minX + 1;
  const rows = maxY - minY + 1;
  const cellSize = Math.max(34, Math.min(56, Math.floor(670 / (columns + 2)), Math.floor(310 / (rows + 2))));
  const offsetX = GAME_WIDTH / 2 - ((minX + maxX) / 2) * cellSize;
  const offsetY = 310 - ((minY + maxY) / 2) * cellSize;
  const toPixel = ([x, y]) => [x * cellSize + offsetX, y * cellSize + offsetY];
  return { floorCells, wallCells: getWallCells(floorCells, corridor), cellSize, toPixel };
}

function endpointCenter(layout, cell) {
  const [x, y] = layout.toPixel(cell);
  return [x, y + layout.cellSize / 2];
}

function offsetBySide(point, side, distance) {
  const [dx, dy] = getSideVector(side);
  return [point[0] + dx * distance, point[1] + dy * distance];
}

export function buildCorridorWorld(scene, corridor) {
  const layout = createLayout(corridor);
  const machine = corridor.theme === "machine";
  const floorKey = machine ? "room-floor-machine" : "room-floor-fantasy";
  const wallKey = machine ? "wall-machine" : "wall-fantasy";
  scene.cameras.main.setBackgroundColor(machine ? "#080d16" : "#090b13");

  layout.floorCells.forEach((cell) => {
    const [x, y] = layout.toPixel(cell);
    const floor = scene.add.image(x, y, floorKey).setDisplaySize(layout.cellSize, layout.cellSize).setDepth(-5);
    floor.setTint(machine ? 0xaec4df : 0xd3c0c9);
  });

  const walls = scene.physics.add.staticGroup();
  layout.wallCells.forEach((cell) => {
    const [x, y] = layout.toPixel(cell);
    const body = walls.create(x, y, wallKey).setVisible(false).setDisplaySize(layout.cellSize, layout.cellSize);
    body.refreshBody();
    const visual = scene.add.image(x, y, wallKey).setDisplaySize(layout.cellSize, layout.cellSize).setDepth(-1);
    if (machine) visual.setTint(0x72758d);
  });

  const [entryCenterX, entryCenterY] = endpointCenter(layout, corridor.start);
  const [exitCenterX, exitCenterY] = endpointCenter(layout, corridor.end);
  const entrySide = corridor.entrySide || "left";
  const exitSide = corridor.exitSide || "right";
  const entryDoorPoint = offsetBySide([entryCenterX, entryCenterY], entrySide, layout.cellSize / 2);
  const exitDoorPoint = offsetBySide([exitCenterX, exitCenterY], exitSide, layout.cellSize / 2);
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
    return { x, y, node, phaseOffset: index * 530, phase: "idle", damaged: false };
  });
  const chest = corridor.chest ? (() => {
    const [x, y] = layout.toPixel(corridor.chest.cell);
    const node = scene.add.image(x, y, "reward-chest").setScale(Math.max(2.4, layout.cellSize / 13)).setDepth(3);
    return { x, y, node, reward: { ...corridor.chest.reward }, active: true };
  })() : null;
  return {
    layout,
    walls,
    entryDoor,
    exitDoor,
    entryPortal,
    exitPortal,
    traps,
    chest,
    spawn: offsetBySide([entryCenterX, entryCenterY], entrySide, -layout.cellSize * 0.5),
    exitTrigger: offsetBySide([exitCenterX, exitCenterY], exitSide, layout.cellSize * 0.82),
  };
}
