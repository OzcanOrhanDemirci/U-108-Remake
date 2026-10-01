export default async function ({ page, advance, shot, out }) {
  const o = (n) => out.replace(/\.png$/, `_${n}.png`);
  const go = async (x, y, skip) => { await page.evaluate(([x, y, skip]) => { const s = window.__stage; window.__G.runner.clear(); s.talk.clear(); s.player.place(x, y); s.triggers.forEach(t => { if (t.x < skip) t.fired = true; }); s.cam.tx = x; s.cam.ty = y - 2; s.cam.snap(); }, [x, y, skip]); };
  await go(9.5, -0.1, 9); await page.evaluate(() => { const s = window.__stage; window.__G.runner.start(s.bridge()); });
  await advance(14); await shot(o('a_kopru'));
  await go(18, -0.1, 25); await advance(1.5); await shot(o('b_ustu'));
  await go(29, -0.3, 26.5); await advance(5); await shot(o('c_merdiven'));
  await go(52, -5.2, 49.5); await advance(4); await shot(o('d_hayalet'));
}
