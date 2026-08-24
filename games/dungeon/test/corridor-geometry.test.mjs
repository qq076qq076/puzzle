import test from "node:test";
import assert from "node:assert/strict";
import { ROOM_SIDES } from "../src/data/rooms.js";
import {
  getCorridorDoorGeometry,
  getCorridorDoorway,
  getCorridorRenderFloorCells,
  isCorridorDoorToDoorWalkable,
} from "../src/systems/corridor-geometry.js";
import { generateFloorMap } from "../src/systems/room-generator.js";

test("every generated corridor has connected floor between both door apertures", () => {
  Array.from({ length: 80 }, (_, index) => generateFloorMap(`walkable-corridor-${index}`)).forEach((floor) => {
    assert.equal(floor.validation.checks.walkableCorridors, true);
    floor.corridors.forEach((corridor) => {
      assert.equal(isCorridorDoorToDoorWalkable(corridor), true);
      const floorKeys = new Set(getCorridorRenderFloorCells(corridor).map((cell) => cell.join(",")));
      [true, false].forEach((atStart) => {
        const doorway = getCorridorDoorway(corridor, atStart);
        assert.ok(ROOM_SIDES.includes(doorway.side));
        assert.ok(doorway.aperture.every((cell) => floorKeys.has(cell.join(","))));
        assert.ok(doorway.outside.every((cell) => !floorKeys.has(cell.join(","))));
      });
    });
  });
});

test("door geometry sits outside the aperture on all four sides", () => {
  const layout = { cellSize: 40, toPixel: ([x, y]) => [x * 40, y * 40] };
  const floorCells = [[0, 0], [1, 0], [0, 1], [1, 1], [2, 0], [2, 1]];
  ROOM_SIDES.forEach((side) => {
    const corridor = { start: [0, 0], end: [2, 0], entrySide: side, exitSide: side, floorCells };
    [true, false].forEach((atStart) => {
      const geometry = getCorridorDoorGeometry(layout, corridor, atStart);
      const doorway = getCorridorDoorway(corridor, atStart);
      const apertureCenter = doorway.aperture
        .map(layout.toPixel)
        .reduce((sum, point) => [sum[0] + point[0] / 2, sum[1] + point[1] / 2], [0, 0]);
      assert.deepEqual(geometry.center, apertureCenter);
      assert.equal(Math.hypot(
        geometry.doorPoint[0] - geometry.center[0],
        geometry.doorPoint[1] - geometry.center[1],
      ), 20);
    });
  });
});
