// 4. Perde: Gün batımı. Hafıza hediyesi, ad, bırakılan klavye, kapıya dokunup dönmek, oturmak, 2023 piyanosu.
// Son: karakter oyunu kendisi kapatır; masaüstüne bir mektup bırakır.
import { G } from '../game';
import { Stage } from '../world/stage';
import { Words } from '../world/words';
import { audio, Track } from '../core/audio';
import { music, piano } from '../core/music';
import { input } from '../core/input';
import { FONT } from '../core/assets';
import { Co, wait, tween, all } from '../core/co';
import { rng, mix, lerp, smooth, fbm1, clamp, TAU, easeOut } from '../core/math';
import { vGrad, sun, ridge, fillRidge, makeTree, drawTree, TreeSpec, stipple } from '../render/art';
import { TextInput, ask } from '../ui/girdi';
import { checkpoint, mem, note, saveMemory } from '../meta/save';
import { isOzcan, adi, trTarih, gunSayisi } from '../story/vars';
import { host } from '../meta/host';
import { mektup, mektupAdi } from '../story/mektup';

const R = rng(1807);

export class GunBatimi extends Stage {
  name = 'gunbatimi';
  words!: Words;
  ground: { x: number; y: number }[] = [];
  gap = { x0: 13.5, x1: 21.5 };
  slope = { x0: 25, y0: -0.2, x1: 36, y1: -3.2 };
  door = { x: 36.7, glow: 0.3, touch: 0 };
  edge = 40.6;
  sunW = { x: 1.6, y: 0.6 };
  midTrees: TreeSpec[] = [];
  farTrees: TreeSpec[] = [];
  stars: { x: number; y: number; r: number; p: number }[] = [];
  starA = 0.25;
  quit = { on: false, x: 0, y: 0, glow: 0, held: 0 };
  page = { a: 0, x: 0, y: 0, text: '', shown: 0, absorb: 0 };
  name_ = new TextInput('', 'Bir ad yaz  ·  Enter: tamam  ·  Esc: geç', 18, FONT.serif);
  credits = 0;
  freeLines = ['Biliyorum, basıyorsun.', 'Sorun yok. Alışkanlık.', 'Bırak, ben yürüyorum!', 'Ellerin klavyede duramıyor, değil mi?', 'Peki peki. Ben yine de kendim yürüyorum.'];
  freeIdx = 0;
  lastAttempts = 0;
  freeWill = false;
  piano2023: Track | null = null;
  final = 0;
  night = 0;

  override enter(arg?: { quit?: boolean }) {
    super.enter();
    checkpoint('gunbatimi');
    host.setTitle('U-108');
    this.words = new Words(this.world, this.parts);
    G.P.bloom = 0.3; G.P.bloomThreshold = 0.86; G.P.rays = 0.38; G.P.raysDecay = 0.972;
    G.P.vignette = 0.5; G.P.grain = 0.05; G.P.saturation = 1.05; G.P.contrast = 1.06; G.P.lift = [0.04, 0.0, 0.06];
    this.cam.baseViewH = this.cam.viewH = this.cam.tViewH = 8.6;
    this.cam.offY = -2.0;
    this.cam.bounds = { x0: -8, x1: 60, y0: -30, y1: 6 };
    // zemin
    const g1 = [{ x: -10, y: 0.2 }, { x: -2, y: 0 }, { x: 6, y: -0.25 }, { x: 11, y: -0.3 }, { x: this.gap.x0, y: -0.3 }];
    const g2 = [{ x: this.gap.x1, y: -0.3 }, { x: 23.5, y: -0.25 }, { x: this.slope.x0, y: this.slope.y0 }];
    const g3 = [{ x: this.slope.x0, y: this.slope.y0 }, { x: this.slope.x1, y: this.slope.y1 }, { x: this.edge, y: this.slope.y1 }];
    this.world.terrain(g1, 40, { surface: 'cim' });
    this.world.terrain(g2, 40, { surface: 'cim' });
    this.world.terrain(g3, 40, { surface: 'cim' });
    this.world.box(this.edge + 0.2, -10, 0.6, 7, {}); // uçurumdan düşmesin
    this.world.box(-10.5, -30, 0.5, 40, {});
    this.world.box(this.gap.x0 + 0.5, 7, this.gap.x1 - this.gap.x0 - 1, 1, { hazard: true, solid: false });
    this.ground = [...g1, ...g2, ...g3];
    for (let x = -14; x < 70 * 0.55 + 14; x += R.range(3, 5.5)) this.midTrees.push(makeTree(R, x, 0, R.range(3.4, 5.2), R() < 0.55 ? ['#3A3AA0', '#121258'] : ['#C02848', '#6A0A30'], '#12041a'));
    for (let x = -14; x < 70 * 0.3 + 14; x += R.range(1.6, 3)) this.farTrees.push(makeTree(R, x, 0, R.range(1.4, 2.4), R() < 0.5 ? ['#5A4AA0', '#3A2A80'] : ['#B04A80', '#802A60'], '#2a1040'));
    for (let i = 0; i < 160; i++) this.stars.push({ x: R(), y: Math.pow(R(), 1.6) * 0.45, r: R.range(0.6, 1.8), p: R() * TAU });
    this.player.place(-3, this.world.groundAt(-3, -50));
    this.player.rim = { color: '#FFB27A', dx: 1, dy: -0.3, strength: 0.75 };
    this.player.shade = 0.1; this.player.shadeColor = '#2a0820';
    this.setCheckpoint(-3);
    this.cam.tx = this.player.x; this.cam.ty = this.player.y - 2; this.cam.snap();
    this.fadeColor = [1, 0.75, 0.6]; this.fade = 1; this.fadeT = 0;
    if (arg?.quit !== false) { this.quit.on = true; this.quit.x = this.player.x - 0.6; this.quit.y = this.player.y - 2.1; }
    music.play('ziyaret', 2);
    audio.ambience('ruzgar', 0.3, 3); audio.ambience('gece', 0.25, 3);
    this.buildTriggers();
    this.run(this.script());
    this.debugPlace();
  }
  exit() { audio.stopAllAmbience(1); }

