import assert from "node:assert/strict";
import test from "node:test";

import { ROOM_CLEAR_REWARD_DELAY_MS, tickRoomClearDelay } from "../src/systems/room-clear-delay.js";

test("room reward waits for a complete two seconds", () => {
  assert.equal(ROOM_CLEAR_REWARD_DELAY_MS, 2000);
  const almostReady = tickRoomClearDelay(ROOM_CLEAR_REWARD_DELAY_MS, 1999);
  assert.deepEqual(almostReady, { remaining: 1, ready: false });
  assert.deepEqual(tickRoomClearDelay(almostReady.remaining, 1), { remaining: 0, ready: true });
});

test("room clear countdown ignores negative time and clamps at zero", () => {
  assert.deepEqual(tickRoomClearDelay(1000, -50), { remaining: 1000, ready: false });
  assert.deepEqual(tickRoomClearDelay(1000, 1500), { remaining: 0, ready: true });
});
