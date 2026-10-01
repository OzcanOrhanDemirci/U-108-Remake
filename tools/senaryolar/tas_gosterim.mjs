export default async function ({ page, advance, shot, out }) {
  const o = (n) => out.replace(/\.png$/, `_${n}.png`);
  await page.evaluate(() => { const s = window.__stage; window.__G.runner.clear(); s.talk.clear(); s.player.place(52.5, s.world.groundAt(52.5, -50)); s.triggers.forEach(t => { if (t.x < 53) t.fired = true; }); s.cam.tx = 52.5; s.cam.ty = s.player.y - 2; s.cam.snap(); });
  await page.keyboard.down('ArrowRight'); await advance(0.5); await page.keyboard.up('ArrowRight');
  await advance(3.2); await shot(o('a_eski'));
  await advance(2.4); await shot(o('b_tarama'));
  await advance(1.4); await shot(o('c_duz'));
  await advance(5); await shot(o('d_konusma'));
  await advance(10); await shot(o('e_konusma'));
}
