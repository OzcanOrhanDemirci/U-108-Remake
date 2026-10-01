// Basit ama sağlam 2B çarpışma: dışbükey çokgenler (SAT), hap biçimli gövde, kaydırarak hareket.
// Dünya koordinatları y aşağı.
import { V2, clamp } from '../core/math';

export type Surface = 'cim' | 'tas' | 'tahta' | 'metal' | 'yazi' | 'karanlik';

export interface Collider {
  pts: V2[];
  x0: number; y0: number; x1: number; y1: number;
  oneWay?: boolean;
  hazard?: boolean;
  platform?: boolean;  // 2023: "Platform" etiketi (yere değme sayılır)
  surface?: Surface;
  enabled: boolean;
  id?: string;
  data?: any;
  solid?: boolean;     // false: yalnız tehlike/tetik
  /** Arazi parçası: yalnız üst çizgisi (a→b) zemin sayılır; yan kenarları iç kenardır, takılmaz. */
  seg?: { ax: number; ay: number; bx: number; by: number };
}

function bounds(c: Collider) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of c.pts) { x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y); }
  c.x0 = x0; c.y0 = y0; c.x1 = x1; c.y1 = y1;
}

export class World {
  colliders: Collider[] = [];
  gravity = 26;

  add(pts: V2[], o: Partial<Collider> = {}): Collider {
    // saat yönünü normalize et (SAT normalleri için gerekmez ama tutarlı olsun)
    const c: Collider = { pts, x0: 0, y0: 0, x1: 0, y1: 0, enabled: true, solid: true, ...o };
    bounds(c);
    this.colliders.push(c);
    return c;
  }
  box(x: number, y: number, w: number, h: number, o: Partial<Collider> = {}) {
    return this.add([{ x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }], o);
  }
  /** Merkez, boyut ve açıyla döndürülmüş kutu (açı radyan, y aşağı sistemde saat yönü pozitif). */
  obb(cx: number, cy: number, w: number, h: number, ang: number, o: Partial<Collider> = {}) {
    const c = Math.cos(ang), s = Math.sin(ang);
    const pts = [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]].map(([x, y]) => ({ x: cx + x * c - y * s, y: cy + x * s + y * c }));
    return this.add(pts, o);
  }
  /** Zemin çizgisi: ardışık noktalar arası dörtgenler (altı `bottom`a kadar dolu). */
  terrain(points: V2[], bottom: number, o: Partial<Collider> = {}) {
    const out: Collider[] = [];
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i], b = points[i + 1];
      out.push(this.add([{ x: a.x, y: a.y }, { x: b.x, y: b.y }, { x: b.x, y: bottom }, { x: a.x, y: bottom }], { ...o, seg: { ax: a.x, ay: a.y, bx: b.x, by: b.y } }));
    }
    return out;
  }
  remove(c: Collider) { const i = this.colliders.indexOf(c); if (i >= 0) this.colliders.splice(i, 1); }
  movePoly(c: Collider, dx: number, dy: number) { for (const p of c.pts) { p.x += dx; p.y += dy; } bounds(c); }
  setPoly(c: Collider, pts: V2[]) { c.pts = pts; bounds(c); }

  /** Zemin yüksekliği (x'te, y'den aşağı ilk katı üst yüzey). Yoksa Infinity. */
  groundAt(x: number, fromY: number): number {
    let best = Infinity;
    for (const c of this.colliders) {
      if (!c.enabled || c.solid === false || c.x0 > x || c.x1 < x) continue;
      const n = c.pts.length;
      for (let i = 0; i < n; i++) {
        const a = c.pts[i], b = c.pts[(i + 1) % n];
        if ((a.x - x) * (b.x - x) > 0 || a.x === b.x) continue;
        const t = (x - a.x) / (b.x - a.x), y = a.y + (b.y - a.y) * t;
        if (y >= fromY - 0.01 && y < best) best = y;
      }
    }
    return best;
  }
}

