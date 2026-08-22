import { GAME_HEIGHT, GAME_WIDTH } from "../config.js";
import { playEnvironmentAnimation } from "../systems/actor-animations.js";
import { createSideDoor } from "../systems/door-system.js";

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
  for (const yOffset of [0, 1]) {
    walls.delete(`${corridor.start[0] - 1},${corridor.start[1] + yOffset}`);
    walls.delete(`${corridor.end[0] + 1},${corridor.end[1] + yOffset}`);
  }
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
  const entryX = entryCenterX - layout.cellSize / 2;
  const exitX = exitCenterX + layout.cellSize / 2;
  const entryPortal = scene.add.sprite(entryX - 14, entryCenterY, "portal").setScale(0.5).setAlpha(0.75).setDepth(2);
  const exitPortal = scene.add.sprite(exitX + 14, exitCenterY, "portal").setScale(0.5).setAlpha(0.9).setDepth(2);
  playEnvironmentAnimation(entryPortal, "portal-idle");
  playEnvironmentAnimation(exitPortal, "portal-idle");
  entryPortal.setTint(machine ? 0x75b8d0 : 0xb593d8);
  exitPortal.setTint(machine ? 0x75b8d0 : 0xb593d8);

  const entryDoor = createSideDoor(scene, { x: entryX, y: entryCenterY, side: "left", walls, machine, initiallyOpen: true });
  const exitDoor = createSideDoor(scene, { x: exitX, y: exitCenterY, side: "right", walls, machine, initiallyOpen: true });
  return {
    layout,
    walls,
    entryDoor,
    exitDoor,
    entryPortal,
    exitPortal,
    spawn: [entryCenterX + layout.cellSize * 0.5, entryCenterY],
    exitTrigger: [exitCenterX + layout.cellSize * 0.82, exitCenterY],
  };
}
