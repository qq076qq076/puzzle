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
import {
  DEFAULT_DECORATION_PROFILE,
  PROP_DEFINITIONS,
  ROOM_BACKGROUND_TEXTURES,
  ROOM_DECORATION_PROFILES,
  ROOM_DECORATION_TEXTURES,
  ROOM_FIRE_PAIRS,
} from "../src/data/room-decorations.js";
import { ROOM_BOUNDS, ROOM_SIDES, ROOM_TEMPLATES, getOppositeSide, getSideVector } from "../src/data/rooms.js";
import { pointWalkable } from "../src/systems/room-validation.js";

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
      const { fallback: _fallback, ...validation } = room.validation;
      assert.deepEqual(validation, validateRoom(room));
      assert.equal(room.enemies.length, ENEMY_COUNTS[index]);
      assert.equal(room.waves.length, WAVE_COUNTS[index]);
      assert.ok(room.enemies.reduce((sum, enemy) => sum + MONSTERS[enemy.id].threat, 0) <= THREAT_BUDGETS[index]);
      assert.ok(room.spawnPoints.every((point) => room.validation.safeSpawns && point.length === 2));
      if (index > 0) assert.notEqual(room.templateId, rooms[index - 1].templateId);
    });
    assert.equal(floor[5].rewardIds[0], "boss_trophy");
  });
});

test("rooms use paired entrances and exits across all four sides", () => {
  const observedSides = new Set();
  Array.from({ length: 30 }, (_, index) => generateFloor(`connected-doors-${index}`)).forEach((floor) => {
    floor.forEach((room, index) => {
      observedSides.add(room.entrySide);
      observedSides.add(room.exitSide);
      assert.notEqual(room.entrySide, room.exitSide);
      const [entryDx, entryDy] = getSideVector(room.entrySide);
      const [exitDx, exitDy] = getSideVector(room.exitSide);
      assert.ok((room.entrySpawn[0] - room.entryDoor[0]) * entryDx + (room.entrySpawn[1] - room.entryDoor[1]) * entryDy > 0);
      assert.ok((room.entry[0] - room.entryDoor[0]) * entryDx + (room.entry[1] - room.entryDoor[1]) * entryDy < 0);
      assert.ok((room.exitTrigger[0] - room.exitDoor[0]) * exitDx + (room.exitTrigger[1] - room.exitDoor[1]) * exitDy > 0);
      if (index > 0) assert.equal(room.entrySide, getOppositeSide(floor[index - 1].exitSide));
    });
  });
  assert.deepEqual([...observedSides].sort(), [...ROOM_SIDES].sort());
});

test("room templates provide multiple physical silhouettes", () => {
  assert.ok(new Set(ROOM_TEMPLATES.map((template) => template.shape)).size >= 6);
  assert.ok(ROOM_TEMPLATES.some((template) => template.boundaryObstacles?.length >= 4));
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
    assert.ok(corridor.cells.length >= 9);
    assert.ok(corridor.floorCells.length >= corridor.cells.length);
    assert.equal(corridor.branches.length, 1);
    assert.ok(corridor.trapCells.length >= 2);
  });
});

test("corridors contain deterministic branches, traps, and optional chests", () => {
  const maps = Array.from({ length: 20 }, (_, index) => generateFloorMap(`events-${index}`));
  const corridors = maps.flatMap((map) => map.corridors);
  assert.ok(corridors.every((corridor) => corridor.branches[0].templateId === "loop"));
  assert.ok(corridors.every((corridor) => corridor.trapCells.length >= 2));
  assert.ok(corridors.some((corridor) => corridor.chest));
  assert.ok(corridors.some((corridor) => !corridor.chest));
  assert.ok(corridors.some((corridor) => corridor.bottles.length > 0));
  assert.ok(corridors.some((corridor) => corridor.bottles.length === 0));
  assert.ok(corridors.some((corridor) => corridor.ambush));
  assert.ok(corridors.some((corridor) => !corridor.ambush));
  corridors.filter((corridor) => corridor.ambush).forEach((corridor) => {
    assert.equal(corridor.ambush.spawnCells.length, corridor.ambush.enemyIds.length);
    assert.ok(corridor.ambush.spawnCells.length >= 2);
    assert.ok(corridor.ambush.enemyIds.every((enemyId) => MONSTERS[enemyId]));
  });
  assert.deepEqual(generateFloorMap("event-repeat"), generateFloorMap("event-repeat"));
});

