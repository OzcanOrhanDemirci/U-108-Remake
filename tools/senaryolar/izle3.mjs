import bot from './bot.mjs';
export default async function (ctx, args) {
  const { page } = ctx;
  await bot({ ...ctx, shot: async () => {} }, { dakika: 0 });
  for (let i = 0; i < +(args.sn ?? 60); i++) {
    const r = await page.evaluate(() => {
      const G = window.__G; G.paused = true;
      for (let k = 0; k < 60; k++) { window.__bot.step(1 / 60); G.step(1 / 60); }
      const s = G.scene;
      return `${window.__bot.t.toFixed(0)}s x=${s.player.x.toFixed(2)} y=${s.player.y.toFixed(2)} ctl=${s.controls} edit=${s.editing} jump=${s.player.ctl.jumpMul.toFixed(2)} spikes=${s.spikesOff} tr=[${s.triggers.filter(t => t.fired).map(t => t.x).join(',')}] talk=${s.talk.lines.map(l => l.state[0] + (l.dim ? 'd' : '')).join('')} input=${s.sentence?.active}`;
    });
    console.log(r);
  }
}
