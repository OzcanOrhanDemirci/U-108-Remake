export default async function ({ page, advance, shot, out }) {
  const o = (n) => out.replace(/\.png$/, `_${n}.png`);
  const go = async (x, y, skip) => { await page.evaluate(([x, y, skip]) => { const s = window.__stage; window.__G.runner.clear(); s.talk.clear(); s.controls = true; s.player.place(x, y); s.triggers.forEach(t => { if (t.x < skip) t.fired = true; }); s.cam.tx = x; s.cam.ty = y - 2; s.cam.snap(); }, [x, y, skip]); };
  await advance(3); await shot(o('a_giris'));
  await go(8, 0, 9); await advance(1.5); await shot(o('b_siluet'));
  await go(22, 0, 23); await advance(1.5); await shot(o('c_kontrol'));
  await page.keyboard.press('KeyE'); await advance(0.8);
  await page.keyboard.press('ArrowRight'); await advance(0.2); await page.keyboard.press('ArrowRight'); await advance(0.2); await page.keyboard.press('ArrowRight'); await advance(0.2); await page.keyboard.press('ArrowRight'); await advance(0.3);
  await shot(o('d_duzenle'));
  await page.keyboard.press('Enter'); await advance(2);
  await go(42, -3.4, 43); await advance(1.5); await shot(o('e_diken'));
  await go(60, 0, 61); await advance(1.5); await shot(o('f_klavye'));
  await go(73, 0, 74); await advance(1.5); await shot(o('g_cumle'));
  await go(82, 0, 83); await advance(1.5); await shot(o('h_kapat'));
}
