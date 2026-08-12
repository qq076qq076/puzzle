import assert from "node:assert/strict";
import test from "node:test";
import { commitmentSource, determineOutcome, sha256Hex } from "./game-core.mjs";

const cases = [
  ["rock", "rock", "draw"],
  ["rock", "paper", "guest"],
  ["rock", "scissors", "host"],
  ["paper", "rock", "host"],
  ["paper", "paper", "draw"],
  ["paper", "scissors", "guest"],
  ["scissors", "rock", "guest"],
  ["scissors", "paper", "host"],
  ["scissors", "scissors", "draw"]
];

test("九種出拳組合都有正確結果", () => {
  for (const [hostChoice, guestChoice, expected] of cases) {
    assert.equal(determineOutcome(hostChoice, guestChoice, "host"), expected);
    assert.equal(determineOutcome(guestChoice, hostChoice, "guest"), expected);
  }
});

test("承諾值可重現，且任一欄位改變都會得到不同結果", async () => {
  const source = commitmentSource(1, "a".repeat(32), 1, "rock", "b".repeat(32));
  const original = await sha256Hex(source);
  assert.equal(original.length, 64);
  assert.equal(await sha256Hex(source), original);
  assert.notEqual(await sha256Hex(commitmentSource(1, "a".repeat(32), 2, "rock", "b".repeat(32))), original);
  assert.notEqual(await sha256Hex(commitmentSource(1, "a".repeat(32), 1, "paper", "b".repeat(32))), original);
  assert.notEqual(await sha256Hex(commitmentSource(1, "a".repeat(32), 1, "rock", "c".repeat(32))), original);
});

test("無效的拳種與角色會被拒絕", () => {
  assert.throws(() => determineOutcome("water", "rock", "host"), TypeError);
  assert.throws(() => determineOutcome("rock", "paper", "viewer"), TypeError);
});
