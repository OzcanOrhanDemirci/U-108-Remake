// Yordamsal çizim: 2023 arka planlarının (Sahne2/3/7) renk dilinden türetilmiş düz vektör dünya.
import { TAU, lerp, mix, rng, Rng, fbm1, noise1, clamp } from '../core/math';

type Ctx = CanvasRenderingContext2D;

export function vGrad(ctx: Ctx, y0: number, y1: number, stops: [number, string][]) {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  for (const [t, c] of stops) g.addColorStop(clamp(t, 0, 1), c);
  return g;
}

/** Kapalı Catmull-Rom yolu (yuvarlak hatlar). */
export function smoothPath(ctx: Ctx, pts: { x: number; y: number }[], closed = true) {
  const n = pts.length;
  if (n < 2) return;
  ctx.moveTo(pts[0].x, pts[0].y);
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    const a = closed || i > 0 ? p0 : p1, d = closed || i < n - 2 ? p3 : p2;
    ctx.bezierCurveTo(p1.x + (p2.x - a.x) / 6, p1.y + (p2.y - a.y) / 6, p2.x - (d.x - p1.x) / 6, p2.y - (d.y - p1.y) / 6, p2.x, p2.y);
  }
  if (closed) ctx.closePath();
}

/** Yumuşak tepe sırası: x0..x1 arasında, taban y'den aşağı dolu. */
export function ridge(x0: number, x1: number, baseY: number, amp: number, freq: number, seed: number, step = 0.6) {
  const pts: { x: number; y: number }[] = [];
  for (let x = x0; x <= x1 + step; x += step) pts.push({ x, y: baseY - amp * (0.5 + 0.5 * fbm1(x * freq, seed, 3)) });
  return pts;
}

export function fillRidge(ctx: Ctx, pts: { x: number; y: number }[], bottom: number, fill: string | CanvasGradient) {
  ctx.beginPath();
  ctx.moveTo(pts[0].x, bottom);
  ctx.lineTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i].x + pts[i + 1].x) / 2, my = (pts[i].y + pts[i + 1].y) / 2;
    ctx.quadraticCurveTo(pts[i].x, pts[i].y, mx, my);
  }
  const l = pts[pts.length - 1];
  ctx.lineTo(l.x, l.y);
  ctx.lineTo(l.x, bottom);
  ctx.closePath();
  ctx.fillStyle = fill; ctx.fill();
}

