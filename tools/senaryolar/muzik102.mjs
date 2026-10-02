// 1.0.2: ziyaretten "Baştan başla" / "2023'ü oyna" seçilince müzik veriyolunda TEK kayıt kalmalı.
// Kırmızı denetim: piyanonun tutamağı silinirse (1.0.1 davranışı) aynı ölçüm 2 kayıt görmeli.
// Kullanım: node tools/shot.mjs --url "?sahne=ziyaret&bitmis=1&sifirla=1" --script tools/senaryolar/muzik102.mjs --out shots/muzik102/a.png --secim bastan|2023 [--eski 1]
export default async function ({ page, advance, shot, out }, args) {
  const o = (n) => out.replace(/\.png$/, `_${n}.png`);
  const calan = () => page.evaluate(() => [...window.__audio.calanMuzik.values()]);
  const sahne = () => page.evaluate(() => window.__G.scene?.name);
  const gercek = (ms) => new Promise(r => setTimeout(r, ms));
  // karşılama bitsin, menü açılsın
  for (let i = 0; i < 200 && await page.evaluate(() => window.__G.scene.busy); i++) await advance(0.5);
  await gercek(1500);
  console.log('ziyaret, menü açık:', JSON.stringify(await calan()));
  await shot(o('0_ziyaret'));
  const secim = args.secim || 'bastan';
  if (args.eski) await page.evaluate(() => { window.__G.scene.muzik = null; }); // 1.0.1: tutamak yok, piyano durdurulamaz
  await page.evaluate((id) => window.__G.scene.choose(id), secim);
  // seçim konuşması ve müzik kapatma: kareleri al
  for (let i = 1; i <= 4; i++) { await advance(1.6); await shot(o(String(i) + '_secim')); }
  for (let i = 0; i < 60 && await sahne() === 'ziyaret'; i++) await advance(0.5);
  console.log('geçiş:', await sahne());
  if (await sahne() === 'menu2023') { await advance(1); await page.keyboard.press('Enter'); await advance(1.5); }
  for (let i = 0; i < 20 && await sahne() !== 'diyalog2023'; i++) await advance(0.5);
  await advance(2);
  await gercek(3500); // sönüşler gerçek zamanda biter
  const son = await calan();
  console.log('sahne:', await sahne(), ' çalan:', JSON.stringify(son));
  await shot(o('5_2023'));
  const tek = son.length === 1 && son[0] === 'piyano2023';
  console.log(tek ? 'SONUÇ: TEK PİYANO (geçti)' : 'SONUÇ: KARIŞIK (' + son.length + ' kayıt)');
  if (!tek) process.exitCode = 1; // CI bu testle kırmızıya dönebilsin
}
