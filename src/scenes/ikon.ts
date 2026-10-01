// Uygulama simgesi üretimi için: kırmızı gök, beyaz güneş, karakterin başı.
import { Scene, G } from '../game';
import { drawCharacter, restFace, restPose } from '../world/character';
import { vGrad, sun } from '../render/art';

export function ikon(): Scene {
  return {
    name: 'ikon',
    enter() { G.P.enabled = false; },
    update() {},
    draw(ctx, W, H) {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
      const S = Math.min(W, H);
      const x0 = (W - S) / 2, y0 = (H - S) / 2;
      ctx.save();
      ctx.beginPath(); ctx.roundRect(x0, y0, S, S, S * 0.22); ctx.clip();
      ctx.fillStyle = vGrad(ctx, y0, y0 + S, [[0, '#C8141C'], [0.6, '#F84A1E'], [1, '#FF8A3C']]);
      ctx.fillRect(x0, y0, S, S);
      ctx.save(); ctx.translate(x0, y0); ctx.scale(S, S);
      sun(ctx, 0.5, 0.62, 0.36, '#FFF9FB', '#9A84E4', 'rgba(255,236,246,0)');
      ctx.restore();
      ctx.save(); ctx.translate(x0 + S * 0.5, y0 + S * 2.5); ctx.scale(S * 2.2, S * 2.2);
      drawCharacter(ctx, { facing: 1, turn: 0, headTurn: 0, pose: restPose(), face: { ...restFace(), smile: 0.4 } });
      ctx.restore();
      ctx.restore();
    },
  };
}
