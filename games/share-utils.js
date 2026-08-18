(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.PuzzleShare = api;
}(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const SHARE_ID_PATTERN = /^[A-Za-z0-9_-]{20,64}$/;

  function isValidShareId(value) {
    return typeof value === "string" && SHARE_ID_PATTERN.test(value);
  }

  function parseShareId(hash) {
    const source = typeof hash === "string"
      ? hash
      : (typeof location !== "undefined" ? location.hash : "");
    const params = new URLSearchParams(source.replace(/^#/, ""));
    const shareId = params.get("share") || "";
    return isValidShareId(shareId) ? shareId : null;
  }

  function buildShareUrl(shareId, locationLike) {
    if (!isValidShareId(shareId)) throw new Error("無效的分享代碼。");
    const source = locationLike || (typeof location !== "undefined" ? location : null);
    if (!source?.href) throw new Error("無法建立分享網址。");
    const url = new URL(source.href);
    url.hash = new URLSearchParams({ share: shareId }).toString();
    return url.toString();
  }

  function normalizeShareRecord(value, expectedGameId, validateData) {
    if (!value || value.version !== 1 || value.gameId !== expectedGameId || !value.data) return null;
    if (typeof validateData === "function" && !validateData(value.data)) return null;
    const data = typeof structuredClone === "function"
      ? structuredClone(value.data)
      : JSON.parse(JSON.stringify(value.data));
    return {
      version: 1,
      gameId: value.gameId,
      data,
      createdAt: Number(value.createdAt) || 0,
      updatedAt: Number(value.updatedAt) || 0
    };
  }

  return { isValidShareId, parseShareId, buildShareUrl, normalizeShareRecord };
}));
