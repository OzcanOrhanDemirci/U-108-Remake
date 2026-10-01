// Koddan üretilen müzik. 2023 parçası Fa minör (≈52 vuruş/dk); yeni müzik aynı tonda (Fa minör / La bemol majör)
// kurulur ki eski piyano geri döndüğünde aynı ailenin sesi gibi duyulsun.
import { audio } from './audio';
import { rng } from './math';

const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

/** Keçe piyano: kısmi sinüsler + kararan alçak geçiren + çekiç tıkı. */
export function piano(midi: number, when: number, vel = 0.5, o: { len?: number; reverb?: number; bright?: number; gain?: number; pan?: number } = {}) {
  const c = audio.ctx; if (!c) return;
  const f0 = mtof(midi);
  const out = c.createGain(); out.gain.value = (o.gain ?? 1) * 0.16 * vel;
  const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 0.4;
  const bright = o.bright ?? 1;
  const fStart = Math.min(16000, f0 * (3 + vel * 7 * bright));
  lp.frequency.setValueAtTime(fStart, when);
  lp.frequency.exponentialRampToValueAtTime(Math.max(200, f0 * 1.6), when + 1.6);
  const pan = c.createStereoPanner(); pan.pan.value = o.pan ?? Math.max(-0.6, Math.min(0.6, (midi - 62) / 40));
  out.connect(lp).connect(pan).connect(audio.buses.music);
  const send = c.createGain(); send.gain.value = o.reverb ?? 0.5; pan.connect(send).connect(audio.reverbIn);
  const baseDecay = Math.max(1.2, 6.5 - (midi - 30) * 0.075) * (o.len ?? 1);
  const amps = [1, 0.42, 0.22, 0.12, 0.06, 0.035];
  const B = 0.00035;
  for (let n = 1; n <= amps.length; n++) {
    const fn = n * f0 * Math.sqrt(1 + B * n * n);
    if (fn > 15000) break;
    const osc = c.createOscillator(); osc.type = 'sine'; osc.frequency.value = fn;
    osc.detune.value = (Math.random() - 0.5) * 3;
    const g = c.createGain();
    const T = baseDecay / (1 + 0.55 * (n - 1));
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(amps[n - 1], when + 0.004 + 0.002 * n);
    g.gain.setTargetAtTime(amps[n - 1] * 0.35, when + 0.01, T * 0.12);
    g.gain.setTargetAtTime(0.00001, when + 0.15, T * 0.45);
    osc.connect(g).connect(out);
    osc.start(when); osc.stop(when + T * 2.2 + 0.2);
  }
  audio.noise(0.025, { gain: 0.02 * vel, type: 'bandpass', freq: 2400, q: 1.2, when, bus: 'music' });
}

/** Yumuşak ped: iki detune testere + alçak geçiren, uzun giriş/çıkış. */
export function pad(midis: number[], when: number, dur: number, o: { gain?: number; cutoff?: number; reverb?: number } = {}) {
  const c = audio.ctx; if (!c) return;
  const out = c.createGain();
  const g = (o.gain ?? 0.04);
  out.gain.setValueAtTime(0, when);
  out.gain.linearRampToValueAtTime(g, when + Math.min(2.5, dur * 0.4));
  out.gain.setValueAtTime(g, when + dur * 0.65);
  out.gain.linearRampToValueAtTime(0, when + dur);
  const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = o.cutoff ?? 900; lp.Q.value = 0.3;
  out.connect(lp).connect(audio.buses.music);
  const send = c.createGain(); send.gain.value = o.reverb ?? 0.7; lp.connect(send).connect(audio.reverbIn);
  for (const m of midis) for (const d of [-7, 7]) {
    const osc = c.createOscillator(); osc.type = 'sawtooth'; osc.frequency.value = mtof(m); osc.detune.value = d;
    const gg = c.createGain(); gg.gain.value = 1 / midis.length;
    osc.connect(gg).connect(out); osc.start(when); osc.stop(when + dur + 0.1);
  }
}

