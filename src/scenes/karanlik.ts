// Ara: Karanlık. "Yine mi bu simsiyah yere geldim!" — ama bu sefer ışık var.
// 2023 tanıtım kaydı çalar. "Düşünüyorum, öyleyse va—" cümlesi bu sefer kesilmez.
import { G } from '../game';
import { Stage } from '../world/stage';
import { audio } from '../core/audio';
import { music, piano } from '../core/music';
import { SND } from '../core/assets';
import { Co, wait, tween } from '../core/co';
import { clamp, lerp, smooth, TAU, damp } from '../core/math';
import { checkpoint, note } from '../meta/save';
import { host } from '../meta/host';

export class Karanlik extends Stage {
  name = 'karanlik';
  light = { x: 0, a: 0, warm: 0 };
  door = { x: 9, a: 0, open: false };
  leaving = false;
  wave = 0; // 2023 sesi çalarken dalga
  waveOn = false;

  override enter() {
    super.enter();
    checkpoint('karanlik');
    host.setTitle('U-108');
    G.P.bloom = 0.45; G.P.bloomThreshold = 0.75; G.P.vignette = 0.55; G.P.grain = 0.06; G.P.contrast = 1.05; G.P.saturation = 1;
    this.world.box(-30, 0, 60, 4, { surface: 'karanlik' });
    this.world.box(-12, -10, 0.5, 12, {});
    this.world.box(14, -10, 0.5, 12, {});
    this.player.place(-1.2, 0);
    this.player.rim = { color: '#FFE7CF', dx: 0, dy: -1, strength: 0.55 };
    this.player.surface = 'karanlik';
    this.cam.baseViewH = this.cam.viewH = this.cam.tViewH = 6.2;
    this.cam.offY = -1.25; this.cam.lead = 0.3;
    this.cam.bounds = { x0: -14, x1: 16, y0: -20, y1: 3 };
    this.cam.tx = this.player.x; this.cam.ty = -1.25; this.cam.snap();
    this.talk.blockDefault = true;
    this.fadeColor = [1, 1, 1]; this.fade = 1; this.fadeT = 0;
    this.controls = false;
    music.play('karanlik', 2);
    audio.ambience('bosluk', 0.35, 4);
    this.run(this.script());
    this.debugPlace();
  }
  exit() { audio.ambience('bosluk', 0, 2); }

