// Esc: duraklatma. 2023 sahnelerinde yok (2023'te de yoktu).
import { G } from '../game';
import { input } from '../core/input';
import { audio } from '../core/audio';
import { FONT } from '../core/assets';
import { host } from '../meta/host';
import { saveMemory, mem } from '../meta/save';

const YOK = ['menu2023', 'diyalog2023', 'bolum2023', 'kirilma', 'test-karakter'];

let open = false;
let a = 0;
let sel = 0;
const items = ['Devam et', 'Oyundan çık'];
let rects: { x: number; y: number; w: number; h: number }[] = [];

export function pauseInit() {
  G.overlay = {
    blocking: () => open,
    update(dt: number) {
      const name = G.scene?.name ?? '';
      if (!open && input.escPressed && !YOK.includes(name) && !(G.scene as any)?.name_?.active && !(G.scene as any)?.sentence?.active && !((G.scene as any)?.showMem > 0.5)) {
        open = true; sel = 0; audio.setBus('music', 0.35, 0.3); audio.blip('ai', 'x');
        return;
      }
      a += ((open ? 1 : 0) - a) * Math.min(1, dt * 10);
      if (!open) return;
      if (input.escPressed) { close(); return; }
      if (input.downPressed || input.upPressed) { sel = 1 - sel; audio.blip('ai', 'x'); }
      let hover = -1;
      rects.forEach((r, i) => { if (input.mouse.x >= r.x && input.mouse.x <= r.x + r.w && input.mouse.y >= r.y && input.mouse.y <= r.y + r.h) hover = i; });
      if (hover >= 0 && input.mouse.moved) sel = hover;
      if (input.pressed('Enter') || input.pressed('Space') || (input.mouse.clicked && hover >= 0)) {
        if (sel === 0) close();
        else { saveMemory(); mem.oyunda = true; saveMemory(); host.quit(); }
      }
    },
    draw(ctx: CanvasRenderingContext2D, W: number, H: number) {
      if (a < 0.01) return;
      const s = H / 1080;
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = a;
      ctx.fillStyle = 'rgba(6,2,10,0.62)'; ctx.fillRect(0, 0, W, H);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#FFF0E0';
      ctx.font = `300 ${54 * s}px ${FONT.serif}`;
      ctx.fillText('duraklatıldı', W / 2, H * 0.42);
      rects = [];
      items.forEach((it, i) => {
        const on = i === sel;
        ctx.font = `${on ? 'italic ' : ''}400 ${28 * s}px ${FONT.serif}`;
        ctx.fillStyle = on ? '#FFE7C2' : 'rgba(255,240,224,0.55)';
        const y = H * 0.52 + i * 48 * s;
        ctx.fillText(it, W / 2, y);
        const w = ctx.measureText(it).width;
        rects.push({ x: W / 2 - w / 2 - 12 * s, y: y - 32 * s, w: w + 24 * s, h: 44 * s });
      });
      ctx.font = `500 ${15 * s}px ${FONT.sans}`;
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.fillText('Oyundan çıkarsan kaldığın yerden devam edersin.', W / 2, H * 0.52 + 120 * s);
      ctx.restore();
    },
  };
}

function close() { open = false; audio.setBus('music', 0.85, 0.4); }
