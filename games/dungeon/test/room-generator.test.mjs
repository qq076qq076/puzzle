import test from "node:test";
import assert from "node:assert/strict";
import { MONSTERS } from "../src/data/monsters.js";
import { generateFloor, generateRoom, THREAT_BUDGETS, WAVE_COUNTS, validateRoom } from "../src/systems/room-generator.js";
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
  floor.slice(0, 5).forEach((room) => {
    const threat = room.enemies.reduce((total, enemy) => total + MONSTERS[enemy.id].threat, 0);
    assert.ok(room.enemies.length >= 1);
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
  ["layout-a", "layout-b", "layout-c"].forEach((seed) => {
    const floor = generateFloor(seed);
    floor.slice(0, 5).forEach((room, index, rooms) => {
      assert.equal(room.validation.valid, true);
      assert.deepEqual(room.validation, validateRoom(room));
      assert.equal(room.waves.length, WAVE_COUNTS[index]);
      assert.ok(room.enemies.reduce((sum, enemy) => sum + MONSTERS[enemy.id].threat, 0) <= THREAT_BUDGETS[index]);
      assert.ok(room.spawnPoints.every((point) => room.validation.safeSpawns && point.length === 2));
      if (index > 0) assert.notEqual(room.templateId, rooms[index - 1].templateId);
    });
    assert.equal(floor[5].rewardIds[0], "boss_trophy");
  });
});
