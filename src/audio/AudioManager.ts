export class AudioManager {
  private static instance: AudioManager | null = null;
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isPlaying = false;
  private noiseNode: AudioScheduledSourceNode | null = null;
  private filterNode: BiquadFilterNode | null = null;
  private droneOsc: OscillatorNode | null = null;

  static getInstance(): AudioManager {
    if (!this.instance) {
      this.instance = new AudioManager();
    }
    return this.instance;
  }

  /**
   * Initializes AudioContext upon user gesture (e.g. pointer lock click)
   * to comply with browser autoplay policies.
   */
  async initOnUserGesture(): Promise<void> {
    if (this.ctx && this.ctx.state === 'running') return;

    if (!this.ctx) {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtxClass();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    }

    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }

    if (!this.isPlaying) {
      this.startNightWindAmbiance();
    }
  }

  /**
   * Generates procedural Scottish Highlands night wind and low castle resonance
   * using Web Audio pink noise + swept bandpass filter + low drone oscillator.
   */
  private startNightWindAmbiance(): void {
    if (!this.ctx || !this.masterGain) return;

    this.isPlaying = true;

    // 1. Procedural Pink Noise Buffer for Wind
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;

    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.04;
      b6 = white * 0.115926;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    // 2. Resonant Lowpass/Bandpass for wind howl
    this.filterNode = this.ctx.createBiquadFilter();
    this.filterNode.type = 'lowpass';
    this.filterNode.frequency.setValueAtTime(320, this.ctx.currentTime);
    this.filterNode.Q.setValueAtTime(3.0, this.ctx.currentTime);

    // Subtle LFO modulating wind filter frequency
    const lfo = this.ctx.createOscillator();
    lfo.frequency.setValueAtTime(0.15, this.ctx.currentTime);
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.setValueAtTime(140, this.ctx.currentTime);
    lfo.connect(lfoGain);
    lfoGain.connect(this.filterNode.frequency);
    lfo.start();

    // 3. Castle deep resonant drone (55Hz A1)
    this.droneOsc = this.ctx.createOscillator();
    this.droneOsc.type = 'sine';
    this.droneOsc.frequency.setValueAtTime(55, this.ctx.currentTime);
    const droneGain = this.ctx.createGain();
    droneGain.gain.setValueAtTime(0.015, this.ctx.currentTime);
    this.droneOsc.connect(droneGain);
    droneGain.connect(this.masterGain);
    this.droneOsc.start();

    whiteNoise.connect(this.filterNode);
    this.filterNode.connect(this.masterGain);
    whiteNoise.start();
    this.noiseNode = whiteNoise;

    // Smooth fade in
    this.masterGain.gain.linearRampToValueAtTime(0.4, this.ctx.currentTime + 3.0);
  }

  stop(): void {
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 1.0);
    }
    if (this.noiseNode) {
      try {
        this.noiseNode.stop(this.ctx ? this.ctx.currentTime + 1.0 : 0);
      } catch {
        // Source already stopped
      }
      this.noiseNode = null;
    }
    this.isPlaying = false;
  }

  dispose(): void {
    this.stop();
    this.droneOsc?.stop();
    this.ctx?.close();
    this.ctx = null;
    this.masterGain = null;
    AudioManager.instance = null;
  }
}
