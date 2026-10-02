// Oyunu başsız Chromium'da açar ve ekran görüntüsü alır.
// Kullanım: node tools/shot.mjs --url "?sahne=test-karakter" --out shots/a.png [--t 1.5] [--at 0.5,1,2] [--w 1920 --h 1080]
//           [--script tools/senaryolar/x.mjs]  (sayfa üstünde adım adım işlem: tuş, bekle, çek)
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import * as esbuild from 'esbuild';

const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => {
  if (v.startsWith('--')) a.push([v.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : 'true']);
  return a;
}, []));

const root = path.resolve('public');
if (!args.nobuild) {
  await esbuild.build({ entryPoints: ['src/main.ts'], bundle: true, outfile: 'public/game.js', format: 'iife', target: 'es2022', sourcemap: 'inline', logLevel: 'warning' });
}
const types = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.ogg': 'audio/ogg', '.ttf': 'font/ttf', '.jpg': 'image/jpeg', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  const p = path.join(root, decodeURIComponent(req.url.split('?')[0]).replace(/^\/$/, '/index.html'));
  fs.readFile(p, (err, data) => {
    if (err) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': types[path.extname(p)] || 'application/octet-stream' });
    res.end(data);
  });
});
await new Promise(r => server.listen(0, r));
const port = server.address().port;

const W = +(args.w || 1920), H = +(args.h || 1080);
// GPU'suz makinede (CI koşucusu) WebGL2 için yazılım çizicisi ve sahte ses çıkışı: U108_YAZILIM=1.
// Ses aygıtı olmayan makinede de AudioContext saati ilerlesin diye ses çıkışı sahteye bağlanır.
const yazilim = process.env.U108_YAZILIM === '1';
const cizici = yazilim ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-audio-output'] : ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'];
const browser = await chromium.launch({ headless: true, args: [...cizici, '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
const logs = [];
page.on('console', m => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', e => logs.push(`[pageerror] ${e.message}`));
const q = args.url || '';
const sep = q.includes('?') ? '&' : '?';
await page.goto(`http://localhost:${port}/index.html${q}${args.live ? '' : sep + 'sabit=1'}`);
await page.waitForFunction(() => window.__hazir === true, null, { timeout: 30000 });

const out = args.out || 'shots/shot.png';
fs.mkdirSync(path.dirname(out), { recursive: true });

// Sabit adım: oyun döngüsünü durdurup elle ilerlet (tekrarlanabilir kareler)
async function advance(seconds) {
  await page.evaluate(async (s) => {
    const G = window.__G; G.paused = true;
    const n = Math.round(s * 60);
    for (let i = 0; i < n; i++) G.step(1 / 60);
  }, seconds);
}

const ctx = { page, advance, out, shot: async (file) => { await page.screenshot({ path: file }); console.log('kaydedildi', file); } };

if (args.script) {
  const mod = await import(path.resolve(args.script).replace(/\\/g, '/').replace(/^([A-Z]):/, 'file:///$1:'));
  await mod.default(ctx, args);
} else if (args.at) {
  let prev = 0;
  const times = args.at.split(',').map(Number);
  for (const [i, t] of times.entries()) {
    await advance(t - prev); prev = t;
    await ctx.shot(out.replace(/\.png$/, `_${String(i).padStart(2, '0')}.png`));
  }
} else {
  await advance(+(args.t || 0.5));
  await ctx.shot(out);
}
if (logs.length) console.log(logs.slice(-30).join('\n'));
// Sayfada yakalanmamış bir hata olduysa kareler yine kaydedilir ama çıkış kodu 1 olur: testler ve CI bunu görsün.
if (logs.some((l) => l.startsWith('[pageerror]'))) process.exitCode = 1;
await browser.close();
server.close();
