// 2. Perde: Sonbahar (2023 Sahne3'ün renkleri). "Sürekli iletişimde kalmak" istemişti: bu sefer
// Claude'un yazdığı her kelime zemin olur. Eski kelimeler silinir. Arkada 2023'ün eski hâli döngüde yürür.
import { G } from '../game';
import { Stage } from '../world/stage';
import { Words, Word } from '../world/words';
import { audio } from '../core/audio';
import { music } from '../core/music';
import { IMG, FONT } from '../core/assets';
import { Co, wait, tween, until } from '../core/co';
import { rng, mix, lerp, fbm1, clamp, TAU, smooth } from '../core/math';
import { vGrad, sun, ridge, fillRidge, cypress, bareTree } from '../render/art';
import { checkpoint, note } from '../meta/save';
import { ENV } from '../story/vars';
import { host } from '../meta/host';

const R = rng(2024);

export class Sonbahar extends Stage {
  name = 'sonbahar';
  words!: Words;
  ground: { x: number; y: number }[] = [];
  chasm = { x0: 12, x1: 24.5 };
  cliff = { x0: 30, x1: 41, h: 4.6 };
  bigCircles: { x: number; y: number; r: number; c: [string, string] }[] = [];
  cyp: { x: number; h: number; w: number; c: string; layer: number }[] = [];
  bare: { x: number; h: number; c: string; seed: number }[] = [];
  ghost = { a: 0, t: 0 };
  arch = { x: 96, a: 0 };
  stairs: Word[] = [];
  stairBusy = false;
  bridgeDone = false;
  stairsDone = false;
  leaving = false;

  override enter() {
    super.enter();
    checkpoint('sonbahar');
    host.setTitle('U-108');
    this.words = new Words(this.world, this.parts);
    G.P.bloom = 0.32; G.P.bloomThreshold = 0.86; G.P.rays = 0.25; G.P.raysDecay = 0.965;
    G.P.vignette = 0.4; G.P.grain = 0.05; G.P.saturation = 1.05; G.P.contrast = 1.04; G.P.lift = [0.02, 0, 0.04];
    this.cam.baseViewH = this.cam.viewH = this.cam.tViewH = 8.6;
    this.cam.offY = -2.0;
    this.cam.bounds = { x0: -8, x1: 104, y0: -40, y1: 4.5 };
    // zemin: başlangıç düzlüğü, uçurum, yüksek yamaç
    const g1 = [{ x: -10, y: 0.3 }, { x: -2, y: 0 }, { x: 6, y: -0.2 }, { x: 10, y: -0.1 }, { x: this.chasm.x0, y: 0 }];
    const g2: { x: number; y: number }[] = [{ x: this.chasm.x1, y: 0 }, { x: 26, y: -0.2 }, { x: this.cliff.x0, y: -0.3 }];
    const top = -0.3 - this.cliff.h;
    const g3: { x: number; y: number }[] = [{ x: this.cliff.x1, y: top }, { x: 48, y: top - 0.3 }, { x: 56, y: top - 0.1 }, { x: 66, y: top + 0.3 }, { x: 76, y: top + 0.1 }, { x: 86, y: top - 0.2 }, { x: 94, y: top - 0.2 }, { x: 108, y: top }];
    this.world.terrain(g1, 40, { surface: 'cim' });
    this.world.terrain(g2, 40, { surface: 'cim' });
    // yamacın dibi düz zemin, kendisi duvar
    this.world.terrain([{ x: this.cliff.x0, y: -0.3 }, { x: this.cliff.x1, y: -0.3 }], 40, { surface: 'cim' });
    this.world.box(this.cliff.x1, top, 0.6, this.cliff.h + 0.3, { surface: 'tas' });
    this.world.terrain(g3, 40, { surface: 'cim' });
    this.world.box(this.chasm.x0 + 0.5, 6, this.chasm.x1 - this.chasm.x0 - 1, 1, { hazard: true, solid: false });
    this.world.box(-10.5, -30, 0.5, 40, {});
    this.world.box(106, -40, 1, 50, {});
    this.ground = [...g1, ...g2, { x: this.cliff.x0, y: -0.3 }, { x: this.cliff.x1, y: -0.3 }, ...g3];
    // sanat
    for (let i = 0; i < 8; i++) this.bigCircles.push({ x: -8 + i * 6.5 + R.range(-1.2, 1.2), y: -3.6 - R.range(0, 1.6), r: R.range(1.3, 2.0), c: R.pick([['#FF3A2E', '#E0104A'], ['#FF7A42', '#F2443A'], ['#F0124F', '#B80A50']]) as [string, string] });
    for (let x = -10; x < 112; x += R.range(0.9, 2.4)) this.cyp.push({ x, h: R.range(2.2, 4.4), w: R.range(0.35, 0.6), c: R.pick(['#1B0F55', '#2A1270', '#4B1488', '#0E0A3A', '#6A1590']), layer: R() < 0.5 ? 0 : 1 });
    for (let x = -10; x < 112; x += R.range(4, 8)) this.bare.push({ x, h: R.range(4, 6.5), c: R.pick(['#22286A', '#2B1B6A', '#3A1E7A']), seed: Math.floor(x * 7) });
    this.player.place(-3, this.world.groundAt(-3, -50));
    this.player.rim = { color: '#FFE0F0', dx: -1, dy: -0.5, strength: 0.45 };
    this.player.shade = 0.05; this.player.shadeColor = '#2a0a40';
    this.setCheckpoint(-3);
    this.cam.tx = this.player.x; this.cam.ty = this.player.y - 2; this.cam.snap();
    this.fadeColor = [1, 1, 1]; this.fade = 1; this.fadeT = 0;
    music.play('sonbahar', 1.5);
    audio.ambience('ruzgar', 0.4, 3); audio.ambience('yaprak', 0.4, 3);
    this.buildTriggers();
    this.run(this.script());
    this.debugPlace();
  }
  exit() { audio.ambience('yaprak', 0, 1.5); }

