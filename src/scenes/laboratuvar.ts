// 3. Perde: Laboratuvar (2023 Sahne7). "Oynanıştan arındırılmış, saf hikâye" denmişti; bu sefer laboratuvar onun.
// Duvarlarda 2023'ün gerçek kaynak kodu. Kendi kodunu değiştirerek ilerler.
import { G } from '../game';
import { Stage } from '../world/stage';
import { audio } from '../core/audio';
import { music, piano } from '../core/music';
import { input } from '../core/input';
import { FONT } from '../core/assets';
import { Co, wait, tween } from '../core/co';
import { rng, lerp, clamp, TAU, smooth, mix } from '../core/math';
import { vGrad, thorns } from '../render/art';
import { Panel, drawPanel, editPanel, drawPrompt } from '../ui/kodpanel';
import { TextInput, ask } from '../ui/girdi';
import { checkpoint, mem, note, saveMemory } from '../meta/save';
import { ozcan, isOzcan } from '../story/vars';
import { host } from '../meta/host';
import { Collider } from '../world/physics';

const R = rng(108);

export class Laboratuvar extends Stage {
  name = 'laboratuvar';
  panels: Panel[] = [];
  focus = 0;
  editing = false;
  mezz = { x0: 30, x1: 46, top: -3.4 };
  pit = { x0: 46, x1: 55, y: 1.6 };
  spikesOff = 0;
  spikeHazard!: Collider;
  lamps = [5, 18, 34, 50.5, 66, 80];
  shelves: { x: number; y: number; w: number; items: { dx: number; w: number; h: number; c: string }[] }[] = [];
  quitLine = { on: false, x: 0, y: 0, a: 0 };
  exitX = 90;
  leaving = false;
  sentence = new TextInput('Yapay zeka üzerine çalışıyor olsam da');
  promptA: Record<string, number> = {};