// ---------- SAT ----------
function project(pts: V2[], ax: number, ay: number) {
  let mn = Infinity, mx = -Infinity;
  for (const p of pts) { const d = p.x * ax + p.y * ay; if (d < mn) mn = d; if (d > mx) mx = d; }
  return [mn, mx];
}
/** a'yı b'nin dışına iten en küçük öteleme (a'ya uygulanır). Yoksa null. */
export function sat(a: V2[], b: V2[]): { x: number; y: number; depth: number } | null {
  let best = Infinity, bx = 0, by = 0;
  for (const poly of [a, b]) {
    const n = poly.length;
    for (let i = 0; i < n; i++) {
      const p = poly[i], q = poly[(i + 1) % n];
      let ax = -(q.y - p.y), ay = q.x - p.x;
      const l = Math.hypot(ax, ay); if (l < 1e-9) continue;
      ax /= l; ay /= l;
      const [a0, a1] = project(a, ax, ay), [b0, b1] = project(b, ax, ay);
      const o = Math.min(a1, b1) - Math.max(a0, b0);
      if (o <= 0) return null;
      if (o < best) {
        best = o;
        // a'yı b'den uzaklaştıracak yön
        const ca = (a0 + a1) / 2, cb = (b0 + b1) / 2;
        if (ca < cb) { bx = -ax; by = -ay; } else { bx = ax; by = ay; }
      }
    }
  }
  return { x: bx * best, y: by * best, depth: best };
}

// ---------- Gövde ----------
export class Body {
  x = 0; y = 0; vx = 0; vy = 0;
  hw: number; hh: number;
  grounded = false;
  wasGrounded = false;
  groundN = { x: 0, y: -1 };
  ground: Collider | null = null;
  touching = new Set<Collider>();
  prevTouching = new Set<Collider>();
  hitHazard: Collider | null = null;
  private shapeCache: V2[] = [];
  private local: V2[];

  constructor(hw: number, hh: number) {
    this.hw = hw; this.hh = hh;
    // hap: üstte ve altta yarım daire
    const r = hw, cy = hh - r, pts: V2[] = [];
    const N = 7;
    for (let i = 0; i <= N; i++) { const a = Math.PI + (i / N) * Math.PI; pts.push({ x: Math.cos(a) * r, y: -cy + Math.sin(a) * r }); }
    for (let i = 0; i <= N; i++) { const a = (i / N) * Math.PI; pts.push({ x: Math.cos(a) * r, y: cy + Math.sin(a) * r }); }
    this.local = pts;
    this.shapeCache = pts.map(p => ({ x: p.x, y: p.y }));
  }
  get bottom() { return this.y + this.hh; }
  shape(dx = 0, dy = 0) {
    for (let i = 0; i < this.local.length; i++) { this.shapeCache[i].x = this.local[i].x + this.x + dx; this.shapeCache[i].y = this.local[i].y + this.y + dy; }
    return this.shapeCache;
  }
}

/** Gövdeyi hareket ettirir, çarpışmaları çözer. Döner: bu adımda değilen çarpıştırıcılar. */
export function moveBody(b: Body, w: World, dt: number, o: { stickToGround?: boolean; dropThrough?: boolean; maxSlope?: number } = {}) {
  const maxSlopeCos = Math.cos(o.maxSlope ?? 0.9);
  b.wasGrounded = b.grounded;
  b.prevTouching = b.touching;
  b.touching = new Set();
  b.grounded = false; b.ground = null; b.hitHazard = null;
  const prevBottom = b.bottom;
  const speed = Math.hypot(b.vx, b.vy) * dt;
  const steps = Math.max(1, Math.ceil(speed / (b.hw * 0.5)));
  for (let s = 0; s < steps; s++) {
    b.x += (b.vx * dt) / steps;
    b.y += (b.vy * dt) / steps;
    resolve(b, w, prevBottom, o.dropThrough, maxSlopeCos);
  }
  // yere yapış (yokuş aşağı inerken havalanmasın)
  // yokuş yukarı yürürken vy (eğim takibi) eksidir; yine de yere yapıştır, yoksa her iki karede 'havada' sayılıyordu
  if (o.stickToGround && b.wasGrounded && !b.grounded) {
    const sx = b.x, sy = b.y;
    const probe = 0.32;
    b.y += probe;
    resolve(b, w, prevBottom, o.dropThrough, maxSlopeCos); // "üstündeydi mi" sınaması hareketten önceki tabana göre
    if (!b.grounded) { b.x = sx; b.y = sy; }
    else b.vy = Math.max(b.vy, 0);
  }
  return b.touching;
}

