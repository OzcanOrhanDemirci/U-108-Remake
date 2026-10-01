// Oyuncunun yazdığı metin (insan sesi: tırnaklı serif). Karakterin adı ve yarım kalan cümle için.
import { input } from '../core/input';
import { audio } from '../core/audio';
import { FONT } from '../core/assets';
import { Co } from '../core/co';

export class TextInput {
  value = '';
  active = false;
  done = false;
  skipped = false;
  t = 0;
  a = 0;
  constructor(public prefix: string, public hint = 'Enter: tamam   ·   Esc: geç', public maxLen = 64, public prefixFont = FONT.piksel) {}

  update(dt: number) {
    this.t += dt;
    this.a += ((this.active ? 1 : 0) - this.a) * Math.min(1, dt * 6);
    if (!this.active) return;
    // gizli <input>: her klavye düzeni ve IME ile doğru karakter (ü, ş, ğ...)
    if (!input.textMode) input.beginText(this.value);
    const v = input.textValue.replace(/[\r\n]/g, '').slice(0, this.maxLen);
    if (v !== this.value) {
      audio.noise(0.03, { gain: 0.06, type: 'bandpass', freq: 1800 + Math.random() * 600, q: 2, bus: 'ui' });
      this.value = v;
    }
    if (input.pressed('Enter') || input.pressed('NumpadEnter')) {
      if (this.value.trim().length) { this.done = true; this.active = false; }
      else { this.skipped = true; this.active = false; }
      input.endText();
    }
    if (input.pressed('Escape')) { this.skipped = true; this.active = false; input.endText(); }
  }

  draw(ctx: CanvasRenderingContext2D, W: number, H: number) {
    if (this.a < 0.01) return;
    const s = H / 1080;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = this.a;
    // koyu bant
    const y = H * 0.74;
    const g = ctx.createLinearGradient(0, y - 130 * s, 0, y + 110 * s);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.35, 'rgba(6,2,8,0.72)'); g.addColorStop(0.75, 'rgba(6,2,8,0.72)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, y - 130 * s, W, 240 * s);
    ctx.textBaseline = 'alphabetic';
    ctx.font = `${26 * s}px ${this.prefixFont}`;
    const pre = this.prefix;
    ctx.font = `${26 * s}px ${this.prefixFont}`;
    const pw = ctx.measureText(pre).width;
    ctx.font = `italic 400 ${40 * s}px ${FONT.serif}`;
    const vw = ctx.measureText(this.value || ' ').width;
    const total = pw + 18 * s + Math.max(vw, 200 * s);
    let x = W / 2 - total / 2;
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `${26 * s}px ${this.prefixFont}`;
    ctx.fillText(pre, x, y);
    x += pw + 18 * s;
    ctx.font = `italic 400 ${40 * s}px ${FONT.serif}`;
    ctx.fillStyle = '#FFE7C2';
    ctx.shadowColor = 'rgba(255,200,140,0.6)'; ctx.shadowBlur = 12 * s;
    ctx.fillText(this.value, x, y + 2 * s);
    ctx.shadowBlur = 0;
    // imleç
    if (this.active && Math.floor(this.t / 0.5) % 2 === 0) {
      ctx.fillStyle = '#FFE7C2';
      ctx.fillRect(x + vw + 4 * s, y - 34 * s, 3 * s, 42 * s);
    }
    // alt çizgi
    ctx.fillStyle = 'rgba(255,231,194,0.35)';
    ctx.fillRect(x, y + 14 * s, Math.max(vw, 200 * s) + 12 * s, 2 * s);
    ctx.font = `500 ${17 * s}px ${FONT.sans}`;
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.textAlign = 'center';
    ctx.fillText(this.hint, W / 2, y + 62 * s);
    ctx.restore();
  }
}

export function* ask(ti: TextInput): Co {
  ti.active = true; ti.done = false; ti.skipped = false;
  yield;
  while (ti.active) yield;
}