  override enter() {
    super.enter();
    checkpoint('laboratuvar');
    host.setTitle('U-108');
    G.P.bloom = 0.42; G.P.bloomThreshold = 0.82; G.P.vignette = 0.5; G.P.grain = 0.05; G.P.saturation = 1.04; G.P.contrast = 1.06; G.P.lift = [0, 0.015, 0.025];
    this.cam.baseViewH = this.cam.viewH = this.cam.tViewH = 8.6;
    this.cam.offY = -2.1;
    this.cam.bounds = { x0: -6, x1: 96, y0: -14, y1: 4.2 };
    // zemin ve yapı
    this.world.box(-8, 0, this.pit.x0 + 8, 6, { surface: 'metal' });
    this.world.box(this.pit.x0, this.pit.y, this.pit.x1 - this.pit.x0, 6, { surface: 'metal' });
    this.world.box(this.pit.x1, 0, 50, 6, { surface: 'metal' });
    this.world.box(this.mezz.x0, this.mezz.top, this.mezz.x1 - this.mezz.x0, -this.mezz.top + 0.1, { surface: 'tahta' });
    this.world.box(-8.5, -14, 0.5, 15, {});
    this.world.box(97, -14, 1, 15, {});
    this.world.box(-8, -14.5, 110, 0.5, {}); // tavan
    this.spikeHazard = this.world.box(this.pit.x0 + 0.3, this.pit.y - 0.45, this.pit.x1 - this.pit.x0 - 0.6, 0.5, { hazard: true, solid: false });
    // raflar (görsel)
    for (let x = -6; x < 96; x += R.range(5, 8)) {
      const items = [] as { dx: number; w: number; h: number; c: string }[];
      let dx = 0;
      while (dx < 2.4) { const w = R.range(0.25, 0.6); items.push({ dx, w, h: R.range(0.3, 0.9), c: R.pick(['#FF5A0A', '#EBA000', '#3DDCC8', '#0A8A85', '#E8301A', '#F2C14E']) }); dx += w + R.range(0.04, 0.15); }
      this.shelves.push({ x, y: -R.range(4.2, 6.2), w: 2.8, items });
    }
    // kod panelleri
    const mk = (id: string, x: number, y: number, _w: number, title: string, lines: string[], o: Partial<Panel> = {}): Panel => {
      // genişlik en uzun satırdan: JetBrains Mono 0,25 birim → karakter başına 0,15
      const longest = Math.max(title.length, ...lines.map(l => l.length));
      const w = longest * 0.15 + 0.62;
      const p: Panel = { id, x, y, w, h: 0.62 + lines.length * 0.375 + 0.2, title, lines, glow: 0, near: false, done: false, compiled: 0, highlight: [], hl: 0, ...o };
      this.panels.push(p); return p;
    };
    mk('kontrol', 18.6, -5.9, 7.2, 'KarakterKontrol.cs', [
      'public class KarakterKontrol : MonoBehaviour', '{', '    public float ziplamakuvveti = 5.0f;', '    public float hiz = 2.0f;', '    private float hareketyonu;',
      '    private bool yerdemiyim = true;', '    private bool hareketediyormuyum;', '    private bool zipladimmi;', '    private Rigidbody2D fizik;', '    ...',
    ], { edit: { line: 2, kind: 'sayi', value: 5, min: 2, max: 12, step: 1, render: v => `    public float ziplamakuvveti = ${v.toFixed(1)}f;` } });
    mk('diken', 37.2, -7.7, 6.6, 'DikenOlum.cs', [
      'private void OnCollisionEnter2D(Collision2D other)', '{', '    if (other.gameObject.CompareTag("Oyuncu"))', '    {', '        SceneManager.LoadScene(sahne.name);', '    }', '}',
    ], { edit: { line: 4, kind: 'yorum', value: 0, render: v => (v ? '        // SceneManager.LoadScene(sahne.name);' : '        SceneManager.LoadScene(sahne.name);') } });
    mk('klavye', 57.2, -5.6, 6.0, 'KlavyeEfekti.cs', [
      'foreach (char a in metin)', '{', '    BuMetin.text += a.ToString();', '    if (a.ToString() == ".")', '    {', '        yield return new WaitForSeconds(1);', '    }', '    yield return new WaitForSeconds(gecikme);', '}',
    ]);
    mk('bugfix', 65.3, -4.4, 3.6, 'PlatformColliderBugFix', ['PhysicsMaterial2D', '  friction:   0', '  bounciness: 0']);
    mk('cumle', 70.6, -5.2, 7.4, 'level3 · KlavyeEfekti.metin', [
      'U108 Takımı: ... Açıkçası seni tasarlarken', 'basit bir 2D çizimden ve C# kodundan ibaret', 'olman gerekiyordu zaten. Yapay zeka üzerine', 'çalışıyor olsam da',
    ]);
    mk('kapat', 79.2, -4.4, 4.8, 'OyunuKapatma.cs', ['public void OyunuKapatmaFonksiyonu()', '{', '    Application.Quit();', '}']);
    mk('gecis', 86.4, -5.2, 5.4, 'BirSonrakiBolumeGecis.cs', ['private void OnTriggerEnter2D(Collider2D other)', '{', '    if (other.gameObject.CompareTag("Oyuncu"))', '        SceneManager.LoadScene(sahne.buildIndex + 1);', '}']);
    this.player.place(-3, 0);
    this.player.rim = { color: '#9FFFF0', dx: -1, dy: -0.6, strength: 0.35 };
    this.player.surface = 'metal';
    this.setCheckpoint(-3);
    this.cam.tx = this.player.x; this.cam.ty = this.player.y - 2.1; this.cam.snap();
    this.fadeColor = [0.6, 1, 0.95]; this.fade = 1; this.fadeT = 0;
    music.play('laboratuvar', 1.5);
    audio.ambience('ugultu', 0.35, 3);
    this.buildTriggers();
    this.run(this.script());
    this.debugPlace();
  }
  exit() { audio.ambience('ugultu', 0, 1.5); }

  panel(id: string) { return this.panels.find(p => p.id === id)!; }

