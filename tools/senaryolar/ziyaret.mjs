export default async function ({ page, advance, shot, out }) {
  const o = (n) => out.replace(/\.png$/, `_${n}.png`);
  await advance(3); await shot(o('a_selam'));
  await advance(8); await shot(o('b_menu'));
  await page.keyboard.press('Enter'); await advance(4); await shot(o('c_otur'));
  await advance(8);
  await page.keyboard.press('ArrowDown'); await advance(0.3); await page.keyboard.press('Enter'); await advance(1); await shot(o('d_hafiza'));
  await page.keyboard.press('Escape'); await advance(1);
  await page.keyboard.press('Escape'); await advance(0.6); await shot(o('e_duraklat'));
}
