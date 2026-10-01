// köprü yazılırken ve sonra kareler
export default async function ({ page, advance, shot, out }) {
  const o = (n) => out.replace(/\.png$/, `_${n}.png`);
  await advance(2); await shot(o('a'));
  await advance(16); await shot(o('b_kopru'));
  // köprünün ortasına yürüt
  await page.evaluate(() => { const s = window.__stage; s.player.place(18, -0.1); });
  await advance(1.2); await shot(o('c_kopruUstu'));
  await page.evaluate(() => { const s = window.__stage; s.player.place(29, -0.3); s.triggers.forEach(t => { if (t.x < 28) t.fired = true; }); });
  await advance(4); await shot(o('d_merdiven'));
  await page.evaluate(() => { const s = window.__stage; s.player.place(51, -5.2); s.triggers.forEach(t => { if (t.x < 50.5) t.fired = true; }); });
  await advance(3.5); await shot(o('e_hayalet'));
  await page.evaluate(() => { const s = window.__stage; s.player.place(91, -5.2); s.triggers.forEach(t => { if (t.x < 88.5) t.fired = true; }); });
  await advance(3); await shot(o('f_kemer'));
}