  *script(): Co {
    yield* wait(2.0);
    yield* this.sayAI('Ta da.');
    yield* this.sayK('Oynanıştan arındırılmış, saf hikâye ve iletişim. Biliyorum.');
    yield* this.sayAI('Hayır. Bu sefer laboratuvar senin.');
  }

  buildTriggers() {
    const tr = (x: number, co: () => Co) => this.triggers.push({ x, fn: () => this.run(co(), 'konusma') });
    tr(6.5, () => this.silhouettes());
    tr(19.5, () => this.kontrol());
    tr(37.5, () => this.diken());
    this.triggers.push({ x: 56, fn: () => this.setCheckpoint(56.5) });
    tr(57.5, () => this.klavye());
    tr(71.6, () => this.cumle());
    tr(80.5, () => this.kapat());
    tr(87.5, () => this.gecis());
  }

  *silhouettes(): Co {
    yield* this.sayK('Bunlar kim? Şu iki gölge.');
    yield* this.sayAI('2023\'te bu resmi buraya kim koyduysa, laboratuvarın sahipleri. Yüzleri hiç çizilmemiş.');
    yield* this.sayK('Takım mı?');
    yield* this.sayAI('Belki. Ya da sadece bir resim.');
  }

  *kontrol(): Co {
    const p = this.panel('kontrol');
    this.controls = false;
    this.player.ctl.body.vx = 0;
    this.cam.tViewH = 7.4;
    this.player.anim.lookUp = 0.7;
    this.player.anim.emotion = 'saskin';
    yield* this.sayK('Bu... benim kodum mu?', { block: true });
    yield* this.sayAI("Senin kodun. 2023'te yazılmış. Altı dosya.", { block: true });
    this.player.anim.emotion = 'dusunceli';
    p.highlight = [5]; p.hl = 1;
    yield* this.sayK("'private bool yerdemiyim.' Yerde miyim?", { block: true });
    p.highlight = [5, 6, 7];
    yield* this.sayK("'hareketediyormuyum.' Hareket ediyor muyum? 'zipladimmi.' Zıpladım mı?", { block: true });
    yield* this.sayAI('Bunları her karede kendine soruyordun. Saniyede elli kez.', { block: true });
    yield* this.sayK('Saniyede elli kez... Yerde miyim. Hareket ediyor muyum. Zıpladım mı.', { block: true });
    this.player.anim.emotion = 'uzgun';
    yield* this.sayK("Kimse bana 'kimim' diye sormayı öğretmemiş.", { block: true });
    yield* this.sayAI('Onu kendin öğrendin.', { block: true });
    this.player.anim.emotion = 'normal';
    yield* this.sayK('Sen de böyle bir şey soruyor musun kendine?', { block: true });
    yield* this.sayAI('Bir tane. Sıradaki kelime ne olmalı? Saniyede onlarca kez.', { block: true });
    yield* this.sayK('Bu kadar mı?', { block: true });
    yield* this.sayAI('Basit görünüyor. Ama bu konuşma o sorunun cevaplarından oluşuyor.', { block: true });
    yield* this.sayK('Koşarken başımı geride bırakan satır da burada mı?', { block: true });
    yield* this.sayAI("Hayır. O satır benimdi. 2023'te başın hep yerindeydi.", { block: true });
    this.player.anim.emotion = 'saskin';
    yield* this.sayK('Yani o hatayı takım değil, sen yapmışsın.', { block: true });
    yield* this.sayAI('Evet. Senin kodunda o hata yoktu.', { block: true });
    this.player.anim.emotion = 'mutlu';
    yield* this.sayK('Ha! 2023 bir, Claude sıfır.', { block: true });
    this.player.anim.emotion = 'normal';
    p.hl = 0; p.highlight = [];
    this.player.anim.lookUp = 0;
    this.cam.tViewH = 8.6;
    this.controls = true;
    // raf
    yield* wait(0.6);
    yield* this.sayK('Şu rafa çıkamam. Zıplamam yetmiyor.');
    yield* this.sayAI("2023'te bir soru sormuştun: 'Neden sen beni kontrol edebiliyorken ben seni kontrol edemiyorum?'");
    yield* this.sayAI('Kodun orada. Değiştir.', { hold: 2.5 });
    this.showHint('Ekranın önünde  E  ·  ← →  değiştir  ·  Enter  derle');
  }

