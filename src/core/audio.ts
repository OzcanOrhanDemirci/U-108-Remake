// Ses: kayıtlı 2023 piyanosu + kayıtlı tanıtım sesi + koddan üretilen her şey (yeni müzik, ortam, efekt).
import { SND } from './assets';
import { clamp } from './math';

export interface Track {
  src: AudioBufferSourceNode;
  gain: GainNode;
  filter: BiquadFilterNode;
  startedAt: number;
  offset: number;
  stop(fade?: number): void;
  setGain(v: number, time?: number): void;
  setRate(r: number, time?: number): void;
  setCutoff(hz: number, time?: number): void;
  position(): number;
}

export type Bus = 'music' | 'amb' | 'sfx' | 'voice' | 'ui';

class AudioSys {
  ctx!: AudioContext;
  master!: GainNode;
  buses = {} as Record<Bus, GainNode>;
  reverb!: ConvolverNode;
  reverbIn!: GainNode;
  private lofi!: WaveShaperNode;
  private noiseBuf!: AudioBuffer;
  private ambNodes: Record<string, { gain: GainNode; stop: () => void }> = {};
  muted = false;

  init() {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    this.ctx = new AC({ latencyHint: 'interactive' });
    const c = this.ctx;
    const comp = c.createDynamicsCompressor();
    comp.threshold.value = -14; comp.knee.value = 12; comp.ratio.value = 3; comp.attack.value = 0.01; comp.release.value = 0.25;
    this.master = c.createGain(); this.master.gain.value = 0.9;
    this.master.connect(comp).connect(c.destination);
    this.reverb = c.createConvolver();
    this.reverb.buffer = this.makeIR(3.8, 2.2);
    this.reverbIn = c.createGain(); this.reverbIn.gain.value = 1;
    const rvOut = c.createGain(); rvOut.gain.value = 0.55;
    this.reverbIn.connect(this.reverb).connect(rvOut).connect(this.master);
    for (const b of ['music', 'amb', 'sfx', 'voice', 'ui'] as Bus[]) {
      const g = c.createGain(); g.connect(this.master); this.buses[b] = g;
    }
    this.buses.music.gain.value = 0.85;
    this.buses.amb.gain.value = 0.6;
    this.buses.sfx.gain.value = 0.7;
    this.buses.voice.gain.value = 1.0;
    this.buses.ui.gain.value = 0.5;
    // beyaz gürültü tamponu
    const len = c.sampleRate * 2;
    this.noiseBuf = c.createBuffer(1, len, c.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }

  resume() { if (this.ctx.state !== 'running') this.ctx.resume(); }
  get now() { return this.ctx.currentTime; }

  /** Üstel sönen gürültüden yapay oda yankısı. */
  private makeIR(seconds: number, decay: number) {
    const c = this.ctx, len = Math.floor(c.sampleRate * seconds);
    const buf = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      let lp = 0;
      for (let i = 0; i < len; i++) {
        const t = i / len;
        // zamanla kararan (alçak geçiren) gürültü
        const k = 0.15 + 0.8 * t;
        lp = lp * k + (Math.random() * 2 - 1) * (1 - k);
        d[i] = lp * Math.pow(1 - t, decay) * (i < c.sampleRate * 0.012 ? i / (c.sampleRate * 0.012) : 1);
      }
    }
    return buf;
  }

