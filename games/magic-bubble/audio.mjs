export class AudioController {
  constructor() {
    this.context = null;
    this.master = null;
    this.volume = 0.65;
    this.muted = false;
  }

  unlock() {
    if (!this.context) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      this.context = new AudioContext();
      this.master = this.context.createGain();
      this.master.connect(this.context.destination);
      this.applyVolume();
    }
    if (this.context.state === "suspended") this.context.resume().catch(() => {});
  }

  applyVolume() {
    if (this.master) this.master.gain.value = this.muted ? 0 : this.volume;
  }

  setVolume(value) {
    this.volume = Math.max(0, Math.min(1, Number(value) || 0));
    this.applyVolume();
  }

  setMuted(value) {
    this.muted = Boolean(value);
    this.applyVolume();
  }

  tone(frequency, duration = 0.08, options = {}) {
    if (!this.context || !this.master || this.muted) return;
    const now = this.context.currentTime;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = options.type || "sine";
    oscillator.frequency.setValueAtTime(frequency, now);
    if (options.endFrequency) oscillator.frequency.exponentialRampToValueAtTime(options.endFrequency, now + duration);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(options.gain || 0.12, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain);
    gain.connect(this.master);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.02);
  }

  playEvent(event) {
    if (event.type === "PAIR_MOVED") this.tone(260, 0.045, { gain: 0.035 });
    if (event.type === "PAIR_ROTATED") this.tone(410, 0.07, { endFrequency: 620, gain: 0.05 });
    if (event.type === "HARD_DROP") this.tone(140, 0.11, { endFrequency: 80, type: "triangle", gain: 0.08 });
    if (event.type === "CHAIN_STEP") {
      const base = Math.min(880, 330 + event.chain * 95);
      this.tone(base, 0.2, { endFrequency: base * 1.35, gain: 0.11 });
    }
    if (event.type === "STAGE_CLEAR") {
      [523, 659, 784].forEach((frequency, index) => setTimeout(() => this.tone(frequency, 0.24, { gain: 0.1 }), index * 110));
    }
    if (event.type === "GAME_OVER") this.tone(220, 0.45, { endFrequency: 82, type: "sawtooth", gain: 0.06 });
  }

  playEvents(events) {
    events.forEach((event) => this.playEvent(event));
  }
}

