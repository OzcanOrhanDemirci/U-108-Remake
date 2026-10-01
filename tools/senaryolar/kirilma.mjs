// Kırılma sahnesini kare kare çeker; konuşmayı Boşluk ile ilerletir.
export default async function ({ page, advance, shot, out }) {
  const o = (n) => out.replace(/\.png$/, `_${n}.png`);
  await advance(0.5); await shot(o('a_donuk'));
  await advance(6); await shot(o('b_dokulme'));
  await advance(5); await shot(o('c_tarih'));
  await advance(9); await shot(o('d_karanlik'));
  for (let i = 0; i < 26; i++) {
    await page.keyboard.press('Space');
    await advance(1.6);
    if (i % 4 === 1) await shot(o('e_konusma' + i));
  }
}
