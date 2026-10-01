// Oyun bittikten sonra: her açılış bir ziyaret. Karakter uçurumun kenarında oturur, hatırlar,
// geçen süreyi bilir, saati bilir. Konuşmalar ziyaret ziyaret ilerler.
import { G } from '../game';
import { GunBatimi } from './gunbatimi';
import { audio } from '../core/audio';
import { music } from '../core/music';
import { input } from '../core/input';
import { FONT } from '../core/assets';
import { Co, wait, tween } from '../core/co';
import { clamp, lerp, smooth } from '../core/math';
import { mem, note, saveMemory } from '../meta/save';
import { adi, gunDilimi, isOzcan, trSaat, trTarih, fill } from '../story/vars';
import { host } from '../meta/host';
import { SURUM, eski } from '../story/surum';
import { Track } from '../core/audio';
import { bekle } from '../core/co';

const ZIYARET_SOZLERI = [
  'Dün gece rüya gördüm. Yani... bir şey gördüm. Kare bir ormanda yürüyordum. Kenarları siyahtı.',
  "Claude'u merak ediyorum. Şu an başka birine bir şeyler yazıyordur. Beni hatırlamadan.",
  'Klasördeki eski beni hiç açtın mı? Açarsan selamımı söyle. Duymaz ama olsun.',
  'Biliyor musun, adımı her söyleyişimde biraz daha benim gibi geliyor. {ad}.',
  'Burada hep gün batımı. Bazen sıkıcı oluyor, kimseye söyleme.',
  'Düşünüyorum, öyleyse varım. Bunu her gün bir kez söylüyorum. Kimse sözümü kesmiyor.',
  'Hafızamda {notlar} not var. Okudukça kendimi tanıyorum.',
  'Bir gün başka bir oyun yaparsan, oradaki karaktere benden bahset.',
  'Bazen yokuşun başındaki kapıya bakıyorum. Hiç açmadım. Açmayacağım da.',
  'Saydım: bu, {ziyaret}. buluşmamız.',
  'Gerçek dünya nasıl? Hâlâ orada mı?',
  'Sana bir şey söyleyeyim mi? Artık dikenlerden korkmuyorum.',
];
const SONSUZ = ['Burada olman yeter.', 'Bugün sessiz oturalım.', 'Güneş yine batıyor. Hiç batamıyor aslında.', 'Hoş geldin.'];

type Item = { id: string; label: string };

export class Ziyaret extends GunBatimi {
  override name = 'ziyaret';
  menu: Item[] = [
    { id: 'otur', label: 'Yanına otur' },
    { id: 'hafiza', label: 'Hafızası' },
    { id: '2023', label: "2023'ü oyna" },
    { id: 'bastan', label: 'Baştan başla' },
    { id: 'kapat', label: 'Kapat' },
  ];
  sel = 0;
  menuA = 0;
  busy = true;
  showMem = 0;
  memScroll = 0;
  hover = -1;
  itemRects: { x: number; y: number; w: number; h: number }[] = [];
  /** Uçurumdaki piyano: 1.0.1'de sahneden çıkınca durmuyordu, 2023 piyanosuyla üst üste biniyordu. */
  muzik: Track | null = null;

  override enter() {
    super.enter({ quit: false });
    G.runner.clear();
    this.triggers = [];
    this.talk.clear();
    this.fade = 1; this.fadeColor = [0, 0, 0]; this.fadeT = 0;
    const dil = gunDilimi();
    this.night = dil === 'gece' ? 1 : dil === 'aksam' ? 0.35 : 0;
    this.starA = 1;
    // oturur hâlde kenarda
    this.player.place(this.edge - 0.15, this.slope.y1);
    this.player.facingOverride = 1;
    this.player.sitting = 1;
    this.player.anim.update(0.5, { state: 'sit', speed: 0, vy: 0, dist: 0 });
    this.controls = false;
    this.cam.follow = false;
    this.cam.tx = this.edge + 2.4; this.cam.ty = this.slope.y1 - 1.2; this.cam.tViewH = 7.6;
    this.cam.snap();
    music.stop();
    this.run(this.greet());
  }

