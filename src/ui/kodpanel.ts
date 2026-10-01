// Laboratuvar duvarındaki kod ekranları: 2023'ün gerçek C# betikleri. Bazı satırlar düzenlenebilir.
import { FONT } from '../core/assets';
import { audio } from '../core/audio';
import { input } from '../core/input';
import { Co, wait } from '../core/co';
import { clamp, easeOut, TAU } from '../core/math';

export interface Editable {
  line: number;
  kind: 'sayi' | 'yorum';
  value: number;            // sayi: değer; yorum: 0 açık, 1 yorumlu
  min?: number; max?: number; step?: number;
  /** satırın değer gösterimini üretir */
  render: (v: number) => string;
}

export interface Panel {
  id: string;
  x: number; y: number;        // dünya: sol üst
  w: number; h: number;
  title: string;
  lines: string[];
  edit?: Editable;
  glow: number;                 // yakınlık parlaması
  near: boolean;
  done: boolean;
  compiled: number;             // derleme ışıltısı
  highlight: number[];          // vurgulanan satırlar
  hl: number;                   // vurgu şiddeti
  dim?: number;
}

export function drawPanel(ctx: CanvasRenderingContext2D, p: Panel, t: number, focus: number) {
  const pad = 0.28;
  // dış ışıma
  ctx.save();
  ctx.shadowColor = `rgba(61,220,200,${0.25 + 0.35 * p.glow})`; ctx.shadowBlur = 30 + 30 * p.glow;
  ctx.fillStyle = '#06161A';
  ctx.beginPath(); ctx.roundRect(p.x, p.y, p.w, p.h, 0.12); ctx.fill();
  ctx.restore();
  ctx.strokeStyle = `rgba(61,220,200,${0.35 + 0.4 * p.glow})`; ctx.lineWidth = 0.035;
  ctx.beginPath(); ctx.roundRect(p.x, p.y, p.w, p.h, 0.12); ctx.stroke();
  // başlık şeridi
  ctx.fillStyle = 'rgba(61,220,200,0.12)';
  ctx.fillRect(p.x + 0.02, p.y + 0.02, p.w - 0.04, 0.42);
  const fs = 0.25;
  ctx.font = `500 ${fs}px ${FONT.mono}`;
  ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
  ctx.fillStyle = '#EBA000';
  ctx.fillText(p.title, p.x + pad, p.y + 0.31);
  // kod
  const lh = fs * 1.5;
  let y = p.y + 0.42 + lh;
  for (let i = 0; i < p.lines.length; i++) {
    let line = p.lines[i];
    const isEdit = p.edit && p.edit.line === i;
    if (isEdit) line = p.edit!.render(p.edit!.value);
    const hl = p.highlight.includes(i) ? p.hl : 0;
    if (hl > 0) { ctx.fillStyle = `rgba(235,160,0,${0.16 * hl})`; ctx.fillRect(p.x + 0.06, y - fs * 1.05, p.w - 0.12, lh); }
    if (isEdit && focus > 0) {
      ctx.fillStyle = `rgba(233,136,111,${0.22 * focus * (0.75 + 0.25 * Math.sin(t * 5))})`;
      ctx.fillRect(p.x + 0.06, y - fs * 1.05, p.w - 0.12, lh);
    }
    // sözdizimi rengi (kaba)
    const commented = line.trim().startsWith('//');
    ctx.fillStyle = commented ? '#4E7C76' : isEdit ? '#FFE3D6' : hl > 0 ? '#FFE9B0' : '#9EEFE3';
    if (p.dim !== undefined) ctx.globalAlpha = p.dim;
    ctx.fillText(line, p.x + pad, y);
    ctx.globalAlpha = 1;
    y += lh;
  }
  if (p.compiled > 0) {
    ctx.fillStyle = `rgba(160,255,230,${0.35 * p.compiled})`;
    ctx.beginPath(); ctx.roundRect(p.x, p.y, p.w, p.h, 0.12); ctx.fill();
  }
}

/** Düzenleme kipi: ←/→ değer değiştirir, Enter derler. */
export function* editPanel(p: Panel, onChange: (v: number) => void, setFocus: (f: number) => void): Co {
  const e = p.edit!;
  let f = 0;
  while (f < 1) { f = Math.min(1, f + (yield) * 3); setFocus(easeOut(f)); }
  for (;;) {
    yield;
    let changed = false;
    if (e.kind === 'sayi') {
      if (input.rightPressed || input.upPressed) { e.value = clamp(e.value + (e.step ?? 1), e.min ?? -99, e.max ?? 99); changed = true; }
      if (input.leftPressed || input.downPressed) { e.value = clamp(e.value - (e.step ?? 1), e.min ?? -99, e.max ?? 99); changed = true; }
    } else {
      if (input.rightPressed || input.leftPressed || input.upPressed || input.downPressed || input.pressed('Slash')) { e.value = e.value ? 0 : 1; changed = true; }
    }
    if (changed) { audio.blip('ai', 'x'); onChange(e.value); }
    if (input.pressed('Enter') || input.pressed('KeyE') || input.pressed('Space') || input.pressed('NumpadEnter')) break;
    if (input.escPressed) break;
  }
  // derleme
  audio.noise(0.4, { gain: 0.05, type: 'bandpass', freq: 2400, q: 1.5 });
  for (let i = 0; i < 6; i++) { audio.tone(900 + i * 120, 0.05, { gain: 0.03, type: 'square', bus: 'ui', when: audio.now + i * 0.07 }); }
  yield* wait(0.5);
  audio.tone(1320, 0.5, { gain: 0.06, type: 'sine', reverb: 0.6 });
  p.compiled = 1;
  f = 1;
  while (f > 0) { f = Math.max(0, f - (yield) * 2); setFocus(easeOut(f)); }
}

/** Yakınlık istemi: "E" */
export function drawPrompt(ctx: CanvasRenderingContext2D, x: number, y: number, a: number, t: number, label = 'E') {
  if (a <= 0.01) return;
  ctx.globalAlpha = a;
  const bob = Math.sin(t * 3) * 0.04;
  ctx.fillStyle = 'rgba(6,22,26,0.85)';
  ctx.beginPath(); ctx.roundRect(x - 0.2, y - 0.2 + bob, 0.4, 0.4, 0.08); ctx.fill();
  ctx.strokeStyle = '#3DDCC8'; ctx.lineWidth = 0.025; ctx.stroke();
  ctx.fillStyle = '#E8FFFB';
  ctx.font = `600 0.24px ${FONT.mono}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(label, x, y + 0.01 + bob);
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.globalAlpha = 1;
  void TAU;
}
