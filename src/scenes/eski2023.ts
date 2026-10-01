// 2023: menü, karanlık konuşma sahneleri ve bölümler. Unity build'inin davranışı birebir taklit edilir:
// sabit piksel arayüz (1920x1080 referans), 0,1 sn/harf yazı, ölünce sahne baştan yüklenir, müzik her sahnede baştan.
import { G, Scene } from '../game';
import { IMG, FONT } from '../core/assets';
import { audio, Track } from '../core/audio';
import { input } from '../core/input';
import { wrapLines, Typewriter2023 } from '../ui/text';
import { METIN_2023 } from '../story/metin2023';
import { BOLUM1, BOLUM2, SIYAH_W, SIYAH_H, Obj2023 } from '../story/seviye2023';
import { World, Controller2023, Collider } from '../world/physics';
import { host } from '../meta/host';

/** 1920x1080 referansını ekrana oturtan dönüşüm (yükseklik eşlenir, ortalanır). */
export function ref(W: number, H: number) {
  const s = H / 1080;
  return { s, ox: (W - 1920 * s) / 2 };
}

/** Unity Button renk tonu: normal 1, üstünde 0.96, basılı 0.78. */
function button(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number, hover: boolean, down: boolean) {
  ctx.imageSmoothingEnabled = true;
  const tint = down ? 0.78 : hover ? 0.96 : 1;
  ctx.save();
  if (tint < 1) ctx.filter = `brightness(${tint})`;
  ctx.drawImage(img, x, y, w, h);
  ctx.restore();
}

function inRect(mx: number, my: number, x: number, y: number, w: number, h: number) {
  return mx >= x && mx <= x + w && my >= y && my <= y + h;
}

// 2023 akışı: menü → konuşma → 1. bölüm → konuşma (burada kırılır)
export const AKIS_2023 = {
  level: 'level1', next: 'bolum2023',
  nextArg: { bolum: 1, next: 'diyalog2023', nextArg: { level: 'level3', next: 'kirilma', kirilma: 'Daha fazl' } },
};

/** Müze: 2023 oyununun tamamı, kırılmadan (oyun bittikten sonra "2023'ü oyna"). */
export const AKIS_MUZE = {
  level: 'level1', next: 'bolum2023', muze: true,
  nextArg: { bolum: 1, next: 'diyalog2023', nextArg: { level: 'level3', next: 'bolum2023', muze: true,
    nextArg: { bolum: 2, next: 'diyalog2023', nextArg: { level: 'level5', next: 'diyalog2023', muze: true,
      nextArg: { level: 'level6', next: 'diyalog2023', muze: true, nextArg: { level: 'level7', next: 'ziyaret', muze: true } } } } } },
};

// -------------------------------------------------------------------------------------------
export function menu2023(): Scene {
  let hover = false, downOn = false;
  let leaving = 0;
  let akis: any = AKIS_2023;
  return {
    name: 'menu2023',
    enter(a?: { muze?: boolean }) {
      if (a?.muze) akis = AKIS_MUZE;
      G.P.enabled = false;
      host.setTitle('Bootcamp Projesinden Kacis');
      document.body.classList.remove('imlecsiz');
    },
    update(dt) {
      const { s, ox } = ref(G.W, G.H);
      const bx = ox + (728.25) * s, by = 634.4 * s, bw = 463.5 * s, bh = 101.2 * s;
      hover = inRect(input.mouse.x, input.mouse.y, bx, by, bw, bh);
      if (input.mouse.clicked && hover) downOn = true;
      if (downOn && !input.mouse.down) {
        downOn = false;
        if (hover && !leaving) {
          leaving = 1;
          audio.resume();
          G.go('diyalog2023', akis);
        }
      }
      // klavyeyle de başlatılabilsin (Unity'de Enter/Boşluk seçili düğmeyi basardı; seçili değildi, ama erişilebilirlik)
      if (input.pressed('Enter') && !leaving) { leaving = 1; audio.resume(); G.go('diyalog2023', akis); }
    },
    draw(ctx, W, H) {
      const { s, ox } = ref(W, H);
      // Unity kamera arka planı (görünürse)
      ctx.fillStyle = 'rgb(49,77,121)'; ctx.fillRect(0, 0, W, H);
      // Sahne0: 7.68 birim kare, ölçek (2.32, 1.30), ortografik boy 5 → ekran yüksekliği 10 birim
      const u = H / 10;
      const sw = 7.68 * 2.32 * u, sh = 7.68 * 1.3 * u;
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(IMG.sahne0, W / 2 - sw / 2, H / 2 - sh / 2, sw, sh);
      // başlık: 04b 108px, beyaz, ortalı, üstten
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
      ctx.font = `${108 * s}px ${FONT.baslik2023}`;
      const m = ctx.measureText('BOOTCAMP');
      const asc = m.fontBoundingBoxAscent, lh = m.fontBoundingBoxAscent + m.fontBoundingBoxDescent;
      let ty = 280.5 * s + asc;
      for (const line of ['BOOTCAMP', 'PROJESINDEN', 'KACIS']) { ctx.fillText(line, ox + 960 * s, ty); ty += lh; }
      // düğme
      const bx = ox + 728.25 * s, by = 634.4 * s, bw = 463.5 * s, bh = 101.2 * s;
      button(ctx, IMG.baslaBtn, bx, by, bw, bh, hover, downOn && hover);
      ctx.font = `${40 * s}px ${FONT.dugme2023}`;
      const m2 = ctx.measureText('OYUNA');
      const lh2 = m2.fontBoundingBoxAscent + m2.fontBoundingBoxDescent;
      let y2 = by + m2.fontBoundingBoxAscent; // TMP metin alanı = düğmenin tamamı, üstten hizalı
      for (const line of ['OYUNA', 'BASLA']) { ctx.fillText(line, bx + bw / 2 - 0.24 * s, y2); y2 += lh2; }
    },
  };
}