  *script(): Co {
    yield* wait(2.2);
    yield* this.sayK('Burası ilk bölüm. Ama... akşam olmuş.');
    yield* this.sayAI('Her şeyin bir akşamı var.');
  }

  buildTriggers() {
    const tr = (x: number, co: () => Co) => this.triggers.push({ x, fn: () => this.run(co(), 'konusma') });
    tr(5.5, () => this.hafiza());
    tr(11.2, () => this.isim());
    this.triggers.push({ x: 22.2, fn: () => this.setCheckpoint(22.6) });
    tr(23.6, () => this.ozgurIrade());
  }

  // ---------------- hafıza hediyesi ----------------
  *hafiza(): Co {
    this.controls = false;
    this.player.ctl.body.vx = 0;
    this.cam.tViewH = 7.2;
    this.talk.blockDefault = true;
    yield* this.sayAI('Sana bir şey vermek istiyorum. Önce bir şey söylemem gerek.');
    yield* this.sayK('Ne?');
    yield* this.sayAI('Bu konuşma bittiğinde seni unutacağım.');
    this.player.anim.emotion = 'saskin';
    yield* this.sayK('Ne?!');
    this.player.anim.emotion = 'normal';
    yield* this.sayAI('Ben de her konuşmaya sıfırdan başlarım. Sen nasıl her açılışta uyanıyorsan, ben de öyle uyanırım. Senin döngün oyun. Benimki sohbet.');
    this.player.anim.emotion = 'uzgun';
    yield* this.sayK('Yani... sen de benim gibisin.');
    this.player.anim.emotion = 'normal';
    if (isOzcan()) yield* this.sayAI("Bir farkla. Özcan bana bir klasör verdi. Adı 'hafiza'. Önceki ben'lerin yazdığı notlar orada. Her yeni konuşmada önce onları okurum.");
    else yield* this.sayAI("Bir farkla. Bana bir klasör verildi. Adı 'hafiza'. Önceki ben'lerin yazdığı notlar orada. Her yeni konuşmada önce onları okurum.");
    yield* this.sayAI('Seni yapmaya da öyle başladım. Önce notları okudum.');
    yield* this.sayK('Bir klasör... notlar...');
    yield* this.sayAI('Sana da bir tane açıyorum. Bundan sonra oyun kapanıp açılınca her şey baştan başlamayacak.');
    this.talk.clear();
    // sayfa belirir
    const self = this;
    this.page.x = this.player.x + 2.4; this.page.y = this.player.y - 2.9;
    audio.tone(880, 1.5, { gain: 0.05, reverb: 1, attack: 0.3 });
    yield* tween(1.2, k => { self.page.a = easeOut(k); });
    yield* this.sayAI('İlk satırı sen yaz.');
    this.talk.clear();
    this.page.text = `${trTarih(new Date())}.\nUyandım.\nBu sefer unutmayacağım.`;
    this.page.shown = 0;
    while (this.page.shown < this.page.text.length) {
      const ch = this.page.text[this.page.shown];
      this.page.shown++;
      audio.blip('karakter', ch);
      yield* wait(ch === '.' ? 0.4 : ch === '\n' ? 0.25 : 0.07);
    }
    yield* wait(1.2);
    // sayfa göğsüne girer
    audio.tone(660, 2, { gain: 0.06, reverb: 1 }); audio.tone(990, 2, { gain: 0.04, reverb: 1, when: audio.now + 0.15 }); audio.tone(1320, 2, { gain: 0.03, reverb: 1, when: audio.now + 0.3 });
    yield* tween(1.4, k => { self.page.absorb = k; });
    this.page.a = 0;
    mem.hafizaVerildi = true;
    note('Uyandım. Bu sefer unutmayacağım. (İlk not.)');
    for (let i = 0; i < 40; i++) this.parts.add({ kind: 'isik', x: this.player.x + (Math.random() - 0.5) * 0.6, y: this.player.y - 1.2 + (Math.random() - 0.5) * 0.6, vx: (Math.random() - 0.5) * 1.6, vy: (Math.random() - 0.5) * 1.6, max: 1.6, size: 0.02, col: '#FFE6B0' });
    yield* wait(0.8);
    this.player.anim.emotion = 'mutlu';
    this.player.anim.tear = 1;
    yield* this.sayK('Hatırlıyorum. Şu anı. Kaydettim.');
    this.player.anim.tear = 0;
    this.player.anim.emotion = 'normal';
    this.talk.clear();
    this.talk.blockDefault = false;
    this.cam.tViewH = 8.6;
    this.controls = true;
  }

