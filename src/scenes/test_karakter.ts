// Geliştirme sahnesi: kukla ile 2023 çizimini yan yana gösterir.
import { G, Scene } from '../game';
import { IMG } from '../core/assets';
import { drawCharacter, restFace, restPose, Animator } from '../world/character';

export function testKarakter(): Scene {
  const anims = [new Animator(), new Animator(), new Animator(), new Animator(), new Animator()];
  let t = 0;
  return {
    name: 'test-karakter',
    enter() { G.P.enabled = false; },
    update(dt) {
      t += dt;
      anims[0].update(dt, { state: 'idle', speed: 0, vy: 0, dist: 0 });
      anims[1].update(dt, { state: 'walk', speed: 2, vy: 0, dist: t * 2 });
      anims[2].update(dt, { state: 'run', speed: 5, vy: 0, dist: t * 5 });
      anims[3].update(dt, { state: 'jump', speed: 0, vy: -5, dist: 0 });
      anims[4].update(dt, { state: 'sit', speed: 0, vy: 0, dist: 0 });
    },
    draw(ctx, W, H) {
      ctx.fillStyle = '#e9e4dc'; ctx.fillRect(0, 0, W, H);
      const hpx = H * 0.42;
      // 2023 orijinali (karşıdan) — tuvalde figür y 506..4286 (8000x4500), 1/5 ölçek
      const k = IMG.karakter;
      const figH = (4286 - 506) / 5, sc = hpx / figH;
      ctx.drawImage(k, 0, 0, k.width, k.height, W * 0.08 - (k.width / 2) * sc, H * 0.47 - (4286 / 5) * sc, k.width * sc, k.height * sc);
      // kukla karşıdan
      const draw = (x: number, y: number, turn: number, headTurn: number, a?: Animator, facing = 1) => {
        ctx.save(); ctx.translate(x, y); ctx.scale(hpx, hpx);
        drawCharacter(ctx, { facing, turn, headTurn, pose: a ? a.pose : restPose(), face: a ? a.face : restFace() });
        ctx.restore();
      };
      draw(W * 0.2, H * 0.47, 0, 0);
      // 2023 yürüme karesi
      const y1 = IMG.yurume1; const s2 = hpx / ((4067 - 329) / 5);
      ctx.drawImage(y1, W * 0.33 - (y1.width / 2) * s2, H * 0.47 - (4067 / 5) * s2, y1.width * s2, y1.height * s2);
      draw(W * 0.45, H * 0.47, 1, 1, anims[0]);
      draw(W * 0.57, H * 0.47, 1, 1, anims[1]);
      draw(W * 0.7, H * 0.47, 1, 1, anims[2]);
      draw(W * 0.82, H * 0.47, 1, 1, anims[3]);
      draw(W * 0.93, H * 0.47, 1, 0.3, anims[0], -1);
      // alt sıra: büyük baş yakın çekim
      ctx.save(); ctx.translate(W * 0.15, H * 1.55); ctx.scale(H * 1.2, H * 1.2);
      drawCharacter(ctx, { facing: 1, turn: 0, headTurn: 0, pose: restPose(), face: restFace() });
      ctx.restore();
      ctx.save(); ctx.translate(W * 0.42, H * 1.55); ctx.scale(H * 1.2, H * 1.2);
      drawCharacter(ctx, { facing: 1, turn: 1, headTurn: 1, pose: restPose(), face: anims[0].face });
      ctx.restore();
      ctx.save(); ctx.translate(W * 0.75, H * 0.98); ctx.scale(hpx, hpx);
      drawCharacter(ctx, { facing: 1, turn: 1, headTurn: 1, pose: anims[4].pose, face: anims[4].face });
      ctx.restore();
    },
  };
}
