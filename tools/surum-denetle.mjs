// Sürüm tek bir sayıdır ama dört yerde yazılı: package.json, kabuğun csproj'u, oyunun SURUM sabiti
// (karakter hafızasındaki sürümle bunu karşılaştırır) ve CHANGELOG'un en üstteki sürüm başlığı.
// Biri geride kalırsa oyuncu yanlış sürümü "yeni" sanır ya da exe başka, oyun başka sürüm söyler.
// Bu betik dördünü (ve verilirse etiketi) karşılaştırır; uyuşmazlıkta 1 ile çıkar.
//
// Kullanım: node tools/surum-denetle.mjs                 dört kaynak aynı mı
//           node tools/surum-denetle.mjs v1.0.2          etiket de aynı mı (yayın hattı böyle çağırır)
//           node tools/surum-denetle.mjs v1.0.2 --notlar notlar.md
//                                                        CHANGELOG'daki o sürüm bölümünü dosyaya yazar
import fs from 'node:fs';

const oku = (p) => fs.readFileSync(p, 'utf8');
const bul = (metin, re, ad) => {
  const m = re.exec(metin);
  if (!m) { console.error(`[surum-denetle] ${ad} içinde sürüm bulunamadı`); process.exit(1); }
  return m[1];
};

const changelog = oku('CHANGELOG.md');
const kaynaklar = {
  'package.json': JSON.parse(oku('package.json')).version,
  'host/U108.csproj': bul(oku('host/U108.csproj'), /<Version>([^<]+)<\/Version>/, 'host/U108.csproj'),
  'src/story/surum.ts': bul(oku('src/story/surum.ts'), /export const SURUM\s*=\s*'([^']+)'/, 'src/story/surum.ts'),
  // "## [Unreleased]" varsa atlanır: yayımlanmış en üst sürüm sayılır
  'CHANGELOG.md': bul(changelog, /^## \[(\d+\.\d+\.\d+)\]/m, 'CHANGELOG.md'),
};

const args = process.argv.slice(2);
const etiket = args.find((a) => !a.startsWith('--') && args[args.indexOf(a) - 1] !== '--notlar');
if (etiket) kaynaklar[`etiket ${etiket}`] = etiket.replace(/^v/, '');

const surumler = new Set(Object.values(kaynaklar));
for (const [ad, s] of Object.entries(kaynaklar)) console.log(`  ${s.padEnd(10)} ${ad}`);
if (surumler.size !== 1) {
  console.error('[surum-denetle] Sürümler uyuşmuyor. Hepsini aynı sayıya getir; docs/RELEASE.md adım adım anlatıyor.');
  process.exit(1);
}
const surum = [...surumler][0];
console.log(`[surum-denetle] Hepsi ${surum}.`);

// Yayın notu: elle yazılmış CHANGELOG bölümü, sonradan toplanmış commit başlıkları değil.
const i = args.indexOf('--notlar');
if (i >= 0) {
  const hedef = args[i + 1];
  const satirlar = changelog.split(/\r?\n/);
  const bas = satirlar.findIndex((l) => l.startsWith(`## [${surum}]`));
  let son = satirlar.findIndex((l, k) => k > bas && /^## /.test(l));
  if (son < 0) son = satirlar.length;
  // dosya sonundaki karşılaştırma bağlantıları ([1.0.2]: https://...) nota girmesin
  const ham = satirlar.slice(bas + 1, son).filter((l) => !/^\[[^\]]+\]: /.test(l));
  // CHANGELOG 100 sütunda kırılır; sürüm sayfası tek satır sonunu gerçek satır sonu sayar.
  // Paragrafın ve madde işaretinin devam satırlarını bir önceki satıra ekle.
  const birlesik = [];
  for (const l of ham) {
    const onceki = birlesik[birlesik.length - 1];
    const devam = l.trim() && onceki && onceki.trim() && !/^\s*([-*]\s|#|\||>|```|\d+\.\s)/.test(l) && !/^\s*(#|```|\|)/.test(onceki);
    if (devam) birlesik[birlesik.length - 1] = onceki + ' ' + l.trim();
    else birlesik.push(l);
  }
  const govde = birlesik.join('\n').trim();
  if (bas < 0 || !govde) { console.error(`[surum-denetle] CHANGELOG.md içinde ${surum} bölümü yok ya da boş`); process.exit(1); }
  fs.writeFileSync(hedef, govde + '\n');
  console.log(`[surum-denetle] ${surum} notları → ${hedef} (${govde.split('\n').length} satır)`);
}
