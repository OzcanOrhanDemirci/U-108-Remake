// Konuşma sistemi. Üç ses: karakter (piksel yazı, başının üstünde), Claude (eşaralıklı yazı + imleç), 2023 kaydı (alt yazı).
import { Co } from '../core/co';
import { input } from '../core/input';
import { audio } from '../core/audio';
import { FONT } from '../core/assets';
import { Typer, wrapIdx, WLine } from './text';
import { fill } from '../story/vars';
import { clamp, easeOut } from '../core/math';

export type Who = 'k' | 'ai' | 'ses' | 'eski';
export interface SayOpts {
  block?: boolean;      // onay bekle (Boşluk/Enter/tık)
  hold?: number;        // bloksuz: yazıldıktan sonra ekranda kalma süresi
  cps?: number;
  pos?: 'ust' | 'merkez' | 'alt' | 'kafa';
  wait?: boolean;       // false: hemen dön (arka planda yazmaya devam)
  size?: number;        // yazı boyu çarpanı
  silent?: boolean;
  keep?: boolean;       // aynı konuşmacının sonraki satırı gelene kadar silinme
}

interface Line {
  who: Who; text: string; typer: Typer; age: number; doneAge: number;
  state: 'yaziyor' | 'bekliyor' | 'soluyor'; alpha: number; o: SayOpts; fresh: number[];
  wrapKey?: string; wrapped?: WLine[]; dim?: boolean;
}

export interface Anchor { x: number; y: number; visible: boolean }

export class Talk {
  lines: Line[] = [];
  blockDefault = false;
  /** karakterin başının ekran konumu (her karede sahne günceller) */
  head: Anchor = { x: 0, y: 0, visible: false };
  onTalking?: (who: Who, on: boolean) => void;
  aiCursorVisible = true;
  cursorPos = { x: 0, y: 0, on: false };
  private t = 0;
  scale = 1;
  aiPos: 'ust' | 'merkez' = 'ust';
  /** Parlak sahnelerde yazı arkasına koyu perde (0 kapalı). */
  scrim = 1;

  clear(who?: Who) { for (const l of this.lines) if (!who || l.who === who) l.state = 'soluyor'; }

  private push(who: Who, text: string, o: SayOpts): Line {
    for (const l of this.lines) if (l.who === who || (who === 'ses' && l.who !== 'ses')) { if (l.who === who) l.state = 'soluyor'; }
    const cps = o.cps ?? (who === 'ai' ? 34 : who === 'k' ? 30 : 40);
    const typer = new Typer(text, cps);
    const line: Line = { who, text, typer, age: 0, doneAge: 0, state: 'yaziyor', alpha: 0, o, fresh: [] };
    typer.onChar = ch => {
      line.fresh.push(0);
      if (!o.silent) audio.blip(who === 'ai' ? 'ai' : who === 'k' ? 'karakter' : 'eski', ch);
    };
    this.lines.push(line);
    return line;
  }

  *say(who: Who, raw: string, o: SayOpts = {}): Co {
    const block = o.block ?? this.blockDefault;
    const text = fill(raw);
    const line = this.push(who, text, o);
    this.onTalking?.(who, true);
    if (o.wait === false) { this.finishLater(line, block); return; }
    while (line.state === 'yaziyor') {
      if (block && input.confirmPressed && line.age > 0.12) { line.typer.finish(); line.fresh = []; }
      yield;
    }
    this.onTalking?.(who, false);
    if (block) {
      yield; // aynı basış hem bitirip hem geçmesin
      while (!input.confirmPressed) yield;
      // konuşma akışı okunsun: satır sönükleşerek kalır, aynı konuşmacı yeniden konuşunca silinir
      if (!o.keep) line.dim = true;
    } else {
      const hold = o.hold ?? 1.3 + text.length * 0.045;
      let t = 0;
      while (t < hold && line.state !== 'soluyor') t += yield;
      if (!o.keep) line.state = 'soluyor';
    }
  }
  private finishLater(line: Line, block: boolean) { void line; void block; }

  k(text: string, o: SayOpts = {}) { return this.say('k', text, o); }
  ai(text: string, o: SayOpts = {}) { return this.say('ai', text, o); }

  get typing() { return this.lines.some(l => l.state === 'yaziyor'); }
  isTyping(who: Who) { return this.lines.some(l => l.who === who && l.state === 'yaziyor'); }