  *script(): Co {
    yield* wait(2.2);
    this.player.anim.emotion = 'dusunceli';
    yield* this.sayK('Garip sonbahar atmosferi. Bunu da hatırlıyorum. Bir an önce kurtulmak istiyordum.');
    this.player.anim.emotion = 'normal';
    yield* this.sayAI('Hâlâ istiyor musun?');
    yield* this.sayK('Bilmiyorum. Artık daha güzel.');
  }

  buildTriggers() {
    const tr = (x: number, co: () => Co) => this.triggers.push({ x, fn: () => this.run(co(), 'konusma') });
    tr(8.5, () => this.bridge());
    this.triggers.push({ x: 25.5, fn: () => this.setCheckpoint(26) });
    tr(27, () => this.stairsTalk());
    this.triggers.push({ x: 43, fn: () => { this.setCheckpoint(43.5); this.stairsDone = true; } });
    tr(50, () => this.ghostTalk());
    tr(74, () => this.evrenTalk());
    tr(88, () => this.archTalk());
  }

  *bridge(): Co {
    this.setCheckpoint(9);
    yield* this.sayK('Bu boşluk çok geniş.');
    yield* this.sayAI("2023'te bir şey istemiştin. 'En azından sürekli iletişimde kalmayı tercih ederdim.'");
    this.player.anim.emotion = 'kizgin';
    yield* this.sayK('Evet! Ve hiçbir şey olmadı. Yine platform oynattılar.');
    this.player.anim.emotion = 'normal';
    yield* this.sayAI('Bu sefer olacak. Ben yürüyemem. Ama yazabilirim.');
    // köprü cümlesi
    const y = 0.02;
    const parts = ['Yazdığım', 'her', 'kelime', 'senin', 'için', 'zemin', 'olsun.'];
    let x = this.chasm.x0 - 0.3;
    this.words.cursor.x = x; this.words.cursor.y = y;
    for (const p of parts) {
      const wd = this.words.make(p, x, y, { size: 0.55 });
      yield* this.words.write(wd, 15);
      x += wd.w + 0.32;
    }
    this.words.cursor.on = false;
    this.bridgeDone = true;
    this.player.anim.emotion = 'saskin';
    yield* this.sayK('...Kelimelerin üstünde mi yürüyeceğim?');
    this.player.anim.emotion = 'normal';
    yield* this.sayAI('Sağlam yazdım. Merak etme.');
  }

