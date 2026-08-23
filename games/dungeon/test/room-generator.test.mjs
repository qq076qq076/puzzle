import test from "node:test";
import assert from "node:assert/strict";
import { MONSTERS } from "../src/data/monsters.js";
import {
  ENEMY_COUNTS,
  generateFloor,
  generateFloorMap,
  generateRoom,
  THREAT_BUDGETS,
  validateFloorMap,
  validateRoom,
  WAVE_COUNTS,
} from "../src/systems/room-generator.js";
import { ROOM_TEMPLATES } from "../src/data/rooms.js";

test("same run seed reproduces the complete six-room floor", () => {
  const first = generateFloor("fixed-seed");
  const second = generateFloor("fixed-seed");
  assert.deepEqual(first, second);
  assert.equal(first.length, 6);
  assert.deepEqual(first.slice(0, 5).map((room) => room.type), ["normal", "normal", "normal", "normal", "normal"]);
  assert.equal(first[5].type, "boss");
});

test("normal rooms contain enemies within their threat budget", () => {
  const floor = generateFloor("budget-seed");
  floor.slice(0, 5).forEach((room, index) => {
    const threat = room.enemies.reduce((total, enemy) => total + MONSTERS[enemy.id].threat, 0);
    assert.equal(room.enemies.length, ENEMY_COUNTS[index]);
    assert.ok(threat <= room.threatBudget);
    assert.ok(room.rewardIds.length >= 1);
    assert.ok(room.rewardIds.length <= 3);
  });
});

test("room generation varies with the seed", () => {
  const first = JSON.stringify(generateRoom("seed-a", 2));
  const second = JSON.stringify(generateRoom("seed-b", 2));
  assert.notEqual(first, second);
});

test("generated normal rooms satisfy the layout, wave, and template constraints", () => {
  assert.ok(ROOM_TEMPLATES.length >= 8);
  assert.deepEqual(ENEMY_COUNTS, [4, 5, 6, 8, 10]);
  assert.ok(ENEMY_COUNTS.every((count, index) => index === 0 || count > ENEMY_COUNTS[index - 1]));
  Array.from({ length: 25 }, (_, index) => `layout-${index}`).forEach((seed) => {
    const floor = generateFloor(seed);
    floor.slice(0, 5).forEach((room, index, rooms) => {
      assert.equal(room.validation.valid, true);
      assert.deepEqual(room.validation, validateRoom(room));
      assert.equal(room.enemies.length, ENEMY_COUNTS[index]);
      assert.equal(room.waves.length, WAVE_COUNTS[index]);
      assert.ok(room.enemies.reduce((sum, enemy) => sum + MONSTERS[enemy.id].threat, 0) <= THREAT_BUDGETS[index]);
      assert.ok(room.spawnPoints.every((point) => room.validation.safeSpawns && point.length === 2));
      if (index > 0) assert.notEqual(room.templateId, rooms[index - 1].templateId);
    });
    assert.equal(floor[5].rewardIds[0], "boss_trophy");
  });
});

test("a right-side exit connects to the next room's left-side entrance", () => {
  const floor = generateFloor("connected-doors");
  floor.forEach((room, index) => {
    assert.equal(room.entrySide, "left");
    assert.equal(room.exitSide, "right");
    assert.ok(room.entrySpawn[0] < room.entryDoor[0]);
    assert.ok(room.entryDoor[0] < room.entry[0]);
    assert.ok(room.exit[0] < room.exitDoor[0]);
    assert.ok(room.exitDoor[0] < room.exitTrigger[0]);
    if (index > 0) assert.notEqual(floor[index - 1].exitSide, room.entrySide);
  });
});

test("floor map contains six rooms connected by five deterministic corridors", () => {
  const first = generateFloorMap("corridor-layout");
  const second = generateFloorMap("corridor-layout");
  assert.deepEqual(first, second);
  assert.equal(first.rooms.length, 6);
  assert.equal(first.corridors.length, 5);
  assert.equal(first.validation.valid, true);
  assert.equal(first.validation.fallback, false);
  first.corridors.forEach((corridor, index) => {
    assert.equal(corridor.from, first.rooms[index].id);
    assert.equal(corridor.to, first.rooms[index + 1].id);
    assert.ok(corridor.width >= 2);
    assert.ok(corridor.cells.length >= 4);
    assert.ok(corridor.floorCells.length >= corridor.cells.length);
  });
});

test("floor map layout changes with seed while remaining valid", () => {
  const first = generateFloorMap("map-seed-a");
  const second = generateFloorMap("map-seed-b");
  assert.notDeepEqual(
    first.corridors.map(({ templateId, cells }) => ({ templateId, cells })),
    second.corridors.map(({ templateId, cells }) => ({ templateId, cells })),
  );
  assert.equal(validateFloorMap(first).valid, true);
  assert.equal(validateFloorMap(second).valid, true);
});

test("invalid layout candidates use the validated deterministic fallback", () => {
  const floor = generateFloorMap("forced-fallback", {
    maxAttempts: 3,
    candidateFactory: (runSeed) => ({ runSeed, floorIndex: 0, rooms: [], corridors: [] }),
  });
  assert.equal(floor.validation.valid, true);
  assert.equal(floor.validation.fallback, true);
  assert.equal(floor.validation.attempt, 3);
  assert.equal(floor.rooms.length, 6);
  assert.equal(floor.corridors.length, 5);
});
