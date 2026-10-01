// 1.0.2 sürüm farkındalığı: karakterin söylediği satırlar sırayla, araya müzik veriyolu sayımı; yankı gösterimi bitince tek piyano.
// node tools/shot.mjs --url "?sahne=ziyaret&bitmis=1&sifirla=1&eskisurum=1.0.1" --script tools/senaryolar/surum102.mjs --out shots/m102/s.png
export default async function ({ page, advance, shot, out }) {
  const o = (n) => out.replace(/\.png$/, `_${n}.png`);
  const gercek = (ms) => new Promise(r => setTimeout(r, ms));
  const seen = [];
  let n = 0;
  for (let i = 0; i < 400; i++) {
    const s = await page.evaluate(() => { const sc = window.__G.scene; return { busy: sc.busy, lines: sc.talk.lines.map(l => l.text), reach: +sc.player.anim.reach.toFixed(2), muzik: [...window.__audio.calanMuzik.values()] }; });
    for (const l of s.lines) if (!seen.includes(l)) {
      seen.push(l);
      console.log(`[${(i * 0.5).toFixed(1)} sn] ${l}   · müzik: ${JSON.stringify(s.muzik)}`);
      if (/Şöyle|Aynı şarkı|kendi müziğimi|Fena ekip|ilk muydum/.test(l)) { await gercek(400); await shot(o(String(++n).padStart(2, '0'))); }
    }
    if (!s.busy) break;
    await advance(0.5);
    if (s.reach > 0.9) await gercek(120); // yankının sönmesi gerçek zamanda
  }
  await gercek(3000);
  const m = await page.evaluate(() => ({ muzik: [...window.__audio.calanMuzik.values()], hafiza: JSON.parse(localStorage.getItem('u108.hafiza') || '{}') }));
  console.log('son müzik:', JSON.stringify(m.muzik), ' oyunSurumu=' + m.hafiza.oyunSurumu, ' son notlar:', (m.hafiza.notlar || []).slice(-3).map(x => x.m).join(' | '));
}
