p = 'tools/senaryolar/bot.mjs'
s = open(p, encoding='utf8').read()
def rep(a, b):
    global s
    assert a in s, a[:60]
    s = s.replace(a, b)
rep("""          if (this.typedAt < 0) { inp.textEl""", """          if (this.typedAt < 0 && !inp.textMode) return;
          if (this.typedAt < 0) { inp.textEl""")
rep("""        // 2023 / kırılma: konuşmayı geç
        if (name === 'kirilma') {""", """        // 2023: menüde Enter, diyalogda "Devam et" tıkla, bölümde kapıya ışınla (bitirilebilirlik plan2023 ile kanıtlı)
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
        if (name === 'kirilma') {""")
rep("        if (name !== this.lastScene) { this.log.push(`${this.t.toFixed(1)}s sahne → ${name}`); this.lastScene = name; this.sceneT = 0; }",
    "        if (name !== this.lastScene) { this.log.push(`${this.t.toFixed(1)}s sahne → ${name}`); this.lastScene = name; this.sceneT = 0; this.teleported = false; }")
open(p, 'w', encoding='utf8').write(s)

p = 'src/scenes/eski2023.ts'
s = open(p, encoding='utf8').read()
rep("""    enter(a: Bolum2023Arg) { arg = a; G.P.enabled = false; build(); },""", """    enter(a: Bolum2023Arg) {
      arg = a; G.P.enabled = false; build();
      // test: kapının önüne ışınla (bitirilebilirlik tools/senaryolar/plan2023.mjs ile kanıtlandı)
      (window as any).__bolum2023Isinla = () => { const T = L.trigger; ctl.body.x = T.x + 0.6; ctl.body.y = -T.y - 0.3; ctl.body.vx = 0; ctl.body.vy = 0; };
    },""")
open(p, 'w', encoding='utf8').write(s)
print('tamam')
