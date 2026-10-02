// Duman testi: her sahne açılıyor, birkaç saniye oynuyor, hata vermiyor ve ekrana bir şey çiziyor mu.
// Sahne başına bir kare kaydeder (CI'da eser olarak saklanır). Herhangi bir sayfa hatası, konsol hatası,
// yanlış sahne ya da boş çizim çıkış kodunu 1 yapar.
// Kullanım: node tools/shot.mjs --url "?sahne=menu2023&sifirla=1" --script tools/senaryolar/duman.mjs --out shots/duman/d.png [--w 960 --h 540]
// Not: ?x= ile çukur üstüne konan karakter NaN üretiyordu (orman 18/106, karanlık 50/70); burada x kullanılmaz.
const arg = (o) => '&arg=' + encodeURIComponent(JSON.stringify(o));
const SAHNELER = [
  { ad: 'menu2023', q: 'sahne=menu2023&sifirla=1' },
  { ad: 'diyalog2023', q: 'sahne=diyalog2023&sifirla=1' + arg({ level: 'level1', next: 'menu2023' }) },
  { ad: 'bolum2023', q: 'sahne=bolum2023&sifirla=1' + arg({ bolum: 1, next: 'menu2023' }) },
  { ad: 'kirilma', q: 'sahne=kirilma&sifirla=1' },
  { ad: 'orman', q: 'sahne=orman&sifirla=1' + arg({ intro: true }) },
  { ad: 'karanlik', q: 'sahne=karanlik&sifirla=1' },
  { ad: 'sonbahar', q: 'sahne=sonbahar&sifirla=1' },
  { ad: 'laboratuvar', q: 'sahne=laboratuvar&sifirla=1' },
  { ad: 'gunbatimi', q: 'sahne=gunbatimi&sifirla=1' },
  { ad: 'ziyaret', q: 'sahne=ziyaret&sifirla=1&bitmis=1' },
];
// Boş çizim: karede tek bir renk varsa. Kare tarayıcıda çözülür ve 96 x 54'lük bir ızgaradan örneklenir;
// 2023 diyaloğu gibi bilerek kapkara sahnelerde bile yazı ve düğme birkaç renk getirir.
const EN_AZ_RENK = 3;
const renkSay = (page, png) => page.evaluate(async (b64) => {
  const bmp = await createImageBitmap(await (await fetch('data:image/png;base64,' + b64)).blob());
  const c = new OffscreenCanvas(96, 54); const x = c.getContext('2d');
  x.drawImage(bmp, 0, 0, 96, 54);
  const d = x.getImageData(0, 0, 96, 54).data; const r = new Set();
  for (let i = 0; i < d.length; i += 4) r.add((d[i] >> 3) << 10 | (d[i + 1] >> 3) << 5 | (d[i + 2] >> 3));
  return r.size;
}, png.toString('base64'));

export default async function ({ page, advance, out }, args) {
  const o = (n) => out.replace(/\.png$/, `_${n}.png`);
  const kok = page.url().split('?')[0];
  const sure = +(args.sn ?? 6);
  let hatalar = [];
  page.on('pageerror', (e) => hatalar.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') hatalar.push(`console: ${m.text()}`); });
  let kalan = 0;
  for (const s of SAHNELER) {
    hatalar = [];
    const sorunlar = [];
    try {
      await page.goto(`${kok}?${s.q}&sabit=1`);
      await page.waitForFunction(() => window.__hazir === true, null, { timeout: 60000 });
      await advance(sure);
      const ad = await page.evaluate(() => window.__G.scene?.name);
      if (ad !== s.ad) sorunlar.push(`sahne adı ${ad}, beklenen ${s.ad}`);
      const png = await page.screenshot({ path: o(s.ad) });
      const renk = await renkSay(page, png);
      if (renk < EN_AZ_RENK) sorunlar.push(`kare boş görünüyor (${renk} renk)`);
      console.log(`  ${s.ad.padEnd(12)} ${String(renk).padStart(5)} renk`);
    } catch (e) {
      sorunlar.push(String(e.message).split(String.fromCharCode(10))[0]);
    }
    sorunlar.push(...hatalar);
    if (sorunlar.length) { kalan++; console.error(`  ${s.ad}: ` + sorunlar.join(' | ')); }
  }
  if (kalan) { console.error(`DUMAN: ${kalan} sahnede sorun`); process.exitCode = 1; }
  else console.log(`DUMAN: ${SAHNELER.length} sahnenin hepsi açıldı, ${sure} sn oynadı, hata yok`);
}
