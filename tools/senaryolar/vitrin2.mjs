// README vitrini, ikinci tur: sahnelerin imza anları (başlık kartı, ışık konisi, 2023 kodu, tablo, uçurum), yazısız.
// node tools/shot.mjs --url "?sahne=menu2023&sifirla=1" --script tools/senaryolar/vitrin2.mjs --out shots/vitrin2/v.png [--secim lab]
export default async function ({ page, advance, shot, out }, args) {
  const o = (n) => out.replace(/\.png$/, `_${n}.png`);
  const kok = page.url().split('?')[0];
  const ac = async (q) => { await page.goto(`${kok}?${q}&sabit=1`); await page.waitForFunction(() => window.__hazir === true, null, { timeout: 60000 }); };
  const sustur = () => page.evaluate(() => { const s = window.__G.scene; window.__G.runner.clear(); s.talk.clear(); });
  const go = (x, y, skip) => page.evaluate(([x, y, skip]) => { const s = window.__stage; window.__G.runner.clear(); s.talk.clear(); s.controls = true; s.player.place(x, y); s.triggers.forEach(t => { if (t.x < skip) t.fired = true; }); s.cam.tx = x; s.cam.ty = y - 2; s.cam.snap(); }, [x, y, skip]);
  const is = (ad) => !args.secim || ad.startsWith(args.secim);

  if (is('baslik')) {
    await ac('sahne=orman&sifirla=1&arg=' + encodeURIComponent(JSON.stringify({ intro: true })));
    let t = 0;
    for (; t < 150; t += 0.5) { await advance(0.5); const T = await page.evaluate(() => { const T = window.__G.scene.title; return T ? [T.a, T.sub, window.__G.scene.name] : null; }); if (t % 10 === 0) console.log(t, JSON.stringify(T)); if (T && T[0] > 0.97 && T[1] > 0.6) break; }
    console.log('başlık anı', t);
    await sustur(); await advance(0.05); await shot(o('baslik'));
  }
  if (is('karanlik')) {
    await ac('sahne=karanlik&sifirla=1');
    await advance(16); await sustur(); await advance(0.05); await shot(o('karanlik'));
  }
  if (is('lab')) {
    await ac('sahne=laboratuvar&sifirla=1');
    await advance(3);
    await go(8, 0, 9); await advance(1.5); await sustur(); await advance(0.05); await shot(o('lab_siluet'));
    await go(22, 0, 23); await advance(1.5); await sustur(); await advance(0.05); await shot(o('lab_kod'));
  }
  if (is('sonbahar')) {
    await ac('sahne=sonbahar&sifirla=1');
    await advance(2);
    await go(9.5, -0.1, 9); await page.evaluate(() => { const s = window.__stage; window.__G.runner.start(s.bridge()); });
    await advance(14); await sustur(); await advance(0.05); await shot(o('sonbahar_kopru'));
    await go(52, -5.2, 49.5); await advance(4); await sustur(); await advance(0.05); await shot(o('sonbahar_tablo'));
  }
  if (is('ziyaret')) {
    await ac('sahne=ziyaret&bitmis=1&sifirla=1');
    await advance(22);
    await page.evaluate(() => { const s = window.__G.scene; s.busy = true; s.talk.clear(); });
    await advance(1.5); await shot(o('ziyaret'));
  }
}
