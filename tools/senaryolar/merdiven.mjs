export default async function ({ page, shot, out }) {
  await page.evaluate(() => { const s = window.__stage; window.__G.runner.clear(); s.talk.clear(); s.player.place(27.5, s.world.groundAt(27.5, -50)); s.triggers.forEach(t => { if (t.x < 27) t.fired = true; }); });
  for (let i = 0; i < 8; i++) {
    const r = await page.evaluate(() => {
      const G = window.__G, s = window.__stage; G.paused = true;
      for (let k = 0; k < 60; k++) { G.step(1 / 60); }
      return { x: s.player.x.toFixed(2), y: s.player.y.toFixed(2), words: s.words.list.map(w => `${w.text}@${w.x.toFixed(1)},${w.y.toFixed(2)} c=${!!w.c} shown=${w.shown}/${w.letters.length} dying=${w.dying.toFixed(2)}`) };
    });
    console.log(JSON.stringify(r));
  }
  await shot(out);
}
