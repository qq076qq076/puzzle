import qrcode from "./vendor/qrcode.mjs";
import QrScanner from "./vendor/qr-scanner.min.js";
import { CHOICES, commitmentSource, determineOutcome, sha256Hex } from "./game-core.mjs";

const APP_ID = "rock-paper-scissors";
const PROTOCOL_VERSION = 1;
const PACKET_PREFIX_JSON = "RPS1.J.";
const PACKET_PREFIX_GZIP = "RPS1.G.";
const MAX_PAIRING_PAYLOAD = 120000;
const MAX_MESSAGE_SIZE = 16384;
const PAIRING_MAX_AGE_MS = 20 * 60 * 1000;
const FUTURE_CLOCK_SKEW_MS = 2 * 60 * 1000;
const DEFAULT_ICE_SERVERS = [
  { urls: "stun:stun.cloudflare.com:3478" },
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
  { urls: "stun:stun.nextcloud.com:3478" },
  { urls: "stun:openrelay.metered.ca:80" },
  // Open Relay is used only as a TURN fallback when direct P2P cannot pass NAT.
  { urls: "turn:openrelay.metered.ca:80", username: "openrelayproject", credential: "openrelayproject" },
  { urls: "turn:openrelay.metered.ca:443", username: "openrelayproject", credential: "openrelayproject" },
  { urls: "turn:openrelay.metered.ca:443?transport=tcp", username: "openrelayproject", credential: "openrelayproject" },
  // Public demo relay used by WebRTC examples; keep it as a last-resort path.
  { urls: "turn:turn.anyfirewall.com:443?transport=tcp", username: "webrtc", credential: "webrtc" }
];
const ICE_SERVERS = Array.isArray(window.RPS_ICE_SERVERS) && window.RPS_ICE_SERVERS.length > 0
  ? window.RPS_ICE_SERVERS
  : DEFAULT_ICE_SERVERS;
const ALLOWED_MESSAGES = new Set(["hello", "commit", "reveal", "round-result", "next-round", "leave", "ping", "pong", "error"]);

const elements = {
  pairingView: document.getElementById("pairing-view"),
  gameView: document.getElementById("game-view"),
  connectionPill: document.getElementById("connection-pill"),
  connectionLabel: document.getElementById("connection-label"),
  playerName: document.getElementById("player-name"),
  hostTab: document.getElementById("host-tab"),
  guestTab: document.getElementById("guest-tab"),
  hostPanel: document.getElementById("host-panel"),
  guestPanel: document.getElementById("guest-panel"),
  createOffer: document.getElementById("create-offer"),
  hostOfferBlock: document.getElementById("host-offer-block"),
  hostOfferQr: document.getElementById("host-offer-qr"),
  hostInviteUrl: document.getElementById("host-invite-url"),
  hostAnswerInput: document.getElementById("host-answer-input"),
  importAnswer: document.getElementById("import-answer"),
  scanAnswer: document.getElementById("scan-answer"),
  guestOfferInput: document.getElementById("guest-offer-input"),
  importOffer: document.getElementById("import-offer"),
  scanOffer: document.getElementById("scan-offer"),
  guestAnswerBlock: document.getElementById("guest-answer-block"),
  guestAnswerQr: document.getElementById("guest-answer-qr"),
  guestAnswerOutput: document.getElementById("guest-answer-output"),
  pairingStatus: document.getElementById("pairing-status"),
  cancelPairing: document.getElementById("cancel-pairing"),
  roundNumber: document.getElementById("round-number"),
  peerName: document.getElementById("peer-name"),
  gameStatus: document.getElementById("game-status"),
  choiceGrid: document.getElementById("choice-grid"),
  choiceButtons: Array.from(document.querySelectorAll(".choice-button")),
  confirmChoice: document.getElementById("confirm-choice"),
  resultPanel: document.getElementById("result-panel"),
  resultTitle: document.getElementById("result-title"),
  localResultIcon: document.getElementById("local-result-icon"),
  localResultName: document.getElementById("local-result-name"),
  remoteResultIcon: document.getElementById("remote-result-icon"),
  remoteResultName: document.getElementById("remote-result-name"),
  resultPeerLabel: document.getElementById("result-peer-label"),
  resultMessage: document.getElementById("result-message"),
  nextRound: document.getElementById("next-round"),
  leaveGame: document.getElementById("leave-game"),
  nextStatus: document.getElementById("next-status"),
  scannerDialog: document.getElementById("scanner-dialog"),
  scannerVideo: document.getElementById("scanner-video"),
  scannerStatus: document.getElementById("scanner-status"),
  closeScanner: document.getElementById("close-scanner"),
  toast: document.getElementById("toast")
};

