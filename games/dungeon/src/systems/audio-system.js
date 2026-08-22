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
      attack: [180, 0.06, "sawtooth"],
      hit: [360, 0.07, "square"],
      damage: [90, 0.12, "sawtooth"],
      dodge: [520, 0.09, "triangle"],
      telegraph: [120, 0.16, "square"],
      wave: [240, 0.18, "triangle"],
      reward: [620, 0.22, "sine"],
      boss: [70, 0.35, "sawtooth"],
      victory: [720, 0.4, "sine"],
      defeat: [80, 0.4, "triangle"],
      ui: [440, 0.07, "sine"],
    };
    const [frequency, duration, type] = presets[kind] || presets.ui;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.08, context.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + duration + 0.02);
  }
}

export function getDungeonAudio() {
  if (!window.__dungeonAudio) window.__dungeonAudio = new DungeonAudio();
  return window.__dungeonAudio;
}
