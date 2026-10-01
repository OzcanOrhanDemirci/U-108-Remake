import bot from './bot.mjs';
export default async function (ctx) {
  const { page } = ctx;
  await bot({ ...ctx, shot: async () => {} }, { dakika: 0 });
  // 34 sn'ye kadar hızlı ilerle
  await page.evaluate(() => { const G = window.__G; G.paused = true; for (let k = 0; k < 60 * 34.5; k++) { window.__bot.step(1 / 60); G.step(1 / 60); } });
  const out = await page.evaluate(() => {
    const G = window.__G, s = G.scene, o = [];
    for (let k = 0; k < 60 * 3; k++) {
      window.__bot.step(1 / 60); G.step(1 / 60);
      const b = s.player.ctl.body;
      if (k % 3 === 0) o.push(`${k} x=${b.x.toFixed(2)} y=${(b.y + b.hh).toFixed(2)} g=${b.grounded} gr=${b.ground ? (b.ground.oneWay ? 'yazi' : 'zemin') : '-'} vy=${b.vy.toFixed(2)} ctl=${s.controls} space=${window.__input.isDown('Space')} right=${window.__input.isDown('ArrowRight')}`);
    }
    o.push('kelimeler: ' + s.words.list.map(w => `${w.text}[${w.x.toFixed(1)}..${(w.x + w.w).toFixed(1)}]@${w.y} c=${!!w.c}`).join(' '));
    return o;
  });
  console.log(out.join('\n'));
}