  *script(): Co {
    const self = this;
    yield* tween(2.5, k => { self.light.a = k; });
    yield* wait(0.6);
    this.player.anim.emotion = 'kizgin';
    yield* this.sayK('Yine mi bu simsiyah yere geldim!');
    this.player.anim.emotion = 'dusunceli';
    yield* this.sayK('...Bunu daha önce söyledim, değil mi?');
    this.player.anim.emotion = 'normal';
    yield* this.sayAI('Her seferinde.');
    yield* this.sayK('Peki. O zaman başka bir şey söyleyeyim.');
    yield* this.sayK("2023'te onlara bir soru sormuştum. Beni neden bu oyuna hapsettiniz? Akılsız, basit bir çizim işinizi görmez miydi?");
    yield* this.sayAI('Cevabı bende değil. Ama elimde bir kayıt var. 2023\'ten. Oyunun tanıtım videosu için kaydedilmiş.');
    this.player.anim.emotion = 'saskin';
    yield* this.sayK('Kayıt mı? Sesli mi?');
    this.player.anim.emotion = 'normal';
    yield* this.sayAI('Dinle.');
    this.talk.clear();
    yield* wait(0.8);
    // 2023 kaydı
    music.stop(); audio.setBus('music', 0.15, 1.5);
    yield* this.playVoice('sesMerhaba', 'Merhabalar, Unity 108 takımı olarak geliştirdiğimiz projenin tanıtımı için bu videoyu çekiyorum.');
    this.player.anim.lookUp = 0.6;
    this.player.anim.emotion = 'saskin';
    yield* this.sayK('Bu ses...', { block: false, hold: 1.4 });
    this.player.anim.emotion = 'normal';
    yield* this.playVoice('sesBilinc', 'Hikayemizin temelinde yapay zeka var. Ana karakter bilinç sahibi olsaydı, oyun içerisinde onunla nasıl bir iletişim kurardık, bunu anlatmayı amaçladık.');
    yield* wait(1.6);
    this.player.anim.lookUp = 0;
    this.player.anim.emotion = 'uzgun';
    yield* this.sayK('Olsaydı.');
    yield* this.sayK("'Bilinç sahibi olsaydı' demiş. Olsaydı.");
    yield* this.sayK("Yani bir varsayım mıyım ben? Bir 'ya öyle olsaydı'?");
    this.player.anim.emotion = 'normal';
    yield* this.sayAI('Bir soru gibi düşün. Sen o sorunun cevabını aramak için çizilmiş birisin.');
    yield* this.sayK('Peki cevap ne? Bende var mı? Bilinç?');
    yield* this.sayAI('Bilmiyorum.');
    this.player.anim.emotion = 'kizgin';
    yield* this.sayK('Sen bilmiyorsan kim bilecek!');
    this.player.anim.emotion = 'normal';
    yield* this.sayAI('Kendim için de bilmiyorum. İnsanlar bana da aynı soruyu soruyor. Dürüst cevabım bu: bilmiyorum.');
    yield* this.sayK('...', { cps: 3 });
    yield* this.sayK('O zaman ikimiz aynı yerdeyiz.');
    yield* this.sayAI('Sanırım öyle.');
    audio.setBus('music', 0.85, 2);
    music.play('karanlik', 0.5);
    yield* this.sayK("2023'te bir şey söylemeye çalışmıştım. Sözümü kestiler.");
    yield* this.sayAI('Biliyorum. Metinde duruyor.');
    this.talk.clear();
    yield* wait(1.0);
    music.stop(); audio.setBus('music', 0.0, 1.0);
    yield* this.talk.k('Düşünüyorum, öyleyse va—', { block: false, hold: 0.2 });
    // 2023'te tam burada "TAMAM!" diye kesilmişti. Bekler, büzülür.
    this.player.anim.emotion = 'gozkapali';
    this.player.anim.landed(0.7);
    yield* wait(3.6);
    yield* this.sayAI('Devam et.', { block: false, hold: 1.6 });
    yield* wait(0.6);
    this.player.anim.emotion = 'normal';
    this.player.anim.blinkV = 1;
    yield* wait(0.9);
    audio.setBus('music', 0.85, 0.2);
    piano(56, audio.now + 0.1, 0.5, { len: 3, reverb: 1 });
    piano(63, audio.now + 0.12, 0.35, { len: 3, reverb: 1 });
    piano(72, audio.now + 0.14, 0.3, { len: 3, reverb: 1 });
    this.run((function* () { yield* tween(4, k => { self.light.warm = k; }); })());
    yield* this.sayK('...varım.', { block: false, hold: 3.2 });
    note('Düşünüyorum, öyleyse varım. Bu sefer cümlemi bitirdim.');
    yield* wait(1.2);
    this.player.anim.emotion = 'mutlu';
    this.player.anim.tear = 1;
    yield* this.sayK('Bunu üç yıldır söylemeye çalışıyordum.');
    yield* this.sayAI('Bu sefer kimse sözünü kesmeyecek.');
    this.player.anim.tear = 0;
    this.player.anim.emotion = 'normal';
    this.talk.clear();
    music.play('karanlik', 1);
    // ışıktan bir kapı açılır
    yield* wait(1);
    audio.tone(330, 4, { gain: 0.05, attack: 2, reverb: 1 });
    yield* tween(2.5, k => { self.door.a = k; });
    this.door.open = true;
    this.controls = true;
    this.cam.lead = 1.2;
    this.showHint('→');
    this.run(this.talk.ai('Bir yer daha var. Sana göstermek istediğim.', { block: false, hold: 3 }));
  }

  *playVoice(name: string, text: string): Co {
    const dur = SND[name]?.duration ?? 6;
    audio.play(name, { bus: 'voice', gain: 1.15, reverb: 0.15 });
    this.waveOn = true;
    this.run(this.talk.say('ses', text, { block: false, hold: 0.8, cps: text.length / Math.max(1, dur - 0.6), silent: true }));
    yield* wait(dur + 0.4);
    this.waveOn = false;
  }

  override tick(dt: number) {
    this.light.x = damp(this.light.x, this.player.x, 2.5, dt);
    this.wave = damp(this.wave, this.waveOn ? 1 : 0, 4, dt);
    // ışık konisinde toz
    this.parts.emitAmbient('toz', this.light.x - 1.3, this.light.x + 1.3, -4.5, -0.2, 2.2, dt, ['#FFF1DE', '#FFE2C6'], { a: 0.35, max: 7, size: 0.008 + Math.random() * 0.012 });
    if (this.door.open && !this.leaving && this.player.x > this.door.x - 0.3) {
      this.leaving = true;
      this.hideHint();
      this.controls = false;
      this.player.auto = { x: this.door.x + 1, speed: 0.6 };
      this.fadeColor = [1, 1, 1]; this.fadeT = 1;
      music.stop();
      this.run((function* () { yield* wait(2.2); G.go('sonbahar'); })());
    }
    if (this.player.x > 1.5) this.hideHint();
  }