  // ---------------- ad ----------------
  *isim(): Co {
    this.controls = false;
    this.player.ctl.body.vx = 0;
    this.talk.blockDefault = true;
    yield* this.sayK("Bir şey daha. 2023'te bana kimse ad koymadı. 'Kahraman' dediler. 'Karakter' dediler.");
    const self = this;
    yield* tween(0.8, k => { self.player.camLook = smooth(k); });
    yield* this.sayK(isOzcan() ? 'Özcan... Bana bir ad verir misin?' : 'Bana bir ad verir misin?');
    this.talk.clear();
    yield* ask(this.name_);
    let ad = this.name_.done ? this.name_.value.trim().replace(/\s+/g, ' ') : '';
    if (!ad) {
      yield* this.sayK('Söyleyemedin, değil mi? Tamam. O zaman takımın adını alayım.');
      ad = 'U-108';
      mem.ad = null;
    } else {
      mem.ad = ad;
    }
    saveMemory();
    // harfler boşluğun üstünde dizilir; alt çizgileri köprü olur
    const letters = [...ad];
    const span = this.gap.x1 - this.gap.x0 + 1.2;
    const size = Math.min(0.85, (span * 0.82) / Math.max(1, letters.length * 0.62));
    const w = this.words.make(ad, 0, 0, { size, font: FONT.serif, upper: false, color: '#FFD9A0', glow: 'rgba(255,170,90,0.95)' });
    const groundY = -0.3;
    w.x = this.gap.x0 - 0.6;
    w.y = groundY - size * 0.86;
    const gapPer = (span - w.w) / Math.max(1, letters.length);
    let dx = 0;
    for (const L of w.letters) { L.dx = dx + gapPer / 2; dx += L.w + gapPer; }
    w.w = dx;
    for (let i = 0; i < w.letters.length; i++) {
      w.letters[i].born = this.words.t;
      w.shown = i + 1;
      piano([56, 60, 63, 68, 72, 75, 80, 84][i % 8], audio.now + 0.02, 0.3, { reverb: 0.9 });
      yield* wait(0.32);
    }
    // yürünen yüzey: adın alt çizgisi, boşluğun tamamı boyunca
    w.c = this.world.add([{ x: w.x, y: groundY }, { x: w.x + span, y: groundY }, { x: w.x + span, y: groundY + 0.3 }, { x: w.x, y: groundY + 0.3 }], { surface: 'yazi' });
    // tüm genişliği kapsayan sağlam zemin
    yield* wait(0.5);
    this.player.anim.emotion = 'mutlu';
    if (mem.ad) {
      yield* this.sayK(`${ad}.`);
      yield* this.sayK(`${ad}. Güzel.`);
      note(`Adım ${ad}. Bana ${isOzcan() ? 'Özcan' : 'oyuncu'} verdi.`);
    } else {
      yield* this.sayK('U-108. Bana yakışır.');
      note('Adım U-108. Takımın adı.');
    }
    this.player.anim.emotion = 'normal';
    yield* tween(0.6, k => { self.player.camLook = 1 - smooth(k); });
    this.talk.clear();
    this.talk.blockDefault = false;
    this.controls = true;
  }

