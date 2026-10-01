p = 'src/world/physics.ts'
s = open(p, encoding='utf8').read()
def rep(a, b):
    global s
    assert a in s, a[:50]
    s = s.replace(a, b)
rep("""  solid?: boolean;     // false: yalnız tehlike/tetik
}""", """  solid?: boolean;     // false: yalnız tehlike/tetik
  /** Arazi parçası: yalnız üst çizgisi (a→b) zemin sayılır; yan kenarları iç kenardır, takılmaz. */
  seg?: { ax: number; ay: number; bx: number; by: number };
}""")
rep("""      out.push(this.add([{ x: a.x, y: a.y }, { x: b.x, y: b.y }, { x: b.x, y: bottom }, { x: a.x, y: bottom }], o));""",
    """      out.push(this.add([{ x: a.x, y: a.y }, { x: b.x, y: b.y }, { x: b.x, y: bottom }, { x: a.x, y: bottom }], { ...o, seg: { ax: a.x, ay: a.y, bx: b.x, by: b.y } }));""")
rep("""      if (c.x0 > bx1 || c.x1 < bx0 || c.y0 > by1 || c.y1 < by0) continue;
      const m = sat(b.shape(), c.pts);""", """      if (c.x0 > bx1 || c.x1 < bx0 || c.y0 > by1 || c.y1 < by0) continue;
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
      const m = sat(b.shape(), c.pts);""")
open(p, 'w', encoding='utf8').write(s)
print('tamam')
