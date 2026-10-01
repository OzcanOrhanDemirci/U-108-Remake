// Yeni dünya sahnelerinin ortak temeli: kamera, oyuncu, fizik, parçacık, konuşma, tetikler, ölüm/geri sarma.
import { G, Scene, params } from '../game';
import { World, Controller, Surface } from './physics';
import { Animator, drawCharacter, CharState } from './character';
import { Particles } from './particles';
import { Talk } from '../ui/talk';
import { input } from '../core/input';
import { audio } from '../core/audio';
import { clamp, damp, lerp, smooth, rgba } from '../core/math';
import { Co, wait } from '../core/co';
import { mem, saveMemory } from '../meta/save';

export class Camera {
  x = 0; y = 0; viewH = 9.5;
  tx = 0; ty = 0; tViewH = 9.5;
  baseViewH = 9.5;
  follow = true;
  offY = -1.6;              // oyuncunun ayağından yukarıya bakış
  lead = 1.6;               // yürüme yönüne öne bakış
  private leadV = 0;
  bounds = { x0: -Infinity, x1: Infinity, y0: -Infinity, y1: Infinity };
  shake = 0;
  private sx = 0; private sy = 0;
  k = 3.2;

  update(dt: number, px: number, py: number, vx: number, W: number, H: number) {
    if (this.follow) {
      this.leadV = damp(this.leadV, Math.sign(vx) * Math.min(1, Math.abs(vx) / 3) * this.lead, 1.4, dt);
      this.tx = px + this.leadV;
      this.ty = py + this.offY;
    }
    this.viewH = damp(this.viewH, this.tViewH, 1.6, dt);
    const halfW = (this.viewH * W / H) / 2, halfH = this.viewH / 2;
    const bx0 = this.bounds.x0 + halfW, bx1 = this.bounds.x1 - halfW;
    const by0 = this.bounds.y0 + halfH, by1 = this.bounds.y1 - halfH;
    const cx = bx0 > bx1 ? (this.bounds.x0 + this.bounds.x1) / 2 : clamp(this.tx, bx0, bx1);
    const cy = by0 > by1 ? (this.bounds.y0 + this.bounds.y1) / 2 : clamp(this.ty, by0, by1);
    this.x = damp(this.x, cx, this.k, dt);
    this.y = damp(this.y, cy, this.k * 0.9, dt);
    this.shake = Math.max(0, this.shake - dt * 2);
    this.sx = (Math.random() - 0.5) * this.shake * 0.3; this.sy = (Math.random() - 0.5) * this.shake * 0.3;
  }
  snap() { this.x = this.tx; this.y = this.ty; this.viewH = this.tViewH; }
  scale(H: number) { return H / this.viewH; }
  /** Derinlik katmanı dönüşümü. p=1 oyun düzlemi, p<1 uzak, p>1 ön plan. */
  apply(ctx: CanvasRenderingContext2D, W: number, H: number, p = 1, py = p, dyPx = 0) {
    const s = lerp(H / this.baseViewH, this.scale(H), Math.min(1, p));
    const sc = p > 1 ? s * (1 + (p - 1) * 0.35) : s;
    ctx.setTransform(sc, 0, 0, sc, W / 2 - (this.x + this.sx) * p * sc, H / 2 - (this.y + this.sy) * py * sc + dyPx);
  }
  toScreen(x: number, y: number, W: number, H: number) {
    const s = this.scale(H);
    return { x: W / 2 + (x - this.x - this.sx) * s, y: H / 2 + (y - this.y - this.sy) * s };
  }
  /** Görünür dünya aralığı (p katmanında). */
  view(W: number, H: number, p = 1) {
    const s = lerp(H / this.baseViewH, this.scale(H), Math.min(1, p));
    const hw = W / 2 / s, hh = H / 2 / s;
    return { x0: this.x * p - hw, x1: this.x * p + hw, y0: this.y * p - hh, y1: this.y * p + hh };
  }
}

export class Player {
  ctl = new Controller(0.24, 0.86);
  anim = new Animator();
  height = 1.75;
  visible = true;
  alpha = 1;
  turn = 1;             // gövde 3/4
  camLook = 0;          // 0..1: başı kameraya çevir
  facingOverride: number | null = null;
  auto: { x: number; speed: number } | null = null;
  sitting = 0;
  state: CharState = 'idle';
  stepAcc = 0;
  surface: Surface = 'cim';
  rim = { color: '#FFD9B0', dx: 1, dy: -0.4, strength: 0.0 };
  shade = 0; shadeColor = '#160a1a';
  private buf = document.createElement('canvas');
  private buf2 = document.createElement('canvas');
  lastStepSide = 0;
  scaleMul = 1;

