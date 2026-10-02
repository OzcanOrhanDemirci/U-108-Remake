// Okunan belgelerde uzun çizgi (U+2014) ve kısa çizgi (U+2013) yok: yerine virgül, iki nokta, noktalı virgül,
// parantez ya da düz tire. Özcan'ın yazım kuralı; Mobil_App_Check_List'teki check-em-dash.mjs'in bu depodaki karşılığı.
//
// Kapsam: deponun dışa dönük belgeleri, yani kökteki ve docs/ altındaki Markdown dosyaları, .github altındaki
// Markdown ve YAML (issue ve PR şablonları kullanıcıya görünür), yazı tipi künyesi.
// Kapsam dışı, bilerek:
//   docs/TASARIM.md, docs/DURUM.md, docs/ORIJINAL.md  iç çalışma belgeleri; replik alıntıları (uzun çizgiyle kesilen "va") burada birebir durur
//   *-OFL.txt                                         lisans metinleri; üçüncü tarafın metni değiştirilmez
// CODE_OF_CONDUCT.md resmî Contributor Covenant 2.1 metnidir; içinde çizgi olmadığı için kapsamda kalır.
// Biri eklenirse metni değiştirmek yerine buraya gerekçesiyle hariç yazılmalı.
//
// Kullanım: node tools/denetle-tire.mjs        (bulursa dosya:satır yazar, 1 ile çıkar)
import fs from 'node:fs';
import path from 'node:path';

const HARIC = new Set(['docs/TASARIM.md', 'docs/DURUM.md', 'docs/ORIJINAL.md']);
// U+2013 ve U+2014, kod noktasıyla: kaynakta çizginin kendisi durmasın
const CIZGILER = new RegExp('[' + String.fromCharCode(0x2013, 0x2014) + ']');

const hedefler = [];
const ekle = (p) => { const r = p.split(path.sep).join('/'); if (!HARIC.has(r)) hedefler.push(r); };
for (const f of fs.readdirSync('.')) if (f.endsWith('.md')) ekle(f);
if (fs.existsSync('docs')) for (const f of fs.readdirSync('docs')) if (f.endsWith('.md')) ekle(path.join('docs', f));
const gez = (d) => {
  if (!fs.existsSync(d)) return;
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) gez(p);
    else if (/\.(md|ya?ml)$/.test(e.name)) ekle(p);
  }
};
gez('.github');
ekle(path.join('public', 'assets', 'fonts', 'licenses', 'README.md'));

let toplam = 0;
for (const f of hedefler) {
  const satirlar = fs.readFileSync(f, 'utf8').split(/\r?\n/);
  satirlar.forEach((l, i) => {
    if (CIZGILER.test(l)) { toplam++; console.error(`  ${f}:${i + 1}  ${l.trim().slice(0, 160)}`); }
  });
}
if (toplam) {
  console.error(`[denetle-tire] ${toplam} satırda uzun ya da kısa çizgi var. Virgül, iki nokta, noktalı virgül, parantez ya da düz tire kullan.`);
  process.exit(1);
}
console.log(`[denetle-tire] ${hedefler.length} belgede uzun ya da kısa çizgi yok.`);
