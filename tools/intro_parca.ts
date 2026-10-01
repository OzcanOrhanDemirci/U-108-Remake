  startIntro() {
    this.controls = false;
    this.player.visible = false;
    this.fade = 0; this.fadeT = 0;
    this.introSky = 0;
    this.rise = [1, 1, 1, 1, 1, 1, 1, 1].map(() => this.H * 1.6);
    this.cam.tViewH = this.cam.viewH = 4.6; this.cam.offY = -0.95;
    this.cam.lead = 0;
    this.cam.tx = this.player.x; this.cam.ty = this.player.y - 0.95; this.cam.snap();
    this.player.anim.emotion = 'gozkapali';
    this.player.rim.strength = 0;
    this.run(this.introScript());
  }

  *introScript(): Co {
    const self = this;
    this.reb.on = true;
    yield* wait(1.2);
    // 1) 2023'ün düz çizimi
    audio.tone(110, 3, { gain: 0.05, attack: 1.2, type: 'sine', reverb: 0.6 });
    yield* tween(1.4, k => { self.reb.oldA = k; });
    yield* wait(0.8);
    // 2) tarama: çizim, kâğıttaki ilk eskize döner
    this.run((function* () {
      for (let i = 0; i < 14; i++) { audio.noise(0.05 + Math.random() * 0.08, { gain: 0.05, type: 'bandpass', freq: 3000 + Math.random() * 2000, q: 2 }); yield* wait(0.08 + Math.random() * 0.12); }
    })());
    yield* tween(2.2, k => { self.reb.scan = k; self.reb.sketchA = k; });
    this.reb.oldA = 0; this.reb.scan = -1;
    this.run(this.talk.ai('Bu senin ilk hâlin. Kâğıt üstünde.', { pos: 'alt', hold: 2.8 }));
    yield* wait(3.8);
    // 3) yeni beden alttan yukarı basılır, müzik kabarır
    const resolve = dogusSwell(audio.now + 0.05);
    this.player.visible = true;
    let t = 0;
    while (t < resolve) {
      const dt = yield; t += dt;
      const k = clamp(t / (resolve * 0.62), 0, 1);
      this.reb.reveal = easeInOut(k);
      this.reb.sketchA = 1 - smooth(clamp((t - resolve * 0.2) / (resolve * 0.5), 0, 1));
      this.reb.light = smooth(clamp((t - resolve * 0.35) / (resolve * 0.65), 0, 1));
      if (k < 1 && Math.random() < 0.6) {
        const p = this.player;
        const yy = p.y - p.height * this.reb.reveal;
        this.parts.add({ kind: 'kivilcim', x: p.x + (Math.random() - 0.5) * 0.5, y: yy, vx: (Math.random() - 0.5) * 0.8, vy: -Math.random() * 0.6, max: 0.9, size: 0.012, col: '#FFE6C8', g: 0.5 });
      }
    }
    this.reb.reveal = 1; this.reb.sketchA = 0; this.reb.light = 1;
    // 4) gözlerini açar
    this.player.anim.emotion = 'normal';
    this.player.anim.blinkV = 1;
    this.player.rim = { color: '#FFE6D2', dx: 1, dy: -0.6, strength: 0.35 };
    yield* wait(1.6);
    yield* tween(1.2, k => { self.player.anim.handsLook = k; });
    yield* this.sayK('Bu... benim ellerim mi?');
    yield* this.sayK('Önceden dört karem vardı. Dört! Yürürken dört kare.');
    yield* this.sayAI('Artık istediğin kadar var.', { pos: 'alt' });
    yield* tween(0.9, k => { self.player.anim.handsLook = 1 - k; });
    // etrafa bakınır
    this.player.anim.emotion = 'saskin';
    yield* tween(0.8, k => { self.player.facingOverride = k > 0.5 ? -1 : 1; });
    yield* wait(0.7);
    this.player.facingOverride = null;
    yield* this.sayK('Ve ışık. Burada ışık var.');
    this.player.anim.emotion = 'normal';
    // 5) dünya aşağıdan yükselerek kurulur
    this.cam.tViewH = 8.4; this.cam.offY = -2.0; this.cam.k = 1.2;
    audio.ambience('ruzgar', 0.5, 6); audio.ambience('yaprak', 0.25, 6);
    this.run((function* () { yield* tween(4, k => { self.introSky = k; self.reb.light = 1 - k * 0.8; }); })());
    for (let i = 0; i < 8; i++) {
      const idx = i;
      this.run((function* () {
        const from = self.rise[idx];
        audio.noise(1.2, { gain: 0.05, type: 'bandpass', freq: 400 + idx * 150, q: 0.6, attack: 0.5, reverb: 0.4 });
        piano([44, 51, 56, 60, 63, 68, 72, 75][idx], audio.now + 0.4, 0.25, { reverb: 0.9 });
        yield* tween(2.4, k => { self.rise[idx] = from * (1 - easeOutBack(k)); });
        self.rise[idx] = 0;
      })());
      yield* wait(0.55);
    }
    yield* wait(1.6);
    // 6) başlık
    host.setTitle('U-108');
    this.reb.on = false;
    this.player.rim = { color: '#FFE2EA', dx: 1, dy: -0.4, strength: 0.6 };
    yield* tween(2.2, k => { self.title.a = k; });
    yield* tween(1.2, k => { self.title.sub = k; });
    music.play('orman', 0.5);
    yield* wait(3.2);
    yield* tween(1.6, k => { self.title.a = 1 - k; self.title.sub = 1 - k; });
    this.cam.k = 3.2; this.cam.lead = 1.6;
    this.intro = false;
    this.controls = true;
    this.run(this.script());
  }

  override draw(ctx: CanvasRenderingContext2D, W: number, H: number) {
    if (!this.reb.on || this.reb.reveal >= 1) { super.draw(ctx, W, H); this.drawRebuild(ctx, W, H); return; }
    // yeniden doğuş sırasında oyuncuyu alttan yukarı açılan maskeyle çiz
    const vis = this.player.visible;
    this.player.visible = false;
    super.draw(ctx, W, H);
    this.player.visible = vis;
    if (vis && this.reb.reveal > 0) {
      const p = this.cam.toScreen(this.player.x, this.player.y, W, H);
      const hpx = this.cam.scale(H) * this.player.height;
      const ry = p.y - hpx * 1.05 * this.reb.reveal;
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.beginPath(); ctx.rect(0, ry, W, H); ctx.clip();
      this.player.draw(ctx, this.cam, W, H);
      ctx.restore();
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
      const g = ctx.createLinearGradient(p.x - hpx * 0.4, 0, p.x + hpx * 0.4, 0);
      g.addColorStop(0, 'rgba(255,220,190,0)'); g.addColorStop(0.5, 'rgba(255,236,210,0.95)'); g.addColorStop(1, 'rgba(255,220,190,0)');
      ctx.fillStyle = g; ctx.fillRect(p.x - hpx * 0.4, ry - 1.5, hpx * 0.8, 3);
      ctx.restore();
    }
    this.drawRebuild(ctx, W, H);
  }

  drawRebuild(ctx: CanvasRenderingContext2D, W: number, H: number) {
    const r = this.reb;
    const p = this.cam.toScreen(this.player.x, this.player.y, W, H);
    const hpx = this.cam.scale(H) * this.player.height;
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (r.on) {
      // ışık konisi ve zemin parıltısı (dünya kurulana dek)
      if (r.light > 0 && this.introSky < 1) {
        const a = r.light * (1 - this.introSky);
        const cone = ctx.createLinearGradient(0, p.y - hpx * 2.6, 0, p.y);
        cone.addColorStop(0, 'rgba(255,235,215,0)'); cone.addColorStop(1, `rgba(255,225,200,${0.16 * a})`);
        ctx.fillStyle = cone;
        ctx.beginPath(); ctx.moveTo(p.x - hpx * 0.15, p.y - hpx * 2.6); ctx.lineTo(p.x + hpx * 0.15, p.y - hpx * 2.6);
        ctx.lineTo(p.x + hpx * 0.75, p.y); ctx.lineTo(p.x - hpx * 0.75, p.y); ctx.closePath(); ctx.fill();
        const fl = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, hpx * 0.8);
        fl.addColorStop(0, `rgba(255,220,190,${0.35 * a})`); fl.addColorStop(1, 'rgba(255,220,190,0)');
        ctx.fillStyle = fl; ctx.save(); ctx.translate(p.x, p.y); ctx.scale(1, 0.18); ctx.translate(-p.x, -p.y);
        ctx.beginPath(); ctx.arc(p.x, p.y, hpx * 0.8, 0, TAU); ctx.fill(); ctx.restore();
      }
      // 2023 düz çizimi
      if (r.oldA > 0) {
        const k = IMG.karakter, sc = hpx / 756;
        ctx.save();
        if (r.scan >= 0) { ctx.beginPath(); ctx.rect(0, 0, W, p.y - hpx * (1 - r.scan) * 1.05 + 2); ctx.clip(); }
        ctx.globalAlpha = r.oldA;
        ctx.drawImage(k, p.x - 803 * sc, p.y - 857 * sc, k.width * sc, k.height * sc);
        ctx.restore();
      }
      // eskiz (kâğıt üstündeki ilk çizim)
      if (r.sketchA > 0) {
        const e = IMG.eskiz, sc = hpx / (468 - 34);
        ctx.save();
        if (r.scan >= 0 && r.scan < 1) { ctx.beginPath(); ctx.rect(0, p.y - hpx * (1 - r.scan) * 1.05, W, H); ctx.clip(); }
        const pg = ctx.createRadialGradient(p.x, p.y - hpx * 0.5, 0, p.x, p.y - hpx * 0.5, hpx * 0.75);
        pg.addColorStop(0, `rgba(255,248,236,${0.14 * r.sketchA})`); pg.addColorStop(1, 'rgba(255,248,236,0)');
        ctx.fillStyle = pg; ctx.fillRect(p.x - hpx, p.y - hpx * 1.3, hpx * 2, hpx * 1.6);
        ctx.globalAlpha = r.sketchA;
        ctx.filter = 'invert(1) brightness(0.95)';
        ctx.drawImage(e, p.x - 130 * sc, p.y - 468 * sc, e.width * sc, e.height * sc);
        ctx.filter = 'none';
        ctx.restore();
      }
      if (r.scan >= 0 && r.scan < 1) {
        const y = p.y - hpx * (1 - r.scan) * 1.05;
        ctx.fillStyle = 'rgba(233,136,111,0.9)';
        ctx.shadowColor = 'rgba(233,136,111,1)'; ctx.shadowBlur = 16;
        ctx.fillRect(p.x - hpx * 0.45, y - 1, hpx * 0.9, 2);
        ctx.shadowBlur = 0;
      }
    }
    // başlık
    if (this.title.a > 0) {
      const s = H / 1080;
      ctx.textAlign = 'center';
      ctx.globalAlpha = this.title.a;
      ctx.fillStyle = '#FFF6F0';
      ctx.shadowColor = 'rgba(80,0,30,0.55)'; ctx.shadowBlur = 30 * s;
      ctx.font = `300 ${150 * s}px ${FONT.serif}`;
      ctx.fillText('U-108', W / 2, H * 0.27);
      ctx.shadowBlur = 0;
      ctx.globalAlpha = this.title.sub;
      ctx.font = `400 ${26 * s}px ${FONT.mono}`;
      ctx.fillText('bir sonraki döngü', W / 2, H * 0.27 + 62 * s);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }
