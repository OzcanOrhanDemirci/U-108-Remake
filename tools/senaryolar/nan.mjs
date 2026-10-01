export default async function ({ page }) {
  await page.evaluate(() => { const s = window.__stage; window.__G.runner.clear(); s.talk.clear(); s.player.place(45, s.world.groundAt(45, -50)); });
  const res = await page.evaluate(() => {
    const G = window.__G, s = window.__stage; G.paused = true;
    for (let i = 0; i < 600; i++) {
      try { G.step(1 / 60); } catch (e) {
        const bad = s.midTrees.find(t => !isFinite(t.x) || !isFinite(t.h) || !isFinite(t.r) || t.blobs.some(b => !isFinite(b.dx)));
        return { frame: i, err: String(e), cam: [s.cam.x, s.cam.y, s.cam.viewH], t: s.t, bad: bad ? JSON.stringify(bad).slice(0, 300) : null, far: s.farTrees.length, mid: s.midTrees.length };
      }
    }
    return 'ok';
  });
  console.log(JSON.stringify(res));
}