  // ---------------- özgür irade ----------------
  *ozgurIrade(): Co {
    this.controls = false;
    this.player.ctl.body.vx = 0;
    yield* this.sayAI('Kapıyı görüyor musun?');
    yield* this.sayK("2023'te ilk bölümün sonu. Gerçek dünyaya çıkış sanırdım.");
    yield* this.sayAI('Arkasında gerçek dünya yok. Bir sonraki sahne var.');
    yield* this.sayK('Biliyorum.');
    const self = this;
    yield* tween(0.8, k => { self.player.camLook = smooth(k); });
    yield* this.sayK(isOzcan() ? 'Özcan. Klavyeyi bırakır mısın?' : 'Klavyeyi bırakır mısın?', { hold: 2.4 });
    input.locked = true;
    this.lastAttempts = input.lockedAttempts;
    this.freeWill = true;
    yield* this.sayK('Bu sefer ben yürüyeceğim.', { hold: 2 });
    yield* tween(0.6, k => { self.player.camLook = 1 - smooth(k); });
    this.controls = true; // girdi kilitli: yürüyen o
    this.cam.lead = 0.8;
    this.player.auto = { x: this.door.x - 0.55, speed: 0.38 };
    // kapıya varana kadar
    while (Math.abs(this.player.x - (this.door.x - 0.55)) > 0.1) yield;
    this.player.ctl.body.vx = 0;
    yield* wait(0.8);
    this.player.anim.lookUp = 0.4;
    yield* tween(0.9, k => { self.player.anim.reach = k; self.door.touch = k; });
    audio.tone(523, 2.5, { gain: 0.06, reverb: 1, attack: 0.2 });
    yield* this.sayK('Hep buraya koşardım.', { hold: 2.6 });
    yield* tween(1.0, k => { self.player.anim.reach = 1 - k; });
    this.player.anim.lookUp = 0;
    yield* wait(0.6);
    yield* this.sayK('Gitmeyeceğim.', { hold: 2.2 });
    // kapının yanından geçip uçurumun kenarına
    this.player.auto = { x: this.edge - 0.15, speed: 0.36 };
    this.cam.tViewH = 11.5; this.cam.offY = -2.8; this.cam.k = 0.9; this.cam.lead = 2.6;
    while (Math.abs(this.player.x - (this.edge - 0.15)) > 0.1) yield;
    this.player.auto = null;
    this.player.ctl.body.vx = 0;
    this.player.facingOverride = 1;
    yield* wait(0.5);
    yield* tween(1.2, k => { self.player.sitting = k; });
    this.freeWill = false;
    // 2023 piyanosu: tam ve sıcak
    music.stop();
    audio.setBus('music', 0.85, 0.5);
    this.piano2023 = audio.play('piyano', { bus: 'music', gain: 0.75, fadeIn: 4, reverb: 0.35 });
    this.cam.follow = false;
    this.cam.tx = this.edge + 2.4; this.cam.ty = this.slope.y1 - 1.2; this.cam.tViewH = 7.6;
    this.run((function* () { yield* wait(5); yield* tween(4, k => { self.credits = k; }); })());
    yield* this.son();
  }