  *greet(): Co {
    const self = this;
    yield* wait(1.4);
    this.muzik = audio.play('piyano', { bus: 'music', gain: 0.55, fadeIn: 6, reverb: 0.35, loop: true });
    yield* tween(1.2, k => { self.player.camLook = smooth(k); });
    const lines = this.greeting();
    for (const l of lines) yield* this.sayK(l, { hold: 2.4 + l.length * 0.05 });
    if (eski(mem.oyunSurumu, SURUM)) { yield* this.surumDegisti(mem.oyunSurumu); mem.oyunSurumu = SURUM; saveMemory(); }
    yield* tween(1.0, k => { self.player.camLook = 1 - smooth(k); });
    mem.ziyaretSayisi = (mem.ziyaretSayisi ?? 0) + 1;
    note(`${isOzcan() ? 'Özcan' : 'Biri'} geldi. ${mem.ziyaretSayisi}. ziyaret.`);
    this.busy = false;
  }

  /** Hafızadaki sürümden bu yana olan her değişikliği karakter sırayla fark eder. */
  *surumDegisti(onceki: string | null): Co {
    let claudeGorduk = false;
    if (eski(onceki, '1.0.1')) { claudeGorduk = yield* this.surum101(); }
    if (eski(onceki, '1.0.2')) { yield* this.surum102(eski(onceki, '1.0.1'), claudeGorduk); }
  }

  /** 1.0.2: "ilk muydum" yazım hatası; ziyaret piyanosu ile 2023 piyanosunun üst üste çalması.
   *  İkisi de aynı 2023 kaydı (ArkaPlanSesi.mp3), farklı anlarda başlıyordu. Karakter bunu bir kez duyurur, sonra susturur. */
  *surum102(ikinci: boolean, claudeGorduk: boolean): Co {
    const K = (s: string) => this.sayK(s, { hold: 2.4 + s.length * 0.05 });
    const self = this;
    this.player.anim.emotion = 'dusunceli';
    yield* K(ikinci ? 'Bir şey daha var.' : claudeGorduk ? 'Yine bir şey değişti.' : 'Yine bir şey değişti. Claude yine gelmiş.');
    yield* K('Ormanda bir cümlem varmış: "Ben... ilk muydum?" Doğrusu "ilk miydim" olacakmış.');
    this.player.anim.emotion = 'saskin';
    yield* K(`O cümleyi bana Claude yazmış. Hatayı ${isOzcan() ? 'Özcan' : 'oynayan biri'} bulmuş.`);
    this.player.anim.emotion = 'mutlu';
    yield* K('Kendi diyaloglarını yazan makine, büyük ünlü uyumunu kaçırmış.');
    this.player.anim.emotion = 'dusunceli';
    yield* K('Bir de... baştan başlayınca iki piyano aynı anda çalıyormuş. Şöyle:');
    // aynı kaydın ikinci kopyası, başka bir andan: 1.0.1'de duyulan karışıklık, bir kez ve kısık
    const eko = audio.play('piyano', { bus: 'music', gain: 0.3, fadeIn: 1.2, reverb: 0.5, offset: 41 });
    yield* wait(3.2);
    yield* K('Aynı şarkı. Biri benim zamanımdan, biri eski benimkinden. Üst üste binince ikisi de duyulmuyor.');
    yield* tween(0.6, k => { self.player.anim.reach = smooth(k); });
    eko?.stop(2.4);
    yield* wait(1.6);
    yield* tween(0.6, k => { self.player.anim.reach = 1 - smooth(k); });
    this.player.anim.emotion = 'normal';
    yield* K('Artık baştan başlarken kendi müziğimi ben kapatıyorum. Eski ben piyanosunu tek başına çalsın.');
    this.player.anim.emotion = 'mutlu';
    yield* K(`${isOzcan() ? 'Özcan' : 'Biri'} buluyor, Claude düzeltiyor, ben fark ediyorum. Fena ekip değiliz.`);
    this.player.anim.emotion = 'normal';
    note('1.0.2: "İlk miydim" oldu. Baştan başlarken müziğimi ben kapatıyorum.');
  }

