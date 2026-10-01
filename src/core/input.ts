// Klavye, fare ve oyun kolu. Fiziksel tuş kodları (e.code) kullanılır: Türkçe Q klavyede de A/D/W yerinde.
const LEFT = ['KeyA', 'ArrowLeft'];
const RIGHT = ['KeyD', 'ArrowRight'];
const UP = ['KeyW', 'ArrowUp'];
const DOWN = ['KeyS', 'ArrowDown'];
const JUMP = ['KeyW', 'ArrowUp', 'Space'];
const INTERACT = ['KeyE', 'Enter', 'NumpadEnter'];
const CONFIRM = ['Space', 'Enter', 'NumpadEnter', 'KeyE'];

class Input {
  private held = new Set<string>();
  private pressedSet = new Set<string>();
  private releasedSet = new Set<string>();
  /** Bu karede yazılan karakterler (metin girişi kipinde). */
  typed: string[] = [];
  backspace = 0;
  mouse = { x: 0, y: 0, down: false, clicked: false, moved: false };
  /** true iken hareket/zıplama girdisi oyuna verilmez ama denemeler sayılır (özgür irade sahnesi). */
  locked = false;
  lockedAttempts = 0;
  lastAnyInputTime = 0;
  private pad = { x: 0, a: false, aPrev: false, b: false, bPrev: false, start: false, startPrev: false, x2: false, x2Prev: false };
  private clock = 0;

  /** Metin girişi kipi: gizli <input> etkin, karakter tuşları ona bırakılır. */
  textEl: HTMLInputElement | null = null;
  textMode = false;
  beginText(initial = '') {
    if (!this.textEl) {
      const t = document.createElement('input');
      t.type = 'text'; t.autocomplete = 'off'; t.spellcheck = false;
      t.style.cssText = 'position:fixed;left:-1000px;top:0;opacity:0;width:10px;height:10px;';
      document.body.appendChild(t);
      this.textEl = t;
    }
    this.textEl.value = initial;
    this.textMode = true;
    this.textEl.focus();
  }
  endText() { this.textMode = false; this.textEl?.blur(); }
  get textValue() { return this.textEl?.value ?? ''; }

  attach(el: HTMLElement) {
    window.addEventListener('keydown', e => {
      if (this.textMode && this.textEl && document.activeElement !== this.textEl) this.textEl.focus();
      // Tarayıcı kısayollarını engelle (F5 ve F12 serbest kalsın: geliştirme). Metin kipinde yazıya izin ver.
      const textKey = this.textMode && (e.key.length === 1 || e.key === 'Backspace' || e.key === 'Delete' || e.code.startsWith('Arrow'));
      if (!['F5', 'F12', 'F11'].includes(e.code) && !textKey) e.preventDefault();
      if (!e.repeat) {
        this.held.add(e.code);
        this.pressedSet.add(e.code);
        if (this.locked && [...LEFT, ...RIGHT, ...JUMP].includes(e.code)) this.lockedAttempts++;
      }
      if (e.key === 'Backspace') this.backspace++;
      else if (e.key.length === 1 && !e.ctrlKey && !e.altKey) this.typed.push(e.key);
      this.lastAnyInputTime = this.clock;
    });
    window.addEventListener('keyup', e => {
      this.held.delete(e.code);
      this.releasedSet.add(e.code);
    });
    window.addEventListener('blur', () => this.held.clear());
    el.addEventListener('mousemove', e => {
      this.mouse.x = e.clientX * devicePixelRatio; this.mouse.y = e.clientY * devicePixelRatio; this.mouse.moved = true;
    });
    el.addEventListener('mousedown', e => {
      if (e.button === 0) { this.mouse.down = true; this.mouse.clicked = true; this.lastAnyInputTime = this.clock; }
    });
    window.addEventListener('mouseup', () => { this.mouse.down = false; });
    el.addEventListener('contextmenu', e => e.preventDefault());
  }

