export const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const invLerp = (a: number, b: number, v: number) => clamp((v - a) / (b - a), 0, 1);
export const smooth = (t: number) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
export const smoother = (t: number) => { t = clamp(t, 0, 1); return t * t * t * (t * (t * 6 - 15) + 10); };
export const easeOut = (t: number) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
export const easeIn = (t: number) => Math.pow(clamp(t, 0, 1), 3);
export const easeInOut = (t: number) => { t = clamp(t, 0, 1); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
export const easeOutBack = (t: number) => { const c1 = 1.70158, c3 = c1 + 1; t = clamp(t, 0, 1); return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
/** Kare hızından bağımsız üstel yaklaşma. k: saniyedeki yaklaşma oranı. */
export const damp = (a: number, b: number, k: number, dt: number) => lerp(a, b, 1 - Math.exp(-k * dt));
export const TAU = Math.PI * 2;
export const sign = (v: number) => (v < 0 ? -1 : v > 0 ? 1 : 0);
export const approach = (v: number, target: number, step: number) => (v < target ? Math.min(v + step, target) : Math.max(v - step, target));

export interface V2 { x: number; y: number }
export const v2 = (x = 0, y = 0): V2 => ({ x, y });

/** Tohumlu rastgele (mulberry32). Aynı sahne her açılışta aynı görünsün diye. */
export function rng(seed: number) {
  let s = seed >>> 0;
  const f = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return Object.assign(f, {
    range: (a: number, b: number) => a + (b - a) * f(),
    int: (a: number, b: number) => Math.floor(a + (b - a + 1) * f()),
    pick: <T>(arr: T[]) => arr[Math.floor(f() * arr.length)],
  });
}
export type Rng = ReturnType<typeof rng>;

/** Pürüzsüz 1B gürültü (değer gürültüsü, kosinüs geçişli). */
export function noise1(x: number, seed = 0) {
  const i = Math.floor(x), f = x - i;
  const h = (n: number) => { const s = Math.sin((n + seed * 131.7) * 127.1) * 43758.5453; return s - Math.floor(s); };
  const u = f * f * (3 - 2 * f);
  return lerp(h(i), h(i + 1), u) * 2 - 1;
}
export function fbm1(x: number, seed = 0, oct = 3) {
  let a = 0, amp = 0.5, fr = 1;
  for (let i = 0; i < oct; i++) { a += noise1(x * fr, seed + i * 17) * amp; amp *= 0.5; fr *= 2; }
  return a;
}

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export function rgbToHex(r: number, g: number, b: number) {
  const c = (v: number) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0');
  return '#' + c(r) + c(g) + c(b);
}
/** İki rengi karıştırır (hex). */
export function mix(a: string, b: string, t: number) {
  const A = hexToRgb(a), B = hexToRgb(b);
  return rgbToHex(lerp(A[0], B[0], t), lerp(A[1], B[1], t), lerp(A[2], B[2], t));
}
export function rgba(hex: string, a: number) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}
