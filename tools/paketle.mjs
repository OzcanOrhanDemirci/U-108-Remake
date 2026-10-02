// Tam paket: oyunu derle → dist/oyun, kabuğu yayınla → dist/U-108.exe, gereksiz xml'leri at.
//
// node tools/paketle.mjs          Özcan'ın kendi paketi: .NET 10 çalışma zamanına bağlı, küçük exe.
//                                 Varsa gitignore'lu yerel/ klasörü dist/oyun üstüne kopyalanır
//                                 (ör. yerel/assets/audio/*.ogg: depoya girmeyen 2023 müziği yalnız bu bilgisayarda kalır).
// node tools/paketle.mjs --tam    Yayın paketi: çalışma zamanı exe'nin içinde (self-contained, win-x64, sıkıştırılmış),
//                                 dist/U-108-Remake-<sürüm>-win-x64.zip ve yanında .sha256. yerel/ BİLEREK uygulanmaz:
//                                 yayın yalnız depodaki içerikten çıkar, kimsenin bilgisayarındaki dosyaya bağlı değildir.
import { execSync, execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const tam = process.argv.includes('--tam');
const surum = JSON.parse(fs.readFileSync('package.json', 'utf8')).version;

// yayın paketi temiz bir klasörden çıkar: önceki bir yayının artığı zip'e karışmasın
if (tam) fs.rmSync('dist', { recursive: true, force: true });

execSync('node tools/build.mjs --dagit', { stdio: 'inherit' });

if (!tam && fs.existsSync('yerel')) {
  fs.cpSync('yerel', 'dist/oyun', { recursive: true });
  console.log('yerel/ dist/oyun üstüne kopyalandı');
}

const yayin = tam
  ? 'dotnet publish host/U108.csproj -c Release -o dist -r win-x64 --self-contained true -p:PublishSingleFile=true -p:EnableCompressionInSingleFile=true -v quiet -nologo'
  : 'dotnet publish host/U108.csproj -c Release -o dist -v quiet -nologo';
execSync(yayin, { stdio: 'inherit' });
for (const f of fs.readdirSync('dist')) if (f.endsWith('.xml') || f.endsWith('.pdb')) fs.rmSync('dist/' + f);
console.log('paket hazır:', fs.readdirSync('dist').join(', '));

if (tam) {
  // zip'in içinde tek bir üst klasör: açan kişi masaüstüne dağınık dosya değil, bir klasör alır
  const ad = `U-108-Remake-${surum}-win-x64`;
  const sahne = path.join('dist', 'paket', ad);
  fs.mkdirSync(sahne, { recursive: true });
  fs.copyFileSync('dist/U-108.exe', path.join(sahne, 'U-108.exe'));
  fs.cpSync('dist/oyun', path.join(sahne, 'oyun'), { recursive: true });
  for (const f of ['LICENSE', 'NOTICE', 'README.md', 'README.tr.md', 'CHANGELOG.md']) fs.copyFileSync(f, path.join(sahne, f));

  // .NET'in kendi zip yazıcısı: girdi yolları her işletim sisteminde açılabilen '/' ayraçlı olur
  const zip = path.resolve('dist', `${ad}.zip`);
  const komut = `Add-Type -AssemblyName System.IO.Compression.FileSystem; [IO.Compression.ZipFile]::CreateFromDirectory('${path.resolve(sahne)}', '${zip}', [IO.Compression.CompressionLevel]::Optimal, $true)`;
  let kabuk = 'pwsh';
  try { execFileSync(kabuk, ['-NoProfile', '-Command', '$PSVersionTable.PSVersion'], { stdio: 'ignore' }); } catch { kabuk = 'powershell'; }
  execFileSync(kabuk, ['-NoProfile', '-NonInteractive', '-Command', komut], { stdio: 'inherit' });
  fs.rmSync(path.join('dist', 'paket'), { recursive: true, force: true });

  const ozet = crypto.createHash('sha256').update(fs.readFileSync(zip)).digest('hex');
  fs.writeFileSync(`${zip}.sha256`, `${ozet}  ${path.basename(zip)}\n`);
  console.log(`yayın paketi: ${path.relative('.', zip)} (${(fs.statSync(zip).size / 1048576).toFixed(1)} MB)`);
  console.log(`SHA-256: ${ozet}`);
}