function resolve(b: Body, w: World, prevBottom: number, dropThrough: boolean | undefined, maxSlopeCos: number) {
  for (let iter = 0; iter < 4; iter++) {
    let any = false;
    const bx0 = b.x - b.hw - 0.05, bx1 = b.x + b.hw + 0.05, by0 = b.y - b.hh - 0.05, by1 = b.y + b.hh + 0.05;
    for (const c of w.colliders) {
      if (!c.enabled) continue;
      if (c.x0 > bx1 || c.x1 < bx0 || c.y0 > by1 || c.y1 < by0) continue;
      if (c.seg) {
        // Arazi: yükseklik eğrisi gibi çöz. Gövdenin taban merkezi bu parçanın üstündeyse yüzeye it (yalnız dikey).
        const t = c.seg;
        if (b.x < t.ax || b.x > t.bx) continue;
        const k = (b.x - t.ax) / (t.bx - t.ax || 1e-9);
        const sy = t.ay + (t.by - t.ay) * k;
        const bottom = b.y + b.hh;
        if (bottom <= sy + 1e-4 || bottom > sy + 1.6) continue;
        b.y -= bottom - sy;
        if (b.vy > 0) b.vy = 0;
        b.touching.add(c);
        let nx = -(t.by - t.ay), ny = t.bx - t.ax;
        const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
        if (ny > 0) { nx = -nx; ny = -ny; }
        if (-ny >= maxSlopeCos) { b.grounded = true; b.groundN = { x: nx, y: ny }; b.ground = c; }
        any = true;
        continue;
      }
      const m = sat(b.shape(), c.pts);
      if (!m) continue;
      if (c.hazard) b.hitHazard = c;
      if (c.solid === false) { b.touching.add(c); continue; }
      if (c.oneWay) {
        // yalnız yukarıdan, düşerken ve önceki karede üstündeyken
        if (dropThrough || b.vy < -0.01 || m.y > -0.0001 || prevBottom > c.y0 + 0.08) continue;
      }
      b.touching.add(c);
      const len = m.depth || 1e-9;
      const nx = m.x / len, ny = m.y / len;
      b.x += m.x; b.y += m.y;
      const vn = b.vx * nx + b.vy * ny;
      if (vn < 0) { b.vx -= vn * nx; b.vy -= vn * ny; }
      if (-ny >= maxSlopeCos) { b.grounded = true; b.groundN = { x: nx, y: ny }; b.ground = c; }
      any = true;
    }
    if (!any) break;
  }
}

/** Yeni oyunun yumuşak kontrolcüsü. */
export class Controller {
  body: Body;
  maxSpeed = 4.3;
  accel = 34; decel = 40; airAccel = 20;
  jumpV = 10.4;
  coyote = 0; buffer = 0;
  jumping = false;
  facing = 1;
  dist = 0;            // yürünen yol (adım evresi için)
  justLanded = 0;      // iniş şiddeti (bu karede)
  justJumped = false;
  fallSpeed = 0;
  frozen = false;
  jumpMul = 1;         // laboratuvarda kod değişince
  speedMul = 1;

  constructor(hw = 0.24, hh = 0.86) { this.body = new Body(hw, hh); }