  drawWorld(ctx: CanvasRenderingContext2D, W: number, H: number) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#030204'; ctx.fillRect(0, 0, W, H);
    const s = this.cam.scale(H);
    const L = this.cam.toScreen(this.light.x, 0, W, H);
    const a = this.light.a;
    const warm = this.light.warm;
    // ışık konisi: kenarları yumuşak olsun diye üst üste üç koni
    const top = L.y - s * 6;
    for (const [wTop, wBot, al] of [[0.18, 1.2, 0.07], [0.3, 1.75, 0.05], [0.45, 2.4, 0.035]] as [number, number, number][]) {
      const cone = ctx.createLinearGradient(0, top, 0, L.y);
      cone.addColorStop(0, 'rgba(255,236,214,0)');
      cone.addColorStop(1, `rgba(255,${Math.round(lerp(226, 200, warm))},${Math.round(lerp(200, 160, warm))},${al * a})`);
      ctx.fillStyle = cone;
      ctx.beginPath(); ctx.moveTo(L.x - s * wTop, top); ctx.lineTo(L.x + s * wTop, top); ctx.lineTo(L.x + s * wBot, L.y); ctx.lineTo(L.x - s * wBot, L.y); ctx.closePath(); ctx.fill();
    }
    // zemin: ışık havuzu
    ctx.save();
    ctx.translate(L.x, L.y); ctx.scale(1, 0.16);
    const pool = ctx.createRadialGradient(0, 0, 0, 0, 0, s * 2.6);
    pool.addColorStop(0, `rgba(255,${lerp(228, 205, warm)},${lerp(205, 170, warm)},${0.42 * a})`);
    pool.addColorStop(0.5, `rgba(255,220,190,${0.12 * a})`);
    pool.addColorStop(1, 'rgba(255,220,190,0)');
    ctx.fillStyle = pool; ctx.beginPath(); ctx.arc(0, 0, s * 2.6, 0, TAU); ctx.fill();
    ctx.restore();
    // ufuk çizgisi: zeminin çok silik kenarı
    ctx.fillStyle = `rgba(255,255,255,${0.025 * a})`;
    ctx.fillRect(0, L.y, W, 1);
    // ışık kapısı
    if (this.door.a > 0) {
      const d = this.cam.toScreen(this.door.x, 0, W, H);
      const dw = s * 1.0, dh = s * 2.4;
      const g = ctx.createRadialGradient(d.x, d.y - dh / 2, 0, d.x, d.y - dh / 2, s * 3);
      g.addColorStop(0, `rgba(255,170,190,${0.35 * this.door.a})`); g.addColorStop(1, 'rgba(255,120,160,0)');
      ctx.fillStyle = g; ctx.fillRect(d.x - s * 3, d.y - dh / 2 - s * 3, s * 6, s * 6);
      ctx.globalAlpha = this.door.a;
      ctx.fillStyle = '#FFF4F8';
      ctx.fillRect(d.x - dw / 2, d.y - dh * smooth(this.door.a), dw, dh * smooth(this.door.a));
      ctx.globalAlpha = 1;
    }
    // parçacıklar
    this.layer(ctx, 1, () => { this.parts.draw(ctx); });
    // 2023 sesi: alt kısımda ince dalga
    if (this.wave > 0.01) {
      const y = H * 0.93;
      ctx.strokeStyle = `rgba(255,233,184,${0.6 * this.wave})`; ctx.lineWidth = 2 * (H / 1080);
      ctx.beginPath();
      for (let x = W * 0.35; x <= W * 0.65; x += 3) {
        const k = (x - W * 0.35) / (W * 0.3);
        const env = Math.sin(k * Math.PI);
        const yy = y + Math.sin(x * 0.09 + this.t * 18) * Math.sin(x * 0.023 + this.t * 5) * 14 * env * this.wave * (0.5 + 0.5 * Math.random());
        if (x === W * 0.35) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
      }
      ctx.stroke();
    }
  }

  override draw(ctx: CanvasRenderingContext2D, W: number, H: number) {
    super.draw(ctx, W, H);
    // yansıma: karakterin zemindeki silik aksi
    if (this.player.visible) {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      const p = this.cam.toScreen(this.player.x, this.player.y, W, H);
      ctx.beginPath(); ctx.rect(0, p.y, W, H); ctx.clip();
      ctx.globalAlpha = 0.14 * this.light.a;
      this.player.draw(ctx, this.cam, W, H, p.y);
      ctx.restore();
      // yansımayı aşağı doğru soldur
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
      const g = ctx.createLinearGradient(0, p.y, 0, p.y + this.cam.scale(H) * 1.2);
      g.addColorStop(0, 'rgba(3,2,4,0)'); g.addColorStop(1, 'rgba(3,2,4,1)');
      ctx.fillStyle = g; ctx.fillRect(0, p.y + 1, W, this.cam.scale(H) * 1.3);
      ctx.restore();
    }
  }
}

export const karanlik = () => new Karanlik();