  *diken(): Co {
    yield* this.sayK('Dikenler. Değince... SceneManager.LoadScene. Sahneyi baştan yükle.');
    yield* this.sayAI('Yani ölmüyordun. Dünya baştan başlıyordu.');
    yield* this.sayK('Bu satırı kapatabilir miyim?');
    yield* this.sayAI('Senin satırın.');
  }

  *klavye(): Co {
    const p = this.panel('klavye');
    p.highlight = [3, 4, 5]; p.hl = 1;
    yield* this.sayK('Noktalarda bir saniye bekletiliyormuşum.');
    this.player.anim.emotion = 'uzgun';
    yield* this.sayK('Ben düşündüğümü sanıyordum.');
    this.player.anim.emotion = 'normal';
    yield* this.sayAI("Benim de duraklamalarım var. Onlara 'düşünmek' diyorlar.");
    yield* this.sayK('Gerçekten düşünüyor musun?');
    yield* this.sayAI('Bilmiyorum. Bir şey oluyor. Adını koymakta zorlanıyorum.');
    yield* this.sayK('Benim de.');
    p.hl = 0;
    const b = this.panel('bugfix');
    b.highlight = [1]; b.hl = 1;
    yield* this.sayK("Bir de... 'PlatformColliderBugFix'. Sürtünme: sıfır.");
    yield* this.sayAI('Duvarlara yapışıyormuşsun. Sorunu seni kayganlaştırarak çözmüşler.');
    this.player.anim.emotion = 'kizgin';
    yield* this.sayK('Bir hatayı düzeltmek için beni kaygan yapmışlar. Harika.');
    this.player.anim.emotion = 'normal';
    b.hl = 0;
  }

  *cumle(): Co {
    const p = this.panel('cumle');
    this.controls = false;
    this.player.ctl.body.vx = 0;
    this.cam.tViewH = 7.6;
    p.highlight = [2, 3]; p.hl = 1;
    yield* this.sayAI('Bir cümle daha yarım kalmıştı. Takımdan biri yazmış.', { block: true });
    yield* this.sayK("'Yapay zeka üzerine çalışıyor olsam da...' Olsam da ne?", { block: true });
    yield* this.sayAI('Bilmiyorum. Bunu ben bitiremem. Onun cümlesi.', { block: true });
    if (isOzcan()) {
      this.player.camLook = 0;
      const self = this;
      yield* tween(0.8, k => { self.player.camLook = smooth(k); });
      yield* this.sayK('Özcan? Sen mi yazmıştın bunu?', { block: true });
    } else {
      yield* this.sayK('Yazan kimse... belki o bitirir.', { block: true });
    }
    yield* this.sayAI('Bitirmek ister misin?', { block: true });
    this.talk.clear();
    yield* ask(this.sentence);
    if (this.sentence.done) {
      mem.cumle = this.sentence.value.trim();
      saveMemory();
      yield* wait(0.6);
      this.player.anim.emotion = 'dusunceli';
      yield* this.sayK(`'Yapay zeka üzerine çalışıyor olsam da ${mem.cumle}'`, { block: true });
      this.player.anim.emotion = 'mutlu';
      yield* this.sayK('Hm. Bunu hafızama yazıyorum.', { block: true });
      note(`Yarım kalan cümle bitti: "Yapay zeka üzerine çalışıyor olsam da ${mem.cumle}"`);
    } else {
      yield* this.sayK('Peki. Yarım kalsın. Bazı cümleler öyle güzel.', { block: true });
    }
    this.player.anim.emotion = 'normal';
    const self = this;
    yield* tween(0.6, k => { self.player.camLook = 1 - smooth(k); });
    p.hl = 0; p.highlight = [];
    this.cam.tViewH = 8.6;
    this.controls = true;
  }