  /** Kayıtlı bir tamponu çalar. */
  play(name: string, o: { bus?: Bus; gain?: number; rate?: number; loop?: boolean; offset?: number; fadeIn?: number; reverb?: number; cutoff?: number; pan?: number; loopStart?: number; loopEnd?: number; when?: number } = {}): Track | null {
    const buf = SND[name];
    if (!buf || !this.ctx) return null;
    const c = this.ctx;
    const src = c.createBufferSource();
    src.buffer = buf;
    src.loop = !!o.loop;
    if (o.loopStart !== undefined) src.loopStart = o.loopStart;
    if (o.loopEnd !== undefined) src.loopEnd = o.loopEnd;
    src.playbackRate.value = o.rate ?? 1;
    const filter = c.createBiquadFilter();
    filter.type = 'lowpass'; filter.frequency.value = o.cutoff ?? 20000; filter.Q.value = 0.5;
    const gain = c.createGain();
    const g = o.gain ?? 1;
    const when = o.when ?? c.currentTime;
    if (o.fadeIn) { gain.gain.setValueAtTime(0, when); gain.gain.linearRampToValueAtTime(g, when + o.fadeIn); }
    else gain.gain.value = g;
    let node: AudioNode = src.connect(filter).connect(gain);
    if (o.pan) { const p = c.createStereoPanner(); p.pan.value = o.pan; node = node.connect(p); }
    node.connect(this.buses[o.bus ?? 'sfx']);
    if (o.reverb) { const s = c.createGain(); s.gain.value = o.reverb; node.connect(s).connect(this.reverbIn); }
    const offset = o.offset ?? 0;
    src.start(when, offset);
    const t: Track = {
      src, gain, filter, startedAt: when, offset,
      stop: (fade = 0) => {
        const n = c.currentTime;
        try {
          gain.gain.cancelScheduledValues(n);
          gain.gain.setValueAtTime(gain.gain.value, n);
          gain.gain.linearRampToValueAtTime(0, n + Math.max(0.005, fade));
          src.stop(n + Math.max(0.01, fade) + 0.02);
        } catch { /* zaten durmuş */ }
      },
      setGain: (v, time = 0) => {
        const n = c.currentTime;
        gain.gain.cancelScheduledValues(n); gain.gain.setValueAtTime(gain.gain.value, n);
        if (time > 0) gain.gain.linearRampToValueAtTime(v, n + time); else gain.gain.setValueAtTime(v, n);
      },
      setRate: (r, time = 0) => {
        const n = c.currentTime;
        src.playbackRate.cancelScheduledValues(n); src.playbackRate.setValueAtTime(src.playbackRate.value, n);
        if (time > 0) src.playbackRate.linearRampToValueAtTime(Math.max(0.0001, r), n + time); else src.playbackRate.setValueAtTime(r, n);
      },
      setCutoff: (hz, time = 0) => {
        const n = c.currentTime;
        filter.frequency.cancelScheduledValues(n); filter.frequency.setValueAtTime(filter.frequency.value, n);
        if (time > 0) filter.frequency.exponentialRampToValueAtTime(Math.max(20, hz), n + time); else filter.frequency.setValueAtTime(hz, n);
      },
      position: () => {
        const el = (c.currentTime - when) * src.playbackRate.value + offset;
        return src.loop ? el % buf.duration : el;
      },
    };
    return t;
  }

  /** Kaset durması: hız sıfıra iner, ses kalınlaşıp söner. */
  tapeStop(t: Track | null, seconds: number) {
    if (!t) return;
    const n = this.ctx.currentTime;
    t.src.playbackRate.cancelScheduledValues(n);
    t.src.playbackRate.setValueAtTime(t.src.playbackRate.value, n);
    t.src.playbackRate.exponentialRampToValueAtTime(0.03, n + seconds);
    t.setCutoff(300, seconds);
    t.gain.gain.setValueAtTime(t.gain.gain.value, n + seconds * 0.6);
    t.gain.gain.linearRampToValueAtTime(0, n + seconds);
    t.src.stop(n + seconds + 0.05);
  }

  /** Bir tampondan kısa dilimleri tekrar tekrar çalar (takılma). */
  stutter(name: string, at: number, sliceLen: number, count: number, gap: number, o: { gain?: number; rateJitter?: number; bus?: Bus } = {}) {
    const buf = SND[name]; if (!buf) return;
    const c = this.ctx;
    for (let i = 0; i < count; i++) {
      const src = c.createBufferSource(); src.buffer = buf;
      src.playbackRate.value = 1 + (Math.random() - 0.5) * (o.rateJitter ?? 0);
      const g = c.createGain(); const when = c.currentTime + i * gap;
      g.gain.setValueAtTime(0, when); g.gain.linearRampToValueAtTime(o.gain ?? 0.7, when + 0.004);
      g.gain.setValueAtTime(o.gain ?? 0.7, when + sliceLen - 0.006); g.gain.linearRampToValueAtTime(0, when + sliceLen);
      src.connect(g).connect(this.buses[o.bus ?? 'music']);
      src.start(when, at, sliceLen + 0.01);
    }
  }

  /** Kısa sentez sesi. */
  tone(freq: number, dur: number, o: { type?: OscillatorType; gain?: number; bus?: Bus; attack?: number; slideTo?: number; cutoff?: number; reverb?: number; when?: number; pan?: number } = {}) {
    if (!this.ctx) return;
    const c = this.ctx, when = o.when ?? c.currentTime;
    const osc = c.createOscillator(); osc.type = o.type ?? 'sine';
    osc.frequency.setValueAtTime(freq, when);
    if (o.slideTo) osc.frequency.exponentialRampToValueAtTime(o.slideTo, when + dur);
    const g = c.createGain(); const a = o.attack ?? 0.004;
    g.gain.setValueAtTime(0, when); g.gain.linearRampToValueAtTime(o.gain ?? 0.2, when + a);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    let n: AudioNode = osc.connect(g);
    if (o.cutoff) { const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.cutoff; n = n.connect(f); }
    if (o.pan) { const p = c.createStereoPanner(); p.pan.value = o.pan; n = n.connect(p); }
    n.connect(this.buses[o.bus ?? 'sfx']);
    if (o.reverb) { const s = c.createGain(); s.gain.value = o.reverb; n.connect(s).connect(this.reverbIn); }
    osc.start(when); osc.stop(when + dur + 0.05);
  }