// -------------------------------------------------------------------------------------------
export interface Diyalog2023Arg {
  level: 'level1' | 'level3' | 'level5' | 'level6' | 'level7';
  next: string;
  nextArg?: any;
  /** Bu metne ulaşınca yazı donar ve kırılma sahnesi devralır. */
  kirilma?: string;
  muze?: boolean;
}

export function diyalog2023(): Scene {
  let tw: Typewriter2023;
  let arg: Diyalog2023Arg;
  let hover = false, downOn = false;
  let music: Track | null = null;
  let left = false;
  let frozen = false;
  let breakIdx = -1;
  return {
    name: 'diyalog2023',
    enter(a: Diyalog2023Arg) {
      arg = a;
      G.P.enabled = false;
      tw = new Typewriter2023(METIN_2023[a.level], 0.1);
      if (a.kirilma) breakIdx = METIN_2023[a.level].indexOf(a.kirilma) + a.kirilma.length;
      music = audio.play('piyano2023', { bus: 'music', loop: true, gain: 0.9 });
      (window as any).__muzik2023 = music;
    },
    exit() { if (!frozen) music?.stop(0.02); },
    update(dt) {
      if (frozen) return;
      tw.update(dt);
      if (breakIdx > 0 && tw.shown >= breakIdx) {
        frozen = true;
        tw.shown = breakIdx;
        // son kareyi bırakmadan kırılma sahnesine geç (müzik devrediliyor)
        G.go('kirilma', { music, snapshotFrom: 'diyalog2023' });
        return;
      }
      const { s, ox } = ref(G.W, G.H);
      const bx = ox + 1719 * s, by = 925.4 * s, bw = 160 * s, bh = 137.2 * s;
      hover = inRect(input.mouse.x, input.mouse.y, bx, by, bw, bh);
      if (input.mouse.clicked && hover) downOn = true;
      if (downOn && !input.mouse.down) {
        downOn = false;
        if (hover && !left && !arg.kirilma) { left = true; G.go(arg.next, arg.nextArg); }
      }
    },
    draw(ctx, W, H) {
      if (arg.level === 'level7') drawCredits2023(ctx, W, H, tw.visible, hover, downOn && hover);
      else drawDialog2023(ctx, W, H, tw.visible, arg.level === 'level6', hover, downOn && hover);
    },
  };
}

