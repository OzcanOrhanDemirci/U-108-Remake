export default async function ({ page }) {
  for (const [s, x] of [['gunbatimi', 30], ['sonbahar', 52], ['karanlik', 0]]) {
    const r = await page.evaluate(async ([s, x]) => {
      const G = window.__G; G.paused = true;
      G.go(s);
      const st = window.__stage;
      window.__G.runner.clear(); st.talk.clear(); st.player.place(x, st.world.groundAt(x, -50)); st.cam.tx = x; st.cam.ty = st.player.y - 2; st.cam.snap(); st.fade = 0; st.fadeT = 0;
      for (let i = 0; i < 60; i++) G.step(1 / 60);
      const gl = G.post.gl;
      const px = new Uint8Array(4);
      const t = [], tu = [], td = [];
      for (let i = 0; i < 600; i++) {
        const t0 = performance.now();
        G.dt = 1 / 60; G.time += 1 / 60;
        G.runner.update(1 / 60); G.scene.update(1 / 60); window.__input.endFrame();
        const t1 = performance.now();
        const ctx = G.ctx; ctx.setTransform(1, 0, 0, 1, 0, 0); G.scene.draw(ctx, G.W, G.H);
        G.post.render(G.canvas, G.P, 1 / 60);
        gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); // gerçek senkron
        const t2 = performance.now();
        t.push(t2 - t0); tu.push(t1 - t0); td.push(t2 - t1);
      }
      const st2 = (a) => { const b = [...a].sort((x, y) => x - y); return { p50: b[300].toFixed(1), p95: b[570].toFixed(1), p99: b[594].toFixed(1), max: b[599].toFixed(1) }; };
      const spikes = t.map((v, i) => [i, v]).filter(([i, v]) => v > 12).map(([i, v]) => i).slice(0, 20);
      return { toplam: st2(t), guncelle: st2(tu), ciz: st2(td), sicrama_kareleri: spikes.join(',') };
    }, [s, x]);
    console.log(s, JSON.stringify(r));
  }
}
