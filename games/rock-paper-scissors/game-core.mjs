export const CHOICES = Object.freeze({
  rock: { label: "石頭", icon: "✊", beats: "scissors" },
  paper: { label: "布", icon: "✋", beats: "rock" },
  scissors: { label: "剪刀", icon: "✌️", beats: "paper" }
});

export function determineOutcome(localChoice, remoteChoice, localRole) {
  if (!CHOICES[localChoice] || !CHOICES[remoteChoice]) throw new TypeError("無效的出拳選擇。");
  if (localRole !== "host" && localRole !== "guest") throw new TypeError("無效的玩家角色。");
  if (localChoice === remoteChoice) return "draw";
  const localWon = CHOICES[localChoice].beats === remoteChoice;
  if (localRole === "host") return localWon ? "host" : "guest";
  return localWon ? "guest" : "host";
}

export function commitmentSource(protocolVersion, sessionId, roundNumber, choice, nonce) {
  if (!Number.isInteger(protocolVersion) || !sessionId || !Number.isInteger(roundNumber) || !CHOICES[choice] || !nonce) {
    throw new TypeError("無法建立出拳承諾。");
  }
  return `${protocolVersion}|${sessionId}|${roundNumber}|${choice}|${nonce}`;
}

export async function sha256Hex(value) {
  const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
