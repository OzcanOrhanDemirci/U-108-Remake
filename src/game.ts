// Oyunun kalbi: tuval, döngü, sahneler, son işlem.
import { Post, PostParams, defaultPost } from './render/post';
import { input } from './core/input';
import { audio } from './core/audio';
import { music } from './core/music';
import { Runner } from './core/co';

export interface Scene {
  name: string;
  enter?(arg?: any): void;
  exit?(): void;
  update(dt: number): void;
  draw(ctx: CanvasRenderingContext2D, W: number, H: number): void;
}

export const params = new URLSearchParams(location.search);
export const DEBUG = params.has('debug');

class Game {
  display!: HTMLCanvasElement;
  canvas!: HTMLCanvasElement;   // sahnenin çizildiği 2B tuval
  ctx!: CanvasRenderingContext2D;
  post!: Post;
  P: PostParams = defaultPost();
  W = 1920; H = 1080;
  time = 0;
  dt = 1 / 60;
  /** Yalnız test düzeneği: true iken step() çizmez (yazılım çizicili CI koşucusunda ara kareler). */
  cizimAtla = false;
  scene: Scene | null = null;
  scenes: Record<string, () => Scene> = {};
  runner = new Runner();
  /** Sabit adımlı kayıt kipi (?sabit=1): her kare 1/60 sn ilerler, ekran görüntüsü tekrarlanabilir. */
  fixedStep = params.has('sabit');
  paused = false;
  frame = 0;
  private last = 0;
  private sceneArg: any;
  timeScale = 1;
  fps = 60;
  overlay: { blocking: () => boolean; update(dt: number): void; draw(ctx: CanvasRenderingContext2D, W: number, H: number): void } | null = null;

  init() {
    this.display = document.getElementById('ekran') as HTMLCanvasElement;
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d', { alpha: false, desynchronized: false })!;
    this.post = new Post(this.display);
    input.attach(this.display);
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.W = Math.max(320, Math.round(window.innerWidth * dpr));
    this.H = Math.max(180, Math.round(window.innerHeight * dpr));
    this.canvas.width = this.W; this.canvas.height = this.H;
  }

  register(name: string, f: () => Scene) { this.scenes[name] = f; }

  go(name: string, arg?: any) {
    if (this.scene?.exit) this.scene.exit();
    this.runner.clear();
    this.P = defaultPost();
    input.locked = false;
    const f = this.scenes[name];
    if (!f) throw new Error('sahne yok: ' + name);
    this.scene = f();
    this.sceneArg = arg;
    (window as any).__sahne = name;
    this.scene.enter?.(arg);
  }

  start() {
    const loop = (ts: number) => {
      requestAnimationFrame(loop);
      let dt = this.last ? (ts - this.last) / 1000 : 1 / 60;
      this.last = ts;
      if (this.fixedStep) dt = 1 / 60;
      dt = Math.min(dt, 1 / 20);
      this.fps = this.fps * 0.95 + (1 / Math.max(dt, 1e-3)) * 0.05;
      if (!this.paused) this.step(dt * this.timeScale);
    };
    requestAnimationFrame(loop);
  }

  step(dt: number) {
    this.dt = dt;
    this.time += dt;
    this.frame++;
    input.poll(dt);
    music.update();
    this.overlay?.update(dt);
    if (!this.overlay?.blocking()) {
      this.runner.update(dt);
      this.scene?.update(dt);
    }
    input.endFrame();
    // Test düzeneği, GPU'suz makinede (CI) ara kareleri çizdirmeden ilerletir; mantık her adımda işler.
    if (this.cizimAtla) return;
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    this.scene?.draw(ctx, this.W, this.H);
    this.overlay?.draw(ctx, this.W, this.H);
    this.post.render(this.canvas, this.P, dt);
  }
}

export const G = new Game();
(window as any).__G = G;
(window as any).__audio = audio;
(window as any).__input = input;
