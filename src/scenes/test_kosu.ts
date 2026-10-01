// Geliştirme: koşu ve yürüme karelerini büyük ölçekte yan yana çizer (baş-boyun bağlantısı denetimi).
import { G, Scene } from '../game';
import { drawCharacter, Animator } from '../world/character';

export function testKosu(): Scene {
  const anims = Array.from({ length: 6 }, () => new Animator());
  let t = 0;
  return {
    name: 'test-kosu',
    enter() { G.P.enabled = false; },
    update(dt) {
      t += dt;
      anims.forEach((a, i) => a.update(dt, { state: i < 3 ? 'run' : 'walk', speed: i < 3 ? 4.3 : 2, vy: 0, dist: (i < 3 ? 4.3 : 2) * t + i * 0.37 }));
    },
    draw(ctx, W, H) {
      ctx.fillStyle = '#e9e4dc'; ctx.fillRect(0, 0, W, H);
      const hpx = H * 0.8;
      anims.forEach((a, i) => {
        ctx.save(); ctx.translate(W * (0.09 + i * 0.165), H * 0.93); ctx.scale(hpx, hpx);
        drawCharacter(ctx, { facing: 1, turn: 1, headTurn: 1, pose: a.pose, face: a.face });
        ctx.restore();
      });
    },
  };
}