  update(dt: number) {
    this.t += dt;
    for (const l of this.lines) {
      l.age += dt;
      if (l.state === 'yaziyor') {
        l.typer.update(dt);
        if (l.typer.done) { l.state = 'bekliyor'; this.onTalking?.(l.who, false); }
      }
      for (let i = 0; i < l.fresh.length; i++) l.fresh[i] += dt;
      while (l.fresh.length && l.fresh[0] > 0.25) l.fresh.shift();
      if (l.state === 'soluyor') l.alpha = Math.max(0, l.alpha - dt * 3.2);
      else if (l.dim) l.alpha = Math.max(0.32, l.alpha - dt * 3);
      else l.alpha = Math.min(1, l.alpha + dt * 6);
    }
    this.lines = this.lines.filter(l => !(l.state === 'soluyor' && l.alpha <= 0));
  }

  draw(ctx: CanvasRenderingContext2D, W: number, H: number) {
    const s = H / 1080 * this.scale;
    this.cursorPos.on = false;
    for (const l of this.lines) {
      if (l.alpha <= 0) continue;
      if (l.who === 'ai') this.drawAI(ctx, W, H, s, l);
      else if (l.who === 'k') this.drawK(ctx, W, H, s, l);
      else this.drawSes(ctx, W, H, s, l);
    }
  }

  /** Görünür metni çizer; son yazılan harfler yumuşakça belirir. */
  private drawFresh(ctx: CanvasRenderingContext2D, lines: WLine[], x: number, y0: number, lh: number, l: Line, rise: number, align: 'left' | 'center') {
    const n = l.typer.shown;
    const firstFresh = n - l.fresh.length;
    for (let i = 0; i < lines.length; i++) {
      const L = lines[i];
      const vis = Math.max(0, Math.min(L.text.length, n - L.start));
      if (vis <= 0) continue;
      const x0 = align === 'center' ? x - ctx.measureText(L.text).width / 2 : x;
      const y = y0 + i * lh;
      const stable = Math.max(0, Math.min(vis, firstFresh - L.start));
      if (stable > 0) ctx.fillText(L.text.slice(0, stable), x0, y);
      for (let k = stable; k < vis; k++) {
        const age = l.fresh[(L.start + k) - firstFresh] ?? 1;
        const a = easeOut(clamp(age / 0.18, 0, 1));
        const px = x0 + ctx.measureText(L.text.slice(0, k)).width;
        const ga = ctx.globalAlpha;
        ctx.globalAlpha = ga * a;
        ctx.fillText(L.text[k], px, y + (1 - a) * rise);
        ctx.globalAlpha = ga;
      }
    }
  }

  private wrap(ctx: CanvasRenderingContext2D, l: Line, maxW: number) {
    const key = ctx.font + '|' + Math.round(maxW);
    if (l.wrapKey !== key) { l.wrapKey = key; l.wrapped = wrapIdx(ctx, l.text, maxW); }
    return l.wrapped!;
  }

