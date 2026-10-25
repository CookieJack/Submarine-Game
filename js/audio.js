/* ============ Web Audio 合成音效（无音频文件） ============ */

const AudioSys = {
  ctx: null,
  master: null,
  muted: false,
  ambientStarted: false,

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.5;
      this.master.connect(this.ctx.destination);
      this.startAmbient();
    } catch (e) {
      /* 无音频环境时静默降级 */
    }
  },

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.5;
    return this.muted;
  },

  /* 深海持续低鸣：两个低频正弦 + 慢速失谐 + 低通 */
  startAmbient() {
    if (!this.ctx || this.ambientStarted) return;
    this.ambientStarted = true;

    const gain = this.ctx.createGain();
    gain.gain.value = 0.035;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 190;
    filter.Q.value = 0.7;

    const o1 = this.ctx.createOscillator();
    o1.type = 'sine';
    o1.frequency.value = 48;

    const o2 = this.ctx.createOscillator();
    o2.type = 'sine';
    o2.frequency.value = 72.3;

    const lfo = this.ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.09;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 1.8;
    lfo.connect(lfoGain);
    lfoGain.connect(o2.frequency);

    o1.connect(filter);
    o2.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);

    o1.start();
    o2.start();
    lfo.start();
  },

  /* 扫频音 */
  tone(f0, f1, dur, type = 'sine', vol = 0.2, delay = 0) {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, t0);
    osc.frequency.exponentialRampToValueAtTime(Math.max(f1, 1), t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.03);
  },

  /* 噪声脉冲：lowpass 用于闷响，highpass 用于水花 */
  noise(dur = 0.1, vol = 0.12, freq = 1200, delay = 0, filterType = 'lowpass') {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime + delay;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buf;

    const filter = this.ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.value = freq;

    const g = this.ctx.createGain();
    g.gain.value = vol;

    src.connect(filter);
    filter.connect(g);
    g.connect(this.master);
    src.start(t0);
  },

  play(name) {
    if (!this.ctx || this.muted) return;
    switch (name) {
      case 'mine_launch':
        this.tone(190, 70, 0.18, 'sine', 0.2);
        this.noise(0.07, 0.06, 700);
        this.tone(620, 980, 0.12, 'triangle', 0.045, 0.02);
        break;

      case 'mine_armed':
        this.tone(880, 880, 0.06, 'square', 0.055);
        this.tone(1320, 1320, 0.08, 'square', 0.05, 0.09);
        break;

      case 'mine_expire':
        this.noise(0.22, 0.045, 900);
        this.tone(420, 170, 0.24, 'sine', 0.045);
        break;

      case 'mine_blast':
        this.tone(165, 38, 0.46, 'sine', 0.26);
        this.tone(82, 30, 0.62, 'triangle', 0.17, 0.02);
        this.noise(0.34, 0.18, 950);
        this.noise(0.18, 0.07, 2600, 0.01, 'highpass');
        break;

      case 'charge_splash':
        this.noise(0.12, 0.055, 2600, 0, 'highpass');
        this.tone(330, 140, 0.1, 'sine', 0.035);
        break;

      case 'charge_blast':
        this.tone(115, 34, 0.42, 'sine', 0.2);
        this.tone(70, 28, 0.52, 'sine', 0.12, 0.02);
        this.noise(0.3, 0.11, 420);
        break;

      case 'hit':
        this.noise(0.2, 0.16, 800);
        this.tone(230, 88, 0.4, 'sawtooth', 0.13);
        this.tone(900, 430, 0.24, 'square', 0.05, 0.05);
        break;

      case 'reload':
        this.tone(520, 520, 0.035, 'square', 0.035);
        this.tone(760, 760, 0.05, 'square', 0.035, 0.05);
        break;

      case 'ui':
        this.tone(920, 920, 0.04, 'square', 0.03);
        break;

      case 'level_clear':
        [523, 659, 784, 1047].forEach((f, i) => {
          this.tone(f, f, 0.26, 'triangle', 0.11, i * 0.15);
        });
        break;

      case 'game_over':
        [392, 311, 233, 175].forEach((f, i) => {
          this.tone(f, f * 0.96, 0.34, 'sawtooth', 0.1, i * 0.2);
        });
        break;

      case 'victory':
        [523, 659, 784, 1047, 1319].forEach((f, i) => {
          this.tone(f, f, 0.3, 'triangle', 0.11, i * 0.14);
        });
        this.noise(0.5, 0.035, 1800, 0.7, 'highpass');
        break;
    }
  }
};
