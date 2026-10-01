// README: 2026 karakterinin yakın planı. Duruş, aynı kadrajın karaktersiz hâli (2023 sprite'ı ve eskizi bunun üstüne konur)
// ve kamera takipli kısa bir koşu dizisi (GIF için).
// node tools/shot.mjs --url "?sahne=orman&x=40&sessiz=1" --script tools/senaryolar/yakin.mjs --out shots/yakin/k.png
export default async function ({ page, advance, shot, out }) {
  const o = (n) => out.replace(/\.png$/, `_${n}.png`);
  // kamerayı verilen noktaya (yoksa karaktere) kilitle
  const kadraj = (viewH, at) => page.evaluate(([viewH, at]) => {
    const s = window.__G.scene; window.__G.runner.clear(); s.talk.clear();
    const [x, y] = at ?? [s.player.x, s.player.y];
    s.cam.follow = false; s.cam.tViewH = viewH; s.cam.tx = x; s.cam.ty = y - viewH * 0.4; s.cam.snap();
  }, [viewH, at]);
  await advance(2);
  const P = await page.evaluate(() => { const s = window.__G.scene; return [s.player.x, s.player.y]; });
  await kadraj(2.4, P); await advance(0.6); await kadraj(2.4, P); await advance(0.05);
  await shot(o('durus'));
  // aynı kadraj, karakter geride (sola) alınmış: önündeki tetikleyiciler ateşlenmesin
  await page.evaluate(() => { const s = window.__G.scene; const x = s.player.x - 25; s.player.place(x, s.world.groundAt(x, -100)); });
  await kadraj(2.4, P); await advance(0.05); await kadraj(2.4, P); await advance(0.01);
  await shot(o('bos'));
  await page.evaluate(([x, y]) => { window.__G.scene.player.place(x, y); }, P);
  // koşu: 1/24 sn aralıkla, kamera takipli
  await kadraj(3.2); await advance(0.3);
  await page.keyboard.down('KeyD');
  await advance(0.5);
  for (let i = 0; i < 36; i++) { await advance(1 / 24); await kadraj(3.2); await advance(0.001); await shot(o('kosu' + String(i).padStart(2, '0'))); }
  await page.keyboard.up('KeyD');
}
