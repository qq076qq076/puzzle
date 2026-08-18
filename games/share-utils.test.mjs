import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const { isValidShareId, parseShareId, buildShareUrl, normalizeShareRecord } = require("./share-utils.js");

const shareId = "Abcdefghijklmnop_1234567";

test("只接受不可猜測長度的分享代碼", () => {
  assert.equal(isValidShareId(shareId), true);
  assert.equal(isValidShareId("too-short"), false);
  assert.equal(isValidShareId("invalid.share.identifier"), false);
});

test("從 hash 讀取分享代碼，格式錯誤時拒絕", () => {
  assert.equal(parseShareId(`#share=${shareId}`), shareId);
  assert.equal(parseShareId("#share=bad"), null);
  assert.equal(parseShareId("#other=value"), null);
});

test("分享網址保留路徑與查詢，只替換 hash", () => {
  const url = buildShareUrl(shareId, { href: "https://example.com/games/harvest-clicker/?from=menu#old" });
  assert.equal(url, `https://example.com/games/harvest-clicker/?from=menu#share=${shareId}`);
});

test("帳號公開農場須符合遊戲、保留來源版本並回傳獨立資料", () => {
  const source = {
    version: 1,
    gameId: "harvest-clicker",
    data: { gold: 99, cells: [] },
    sourceRevision: 7,
    createdAt: 100,
    updatedAt: 200
  };
  const record = normalizeShareRecord(source, "harvest-clicker", (data) => data.gold === 99);
  assert.deepEqual(record, source);
  record.data.gold = 0;
  assert.equal(source.data.gold, 99);
  assert.equal(normalizeShareRecord(source, "another-game"), null);
  assert.equal(normalizeShareRecord(source, "harvest-clicker", () => false), null);
});
