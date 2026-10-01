// Metin yardımcıları: satır kaydırma, yazı makinesi, harf harf beliren metin.
export function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const out: string[] = [];
  for (const para of text.split('\n')) {
    if (para === '') { out.push(''); continue; }
    const words = para.split(/(\s+)/);
    let line = '';
    for (const w of words) {
      const test = line + w;
      if (ctx.measureText(test).width > maxW && line.trim() !== '') {
        out.push(line.replace(/\s+$/, ''));
        line = w.replace(/^\s+/, '');
        // tek kelime genişliği aşarsa harf harf böl
        while (ctx.measureText(line).width > maxW && line.length > 1) {
          let k = line.length;
          while (k > 1 && ctx.measureText(line.slice(0, k)).width > maxW) k--;
          out.push(line.slice(0, k)); line = line.slice(k);
        }
      } else line = test;
    }
    out.push(line);
  }
  return out;
}

/** Unity KlavyeEfekti.cs: her harf `gecikme` sn, noktadan sonra +1 sn. */
export class Typewriter2023 {
  shown = 0;
  private t = 0;
  done = false;
  constructor(public text: string, public gecikme = 0.1) {}
  update(dt: number) {
    if (this.done) return;
    this.t -= dt;
    while (this.t <= 0 && !this.done) {
      const ch = this.text[this.shown];
      this.shown++;
      this.t += (ch === '.' ? 1 : 0) + this.gecikme;
      if (this.shown >= this.text.length) this.done = true;
    }
  }
  get visible() { return this.text.slice(0, this.shown); }
}

/** Yeni oyunun yazısı: noktalama duraklamalı, sesli. */
export class Typer {
  shown = 0;
  private t = 0;
  done = false;
  /** saniyedeki harf */
  cps: number;
  onChar?: (ch: string) => void;
  constructor(public text: string, cps = 38) { this.cps = cps; if (!text.length) this.done = true; }
  update(dt: number) {
    if (this.done) return;
    this.t -= dt;
    while (this.t <= 0 && !this.done) {
      const ch = this.text[this.shown];
      this.shown++;
      this.onChar?.(ch);
      let d = 1 / this.cps;
      const next = this.text[this.shown];
      if (ch === '.' && next !== '.') d += 0.32;
      else if (ch === '.' ) d += 0.08;
      else if (ch === ',' || ch === ';') d += 0.14;
      else if (ch === '?' || ch === '!') d += 0.3;
      else if (ch === ':' ) d += 0.15;
      else if (ch === '\n') d += 0.25;
      this.t += d;
      if (this.shown >= this.text.length) this.done = true;
    }
  }
  finish() { this.shown = this.text.length; this.done = true; }
  get visible() { return this.text.slice(0, this.shown); }
}

export interface WLine { text: string; start: number }
/** Satır kaydırma; her satırın özgün metindeki başlangıç indisini de verir. */
export function wrapIdx(ctx: CanvasRenderingContext2D, text: string, maxW: number): WLine[] {
  const out: WLine[] = [];
  let i = 0;
  const n = text.length;
  while (i <= n) {
    // paragraf sonu
    let j = text.indexOf('\n', i); if (j < 0) j = n;
    const para = text.slice(i, j);
    if (para.length === 0) out.push({ text: '', start: i });
    let p = 0;
    while (p < para.length) {
      // p'den başlayarak sığan en uzun kelime dizisi
      let end = p, lastBreak = -1;
      while (end < para.length) {
        const nx = end + 1;
        if (ctx.measureText(para.slice(p, nx)).width > maxW) break;
        end = nx;
        if (para[end] === ' ' || end === para.length) lastBreak = end;
      }
      let cut: number;
      if (end >= para.length) cut = para.length;
      else if (lastBreak > p) cut = lastBreak;
      else cut = Math.max(p + 1, end);
      out.push({ text: para.slice(p, cut), start: i + p });
      p = cut;
      while (p < para.length && para[p] === ' ') p++;
    }
    i = j + 1;
    if (j >= n) break;
  }
  return out;
}
