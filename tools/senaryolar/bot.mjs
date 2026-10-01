// Uçtan uca bot: oyunu kırılmadan finale kadar kendi kendine oynar. Takılma, ölüm, sahne geçişlerini raporlar.
// Kullanım: node tools/shot.mjs --url "?sahne=kirilma&sifirla=1" --script tools/senaryolar/bot.mjs --out shots/bot/b.png
export default async function ({ page, shot, out }, args) {
  const o = (n) => out.replace(/\.png$/, `_${n}.png`);
  await page.evaluate(() => {
    const inp = window.__input;
    window.__bot = {
      t: 0, target: null, jumping: false, stillT: 0, stuckT: 0, backT: 0, lastX: 0, typedAt: -1, pressT: 0, editStep: 0, log: [], deaths: 0, lastScene: '', sceneT: 0, waitGap: 0,
      tap(code) { inp.synth(code, true); this.pressed.push(code); },
      pressed: [],
      step(dt) {
        const G = window.__G, s = G.scene;
        for (const c of this.pressed) inp.synth(c, false);
        this.pressed = [];
        for (const c of ['ArrowRight', 'ArrowLeft']) inp.synth(c, false);
        this.t += dt; this.sceneT += dt; this.pressT -= dt;
        const name = s?.name ?? '';
        if (name !== this.lastScene) { this.log.push(`${this.t.toFixed(1)}s sahne → ${name}`); this.lastScene = name; this.sceneT = 0; this.teleported = false; }
        if (!s) return;
        // 2023: menüde Enter, diyalogda "Devam et" tıkla, bölümde kapıya ışınla (bitirilebilirlik plan2023 ile kanıtlı)
        if (name === 'menu2023') { if (this.pressT <= 0) { this.tap('Enter'); this.pressT = 1; } return; }
        if (name === 'diyalog2023') {
          const H = G.H, W = G.W, sc = H / 1080, ox = (W - 1920 * sc) / 2;
          inp.mouse.x = ox + 1799 * sc; inp.mouse.y = 994 * sc;
          if (this.pressT <= 0) { inp.mouse.down = true; inp.mouse.clicked = true; this.pressT = 2.0; this.mouseUpAt = this.t + 0.1; }
          if (this.mouseUpAt && this.t > this.mouseUpAt) { inp.mouse.down = false; this.mouseUpAt = 0; }
          return;
        }
        if (name === 'bolum2023') {
          if (this.sceneT > 2 && !this.teleported) { this.teleported = true; window.__bolum2023Isinla && window.__bolum2023Isinla(); }
          return;
        }
        // kırılma: konuşmayı geç
        if (name === 'kirilma') { if (this.pressT <= 0) { this.tap('Space'); this.pressT = 0.45; } return; }
        if (!s.player) return;
        // metin girişi
        const ti = s.name_?.active ? s.name_ : s.sentence?.active ? s.sentence : null;
        if (ti) {
          if (this.typedAt < 0 && !inp.textMode) return;
          if (this.typedAt < 0) { inp.textEl && (inp.textEl.value = s.name_?.active ? 'Yüzsekiz' : 'onu da bir gün sana anlatacağım.'); this.typedAt = this.t; }
          else if (this.t - this.typedAt > 0.6) { this.tap('Enter'); this.typedAt = -1; }
          return;
        }
        // onay bekleyen konuşma
        const waiting = s.talk.lines.some(l => l.state === 'bekliyor' && (l.o.block ?? s.talk.blockDefault) && !l.dim);
        if (waiting) { if (this.pressT <= 0) { this.tap('Space'); this.pressT = 0.35; } return; }
        // kod panelleri
        if (s.panels) {
          if (s.editing) {
            const p = s.panels.find(p => p.edit && p.near);
            if (this.pressT <= 0) {
              if (p && p.id === 'kontrol' && p.edit.value < 9) this.tap('ArrowRight');
              else if (p && p.id === 'diken' && p.edit.value === 0) this.tap('ArrowRight');
              else this.tap('Enter');
              this.pressT = 0.2;
            }
            return;
          }
          const p = s.panels.find(p => p.near && p.edit && !p.done);
          if (p && s.controls && this.pressT <= 0) { this.tap('KeyE'); this.pressT = 0.6; return; }
        }
        if (!s.controls || inp.locked || s.dying) return;
        const pl = s.player, b = pl.ctl.body, w = s.world;
        // önde büyük boşluk: köprüyü bekle
        const g1 = w.groundAt(pl.x + 0.5, pl.y - 3), g4 = w.groundAt(pl.x + 3.6, pl.y - 3);
        // aşağıda zemin var ve tehlikesizse boşluk sayılmaz (inilir)
        const safeFloor = (gy, x) => isFinite(gy) && gy < pl.y + 8 && !w.colliders.some(c => c.hazard && c.enabled && c.x0 < x + 0.5 && c.x1 > x - 0.5 && Math.abs(c.y0 - gy) < 1.0);
        const gapNear = !isFinite(g1) || (g1 > pl.y + 1.4 && !safeFloor(g1, pl.x + 0.5));
        const gapWide = gapNear && (!isFinite(g4) || (g4 > pl.y + 1.4 && !safeFloor(g4, pl.x + 3.6)));
        if (gapWide && b.grounded) { this.waitGap += dt; return; }
        inp.synth('ArrowRight', true);
        // insan gibi: dikene ya da boşluğa çok yaklaşınca zıpla; duvara takılınca zıpla
        const hazardAhead = w.colliders.some(c => c.hazard && c.enabled && c.x0 - pl.x > 0.05 && c.x0 - pl.x < 0.7 && Math.abs(c.y0 - pl.y) < 1.2);
        // üstte, önde basılabilir bir zemin (kelime basamağı, raf) varsa ona hedefli zıpla
        const up = w.colliders.filter(c => c.enabled && c.solid !== false && !c.hazard && c.y0 < pl.y - 0.55 && c.y0 > pl.y - 2.0 && c.x0 - pl.x < 0.55 && c.x1 > pl.x + 0.3)
          .sort((a, b2) => a.y0 - b2.y0);
        const higherAhead = up.length > 0;
        if (higherAhead && b.grounded) this.target = up[0];
        // uzun süre ilerleyemezsen bir süre geri yürü (insan da öyle yapar)
        if (this.backT > 0) { this.backT -= dt; inp.synth('ArrowRight', false); inp.synth('ArrowLeft', true); return; }
        if (this.stuckT > 3) { this.stuckT = 0; this.backT = 1.6; }
        if (Math.abs(b.x - this.lastX) < 0.004) { this.stillT += dt; this.stuckT += dt; } else { this.stillT = 0; this.stuckT = Math.max(0, this.stuckT - dt * 0.5); }
        this.lastX = b.x;
        if (b.grounded) this.jumping = false;
        if (b.grounded && (hazardAhead || gapNear || higherAhead || this.stillT > 0.2)) { this.tap('Space'); this.stillT = 0; this.jumping = true; }
        else if (this.jumping && !b.grounded && b.vy < 0) inp.synth('Space', true);   // tam zıplama
        else inp.synth('Space', false);
        // hedefin üstüne gelince sağa basmayı bırak: üstüne in (havada kontrol)
        if (!b.grounded && this.target && pl.y < this.target.y0 - 0.05 && pl.x > this.target.x0 + 0.45) { inp.synth('ArrowRight', false); if (b.vx > 0.5) inp.synth('ArrowLeft', true); }
        if (b.grounded && !this.jumping) this.target = null;
      },
    };
  });
  const sahneler = new Set();
  let son = '';
  const max = +(args.dakika ?? 25) * 60 * 60;
  for (let f = 0; f < max; f += 30) {
    const r = await page.evaluate(() => {
      const G = window.__G; G.paused = true;
      for (let i = 0; i < 30; i++) {
        window.__bot.step(1 / 60);
        G.step(1 / 60);
        if (window.__kapandi) return { kapandi: true };
      }
      const s = G.scene;
      return { sahne: s?.name, x: s?.player ? s.player.x.toFixed(1) : '-', olum: window.__G.scene?.player ? 0 : 0, t: window.__bot.t.toFixed(0) };
    });
    if (r.kapandi) { console.log('OYUN KENDİNİ KAPATTI (bot süresi ~' + (f / 60).toFixed(0) + ' sn)'); break; }
    if (r.sahne !== son) { son = r.sahne; sahneler.add(son); try { await shot(o(String(sahneler.size).padStart(2, '0') + '_' + son)); } catch { } }
    if (f % (60 * 60) === 0) console.log(`${r.t}s ${r.sahne} x=${r.x}`);
  }
  const log = await page.evaluate(() => ({ log: window.__bot.log, mem: JSON.parse(localStorage.getItem('u108.hafiza') || '{}'), mektup: localStorage.getItem('u108.mektup') }));
  console.log(log.log.join('\n'));
  console.log('hafıza: bitti=' + log.mem.bitti + ' ad=' + log.mem.ad + ' cumle=' + log.mem.cumle + ' olumler=' + log.mem.olumler + ' notlar=' + (log.mem.notlar || []).length);
  console.log('mektup:\n' + (log.mektup || '(yok)'));
}
