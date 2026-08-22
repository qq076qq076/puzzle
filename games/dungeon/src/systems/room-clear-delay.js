export const ROOM_CLEAR_REWARD_DELAY_MS = 2000;

export function tickRoomClearDelay(remainingMs, deltaMs) {
  const remaining = Math.max(0, Number(remainingMs) || 0);
  const delta = Math.max(0, Number(deltaMs) || 0);
  const nextRemaining = Math.max(0, remaining - delta);
  return {
    remaining: nextRemaining,
    ready: nextRemaining === 0,
  };
}