  update(dt: number, w: World, inp: { x: number; jumpPressed: boolean; jumpHeld: boolean; drop?: boolean }) {
    const b = this.body;
    this.justLanded = 0; this.justJumped = false;
    if (this.frozen) { b.vx = 0; return; }
    const target = inp.x * this.maxSpeed * this.speedMul;
    if (inp.x !== 0) this.facing = Math.sign(inp.x);
    const a = b.grounded ? (inp.x !== 0 ? this.accel : this.decel) : this.airAccel;
    // yatay hız
    const step = a * dt;
    b.vx = b.vx < target ? Math.min(b.vx + step, target) : Math.max(b.vx - step, target);
    // zıplama tamponu ve çakal süresi
    if (inp.jumpPressed) this.buffer = 0.13;
    else this.buffer = Math.max(0, this.buffer - dt);
    if (b.grounded) this.coyote = 0.1; else this.coyote = Math.max(0, this.coyote - dt);
    if (this.buffer > 0 && this.coyote > 0) {
      b.vy = -this.jumpV * this.jumpMul;
      this.buffer = 0; this.coyote = 0; this.jumping = true; this.justJumped = true;
      b.grounded = false;
    }
    // yerçekimi (değişken zıplama yüksekliği)
    let g = w.gravity;
    if (b.vy < 0 && !inp.jumpHeld && this.jumping) g *= 2.6;
    else if (b.vy > 0) g *= 1.55;
    if (b.grounded && !this.justJumped) {
      // eğimde kaymasın: zemine teğet hareket
      const n = b.groundN;
      const tx = -n.y, ty = n.x; // teğet (sağa)
      const sgn = tx >= 0 ? 1 : -1;
      b.vy = b.vx * (ty * sgn) / Math.max(0.3, Math.abs(tx));
      if (Math.abs(b.vx) < 0.01) b.vy = 0;
    } else {
      b.vy = Math.min(b.vy + g * dt, 19);
    }
    const wasG = b.grounded;
    const vyBefore = b.vy;
    const x0 = b.x;
    // Yerde ve hareketsizken fizik adımı atlanır: eğimde yere yapıştırma, gövdeyi normal boyunca kaydırıyordu.
    const groundAlive = !!b.ground && b.ground.enabled && w.colliders.includes(b.ground);
    if (b.grounded && groundAlive && !this.justJumped && inp.x === 0 && Math.abs(b.vx) < 0.02) {
      b.vx = 0; b.vy = 0;
      b.wasGrounded = true;
      this.fallSpeed = 0;
      return;
    }
    moveBody(b, w, dt, { stickToGround: !this.justJumped, dropThrough: inp.drop });
    if (b.grounded) { this.jumping = false; }
    if (b.grounded && !wasG) this.justLanded = clamp(vyBefore / 14, 0.15, 1.3);
    this.fallSpeed = b.vy;
    if (b.grounded) this.dist += Math.abs(b.x - x0);
    else this.dist += Math.abs(b.x - x0) * 0.3;
  }
}

/** 2023 KarakterKontrol.cs davranışının birebir taklidi (Unity Rigidbody2D yaklaşımı). */
export class Controller2023 {
  body: Body;
  hiz = 2.0;               // public float hiz
  ziplamakuvveti = 5.0;    // public float ziplamakuvveti (sahnede 5)
  hareketyonu = 0;
  yerdemiyim = true;
  zipladimmi = false;
  flipX = false;
  animHiz = 0;
  gravity = 9.81;
  justDied = false;

  constructor() {
    // CapsuleCollider2D 13.94 x 37.65, ölçek 0.04 → 0.558 x 1.506
    this.body = new Body(0.279, 0.753);
  }

  /** Update(): girdi. */
  input(a: boolean, d: boolean, w: boolean) {
    if (this.yerdemiyim && (a || d)) {
      if (a) { this.hareketyonu = -1; this.flipX = true; this.animHiz = this.hiz; }
      else if (d) { this.hareketyonu = 1; this.flipX = false; this.animHiz = this.hiz; }
    } else if (this.yerdemiyim) {
      this.hareketyonu = 0; this.animHiz = 0;
    }
    if (this.yerdemiyim && w) { this.zipladimmi = true; this.yerdemiyim = false; }
  }

  /** FixedUpdate() + fizik adımı. */
  fixed(dt: number, w: World) {
    const b = this.body;
    b.vx = this.hiz * this.hareketyonu;
    if (this.zipladimmi) { b.vy = -this.ziplamakuvveti; this.zipladimmi = false; }
    b.vy += this.gravity * dt;
    const touched = moveBody(b, w, dt, {});
    // OnCollisionEnter2D: yeni değilen "Platform" etiketli nesne → yerdemiyim = true (yandan değse bile)
    for (const c of touched) {
      if (c.platform && !b.prevTouching.has(c)) this.yerdemiyim = true;
    }
  }
}