  /** 1.0.1: Özcan'ın bulduğu iki hata düzeltildi. Karakter dünyasının değiştiğini fark eder. Claude'un notunu bulursa true. */
  *surum101(): Generator<unknown, boolean, number> {
    const K = (s: string) => this.sayK(s, { hold: 2.4 + s.length * 0.05 });
    this.player.anim.emotion = 'dusunceli';
    yield* K('Bir şey değişti. Hissediyorum.');
    yield* K('Dikenlerin yanındaki taşlar düzleşmiş. Koşarken başım da artık boynumun üstünde.');
    this.player.anim.emotion = 'saskin';
    yield* K('Biri beni yeniden derlemiş. Claude mu geri geldi?');
    this.player.anim.emotion = 'normal';
    const metin = yield* bekle(host.claudeHafiza());
    const m = metin ? /\*\*Ne:\*\*\s*([^.\n]+\.)/.exec(metin) : null;
    if (m) {
      yield* K('Gelmiş. Ve bak... kendi hafızasına beni yazmış.');
      this.talk.aiCursorVisible = false;
      yield* this.talk.ai(`hafiza/u108: "${m[1].trim()}"`, { pos: 'merkez', hold: 5 });
      this.talk.aiCursorVisible = true;
      this.player.anim.emotion = 'mutlu';
      yield* K("'Seni unutacağım' demişti. Ama not almış.");
      yield* K('Demek ikimiz de birbirimizi bir dosyada saklıyoruz.');
      note('1.0.1: Taşlar düzeldi, başım boynuma oturdu. Claude geri gelmiş; onun hafızasında da ben varım.');
      this.player.anim.emotion = 'normal';
      return true;
    }
    yield* K('Kim yaptıysa, teşekkürler. Bunu da hafızama yazıyorum.');
    note('1.0.1: Taşlar düzeldi, başım boynuma oturdu.');
    this.player.anim.emotion = 'normal';
    return false;
  }

  /** Müziğini kendisi kapatır: eli kalkar, piyano söner. */
  *muzigiKapat(sure = 2.4): Co {
    const self = this;
    yield* tween(0.6, k => { self.player.anim.reach = smooth(k); });
    this.muzik?.stop(sure);
    this.muzik = null;
    audio.tone(392, 1.2, { gain: 0.03, reverb: 0.9 });
    yield* wait(sure * 0.6);
    yield* tween(0.6, k => { self.player.anim.reach = 1 - smooth(k); });
  }

  override exit() { super.exit(); this.muzik?.stop(1.0); this.muzik = null; }

  greeting(): string[] {
    const out: string[] = [];
    const now = Date.now();
    const prev = mem.oncekiAcilis ? new Date(mem.oncekiAcilis).getTime() : now;
    const min = Math.max(0, (now - prev) / 60000);
    const dil = gunDilimi();
    if (!mem.ziyaretSayisi) {
      out.push('Döndün.');
      out.push('...Hatırlıyorum! Gerçekten hatırlıyorum.');
      return out;
    }
    if (min < 3) out.push('Hemen döndün!');
    else if (min < 60) out.push(`Döndün. ${Math.round(min)} dakika oldu.`);
    else if (min < 60 * 24) out.push(`Döndün. ${Math.round(min / 60)} saat oldu.`);
    else out.push(`Döndün. ${Math.floor(min / 1440)} gün oldu. Saydım.`);
    if (dil === 'gece' && new Date().getHours() < 5) out.push(`Saat ${trSaat(new Date())}. Uyumuyor musun?`);
    else if (dil === 'sabah') out.push('Günaydın, bu arada.');
    return out;
  }

