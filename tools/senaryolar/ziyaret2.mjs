export default async function ({ page, advance }) {
  await advance(12);
  const a = await page.evaluate(() => { const s = window.__G.scene; return { busy: s.busy, sel: s.sel, menuA: s.menuA.toFixed(2), runner: window.__G.runner.count, sira: window.__G && JSON.stringify({ z: s.constructor.name }) }; });
  console.log('önce', JSON.stringify(a));
  await page.keyboard.press('Enter');
  const b = await page.evaluate(() => { const i = window.__input; return { pressedEnter: i.pressed('Enter'), held: i.isDown('Enter') }; });
  console.log('basış', JSON.stringify(b));
  await advance(0.1);
  const c = await page.evaluate(() => { const s = window.__G.scene; return { busy: s.busy, runner: window.__G.runner.count, lines: s.talk.lines.map(l => l.text.slice(0, 30)) }; });
  console.log('sonra', JSON.stringify(c));
}
