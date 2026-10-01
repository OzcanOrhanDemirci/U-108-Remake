// Her sahnede kare süresini ölçer (CPU tarafı + GPU'ya yükleme dahil, gl.finish ile)
export default async function ({ page }) {
  const sahneler = [['orman', 45], ['orman', 62], ['karanlik', 0], ['sonbahar', 20], ['sonbahar', 52], ['laboratuvar', 22], ['laboratuvar', 60], ['gunbatimi', 30]];
  for (const [s, x] of sahneler) {
    const r = await page.evaluate(async ([s, x]) => {
      const G = window.__G; G.paused = true;
      G.go(s);
      const st = window.__stage;
      if (st && st.player) { window.__G.runner.clear(); st.talk.clear(); st.player.place(x, st.world.groundAt(x, -50)); st.cam.tx = x; st.cam.ty = st.player.y - 2; st.cam.snap(); st.fade = 0; st.fadeT = 0; }
      for (let i = 0; i < 30; i++) G.step(1 / 60);
      const gl = G.post.gl;
      const times = [];
      for (let i = 0; i < 120; i++) { const t0 = performance.now(); G.step(1 / 60); gl.finish(); times.push(performance.now() - t0); }
      times.sort((a, b) => a - b);
      return { ort: (times.reduce((a, b) => a + b) / times.length).toFixed(2), p95: times[Math.floor(times.length * 0.95)].toFixed(2), W: G.W, H: G.H };
    }, [s, x]);
    console.log(`${s}@${x}`.padEnd(16), JSON.stringify(r));
  }
}
