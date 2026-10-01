export default async function ({ page, advance, shot, out }) {
  await advance(1.0);
  const info = await page.evaluate(() => {
    const s = window.__stage; const G = window.__G;
    return { px: s.player.x, py: s.player.y, vis: s.player.visible, alpha: s.player.alpha, camx: s.cam.x, camy: s.cam.y, viewH: s.cam.viewH, W: G.W, H: G.H, grounded: s.player.ctl.body.grounded, scr: s.cam.toScreen(s.player.x, s.player.y, G.W, G.H) };
  });
  console.log(JSON.stringify(info));
  await page.evaluate(() => { window.__G.P.enabled = false; });
  await advance(0.05);
  await shot(out);
}
