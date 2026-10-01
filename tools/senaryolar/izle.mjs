// botu çalıştırır ama her saniye ayrıntılı durum yazar
import bot from './bot.mjs';
export default async function (ctx, args) {
  const { page } = ctx;
  await bot({ ...ctx, page: { ...page, evaluate: page.evaluate.bind(page) }, shot: async () => {} }, { dakika: 0 });
  for (let i = 0; i < +(args.sn ?? 40); i++) {
    const r = await page.evaluate(() => {
      const G = window.__G; G.paused = true;
      for (let k = 0; k < 60; k++) { window.__bot.step(1 / 60); G.step(1 / 60); }
      const s = G.scene;
      return `${window.__bot.t.toFixed(0)}s x=${s.player.x.toFixed(2)} y=${s.player.y.toFixed(2)} ctl=${s.controls} tr=[${s.triggers.filter(t => t.fired).map(t => t.x).join(',')}] words=${s.words?.list.length} runner=${G.runner.count} talk=${s.talk.lines.map(l => l.state[0] + (l.dim ? 'd' : '')).join('')}`;
    });
    console.log(r);
  }
}
