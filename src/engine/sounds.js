// ============================================
// Sound Effects Engine — Web Audio API
// Procedural sounds for game events
// ============================================

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.volume = 0.5;
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.initialized = true;
    } catch (e) {
      console.warn('Web Audio API not supported');
      this.enabled = false;
    }
  }

  // Resume context (must be called from user gesture)
  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // --- Play a touch/juggle sound (bright ping) ---
  playTouch(combo = 0) {
    if (!this.enabled || !this.ctx) return;
    this.resume();

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    // Higher pitch for higher combos
    const baseFreq = 600 + Math.min(combo, 30) * 15;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, now + 0.05);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.8, now + 0.15);

    gain.gain.setValueAtTime(this.volume * 0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.2);
  }

  // --- Play combo milestone sound (triumphant chord) ---
  playComboMilestone(combo) {
    if (!this.enabled || !this.ctx) return;
    this.resume();

    const now = this.ctx.currentTime;
    const freqs = [523, 659, 784]; // C5, E5, G5 — major chord

    freqs.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.04);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.02, now + 0.3);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(this.volume * 0.3, now + i * 0.04 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + i * 0.04);
      osc.stop(now + 0.5);
    });
  }

  // --- Play drop sound (low thud + descending tone) ---
  playDrop() {
    if (!this.enabled || !this.ctx) return;
    this.resume();

    const now = this.ctx.currentTime;

    // Low thud
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.3);

    gain.gain.setValueAtTime(this.volume * 0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.35);

    // Noise burst
    const bufferSize = this.ctx.sampleRate * 0.1;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }

    const noise = this.ctx.createBufferSource();
    const noiseGain = this.ctx.createGain();
    noise.buffer = buffer;
    noiseGain.gain.setValueAtTime(this.volume * 0.15, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    noise.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);

    noise.start(now);
    noise.stop(now + 0.15);
  }

  // --- Play countdown tick ---
  playCountdownTick() {
    if (!this.enabled || !this.ctx) return;
    this.resume();

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(880, now);

    gain.gain.setValueAtTime(this.volume * 0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.1);
  }

  // --- Play "GO!" sound (ascending chord) ---
  playGo() {
    if (!this.enabled || !this.ctx) return;
    this.resume();

    const now = this.ctx.currentTime;
    const freqs = [440, 554, 659, 880]; // A4, C#5, E5, A5

    freqs.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now + i * 0.05);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(this.volume * 0.2, now + i * 0.05 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + i * 0.05);
      osc.stop(now + 0.6);
    });
  }

  // --- Play button click (soft tick) ---
  playClick() {
    if (!this.enabled || !this.ctx) return;
    this.resume();

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.05);

    gain.gain.setValueAtTime(this.volume * 0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.08);
  }

  // --- Play session complete (victory fanfare) ---
  playSessionComplete() {
    if (!this.enabled || !this.ctx) return;
    this.resume();

    const now = this.ctx.currentTime;
    const melody = [523, 659, 784, 1047]; // C5 E5 G5 C6

    melody.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.12);

      gain.gain.setValueAtTime(0, now + i * 0.12);
      gain.gain.linearRampToValueAtTime(this.volume * 0.3, now + i * 0.12 + 0.03);
      gain.gain.setValueAtTime(this.volume * 0.3, now + i * 0.12 + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.4);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + i * 0.12);
      osc.stop(now + i * 0.12 + 0.4);
    });
  }

  setVolume(vol) {
    this.volume = Math.max(0, Math.min(1, vol));
  }

  toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  }
}

// Singleton instance
const soundEngine = new SoundEngine();
export default soundEngine;