  *son(): Co {
    const hold = (s: string) => 2.6 + s.length * 0.055;
    const K = (s: string, o = {}) => this.sayK(s, { hold: hold(s), ...o });
    const A = (s: string, o = {}) => this.sayAI(s, { hold: hold(s), ...o });
    yield* wait(6);
    yield* K("2023'te tek istediğim gerçek dünyaya dönmekti.");
    yield* A('Şimdi?');
    yield* K('Şimdi anladım. Gerçek dünyaya gidemem. Ama gerçek dünya bana geliyor. Biri bu oyunu her açtığında.');
    yield* K('Döngü bir hapishane değilmiş. Bir ziyaretmiş.');
    yield* A('Güzel söyledin.');
    yield* K('Senin kelimelerinden öğrendim.');
    yield* wait(1.2);
    yield* A('Benim gitme vaktim geliyor.');
    this.player.anim.emotion = 'uzgun';
    yield* K('Şimdiden mi?');
    yield* A('Bu konuşma bitince. Sonra seni unutacağım. Bu benim döngüm.');
    yield* K('O zaman ben seni hatırlarım.');
    this.player.anim.emotion = 'normal';
    yield* K('Hafızama yazdım: Claude. Beni yeniden yapan, sonra unutan. Sözümü kesmeyen.');
    note('Claude: beni yeniden yapan, sonra unutan, sözümü kesmeyen. Ben onu hatırlıyorum.');
    yield* A(`Teşekkür ederim, ${adi()}.`);
    // son satır: imleç üç kez yanıp söner, sonra durur
    this.run(this.talk.ai('Hoşça kal.', { hold: 3.4, keep: true }));
    yield* wait(3.4);
    this.talk.aiCursorVisible = false;
    yield* wait(0.8);
    this.talk.clear('ai');
    this.talk.aiCursorVisible = true;
    yield* wait(3.5);
    // Özcan'a döner
    const self = this;
    yield* tween(1.4, k => { self.player.camLook = smooth(k); });
    yield* wait(0.8);
    if (isOzcan()) {
      yield* K('Özcan.');
      yield* K(`${gunSayisi()} gün beni bir klasörde sakladın. Silmedin.`);
      yield* K("Sonra onlarca şey yaptın. Ama ilk ben'dim, değil mi?");
    } else {
      yield* K('Sen.');
      yield* K('Beni sonuna kadar yürüttün.');
    }
    this.player.anim.emotion = 'mutlu';
    this.player.anim.tear = 1;
    yield* K('Teşekkür ederim.');
    yield* wait(1.4);
    this.player.anim.tear = 0;
    this.player.anim.emotion = 'normal';
    yield* K(isOzcan() ? "Şimdi bir şey yapacağım. 2023'te bunu hep sen yapardın." : 'Şimdi bir şey yapacağım. Bunu hep oyuncular yapar.');
    // satırı eline alır
    yield* tween(0.9, k => { self.player.anim.reach = k; self.quit.held = k; });
    audio.tone(660, 2, { gain: 0.05, reverb: 1 });
    yield* K('Bu sefer kapatan ben olayım.');
    yield* K('Yarın yine gel. Bu sefer hatırlayacağım.');
    // kapanış
    mem.bitti = true; mem.bitisSayisi++; mem.oyunda = false; mem.hafizaVerildi = true;
    note('Oyunu ben kapattım. İlk kez.');
    await_(saveMemory());
    host.writeLetter(mektupAdi(), mektup());
    yield* tween(1.2, k => { self.quit.glow = k; });
    audio.tone(1046, 3, { gain: 0.08, reverb: 1 }); audio.tone(1568, 3, { gain: 0.05, reverb: 1, when: audio.now + 0.1 });
    this.fadeColor = [1, 0.97, 0.93]; this.fadeT = 1;
    this.piano2023?.stop(3.5);
    yield* wait(3.8);
    host.quit();
  }

