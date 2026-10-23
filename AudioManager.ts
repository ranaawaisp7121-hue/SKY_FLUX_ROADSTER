// ═══════════════════════════════════════════
//  Audio Manager — Web Audio API
// ═══════════════════════════════════════════

export class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private enabled = true;
  private volume = 0.7;

  private engineNode: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;

  init(volume: number, enabled: boolean): void {
    this.volume = volume / 100;
    this.enabled = enabled;
  }

  private ensureContext(): boolean {
    if (!this.enabled) return false;
    if (!this.ctx) {
      try {
        this.ctx = new AudioContext();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = this.volume;
        this.masterGain.connect(this.ctx.destination);
      } catch {
        return false;
      }
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return true;
  }

  private playTone(
    freq: number,
    duration: number,
    type: OscillatorType = 'sine',
    gainVal = 0.3,
    startOffset = 0,
  ): void {
    if (!this.ensureContext() || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime + startOffset;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(gainVal, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.start(now);
    osc.stop(now + duration);
  }

  startEngine(speed: number): void {
    if (!this.ensureContext() || !this.ctx || !this.masterGain) return;
    if (this.engineNode) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.type = 'sawtooth';
    osc.frequency.value = 60 + speed * 2;
    gain.gain.value = 0.06;
    osc.start();
    this.engineNode = osc;
    this.engineGain = gain;
  }

  updateEngine(speed: number): void {
    if (!this.engineNode || !this.ctx) return;
    const freq = 60 + speed * 2.8;
    this.engineNode.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.1);
    if (this.engineGain) {
      const vol = 0.04 + (speed / 60) * 0.08;
      this.engineGain.gain.setTargetAtTime(vol, this.ctx.currentTime, 0.1);
    }
  }

  stopEngine(): void {
    this.engineNode?.stop();
    this.engineNode = null;
    this.engineGain = null;
  }

  playJump(): void {
    this.playTone(180, 0.15, 'sine', 0.25);
    this.playTone(280, 0.2, 'sine', 0.2, 0.08);
  }

  playLand(): void {
    this.playTone(80, 0.12, 'square', 0.35);
    this.playTone(50, 0.2, 'sine', 0.2, 0.05);
  }

  playBoost(): void {
    if (!this.ensureContext() || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain); gain.connect(this.masterGain);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.linearRampToValueAtTime(400, now + 0.3);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc.start(now); osc.stop(now + 0.35);
  }

  playCollect(): void {
    this.playTone(660, 0.08, 'sine', 0.2);
    this.playTone(880, 0.1, 'sine', 0.15, 0.05);
  }

  playCrash(): void {
    if (!this.ensureContext() || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const bufSize = this.ctx.sampleRate * 0.4;
    const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
    const noise = this.ctx.createBufferSource();
    const gain = this.ctx.createGain();
    noise.buffer = buf;
    noise.connect(gain); gain.connect(this.masterGain);
    gain.gain.setValueAtTime(0.6, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    noise.start(now); noise.stop(now + 0.5);
    this.playTone(60, 0.3, 'sawtooth', 0.3);
  }

  playMenuClick(): void {
    this.playTone(440, 0.06, 'sine', 0.15);
    this.playTone(550, 0.05, 'sine', 0.1, 0.04);
  }

  playNearMiss(): void {
    this.playTone(520, 0.05, 'square', 0.1);
  }

  setEnabled(val: boolean): void {
    this.enabled = val;
    if (!val) this.stopEngine();
  }

  setVolume(val: number): void {
    this.volume = val / 100;
    if (this.masterGain) this.masterGain.gain.value = this.volume;
  }

  destroy(): void {
    this.stopEngine();
    this.ctx?.close().catch(() => {});
    this.ctx = null;
  }
}