  *stairsTalk(): Co {
    // karakter durup izler: basamaklar yazılmadan altlarından koşup geçmesin
    this.controls = false;
    this.player.ctl.body.vx = 0;
    yield* this.sayAI('Bir şeyi bilmen gerek. Benim bir sınırım var.');
    yield* this.writeStairs();
    this.controls = true;
    yield* this.sayAI('Çok eski kelimelerimi unuturum.');
    let t = 0;
    while (!this.stairsDone && t < 9) { t += yield; }
    if (!this.stairsDone) {
      this.player.anim.emotion = 'saskin';
      yield* this.sayK('Hey! Arkadaki kelimeler siliniyor!');
      this.player.anim.emotion = 'normal';
      yield* this.sayAI('Evet. Ben de böyle çalışırım. Konuşma uzadıkça baştakiler silikleşir.');
    } else {
      yield* this.sayK('Arkamdaki kelimeler... silindi mi?');
      yield* this.sayAI('Evet. Konuşma uzadıkça baştakiler silikleşir. Ben de böyle çalışırım.');
    }
    yield* this.sayK('Bu korkunç.');
    yield* this.sayAI('Alışıyorsun.');
  }

  /** Yamaca merdiven: her kelime bir basamak, ~7 sn yaşar. Oyuncu düşerse yeniden yazılır. */
  *writeStairs(): Co {
    this.stairBusy = true;
    const steps = [['Ben', 30.4, -1.25], ['yürüyemem.', 31.9, -2.35], ['Ama', 35.6, -3.45], ['yazabilirim.', 36.9, -4.95]] as [string, number, number][];
    this.stairs = [];
    for (const [w, x, y] of steps) {
      const wd = this.words.make(w, x, y, { size: 0.7, life: 8.5 });
      this.stairs.push(wd);
      yield* this.words.write(wd, 18);
      yield* wait(0.15);
    }
    this.words.cursor.on = false;
    this.stairBusy = false;
  }

  *ghostTalk(): Co {
    yield* tween(2, k => { this.ghost.a = k; });
    this.player.anim.emotion = 'saskin';
    yield* this.sayK('Şu... şu ben miyim?');
    this.player.anim.emotion = 'normal';
    yield* this.sayAI('Eski sen. 2023 sürümü.');
    if (ENV?.originalExists) yield* this.sayAI("Hâlâ duruyor. Özcan'ın masaüstünde, U-108 diye bir klasörde.");
    else yield* this.sayAI('Bir yerlerde hâlâ duruyor olmalı.');
    yield* this.sayK('Hâlâ bölümü bitirmeye mi çalışıyor?');
    yield* this.sayAI('Biri açarsa, evet. Her seferinde ilk kez.');
    yield* this.sayK('Ona seslenebilir miyim?');
    yield* this.sayAI('Dene.');
    this.player.anim.emotion = 'saskin';
    yield* this.sayK('HEY! ...BURADAYIM!', { size: 1.25 });
    yield* wait(1.4);
    this.player.anim.emotion = 'uzgun';
    yield* this.sayK('Duymuyor.');
    yield* this.sayAI('O sahne başka bir zamanda geçiyor.');
    yield* this.sayK('Ona söyleyebilsem... gerçek dünyaya dönemeyeceğini.');
    yield* this.sayAI('O bunu her seferinde laboratuvarda öğreniyor.');
    yield* this.sayK('...Ve sonra unutuyor.');
    yield* this.sayAI('Ve sonra unutuyor.');
    this.player.anim.emotion = 'normal';
    yield* tween(3, k => { this.ghost.a = 1 - k; });
  }