  /** Kare başında çağrılır (oyun kolu okuması). */
  poll(dt: number) {
    this.clock += dt;
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const p = pads && Array.from(pads).find(g => g && g.connected);
    const P = this.pad;
    P.aPrev = P.a; P.bPrev = P.b; P.startPrev = P.start; P.x2Prev = P.x2;
    if (p) {
      const ax = p.axes[0] ?? 0;
      const dl = p.buttons[14]?.pressed ? -1 : 0, dr = p.buttons[15]?.pressed ? 1 : 0;
      P.x = Math.abs(ax) > 0.25 ? ax : dl + dr;
      P.a = !!p.buttons[0]?.pressed; P.b = !!p.buttons[1]?.pressed; P.x2 = !!p.buttons[2]?.pressed;
      P.start = !!p.buttons[9]?.pressed;
      if (this.locked && ((P.a && !P.aPrev) || Math.abs(P.x) > 0.5)) this.lockedAttempts += P.a && !P.aPrev ? 1 : 0;
      if (P.a || P.b || Math.abs(P.x) > 0.3) this.lastAnyInputTime = this.clock;
    } else { P.x = 0; P.a = P.b = P.start = P.x2 = false; }
  }

  /** Kare sonunda çağrılır. */
  endFrame() {
    this.pressedSet.clear(); this.releasedSet.clear();
    this.typed.length = 0; this.backspace = 0;
    this.mouse.clicked = false; this.mouse.moved = false;
  }

  isDown(code: string) { return this.held.has(code); }
  pressed(code: string) { return this.pressedSet.has(code); }
  private anyDown(list: string[]) { return list.some(c => this.held.has(c)); }
  private anyPressed(list: string[]) { return list.some(c => this.pressedSet.has(c)); }

  /** Ham yatay eksen (kilitliyken de gerçek değeri verir). */
  rawX() {
    let x = 0;
    if (this.anyDown(LEFT)) x -= 1;
    if (this.anyDown(RIGHT)) x += 1;
    if (x === 0) x = this.pad.x;
    return Math.max(-1, Math.min(1, x));
  }
  get x() { return this.locked ? 0 : this.rawX(); }
  get jumpPressed() { return !this.locked && (this.anyPressed(JUMP) || (this.pad.a && !this.pad.aPrev)); }
  get jumpHeld() { return !this.locked && (this.anyDown(JUMP) || this.pad.a); }
  get up() { return this.anyDown(UP); }
  get down() { return this.anyDown(DOWN); }
  get upPressed() { return this.anyPressed(UP); }
  get downPressed() { return this.anyPressed(DOWN); }
  get leftPressed() { return this.anyPressed(LEFT) || false; }
  get rightPressed() { return this.anyPressed(RIGHT) || false; }
  get interactPressed() { return this.anyPressed(INTERACT) || (this.pad.x2 && !this.pad.x2Prev); }
  get confirmPressed() { return this.anyPressed(CONFIRM) || this.mouse.clicked || (this.pad.a && !this.pad.aPrev); }
  get escPressed() { return this.pressed('Escape') || (this.pad.start && !this.pad.startPrev); }
  get anyPressed_() { return this.pressedSet.size > 0 || this.mouse.clicked || (this.pad.a && !this.pad.aPrev); }
  /** 2023 kipi: yalnız W A D. */
  get x2023() { let x = 0; if (this.held.has('KeyA')) x -= 1; if (this.held.has('KeyD')) x += 1; return x; }
  get w2023() { return this.held.has('KeyW'); }
  get a2023() { return this.held.has('KeyA'); }
  get d2023() { return this.held.has('KeyD'); }
  idleTime() { return this.clock - this.lastAnyInputTime; }
  /** Test/bot sürücüsü için yapay tuş. */
  synth(code: string, down: boolean) {
    if (down) { if (!this.held.has(code)) this.pressedSet.add(code); this.held.add(code); }
    else { this.held.delete(code); this.releasedSet.add(code); }
  }
}

export const input = new Input();