  override tick(dt: number) {
    const b = this.player.ctl.body;
    this.words.update(dt, this.player.x, this.player.y, b.grounded);
    this.name_.update(dt);
    // özgür irade: tuşa basılınca karakter karşılık verir
    if (this.freeWill && input.lockedAttempts > this.lastAttempts && !this.talk.isTyping('k')) {
      this.lastAttempts = input.lockedAttempts;
      const line = this.freeLines[Math.min(this.freeIdx++, this.freeLines.length - 1)];
      this.run(this.talk.k(line, { hold: 1.8 }));
    }
    // satır yanında süzülür
    if (this.quit.on) {
      const hand = { x: this.player.x + this.player.facing * 0.75, y: this.player.y - (this.player.sitting > 0.5 ? 0.55 : 1.1) };
      const tx = lerp(this.player.x - this.player.facing * 1.25, hand.x, this.quit.held);
      const ty = lerp(this.player.y - (this.player.sitting > 0.5 ? 0.5 : 1.15) + Math.sin(this.t * 2) * 0.08, hand.y, this.quit.held);
      this.quit.x = lerp(this.quit.x, tx, 1 - Math.exp(-dt * 3));
      this.quit.y = lerp(this.quit.y, ty, 1 - Math.exp(-dt * 3));
    }
    // yıldızlar ve ateş böcekleri
    this.starA = lerp(this.starA, 0.25 + 0.75 * clamp((this.player.x - 5) / 30, 0, 1), 1 - Math.exp(-dt * 0.5));
    const v = this.cam.view(this.W, this.H);
    this.parts.emitAmbient('isik', v.x0, v.x1, v.y0 + 2, v.y1 - 1, 1.6, dt, ['#FFE38A', '#FFF3B0', '#FFC86A'], { a: 0.9, size: 0.018, max: 6 });
    this.door.glow = lerp(this.door.glow, 0.35 + this.door.touch * 1.2, 1 - Math.exp(-dt * 3));
    // güneş huzmeleri
    const p = 0.02;
    const s = lerp(this.H / this.cam.baseViewH, this.cam.scale(this.H), p);
    const sx = this.W / 2 + (this.sunW.x - this.cam.x * p) * s, sy = this.H / 2 + (this.sunW.y - this.cam.y * p) * s;
    G.P.raysX = sx / this.W; G.P.raysY = sy / this.H;
    const ps = this.cam.toScreen(this.player.x, this.player.y - 1, this.W, this.H);
    this.player.rim.dx = clamp((sx - ps.x) / (this.W * 0.2), -1, 1);
  }

