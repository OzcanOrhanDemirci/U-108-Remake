// README vitrini: her sahneden konuşmasız, temiz kareler. Tek tarayıcıda sırayla sahne açar.
// node tools/shot.mjs --url "?sahne=menu2023&sifirla=1" --script tools/senaryolar/vitrin.mjs --out shots/vitrin/v.png [--secim orman]
const LISTE = [
  { ad: 'menu2023', url: 'sahne=menu2023&sifirla=1', t: 2.5 },
  { ad: 'bolum2023', url: 'sahne=bolum2023&sifirla=1&arg=' + encodeURIComponent(JSON.stringify({ bolum: 1, next: 'menu2023' })), t: 3, yuru: 1.2 },
  ...[28, 40, 50, 62, 75, 84].map(x => ({ ad: `orman_${x}`, url: `sahne=orman&x=${x}&sessiz=1`, t: 2.5, yuru: 0.8 })),
  ...[10, 30, 50, 70].map(x => ({ ad: `karanlik_${x}`, url: `sahne=karanlik&x=${x}&sessiz=1`, t: 2.5, yuru: 0.8 })),
  ...[10, 30, 50, 70, 90].map(x => ({ ad: `sonbahar_${x}`, url: `sahne=sonbahar&x=${x}&sessiz=1`, t: 2.5, yuru: 0.8 })),
  ...[8, 24, 40, 56, 72].map(x => ({ ad: `lab_${x}`, url: `sahne=laboratuvar&x=${x}&sessiz=1`, t: 2.5, yuru: 0.8 })),
  ...[4, 14, 24, 34].map(x => ({ ad: `gunbatimi_${x}`, url: `sahne=gunbatimi&x=${x}&sessiz=1`, t: 2.5, yuru: 0.8 })),
  { ad: 'ziyaret', url: 'sahne=ziyaret&bitmis=1&sifirla=1', t: 22 },
];

export default async function ({ page, advance, shot, out }, args) {
  const o = (n) => out.replace(/\.png$/, `_${n}.png`);
  const kok = page.url().split('?')[0];
  const liste = args.secim ? LISTE.filter(l => l.ad.startsWith(args.secim)) : LISTE;
  for (const l of liste) try {
    await page.goto(`${kok}?${l.url}&sabit=1`);
    await page.waitForFunction(() => window.__hazir === true, null, { timeout: 60000 });
    await advance(l.t);
    if (l.yuru) { await page.keyboard.down('KeyD'); await advance(l.yuru); }
    await page.evaluate(() => { const s = window.__G.scene; window.__G.runner.clear(); s?.talk?.clear?.(); });
    await advance(0.05);
    await shot(o(l.ad));
    if (l.yuru) await page.keyboard.up('KeyD');
  } catch (e) { console.log('ATLANDI', l.ad, String(e.message).split(String.fromCharCode(10))[0]); await page.keyboard.up('KeyD'); }
}
