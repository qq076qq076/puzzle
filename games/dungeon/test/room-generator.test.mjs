import test from "node:test";
import assert from "node:assert/strict";
import { MONSTERS } from "../src/data/monsters.js";
import { generateFloor, generateRoom } from "../src/systems/room-generator.js";

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