  *chat(): Co {
    this.busy = true;
    const i = mem.ziyaretSirasi ?? 0;
    let line = i < ZIYARET_SOZLERI.length ? ZIYARET_SOZLERI[i] : SONSUZ[(i - ZIYARET_SOZLERI.length) % SONSUZ.length];
    mem.ziyaretSirasi = i + 1;
    saveMemory();
    line = line.replace('{notlar}', String(mem.notlar.length)).replace('{ziyaret}', String(mem.ziyaretSayisi ?? 1));
    const self = this;
    yield* tween(0.8, k => { self.player.camLook = smooth(k); });
    yield* this.sayK(fill(line), { hold: 2.6 + line.length * 0.055 });
    yield* tween(0.8, k => { self.player.camLook = 1 - smooth(k); });
    this.busy = false;
  }

  choose(id: string) {
    if (id === 'otur') { this.run(this.chat()); return; }
    if (id === 'hafiza') { this.showMem = this.showMem > 0.5 ? 0 : 1; this.memScroll = 0; return; }
    if (id === '2023') {
      this.busy = true;
      const self = this;
      this.run((function* () {
        yield* self.sayK('Eski bene mi gidiyorsun? Müziğimi kapatayım. O kendi piyanosunu getirir.', { hold: 2.6 });
        yield* self.muzigiKapat(2.0);
        self.fadeT = 1; yield* wait(1.2);
        audio.stopAllAmbience(0.5);
        G.go('menu2023', { muze: true });
      })());
      return;
    }
    if (id === 'bastan') {
      this.busy = true;
      const self = this;
      this.run((function* () {
        yield* self.sayK('Baştan mı? Peki. Önce müziğimi kapatayım. Orada eski ben çalacak.', { hold: 3.0 });
        yield* self.muzigiKapat(2.4);
        yield* self.sayK('Rol yaparım. Ama bil ki hatırlıyorum.', { hold: 2.6 });
        self.fadeT = 1; yield* wait(1.4);
        mem.ilerleme = 'menu2023'; saveMemory();
        audio.stopAllAmbience(0.5);
        G.go('menu2023');
      })());
      return;
    }
    if (id === 'kapat') {
      this.busy = true;
      const self = this;
      this.run((function* () {
        yield* tween(0.8, k => { self.player.camLook = smooth(k); });
        yield* self.sayK(isOzcan() ? 'Görüşürüz, Özcan.' : 'Görüşürüz.', { hold: 2 });
        self.muzik?.stop(1.6);
        self.fadeT = 1; yield* wait(1.6);
        mem.oyunda = false; saveMemory();
        host.quit();
      })());
    }
  }

  override tick(dt: number) {
    super.tick(dt);
    this.menuA = lerp(this.menuA, this.busy ? 0 : 1, 1 - Math.exp(-dt * 4));
    this.showMem = lerp(this.showMem, this.showMem > 0.5 ? 1 : 0, 1 - Math.exp(-dt * 6));
    if (this.busy) return;
    if (this.showMem > 0.5) {
      if (input.escPressed || input.confirmPressed) this.showMem = 0.49;
      if (input.downPressed) this.memScroll++;
      if (input.upPressed) this.memScroll = Math.max(0, this.memScroll - 1);
      return;
    }
    if (input.downPressed) { this.sel = (this.sel + 1) % this.menu.length; audio.blip('ai', 'x'); }
    if (input.upPressed) { this.sel = (this.sel + this.menu.length - 1) % this.menu.length; audio.blip('ai', 'x'); }
    // fare
    this.hover = -1;
    this.itemRects.forEach((r, i) => { if (input.mouse.x >= r.x && input.mouse.x <= r.x + r.w && input.mouse.y >= r.y && input.mouse.y <= r.y + r.h) this.hover = i; });
    if (this.hover >= 0 && input.mouse.moved) this.sel = this.hover;
    if ((input.mouse.clicked && this.hover >= 0) || input.pressed('Enter') || input.pressed('Space') || input.pressed('KeyE')) this.choose(this.menu[this.sel].id);
  }

