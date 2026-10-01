export default async function ({ page, advance }) {
  for (const x of [45, 25, 80]) {
    const g = await page.evaluate((x) => { const s = window.__stage; window.__G.runner.clear(); s.talk.clear(); const gy = s.world.groundAt(x, -50); s.player.place(x, gy); return gy; }, x);
    console.log('yer', x, g);
    const r = [];
    for (let i = 0; i < 40; i++) {
      await page.evaluate(() => { window.__G.paused = true; window.__G.scene.update(1 / 60); });
      const v = await page.evaluate(() => { const b = window.__stage.player.ctl.body; return [b.x, b.y, b.grounded, b.vx, b.vy, window.__stage.cam.x, window.__stage.cam.y]; });
      if (i % 8 === 0 || !isFinite(v[0]) || !isFinite(v[5])) r.push(v.map(n => typeof n === 'number' ? n.toFixed(3) : n).join(' '));
      if (!isFinite(v[0]) || !isFinite(v[5])) break;
    }
    console.log('x0=' + x + ' →\n  ' + r.join('\n  '));
  }
}