// La bemol majör / Fa minör akorları (MIDI)
const CH: Record<string, number[]> = {
  Ab: [44, 51, 56, 60, 63], Eb: [39, 46, 51, 55, 58], EbG: [43, 46, 51, 55, 58], Fm: [41, 48, 53, 56, 60],
  Db: [37, 44, 49, 53, 56], Bbm: [34, 41, 46, 49, 53], Cm: [36, 43, 48, 51, 55], Gb: [42, 49, 54, 58, 61],
  AbC: [48, 51, 56, 60, 63], FmEb: [39, 48, 53, 56, 60], C: [36, 43, 48, 52, 55], Dbmaj7: [37, 44, 48, 53, 56],
  Fsus: [41, 48, 53, 55, 60],
};
const PENTA = [56, 58, 60, 63, 65, 68, 70, 72, 75, 77]; // La♭ pentatonik

export type Piece = 'orman' | 'karanlik' | 'sonbahar' | 'laboratuvar' | 'dogus' | 'ziyaret' | 'sessiz';

class Sequencer {
  piece: Piece = 'sessiz';
  private next = 0; // bir sonraki planlanacak zaman (ctx saniyesi)
  private bar = 0;
  private r = rng(108);
  level = 1;
  private timer = 0;

  play(p: Piece, startDelay = 0.3) {
    this.piece = p; this.bar = 0; this.r = rng(108 + p.length);
    this.next = audio.now + startDelay;
    audio.setBus('music', 0.85, 0.5);
  }
  stop() { this.piece = 'sessiz'; }

  /** Test: verilen zamana kadar her şeyi önceden planla (çevrimdışı ölçüm). */
  scheduleUntil(t: number) {
    while (this.piece !== 'sessiz' && this.next < t) { const d = this.scheduleBar(this.piece, this.next, this.bar); this.next += d; this.bar++; }
  }

  /** Her karede çağrılır; 0,4 sn ileriyi planlar. */
  update() {
    if (this.piece === 'sessiz' || !audio.ctx) return;
    while (this.next < audio.now + 0.4) {
      const dur = this.scheduleBar(this.piece, this.next, this.bar);
      this.next += dur; this.bar++;
    }
  }