/** 2023 jeneriği (level7): beyaz zemin, 36px siyah ortalı metin, "OYUNU KAPAT". */
function drawCredits2023(ctx: CanvasRenderingContext2D, W: number, H: number, text: string, hover: boolean, down: boolean) {
  const { s, ox } = ref(W, H);
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#000'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.font = `${36 * s}px ${FONT.piksel}`;
  const lines = wrapLines(ctx, text, 1872.6 * s);
  let y = 19.5 * s + 30 * s;
  for (const l of lines) { ctx.fillText(l, ox + 960 * s, y); y += 50 * s; }
  const bx = ox + 1719 * s, by = 925.4 * s, bw = 160 * s, bh = 137.2 * s;
  ctx.save(); ctx.filter = `brightness(${down ? 0.25 : hover ? 0.3 : 0.32})`; ctx.drawImage(IMG.devamBtn, bx, by, bw, bh); ctx.restore();
  ctx.fillStyle = '#fff'; ctx.font = `${20 * s}px ${FONT.dugme2023}`; ctx.textBaseline = 'middle';
  ctx.fillText('OYUNU KAPAT', bx + bw / 2 + 4.4 * s, by + bh / 2);
  ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
}

/** 2023 diyalog ekranı: siyah zemin, Minecraftia 24px, sağ altta "Devam et". */
export function drawDialog2023(ctx: CanvasRenderingContext2D, W: number, H: number, text: string, isLab: boolean, hover = false, down = false, btnAlpha = 1, skipText = false) {
  const { s, ox } = ref(W, H);
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.font = `${24 * s}px ${FONT.piksel}`;
  if (isLab) {
    const u = H / 10;
    const iw = 21.34 * 0.42 * u, ih = 21.34 * 0.47 * u;
    ctx.drawImage(IMG.sahne7, W / 2 + (-4.45) * u - iw / 2, H / 2 - 0.01 * u - ih / 2, iw, ih);
    // level6'daki Karakter (-8.07, -2.78), zemin SiyahArkaPlan(1)'in üstünde; sahnenin ortasına yürümüş hâli
    const k = IMG.karakter;
    ctx.drawImage(k, W / 2 + (-4.6) * u - 1.6 * u, H / 2 + 2.95 * u - 0.9 * u, 3.2 * u, 1.8 * u);
  }
  if (!skipText) {
    const rx = isLab ? ox + 997.6 * s : ox + 23.8 * s, rw = (isLab ? 680.6 : 1654.4) * s, ry = 19.5 * s;
    const lines = wrapLines(ctx, text, rw);
    const lh = 33.8 * s;
    let y = ry - 2 * s;
    for (const l of lines) { ctx.fillText(l, rx, y); y += lh; }
  }
  if (btnAlpha > 0) {
    ctx.globalAlpha = btnAlpha;
    const bx = ox + 1719 * s, by = 925.4 * s, bw = 160 * s, bh = 137.2 * s;
    button(ctx, IMG.devamBtn, bx, by, bw, bh, hover, down);
    ctx.fillStyle = 'rgb(50,50,50)';
    ctx.font = `${20 * s}px ${FONT.dugme2023}`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('DEVAM ET', bx + bw / 2 + 4.4 * s, by + bh / 2);
    ctx.textBaseline = 'alphabetic';
    ctx.globalAlpha = 1;
  }
}

// -------------------------------------------------------------------------------------------
export interface Bolum2023Arg { bolum: 1 | 2; next: string; nextArg?: any }