/** 2023 Sahne2 güneşi: beyazdan lavanta degrade disk, altında yatay şeritler. */
export function sun(ctx: Ctx, x: number, y: number, r: number, top = '#FBF6FB', bot = '#A48CE0', glow = 'rgba(255,240,250,0.35)') {
  const g = ctx.createRadialGradient(x, y, r * 0.9, x, y, r * 1.7);
  g.addColorStop(0, glow); g.addColorStop(1, 'rgba(255,240,250,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 1.7, 0, TAU); ctx.fill();
  ctx.fillStyle = vGrad(ctx, y - r, y + r, [[0, top], [0.45, mix(top, bot, 0.25)], [1, bot]]);
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
}

/** Lolipop ağaç (Sahne2): siyah gövde, V dallar, yuvarlak bulut taç. sway: rüzgâr (-1..1). */
export interface TreeSpec { x: number; y: number; h: number; canopy: [string, string]; trunk: string; seed: number; r: number; lean: number; branches: number; blobs: { dx: number; dy: number; r: number }[] }

export function makeTree(R: Rng, x: number, y: number, h: number, canopy: [string, string], trunk = '#07040c'): TreeSpec {
  const r = h * R.range(0.2, 0.3);
  const blobs = [];
  const n = R.int(3, 5);
  for (let i = 0; i < n; i++) blobs.push({ dx: R.range(-0.75, 0.75) * r, dy: R.range(-0.5, 0.35) * r, r: r * R.range(0.55, 0.85) });
  blobs.push({ dx: 0, dy: -0.15 * r, r: r * 0.85 });
  return { x, y, h, canopy, trunk, seed: R() * 1000, r, lean: R.range(-0.04, 0.04), branches: R.int(2, 4), blobs };
}

export function drawTree(ctx: Ctx, t: TreeSpec, time: number, wind = 1, canopyFront = true) {
  if (!isFinite(t.x) || !isFinite(t.y) || !isFinite(t.h)) return;
  const sway = Math.sin(time * 0.8 + t.seed) * 0.012 * wind + noise1(time * 0.3 + t.seed, 3) * 0.01 * wind;
  const topX = t.x + t.h * (t.lean + sway), topY = t.y - t.h;
  const cx = topX, cy = topY + t.r * 0.2;
  const drawCanopy = () => {
    const g = ctx.createLinearGradient(cx - t.r, cy - t.r, cx + t.r * 0.6, cy + t.r);
    g.addColorStop(0, t.canopy[0]); g.addColorStop(1, t.canopy[1]);
    ctx.fillStyle = g;
    ctx.beginPath();
    for (const b of t.blobs) { const bx = cx + b.dx + sway * t.h * 0.4, by = cy + b.dy; ctx.moveTo(bx + b.r, by); ctx.arc(bx, by, b.r, 0, TAU); }
    ctx.fill();
  };
  if (!canopyFront) drawCanopy();
  // gövde
  ctx.fillStyle = t.trunk;
  const w0 = t.h * 0.03, w1 = t.h * 0.008;
  ctx.beginPath();
  ctx.moveTo(t.x - w0, t.y + 0.05);
  ctx.quadraticCurveTo(t.x - w0 * 0.6 + (topX - t.x) * 0.3, t.y - t.h * 0.5, topX - w1, topY);
  ctx.lineTo(topX + w1, topY);
  ctx.quadraticCurveTo(t.x + w0 * 0.6 + (topX - t.x) * 0.3, t.y - t.h * 0.5, t.x + w0, t.y + 0.05);
  ctx.closePath(); ctx.fill();
  // V dalları
  ctx.strokeStyle = t.trunk; ctx.lineCap = 'round';
  const R = rng(t.seed | 0);
  for (let i = 0; i < t.branches; i++) {
    const k = 0.35 + i * (0.45 / t.branches) + R.range(0, 0.08);
    const bx = lerp(t.x, topX, k), by = t.y - t.h * k;
    const len = t.h * R.range(0.12, 0.2) * (1 - k * 0.4);
    const side = i % 2 === 0 ? -1 : 1;
    ctx.lineWidth = t.h * 0.009;
    ctx.beginPath(); ctx.moveTo(bx, by);
    ctx.quadraticCurveTo(bx + side * len * 0.3, by - len * 0.3, bx + side * len * 0.75 + sway * t.h * 0.3, by - len);
    ctx.stroke();
  }
  if (canopyFront) drawCanopy();
}

/** Selvi (Sahne3): uzun sivri iğ. */
export function cypress(ctx: Ctx, x: number, y: number, h: number, w: number, col: string | CanvasGradient, sway = 0) {
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(x - w / 2, y + 0.02);
  ctx.bezierCurveTo(x - w * 0.62, y - h * 0.45, x - w * 0.28 + sway * h * 0.5, y - h * 0.86, x + sway * h, y - h);
  ctx.bezierCurveTo(x + w * 0.28 + sway * h * 0.5, y - h * 0.86, x + w * 0.62, y - h * 0.45, x + w / 2, y + 0.02);
  ctx.closePath(); ctx.fill();
}

/** Çıplak ağaç (Sahne3 sağdaki): ince gövde, açılı dallar. */
export function bareTree(ctx: Ctx, x: number, y: number, h: number, col: string, seed: number, sway = 0) {
  const R = rng(seed);
  ctx.strokeStyle = col; ctx.lineCap = 'round';
  const top = { x: x + sway * h, y: y - h };
  ctx.lineWidth = h * 0.018;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(top.x, top.y); ctx.stroke();
  const n = R.int(4, 7);
  for (let i = 0; i < n; i++) {
    const k = 0.3 + (i / n) * 0.62;
    const bx = lerp(x, top.x, k), by = y - h * k;
    const side = i % 2 === 0 ? -1 : 1;
    const len = h * R.range(0.15, 0.32) * (1.1 - k * 0.6);
    ctx.lineWidth = h * 0.007;
    ctx.beginPath(); ctx.moveTo(bx, by);
    ctx.lineTo(bx + side * len * 0.8 + sway * h * k, by - len * 0.65);
    ctx.stroke();
  }
}

/** Dikenli çalı (2023 dikenlerinin yeni hali): siyah, sivri. Döner: çarpışma için üçgen tepe noktaları. */
export function thorns(ctx: Ctx, x0: number, x1: number, y: number, h: number, seed: number, col = '#07030a', time = 0) {
  const R = rng(seed);
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(x0, y + 0.1);
  let x = x0;
  while (x < x1) {
    const w = R.range(0.12, 0.26);
    const hh = h * R.range(0.55, 1.1);
    const lean = R.range(-0.08, 0.08) + Math.sin(time * 1.3 + x) * 0.01;
    ctx.lineTo(x + w * 0.5 + lean, y - hh);
    ctx.lineTo(Math.min(x + w, x1), y);
    x += w;
  }
  ctx.lineTo(x1, y + 0.1);
  ctx.closePath(); ctx.fill();
}

/** Ekran boyu tanecik dokusu (bir kez üretilir). */
let grainCanvas: HTMLCanvasElement | null = null;
export function grainPattern(ctx: Ctx) {
  if (!grainCanvas) {
    grainCanvas = document.createElement('canvas');
    grainCanvas.width = grainCanvas.height = 256;
    const g = grainCanvas.getContext('2d')!;
    const id = g.createImageData(256, 256);
    for (let i = 0; i < id.data.length; i += 4) {
      const v = Math.random() < 0.5 ? 0 : 255;
      id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = Math.random() * 40;
    }
    g.putImageData(id, 0, 0);
  }
  return ctx.createPattern(grainCanvas, 'repeat')!;
}

/** Benekli kenar (Sahne0'daki baskı dokusu gibi): bir yolun üst kenarına nokta serpiştirir. */
export function stipple(ctx: Ctx, pts: { x: number; y: number }[], col: string, density: number, depth: number, size: number, seed: number) {
  const R = rng(seed);
  ctx.fillStyle = col;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const n = Math.floor(len * density);
    for (let k = 0; k < n; k++) {
      const t = R(); const d = Math.pow(R(), 2) * depth;
      const x = lerp(a.x, b.x, t), y = lerp(a.y, b.y, t) + d;
      ctx.fillRect(x, y, size, size);
    }
  }
}