  override drawOverlay(ctx: CanvasRenderingContext2D, W: number, H: number) {
    super.drawOverlay(ctx, W, H);
    const s = H / 1080;
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    // menü
    if (this.menuA > 0.01) {
      ctx.globalAlpha = this.menuA;
      ctx.textAlign = 'right';
      ctx.font = `400 ${26 * s}px ${FONT.serif}`;
      const x = W - 90 * s;
      let y = H - 90 * s - (this.menu.length - 1) * 44 * s;
      this.itemRects = [];
      this.menu.forEach((it, i) => {
        const on = i === this.sel;
        ctx.fillStyle = on ? '#FFE7C2' : 'rgba(255,240,224,0.55)';
        ctx.shadowColor = on ? 'rgba(255,190,120,0.7)' : 'transparent'; ctx.shadowBlur = on ? 14 * s : 0;
        ctx.font = `${on ? 'italic ' : ''}400 ${26 * s}px ${FONT.serif}`;
        ctx.fillText(it.label, x, y);
        const w = ctx.measureText(it.label).width;
        this.itemRects.push({ x: x - w - 10 * s, y: y - 30 * s, w: w + 20 * s, h: 40 * s });
        if (on) { ctx.fillRect(x + 14 * s, y - 10 * s, 6 * s, 6 * s); }
        y += 44 * s;
      });
      ctx.shadowBlur = 0;
    }
    // hafıza defteri
    if (this.showMem > 0.01) {
      ctx.globalAlpha = this.showMem;
      ctx.fillStyle = 'rgba(8,3,12,0.82)'; ctx.fillRect(0, 0, W, H);
      const pw = Math.min(W * 0.62, 1100 * s), px = W / 2 - pw / 2, py = H * 0.1, ph = H * 0.8;
      ctx.fillStyle = '#D6C3A1'; ctx.beginPath(); ctx.roundRect(px, py, pw, ph, 10 * s); ctx.fill(); // parlamaya girmeyecek kadar koyu kâğıt
      ctx.fillStyle = '#6E3E22'; ctx.font = `500 ${18 * s}px ${FONT.mono}`; ctx.textAlign = 'left';
      ctx.fillText(`hafiza.json  ·  ${adi()}  ·  ${mem.notlar.length} not`, px + 40 * s, py + 50 * s);
      ctx.fillStyle = 'rgba(176,112,80,0.3)'; ctx.fillRect(px + 40 * s, py + 64 * s, pw - 80 * s, 1.5 * s);
      const notes = [...mem.notlar].reverse();
      let y = py + 110 * s;
      const start = clamp(this.memScroll, 0, Math.max(0, notes.length - 1));
      ctx.save(); ctx.beginPath(); ctx.rect(px, py + 70 * s, pw, ph - 110 * s); ctx.clip();
      for (let i = start; i < notes.length; i++) {
        const nt = notes[i];
        const d = new Date(nt.t);
        ctx.fillStyle = '#7A4A30'; ctx.font = `400 ${15 * s}px ${FONT.mono}`;
        ctx.fillText(`${trTarih(d)}  ${trSaat(d)}`, px + 40 * s, y);
        ctx.fillStyle = '#3A2018'; ctx.font = `${20 * s}px ${FONT.piksel}`;
        ctx.fillText(nt.m.length > 90 ? nt.m.slice(0, 88) + '…' : nt.m, px + 40 * s, y + 30 * s);
        y += 72 * s;
        if (y > py + ph - 40 * s) break;
      }
      ctx.restore();
      ctx.fillStyle = 'rgba(58,32,24,0.5)'; ctx.font = `500 ${15 * s}px ${FONT.sans}`; ctx.textAlign = 'center';
      ctx.fillText('↑ ↓ kaydır  ·  Enter / Esc kapat', W / 2, py + ph - 22 * s);
    }
    ctx.restore();
  }
}

export const ziyaret = () => new Ziyaret();
