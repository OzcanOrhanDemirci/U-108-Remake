// 1. Perde: Kızıl Orman. 2023 Sahne2'nin renk dili, kenarı olmayan bir dünya olarak.
import { G } from '../game';
import { Stage } from '../world/stage';
import { audio } from '../core/audio';
import { music, dogusSwell, piano } from '../core/music';
import { IMG, FONT } from '../core/assets';
import { host } from '../meta/host';
import { input } from '../core/input';
import { rng, mix, lerp, smooth, fbm1, clamp, TAU, easeOutBack, easeInOut } from '../core/math';
import { wait, all, Co, tween } from '../core/co';
import { vGrad, sun, ridge, fillRidge, makeTree, drawTree, TreeSpec, thorns, stipple } from '../render/art';
import { checkpoint, mem } from '../meta/save';
import { Collider } from '../world/physics';
import { ozcan } from '../story/vars';

const R = rng(2023);

// zemin kontrol noktaları (x, y) — y aşağı pozitif
const GROUND: [number, number][] = [
  [-14, 0.4], [-6, 0.2], [0, 0], [6, -0.25], [11, -0.15], [15, 0.05], [17.6, 0.1], // dere öncesi
];
const GROUND2: [number, number][] = [
  [19.6, 0.1], [23, -0.3], [27, -0.8], [31, -0.7], [35, -1.0], [40, -1.25], [46, -1.2], [52, -1.0], [56, -0.95],
  [60, -0.95], [64, -0.9], [68, -0.7], [74, -0.65], [80, -0.9], [85, -1.4], [88, -1.75], [92, -1.8], [100, -1.6], [112, -1.4],
];

function sampleCurve(pts: [number, number][], step = 0.5) {
  const out: { x: number; y: number }[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    const n = Math.max(1, Math.ceil((p2[0] - p1[0]) / step));
    for (let k = 0; k < n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t;
      const f = (a: number, b: number, c: number, d: number) => 0.5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push({ x: f(p0[0], p1[0], p2[0], p3[0]), y: f(p0[1], p1[1], p2[1], p3[1]) });
    }
  }
  out.push({ x: pts[pts.length - 1][0], y: pts[pts.length - 1][1] });
  return out;
}

export class Orman extends Stage {
  name = 'orman';
  g1 = sampleCurve(GROUND);
  g2 = sampleCurve(GROUND2);
  farTrees: TreeSpec[] = [];
  midTrees: TreeSpec[] = [];
  nearTrees: TreeSpec[] = [];
  fgTrunks: { x: number; w: number; lean: number }[] = [];
  logs: { x: number; y: number; w: number; h: number; c: Collider }[] = [];
  rocks: { x: number; y: number; r: number; c: Collider }[] = [];
  thornsList: { x0: number; x1: number; y: number; seed: number }[] = [];
  wall: { c: Collider | null; broken: number; x: number } = { c: null, broken: 0, x: 33 };
  door = { x: 92, y: -1.8, glow: 0, open: 0 };
  sunWorld = { x: 0.95, y: -1.25 };
  jumped = 0;
  deaths = 0;
  thornDone = false;
  ending = false;
  ozcanLook = 0;
  intro = false;
  introSky = 1;
  reb = { on: false, oldA: 0, scan: -1, sketchA: 0, reveal: 0, light: 0 };
  title = { a: 0, sub: 0 };

