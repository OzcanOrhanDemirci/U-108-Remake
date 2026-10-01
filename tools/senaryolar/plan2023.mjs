// 2023 bölümlerinin bu fizik taklidinde bitirilebilirliğini arama ile kanıtlar.
// Eylemler 0,1 sn (5 sabit adım): {sol, sağ, dur} x {zıpla, zıplama}. Durumlar 0,08 birimlik ızgarada tekilleştirilir.
export default async function ({ page }, args) {
  for (const bolum of [Number(args.bolum ?? 1)]) {
    const res = await page.evaluate((bolum) => {
      const { World, Controller2023, BOLUM1, BOLUM2, SIYAH_W, SIYAH_H } = window.__fizik;
      const L = bolum === 2 ? BOLUM2 : BOLUM1;
      const world = new World();
      for (const ob of L.objs) if (ob.k === 'P' || ob.k === 'D') world.obb(ob.x, -ob.y, SIYAH_W * Math.abs(ob.sx), SIYAH_H * Math.abs(ob.sy), -ob.r * Math.PI / 180, { platform: ob.k === 'P', hazard: ob.k === 'D' });
      for (const e of L.edges) for (let i = 0; i < e.pts.length - 1; i++) {
        const ax = e.x + e.pts[i][0], ay = -(e.y + e.pts[i][1]), bx = e.x + e.pts[i + 1][0], by = -(e.y + e.pts[i + 1][1]);
        const len = Math.hypot(bx - ax, by - ay); if (len < 0.01) continue;
        world.obb((ax + bx) / 2, (ay + by) / 2, len + 0.02, 0.04, Math.atan2(by - ay, bx - ax), { platform: e.k === 'P', hazard: e.k === 'D' });
      }
      const T = L.trigger;
      const trig = world.box(T.x - T.w / 2, -T.y - T.h / 2, T.w, T.h, { solid: false });
      world.gravity = 9.81;
      const mk = () => { const c = new Controller2023(); c.body.x = L.start.x + 0.0064; c.body.y = -L.start.y + 0.062; return c; };
      const snap = (c) => ({ x: c.body.x, y: c.body.y, vx: c.body.vx, vy: c.body.vy, yd: c.yerdemiyim, hy: c.hareketyonu, fx: c.flipX, z: c.zipladimmi, tc: [...c.body.touching].map(t => world.colliders.indexOf(t)) });
      const load = (c, s) => { c.body.x = s.x; c.body.y = s.y; c.body.vx = s.vx; c.body.vy = s.vy; c.yerdemiyim = s.yd; c.hareketyonu = s.hy; c.flipX = s.fx; c.zipladimmi = s.z; c.body.touching = new Set(s.tc.map(i => world.colliders[i])); };
      const key = (s) => `${Math.round(s.x / 0.08)},${Math.round(s.y / 0.08)},${s.yd ? 1 : 0},${s.hy},${Math.round(s.vy / 0.5)}`;
      const acts = [];
      for (const d of [-1, 0, 1]) for (const w of [false, true]) acts.push([d, w]);
      const c = mk();
      const start = snap(c);
      // en iyi önce: kapıya uzaklık + yol uzunluğu
      const tx = T.x, ty = -T.y;
      const hpush = (arr, it) => { arr.push(it); let i = arr.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (arr[p].f <= arr[i].f) break; [arr[p], arr[i]] = [arr[i], arr[p]]; i = p; } };
      const hpop = (arr) => { const top = arr[0]; const last = arr.pop(); if (arr.length) { arr[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < arr.length && arr[l].f < arr[m].f) m = l; if (r < arr.length && arr[r].f < arr[m].f) m = r; if (m === i) break; [arr[m], arr[i]] = [arr[i], arr[m]]; i = m; } } return top; };
      const fval = (s, len) => len * 0.05 + Math.hypot(s.x - tx, (s.y - ty) * 1.5);
      const q = []; hpush(q, { s: start, path: [], f: fval(start, 0) });
      const seen = new Set([key(start)]);
      let found = null, exp = 0; const reach = {}; let bestY = { y: 1e9, x: 0 };
      while (q.length && exp < 1500000) {
        const n = hpop(q); exp++;
        for (const [d, w] of acts) {
          load(c, n.s);
          let dead = false, win = false;
          for (let k = 0; k < 5; k++) {
            c.input(d < 0, d > 0, w);
            c.fixed(1 / 50, world);
            if (c.body.hitHazard) { dead = true; break; }
            if (c.body.touching.has(trig)) { win = true; break; }
          }
          if (dead) continue;
          const path = n.path.concat([[d, w]]);
          if (win) { found = path; break; }
          const s2 = snap(c);
          if (s2.y > 30) continue;
          for (const t of c.body.touching) { const i = world.colliders.indexOf(t); reach[i] = Math.min(reach[i] ?? 1e9, n.path.length + 1); }
          if (s2.y < bestY.y) bestY = { y: s2.y, x: s2.x };
          const k2 = key(s2);
          if (seen.has(k2)) continue;
          seen.add(k2);
          hpush(q, { s: s2, path, f: fval(s2, path.length) });
        }
        if (found) break;
      }
      // en uzağa gidilen nokta (bulunamazsa teşhis için)
      let far = null;
      const names = world.colliders.map((c, i) => `${i}:${Math.round((c.x0 + c.x1) / 2 * 10) / 10},${Math.round(-(c.y0 + c.y1) / 2 * 10) / 10}`);
      return { erisilen: Object.keys(reach).map(i => names[i]).join(' '), enYuksek: bestY, tum: names.join(' '), bolum, found: !!found, adim: found ? found.length : 0, sure: found ? (found.length * 0.1).toFixed(1) + ' sn' : '-', genisletilen: exp, durum: seen.size, yol: found ? found.map(([d, w]) => (d < 0 ? 'A' : d > 0 ? 'D' : '.') + (w ? 'W' : '')).join(' ') : null };
    }, bolum);
    console.log(JSON.stringify(res));
  }
}
