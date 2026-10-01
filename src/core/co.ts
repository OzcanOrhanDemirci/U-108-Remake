// Eşyordamlar: sahne senaryoları üreteç fonksiyonu olarak yazılır.
// `yield` her karede bir kez döner ve o karenin dt'sini getirir.
export type Co = Generator<unknown, void, number>;

export function* wait(seconds: number): Co {
  let t = 0;
  while (t < seconds) t += yield;
}

export function* until(pred: () => boolean): Co {
  while (!pred()) yield;
}

/** Süre boyunca her karede f(t01) çağırır. */
export function* tween(seconds: number, f: (t: number) => void): Co {
  let t = 0;
  f(0);
  while (t < seconds) {
    t += yield;
    f(Math.min(1, t / seconds));
  }
}

/** Hepsini paralel çalıştırır, hepsi bitince biter. */
export function* all(...cos: Co[]): Co {
  const live = cos.slice();
  let dt = 0;
  while (live.length) {
    for (let i = live.length - 1; i >= 0; i--) {
      if (live[i].next(dt).done) live.splice(i, 1);
    }
    if (live.length) dt = yield;
  }
}

/** Biri bitince biter (diğerleri bırakılır). */
export function* race(...cos: Co[]): Co {
  let dt = 0;
  for (;;) {
    for (const c of cos) if (c.next(dt).done) return;
    dt = yield;
  }
}

export class Runner {
  private list: { co: Co; tag?: string }[] = [];
  start(co: Co, tag?: string) {
    // İlk adımı hemen at: senaryo ilk yield'e kadar aynı karede ilerlesin.
    const r = co.next(0);
    if (!r.done) this.list.push({ co, tag });
    return co;
  }
  stop(tag: string) { this.list = this.list.filter(e => e.tag !== tag); }
  clear() { this.list.length = 0; }
  running(tag: string) { return this.list.some(e => e.tag === tag); }
  get count() { return this.list.length; }
  update(dt: number) {
    const cur = this.list.slice();
    for (const e of cur) {
      if (!this.list.includes(e)) continue;
      let r;
      try { r = e.co.next(dt); } catch (err) { console.error(err); r = { done: true }; }
      if (r.done) this.list = this.list.filter(x => x !== e);
    }
  }
}
