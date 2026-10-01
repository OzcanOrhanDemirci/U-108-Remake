// 1.0.1 taş revizyonu: gösterim kareleri + insan benzeri geçiş denemeleri (farklı zıplama anlarıyla)
export default async function ({ page, advance, shot, out }) {
  const o = (n) => out.replace(/\.png$/, `_${n}.png`);
  await page.evaluate(() => { const s = window.__stage; window.__G.runner.clear(); s.talk.clear(); s.player.place(52, s.world.groundAt(52, -50)); s.triggers.forEach(t => { if (t.x < 53) t.fired = true; }); s.cam.tx = 52; s.cam.ty = s.player.y - 2; s.cam.snap(); });
  // geçiş denemeleri: dikenden önce farklı mesafelerden zıpla, ölümleri say
  const sonuc = await page.evaluate(() => {
    const G = window.__G, s = window.__stage, inp = window.__input; G.paused = true;
    const out = [];
    for (const erken of [0.1, 0.25, 0.4, 0.55, 0.7, 0.85, 1.0, 1.15]) {
      window.__G.runner.clear(); s.talk.clear(); s.controls = true; s.dying = false; s.player.ctl.frozen = false; inp.synth('Space', false);
      s.player.place(55.5, s.world.groundAt(55.5, -50)); s.setCheckpoint(55.5); s.player.ctl.body.vx = 0; for (let k = 0; k < 20; k++) G.step(1 / 60);
      let olum = 0, wasDying = false, t = 0, hold = 0; const yer = [];
      while (t < 14 && s.player.x < 69.5) {
        const pl = s.player, b = pl.ctl.body;
        inp.synth('ArrowRight', true);
        const hz = s.world.colliders.find(c => c.hazard && c.enabled && c.x0 - pl.x > 0 && c.x0 - pl.x < erken + 0.3 && Math.abs(c.y0 - pl.y) < 1.2);
        if (b.grounded && hz) { inp.synth('Space', false); inp.synth('Space', true); hold = 0.35; }
        else if (hold > 0) { hold -= 1 / 60; inp.synth('Space', true); } else inp.synth('Space', false);
        G.step(1 / 60); t += 1 / 60;
        if (s.dying && !wasDying) { olum++; if (olum <= 3) yer.push(s.player.x.toFixed(2) + '/' + s.player.y.toFixed(2)); }
        wasDying = s.dying;
      }
      out.push(`zıplama mesafesi ~${erken}: ${s.player.x >= 69.5 ? 'GEÇTİ' : 'geçemedi'} (${olum} ölüm, ${t.toFixed(1)} sn) ölüm yerleri: ${yer.join(' ')}`);
    }
    return out;
  });
  console.log(sonuc.join('\n'));
}