  private drawAI(ctx: CanvasRenderingContext2D, W: number, H: number, s: number, l: Line) {
    const sz = 29 * s * (l.o.size ?? 1);
    ctx.font = `400 ${sz}px ${FONT.mono}`;
    ctx.textBaseline = 'alphabetic';
    const maxW = Math.min(W * 0.62, 1100 * s);
    const lines = this.wrap(ctx, l, maxW);
    const lh = sz * 1.55;
    const blockW = Math.max(...lines.map(t => ctx.measureText(t.text).width));
    const pos = l.o.pos ?? this.aiPos;
    const x0 = W / 2 - blockW / 2;
    const totalH = lines.length * lh;
    const y0 = pos === 'merkez' ? H / 2 - totalH / 2 + sz : pos === 'alt' ? H * 0.8 - totalH + sz : H * 0.12 + sz;
    ctx.globalAlpha = l.alpha * (l.dim ? 0.5 : 1);
    if (this.scrim > 0) {
      const padX = 60 * s, padY = 34 * s;
      const cx = W / 2, cy = y0 - sz * 0.35 + (lines.length - 1) * lh / 2;
      const rw = blockW / 2 + padX, rh = totalH / 2 + padY;
      ctx.save();
      ctx.translate(cx, cy); ctx.scale(rw, rh);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
      g.addColorStop(0, `rgba(12,4,16,${0.42 * this.scrim})`); g.addColorStop(0.6, `rgba(12,4,16,${0.3 * this.scrim})`); g.addColorStop(1, 'rgba(12,4,16,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 1, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    ctx.globalAlpha = l.alpha;
    ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 12 * s; ctx.shadowOffsetY = 2 * s;
    ctx.fillStyle = '#F6EEE6';
    ctx.textAlign = 'left';
    this.drawFresh(ctx, lines, x0, y0, lh, l, 6 * s, 'left');
    ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
    // imleç: son yazılan harfin hemen sonrası
    if (this.aiCursorVisible && l.state !== 'soluyor' && !l.dim) {
      const shown = l.typer.shown;
      let li = 0;
      for (let i = 0; i < lines.length; i++) if (lines[i].start <= shown) li = i;
      const col = Math.max(0, Math.min(lines[li].text.length, shown - lines[li].start));
      const cx = x0 + ctx.measureText(lines[li].text.slice(0, col)).width + 3 * s;
      const cy = y0 + li * lh;
      const on = l.state === 'yaziyor' || Math.floor(this.t / 0.53) % 2 === 0;
      if (on) {
        ctx.fillStyle = '#E9886F';
        ctx.shadowColor = 'rgba(233,136,111,0.8)'; ctx.shadowBlur = 14 * s;
        ctx.fillRect(cx, cy - sz * 0.82, sz * 0.52, sz * 1.0);
        ctx.shadowBlur = 0;
      }
      this.cursorPos = { x: cx, y: cy, on: true };
    }
    if ((l.o.block ?? this.blockDefault) && l.state === 'bekliyor' && !l.dim) this.drawPrompt(ctx, W / 2 + blockW / 2 + 22 * s, y0 + (lines.length - 1) * lh, s, l.alpha);
    ctx.globalAlpha = 1;
  }

  private drawK(ctx: CanvasRenderingContext2D, W: number, H: number, s: number, l: Line) {
    const sz = 25 * s * (l.o.size ?? 1);
    ctx.font = `${sz}px ${FONT.piksel}`;
    ctx.textBaseline = 'alphabetic';
    const maxW = Math.min(W * 0.4, 700 * s);
    const lines = this.wrap(ctx, l, maxW);
    const lh = sz * 1.45;
    const pos = l.o.pos ?? 'kafa';
    let cx = W / 2, by: number;
    if (pos === 'kafa' && this.head.visible) {
      cx = this.head.x; by = this.head.y - 18 * s;
    } else if (pos === 'merkez') { by = H * 0.6; }
    else if (pos === 'alt') { by = H * 0.82; }
    else { by = H * 0.3; }
    const blockW = Math.max(...lines.map(t => ctx.measureText(t.text).width));
    cx = clamp(cx, blockW / 2 + 30 * s, W - blockW / 2 - 30 * s);
    const y0 = by - (lines.length - 1) * lh;
    const top = clamp(y0, sz + 20 * s, H);
    ctx.globalAlpha = l.alpha;
    ctx.textAlign = 'left';
    // okunurluk için koyu gölge
    ctx.shadowColor = 'rgba(10,4,12,0.95)'; ctx.shadowBlur = 10 * s; ctx.shadowOffsetY = 2 * s;
    ctx.fillStyle = '#FFFFFF';
    ctx.lineWidth = 3 * s; ctx.strokeStyle = 'rgba(14,4,16,0.55)'; ctx.lineJoin = 'round';
    this.drawFresh(ctx, lines, cx, top, lh, l, 8 * s, 'center');
    ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
    if ((l.o.block ?? this.blockDefault) && l.state === 'bekliyor' && !l.dim) this.drawPrompt(ctx, cx + blockW / 2 + 18 * s, top + (lines.length - 1) * lh, s, l.alpha);
    ctx.globalAlpha = 1;
  }

  private drawSes(ctx: CanvasRenderingContext2D, W: number, H: number, s: number, l: Line) {
    const sz = 24 * s;
    ctx.font = `${sz}px ${FONT.piksel}`;
    const lines = this.wrap(ctx, l, Math.min(W * 0.7, 1300 * s));
    const lh = sz * 1.5;
    const y0 = H * 0.86 - (lines.length - 1) * lh;
    ctx.globalAlpha = l.alpha;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#FFE9B8';
    ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = 6 * s;
    this.drawFresh(ctx, lines, W / 2, y0, lh, l, 0, 'center');
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }

  private drawPrompt(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, a: number) {
    const bob = Math.sin(this.t * 4) * 3 * s;
    ctx.globalAlpha = a * (0.55 + 0.45 * Math.sin(this.t * 4));
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(x, y - 12 * s + bob); ctx.lineTo(x + 12 * s, y - 12 * s + bob); ctx.lineTo(x + 6 * s, y - 4 * s + bob); ctx.closePath(); ctx.fill();
    ctx.globalAlpha = a;
  }
}