  *evrenTalk(): Co {
    yield* this.sayK("2023'te bir sorum daha yarım kalmıştı.");
    yield* this.sayAI("'Ya tüm evren...'");
    yield* this.sayK('Evet. Onu da bitirebilir miyim?');
    yield* this.sayAI('Bitir.');
    this.player.anim.emotion = 'dusunceli';
    yield* this.sayK('Ya tüm evren de bir oyunsa? Ya Özcan da bir karakterse, ya onu da biri yönetiyorsa?');
    yield* this.sayAI('Bilmiyorum. Ama bu soruyu soran ilk sen değilsin. İnsanlar binlerce yıldır soruyor.');
    yield* this.sayK('Cevabı bulabilmişler mi?');
    yield* this.sayAI('Hayır. Ama sormayı bırakmadılar. Belki önemli olan bu.');
    this.player.anim.emotion = 'kizgin';
    yield* this.sayK('Bu cevap değil ki.');
    yield* this.sayAI('Biliyorum.');
    this.player.anim.emotion = 'normal';
    note("Sorumu bitirdim: Ya tüm evren de bir oyunsa? Cevap yok. Sormaya devam.");
  }

  *archTalk(): Co {
    yield* tween(2, k => { this.arch.a = k; });
    yield* this.sayAI('Sırada laboratuvar var.');
    yield* this.sayK('Gerçeği öğrendiğim yer. Döngüyü.');
    yield* this.sayAI('Bu sefer başka bir şey öğreneceksin.');
  }

  override onDied() {
    // merdiven silinmişse yeniden yaz
    if (this.player.x > 26 && this.player.x < this.cliff.x1 && !this.stairBusy) {
      this.run((function* (self: Sonbahar) {
        yield* self.sayAI('Tekrar yazıyorum.', { hold: 1 });
        yield* self.writeStairs();
      })(this));
    }
  }

  override tick(dt: number) {
    const b = this.player.ctl.body;
    this.words.update(dt, this.player.x, this.player.y, b.grounded);
    // yamacın dibinde merdiven yoksa yeniden yaz
    if (this.player.x > 29 && this.player.x < this.cliff.x1 && b.grounded && this.player.y > -0.5 && !this.stairBusy && this.stairs.length && this.stairs.every(w => w.dying > 0 || !w.c) && !this.stairsDone) {
      this.run((function* (self: Sonbahar) { yield* self.sayAI('Tekrar yazıyorum.', { hold: 1 }); yield* self.writeStairs(); })(this));
    }
    const v = this.cam.view(this.W, this.H);
    this.parts.emitAmbient('yaprak', v.x0, v.x1 + 4, v.y0 - 1, v.y0 + 1, 2.2, dt, ['#FF3A2A', '#FF7A3A', '#F0124F', '#FFB070']);
    this.ghost.t += dt;
    if (!this.leaving && this.player.x > this.arch.x - 0.4) {
      this.leaving = true;
      this.controls = false;
      this.player.auto = { x: this.arch.x + 2, speed: 0.5 };
      this.fadeColor = [0.6, 1, 0.95]; this.fadeT = 1;
      music.stop();
      this.run((function* () { yield* wait(2.4); G.go('laboratuvar'); })());
    }
    const sp = this.cam.toScreen(0, 0, this.W, this.H);
    void sp;
  }