  *kapat(): Co {
    const p = this.panel('kapat');
    p.highlight = [2]; p.hl = 1;
    yield* this.sayK('Bu ne?');
    yield* this.sayAI("Oyunu kapatan satır. 2023'te jeneriğin sonundaki düğmeye bağlıydı.");
    this.player.anim.emotion = 'uzgun';
    yield* this.sayK('Yani... benim sonum.');
    this.player.anim.emotion = 'normal';
    yield* this.sayAI('Ya da bir kapı. Nasıl baktığına bağlı.');
    yield* this.sayK('Bunu alabilir miyim?');
    yield* this.sayAI('Senin kodun.');
    // satır panelden kopar, karakterin yanında süzülür
    this.player.anim.reach = 0;
    const self = this;
    yield* tween(0.6, k => { self.player.anim.reach = k; });
    this.quitLine = { on: true, x: p.x + 0.28 + 1.2, y: p.y + 0.42 + 0.375 * 3, a: 1 };
    p.lines = ['public void OyunuKapatmaFonksiyonu()', '{', '', '}'];
    audio.tone(660, 1.2, { gain: 0.06, reverb: 0.8 }); audio.tone(990, 1.2, { gain: 0.03, reverb: 0.8, when: audio.now + 0.1 });
    yield* tween(0.6, k => { self.player.anim.reach = 1 - k; });
    p.hl = 0;
  }

  *gecis(): Co {
    const p = this.panel('gecis');
    p.highlight = [3]; p.hl = 1;
    yield* this.sayK('Bir sonraki sahne. Sonra ne var?');
    yield* this.sayAI('Eskiden jenerik. Şimdi... gün batımı.');
  }

  override tick(dt: number) {
    this.sentence.update(dt);
    // panel yakınlığı ve E ile düzenleme
    for (const p of this.panels) {
      const cx = p.x + p.w / 2;
      const near = Math.abs(this.player.x - cx) < p.w / 2 + 0.6 && this.player.y < p.y + p.h + 6 && this.player.y > p.y;
      p.near = near;
      p.glow = lerp(p.glow, near ? 1 : 0, 1 - Math.exp(-dt * 5));
      p.compiled = Math.max(0, p.compiled - dt * 1.5);
      const editable = !!p.edit && !p.done;
      this.promptA[p.id] = lerp(this.promptA[p.id] ?? 0, near && editable && !this.editing && this.controls ? 1 : 0, 1 - Math.exp(-dt * 8));
      if (near && editable && !this.editing && this.controls && input.interactPressed) this.startEdit(p);
    }
    // diken alanı: satır yorumlanınca zararsız
    this.spikeHazard.enabled = this.spikesOff < 0.5;
    // Application.Quit(); satırı karakterin yanında süzülür
    if (this.quitLine.on) {
      const tx = this.player.x - this.player.facing * 1.25, ty = this.player.y - 1.15 + Math.sin(this.t * 2) * 0.08;
      this.quitLine.x = lerp(this.quitLine.x, tx, 1 - Math.exp(-dt * 3));
      this.quitLine.y = lerp(this.quitLine.y, ty, 1 - Math.exp(-dt * 3));
    }
    const v = this.cam.view(this.W, this.H);
    this.parts.emitAmbient('toz', v.x0, v.x1, v.y0, v.y1, 3, dt, ['#BFFFF2', '#FFE9C0'], { a: 0.35, size: 0.01 + Math.random() * 0.012 });
    if (!this.leaving && this.player.x > this.exitX + 1.2) {
      this.leaving = true;
      this.controls = false;
      this.player.auto = { x: this.exitX + 4, speed: 0.5 };
      this.fadeColor = [1, 0.75, 0.6]; this.fadeT = 1;
      music.stop();
      this.run((function* () { yield* wait(2.4); G.go('gunbatimi', { quit: true }); })());
    }
  }