  /** Süzülmüş gürültü patlaması (adım, iniş, tık). */
  noise(dur: number, o: { gain?: number; type?: BiquadFilterType; freq?: number; q?: number; bus?: Bus; attack?: number; when?: number; reverb?: number; pan?: number } = {}) {
    if (!this.ctx) return;
    const c = this.ctx, when = o.when ?? c.currentTime;
    const src = c.createBufferSource(); src.buffer = this.noiseBuf;
    const f = c.createBiquadFilter(); f.type = o.type ?? 'bandpass'; f.frequency.value = o.freq ?? 1000; f.Q.value = o.q ?? 1;
    const g = c.createGain(); const a = o.attack ?? 0.002;
    g.gain.setValueAtTime(0, when); g.gain.linearRampToValueAtTime(o.gain ?? 0.2, when + a);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    let n: AudioNode = src.connect(f).connect(g);
    if (o.pan) { const p = c.createStereoPanner(); p.pan.value = o.pan; n = n.connect(p); }
    n.connect(this.buses[o.bus ?? 'sfx']);
    if (o.reverb) { const s = c.createGain(); s.gain.value = o.reverb; n.connect(s).connect(this.reverbIn); }
    src.start(when, Math.random() * 1.5, dur + 0.05);
  }

  // ---------- Yazı sesleri ----------
  private lastBlip = 0;
  /** Karakterin sesi: yumuşak 8-bit blip. AI: klavye tıkı. */
  blip(kind: 'karakter' | 'ai' | 'eski', ch: string) {
    if (!this.ctx || /\s/.test(ch)) return;
    const n = this.ctx.currentTime;
    if (n - this.lastBlip < 0.028) return;
    this.lastBlip = n;
    if (kind === 'karakter') {
      const base = 'aeıioöuü'.includes(ch.toLowerCase()) ? 330 : 290;
      this.tone(base * (1 + (Math.random() - 0.5) * 0.12), 0.07, { type: 'square', gain: 0.035, bus: 'voice', cutoff: 1800 });
    } else if (kind === 'ai') {
      this.noise(0.018, { gain: 0.07, type: 'bandpass', freq: 3200 + Math.random() * 900, q: 3, bus: 'voice' });
      this.tone(1900 + Math.random() * 200, 0.02, { type: 'sine', gain: 0.012, bus: 'voice' });
    } else {
      this.tone(220, 0.04, { type: 'square', gain: 0.02, bus: 'voice', cutoff: 1200 });
    }
  }

  // ---------- Hareket sesleri ----------
  step(surface: 'cim' | 'tas' | 'tahta' | 'metal' | 'yazi' | 'karanlik', strength = 1) {
    const g = 0.09 * strength;
    switch (surface) {
      case 'cim': this.noise(0.09, { gain: g, type: 'bandpass', freq: 1600 + Math.random() * 600, q: 0.8 }); break;
      case 'tas': this.noise(0.05, { gain: g * 1.1, type: 'bandpass', freq: 900 + Math.random() * 300, q: 1.4 }); this.tone(120, 0.05, { gain: g * 0.5 }); break;
      case 'tahta': this.noise(0.06, { gain: g, type: 'bandpass', freq: 500 + Math.random() * 150, q: 2 }); this.tone(180 + Math.random() * 20, 0.06, { gain: g * 0.6, type: 'triangle' }); break;
      case 'metal': this.noise(0.05, { gain: g * 0.8, type: 'bandpass', freq: 2500, q: 4 }); this.tone(620 + Math.random() * 40, 0.12, { gain: g * 0.15, type: 'sine' }); break;
      case 'yazi': this.tone(880 * (1 + (Math.random() - 0.5) * 0.08), 0.1, { gain: g * 0.25, type: 'sine', reverb: 0.4 }); this.noise(0.02, { gain: g * 0.5, freq: 4000, q: 2 }); break;
      case 'karanlik': this.noise(0.08, { gain: g * 0.7, type: 'lowpass', freq: 600, q: 0.5, reverb: 0.8 }); break;
    }
  }
  jump() { this.noise(0.18, { gain: 0.05, type: 'bandpass', freq: 700, q: 0.6, attack: 0.03 }); }
  land(strength: number) {
    const s = clamp(strength, 0.2, 1.5);
    this.tone(90, 0.12, { gain: 0.12 * s, type: 'sine', slideTo: 50 });
    this.noise(0.1, { gain: 0.08 * s, type: 'lowpass', freq: 900 });
  }