let pairingMode = "host";
let role = null;
let sessionId = null;
let peerConnection = null;
let dataChannel = null;
let scanner = null;
let scannerTarget = null;
let peerName = "對手";
let helloReceived = false;
let round = null;
let processedMessageIds = new Set();
let disconnectTimer = null;
let toastTimer = null;
let intentionalClose = false;
let answerImportPromise = null;

function randomHex(byteLength = 16) {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
}

function bytesToBase64Url(bytes) {
  let binary = "";
  for (let index = 0; index < bytes.length; index += 1) binary += String.fromCharCode(bytes[index]);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
}

function base64UrlToBytes(value) {
  const padded = value.replaceAll("-", "+").replaceAll("_", "/") + "===".slice((value.length + 3) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function compress(bytes) {
  if (!("CompressionStream" in window)) return null;
  const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream("gzip"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function decompress(bytes) {
  if (!("DecompressionStream" in window)) throw new Error("此瀏覽器無法解開壓縮配對資料，請更新瀏覽器。");
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function encodePacket(packet) {
  const source = new TextEncoder().encode(JSON.stringify(packet));
  const compressed = await compress(source);
  if (compressed && compressed.length < source.length) return PACKET_PREFIX_GZIP + bytesToBase64Url(compressed);
  return PACKET_PREFIX_JSON + bytesToBase64Url(source);
}

async function decodePacket(encoded) {
  const value = extractInviteCode(encoded);
  if (!value || value.length > MAX_PAIRING_PAYLOAD) throw new Error("配對資料為空或過長。");
  let bytes;
  if (value.startsWith(PACKET_PREFIX_GZIP)) {
    bytes = await decompress(base64UrlToBytes(value.slice(PACKET_PREFIX_GZIP.length)));
  } else if (value.startsWith(PACKET_PREFIX_JSON)) {
    bytes = base64UrlToBytes(value.slice(PACKET_PREFIX_JSON.length));
  } else {
    throw new Error("這不是有效的剪刀石頭布配對資料。");
  }
  if (bytes.length > MAX_PAIRING_PAYLOAD) throw new Error("配對資料超過允許大小。");
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new Error("配對資料無法解析。");
  }
}

function extractInviteCode(value) {
  const input = String(value || "").trim();
  if (!input) return "";
  if (!/^https?:\/\//iu.test(input)) return input;
  try {
    const url = new URL(input);
    const invite = url.searchParams.get("invite") || new URLSearchParams(url.hash.slice(1)).get("invite");
    if (!invite) throw new Error("邀請網址缺少邀請碼。");
    return invite;
  } catch (error) {
    throw error instanceof Error ? error : new Error("邀請網址無效。");
  }
}

function createInviteUrl(encodedOffer) {
  const url = new URL(window.location.href);
  url.search = "";
  url.hash = `invite=${encodedOffer}`;
  return url.toString();
}

function validatePairingPacket(packet, expectedKind) {
  const validKinds = new Set(["offer", "answer"]);
  if (!packet || typeof packet !== "object" || Array.isArray(packet)) throw new Error("配對封包格式錯誤。");
  if (packet.app !== APP_ID || packet.protocolVersion !== PROTOCOL_VERSION) throw new Error("遊戲或協定版本不相容。");
  if (!validKinds.has(packet.kind) || packet.kind !== expectedKind) throw new Error(`預期 ${expectedKind}，但收到了其他資料。`);
  if (typeof packet.sessionId !== "string" || !/^[a-f0-9]{32}$/u.test(packet.sessionId)) throw new Error("連線識別碼錯誤。");
  if (!packet.description || packet.description.type !== expectedKind || typeof packet.description.sdp !== "string" || packet.description.sdp.length > 100000) throw new Error("WebRTC 連線內容錯誤。");
  const age = Date.now() - Number(packet.createdAt);
  if (!Number.isFinite(age) || age > PAIRING_MAX_AGE_MS || age < -FUTURE_CLOCK_SKEW_MS) throw new Error("配對資料已過期，請重新建立。");
  return packet;
}

function playerDisplayName() {
  return elements.playerName.value.trim().slice(0, 20) || "玩家";
}

function setConnectionState(state, label) {
  elements.connectionPill.dataset.state = state;
  elements.connectionLabel.textContent = label;
}

function setPairingStatus(message, kind = "normal") {
  elements.pairingStatus.textContent = message;
  elements.pairingStatus.className = `pairing-status${kind === "normal" ? "" : ` is-${kind}`}`;
}

function setBusy(button, busy, busyLabel) {
  if (busy) {
    button.dataset.originalLabel = button.textContent;
    button.textContent = busyLabel;
    button.disabled = true;
  } else {
    button.textContent = button.dataset.originalLabel || button.textContent;
    button.disabled = false;
  }
}

function showToast(message) {
  clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.hidden = false;
  toastTimer = setTimeout(() => { elements.toast.hidden = true; }, 2600);
}

function renderQr(target, value) {
  target.replaceChildren();
  try {
    const code = qrcode(0, "L");
    code.addData(value, "Byte");
    code.make();
    const image = new Image();
    image.alt = "配對 QR Code";
    image.src = code.createDataURL(5, 10);
    target.appendChild(image);
  } catch {
    const note = document.createElement("p");
    note.className = "qr-unavailable";
    note.textContent = "這次的連線資料超過單一 QR Code 容量，請使用下方的複製功能。";
    target.appendChild(note);
  }
}

function waitForIceGathering(connection, timeoutMs = 12000) {
  if (connection.iceGatheringState === "complete") return Promise.resolve();
  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      connection.removeEventListener("icegatheringstatechange", checkState);
      resolve();
    };
    const checkState = () => { if (connection.iceGatheringState === "complete") finish(); };
    const timer = setTimeout(finish, timeoutMs);
    connection.addEventListener("icegatheringstatechange", checkState);
  });
}

function makePeerConnection() {
  intentionalClose = false;
  const connection = new RTCPeerConnection({
    iceServers: ICE_SERVERS,
    iceCandidatePoolSize: 4
  });
  connection.addEventListener("connectionstatechange", handleConnectionState);
  connection.addEventListener("iceconnectionstatechange", handleIceConnectionState);
  connection.addEventListener("icecandidateerror", () => {
    if (!helloReceived) setPairingStatus("正在嘗試其他連線路徑…");
  });
  connection.addEventListener("datachannel", (event) => attachDataChannel(event.channel));
  peerConnection = connection;
  return connection;
}

function attachDataChannel(channel) {
  if (dataChannel && dataChannel !== channel) dataChannel.close();
  dataChannel = channel;
  channel.addEventListener("open", handleChannelOpen);
  channel.addEventListener("message", handleChannelMessage);
  channel.addEventListener("close", () => {
    if (!intentionalClose) endSession("與對手的連線已關閉。");
  });
  channel.addEventListener("error", () => {
    if (!intentionalClose) endSession("遊戲資料通道發生錯誤。");
  });
}

function handleConnectionState() {
  if (!peerConnection) return;
  const state = peerConnection.connectionState;
  if (state === "connecting" || state === "new") setConnectionState("connecting", "正在連線");
  if (state === "connected") {
    clearTimeout(disconnectTimer);
    setConnectionState("online", "P2P 已連線");
  }
  if (state === "disconnected") {
    setConnectionState("connecting", "連線中斷");
    clearTimeout(disconnectTimer);
    disconnectTimer = setTimeout(() => endSession("對手已斷線。"), 6000);
  }
  if (state === "failed" && !intentionalClose) {
    setConnectionState("connecting", "正在重試連線");
    setPairingStatus(helloReceived ? "連線路徑失敗，正在嘗試恢復…" : "對方尚未完成配對，請繼續交換資料。");
    clearTimeout(disconnectTimer);
    disconnectTimer = setTimeout(() => endSession("無法建立 P2P 連線。若兩端不在同一網路，請確認有效的 TURN 設定後再試。"), helloReceived ? 12000 : 30000);
  }
  if (state === "closed" && !intentionalClose && helloReceived) endSession("與對手的連線已關閉。");
}

function handleIceConnectionState() {
  if (!peerConnection || intentionalClose) return;
  const state = peerConnection.iceConnectionState;
  if (state === "checking") setConnectionState("connecting", "正在尋找路徑");
  if (state === "connected" || state === "completed") {
    clearTimeout(disconnectTimer);
    setConnectionState("online", "P2P 已連線");
  }
}

function handleChannelOpen() {
  setConnectionState("online", "P2P 已連線");
  setPairingStatus("已建立安全連線，正在確認對手版本…", "success");
  sendMessage("hello", { name: playerDisplayName(), role });
}

function sendMessage(type, payload, messageRound = round?.number || 0) {
  if (!dataChannel || dataChannel.readyState !== "open") throw new Error("遊戲連線尚未就緒。");
  const message = {
    version: PROTOCOL_VERSION,
    type,
    sessionId,
    round: messageRound,
    messageId: randomHex(12),
    payload
  };
  const serialized = JSON.stringify(message);
  if (serialized.length > MAX_MESSAGE_SIZE) throw new Error("遊戲訊息超過允許大小。");
  dataChannel.send(serialized);
}

function parseMessage(raw) {
  if (typeof raw !== "string" || raw.length > MAX_MESSAGE_SIZE) throw new Error("收到不合法的遊戲訊息。");
  const message = JSON.parse(raw);
  if (!message || typeof message !== "object" || Array.isArray(message)) throw new Error("訊息格式錯誤。");
  if (message.version !== PROTOCOL_VERSION || message.sessionId !== sessionId) throw new Error("對手的遊戲版本或連線識別碼不一致。");
  if (!ALLOWED_MESSAGES.has(message.type)) throw new Error("收到不支援的訊息類型。");
  if (typeof message.messageId !== "string" || !/^[a-f0-9]{24}$/u.test(message.messageId)) throw new Error("訊息識別碼錯誤。");
  if (!Number.isInteger(message.round) || message.round < 0) throw new Error("回合編號錯誤。");
  if (!message.payload || typeof message.payload !== "object" || Array.isArray(message.payload)) throw new Error("訊息內容錯誤。");
  return message;
}

async function handleChannelMessage(event) {
  try {
    const message = parseMessage(event.data);
    if (processedMessageIds.has(message.messageId)) return;
    processedMessageIds.add(message.messageId);
    if (processedMessageIds.size > 500) processedMessageIds = new Set(Array.from(processedMessageIds).slice(-250));

    if (message.type === "hello") return handleHello(message);
    if (message.type === "leave") return handleRemoteLeave();
    if (message.type === "ping") return sendMessage("pong", {}, message.round);
    if (message.type === "pong") return;
    if (!round || message.round !== round.number) throw new Error("收到過期或超前的回合訊息。");

    if (message.type === "commit") await handleRemoteCommit(message.payload);
    if (message.type === "reveal") await handleRemoteReveal(message.payload);
    if (message.type === "round-result") handleRemoteResult(message.payload);
    if (message.type === "next-round") handleRemoteNextRound();
    if (message.type === "error") throw new Error("對手回報遊戲協定錯誤。");
  } catch (error) {
    protocolFailure(error instanceof Error ? error.message : "收到無法處理的訊息。");
  }
}

function handleHello(message) {
  if (message.round !== 0 || typeof message.payload.name !== "string" || typeof message.payload.role !== "string") throw new Error("Hello 訊息格式錯誤。");
  if (!new Set(["host", "guest"]).has(message.payload.role) || message.payload.role === role) throw new Error("雙方配對角色衝突。");
  peerName = message.payload.name.trim().slice(0, 20) || "對手";
  helloReceived = true;
  enterGame();
}

function enterGame() {
  if (!helloReceived || !dataChannel || dataChannel.readyState !== "open") return;
  elements.peerName.textContent = peerName;
  elements.resultPeerLabel.textContent = peerName;
  elements.pairingView.hidden = true;
  elements.gameView.hidden = false;
  startRound(1);
}

function startRound(number) {
  round = {
    number,
    phase: "choosing",
    localChoice: null,
    localNonce: null,
    localCommit: null,
    remoteCommit: null,
    remoteReveal: null,
    revealSent: false,
    localOutcome: null,
    remoteOutcome: null,
    localNext: false,
    remoteNext: false
  };
  elements.roundNumber.textContent = String(number);
  elements.gameStatus.textContent = "選一個拳，確認後就不能更改。";
  elements.choiceGrid.hidden = false;
  elements.confirmChoice.hidden = false;
  elements.confirmChoice.disabled = true;
  elements.confirmChoice.textContent = "確認出拳";
  elements.resultPanel.hidden = true;
  elements.nextRound.disabled = false;
  elements.nextRound.textContent = "下一把";
  elements.nextStatus.textContent = "";
  elements.choiceButtons.forEach((button) => {
    button.disabled = false;
    button.classList.remove("is-selected");
    button.setAttribute("aria-checked", "false");
  });
}

async function confirmChoice() {
  if (!round || round.phase !== "choosing" || !CHOICES[round.localChoice]) return;
  try {
    round.phase = "committing";
    elements.choiceButtons.forEach((button) => { button.disabled = true; });
    elements.confirmChoice.disabled = true;
    elements.confirmChoice.textContent = "正在鎖定…";
    round.localNonce = randomHex(16);
    round.localCommit = await sha256Hex(commitmentSource(PROTOCOL_VERSION, sessionId, round.number, round.localChoice, round.localNonce));
    sendMessage("commit", { commit: round.localCommit });
    round.phase = "committed";
    elements.confirmChoice.textContent = "已鎖定";
    elements.gameStatus.textContent = round.remoteCommit ? "雙方已鎖定，正在驗證…" : "已鎖定你的選擇，等待對手出拳…";
    await maybeSendReveal();
  } catch (error) {
    protocolFailure(error instanceof Error ? error.message : "無法送出選擇。");
  }
}

async function handleRemoteCommit(payload) {
  if (!round || !new Set(["choosing", "committing", "committed"]).has(round.phase)) throw new Error("對手在錯誤的狀態送出 commit。");
  if (round.remoteCommit) throw new Error("對手重複送出不同的 commit。");
  if (typeof payload.commit !== "string" || !/^[a-f0-9]{64}$/u.test(payload.commit)) throw new Error("對手的 commit 格式錯誤。");
  round.remoteCommit = payload.commit;
  elements.gameStatus.textContent = round.localCommit ? "雙方已鎖定，正在驗證…" : "對手已出拳，等你確認。";
  await maybeSendReveal();
}

async function maybeSendReveal() {
  if (!round?.localCommit || !round.remoteCommit || round.revealSent) return;
  round.revealSent = true;
  round.phase = "revealing";
  sendMessage("reveal", { choice: round.localChoice, nonce: round.localNonce });
}

async function handleRemoteReveal(payload) {
  if (!round?.localCommit || !round.remoteCommit || !round.revealSent) throw new Error("對手過早公開選擇。");
  if (round.remoteReveal) throw new Error("對手重複公開選擇。");
  if (!CHOICES[payload.choice] || typeof payload.nonce !== "string" || !/^[a-f0-9]{32}$/u.test(payload.nonce)) throw new Error("對手公開的選擇格式錯誤。");
  const expected = await sha256Hex(commitmentSource(PROTOCOL_VERSION, sessionId, round.number, payload.choice, payload.nonce));
  if (expected !== round.remoteCommit) throw new Error("對手的出拳驗證失敗，對局已終止。");
  round.remoteReveal = { choice: payload.choice, nonce: payload.nonce };
  round.localOutcome = determineOutcome(round.localChoice, payload.choice, role);
  round.phase = "verifying-result";
  sendMessage("round-result", { outcome: round.localOutcome });
  tryFinalizeResult();
}

function handleRemoteResult(payload) {
  if (!round || !new Set(["revealing", "verifying-result"]).has(round.phase)) throw new Error("對手在錯誤的狀態送出結果。");
  if (!new Set(["host", "guest", "draw"]).has(payload.outcome)) throw new Error("對手的結果格式錯誤。");
  round.remoteOutcome = payload.outcome;
  tryFinalizeResult();
}

function tryFinalizeResult() {
  if (!round?.localOutcome || !round.remoteOutcome) return;
  if (round.localOutcome !== round.remoteOutcome) throw new Error("雙方計算的對局結果不一致。");
  showRoundResult();
}

function showRoundResult() {
  round.phase = "result";
  const local = CHOICES[round.localChoice];
  const remote = CHOICES[round.remoteReveal.choice];
  const localWon = round.localOutcome === role;
  const draw = round.localOutcome === "draw";
  elements.choiceGrid.hidden = true;
  elements.confirmChoice.hidden = true;
  elements.resultPanel.hidden = false;
  elements.resultTitle.textContent = `第 ${round.number} 把`;
  elements.localResultIcon.textContent = local.icon;
  elements.localResultName.textContent = local.label;
  elements.remoteResultIcon.textContent = remote.icon;
  elements.remoteResultName.textContent = remote.label;
  elements.resultMessage.textContent = draw ? "平手，勢均力敵。" : localWon ? "這把你贏了！" : "這把對手贏了。";
  elements.gameStatus.textContent = "本把已完成雙向驗證。";
}

function chooseNextRound() {
  if (!round || !new Set(["result", "waiting-next"]).has(round.phase) || round.localNext) return;
  round.localNext = true;
  round.phase = "waiting-next";
  elements.nextRound.disabled = true;
  elements.nextRound.textContent = "已選擇下一把";
  elements.nextStatus.textContent = round.remoteNext ? "雙方都已準備。" : "等待對手選擇…";
  sendMessage("next-round", {});
  startNextRoundIfReady();
}

function handleRemoteNextRound() {
  if (!round || !new Set(["result", "waiting-next"]).has(round.phase)) throw new Error("對手在錯誤的狀態要求下一把。");
  round.remoteNext = true;
  elements.nextStatus.textContent = round.localNext ? "雙方都已準備。" : `${peerName} 已選擇下一把。`;
  startNextRoundIfReady();
}

function startNextRoundIfReady() {
  if (!round?.localNext || !round.remoteNext) return;
  const nextNumber = round.number + 1;
  setTimeout(() => startRound(nextNumber), 350);
}

function handleRemoteLeave() {
  endSession(`${peerName} 已退出遊戲。`);
}

function leaveGame() {
  try { if (dataChannel?.readyState === "open") sendMessage("leave", {}); } catch { /* Connection may already be gone. */ }
  returnToPairing("你已退出遊戲。");
}

function protocolFailure(message) {
  try { if (dataChannel?.readyState === "open") sendMessage("error", { message: "protocol-error" }); } catch { /* Best effort only. */ }
  returnToPairing(message, "error");
}

function endSession(message) {
  returnToPairing(message, "error");
}

function closeConnection() {
  intentionalClose = true;
  clearTimeout(disconnectTimer);
  disconnectTimer = null;
  if (dataChannel) {
    dataChannel.removeEventListener("close", handleRemoteLeave);
    try { dataChannel.close(); } catch { /* Already closed. */ }
  }
  if (peerConnection) {
    try { peerConnection.close(); } catch { /* Already closed. */ }
  }
  dataChannel = null;
  peerConnection = null;
}

function resetPairingFields() {
  elements.hostOfferBlock.hidden = true;
  elements.guestAnswerBlock.hidden = true;
  elements.hostInviteUrl.value = "";
  elements.hostAnswerInput.value = "";
  elements.guestOfferInput.value = "";
  elements.guestAnswerOutput.value = "";
  elements.hostOfferQr.replaceChildren();
  elements.guestAnswerQr.replaceChildren();
  elements.cancelPairing.hidden = true;
  elements.createOffer.disabled = false;
  elements.importOffer.disabled = false;
  elements.importAnswer.disabled = false;
}

function returnToPairing(message = "選擇建立或加入遊戲。", kind = "normal") {
  closeScanner();
  closeConnection();
  role = null;
  sessionId = null;
  helloReceived = false;
  peerName = "對手";
  round = null;
  processedMessageIds.clear();
  elements.gameView.hidden = true;
  elements.pairingView.hidden = false;
  resetPairingFields();
  setConnectionState("offline", "尚未連線");
  setPairingStatus(message, kind);
}

function cancelPairing() {
  returnToPairing("已取消配對。");
}

async function createOffer() {
  setBusy(elements.createOffer, true, "正在建立…");
  try {
    closeConnection();
    role = "host";
    sessionId = randomHex(16);
    helloReceived = false;
    processedMessageIds.clear();
    const connection = makePeerConnection();
    attachDataChannel(connection.createDataChannel("rps-game", { ordered: true }));
    const offer = await connection.createOffer();
    await connection.setLocalDescription(offer);
    setConnectionState("connecting", "收集連線路徑");
    setPairingStatus("正在收集可用的連線路徑…");
    await waitForIceGathering(connection);
    const encoded = await encodePacket({
      app: APP_ID,
      protocolVersion: PROTOCOL_VERSION,
      kind: "offer",
      sessionId,
      description: connection.localDescription.toJSON(),
      createdAt: Date.now()
    });
    const inviteUrl = createInviteUrl(encoded);
    elements.hostInviteUrl.value = inviteUrl;
    renderQr(elements.hostOfferQr, inviteUrl);
    elements.hostOfferBlock.hidden = false;
    elements.cancelPairing.hidden = false;
    setPairingStatus("邀請已建立。將它交給對手，再匯入對手回覆。", "success");
  } catch (error) {
    closeConnection();
    setPairingStatus(error instanceof Error ? error.message : "無法建立邀請。", "error");
  } finally {
    setBusy(elements.createOffer, false);
  }
}

async function importOffer(encodedValue = elements.guestOfferInput.value) {
  setBusy(elements.importOffer, true, "正在加入…");
  try {
    const packet = validatePairingPacket(await decodePacket(encodedValue), "offer");
    closeConnection();
    role = "guest";
    sessionId = packet.sessionId;
    helloReceived = false;
    processedMessageIds.clear();
    const connection = makePeerConnection();
    await connection.setRemoteDescription(packet.description);
    const answer = await connection.createAnswer();
    await connection.setLocalDescription(answer);
    setConnectionState("connecting", "收集連線路徑");
    setPairingStatus("正在產生給建立者的回覆…");
    await waitForIceGathering(connection);
    const encoded = await encodePacket({
      app: APP_ID,
      protocolVersion: PROTOCOL_VERSION,
      kind: "answer",
      sessionId,
      description: connection.localDescription.toJSON(),
      createdAt: Date.now()
    });
    elements.guestAnswerOutput.value = encoded;
    renderQr(elements.guestAnswerQr, encoded);
    elements.guestAnswerBlock.hidden = false;
    elements.cancelPairing.hidden = false;
    setPairingStatus("回覆已建立。將它交給建立者，並保持這個頁面開啟。", "success");
  } catch (error) {
    closeConnection();
    setPairingStatus(error instanceof Error ? error.message : "無法匯入邀請。", "error");
  } finally {
    setBusy(elements.importOffer, false);
  }
}

async function importAnswer(encodedValue = elements.hostAnswerInput.value) {
  if (answerImportPromise) return answerImportPromise;
  answerImportPromise = importAnswerOnce(encodedValue).finally(() => {
    answerImportPromise = null;
  });
  return answerImportPromise;
}

async function importAnswerOnce(encodedValue) {
  setBusy(elements.importAnswer, true, "正在連線…");
  try {
    const connection = peerConnection;
    const expectedSessionId = sessionId;
    if (!connection || role !== "host" || !expectedSessionId) throw new Error("請先建立一份連線邀請。");
    const packet = validatePairingPacket(await decodePacket(encodedValue), "answer");
    if (peerConnection !== connection || sessionId !== expectedSessionId) throw new Error("連線邀請已變更，請使用最新的回覆。");
    if (packet.sessionId !== expectedSessionId) throw new Error("這份回覆不屬於目前的連線邀請。");
    if (connection.signalingState === "stable") {
      const remoteDescription = connection.remoteDescription;
      if (remoteDescription?.type === "answer" && remoteDescription.sdp === packet.description.sdp) {
        setConnectionState("connecting", "正在連線");
        setPairingStatus("回覆已匯入，正在建立 P2P 連線…");
        return;
      }
      throw new Error("這份邀請已匯入回覆；若要重新連線，請重新建立邀請。");
    }
    if (connection.signalingState !== "have-local-offer") {
      throw new Error("目前連線不在等待回覆的狀態，請重新建立邀請。");
    }
    await connection.setRemoteDescription(packet.description);
    elements.hostAnswerInput.value = encodedValue.trim();
    setConnectionState("connecting", "正在連線");
    setPairingStatus("已匯入回覆，正在建立 P2P 連線…");
  } catch (error) {
    setPairingStatus(error instanceof Error ? error.message : "無法匯入回覆。", "error");
  } finally {
    setBusy(elements.importAnswer, false);
  }
}

function setPairingMode(mode) {
  if (mode === pairingMode) return;
  closeConnection();
  resetPairingFields();
  role = null;
  sessionId = null;
  pairingMode = mode;
  const isHost = mode === "host";
  elements.hostTab.classList.toggle("is-active", isHost);
  elements.guestTab.classList.toggle("is-active", !isHost);
  elements.hostTab.setAttribute("aria-selected", String(isHost));
  elements.guestTab.setAttribute("aria-selected", String(!isHost));
  elements.hostPanel.hidden = !isHost;
  elements.guestPanel.hidden = isHost;
  setConnectionState("offline", "尚未連線");
  setPairingStatus(isHost ? "建立邀請，再等對手回覆。" : "開啟邀請網址，或貼上網址以備用。");
}

async function copyPayload(targetId) {
  const field = document.getElementById(targetId);
  if (!field?.value) return showToast("目前沒有可複製的內容。");
  const copiedLabel = targetId === "host-invite-url" ? "邀請網址" : "回覆內容";
  let copied = false;
  try {
    await navigator.clipboard.writeText(field.value);
    copied = true;
  } catch {
    const fallback = document.createElement("textarea");
    fallback.value = field.value;
    fallback.setAttribute("readonly", "");
    fallback.style.position = "fixed";
    fallback.style.opacity = "0";
    fallback.style.pointerEvents = "none";
    document.body.appendChild(fallback);
    fallback.focus();
    fallback.select();
    copied = document.execCommand("copy");
    fallback.remove();
  }
  showToast(copied ? `已複製${copiedLabel}。` : `無法複製${copiedLabel}，請再試一次。`);
}

async function openScanner(target) {
  scannerTarget = target;
  elements.scannerStatus.textContent = "正在啟動相機…";
  if (typeof elements.scannerDialog.showModal === "function") elements.scannerDialog.showModal();
  else elements.scannerDialog.setAttribute("open", "");
  try {
    scanner = new QrScanner(elements.scannerVideo, handleScanResult, {
      preferredCamera: "environment",
      maxScansPerSecond: 10,
      highlightScanRegion: true,
      highlightCodeOutline: true,
      returnDetailedScanResult: true
    });
    await scanner.start();
    elements.scannerStatus.textContent = "將 QR Code 放進框內。";
  } catch {
    closeScanner();
    setPairingStatus("無法開啟相機，請檢查權限或改用複製貼上。", "error");
  }
}

async function handleScanResult(result) {
  const value = typeof result === "string" ? result : result.data;
  const target = scannerTarget;
  closeScanner();
  if (target === "offer") {
    elements.guestOfferInput.value = value;
    await importOffer(value);
  } else {
    elements.hostAnswerInput.value = value;
    await importAnswer(value);
  }
}

function closeScanner() {
  if (scanner) {
    scanner.destroy();
    scanner = null;
  }
  scannerTarget = null;
  if (elements.scannerDialog.open) elements.scannerDialog.close();
}

elements.hostTab.addEventListener("click", () => setPairingMode("host"));
elements.guestTab.addEventListener("click", () => setPairingMode("guest"));
elements.createOffer.addEventListener("click", createOffer);
elements.importOffer.addEventListener("click", () => importOffer());
elements.importAnswer.addEventListener("click", () => importAnswer());
elements.scanOffer.addEventListener("click", () => openScanner("offer"));
elements.scanAnswer.addEventListener("click", () => openScanner("answer"));
elements.cancelPairing.addEventListener("click", cancelPairing);
elements.closeScanner.addEventListener("click", closeScanner);
elements.scannerDialog.addEventListener("cancel", (event) => { event.preventDefault(); closeScanner(); });
elements.playerName.addEventListener("change", () => {
  try { localStorage.setItem("rps-player-name", playerDisplayName()); } catch { /* Storage is optional. */ }
});
document.querySelectorAll("[data-copy-target]").forEach((button) => {
  button.addEventListener("click", () => copyPayload(button.dataset.copyTarget));
});
elements.choiceButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (!round || round.phase !== "choosing") return;
    round.localChoice = button.dataset.choice;
    elements.choiceButtons.forEach((candidate) => {
      const selected = candidate === button;
      candidate.classList.toggle("is-selected", selected);
      candidate.setAttribute("aria-checked", String(selected));
    });
    elements.confirmChoice.disabled = false;
    elements.gameStatus.textContent = `已選擇${CHOICES[round.localChoice].label}，確認後就不能更改。`;
  });
});
elements.confirmChoice.addEventListener("click", confirmChoice);
elements.nextRound.addEventListener("click", chooseNextRound);
elements.leaveGame.addEventListener("click", leaveGame);
window.addEventListener("beforeunload", () => {
  try { if (dataChannel?.readyState === "open") sendMessage("leave", {}); } catch { /* Best effort only. */ }
  closeConnection();
});

try {
  const savedName = localStorage.getItem("rps-player-name");
  if (savedName) elements.playerName.value = savedName.slice(0, 20);
} catch { /* Storage is optional. */ }

window.RPSGameTest = Object.freeze({ determineOutcome, encodePacket, decodePacket, validatePairingPacket });
setPairingMode("host");

const currentUrl = new URL(window.location.href);
const inviteFromUrl = currentUrl.searchParams.get("invite") || new URLSearchParams(currentUrl.hash.slice(1)).get("invite");
if (inviteFromUrl) {
  setPairingMode("guest");
  setPairingStatus("已讀取邀請網址，正在自動匯入…");
  void importOffer(inviteFromUrl);
}