  get x() { return this.ctl.body.x; }
  get y() { return this.ctl.body.y + this.ctl.body.hh; } // ayak
  place(x: number, feetY: number) { this.ctl.body.x = x; this.ctl.body.y = feetY - this.ctl.body.hh; this.ctl.body.vx = 0; this.ctl.body.vy = 0; }
  get facing() { return this.facingOverride ?? this.ctl.facing; }

  update(dt: number, world: World, controls: { x: number; jumpPressed: boolean; jumpHeld: boolean }) {
    let c = controls;
    if (this.auto) {
      const dx = this.auto.x - this.x;
      const dir = Math.abs(dx) < 0.08 ? 0 : Math.sign(dx);
      c = { x: dir * this.auto.speed, jumpPressed: false, jumpHeld: false };
      if (dir === 0) { this.ctl.body.vx *= 0.5; }
    }
    if (this.sitting > 0) c = { x: 0, jumpPressed: false, jumpHeld: false };
    this.ctl.update(dt, world, c);
    const b = this.ctl.body;
    const sp = Math.abs(b.vx);
    if (this.sitting > 0.5) this.state = 'sit';
    else if (!b.grounded) this.state = b.vy < 0 ? 'jump' : 'fall';
    else if (sp > 0.25) this.state = sp > 3.4 ? 'run' : 'walk';
    else this.state = 'idle';
    if (this.ctl.justLanded > 0) {
      this.anim.landed(this.ctl.justLanded);
      audio.land(this.ctl.justLanded);
      audio.step(this.groundSurface(), 1.3);
    }
    if (this.ctl.justJumped) audio.jump();
    this.anim.update(dt, { state: this.state, speed: b.vx, vy: b.vy, dist: this.ctl.dist });
    // adım sesi: yürüme evresinde ayak yere değdikçe
    if ((this.state === 'walk' || this.state === 'run') && b.grounded) {
      const side = Math.floor(this.anim.phase / Math.PI);
      if (side !== this.lastStepSide) { this.lastStepSide = side; audio.step(this.groundSurface(), this.state === 'run' ? 1.2 : 0.8); }
    }
  }
  groundSurface(): Surface { return this.ctl.body.ground?.surface ?? this.surface; }

