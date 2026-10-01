// 2023 müze akışı: menü → ... → jenerik → ziyaret (bölümler ışınlanarak geçilir)
export default async function ({ page, advance, shot, out }) {
  const o = (n) => out.replace(/\.png$/, `_${n}.png`);
  const log = [];
  let last = '';
  for (let i = 0; i < 400; i++) {
    const name = await page.evaluate(() => window.__G.scene?.name);
    if (name !== last) { log.push(name); last = name; await shot(o(String(log.length).padStart(2, '0') + '_' + name)); }
    if (name === 'ziyaret') break;
    if (name === 'menu2023') await page.keyboard.press('Enter');
    if (name === 'diyalog2023') {
      await page.evaluate(() => { const G = window.__G, i = window.__input, sc = G.H / 1080, ox = (G.W - 1920 * sc) / 2; i.mouse.x = ox + 1799 * sc; i.mouse.y = 994 * sc; i.mouse.down = true; i.mouse.clicked = true; });
      await advance(0.05);
      await page.evaluate(() => { window.__input.mouse.down = false; });
    }
    if (name === 'bolum2023') { await advance(0.5); await page.evaluate(() => window.__bolum2023Isinla && window.__bolum2023Isinla()); }
    await advance(0.5);
  }
  console.log('akış:', log.join(' → '));
}
