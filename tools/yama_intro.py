p = 'src/scenes/orman.ts'
s = open(p, encoding='utf8').read()

def rep(a, b, count=1):
    global s
    assert a in s, 'bulunamadi: ' + a[:60]
    s = s.replace(a, b, count)

rep("import { music } from '../core/music';", "import { music, dogusSwell, piano } from '../core/music';\nimport { IMG, FONT } from '../core/assets';\nimport { host } from '../meta/host';")
rep("import { rng, mix, lerp, smooth, fbm1, clamp, TAU } from '../core/math';", "import { rng, mix, lerp, smooth, fbm1, clamp, TAU, easeOutBack, easeInOut } from '../core/math';")
rep("import { wait, all, Co } from '../core/co';", "import { wait, all, Co, tween } from '../core/co';")
rep("  ozcanLook = 0;\n", """  ozcanLook = 0;
  intro = false;
  introSky = 1;
  reb = { on: false, oldA: 0, scan: -1, sketchA: 0, reveal: 0, light: 0 };
  title = { a: 0, sub: 0 };
""")
rep("  override enter() {\n    super.enter();\n    checkpoint('orman');", "  override enter(arg?: { intro?: boolean }) {\n    super.enter();\n    this.intro = !!arg?.intro;\n    checkpoint('orman');")
rep("""    music.play('orman', 1.5);
    audio.ambience('ruzgar', 0.5, 3); audio.ambience('yaprak', 0.25, 3);
    this.run(this.script());
    this.buildTriggers();
    this.debugPlace();""", """    this.buildTriggers();
    if (this.intro) {
      this.startIntro();
    } else {
      host.setTitle('U-108');
      music.play('orman', 1.5);
      audio.ambience('ruzgar', 0.5, 3); audio.ambience('yaprak', 0.25, 3);
      this.run(this.script());
    }
    this.debugPlace();""")

INTRO = open('tools/intro_parca.ts', encoding='utf8').read()
rep("  buildTriggers() {", INTRO + "\n  buildTriggers() {")

rep("""    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = vGrad(ctx, 0, H, [[0, '#B8101C'], [0.3, '#E2261A'], [0.55, '#F84A1E'], [0.78, '#FF6C2A'], [1, '#FF8A3C']]);
    ctx.fillRect(0, 0, W, H);""", """    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = this.introSky;
    ctx.fillStyle = vGrad(ctx, 0, H, [[0, '#B8101C'], [0.3, '#E2261A'], [0.55, '#F84A1E'], [0.78, '#FF6C2A'], [1, '#FF8A3C']]);
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;""")
rep("""    const hz = this.cam.toScreen(0, 0, W, H).y;
    ctx.fillStyle""", """    const hz = this.cam.toScreen(0, 0, W, H).y;
    ctx.globalAlpha = this.introSky;
    ctx.fillStyle""")
rep("""    ctx.fillRect(0, hz - H * 0.25, W, H * 0.3);
""", """    ctx.fillRect(0, hz - H * 0.25, W, H * 0.3);
    ctx.globalAlpha = 1;
""")
open(p, 'w', encoding='utf8').write(s)
print('tamam')
