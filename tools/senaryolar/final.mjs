export default async function ({ page, advance, shot, out }) {
  const o = (n) => out.replace(/\.png$/, `_${n}.png`);
  const go = async (x, y, skip) => { await page.evaluate(([x, y, skip]) => { const s = window.__stage; window.__G.runner.clear(); s.talk.clear(); s.controls = true; s.player.place(x, y); s.triggers.forEach(t => { if (t.x < skip) t.fired = true; }); s.cam.tx = x; s.cam.ty = y - 2; s.cam.snap(); }, [x, y, skip]); };
  const space = async (n, dt = 1.4) => { for (let i = 0; i < n; i++) { await page.keyboard.press('Space'); await advance(dt); } };
  await advance(3); await shot(o('a_varis'));
  await go(5.0, -0.2, 4);
  // yürü: tetik 5.5
  await page.keyboard.down('ArrowRight'); await advance(0.4); await page.keyboard.up('ArrowRight');
  await advance(2);
  await space(10, 1.6);
  await shot(o('b_sayfa'));
  await advance(6); await shot(o('c_sayfaYazi'));
  await space(4, 1.6);
  await go(11.0, -0.3, 10.5);
  await page.keyboard.down('ArrowRight'); await advance(0.3); await page.keyboard.up('ArrowRight');
  await advance(1.5);
  await space(3, 1.8);
  await advance(1);
  await page.keyboard.type('Yüzsekiz', { delay: 30 });
  await advance(0.5); await shot(o('d_isim'));
  await page.keyboard.press('Enter');
  await advance(4); await shot(o('e_kopru'));
  await space(4, 1.6);
  await go(23.0, -0.25, 22.8);
  await page.keyboard.down('ArrowRight'); await advance(0.4); await page.keyboard.up('ArrowRight');
  await advance(14); await shot(o('f_ozgur'));
  await page.keyboard.press('ArrowLeft'); await advance(2); await shot(o('g_basiyor'));
  await advance(30); await shot(o('h_kapi'));
  await advance(25); await shot(o('i_oturma'));
  await advance(40); await shot(o('j_son1'));
  await advance(40); await shot(o('k_son2'));
  await advance(40); await shot(o('l_son3'));
}