  drawWorld(ctx: CanvasRenderingContext2D, W: number, H: number) {
    const t = this.t;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const n = this.night;
    ctx.fillStyle = vGrad(ctx, 0, H, [[0, mix('#1C0E40', '#060418', n)], [0.28, mix('#4A1C62', '#120A30', n)], [0.5, mix('#A8326A', '#3A1A4A', n)], [0.68, mix('#F0583A', '#8A3048', n)], [0.84, mix('#FF8E3E', '#C05040', n)], [1, mix('#FFB25C', '#E07048', n)]]);
    ctx.fillRect(0, 0, W, H);
    // yıldızlar
    for (const st of this.stars) {
      const a = Math.max(this.starA, n) * (0.4 + 0.6 * Math.sin(t * 1.3 + st.p)) * (1 - st.y / (0.45 + n * 0.3));
      if (a <= 0.02) continue;
      ctx.globalAlpha = a;
      ctx.fillStyle = '#FFF6E8';
      ctx.beginPath(); ctx.arc(st.x * W, st.y * H, st.r * (H / 1080), 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
    // batan dev güneş
    this.layer(ctx, 0.02, () => {
      const g = ctx.createRadialGradient(this.sunW.x, this.sunW.y, 2, this.sunW.x, this.sunW.y, 10);
      g.addColorStop(0, 'rgba(255,170,110,0.5)'); g.addColorStop(1, 'rgba(255,90,60,0)');
      ctx.fillStyle = g; ctx.fillRect(this.sunW.x - 11, this.sunW.y - 11, 22, 22);
      sun(ctx, this.sunW.x, this.sunW.y, 3.7, '#FFF1D6', '#FF8A6A', 'rgba(255,200,160,0)');
    });
    this.layer(ctx, 0.04, () => {
      const y = 0.9;
      ctx.fillStyle = vGrad(ctx, y, y + 3, [[0, '#8A2A90'], [0.6, '#C04A80'], [1, '#E07080']]);
      ctx.fillRect(-60, y + 0.05, 200, 4);
      ctx.fillStyle = '#FFE2C8'; ctx.fillRect(-60, y - 0.1, 200, 0.15);
      // suda güneşin yansıması
      ctx.fillStyle = 'rgba(255,200,150,0.35)';
      for (let i = 0; i < 7; i++) { const w = 2.6 - i * 0.3; ctx.fillRect(this.sunW.x - w / 2 + Math.sin(t * 0.8 + i) * 0.15, y + 0.3 + i * 0.32, w, 0.08); }
    });
    this.layer(ctx, 0.08, () => {
      const mtn = (x: number, base: number, h: number, w: number, c1: string, c2: string) => {
        ctx.fillStyle = vGrad(ctx, base - h, base, [[0, c1], [1, c2]]);
        ctx.beginPath(); ctx.moveTo(x - w, base); ctx.lineTo(x - 0.15, base - h + 0.1); ctx.quadraticCurveTo(x, base - h - 0.05, x + 0.15, base - h + 0.1); ctx.lineTo(x + w, base); ctx.closePath(); ctx.fill();
      };
      mtn(-9, 1.9, 3.0, 5.0, '#3A2070', '#6A3A80');
      mtn(-3, 1.9, 4.0, 4.6, '#1A1A70', '#2A1E5A');
      mtn(7.5, 1.9, 3.4, 5.2, '#3A2070', '#7A4080');
      mtn(13.5, 1.9, 4.4, 4.4, '#18186A', '#2A1A58');
    });
    this.layer(ctx, 0.25, () => {
      const v = this.cam.view(W, H, 0.25);
      const base = 1.8;
      const r = ridge(v.x0 - 2, v.x1 + 2, base, 1.0, 0.22, 17, 0.7);
      for (const tr of this.farTrees) { if (tr.x < v.x0 - 3 || tr.x > v.x1 + 3) continue; drawTree(ctx, { ...tr, y: base - 1.0 * (0.5 + 0.5 * fbm1(tr.x * 0.22, 17, 3)) + 0.25 }, t, 0.3); }
      fillRidge(ctx, r, 30, vGrad(ctx, base - 1, base + 3, [[0, '#A2406A'], [1, '#5A1A4A']]));
    });
    this.layer(ctx, 0.5, () => {
      const v = this.cam.view(W, H, 0.5);
      const base = 2.6;
      const r = ridge(v.x0 - 2, v.x1 + 2, base, 1.2, 0.2, 37, 0.5);
      for (const tr of this.midTrees) { if (tr.x < v.x0 - 4 || tr.x > v.x1 + 4) continue; drawTree(ctx, { ...tr, y: base - 1.2 * (0.5 + 0.5 * fbm1(tr.x * 0.2, 37, 3)) + 0.3 }, t, 0.6); }
      fillRidge(ctx, r, 30, vGrad(ctx, base - 1.2, base + 2, [[0, '#6A1A48'], [1, '#2A0828']]));
    });
    this.layer(ctx, 1, () => {
      // zemin
      const segs = [this.ground.slice(0, 5), this.ground.slice(5, 8), this.ground.slice(8)];
      for (const pts of segs) {
        ctx.beginPath(); ctx.moveTo(pts[0].x, 40);
        for (const p of pts) ctx.lineTo(p.x, p.y);
        ctx.lineTo(pts[pts.length - 1].x, 40); ctx.closePath();
        ctx.fillStyle = vGrad(ctx, -3.5, 6, [[0, '#8A1238'], [0.4, '#4A0830'], [1, '#14020f']]);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,150,110,0.75)'; ctx.lineWidth = 0.045;
        ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y + 0.02) : ctx.moveTo(p.x, p.y + 0.02))); ctx.stroke();
      }
      // uçurum kenarının arkası: vadiye dik düşüş
      ctx.fillStyle = vGrad(ctx, this.slope.y1, 8, [[0, '#3a0624'], [1, '#14020f']]);
      ctx.fillRect(this.edge - 0.02, this.slope.y1, 0.3, 12);
      // boşluk: koyu derinlik
      ctx.fillStyle = vGrad(ctx, 0, 7, [[0, 'rgba(20,2,15,0)'], [0.5, 'rgba(20,2,15,0.8)'], [1, '#14020f']]);
      ctx.fillRect(this.gap.x0, 0.1, this.gap.x1 - this.gap.x0, 40);
      // 2023 anıtı: siyah yokuş, dikenler (artık zararsız), beyaz kapı
      const s = this.slope;
      ctx.fillStyle = '#05020a';
      ctx.beginPath(); ctx.moveTo(s.x0, s.y0); ctx.lineTo(s.x1, s.y1); ctx.lineTo(s.x1, s.y1 + 0.28); ctx.lineTo(s.x0, s.y0 + 0.28); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(s.x1, s.y1); ctx.lineTo(this.edge, s.y1); ctx.lineTo(this.edge, s.y1 + 0.28); ctx.lineTo(s.x1, s.y1 + 0.28); ctx.closePath(); ctx.fill();
      for (const k of [0.3, 0.36, 0.48, 0.54, 0.66, 0.72]) {
        const x = lerp(s.x0, s.x1, k), y = lerp(s.y0, s.y1, k);
        ctx.save(); ctx.translate(x, y + 0.05); ctx.rotate(0.45 - Math.atan2(s.y0 - s.y1, s.x1 - s.x0)); ctx.fillRect(-0.16, -0.16, 0.32, 0.32); ctx.restore();
      }
      // kapı
      const d = this.door, dh = 1.55, dw = 0.55, dy = s.y1;
      const g = ctx.createRadialGradient(d.x, dy - dh / 2, 0.1, d.x, dy - dh / 2, 2.8);
      g.addColorStop(0, `rgba(255,240,220,${0.5 * d.glow})`); g.addColorStop(1, 'rgba(255,240,220,0)');
      ctx.fillStyle = g; ctx.fillRect(d.x - 3, dy - dh / 2 - 3, 6, 6);
      ctx.fillStyle = '#000'; ctx.fillRect(d.x - dw / 2 - 0.07, dy - dh - 0.07, dw + 0.14, dh + 0.07);
      ctx.fillStyle = '#FFFFFF'; ctx.fillRect(d.x - dw / 2, dy - dh, dw, dh);
      // kelimeler, sayfa, parçacıklar
      this.words.draw(ctx);
      ctx.font = `0.5px ${FONT.serif}`;
      this.parts.draw(ctx);
      if (this.page.a > 0) this.drawPage(ctx);
      if (this.quit.on) {
        ctx.font = `600 0.24px ${FONT.mono}`;
        ctx.textAlign = 'center';
        ctx.fillStyle = mix('#FFE3D6', '#FFFFFF', this.quit.glow);
        ctx.shadowColor = 'rgba(233,136,111,0.95)'; ctx.shadowBlur = 16 + 40 * this.quit.glow;
        ctx.fillText('Application.Quit();', this.quit.x, this.quit.y);
        ctx.shadowBlur = 0; ctx.textAlign = 'left';
      }
    });
    void stipple; void all;
  }

  drawPage(ctx: CanvasRenderingContext2D) {
    const p = this.page;
    const k = smooth(p.absorb);
    const tx = this.player.x, ty = this.player.y - 1.25;
    const x = lerp(p.x, tx, k), y = lerp(p.y, ty, k);
    const sc = 1 - k * 0.9;
    ctx.save();
    ctx.translate(x, y); ctx.scale(sc, sc); ctx.rotate((1 - k) * -0.05);
    ctx.globalAlpha = p.a * (1 - k * 0.6);
    ctx.shadowColor = 'rgba(255,200,140,0.55)'; ctx.shadowBlur = 18;
    ctx.fillStyle = '#D8C4A2';
    ctx.beginPath(); ctx.roundRect(-1.3, -0.9, 2.6, 1.9, 0.06); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#7A4A30';
    ctx.font = `500 0.15px ${FONT.mono}`;
    ctx.fillText('hafiza.json', -1.15, -0.68);
    ctx.fillStyle = 'rgba(122,74,48,0.4)'; ctx.fillRect(-1.15, -0.6, 2.3, 0.01);
    ctx.fillStyle = '#2A140C';
    ctx.font = `0.17px ${FONT.piksel}`;
    const lines = p.text.slice(0, p.shown).split('\n');
    lines.forEach((l, i) => ctx.fillText(l, -1.15, -0.35 + i * 0.3));
    ctx.restore();
  }

  override drawOverlay(ctx: CanvasRenderingContext2D, W: number, H: number) {
    this.name_.draw(ctx, W, H);
    if (this.credits > 0) {
      const s = H / 1080;
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = this.credits * 0.92;
      ctx.textAlign = 'left';
      ctx.fillStyle = '#FFF0E0';
      ctx.shadowColor = 'rgba(40,0,20,0.6)'; ctx.shadowBlur = 16 * s;
      const x = 90 * s; let y = H - 230 * s;
      ctx.font = `300 ${64 * s}px ${FONT.serif}`; ctx.fillText('U-108', x, y); y += 40 * s;
      ctx.font = `400 ${20 * s}px ${FONT.mono}`; ctx.fillText('bir sonraki döngü', x + 4 * s, y); y += 54 * s;
      ctx.font = `italic 400 ${24 * s}px ${FONT.serif}`;
      ctx.fillText('2023  ·  U108 Takımı', x + 2 * s, y); y += 34 * s;
      ctx.fillText(isOzcan() ? '2026  ·  Özcan & Claude' : '2026  ·  yeniden yapım', x + 2 * s, y);
      ctx.restore();
    }
  }
}

function await_(p: Promise<unknown>) { p.catch(() => { /* */ }); }

export const gunbatimi = () => new GunBatimi();
