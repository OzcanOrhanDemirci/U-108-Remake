// Dikenli bölümde botun nerede öldüğünü izler
export default async function ({ page }) {
  await page.evaluate(() => { const s = window.__stage; window.__G.runner.clear(); s.talk.clear(); s.player.place(59.3, s.world.groundAt(59.3, -50)); s.setCheckpoint(59.3); s.triggers.forEach(t => t.fired = true); });
  const trace = await page.evaluate(() => {
    const G = window.__G, s = window.__stage, inp = window.__input; G.paused = true;
    const out = []; let lastDying = false;
    for (let f = 0; f < 60 * 12; f++) {
      inp.synth('ArrowRight', true);
      const pl = s.player, b = pl.ctl.body, w = s.world;
      const hz = w.colliders.some(c => c.hazard && c.enabled && c.x0 - pl.x > 0.05 && c.x0 - pl.x < 0.7 && Math.abs(c.y0 - pl.y) < 1.2);
      const g1 = w.groundAt(pl.x + 0.5, pl.y - 3);
      const hi = false;
      if (pl.x > 59 && pl.x < 63 && f < 200) out.push(`f${f} x=${pl.x.toFixed(2)} y=${pl.y.toFixed(2)} g=${b.grounded} hz=${hz} vy=${b.vy.toFixed(2)} vx=${b.vx.toFixed(2)} d=${s.dying}`);
      if (b.grounded && (hz || hi)) { inp.synth('Space', true); out.push(`zıpla x=${pl.x.toFixed(2)} y=${pl.y.toFixed(2)} ${hz ? 'diken' : 'yüksek'}`); }
      else if (!b.grounded && b.vy < 0) inp.synth('Space', true); else inp.synth('Space', false);
      G.step(1 / 60);
      inp.synth('Space', false);
      if (s.dying && !lastDying) out.push(`ÖLDÜ x=${pl.x.toFixed(2)} y=${pl.y.toFixed(2)}`);
      lastDying = s.dying;
      if (pl.x > 70) { out.push('geçti'); break; }
    }
    out.push('hazards: ' + s.world.colliders.filter(c => c.hazard).map(c => `${c.x0.toFixed(1)}-${c.x1.toFixed(1)}@${c.y0.toFixed(2)}`).join(' '));
    return out;
  });
  console.log(trace.slice(0, 40).join('\n'));
}
