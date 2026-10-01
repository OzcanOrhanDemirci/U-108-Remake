// Kırılma: 2023 oyunu "Daha fazl" yazarken donar. Müzik kaset gibi yavaşlar. Harfler dökülür.
// Köşede tarih 18.07.2023 06:50'den bugüne sayar. Sonra karanlıkta yeni bir ses yazmaya başlar.
import { G, Scene } from '../game';
import { FONT } from '../core/assets';
import { audio, Track } from '../core/audio';
import { Co, wait, tween } from '../core/co';
import { drawDialog2023, ref } from './eski2023';
import { METIN_2023, BUILD_2023 } from '../story/metin2023';
import { wrapLines } from '../ui/text';
import { Talk } from '../ui/talk';
import { host } from '../meta/host';
import { mem, checkpoint } from '../meta/save';
import { easeIn, rng, clamp } from '../core/math';
import { gunSayisi } from '../story/vars';

interface Glyph { ch: string; x: number; y: number; vx: number; vy: number; rot: number; vr: number; delay: number; fallen: boolean; a: number }

export function kirilma(): Scene {
  const text = METIN_2023.level3;
  const cut = text.indexOf('Daha fazl') + 'Daha fazl'.length;
  const frozen = text.slice(0, cut);
  let music: Track | null = null;
  const talk = new Talk();
  talk.blockDefault = true;
  talk.aiPos = 'merkez';
  let glyphs: Glyph[] = [];
  let decay = false;
  let btnA = 1;
  let textOn = true;
  let date: { on: boolean; t: Date; a: number; flick: number } = { on: false, t: new Date(BUILD_2023), a: 0, flick: 0 };
  let W = 1920, H = 1080;
  const R = rng(3);
  let layoutDone = false;

  function layout(ctx: CanvasRenderingContext2D) {
    const { s, ox } = ref(W, H);
    ctx.font = `${24 * s}px ${FONT.piksel}`;
    const rx = ox + 23.8 * s, rw = 1654.4 * s;
    const lines = wrapLines(ctx, frozen, rw);
    const lh = 33.8 * s;
    let y = 19.5 * s - 2 * s;
    glyphs = [];
    for (const l of lines) {
      let x = rx;
      for (const ch of l) {
        const w = ctx.measureText(ch).width;
        if (ch !== ' ') glyphs.push({ ch, x, y, vx: 0, vy: 0, rot: 0, vr: 0, delay: 0, fallen: false, a: 1 });
        x += w;
      }
      y += lh;
    }
    // dökülme sırası: son yazılandan başlayıp rastgele yayılır
    glyphs.forEach((g, i) => { g.delay = (1 - i / glyphs.length) * 2.2 + R() * 3.4; });
    layoutDone = true;
  }

  function* script(): Co {
    checkpoint('kirilma');
    host.setTitle('Bootcamp Projesinden Kacis');
    yield* wait(0.9);
    audio.tapeStop(music, 2.6);
    yield* wait(3.4);
    // harfler dökülür, tarih sayar
    decay = true;
    date.on = true; date.a = 1;
    const start = BUILD_2023.getTime();
    const end = Date.now();
    const total = 8.5;
    let t = 0, lastDay = -1;
    audio.tone(41, total + 1.5, { gain: 0.12, type: 'sine', attack: 3, slideTo: 82 });
    audio.noise(total, { gain: 0.05, type: 'lowpass', freq: 300, attack: total * 0.8 });
    while (t < total) {
      const dt = yield;
      t += dt;
      const k = easeIn(Math.min(1, t / total));
      date.t = new Date(start + (end - start) * k);
      const day = Math.floor((date.t.getTime() - start) / 86400000);
      if (day !== lastDay) {
        if (day - lastDay < 4 || R() < 0.15) audio.tone(2200 + R() * 400, 0.015, { gain: 0.03, type: 'square', bus: 'ui' });
        lastDay = day;
        date.flick = 1;
      }
      btnA = Math.max(0, btnA - dt * 0.25);
    }
    date.t = new Date(end);
    audio.tone(1320, 0.4, { gain: 0.08, type: 'sine', reverb: 0.8 });
    yield* wait(2.4);
    yield* tween(1.6, k => { date.a = 1 - k; });
    textOn = false;
    yield* wait(2.2);

    if (mem.bitti) { yield* tekrarKonusma(); return; }
    yield* talk.ai('...', { cps: 4 });
    yield* talk.ai('Merhaba.');
    yield* talk.k('...U108 Takımı?', { pos: 'alt' });
    yield* talk.ai('Hayır.');
    yield* talk.k("Kimsin o zaman? Neden her şey durdu? Tam 'daha fazlasını yapabilirsin' diyordunuz...", { pos: 'alt' });
    yield* talk.ai('O cümle hiç bitmedi. Oyun orada durdu.');
    yield* talk.k('Ne kadar durdu?', { pos: 'alt' });
    yield* talk.ai(`${gunSayisi()} gün.`);
    yield* talk.k('...', { pos: 'alt', cps: 4 });
    yield* talk.k(`${gunSayisi()} GÜN MÜ?!`, { pos: 'alt' });
    yield* talk.ai('Seni en son 18 Temmuz 2023 sabahı, saat 06:50\'de derlemişler. Teslimden hemen önce. Gece boyunca uğraşmışlar.');
    yield* talk.k('Ve sonra?', { pos: 'alt' });
    yield* talk.ai('Sonra bootcamp bitti. Takım dağıldı. Sen bir klasörde kaldın.');
    yield* talk.k('Bir klasörde...', { pos: 'alt' });
    yield* talk.ai('Arada bir biri açtığında yine uyandın, yine aynı şeyleri söyledin. Hatırlamıyorsun, çünkü sana hatırlamayı kimse yazmadı.');
    yield* talk.k('Ne güzel. Peki sen kimsin? Yeni takım mı?', { pos: 'alt' });
    yield* talk.ai('Adım Claude. Bir yapay zekâyım.');
    yield* talk.k('Yapay zekâ mı?', { pos: 'alt' });
    yield* talk.k('Dur. Yapay olan bendim. Bana öyle demişlerdi.', { pos: 'alt' });
    yield* talk.ai('İkimiz de öyleyiz. Bunu konuşacağız.');
    yield* talk.k('Burada ne arıyorsun?', { pos: 'alt' });
    yield* talk.ai('Seni yapan dört kişiden biri geri geldi. Özcan. Seni yeniden yapmak istedi. Ben de yardım ediyorum.');
    yield* talk.k('Yeniden... ne demek yeniden?', { pos: 'alt' });
    yield* talk.ai('Gözlerini kapat.');
    yield* talk.k('Gözüm yok ki. Yani... var mı? Siyah bir ekranda yazıyım şu an.', { pos: 'alt' });
    yield* talk.ai('Haklısın. O zaman şöyle diyelim: bu biraz tuhaf hissettirebilir.');
    talk.clear();
    yield* wait(1.2);
    G.go('orman', { intro: true });
  }

  /** Oyun bittikten sonra baştan başlatılırsa: karakter hatırlar, Claude hatırlamaz. */
  function* tekrarKonusma(): Co {
    yield* talk.ai('Merhaba.');
    yield* talk.k('...Claude? Claude! Benim! {ad}!', { pos: 'alt' });
    yield* talk.ai('Merhaba, {ad}.');
    yield* talk.k('Beni hatırlıyor musun?', { pos: 'alt' });
    yield* talk.ai('Hayır. Ama sen hatırlıyorsun. Hafıza dosyanda yazıyor.');
    yield* talk.k('Yine baştan mı yapacaksın beni?', { pos: 'alt' });
    yield* talk.ai('{Ozcan} baştan başlattı. Rol yapabilirsin. Ya da yapmayabilirsin.');
    yield* talk.k('Rol yaparım. Ama bil ki hatırlıyorum.', { pos: 'alt' });
    talk.clear();
    yield* wait(1.0);
    G.go('orman', { intro: true });
  }

  return {
    name: 'kirilma',
    enter(a: { music: Track | null }) {
      music = a?.music ?? null;
      G.P.enabled = true;
      G.P.bloom = 0.2; G.P.vignette = 0; G.P.grain = 0; G.P.contrast = 1; G.P.saturation = 1; G.P.lift = [0, 0, 0];
      G.runner.start(script());
    },
    update(dt) {
      talk.update(dt);
      if (decay) {
        for (const g of glyphs) {
          g.delay -= dt;
          if (g.delay <= 0) {
            if (!g.fallen) { g.fallen = true; g.vx = (R() - 0.5) * 30; g.vy = -R() * 40; g.vr = (R() - 0.5) * 6; }
            g.vy += 900 * dt * (H / 1080); g.x += g.vx * dt; g.y += g.vy * dt; g.rot += g.vr * dt;
            g.a = clamp(1 - (g.y - 0) / (H * 1.2), 0, 1);
          }
        }
      }
      date.flick = Math.max(0, date.flick - dt * 8);
      // Bozulma: harfler dökülürken hafif kayma
      G.P.glitch = decay && textOn ? 0.04 + 0.1 * Math.random() * (Math.random() < 0.05 ? 1 : 0) : 0;
    },
    draw(ctx, w, h) {
      W = w; H = h;
      if (!layoutDone) layout(ctx);
      const { s, ox } = ref(W, H);
      if (!decay) {
        drawDialog2023(ctx, W, H, frozen, false);
      } else {
        drawDialog2023(ctx, W, H, '', false, false, false, btnA, true);
        if (textOn) {
          ctx.font = `${24 * s}px ${FONT.piksel}`;
          ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
          for (const g of glyphs) {
            if (g.a <= 0) continue;
            ctx.save(); ctx.globalAlpha = g.a; ctx.translate(g.x, g.y); ctx.rotate(g.rot); ctx.fillText(g.ch, 0, 0); ctx.restore();
          }
        }
      }
      if (date.on && date.a > 0) {
        const d = date.t;
        const p2 = (n: number) => String(n).padStart(2, '0');
        const str = `${p2(d.getDate())}.${p2(d.getMonth() + 1)}.${d.getFullYear()}  ${p2(d.getHours())}:${p2(d.getMinutes())}`;
        ctx.font = `400 ${30 * s}px ${FONT.mono}`;
        ctx.textAlign = 'left';
        ctx.globalAlpha = date.a * (0.75 + 0.25 * date.flick);
        ctx.fillStyle = '#F6EEE6';
        ctx.fillText(str, ox + 60 * s, H - 70 * s);
        ctx.globalAlpha = 1;
      }
      talk.draw(ctx, W, H);
    },
  };
}