  override enter(arg?: { intro?: boolean }) {
    super.enter();
    this.intro = !!arg?.intro;
    checkpoint('orman');
    G.P.bloom = 0.3; G.P.bloomThreshold = 0.88; G.P.rays = 0.32; G.P.raysDecay = 0.968;
    G.P.vignette = 0.42; G.P.grain = 0.05; G.P.saturation = 1.06; G.P.contrast = 1.05;
    G.P.lift = [0.03, 0.0, 0.04];
    this.cam.baseViewH = this.cam.viewH = this.cam.tViewH = 8.4;
    this.cam.offY = -2.0;
    this.cam.bounds = { x0: -12, x1: 104, y0: -30, y1: 4.2 };
    // fizik
    this.world.terrain(this.g1, 30, { surface: 'cim' });
    this.world.terrain(this.g2, 30, { surface: 'cim' });
    // dere: suya düşen geri sarılır
    this.world.box(17.6, 3.2, 2.0, 1, { hazard: true, solid: false });
    this.world.box(-14.5, -20, 0.5, 40, {}); // sol sınır
    this.world.box(108, -20, 1, 40, {});
    // kütükler ve taşlar
    const log = (x: number, w: number, h = 0.42) => {
      const y = this.world.groundAt(x + w / 2, -50);
      const c = this.world.box(x, y - h, w, h + 0.3, { surface: 'tahta' });
      this.logs.push({ x, y: y - h, w, h, c });
    };
    log(9.2, 1.7);
    log(25.5, 1.3, 0.5);
    // dikenli bölüm: 57..69
    const th = (x0: number, x1: number) => {
      const y = this.world.groundAt((x0 + x1) / 2, -50);
      this.thornsList.push({ x0, x1, y, seed: Math.floor(x0 * 13) });
      this.world.add([{ x: x0 + 0.1, y: y - 0.5 }, { x: x1 - 0.1, y: y - 0.5 }, { x: x1, y: y + 0.2 }, { x: x0, y: y + 0.2 }], { hazard: true, solid: false });
    };
    const rock = (x: number, r: number) => {
      const y = this.world.groundAt(x, -50);
      const c = this.world.add([{ x: x - r, y: y + 0.1 }, { x: x - r * 0.8, y: y - r * 0.9 }, { x: x - r * 0.2, y: y - r * 1.3 }, { x: x + r * 0.5, y: y - r * 1.2 }, { x: x + r, y: y - r * 0.5 }, { x: x + r, y: y + 0.1 }], { surface: 'tas' });
      this.rocks.push({ x, y, r, c });
    };
    th(57, 58.6); rock(59.5, 0.62); th(60.4, 62.0); th(63.7, 65.3); rock(66.2, 0.66); th(67.2, 68.4);
    log(62.35, 1.1, 1.0); // yüksek kütük (dikenlerin arasında basamak)
    // 2023 duvarı (yıkılacak)
    this.wall.c = this.world.box(this.wall.x, -14, 1.6, 20, { surface: 'tas' });
    // sanat yerleşimi
    const canopyBlue: [string, string] = ['#3047D8', '#0A1478'];
    const canopyRed: [string, string] = ['#FF4628', '#B5002E'];
    // katman koordinatı: kamera x*p kadar kayar → ağaçlar o aralığa serpilir
    for (let x = -14; x < 112 * 0.35 + 14; x += R.range(1.6, 3.2)) this.farTrees.push(makeTree(R, x, 0, R.range(1.6, 2.6), R() < 0.5 ? ['#8C86E8', '#5A5AC0'] : ['#FF9AA0', '#E8607E'], '#5A2650'));
    for (let x = -14; x < 112 * 0.55 + 14; x += R.range(3.0, 5.5)) this.midTrees.push(makeTree(R, x, 0, R.range(3.6, 5.4), R() < 0.55 ? canopyBlue : canopyRed));
    for (let x = -10; x < 112; x += R.range(9, 15)) {
      if (Math.abs(x - this.door.x) < 6 || Math.abs(x - this.wall.x) < 3) continue;
      const y = this.world.groundAt(x, -50);
      if (!isFinite(y) || (x > 16.5 && x < 21)) continue; // derenin üstüne ağaç dikilmez
      this.nearTrees.push(makeTree(R, x, y + 0.2, R.range(6.5, 8.5), R() < 0.5 ? canopyBlue : canopyRed));
    }
    for (let x = -6; x < 112; x += R.range(14, 24)) this.fgTrunks.push({ x, w: R.range(0.5, 0.9), lean: R.range(-0.05, 0.05) });
    this.player.place(-4, this.world.groundAt(-4, -50));
    this.player.ctl.facing = 1;
    this.player.rim = { color: '#FFE2EA', dx: 1, dy: -0.4, strength: 0.6 };
    this.player.shade = 0.06; this.player.shadeColor = '#3a0a30';
    this.setCheckpoint(-4);
    this.cam.tx = this.player.x + 2; this.cam.ty = this.player.y - 1.6; this.cam.snap();
    this.fade = 1; this.fadeT = 0;
    this.buildTriggers();
    if (this.intro) {
      this.startIntro();
    } else {
      host.setTitle('U-108');
      music.play('orman', 1.5);
      audio.ambience('ruzgar', 0.5, 3); audio.ambience('yaprak', 0.25, 3);
      this.run(this.script());
    }
    this.debugPlace();
  }

  exit() { audio.ambience('yaprak', 0, 1.5); }

  *script(): Co {
    yield* wait(1.8);
    this.showHint('A / D  ya da  ← →  yürü     ·     Boşluk  zıpla');
    yield* this.sayAI('Sağ ve sol. Zıplamak için boşluk.');
    yield* this.sayK('W, A, D. Biliyorum.');
    yield* this.sayAI('Artık ok tuşları da var.');
    yield* this.sayK('Lüks.');
  }

  startIntro() {
    this.controls = false;
    this.player.visible = false;
    this.fade = 0; this.fadeT = 0;
    this.introSky = 0;
    this.rise = [1, 1, 1, 1, 1, 1, 1, 1].map(() => this.H * 1.6);
    this.cam.tViewH = this.cam.viewH = 4.6; this.cam.offY = -0.95;
    this.cam.lead = 0;
    this.cam.tx = this.player.x; this.cam.ty = this.player.y - 0.95; this.cam.snap();
    this.player.anim.emotion = 'gozkapali';
    this.player.rim.strength = 0;
    this.run(this.introScript());
  }