export function bolum2023(): Scene {
  let arg: Bolum2023Arg;
  let world: World;
  let ctl: Controller2023;
  let music: Track | null = null;
  let acc = 0;
  let animT = 0;
  let done = false;
  let triggerC: Collider;
  let L = BOLUM1;
  const build = () => {
    L = arg.bolum === 2 ? BOLUM2 : BOLUM1;
    world = new World();
    for (const ob of L.objs) {
      if (ob.k === 'P' || ob.k === 'D') {
        world.obb(ob.x, -ob.y, SIYAH_W * Math.abs(ob.sx), SIYAH_H * Math.abs(ob.sy), -ob.r * Math.PI / 180, { platform: ob.k === 'P', hazard: ob.k === 'D' });
      }
    }
    for (const e of L.edges) {
      // kenar zinciri: her parça ince bir dörtgen
      for (let i = 0; i < e.pts.length - 1; i++) {
        const ax = e.x + e.pts[i][0], ay = -(e.y + e.pts[i][1]), bx = e.x + e.pts[i + 1][0], by = -(e.y + e.pts[i + 1][1]);
        const len = Math.hypot(bx - ax, by - ay); if (len < 0.01) continue;
        world.obb((ax + bx) / 2, (ay + by) / 2, len + 0.02, 0.04, Math.atan2(by - ay, bx - ax), { platform: e.k === 'P', hazard: e.k === 'D' });
      }
    }
    const T = L.trigger;
    triggerC = world.box(T.x - T.w / 2, -T.y - T.h / 2, T.w, T.h, { solid: false });
    ctl = new Controller2023();
    // Unity: kapsül merkezi transform'dan (0.0064, -0.062) kayık
    ctl.body.x = L.start.x + 0.0064; ctl.body.y = -L.start.y + 0.062;
    world.gravity = 9.81;
    music?.stop(0);
    music = audio.play('piyano2023', { bus: 'music', loop: true, gain: 0.9 });
    acc = 0;
  };
  return {
    name: 'bolum2023',
    enter(a: Bolum2023Arg) {
      arg = a; G.P.enabled = false; build();
      // test: kapının önüne ışınla (bitirilebilirlik tools/senaryolar/plan2023.mjs ile kanıtlandı)
      (window as any).__bolum2023Isinla = () => { const T = L.trigger; ctl.body.x = T.x; ctl.body.y = -T.y; ctl.body.vx = 0; ctl.body.vy = 0; };
    },
    exit() { music?.stop(0.02); },
    update(dt) {
      if (done) return;
      ctl.input(input.a2023, input.d2023, input.w2023);
      acc += dt;
      const FIX = 1 / 50;
      while (acc >= FIX) {
        acc -= FIX;
        ctl.fixed(FIX, world);
        if (ctl.body.hitHazard) { build(); return; }        // SceneManager.LoadScene(sahne.name)
        if (ctl.body.touching.has(triggerC)) { done = true; G.go(arg.next, arg.nextArg); return; }
      }
      animT += dt;
    },
    draw(ctx, W, H) {
      const u = H / 10;                      // ortografik boy 5
      const camX = ctl.body.x - 0.0064 + 3.2, camY = ctl.body.y - 0.062 - 2.0;
      const sx = (x: number) => W / 2 + (x - camX) * u, sy = (y: number) => H / 2 + (y - camY) * u;
      ctx.fillStyle = 'rgb(49,77,121)'; ctx.fillRect(0, 0, W, H);
      ctx.imageSmoothingEnabled = true;
      const bg = L.bg;
      ctx.drawImage(IMG[bg.img], sx(bg.x - bg.size / 2), sy(-bg.y - bg.size / 2), bg.size * u, bg.size * u);
      const drawObj = (ob: Obj2023, col: string) => {
        ctx.save();
        ctx.translate(sx(ob.x), sy(-ob.y));
        ctx.rotate(-ob.r * Math.PI / 180);
        const w = SIYAH_W * Math.abs(ob.sx) * u, h = SIYAH_H * Math.abs(ob.sy) * u;
        ctx.fillStyle = col; ctx.fillRect(-w / 2, -h / 2, w, h);
        ctx.restore();
      };
      for (const ob of L.objs) if (ob.k !== 'W') drawObj(ob, '#000');
      for (const ob of L.objs) if (ob.k === 'W') drawObj(ob, '#fff');
      // karakter
      const b = ctl.body;
      const px = sx(b.x - 0.0064), py = sy(b.y - 0.062);
      ctx.save();
      ctx.translate(px, py);
      if (ctl.flipX) ctx.scale(-1, 1);
      const walking = ctl.animHiz > 0.1 && ctl.yerdemiyim;
      if (!ctl.yerdemiyim) {
        drawFrame(ctx, IMG.yurume0, u);           // KarakterZiplamaAnim2: KarakterYurume_0
      } else if (walking) {
        const f = Math.floor(animT * 12) % 4;     // 12 kare/sn, 4 kare
        drawFrame(ctx, IMG['yurume' + f], u);
      } else {
        const k = IMG.karakter;                   // tam tuval 3.2 x 1.8 birim, merkez pivot
        ctx.drawImage(k, -1.6 * u, -0.9 * u, 3.2 * u, 1.8 * u);
      }
      ctx.restore();
    },
  };
}

/** Sıkı kırpılmış yürüme karesi: orijinal piksel × 0.0004 birim, merkez pivot. */
function drawFrame(ctx: CanvasRenderingContext2D, im: HTMLImageElement, u: number) {
  const w = im.width * 5 * 0.0004 * u, h = im.height * 5 * 0.0004 * u;
  ctx.drawImage(im, -w / 2, -h / 2, w, h);
}
