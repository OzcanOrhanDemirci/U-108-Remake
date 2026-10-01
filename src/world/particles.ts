// Parçacıklar: yaprak, toz, polen, kıvılcım, kırıntı. Dünya koordinatında; kamera dönüşümü dışarıda.
import { TAU, rng } from '../core/math';

export interface P {
  x: number; y: number; vx: number; vy: number;
  life: number; max: number;
  size: number; rot: number; vr: number;
  kind: 'yaprak' | 'toz' | 'polen' | 'kivilcim' | 'kirinti' | 'isik' | 'harf';
  col: string; a: number; seed: number; ch?: string; g?: number; drag?: number;
}

export class Particles {
  list: P[] = [];
  private R = rng(7);
  wind = 0.6;

  add(p: Partial<P> & { x: number; y: number; kind: P['kind'] }) {
    const q: P = { vx: 0, vy: 0, life: 0, max: 4, size: 0.06, rot: this.R() * TAU, vr: 0, col: '#fff', a: 1, seed: this.R() * 100, g: 0, drag: 0, ...p };
    this.list.push(q);
    return q;
  }

  /** Görünür alanda yaprak/toz yağdırır. */
  emitAmbient(kind: P['kind'], x0: number, x1: number, y0: number, y1: number, rate: number, dt: number, cols: string[], o: Partial<P> = {}) {
    let n = rate * dt;
    while (n > 0) {
      if (this.R() < n) {
        const R = this.R;
        this.add({ kind, x: x0 + (x1 - x0) * R(), y: y0 + (y1 - y0) * R(), col: cols[Math.floor(R() * cols.length)], max: 6 + R() * 6,
          size: kind === 'yaprak' ? 0.07 + R() * 0.06 : 0.015 + R() * 0.03, vr: (R() - 0.5) * 3, vx: (R() - 0.3) * 0.4, vy: kind === 'yaprak' ? 0.4 + R() * 0.4 : (R() - 0.5) * 0.15, ...o });
      }
      n -= 1;
    }
  }

  update(dt: number, t: number) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      p.life += dt;
      if (p.life >= p.max) { this.list.splice(i, 1); continue; }
      if (p.kind === 'yaprak') {
        p.vx += (this.wind * 0.8 + Math.sin(t * 1.3 + p.seed) * 0.9 - p.vx) * dt * 0.8;
        p.vy += (0.55 + Math.sin(t * 2.1 + p.seed * 2) * 0.35 - p.vy) * dt * 1.2;
        p.rot += p.vr * dt;
      } else if (p.kind === 'toz' || p.kind === 'polen' || p.kind === 'isik') {
        p.vx += (Math.sin(t * 0.7 + p.seed) * 0.12 + this.wind * 0.08 - p.vx) * dt * 0.5;
        p.vy += (Math.cos(t * 0.5 + p.seed * 1.7) * 0.1 - p.vy) * dt * 0.5;
      } else {
        p.vy += (p.g ?? 0) * dt;
        const d = p.drag ?? 0;
        p.vx *= 1 - d * dt; p.vy *= 1 - d * dt;
        p.rot += p.vr * dt;
      }
      p.x += p.vx * dt; p.y += p.vy * dt;
    }
  }

  draw(ctx: CanvasRenderingContext2D, filter?: (p: P) => boolean) {
    for (const p of this.list) {
      if (filter && !filter(p)) continue;
      const fadeIn = Math.min(1, p.life / 0.6), fadeOut = Math.min(1, (p.max - p.life) / 1.2);
      const a = p.a * fadeIn * fadeOut;
      if (a <= 0.003) continue;
      ctx.globalAlpha = a;
      ctx.fillStyle = p.col;
      if (p.kind === 'yaprak') {
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.scale(1, 0.45 + 0.4 * Math.sin(p.life * 4 + p.seed));
        ctx.beginPath(); ctx.ellipse(0, 0, p.size, p.size * 0.55, 0, 0, TAU); ctx.fill();
        ctx.restore();
      } else if (p.kind === 'kirinti') {
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      } else if (p.kind === 'harf' && p.ch) {
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.fillText(p.ch, 0, 0);
        ctx.restore();
      } else if (p.kind === 'isik' || p.kind === 'kivilcim') {
        const tw = 0.6 + 0.4 * Math.sin(p.life * 5 + p.seed * 3);
        ctx.globalAlpha = a * tw;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, TAU); ctx.fill();
        ctx.globalAlpha = a * tw * 0.25;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 3, 0, TAU); ctx.fill();
      } else {
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, TAU); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }
}
