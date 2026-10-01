export default async function ({ page, advance, shot, out }) {
  const o = (n) => out.replace(/\.png$/, `_${n}.png`);
  await advance(4); await shot(o('a'));
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press('Space');
    await advance(1.5);
    if ([3, 8, 9, 10, 11, 16, 24, 26, 27, 28, 30, 34].includes(i)) await shot(o('k' + i));
  }
}
