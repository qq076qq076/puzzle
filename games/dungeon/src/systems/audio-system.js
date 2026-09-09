import { loadSettings, saveSettings } from "./run-state.js";

class DungeonAudio {
  constructor() {
    this.enabled = loadSettings().soundEnabled;
    this.context = null;
  }

  ensureContext() {
    if (!this.enabled) return null;
    if (!this.context) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return null;
      this.context = new AudioContextClass();
    }
    if (this.context.state === "suspended") this.context.resume().catch(() => {});
    return this.context;
  }

  toggle() {
    this.enabled = !this.enabled;
    saveSettings({ soundEnabled: this.enabled });
    if (this.enabled) this.beep("ui");
    return this.enabled;
  }

  beep(kind = "ui") {
    const context = this.ensureContext();
    if (!context) return;
    const presets = {
      attack: [
        { from: 260, to: 105, duration: 0.075, type: "sawtooth", gain: 0.035 },
        { from: 150, to: 82, duration: 0.09, type: "triangle", gain: 0.026, delay: 0.012 },
      ],
      hit: [
        { from: 115, to: 72, duration: 0.075, type: "square", gain: 0.065 },
        { from: 760, to: 430, duration: 0.038, type: "square", gain: 0.025 },
      ],
      damage: [
        { from: 105, to: 48, duration: 0.14, type: "sawtooth", gain: 0.065 },
        { from: 180, to: 78, duration: 0.09, type: "square", gain: 0.026 },
      ],
      dodge: [{ from: 680, to: 230, duration: 0.11, type: "triangle", gain: 0.045 }],
      telegraph: [{ from: 120, to: 150, duration: 0.16, type: "square", gain: 0.045 }],
      wave: [{ from: 240, to: 340, duration: 0.18, type: "triangle", gain: 0.05 }],
      reward: [{ from: 620, to: 880, duration: 0.22, type: "sine", gain: 0.055 }],
      boss: [{ from: 70, to: 48, duration: 0.35, type: "sawtooth", gain: 0.07 }],
      victory: [{ from: 720, to: 1080, duration: 0.4, type: "sine", gain: 0.06 }],
      defeat: [{ from: 80, to: 42, duration: 0.4, type: "triangle", gain: 0.06 }],
      ui: [{ from: 440, to: 460, duration: 0.07, type: "sine", gain: 0.04 }],
    };
    (presets[kind] || presets.ui).forEach((voice) => this.playVoice(context, voice));
  }

  playVoice(context, voice) {
    const startAt = context.currentTime + (voice.delay || 0);
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = voice.type;
    oscillator.frequency.setValueAtTime(voice.from, startAt);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, voice.to), startAt + voice.duration);
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(voice.gain, startAt + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + voice.duration);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(startAt);
    oscillator.stop(startAt + voice.duration + 0.02);
  }
}

export function getDungeonAudio() {
  if (!window.__dungeonAudio) window.__dungeonAudio = new DungeonAudio();
  return window.__dungeonAudio;
}