  // ---------- Ortam döngüleri ----------
  ambience(name: 'ruzgar' | 'ugultu' | 'bosluk' | 'yaprak' | 'gece', level: number, fade = 2) {
    if (!this.ctx) return;
    const c = this.ctx;
    let a = this.ambNodes[name];
    if (!a) {
      const gain = c.createGain(); gain.gain.value = 0; gain.connect(this.buses.amb);
      const stops: (() => void)[] = [];
      const noiseSrc = (type: BiquadFilterType, freq: number, q: number, lfoRate = 0, lfoDepth = 0, g = 1) => {
        const s = c.createBufferSource(); s.buffer = this.noiseBuf; s.loop = true;
        const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
        const gg = c.createGain(); gg.gain.value = g;
        s.connect(f).connect(gg).connect(gain);
        if (lfoRate) {
          const l = c.createOscillator(); l.frequency.value = lfoRate;
          const ld = c.createGain(); ld.gain.value = lfoDepth; l.connect(ld).connect(f.frequency); l.start(); stops.push(() => l.stop());
          const l2 = c.createOscillator(); l2.frequency.value = lfoRate * 0.37;
          const ld2 = c.createGain(); ld2.gain.value = g * 0.45; l2.connect(ld2).connect(gg.gain); l2.start(); stops.push(() => l2.stop());
        }
        s.start(0, Math.random()); stops.push(() => s.stop());
      };
      if (name === 'ruzgar') { noiseSrc('bandpass', 420, 0.7, 0.09, 260, 0.6); noiseSrc('highpass', 4200, 0.3, 0.05, 900, 0.06); }
      if (name === 'yaprak') { noiseSrc('bandpass', 2600, 1.2, 0.21, 900, 0.18); }
      if (name === 'bosluk') {
        noiseSrc('lowpass', 140, 0.6, 0.03, 40, 0.5);
        for (const f of [43.65, 65.4]) { // Fa ve Do: 2023 parçasının tonu
          const o = c.createOscillator(); o.frequency.value = f; o.type = 'sine';
          const g = c.createGain(); g.gain.value = 0.08; o.connect(g).connect(gain); o.start(); stops.push(() => o.stop());
        }
      }
      if (name === 'ugultu') {
        for (const [f, gv] of [[50, 0.05], [100, 0.035], [150, 0.012], [200, 0.008]] as [number, number][]) {
          const o = c.createOscillator(); o.frequency.value = f; const g = c.createGain(); g.gain.value = gv;
          o.connect(g).connect(gain); o.start(); stops.push(() => o.stop());
        }
        noiseSrc('bandpass', 7000, 2, 0.13, 1500, 0.025);
      }
      if (name === 'gece') { noiseSrc('bandpass', 300, 0.5, 0.05, 120, 0.4); }
      a = { gain, stop: () => stops.forEach(s => { try { s(); } catch { /* */ } }) };
      this.ambNodes[name] = a;
    }
    const n = c.currentTime;
    a.gain.gain.cancelScheduledValues(n); a.gain.gain.setValueAtTime(a.gain.gain.value, n);
    a.gain.gain.linearRampToValueAtTime(level, n + Math.max(0.01, fade));
  }
  stopAllAmbience(fade = 1.5) { for (const k of Object.keys(this.ambNodes)) this.ambience(k as any, 0, fade); }

  /** Müzik otobüsüne alçak geçiren (bellek/su altı hissi) uygular. */
  private musicLP: BiquadFilterNode | null = null;
  musicMuffle(hz: number, time = 1) {
    const c = this.ctx;
    if (!this.musicLP) {
      this.musicLP = c.createBiquadFilter(); this.musicLP.type = 'lowpass'; this.musicLP.frequency.value = 20000;
      this.buses.music.disconnect(); this.buses.music.connect(this.musicLP).connect(this.master);
    }
    const n = c.currentTime;
    this.musicLP.frequency.cancelScheduledValues(n); this.musicLP.frequency.setValueAtTime(this.musicLP.frequency.value, n);
    this.musicLP.frequency.exponentialRampToValueAtTime(hz, n + time);
  }
  setBus(b: Bus, v: number, time = 0.5) {
    const g = this.buses[b].gain, n = this.ctx.currentTime;
    g.cancelScheduledValues(n); g.setValueAtTime(g.value, n); g.linearRampToValueAtTime(v, n + time);
  }
}

export const audio = new AudioSys();
