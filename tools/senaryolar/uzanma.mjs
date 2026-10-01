// Otururken uzanma pozu nasıl okunuyor: reach 0 / 0.6 / 1, kameraya bakarak ve bakmadan
export default async function ({ page, advance, shot, out }) {
  const o = (n) => out.replace(/\.png$/, `_${n}.png`);
  for (let i = 0; i < 200 && await page.evaluate(() => window.__G.scene.busy); i++) await advance(0.5);
  for (const [r, look] of [[0, 0], [0.6, 0], [1, 0], [0.6, 1]]) {
    await page.evaluate(([r, look]) => { const s = window.__G.scene; s.busy = true; s.player.anim.reach = r; s.player.camLook = look; }, [r, look]);
    await advance(0.4);
    await shot(o(`r${r}_bak${look}`));
  }
}
