const LOCK_NAME = "happy-aquarium-writer";
const LEASE_KEY = "puzzle-club-save:happy-aquarium:writer-lease";

export async function acquireWriter() {
  if (navigator.locks?.request) return acquireWebLock();
  return acquireLease();
}

function acquireWebLock() {
  let resolveAttempt;
  let releaseLock;
  const attempted = new Promise((resolve) => { resolveAttempt = resolve; });
  navigator.locks.request(LOCK_NAME, { mode: "exclusive", ifAvailable: true }, async (lock) => {
    if (!lock) {
      resolveAttempt({ acquired: false, release() {} });
      return;
    }
    const held = new Promise((resolve) => { releaseLock = resolve; });
    resolveAttempt({ acquired: true, release: () => releaseLock?.() });
    await held;
  });
  return attempted;
}

async function acquireLease() {
  const writerId = globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
  const writeLease = () => localStorage.setItem(LEASE_KEY, JSON.stringify({ writerId, expiresAt: Date.now() + 10_000 }));
  const current = readLease();
  if (current && current.expiresAt > Date.now() && current.writerId !== writerId) return { acquired: false, release() {} };
  try { writeLease(); } catch { return { acquired: true, release() {} }; }
  await new Promise((resolve) => window.setTimeout(resolve, 50 + Math.random() * 100));
  if (readLease()?.writerId !== writerId) return { acquired: false, release() {} };
  const timer = window.setInterval(writeLease, 3000);
  const release = () => {
    window.clearInterval(timer);
    if (readLease()?.writerId === writerId) localStorage.removeItem(LEASE_KEY);
  };
  window.addEventListener("pagehide", release, { once: true });
  return { acquired: true, release };
}

function readLease() {
  try {
    const parsed = JSON.parse(localStorage.getItem(LEASE_KEY));
    if (!parsed || typeof parsed.writerId !== "string") return null;
    const expiresAt = Math.min(Number(parsed.expiresAt) || 0, Date.now() + 30_000);
    return { writerId: parsed.writerId, expiresAt };
  } catch { return null; }
}
