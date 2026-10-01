// Tam paket: oyunu derle → dist/oyun, kabuğu yayınla → dist/U-108.exe, gereksiz xml'leri at.
import { execSync } from 'node:child_process';
import fs from 'node:fs';
execSync('node tools/build.mjs --dagit', { stdio: 'inherit' });
execSync('dotnet publish host/U108.csproj -c Release -o dist -v quiet -nologo', { stdio: 'inherit' });
for (const f of fs.readdirSync('dist')) if (f.endsWith('.xml') || f.endsWith('.pdb')) fs.rmSync('dist/' + f);
console.log('paket hazır:', fs.readdirSync('dist').join(', '));