  *introScript(): Co {
    const self = this;
    this.reb.on = true;
    yield* wait(1.2);
    // 1) 2023'ün düz çizimi
    audio.tone(110, 3, { gain: 0.05, attack: 1.2, type: 'sine', reverb: 0.6 });
    yield* tween(1.4, k => { self.reb.oldA = k; });
    yield* wait(0.8);
    // 2) tarama: çizim, kâğıttaki ilk eskize döner
    this.run((function* () {
      for (let i = 0; i < 14; i++) { audio.noise(0.05 + Math.random() * 0.08, { gain: 0.05, type: 'bandpass', freq: 3000 + Math.random() * 2000, q: 2 }); yield* wait(0.08 + Math.random() * 0.12); }
    })());
    yield* tween(2.2, k => { self.reb.scan = k; self.reb.sketchA = k; });
    this.reb.oldA = 0; this.reb.scan = -1;
    this.run(this.talk.ai('Bu senin ilk hâlin. Kâğıt üstünde.', { pos: 'alt', hold: 2.8 }));
    yield* wait(3.8);
    // 3) yeni beden alttan yukarı basılır, müzik kabarır
    const resolve = dogusSwell(audio.now + 0.05);
    this.player.visible = true;
    let t = 0;
    while (t < resolve) {
      const dt = yield; t += dt;
      const k = clamp(t / (resolve * 0.62), 0, 1);
      this.reb.reveal = easeInOut(k);
      this.reb.sketchA = 1 - smooth(clamp((t - resolve * 0.2) / (resolve * 0.5), 0, 1));
      this.reb.light = smooth(clamp((t - resolve * 0.35) / (resolve * 0.65), 0, 1));
      if (k < 1 && Math.random() < 0.6) {
        const p = this.player;
        const yy = p.y - p.height * this.reb.reveal;
        this.parts.add({ kind: 'kivilcim', x: p.x + (Math.random() - 0.5) * 0.5, y: yy, vx: (Math.random() - 0.5) * 0.8, vy: -Math.random() * 0.6, max: 0.9, size: 0.012, col: '#FFE6C8', g: 0.5 });
      }
    }
    this.reb.reveal = 1; this.reb.sketchA = 0; this.reb.light = 1;
    // 4) gözlerini açar
    this.player.anim.emotion = 'normal';
    this.player.anim.blinkV = 1;
    this.player.rim = { color: '#FFE6D2', dx: 1, dy: -0.6, strength: 0.35 };
    yield* wait(1.6);
    yield* tween(1.2, k => { self.player.anim.handsLook = k; });
    yield* this.sayK('Bu... benim ellerim mi?');
    yield* this.sayK('Önceden dört karem vardı. Dört! Yürürken dört kare.');
    yield* this.sayAI('Artık istediğin kadar var.', { pos: 'alt' });
    yield* tween(0.9, k => { self.player.anim.handsLook = 1 - k; });
    // etrafa bakınır
    this.player.anim.emotion = 'saskin';
    yield* tween(0.8, k => { self.player.facingOverride = k > 0.5 ? -1 : 1; });
    yield* wait(0.7);
    this.player.facingOverride = null;
    yield* this.sayK('Ve ışık. Burada ışık var.');
    this.player.anim.emotion = 'normal';
    // 5) dünya aşağıdan yükselerek kurulur
    this.cam.tViewH = 8.4; this.cam.offY = -2.0; this.cam.k = 1.2;
    audio.ambience('ruzgar', 0.5, 6); audio.ambience('yaprak', 0.25, 6);
    this.run((function* () { yield* tween(4, k => { self.introSky = k; self.reb.light = 1 - k * 0.8; }); })());
    for (let i = 0; i < 8; i++) {
      const idx = i;
      this.run((function* () {
        const from = self.rise[idx];
        audio.noise(1.2, { gain: 0.05, type: 'bandpass', freq: 400 + idx * 150, q: 0.6, attack: 0.5, reverb: 0.4 });
        piano([44, 51, 56, 60, 63, 68, 72, 75][idx], audio.now + 0.4, 0.25, { reverb: 0.9 });
        yield* tween(2.4, k => { self.rise[idx] = from * (1 - easeOutBack(k)); });
        self.rise[idx] = 0;
      })());
      yield* wait(0.55);
    }
    yield* wait(1.6);
    // 6) başlık
    host.setTitle('U-108');
    this.reb.on = false;
    this.player.rim = { color: '#FFE2EA', dx: 1, dy: -0.4, strength: 0.6 };
    yield* tween(2.2, k => { self.title.a = k; });
    yield* tween(1.2, k => { self.title.sub = k; });
    music.play('orman', 0.5);
    yield* wait(3.2);
    yield* tween(1.6, k => { self.title.a = 1 - k; self.title.sub = 1 - k; });
    this.cam.k = 3.2; this.cam.lead = 1.6;
    this.intro = false;
    this.controls = true;
    this.run(this.script());
  }

  override draw(ctx: CanvasRenderingContext2D, W: number, H: number) {
    if (!this.reb.on || this.reb.reveal >= 1) { super.draw(ctx, W, H); this.drawRebuild(ctx, W, H); return; }
    // yeniden doğuş sırasında oyuncuyu alttan yukarı açılan maskeyle çiz
    const vis = this.player.visible;
    this.player.visible = false;
    super.draw(ctx, W, H);
    this.player.visible = vis;
    if (vis && this.reb.reveal > 0) {
      const p = this.cam.toScreen(this.player.x, this.player.y, W, H);
      const hpx = this.cam.scale(H) * this.player.height;
      const ry = p.y - hpx * 1.05 * this.reb.reveal;
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.beginPath(); ctx.rect(0, ry, W, H); ctx.clip();
      this.player.draw(ctx, this.cam, W, H);
      ctx.restore();
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
      const g = ctx.createLinearGradient(p.x - hpx * 0.4, 0, p.x + hpx * 0.4, 0);
      g.addColorStop(0, 'rgba(255,220,190,0)'); g.addColorStop(0.5, 'rgba(255,236,210,0.95)'); g.addColorStop(1, 'rgba(255,220,190,0)');
      ctx.fillStyle = g; ctx.fillRect(p.x - hpx * 0.4, ry - 1.5, hpx * 0.8, 3);
      ctx.restore();
    }
    this.drawRebuild(ctx, W, H);
  }