  /** Ekrana çizer (kenar ışığıyla). */
  draw(ctx: CanvasRenderingContext2D, cam: Camera, W: number, H: number, mirrorY?: number) {
    if (!this.visible || this.alpha <= 0) return;
    const mir = mirrorY !== undefined;
    const s = cam.scale(H) * this.height * this.scaleMul;
    const p = cam.toScreen(this.x, this.y, W, H);
    const pad = 0.75;
    const bw = Math.ceil(s * pad * 2), bh = Math.ceil(s * 1.25);
    const facing = this.facing;
    const headTurn = facing * lerp(1, 0, smooth(this.camLook));
    const opts = { facing, turn: lerp(this.turn, 0.25, smooth(this.camLook) * 0.6), headTurn, pose: this.anim.pose, face: this.anim.face, shade: this.shade, shadeColor: this.shadeColor };
    // yer gölgesi
    if (!mir && this.ctl.body.grounded && this.sitting < 0.5) {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 0.28 * this.alpha;
      ctx.fillStyle = '#12050f';
      ctx.beginPath(); ctx.ellipse(p.x, p.y + s * 0.006, s * 0.11, s * 0.018, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    if (this.rim.strength <= 0.01) {
      ctx.save(); ctx.setTransform(s, 0, 0, mir ? -s : s, p.x, mir ? 2 * mirrorY! - p.y : p.y); ctx.globalAlpha = ctx.globalAlpha * this.alpha;
      drawCharacter(ctx, opts);
      ctx.restore();
      return;
    }
    // kenar ışığı: tamponda çiz, ışığa bakan kenarı renklendir
    if (this.buf.width !== bw || this.buf.height !== bh) { this.buf.width = this.buf2.width = bw; this.buf.height = this.buf2.height = bh; }
    const b1 = this.buf.getContext('2d')!, b2 = this.buf2.getContext('2d')!;
    b1.setTransform(1, 0, 0, 1, 0, 0); b1.clearRect(0, 0, bw, bh);
    b1.setTransform(s, 0, 0, s, bw / 2, bh - s * 0.08);
    drawCharacter(b1, opts);
    b2.setTransform(1, 0, 0, 1, 0, 0); b2.globalCompositeOperation = 'source-over'; b2.clearRect(0, 0, bw, bh);
    b2.drawImage(this.buf, 0, 0);
    b2.globalCompositeOperation = 'source-in'; b2.fillStyle = this.rim.color; b2.fillRect(0, 0, bw, bh);
    const d = Math.max(1.5, s * 0.008);
    b2.globalCompositeOperation = 'destination-out';
    b2.drawImage(this.buf, -this.rim.dx * d, -this.rim.dy * d);
    b2.globalCompositeOperation = 'source-over';
    ctx.save();
    const ga = ctx.globalAlpha;
    ctx.setTransform(1, 0, 0, mir ? -1 : 1, 0, mir ? 2 * mirrorY! : 0);
    ctx.globalAlpha = ga * this.alpha;
    const ox = p.x - bw / 2, oy = p.y - (bh - s * 0.08);
    ctx.drawImage(this.buf, ox, oy);
    ctx.globalAlpha = ga * this.alpha * this.rim.strength;
    ctx.globalCompositeOperation = 'lighter';
    ctx.drawImage(this.buf2, ox, oy);
    ctx.restore();
  }

  headScreen(cam: Camera, W: number, H: number) {
    const top = this.y - this.height * this.scaleMul * (this.sitting > 0.5 ? 0.62 : 1.02);
    return cam.toScreen(this.x, top, W, H);
  }
}

export interface Trigger { x: number; once?: boolean; fired?: boolean; fn: () => void; x1?: number }

export abstract class Stage implements Scene {
  abstract name: string;
  world = new World();
  player = new Player();
  cam = new Camera();
  parts = new Particles();
  talk = new Talk();
  triggers: Trigger[] = [];
  t = 0;
  controls = true;
  checkpoint = { x: 0, y: 0 };
  dying = false;
  letterbox = 0;
  letterboxT = 0;
  fade = 1;           // 0 görünür, 1 siyah (sahne açılışında kararmadan açılır)
  fadeT = 0;
  fadeColor: [number, number, number] = [0, 0, 0];
  hint: { text: string; a: number; t: number } | null = null;
  W = 1920; H = 1080;

  enter(_arg?: any) {
    this.talk.onTalking = (who, on) => { if (who === 'k') this.player.anim.talking = on; };
  }

  run(co: Co, tag?: string) { G.runner.start(co, tag); }

  /** Tetiklenen konuşmalar sıraya girer: biri bitmeden öbürü başlamaz. */
  private kuyruk: (() => Co)[] = [];
  private kuyrukCalisiyor = false;
  sahneKonusmasi(f: () => Co) {
    this.kuyruk.push(f);
    if (!this.kuyrukCalisiyor) this.run(this.kuyrukIsle(), 'konusma');
  }
  /** Yere bağlı konuşma: süren konuşmayı keser, hemen başlar. */
  acilKonusma(f: () => Co) {
    G.runner.stop('konusma');
    this.kuyruk = [];
    this.kuyrukCalisiyor = false;
    this.talk.clear();
    this.konusmaKesildi();
    this.sahneKonusmasi(f);
  }
  /** Kesilen konuşmanın bıraktığı kamera/şerit durumunu toparlar (sahne özelleştirir). */
  konusmaKesildi() { this.letterboxT = 0; this.player.camLook = 0; this.player.anim.emotion = 'normal'; this.player.anim.wave = 0; this.controls = true; }
  private *kuyrukIsle(): Co {
    this.kuyrukCalisiyor = true;
    while (this.kuyruk.length) { const f = this.kuyruk.shift()!; yield* f(); }
    this.kuyrukCalisiyor = false;
  }

  /** Geliştirme: ?x=40 ile oyuncuyu oraya koy, ?sessiz=1 ile senaryoyu atla. */
  debugPlace() {
    (window as any).__stage = this;
    const qx = params.get('x');
    if (qx !== null) {
      const x = parseFloat(qx);
      this.player.place(x, this.world.groundAt(x, -100));
      this.setCheckpoint(x);
      for (const tr of this.triggers) if (tr.x < x - 0.5) tr.fired = true;
      this.cam.tx = this.player.x; this.cam.ty = this.player.y + this.cam.offY; this.cam.snap();
      this.fade = 0; this.fadeT = 0;
    }
    if (params.has('sessiz')) G.runner.clear();
  }

  update(dt: number) {
    this.t += dt;
    const ctlOn = this.controls && !this.dying && !input.locked;
    this.player.update(dt, this.world, ctlOn ? { x: input.x, jumpPressed: input.jumpPressed, jumpHeld: input.jumpHeld } : { x: 0, jumpPressed: false, jumpHeld: false });
    const b = this.player.ctl.body;
    if (b.hitHazard && !this.dying) this.die();
    for (const tr of this.triggers) {
      if (tr.fired && tr.once !== false) continue;
      const inside = this.player.x >= tr.x && (tr.x1 === undefined || this.player.x <= tr.x1);
      if (inside && !tr.fired) { tr.fired = true; tr.fn(); }
      if (!inside && tr.once === false) tr.fired = false;
    }
    this.cam.update(dt, this.player.x, this.player.y, b.vx, this.W, this.H);
    this.parts.update(dt, this.t);
    this.talk.update(dt);
    this.letterbox = damp(this.letterbox, this.letterboxT, 3, dt);
    this.fade = damp(this.fade, this.fadeT, 2.2, dt);
    if (this.hint) { this.hint.t += dt; }
    this.tick(dt);
    G.P.fade = this.fade;
    G.P.fadeColor = this.fadeColor;
  }

  /** Sahneye özel güncelleme. */
  tick(_dt: number) { /* */ }

  die() {
    this.dying = true;
    mem.olumler++; saveMemory();
    const self = this;
    this.run((function* () {
      // geri sarma: dünya baştan yüklenmez, yalnız oyuncu birkaç adım geri
      audio.noise(0.7, { gain: 0.12, type: 'bandpass', freq: 900, q: 0.7, attack: 0.05 });
      audio.tone(520, 0.6, { type: 'sawtooth', gain: 0.03, slideTo: 90, cutoff: 1500 });
      const P = G.P;
      const sat = P.saturation, ab = P.aberration;
      let t = 0;
      self.player.ctl.frozen = true;
      while (t < 0.35) { t += yield; P.saturation = lerp(sat, 0.1, t / 0.35); P.aberration = lerp(ab, 2.5, t / 0.35); P.warp = t / 0.35 * 1.5; }
      self.player.place(self.checkpoint.x, self.checkpoint.y);
      self.player.ctl.body.grounded = true;
      t = 0;
      while (t < 0.45) { t += yield; P.saturation = lerp(0.1, sat, t / 0.45); P.aberration = lerp(2.5, ab, t / 0.45); P.warp = (1 - t / 0.45) * 1.5; }
      P.saturation = sat; P.aberration = ab; P.warp = 0;
      self.player.ctl.frozen = false;
      self.dying = false;
      self.onDied();
    })());
  }
  onDied() { /* */ }

  setCheckpoint(x: number) { this.checkpoint = { x, y: this.world.groundAt(x, -100) }; }

  showHint(text: string) { this.hint = { text, a: 0, t: 0 }; }
  hideHint() { if (this.hint) this.hint.t = -999; }

  /** Katman çizimi yardımcısı. */
  /** Katman açılış ofseti (piksel): sahne açılışında katmanlar aşağıdan yükselir. */
  rise: number[] = [];
  riseIdx = 0;
  layer(ctx: CanvasRenderingContext2D, p: number, f: () => void, py = p) {
    ctx.save();
    const dy = this.rise[this.riseIdx++] ?? 0;
    this.cam.apply(ctx, this.W, this.H, p, py, dy);
    f();
    ctx.restore();
  }

  abstract drawWorld(ctx: CanvasRenderingContext2D, W: number, H: number): void;
  drawFront(_ctx: CanvasRenderingContext2D, _W: number, _H: number) { /* */ }

  draw(ctx: CanvasRenderingContext2D, W: number, H: number) {
    this.W = W; this.H = H;
    this.riseIdx = 0;
    this.drawWorld(ctx, W, H);
    this.player.draw(ctx, this.cam, W, H);
    this.drawFront(ctx, W, H);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    // sinema şeritleri
    if (this.letterbox > 0.002) {
      const h = H * 0.11 * this.letterbox;
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, W, h); ctx.fillRect(0, H - h, W, h);
    }
    const hd = this.player.headScreen(this.cam, W, H);
    this.talk.head = { x: hd.x, y: hd.y, visible: this.player.visible };
    this.talk.draw(ctx, W, H);
    this.drawHint(ctx, W, H);
    this.drawOverlay(ctx, W, H);
  }
  drawOverlay(_ctx: CanvasRenderingContext2D, _W: number, _H: number) { /* */ }

  drawHint(ctx: CanvasRenderingContext2D, W: number, H: number) {
    if (!this.hint) return;
    const h = this.hint;
    const a = h.t < 0 ? 0 : Math.min(1, h.t / 0.6);
    if (h.t < 0) { this.hint = null; return; }
    const s = H / 1080;
    ctx.save();
    ctx.globalAlpha = a * 0.85;
    ctx.font = `500 ${22 * s}px "Inter", sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillStyle = rgba('#ffffff', 0.9);
    ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 8 * s;
    ctx.fillText(h.text, W / 2, H - 70 * s);
    ctx.restore();
  }

  *sayK(text: string, o = {}) { yield* this.talk.k(text, o); }
  *sayAI(text: string, o = {}) { yield* this.talk.ai(text, o); }
  *pause(s: number) { yield* wait(s); }
}