test("normal rooms sometimes contain breakable bottles with deterministic drops", () => {
  const floors = Array.from({ length: 24 }, (_, index) => generateFloor(`bottles-${index}`));
  const rooms = floors.flatMap((floor) => floor.slice(0, 5));
  assert.ok(rooms.some((room) => room.bottles.length > 0));
  assert.ok(rooms.some((room) => room.bottles.length === 0));
  const bottles = rooms.flatMap((room) => room.bottles);
  assert.ok(bottles.every((bottle) => /^bottle-[1-4]$/.test(bottle.texture)));
  assert.ok(bottles.some((bottle) => bottle.drop));
  assert.deepEqual(generateFloor("bottle-repeat"), generateFloor("bottle-repeat"));
});

test("fantasy rooms receive deterministic supplied dungeon decorations", () => {
  const floors = Array.from({ length: 20 }, (_, index) => generateFloor(`decorations-${index}`));
  const fantasyRooms = floors.flatMap((floor) => floor.slice(0, 5)).filter((room) => room.theme === "fantasy");
  assert.ok(fantasyRooms.length > 0);
  assert.ok(fantasyRooms.every((room) => room.decorations.length >= 2));
  assert.ok(fantasyRooms.flatMap((room) => room.decorations).every((decoration) =>
    [...ROOM_DECORATION_TEXTURES, ...ROOM_BACKGROUND_TEXTURES].includes(decoration.texture)));
  assert.deepEqual(generateFloor("decor-repeat"), generateFloor("decor-repeat"));
});

test("fantasy room dressing follows its room purpose and keeps navigation landmarks clear", () => {
  const rooms = Array.from({ length: 30 }, (_, index) => generateFloor(`dressing-${index}`))
    .flatMap((floor) => floor.slice(0, 5))
    .filter((room) => room.theme === "fantasy");
  const fireSideByPoint = new Map(Object.entries(ROOM_FIRE_PAIRS)
    .flatMap(([side, points]) => points.map(([x, y]) => [`${x},${y}`, side])));

  rooms.forEach((room) => {
    const profile = ROOM_DECORATION_PROFILES[room.templateId] || DEFAULT_DECORATION_PROFILE;
    const allowedByPlacement = {
      obstacle: new Set(profile.obstacleProps.map((key) => PROP_DEFINITIONS[key].texture)),
      floor: new Set(profile.floorProps.map((key) => PROP_DEFINITIONS[key].texture)),
    };
    room.decorations.filter(({ kind }) => kind === "prop").forEach((decoration) => {
      assert.ok(allowedByPlacement[decoration.placement].has(decoration.texture));
      assert.notEqual(decoration.placement, "wall");
      if (decoration.placement === "floor") {
        assert.equal(pointWalkable(decoration.x, decoration.y, room.obstacles, 44), true);
      } else {
        const [x, y, width, height] = decoration.obstacleRect;
        assert.ok(x >= ROOM_BOUNDS.left + 32 && x + width <= ROOM_BOUNDS.right - 32);
        assert.ok(y >= ROOM_BOUNDS.top + 32 && y + height <= ROOM_BOUNDS.bottom - 32);
      }
    });
    assert.equal(new Set(room.decorations.map(({ id }) => id)).size, room.decorations.length);
    room.decorations.filter(({ kind }) => kind === "floor-patch").forEach(({ x, y }) => {
      assert.ok((x - 112) % 32 === 0);
      assert.ok((y - 144) % 32 === 0);
      assert.ok(Math.hypot(x - room.entry[0], y - room.entry[1]) >= 54);
      assert.ok(Math.hypot(x - room.exit[0], y - room.exit[1]) >= 54);
    });
    assert.equal(room.firePoints.length, profile.firePairCount * 2);
    room.firePoints.forEach(([x, y]) => {
      const side = fireSideByPoint.get(`${x},${y}`);
      assert.ok(side);
      assert.notEqual(side, room.entrySide);
      assert.notEqual(side, room.exitSide);
      room.spawnPoints.forEach((spawn) => assert.ok(Math.hypot(x - spawn[0], y - spawn[1]) >= 80));
    });
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
