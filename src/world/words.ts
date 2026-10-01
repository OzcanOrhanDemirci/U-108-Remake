// Yazıdan zemin: Claude'un (ya da oyuncunun) yazdığı kelimeler tek yönlü platform olur.
// Eski kelimeler zamanla silinir (bağlam penceresi gibi).
import { World, Collider } from './physics';
import { Particles } from './particles';
import { audio } from '../core/audio';
import { FONT } from '../core/assets';
import { Co, wait } from '../core/co';
import { clamp, easeOut, TAU } from '../core/math';

export interface Letter { ch: string; dx: number; w: number; born: number; dip: number }
export interface Word {
  text: string; x: number; y: number;   // y: üst yüzey (ayak burada durur)
  size: number; w: number;
  letters: Letter[];
  shown: number;                         // yazılan harf sayısı
  born: number; life: number;            // life: saniye (Infinity: kalıcı)
  dying: number;                         // >0 siliniyor
  c: Collider | null;
  color: string; glow: string;
  font: string;
}

let measureCtx: CanvasRenderingContext2D | null = null;
function mctx() { if (!measureCtx) measureCtx = document.createElement('canvas').getContext('2d')!; return measureCtx; }

export class Words {
  list: Word[] = [];
  cursor = { x: 0, y: 0, on: false, tx: 0, ty: 0 };
  t = 0;
  constructor(public world: World, public parts: Particles) {}

  /** Bir kelime hazırlar (henüz görünmez). */
  make(text: string, x: number, y: number, o: { size?: number; life?: number; color?: string; glow?: string; font?: string; upper?: boolean } = {}): Word {
    const size = o.size ?? 0.62;
    const font = o.font ?? FONT.mono;
    const shown = o.upper === false ? text : text.toLocaleUpperCase('tr');
    const m = mctx();
    m.font = `600 100px ${font}`;
    const letters: Letter[] = [];
    let acc = 0;
    for (const ch of shown) {
      const w = m.measureText(ch).width / 100 * size;
      letters.push({ ch, dx: acc, w, born: -1, dip: 0 });
      acc += w;
    }
    const wd: Word = { text: shown, x, y, size, w: acc, letters, shown: 0, born: this.t, life: o.life ?? Infinity, dying: 0, c: null,
      color: o.color ?? '#FFF3EA', glow: o.glow ?? 'rgba(255,200,170,0.9)', font };
    this.list.push(wd);
    return wd;
  }

  /** Harf harf yazar; imleç kelimenin üstünde ilerler. Bittiğinde çarpıştırıcı tam boydur. */
  *write(wd: Word, cps = 16, sound = true): Co {
    this.cursor.on = true;
    for (let i = 0; i < wd.letters.length; i++) {
      const L = wd.letters[i];
      L.born = this.t;
      wd.shown = i + 1;
      this.cursor.tx = wd.x + L.dx + L.w; this.cursor.ty = wd.y;
      if (sound && L.ch !== ' ') audio.blip('ai', L.ch);
      this.updateCollider(wd);
      yield* wait(1 / cps);
    }
    wd.born = this.t;
  }

  /** Yazılmış kısım kadar platform. */
  updateCollider(wd: Word) {
    const w = wd.shown > 0 ? wd.letters[wd.shown - 1].dx + wd.letters[wd.shown - 1].w : 0;
    if (w <= 0) return;
    const pts = [{ x: wd.x, y: wd.y }, { x: wd.x + w, y: wd.y }, { x: wd.x + w, y: wd.y + wd.size * 0.5 }, { x: wd.x, y: wd.y + wd.size * 0.5 }];
    if (!wd.c) wd.c = this.world.add(pts, { oneWay: true, surface: 'yazi' });
    else this.world.setPoly(wd.c, pts);
  }

  kill(wd: Word) { if (wd.dying === 0) wd.dying = 0.0001; }
  clear() { for (const w of this.list) this.kill(w); }