  /** Bir ölçüyü planlar, süresini döner. */
  private scheduleBar(p: Piece, t: number, bar: number): number {
    const r = this.r, L = this.level;
    if (p === 'orman') {
      const prog = ['Ab', 'EbG', 'Fm', 'Db', 'Ab', 'EbG', 'Db', 'Eb'];
      const ch = CH[prog[bar % prog.length]];
      const beat = 60 / 54, e = beat / 2;
      piano(ch[0] - 12 >= 28 ? ch[0] - 12 : ch[0], t, 0.42 * L, { len: 1.4, reverb: 0.55 });
      const arp = [ch[1], ch[2], ch[3], ch[2], ch[4], ch[3], ch[2], ch[3]];
      arp.forEach((m, i) => piano(m, t + i * e + (r() - 0.5) * 0.012, (0.18 + (i % 4 === 0 ? 0.08 : 0)) * L, { reverb: 0.6 }));
      if (bar % 2 === 1 || r() < 0.4) {
        const mel = PENTA.filter(m => m >= 63 && m <= 77);
        const n = 1 + Math.floor(r() * 3);
        for (let i = 0; i < n; i++) piano(r.pick(mel), t + (2 + i * 1.5 + r() * 0.5) * e, 0.22 * L, { reverb: 0.75, bright: 0.8 });
      }
      if (bar % 4 === 0) pad([ch[0], ch[2], ch[3]], t, beat * 16, { gain: 0.025 * L, cutoff: 700 });
      return beat * 4;
    }
    if (p === 'karanlik') {
      const notes = [29, 36, 41, 32, 37, 34];
      const beat = 60 / 40;
      piano(notes[bar % notes.length], t, 0.35 * L, { len: 2.2, reverb: 0.9, bright: 0.6 });
      if (r() < 0.45) piano(r.pick([72, 75, 77, 80, 84]), t + beat * (1.5 + r() * 1.5), 0.12 * L, { reverb: 1, bright: 0.5 });
      if (bar % 3 === 0) pad([41, 48, 56], t, beat * 12, { gain: 0.018 * L, cutoff: 450, reverb: 0.9 });
      return beat * 4;
    }
    if (p === 'sonbahar') {
      const prog = ['Db', 'AbC', 'Bbm', 'Gb', 'Db', 'AbC', 'Fm', 'Eb'];
      const ch = CH[prog[bar % prog.length]];
      const beat = 60 / 58, tr = beat / 3;
      piano(ch[0], t, 0.4 * L, { len: 1.5, reverb: 0.6 });
      for (let b = 0; b < 4; b++) {
        const tri = [ch[2], ch[3], ch[4]];
        if (b % 2 === 1) tri.reverse();
        tri.forEach((m, i) => piano(m, t + b * beat + i * tr + (r() - 0.5) * 0.01, (0.15 + (i === 0 ? 0.05 : 0)) * L, { reverb: 0.6 }));
      }
      if (r() < 0.6) piano(r.pick([68, 70, 72, 73, 75, 77]), t + beat * (1 + Math.floor(r() * 3)), 0.24 * L, { reverb: 0.8 });
      if (bar % 4 === 0) pad([ch[0] + 12, ch[2], ch[3]], t, beat * 16, { gain: 0.022 * L, cutoff: 800 });
      return beat * 4;
    }
    if (p === 'laboratuvar') {
      const prog = ['Fm', 'FmEb', 'Db', 'C'];
      const ch = CH[prog[bar % prog.length]];
      const beat = 60 / 104, e = beat / 2;
      piano(ch[0], t, 0.32 * L, { len: 0.9, reverb: 0.4 });
      for (let i = 0; i < 8; i++) {
        const m = i % 2 === 0 ? ch[3] : ch[2];
        piano(m + (i === 6 ? 12 : 0), t + i * e, (i % 4 === 0 ? 0.2 : 0.12) * L, { len: 0.35, reverb: 0.35, bright: 0.7 });
      }
      if (bar % 2 === 1 && r() < 0.7) piano(r.pick([72, 75, 77, 79, 80]), t + e * 5, 0.18 * L, { reverb: 0.7 });
      if (bar % 4 === 0) pad([ch[0], ch[2]], t, beat * 16, { gain: 0.02 * L, cutoff: 500 });
      return beat * 4;
    }
    if (p === 'ziyaret') {
      const prog = ['Db', 'Ab', 'Fm', 'Eb'];
      const ch = CH[prog[bar % prog.length]];
      const beat = 60 / 48;
      piano(ch[0], t, 0.3 * L, { len: 1.8, reverb: 0.8 });
      [ch[2], ch[3], ch[4]].forEach((m, i) => piano(m, t + beat * (1 + i) + r() * 0.03, 0.14 * L, { reverb: 0.8 }));
      if (r() < 0.5) piano(r.pick(PENTA.slice(3)), t + beat * 3.2, 0.16 * L, { reverb: 0.9 });
      return beat * 4;
    }
    return 2;
  }
}

export const music = new Sequencer();

/** Yeniden doğuş kabarması: hızlanan arpejler, sonunda geniş La♭ majör. Toplam süreyi döner. */
export function dogusSwell(when: number) {
  const prog = ['Fm', 'Db', 'Ab', 'Eb', 'Fm', 'Db', 'Eb', 'Eb'];
  let t = when;
  let step = 0.32;
  prog.forEach((name, i) => {
    const ch = CH[name];
    const notes = [ch[1], ch[2], ch[3], ch[4], ch[3] + 12, ch[4] + 12];
    notes.forEach((m, j) => piano(m, t + j * step, 0.14 + i * 0.03, { reverb: 0.8 }));
    piano(ch[0], t, 0.3 + i * 0.03, { len: 1.3, reverb: 0.7 });
    t += step * notes.length;
    step *= 0.9;
  });
  // çözülme
  const res = [32, 44, 51, 56, 60, 63, 68, 72, 75];
  res.forEach((m, i) => piano(m, t + i * 0.035, 0.4, { len: 2.5, reverb: 1, bright: 1.1 }));
  pad([44, 51, 56, 60, 63], t, 10, { gain: 0.045, cutoff: 1400, reverb: 0.9 });
  return t - when;
}