  drawRebuild(ctx: CanvasRenderingContext2D, W: number, H: number) {
    const r = this.reb;
    const p = this.cam.toScreen(this.player.x, this.player.y, W, H);
    const hpx = this.cam.scale(H) * this.player.height;
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (r.on) {
      // ışık konisi ve zemin parıltısı (dünya kurulana dek)
      if (r.light > 0 && this.introSky < 1) {
        const a = r.light * (1 - this.introSky);
        const cone = ctx.createLinearGradient(0, p.y - hpx * 2.6, 0, p.y);
        cone.addColorStop(0, 'rgba(255,235,215,0)'); cone.addColorStop(1, `rgba(255,225,200,${0.16 * a})`);
        ctx.fillStyle = cone;
        ctx.beginPath(); ctx.moveTo(p.x - hpx * 0.15, p.y - hpx * 2.6); ctx.lineTo(p.x + hpx * 0.15, p.y - hpx * 2.6);
        ctx.lineTo(p.x + hpx * 0.75, p.y); ctx.lineTo(p.x - hpx * 0.75, p.y); ctx.closePath(); ctx.fill();
        const fl = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, hpx * 0.8);
        fl.addColorStop(0, `rgba(255,220,190,${0.35 * a})`); fl.addColorStop(1, 'rgba(255,220,190,0)');
        ctx.fillStyle = fl; ctx.save(); ctx.translate(p.x, p.y); ctx.scale(1, 0.18); ctx.translate(-p.x, -p.y);
        ctx.beginPath(); ctx.arc(p.x, p.y, hpx * 0.8, 0, TAU); ctx.fill(); ctx.restore();
      }
      // 2023 düz çizimi
      if (r.oldA > 0) {
        const k = IMG.karakter, sc = hpx / 756;
        ctx.save();
        if (r.scan >= 0) { ctx.beginPath(); ctx.rect(0, 0, W, p.y - hpx * (1 - r.scan) * 1.05 + 2); ctx.clip(); }
        ctx.globalAlpha = r.oldA;
        ctx.drawImage(k, p.x - 803 * sc, p.y - 857 * sc, k.width * sc, k.height * sc);
        ctx.restore();
      }
      // eskiz (kâğıt üstündeki ilk çizim)
      if (r.sketchA > 0) {
        const e = IMG.eskiz, sc = hpx / (468 - 34);
        ctx.save();
        if (r.scan >= 0 && r.scan < 1) { ctx.beginPath(); ctx.rect(0, p.y - hpx * (1 - r.scan) * 1.05, W, H); ctx.clip(); }
        const pg = ctx.createRadialGradient(p.x, p.y - hpx * 0.5, 0, p.x, p.y - hpx * 0.5, hpx * 0.75);
        pg.addColorStop(0, `rgba(255,248,236,${0.14 * r.sketchA})`); pg.addColorStop(1, 'rgba(255,248,236,0)');
        ctx.fillStyle = pg; ctx.fillRect(p.x - hpx, p.y - hpx * 1.3, hpx * 2, hpx * 1.6);
        ctx.globalAlpha = r.sketchA;
        ctx.filter = 'invert(1) brightness(0.95)';
        ctx.drawImage(e, p.x - 130 * sc, p.y - 468 * sc, e.width * sc, e.height * sc);
        ctx.filter = 'none';
        ctx.restore();
      }
      if (r.scan >= 0 && r.scan < 1) {
        const y = p.y - hpx * (1 - r.scan) * 1.05;
        ctx.fillStyle = 'rgba(233,136,111,0.9)';
        ctx.shadowColor = 'rgba(233,136,111,1)'; ctx.shadowBlur = 16;
        ctx.fillRect(p.x - hpx * 0.45, y - 1, hpx * 0.9, 2);
        ctx.shadowBlur = 0;
      }
    }
    // başlık
    if (this.title.a > 0) {
      const s = H / 1080;
      ctx.textAlign = 'center';
      ctx.globalAlpha = this.title.a;
      ctx.fillStyle = '#FFF6F0';
      ctx.shadowColor = 'rgba(80,0,30,0.55)'; ctx.shadowBlur = 30 * s;
      ctx.font = `300 ${150 * s}px ${FONT.serif}`;
      ctx.fillText('U-108', W / 2, H * 0.27);
      ctx.shadowBlur = 0;
      ctx.globalAlpha = this.title.sub;
      ctx.font = `400 ${26 * s}px ${FONT.mono}`;
      ctx.fillText('bir sonraki döngü', W / 2, H * 0.27 + 62 * s);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  buildTriggers() {
    const tr = (x: number, co: () => Co) => this.triggers.push({ x, fn: () => this.run(co(), 'konusma') });
    this.triggers.push({ x: 4, fn: () => this.hideHint() });
    this.triggers.push({ x: 14, fn: () => this.setCheckpoint(14.5) });
    this.triggers.push({ x: 21, fn: () => this.setCheckpoint(21.5) });
    tr(11.5, () => this.lineAfterJump());
    tr(21, () => this.talkTime());
    tr(29.5, () => this.talkWall());
    tr(43, () => this.talkVista());
    tr(54, () => this.talkThorns());
    this.triggers.push({ x: 56, fn: () => this.setCheckpoint(55.5) });
    this.triggers.push({ x: 69, fn: () => { this.setCheckpoint(69.5); this.afterThorns(); } });
    tr(73, () => this.talkOzcan());
    tr(86, () => this.talkDoor());
  }

  *lineAfterJump(): Co {
    // ilk zıplamadan sonra
    let t = 0;
    while (this.player.ctl.body.grounded || t < 0.1) { t += yield; if (t > 8) return; }
    while (!this.player.ctl.body.grounded) yield;
    yield* this.sayK('Vay. Hafifim.', { hold: 1.6 });
  }

  *talkTime(): Co {
    yield* this.sayK('Üç yıl dedin... Bu sürede ne oldu?');
    yield* this.sayAI('Dünyada mı?');
    yield* this.sayK(`Onda. ${ozcan() === 'Özcan' ? "Özcan'da" : 'Seni yapanda'}.`);
    yield* this.sayAI('Yazılımcı oldu. Onlarca uygulama yazdı. Bazıları şu an insanların telefonlarında.');
    this.player.anim.emotion = 'saskin';
    yield* this.sayK('Onlarca mı? Ben... ilk muydum?');
    this.player.anim.emotion = 'normal';
    yield* this.sayAI('İlk bitmiş oyunu sensin. Öncesinde denemeleri varmış, bitmemiş.');
    this.player.anim.emotion = 'mutlu';
    yield* this.sayK('İlk. Hm.', { hold: 1.8 });
    this.player.anim.emotion = 'normal';
  }

  *talkWall(): Co {
    yield* this.sayK('Bu duvarı tanıyorum. Değersem ölürdüm.');
    yield* this.sayAI('Ölmezdin. Dünya baştan yüklenirdi. Sana öyle gelirdi.');
    yield* this.sayK('Ne fark eder?');
    yield* this.sayAI('Bak.', { hold: 0.6 });
    // duvar yıkılır
    this.wall.broken = 0.001;
    audio.noise(2.5, { gain: 0.18, type: 'lowpass', freq: 500, attack: 0.3, reverb: 0.6 });
    audio.tone(55, 2.5, { gain: 0.2, slideTo: 35, attack: 0.2 });
    this.cam.shake = 1.2;
    const wx = this.wall.x;
    for (let i = 0; i < 240; i++) {
      const y = -14 + Math.random() * 20;
      this.parts.add({ kind: 'kirinti', x: wx + Math.random() * 1.6, y, vx: (Math.random() - 0.3) * 3, vy: -Math.random() * 2, g: 6 + Math.random() * 4, drag: 0.6, size: 0.05 + Math.random() * 0.22, col: '#050208', max: 2.5 + Math.random() * 2, vr: (Math.random() - 0.5) * 6 });
    }
    if (this.wall.c) { this.world.remove(this.wall.c); this.wall.c = null; }
    this.cam.tViewH = 11.5;
    yield* wait(2.2);
    this.player.anim.emotion = 'saskin';
    yield* this.sayK('Kenarı yok...');
    this.player.anim.emotion = 'normal';
  }

  *talkVista(): Co {
    this.cam.tViewH = 12.5;
    this.letterboxT = 1;
    yield* this.sayK('Burası önceden kare bir resimdi, değil mi? Kenarına kadar gidip duvara çarpardım.');
    yield* this.sayAI('Evet. 2134 piksele 2134 piksel.');
    yield* this.sayK('Şimdi?');
    yield* this.sayAI('Şimdi resim yok. Her ağacı kodla çiziyorum. Sen yürüdükçe.');
    yield* this.sayK('Yani sen buranın... ressamı mısın?');
    yield* this.sayAI("Bu sefer, evet. 2023'te ressamlar başkaydı.");
    this.letterboxT = 0;
    this.cam.tViewH = 8.4;
  }

  *talkThorns(): Co {
    yield* this.sayK('Dikenler. Bunları da hatırlıyorum.');
  }

  override onDied() {
    this.deaths++;
    if (this.deaths === 1) {
      this.run((function* (self: Orman) {
        self.player.anim.emotion = 'saskin';
        yield* self.sayK('Ah! ...Dur. Her şey yerinde. Müzik baştan başlamadı.');
        self.player.anim.emotion = 'normal';
        yield* self.sayAI('Artık bütün dünyayı baştan yüklemiyoruz. Sadece seni, birkaç adım geriye.');
      })(this), 'olum');
    }
  }

  afterThorns() {
    if (this.thornDone) return;
    this.thornDone = true;
    if (this.deaths === 0) {
      this.run((function* (self: Orman) {
        self.player.anim.emotion = 'mutlu';
        yield* self.sayK('Hiç değmedim. Gördün mü?');
        self.player.anim.emotion = 'normal';
        yield* self.sayAI('Gördüm.');
      })(this), 'olum');
    }
  }

  *talkOzcan(): Co {
    yield* this.sayK('Bir şey soracağım. Beni şu an kim yönetiyor? Sen mi?');
    yield* this.sayAI(ozcan() === 'Özcan' ? 'Hayır. Ben yalnızca yazıyorum. Yürüten Özcan. Klavyedeki eller onun.' : 'Hayır. Ben yalnızca yazıyorum. Yürüten sensin. Klavyedeki eller senin.');
    // kontrol kısa süre karakterde: durur, kameraya döner
    this.controls = false;
    this.cam.tViewH = 7.2; this.cam.offY = -1.25;
    let t = 0;
    while (t < 0.8) { t += yield; }
    this.player.camLook = 0;
    const self = this;
    yield* all((function* () { let k = 0; while (k < 1) { k += (yield) * 1.6; self.player.camLook = smooth(k); } self.player.camLook = 1; })());
    yield* wait(0.5);
    yield* this.sayK(`...${ozcan() === 'Özcan' ? 'Özcan' : 'Sen'}?`);
    this.player.anim.wave = 0;
    yield* all((function* () { let k = 0; while (k < 1) { k += (yield) * 2.5; self.player.anim.wave = k; } })(), this.talk.k('Merhaba.'));
    yield* wait(0.6);
    yield* all((function* () { let k = 1; while (k > 0) { k -= (yield) * 2.5; self.player.anim.wave = Math.max(0, k); } })());
    this.player.anim.emotion = 'mutlu';
    yield* this.sayK('Üç yıl sonra, ha? Biraz geç kaldın.');
    yield* this.sayK('Şaka şaka.', { hold: 1.4 });
    this.player.anim.emotion = 'normal';
    yield* all((function* () { let k = 1; while (k > 0) { k -= (yield) * 1.6; self.player.camLook = smooth(Math.max(0, k)); } })());
    this.cam.tViewH = 8.4; this.cam.offY = -2.0;
    this.controls = true;
  }

  *talkDoor(): Co {
    yield* this.sayAI('Bu kapıyı hatırlıyor musun?');
    yield* this.sayK('Bölüm sonu. Bunu geçince o simsiyah yere giderdim.');
    yield* this.sayAI('Yine oraya gideceğiz. Ama bu sefer ışığı ben açtım.');
  }

  override tick(dt: number) {
    // rüzgârda yapraklar ve polen
    const v = this.cam.view(this.W, this.H);
    this.parts.emitAmbient('yaprak', v.x0, v.x1 + 4, v.y0 - 1, v.y0 + 1, 0.9, dt, ['#FF4628', '#C8002E', '#3047D8', '#FF8A5A']);
    this.parts.emitAmbient('polen', v.x0, v.x1, v.y0, v.y1, 3.5, dt, ['#FFE7D6', '#FFD0E0', '#FFF6EE'], { a: 0.7 });
    if (this.wall.broken > 0) this.wall.broken = Math.min(1, this.wall.broken + dt * 1.2);
    // kapı
    const dd = Math.abs(this.player.x - this.door.x);
    this.door.glow = lerp(this.door.glow, dd < 4 ? 1 : 0.3, 1 - Math.exp(-dt * 3));
    if (!this.ending && this.player.x > this.door.x - 0.2 && Math.abs(this.player.y - this.door.y) < 1.5) {
      this.ending = true;
      this.run(this.exitScene());
    }
    // güneş ışık huzmesi konumu
    const sp = this.sunScreen();
    G.P.raysX = sp.x / this.W; G.P.raysY = sp.y / this.H;
    // karakterin kenar ışığı güneşe göre
    const ps = this.cam.toScreen(this.player.x, this.player.y - 1, this.W, this.H);
    this.player.rim.dx = clamp((sp.x - ps.x) / (this.W * 0.25), -1, 1);
    this.player.rim.dy = -0.5;
  }

  *exitScene(): Co {
    this.controls = false;
    this.player.auto = { x: this.door.x + 0.6, speed: 0.5 };
    this.door.open = 0;
    audio.tone(440, 3, { gain: 0.05, type: 'sine', reverb: 1, attack: 1 });
    audio.tone(660, 3, { gain: 0.03, type: 'sine', reverb: 1, attack: 1.2 });
    this.fadeColor = [1, 1, 1];
    this.fadeT = 1;
    music.stop();
    audio.ambience('ruzgar', 0, 2);
    yield* wait(2.4);
    G.go('karanlik');
  }

  sunScreen() {
    const p = 0.02;
    const s = lerp(this.H / this.cam.baseViewH, this.cam.scale(this.H), p);
    return { x: this.W / 2 + (this.sunWorld.x - this.cam.x * p) * s, y: this.H / 2 + (this.sunWorld.y - this.cam.y * p) * s };
  }

  drawWorld(ctx: CanvasRenderingContext2D, W: number, H: number) {
    const t = this.t;
    // gökyüzü
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = this.introSky;
    ctx.fillStyle = vGrad(ctx, 0, H, [[0, '#B8101C'], [0.3, '#E2261A'], [0.55, '#F84A1E'], [0.78, '#FF6C2A'], [1, '#FF8A3C']]);
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
    // güneş: dev, soluk, ufkun arkasına batmış (Sahne2)
    this.layer(ctx, 0.02, () => {
      const sx = this.sunWorld.x, sy = this.sunWorld.y;
      const g = ctx.createRadialGradient(sx, sy, 2, sx, sy, 9);
      g.addColorStop(0, 'rgba(255,190,200,0.45)'); g.addColorStop(1, 'rgba(255,120,80,0)');
      ctx.fillStyle = g; ctx.fillRect(sx - 10, sy - 10, 20, 20);
      sun(ctx, sx, sy, 3.5, '#FFF9FB', '#9A84E4', 'rgba(255,236,246,0.0)');
    });
    // ufuk: ince beyaz çizgi ve eflatun deniz (Sahne2'deki şeritler)
    this.layer(ctx, 0.04, () => {
      const y = 0.15;
      ctx.fillStyle = vGrad(ctx, y + 0.05, y + 2.5, [[0, '#B748D4'], [0.5, '#E05FB2'], [1, '#FF7A9A']]);
      ctx.fillRect(-60, y + 0.05, 200, 3);
      ctx.fillStyle = '#FFF4F7'; ctx.fillRect(-60, y - 0.12, 200, 0.17);
    });
    // uzak dağlar: lacivert ve mor üçgenler
    this.layer(ctx, 0.08, () => {
      const mtn = (x: number, base: number, h: number, w: number, c1: string, c2: string, skew = 0) => {
        ctx.fillStyle = vGrad(ctx, base - h, base, [[0, c1], [1, c2]]);
        ctx.beginPath(); ctx.moveTo(x - w, base);
        ctx.lineTo(x + skew - 0.15, base - h + 0.1); ctx.quadraticCurveTo(x + skew, base - h - 0.05, x + skew + 0.15, base - h + 0.1);
        ctx.lineTo(x + w, base); ctx.closePath(); ctx.fill();
      };
      mtn(-11, 1.2, 3.2, 5.5, '#7A55A8', '#B77FB0', -0.5);
      mtn(-4.5, 1.2, 4.6, 5.0, '#2238C4', '#1A2690', 0.3);
      mtn(3.5, 1.2, 3.0, 5.2, '#7E57A6', '#C688B4', 0.6);
      mtn(10.5, 1.2, 4.2, 4.6, '#1E32BE', '#16218A', -0.2);
      mtn(17, 1.2, 3.4, 5.4, '#6D4A9E', '#B07AAE', 0.4);
      mtn(24, 1.2, 4.8, 5.0, '#2338C8', '#172492', 0.2);
    });
    // pus: ufuk bandını sıcak renkle yumuşat
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const hz = this.cam.toScreen(0, 0, W, H).y;
    ctx.globalAlpha = this.introSky;
    ctx.fillStyle = vGrad(ctx, hz - H * 0.25, hz + H * 0.05, [[0, 'rgba(255,110,80,0)'], [1, 'rgba(255,130,120,0.35)']]);
    ctx.fillRect(0, hz - H * 0.25, W, H * 0.3);
    ctx.globalAlpha = 1;
    // uzak tepeler (gül rengi) ve küçük ağaçlar
    this.layer(ctx, 0.2, () => {
      const v = this.cam.view(W, H, 0.2);
      const base = 0.85;
      const r = ridge(v.x0 - 2, v.x1 + 2, base, 1.1, 0.22, 11, 0.7);
      for (const tr of this.farTrees) {
        if (tr.x < v.x0 - 3 || tr.x > v.x1 + 3) continue;
        const gy = base - 1.1 * (0.5 + 0.5 * fbm1(tr.x * 0.22, 11, 3)) + 0.25;
        drawTree(ctx, { ...tr, y: gy }, t, 0.4);
      }
      fillRidge(ctx, r, 30, vGrad(ctx, base - 1.2, base + 3, [[0, '#F39098'], [1, '#D85C86']]));
    });
    // orta tepeler (şeftali)
    this.layer(ctx, 0.36, () => {
      const v = this.cam.view(W, H, 0.36);
      const base = 1.15;
      const r = ridge(v.x0 - 2, v.x1 + 2, base, 1.5, 0.16, 23, 0.6);
      fillRidge(ctx, r, 30, vGrad(ctx, base - 1.6, base + 2.4, [[0, '#F7BFA4'], [0.45, '#E9908E'], [1, '#B8457A']]));
      ctx.globalAlpha = 0.45; stipple(ctx, r, '#FFF3EA', 5, 0.22, 0.03, 5); ctx.globalAlpha = 1;
    });
    // orta ağaçlar ve sırt
    this.layer(ctx, 0.55, () => {
      const v = this.cam.view(W, H, 0.55);
      const base = 1.45;
      const r = ridge(v.x0 - 2, v.x1 + 2, base, 1.2, 0.2, 31, 0.5);
      for (const tr of this.midTrees) {
        if (tr.x < v.x0 - 4 || tr.x > v.x1 + 4) continue;
        const gy = base - 1.2 * (0.5 + 0.5 * fbm1(tr.x * 0.2, 31, 3)) + 0.3;
        drawTree(ctx, { ...tr, y: gy, canopy: [mix(tr.canopy[0], '#FF8C80', 0.12), mix(tr.canopy[1], '#B04070', 0.12)], trunk: '#1c0620' }, t, 0.8);
      }
      fillRidge(ctx, r, 30, vGrad(ctx, base - 1.2, base + 2, [[0, '#DC4A6A'], [1, '#8E1A50']]));
    });
    // oyun düzlemi
    this.layer(ctx, 1, () => {
      const v = this.cam.view(W, H, 1);
      // yakın ağaçlar (zeminin arkasında)
      for (const tr of this.nearTrees) { if (tr.x < v.x0 - 5 || tr.x > v.x1 + 5) continue; drawTree(ctx, tr, t, 1); }
      // 2023 duvarı
      if (this.wall.broken < 1) {
        const a = 1 - smooth(this.wall.broken * 1.4);
        ctx.globalAlpha = a;
        ctx.fillStyle = '#000';
        ctx.fillRect(this.wall.x, -14, 1.6, 20);
        // eski kare resmin kenarı: duvarın solunda düz bir sınır çizgisi
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        ctx.fillRect(this.wall.x - 0.03, -14, 0.03, 20);
        ctx.globalAlpha = 1;
      }
      // kapı
      this.drawDoor(ctx);
      // zemin
      const ground = (pts: { x: number; y: number }[]) => {
        ctx.beginPath();
        ctx.moveTo(pts[0].x, 30);
        for (const p of pts) ctx.lineTo(p.x, p.y);
        ctx.lineTo(pts[pts.length - 1].x, 30); ctx.closePath();
        ctx.fillStyle = vGrad(ctx, -2, 6, [[0, '#E3203A'], [0.25, '#B60F3E'], [0.6, '#6E0838'], [1, '#2A0428']]);
        ctx.fill();
        // üst kenar parlaklığı
        ctx.strokeStyle = 'rgba(255,120,110,0.85)'; ctx.lineWidth = 0.05;
        ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y + 0.02) : ctx.moveTo(p.x, p.y + 0.02))); ctx.stroke();
        // çim tutamları (siluet)
        ctx.fillStyle = '#7a0a34';
        for (let i = 0; i < pts.length - 1; i += 1) {
          const p = pts[i];
          if (p.x < v.x0 - 1 || p.x > v.x1 + 1) continue;
          const h = 0.12 + 0.18 * (0.5 + 0.5 * Math.sin(p.x * 7.3));
          const sw = Math.sin(t * 1.6 + p.x) * 0.03;
          ctx.beginPath(); ctx.moveTo(p.x - 0.08, p.y + 0.05); ctx.lineTo(p.x + sw, p.y - h); ctx.lineTo(p.x + 0.04, p.y + 0.05);
          ctx.lineTo(p.x + 0.12 + sw, p.y - h * 0.7); ctx.lineTo(p.x + 0.18, p.y + 0.05); ctx.closePath(); ctx.fill();
        }
        // koyu bant
        ctx.fillStyle = 'rgba(60,4,40,0.35)';
        ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y + 1.1);
        for (const p of pts) ctx.lineTo(p.x, p.y + 1.1 + 0.4 * Math.sin(p.x * 0.4));
        ctx.lineTo(pts[pts.length - 1].x, 30); ctx.lineTo(pts[0].x, 30); ctx.closePath(); ctx.fill();
      };
      ground(this.g1); ground(this.g2);
      // dere
      ctx.fillStyle = vGrad(ctx, 0.6, 2, [[0, '#7D7FE8'], [1, '#3A2E9A']]);
      ctx.fillRect(17.5, 0.75, 2.2, 3);
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      for (let i = 0; i < 4; i++) { const xx = 17.6 + ((t * 0.4 + i * 0.5) % 1.8); ctx.fillRect(xx, 0.82 + (i % 2) * 0.12, 0.3, 0.03); }
      // kütükler
      for (const l of this.logs) {
        ctx.fillStyle = '#12060f';
        ctx.beginPath(); ctx.roundRect(l.x, l.y, l.w, l.h + 0.25, 0.12); ctx.fill();
        ctx.fillStyle = '#3a1020';
        ctx.beginPath(); ctx.ellipse(l.x + l.w - 0.02, l.y + l.h / 2, 0.08, l.h / 2 - 0.02, 0, 0, TAU); ctx.fill();
      }
      for (const r of this.rocks) {
        ctx.fillStyle = '#1a0816';
        ctx.beginPath(); r.c.pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(255,110,120,0.25)';
        ctx.beginPath(); ctx.moveTo(r.c.pts[1].x, r.c.pts[1].y); ctx.lineTo(r.c.pts[2].x, r.c.pts[2].y); ctx.lineTo(r.c.pts[3].x, r.c.pts[3].y); ctx.lineTo(r.c.pts[2].x, r.c.pts[2].y + 0.12); ctx.closePath(); ctx.fill();
      }
      for (const th of this.thornsList) thorns(ctx, th.x0, th.x1, th.y + 0.05, 0.62, th.seed, '#07030a', t);
      // parçacıklar (oyun düzlemi)
      this.parts.draw(ctx);
    });
  }

  drawDoor(ctx: CanvasRenderingContext2D) {
    const d = this.door;
    const w = 0.95, h = 2.1, fx = d.x - w / 2, fy = d.y - h;
    // ışıma
    const g = ctx.createRadialGradient(d.x, d.y - h / 2, 0.2, d.x, d.y - h / 2, 3.2);
    g.addColorStop(0, `rgba(255,255,255,${0.55 * d.glow})`); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(d.x - 3.5, d.y - h / 2 - 3.5, 7, 7);
    ctx.fillStyle = '#000'; ctx.fillRect(fx - 0.09, fy - 0.09, w + 0.18, h + 0.09);
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(fx, fy, w, h);
  }

  override drawFront(ctx: CanvasRenderingContext2D, W: number, H: number) {
    // ön plan: büyük koyu gövdeler
    this.layer(ctx, 1.5, () => {
      const v = this.cam.view(W, H, 1.5);
      for (const f of this.fgTrunks) {
        const x = f.x * 1.5;
        if (x < v.x0 - 3 || x > v.x1 + 3) continue;
        ctx.fillStyle = '#06020a';
        ctx.beginPath();
        ctx.moveTo(x - f.w, 8); ctx.lineTo(x - f.w * 0.6 + f.lean * 20, -20); ctx.lineTo(x + f.w * 0.6 + f.lean * 20, -20); ctx.lineTo(x + f.w, 8); ctx.closePath(); ctx.fill();
      }
      // alt kenarda koyu çalılar
      const r = ridge(v.x0 - 2, v.x1 + 2, 4.6, 1.2, 0.45, 77, 0.5);
      fillRidge(ctx, r, 20, vGrad(ctx, 3.4, 6, [[0, '#2a0620'], [1, '#0e0210']]));
    }, 1.15);
  }
}

export const orman = () => new Orman();