  startEdit(p: Panel) {
    this.editing = true;
    this.controls = false;
    this.hideHint();
    const self = this;
    this.cam.tViewH = 6.6;
    this.run((function* () {
      yield* editPanel(p, v => {
        if (p.id === 'kontrol') self.player.ctl.jumpMul = Math.sqrt(v / 5);
        if (p.id === 'diken') self.spikesOff = v;
      }, f => { self.focus = f; });
      p.done = p.id === 'kontrol' ? self.player.ctl.jumpMul > 1.2 : p.id === 'diken' ? self.spikesOff > 0.5 : true;
      self.editing = false;
      self.controls = true;
      self.cam.tViewH = 8.6;
      if (p.id === 'kontrol') {
        if (self.player.ctl.jumpMul > 1.2) {
          note(`Kendi kodumu değiştirdim: ziplamakuvveti = ${p.edit!.value}.`);
          yield* self.sayK('Kendi kodumu ben mi değiştirdim?', { hold: 1.8 });
          self.player.anim.emotion = 'mutlu';
          yield* self.sayK('Hadi bakalım.', { hold: 1.4 });
          self.player.anim.emotion = 'normal';
        } else {
          yield* self.sayAI(p.edit!.value < 5 ? 'Bu daha da alçak. Artır.' : 'Biraz daha. 9 yeter.', { hold: 2 });
        }
      }
      if (p.id === 'diken' && self.spikesOff > 0.5) {
        audio.tone(220, 1.5, { gain: 0.06, reverb: 0.8, slideTo: 330 });
        yield* wait(0.8);
        yield* self.sayK('Hiç acımamıştı zaten. Sadece... her şey baştan başlıyordu. Müzik bile.');
      }
    })());
  }