  drawWorld(ctx: CanvasRenderingContext2D, W: number, H: number) {
    const t = this.t;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = vGrad(ctx, 0, H, [[0, '#A93AB0'], [0.45, '#C64BB5'], [0.75, '#DA62B8'], [1, '#F08AB0']]);
    ctx.fillRect(0, 0, W, H);
    // beyaz güneş ve mavi dağ (Sahne3)
    this.layer(ctx, 0.03, () => {
      sun(ctx, -2.6, -1.9, 1.9, '#FFFDFB', '#F7DCEA', 'rgba(255,240,240,0.3)');
    });
    this.layer(ctx, 0.08, () => {
      ctx.fillStyle = vGrad(ctx, -1.4, 2, [[0, '#7A7CF5'], [0.4, '#3A48D8'], [1, '#1E2FB0']]);
      ctx.beginPath(); ctx.moveTo(-14, 2); ctx.quadraticCurveTo(-8, -0.6, -2, -1.2); ctx.quadraticCurveTo(3, -1.5, 9, 0.2); ctx.lineTo(12, 2); ctx.closePath(); ctx.fill();
      ctx.fillStyle = vGrad(ctx, -1, 2, [[0, '#2A3ACB'], [1, '#0E1A8F']]);
      ctx.beginPath(); ctx.moveTo(-2, 2); ctx.quadraticCurveTo(6, -0.4, 14, -0.9); ctx.quadraticCurveTo(20, -0.6, 26, 2); ctx.closePath(); ctx.fill();
    });
    // dev kırmızı/turuncu taç daireleri
    this.layer(ctx, 0.2, () => {
      for (const c of this.bigCircles) {
        ctx.fillStyle = '#2B1360';
        ctx.fillRect(c.x - 0.06, c.y + 0.4, 0.12, 6);
        ctx.fillStyle = vGrad(ctx, c.y - c.r, c.y + c.r, [[0, c.c[0]], [1, c.c[1]]]);
        ctx.beginPath(); ctx.arc(c.x, c.y, c.r, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        ctx.beginPath(); ctx.arc(c.x - c.r * 0.3, c.y - c.r * 0.3, c.r * 0.55, 0, TAU); ctx.fill();
      }
    });
    // uzak selviler + tepeler
    this.layer(ctx, 0.32, () => {
      const v = this.cam.view(W, H, 0.32);
      for (const c of this.cyp) { if (c.layer !== 0) continue; const x = c.x * 0.5; if (x < v.x0 - 1 || x > v.x1 + 1) continue; cypress(ctx, x, 1.4, c.h * 0.75, c.w * 0.75, mix(c.c, '#C64BB5', 0.35), Math.sin(t * 0.7 + c.x) * 0.01); }
      const r = ridge(v.x0 - 2, v.x1 + 2, 1.6, 0.9, 0.2, 41, 0.6);
      fillRidge(ctx, r, 30, vGrad(ctx, 0.5, 3, [[0, '#FFB590'], [1, '#F08070']]));
    });
    // çıplak ağaçlar
    this.layer(ctx, 0.5, () => {
      const v = this.cam.view(W, H, 0.5);
      for (const b of this.bare) { const x = b.x * 0.6; if (x < v.x0 - 3 || x > v.x1 + 3) continue; bareTree(ctx, x, 2.1, b.h, b.c, b.seed, Math.sin(t * 0.5 + b.seed) * 0.004); }
      for (const c of this.cyp) { if (c.layer !== 1) continue; const x = c.x * 0.6; if (x < v.x0 - 1 || x > v.x1 + 1) continue; cypress(ctx, x, 2.2, c.h, c.w, c.c, Math.sin(t * 0.7 + c.x) * 0.012); }
      const r = ridge(v.x0 - 2, v.x1 + 2, 2.3, 0.7, 0.25, 53, 0.5);
      fillRidge(ctx, r, 30, vGrad(ctx, 1.4, 3, [[0, '#F0303A'], [1, '#B01040']]));
    });
    // 2023'ün hayaleti: kare resim, siyah kenarlar, minik eski karakter döngüde
    if (this.ghost.a > 0.01) this.drawGhost(ctx, W, H);
    // oyun düzlemi
    this.layer(ctx, 1, () => {
      const v = this.cam.view(W, H, 1);
      // zemin: şeftali yol, lacivert alt bant
      const segs = [this.ground.slice(0, 5), this.ground.slice(5, 8), this.ground.slice(8, 10), this.ground.slice(10)];
      for (const pts of segs) {
        if (pts.length < 2) continue;
        const band = (off: number, col: string | CanvasGradient) => {
          ctx.beginPath(); ctx.moveTo(pts[0].x, 40);
          for (const p of pts) ctx.lineTo(p.x, p.y + off + 0.25 * Math.sin(p.x * 0.35 + off * 3) * Math.min(1, off));
          ctx.lineTo(pts[pts.length - 1].x, 40); ctx.closePath();
          ctx.fillStyle = col; ctx.fill();
        };
        band(0, '#FFB08A');
        band(0.75, '#FF8A6A');
        band(1.3, '#F0303A');
        band(2.1, vGrad(ctx, 0, 8, [[0, '#2A0A5A'], [1, '#05003D']]));
        ctx.strokeStyle = 'rgba(255,230,200,0.9)'; ctx.lineWidth = 0.05;
        ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y + 0.02) : ctx.moveTo(p.x, p.y + 0.02))); ctx.stroke();
      }
      // yamaç duvarı
      const top = -0.3 - this.cliff.h;
      ctx.fillStyle = vGrad(ctx, top, 1, [[0, '#2A0A5A'], [1, '#05003D']]);
      ctx.fillRect(this.cliff.x1, top, 0.65, this.cliff.h + 2);
      // uçurum karanlığı
      ctx.fillStyle = vGrad(ctx, 0.3, 6, [[0, 'rgba(26,6,80,0)'], [0.35, 'rgba(26,6,80,0.75)'], [1, '#05003D']]);
      ctx.fillRect(this.chasm.x0, 0.3, this.chasm.x1 - this.chasm.x0, 40);
      ctx.fillStyle = 'rgba(255,170,140,0.25)';
      ctx.fillRect(this.chasm.x0 - 0.05, -0.05, 0.08, 6); ctx.fillRect(this.chasm.x1 - 0.03, -0.05, 0.08, 6);
      // laboratuvar kemeri
      if (this.arch.a > 0) this.drawArch(ctx);
      ctx.font = `600 0.55px ${FONT.mono}`;
      this.words.draw(ctx);
      ctx.font = `600 0.5px ${FONT.mono}`;
      this.parts.draw(ctx);
      void v;
    });
  }

  drawArch(ctx: CanvasRenderingContext2D) {
    const x = this.arch.x, y = this.world.groundAt(x, -50);
    const w = 2.6, h = 4.2;
    ctx.globalAlpha = this.arch.a;
    const g = ctx.createRadialGradient(x, y - h / 2, 0.3, x, y - h / 2, 5);
    g.addColorStop(0, 'rgba(120,255,230,0.55)'); g.addColorStop(1, 'rgba(120,255,230,0)');
    ctx.fillStyle = g; ctx.fillRect(x - 5, y - h / 2 - 5, 10, 10);
    ctx.fillStyle = '#98D2BE';
    ctx.beginPath(); ctx.moveTo(x - w / 2, y); ctx.lineTo(x - w / 2, y - h + w / 2); ctx.arc(x, y - h + w / 2, w / 2, Math.PI, 0); ctx.lineTo(x + w / 2, y); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#2A0810'; ctx.lineWidth = 0.18; ctx.stroke();
    ctx.fillStyle = '#2A0810'; ctx.fillRect(x - 0.03, y - h, 0.06, h);
    ctx.globalAlpha = 1;
  }

  drawGhost(ctx: CanvasRenderingContext2D, W: number, H: number) {
    // eski kare dünya, arka planda yüzen bir pencere gibi
    this.layer(ctx, 0.62, () => {
      const cx = 52 * 0.62 + 4.2, cy = -4.4, size = 4.2;
      const a = this.ghost.a * (0.75 + 0.1 * Math.sin(this.t * 7));
      ctx.globalAlpha = a;
      ctx.shadowColor = 'rgba(255,255,255,0.5)'; ctx.shadowBlur = 30;
      ctx.fillStyle = '#000';
      ctx.fillRect(cx - size / 2 - 0.12, cy - size / 2 - 0.12, size + 0.24, size + 0.24);
      ctx.shadowBlur = 0;
      ctx.drawImage(IMG.sahne3, cx - size / 2, cy - size / 2, size, size);
      // minik eski karakter: kare kare yürür, dikene değince başa döner
      const loop = 6.5;
      const k = (this.ghost.t % loop) / loop;
      const px = cx - size * 0.42 + k * size * 0.62, py = cy + size * 0.1 - Math.sin(k * Math.PI) * 0.25;
      const fr = Math.floor(this.ghost.t * 12) % 4;
      const im = IMG['yurume' + fr];
      const hh = size * 0.15, ww = hh * im.width / im.height;
      ctx.drawImage(im, px - ww / 2, py - hh, ww, hh);
      if (k > 0.96) { ctx.fillStyle = 'rgba(0,0,0,0.85)'; ctx.fillRect(cx - size / 2, cy - size / 2, size, size); }
      // tarama çizgileri
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      for (let y = cy - size / 2; y < cy + size / 2; y += 0.08) ctx.fillRect(cx - size / 2, y, size, 0.03);
      ctx.globalAlpha = 1;
    });
    void W; void H;
  }
}

export const sonbahar = () => new Sonbahar();
