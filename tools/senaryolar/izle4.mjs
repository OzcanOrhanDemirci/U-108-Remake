import bot from './bot.mjs';
export default async function (ctx) {
  const { page } = ctx;
  await bot({ ...ctx, shot: async () => {} }, { dakika: 0 });
  await page.evaluate(() => { const G = window.__G; G.paused = true; for (let k = 0; k < 60 * 63; k++) { window.__bot.step(1 / 60); G.step(1 / 60); } });
  const out = await page.evaluate(() => {
    const G = window.__G, s = G.scene, inp = window.__input, o = [];
    for (let k = 0; k < 90; k++) {
      window.__bot.step(1 / 60);
      const before = `held=${inp.isDown('Enter')} pressed=${inp.pressed('Enter')}`;
      G.step(1 / 60);
      if (k % 6 === 0) o.push(`${k} active=${s.sentence.active} done=${s.sentence.done} val="${s.sentence.value}" textMode=${inp.textMode} el="${inp.textEl && inp.textEl.value}" typedAt=${window.__bot.typedAt.toFixed(2)} ${before}`);
    }
    return o;
  });
  console.log(out.join('\n'));
}