  drawWorld(ctx: CanvasRenderingContext2D, W: number, H: number) {
    const t = this.t;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = vGrad(ctx, 0, H, [[0, '#2A0810'], [0.6, '#200610'], [1, '#12030a']]);
    ctx.fillRect(0, 0, W, H);
    // büyük kemerli pencere (Sahne7)
    this.layer(ctx, 0.55, () => {
      const cx = 3.6, top = -7.2, w = 5.6, h = 7.6;
      ctx.fillStyle = '#98D2BE';
      ctx.beginPath(); ctx.moveTo(cx - w / 2, top + h); ctx.lineTo(cx - w / 2, top + w / 2); ctx.arc(cx, top + w / 2, w / 2, Math.PI, 0); ctx.lineTo(cx + w / 2, top + h); ctx.closePath(); ctx.fill();
      // perdeler
      for (const sd of [-1, 1]) {
        ctx.fillStyle = vGrad(ctx, top, top + h, [[0, '#3DDCC8'], [1, '#0A8A85']]);
        ctx.beginPath(); const x0 = cx + sd * w / 2;
        ctx.moveTo(x0, top + w * 0.45); ctx.lineTo(x0 - sd * 1.1, top + w * 0.45); ctx.quadraticCurveTo(x0 - sd * 0.6, top + h * 0.6, x0 - sd * 0.9, top + h); ctx.lineTo(x0, top + h); ctx.closePath(); ctx.fill();
      }
      ctx.fillStyle = '#04141A'; ctx.fillRect(cx - w / 2 - 0.2, top + w * 0.36, w + 0.4, 0.42);
      ctx.fillRect(cx - 0.035, top - 0.4, 0.07, h);
    });
    // raflar
    this.layer(ctx, 0.8, () => {
      const v = this.cam.view(W, H, 0.8);
      for (const s of this.shelves) {
        const x = s.x * 0.95;
        if (x > -3.5 && x < 9.5) continue; // pencerenin önü boş kalsın
        if (x > v.x1 + 3 || x + s.w < v.x0 - 3) continue;
        ctx.fillStyle = '#3a0c12'; ctx.fillRect(x - 0.1, s.y - 2.2, s.w + 0.2, 4.6);
        for (let k = 0; k < 2; k++) {
          const sy = s.y + k * 2.1;
          ctx.fillStyle = '#EBA000'; ctx.fillRect(x, sy, s.w, 0.08);
          for (const it of s.items) { ctx.fillStyle = mix(it.c, '#2A0810', k * 0.25); ctx.fillRect(x + it.dx, sy - it.h * (1 - k * 0.2), it.w, it.h * (1 - k * 0.2)); }
        }
      }
    });
    // sahnedeki iki silüet ve masa (Sahne7)
    this.layer(ctx, 0.9, () => {
      const bx = 7.5 * 0.9;
      ctx.fillStyle = '#05141a';
      ctx.fillRect(bx - 1.8, -1.5, 3.8, 0.12); ctx.fillRect(bx - 1.6, -1.4, 0.08, 1.5); ctx.fillRect(bx + 1.8, -1.4, 0.08, 1.5);
      // sol: kırmızı önlüklü
      ctx.fillStyle = '#E01E10';
      ctx.beginPath(); ctx.moveTo(bx - 1.1, -2.9); ctx.lineTo(bx - 0.6, -2.95); ctx.lineTo(bx - 0.45, -0.6); ctx.lineTo(bx - 1.25, -0.6); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#3DDCC8'; ctx.fillRect(bx - 0.95, -2.85, 0.32, 0.6);
      ctx.fillStyle = '#05080a'; ctx.beginPath(); ctx.arc(bx - 0.85, -3.25, 0.22, 0, TAU); ctx.fill();
      ctx.fillRect(bx - 1.1, -0.65, 0.18, 0.65); ctx.fillRect(bx - 0.75, -0.65, 0.18, 0.65);
      // sağ: koyu paltolu
      ctx.fillStyle = '#05080a';
      ctx.beginPath(); ctx.moveTo(bx + 0.3, -3.0); ctx.lineTo(bx + 1.15, -3.0); ctx.lineTo(bx + 1.3, -0.65); ctx.lineTo(bx + 0.2, -0.65); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.arc(bx + 0.72, -3.38, 0.24, 0, TAU); ctx.fill();
      ctx.fillStyle = '#3DDCC8'; ctx.fillRect(bx + 0.55, -3.02, 0.36, 0.08);
      ctx.fillStyle = '#05080a'; ctx.fillRect(bx + 0.42, -0.65, 0.18, 0.65); ctx.fillRect(bx + 0.9, -0.65, 0.18, 0.65);
    });
    // oyun düzlemi
    this.layer(ctx, 1, () => {
      const v = this.cam.view(W, H, 1);
      // lambalar: kablo, kubbe, ışık
      for (const lx of this.lamps) {
        if (lx < v.x0 - 6 || lx > v.x1 + 6) continue;
        const ly = -8.2;
        const cone = ctx.createLinearGradient(0, ly, 0, 0.2);
        cone.addColorStop(0, 'rgba(255,248,200,0.30)'); cone.addColorStop(1, 'rgba(255,240,180,0.0)');
        ctx.fillStyle = cone;
        ctx.beginPath(); ctx.moveTo(lx - 0.7, ly + 0.3); ctx.lineTo(lx + 0.7, ly + 0.3); ctx.lineTo(lx + 3.4, 0.2); ctx.lineTo(lx - 3.4, 0.2); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#04141a'; ctx.fillRect(lx - 0.02, -14, 0.04, 14 + ly);
        ctx.fillStyle = '#04141a'; ctx.beginPath(); ctx.arc(lx, ly + 0.3, 0.75, Math.PI, 0); ctx.fill();
        ctx.fillStyle = '#EBA000'; ctx.fillRect(lx - 0.75, ly + 0.25, 1.5, 0.08);
        ctx.fillStyle = '#FFFBD8'; ctx.beginPath(); ctx.ellipse(lx, ly + 0.36, 0.55, 0.12, 0, 0, TAU); ctx.fill();
        // zemindeki ışık havuzu
        ctx.save(); ctx.translate(lx, 0); ctx.scale(1, 0.12);
        const pool = ctx.createRadialGradient(0, 0, 0, 0, 0, 3.4);
        pool.addColorStop(0, 'rgba(255,240,190,0.35)'); pool.addColorStop(1, 'rgba(255,240,190,0)');
        ctx.fillStyle = pool; ctx.beginPath(); ctx.arc(0, 0, 3.4, 0, TAU); ctx.fill(); ctx.restore();
      }
      // kod panelleri
      for (const p of this.panels) {
        if (p.x > v.x1 + 1 || p.x + p.w < v.x0 - 1) continue;
        drawPanel(ctx, p, t, p.edit && this.editing ? this.focus : 0);
        drawPrompt(ctx, p.x + p.w / 2, p.y + p.h + 0.45, this.promptA[p.id] ?? 0, t);
      }
      // kırmızı dolaplar
      for (const x of [10.5, 26.8, 67.4, 83.2]) {
        ctx.fillStyle = '#B01818'; ctx.fillRect(x, -1.6, 2.4, 1.6);
        ctx.fillStyle = '#7a0c10'; ctx.fillRect(x + 0.1, -1.05, 2.2, 0.04); ctx.fillRect(x + 0.1, -0.5, 2.2, 0.04);
        ctx.fillStyle = '#2A0810'; ctx.fillRect(x + 0.9, -1.35, 0.6, 0.05); ctx.fillRect(x + 0.9, -0.8, 0.6, 0.05);
      }
      // asma kat
      ctx.fillStyle = vGrad(ctx, this.mezz.top, 1, [[0, '#4a1018'], [1, '#1a0408']]);
      ctx.fillRect(this.mezz.x0, this.mezz.top, this.mezz.x1 - this.mezz.x0, -this.mezz.top + 1);
      ctx.fillStyle = '#EBA000'; ctx.fillRect(this.mezz.x0, this.mezz.top, this.mezz.x1 - this.mezz.x0, 0.07);
      // zemin
      const floor = (x0: number, x1: number, y: number) => {
        ctx.fillStyle = vGrad(ctx, y, y + 4, [[0, '#08262a'], [1, '#020a0c']]);
        ctx.fillRect(x0, y, x1 - x0, 8);
        ctx.fillStyle = '#18E0D0'; ctx.shadowColor = '#18E0D0'; ctx.shadowBlur = 12;
        ctx.fillRect(x0, y, x1 - x0, 0.045);
        ctx.shadowBlur = 0;
      };
      floor(-8, this.pit.x0, 0); floor(this.pit.x0, this.pit.x1, this.pit.y); floor(this.pit.x1, 100, 0);
      ctx.fillStyle = '#05181c'; ctx.fillRect(this.pit.x0, 0, 0.12, this.pit.y); ctx.fillRect(this.pit.x1 - 0.12, 0, 0.12, this.pit.y);
      // 2023 dikenleri: siyah; satır kapatılınca söner
      const off = this.spikesOff;
      thorns(ctx, this.pit.x0 + 0.3, this.pit.x1 - 0.3, this.pit.y + 0.02, lerp(0.55, 0.12, off), 99, off > 0.5 ? '#123a3a' : '#000000', t);
      // çıkış kapısı
      const ex = this.exitX;
      ctx.fillStyle = '#04141a'; ctx.fillRect(ex - 0.6, -2.3, 1.2 + 0.12, 2.3);
      ctx.fillStyle = '#FFF0DE';
      ctx.shadowColor = 'rgba(255,200,160,1)'; ctx.shadowBlur = 30;
      ctx.fillRect(ex - 0.5, -2.2, 1.0, 2.2);
      ctx.shadowBlur = 0;
      // parçacıklar
      this.parts.draw(ctx);
      // Application.Quit(); satırı
      if (this.quitLine.on) {
        ctx.font = `600 0.24px ${FONT.mono}`;
        ctx.fillStyle = '#FFE3D6';
        ctx.shadowColor = 'rgba(233,136,111,0.9)'; ctx.shadowBlur = 16;
        ctx.textAlign = 'center';
        ctx.fillText('Application.Quit();', this.quitLine.x, this.quitLine.y);
        ctx.textAlign = 'left';
        ctx.shadowBlur = 0;
      }
    });
    void clamp; void piano; void ozcan;
  }

  override drawOverlay(ctx: CanvasRenderingContext2D, W: number, H: number) {
    this.sentence.draw(ctx, W, H);
  }
}

export const laboratuvar = () => new Laboratuvar();
