export default async function ({ page, advance, shot, out }) {
  const o = (n) => out.replace(/\.png$/, `_${n}.png`);
  for (const [i, t] of [[0, 9], [1, 7], [2, 7], [3, 7], [4, 6], [5, 6], [6, 6], [7, 6]].entries()) { await advance(t[1]); await shot(o(String(i))); }
  const m = await page.evaluate(() => JSON.parse(localStorage.getItem('u108.hafiza') || '{}'));
  console.log('oyunSurumu=' + m.oyunSurumu + ' son not: ' + (m.notlar || []).slice(-2).map(n => n.m).join(' | '));
}