  update(dt: number, playerX: number, playerY: number, grounded: boolean) {
    this.t += dt;
    this.cursor.x += (this.cursor.tx - this.cursor.x) * Math.min(1, dt * 14);
    this.cursor.y += (this.cursor.ty - this.cursor.y) * Math.min(1, dt * 14);
    for (const wd of this.list) {
      if (wd.dying === 0 && this.t - wd.born > wd.life) wd.dying = 0.0001;
      if (wd.dying > 0) {
        const prev = wd.dying;
        wd.dying += dt;
        // harfler sırayla uçuşur
        const n = wd.letters.length;
        for (let i = 0; i < n; i++) {
          const th = (i / n) * 0.9;
          if (prev < th && wd.dying >= th && wd.letters[i].ch !== ' ') {
            const L = wd.letters[i];
            this.parts.add({ kind: 'harf', ch: L.ch, x: wd.x + L.dx, y: wd.y + wd.size * 0.86, vx: (Math.random() - 0.3) * 0.8, vy: -0.3 - Math.random() * 0.6, g: 0.6, drag: 0.3, vr: (Math.random() - 0.5) * 2, max: 2.2, col: wd.color, a: 0.9 });
          }
        }
        if (wd.dying > 0.5 && wd.c) { this.world.remove(wd.c); wd.c = null; }
      }
      // basılan harf hafifçe çöker
      for (const L of wd.letters) {
        const onIt = grounded && Math.abs(playerY - wd.y) < 0.12 && playerX >= wd.x + L.dx - 0.15 && playerX <= wd.x + L.dx + L.w + 0.15;
        L.dip += ((onIt ? 1 : 0) - L.dip) * Math.min(1, dt * 10);
      }
    }
    this.list = this.list.filter(w => !(w.dying > 1.2));
  }

  /** Bir kelimenin üstünde mi? (adım sesi için) */
  draw(ctx: CanvasRenderingContext2D) {
    for (const wd of this.list) {
      const fade = wd.dying > 0 ? 0 : 1;
      const lifeLeft = wd.life === Infinity ? 99 : wd.life - (this.t - wd.born);
      const warn = lifeLeft < 1.6 ? 0.55 + 0.45 * Math.sin(this.t * 18) : 1;
      ctx.font = `600 ${wd.size}px ${wd.font}`;
      ctx.textBaseline = 'alphabetic';
      ctx.textAlign = 'left';
      for (let i = 0; i < wd.shown; i++) {
        const L = wd.letters[i];
        if (wd.dying > 0 && i / wd.letters.length * 0.9 < wd.dying) continue;
        const age = this.t - L.born;
        const a = easeOut(clamp(age / 0.25, 0, 1)) * fade * warn;
        if (a <= 0) continue;
        const pop = 1 + (1 - easeOut(clamp(age / 0.3, 0, 1))) * 0.35;
        const x = wd.x + L.dx, base = wd.y + wd.size * 0.73 + L.dip * 0.05;
        ctx.save();
        ctx.translate(x + L.w / 2, base);
        ctx.scale(pop, pop);
        ctx.globalAlpha = a;
        ctx.shadowColor = wd.glow; ctx.shadowBlur = 14;
        ctx.fillStyle = wd.color;
        ctx.fillText(L.ch, -L.w / 2, 0);
        ctx.restore();
      }
      // alt çizgi: yazının taşıdığı zemin hissi
      if (wd.shown > 0) {
        const w = wd.letters[wd.shown - 1].dx + wd.letters[wd.shown - 1].w;
        ctx.globalAlpha = 0.35 * fade * warn;
        ctx.fillStyle = wd.color;
        ctx.fillRect(wd.x, wd.y + wd.size * 0.86, w, wd.size * 0.03);
        ctx.globalAlpha = 1;
      }
    }
    ctx.shadowBlur = 0;
    // imleç
    if (this.cursor.on) {
      const on = Math.floor(this.t / 0.5) % 2 === 0;
      if (on) {
        ctx.fillStyle = '#E9886F';
        ctx.shadowColor = 'rgba(233,136,111,0.9)'; ctx.shadowBlur = 18;
        ctx.fillRect(this.cursor.x + 0.04, this.cursor.y + 0.02, 0.3, 0.68);
        ctx.shadowBlur = 0;
      }
    }
    void TAU;
  }
}
