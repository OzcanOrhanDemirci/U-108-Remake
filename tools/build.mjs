// Oyunu public/game.js olarak paketler. --watch ile izler ve http://localhost:8108 üzerinden sunar.
import * as esbuild from 'esbuild';

const watch = process.argv.includes('--watch');
const opts = {
  entryPoints: ['src/main.ts'],
  bundle: true,
  outfile: 'public/game.js',
  format: 'iife',
  target: 'es2022',
  sourcemap: watch ? 'inline' : false,
  minify: !watch,
  logLevel: 'info',
};

if (watch) {
  const ctx = await esbuild.context(opts);
  await ctx.watch();
  const { port } = await ctx.serve({ servedir: 'public', port: 8108 });
  console.log(`http://localhost:${port}`);
} else {
  await esbuild.build(opts);
}

// --dagit: oyunu küçültülmüş derler, public/ klasörünü dist/oyun/ altına kopyalar (kabuk ayrıca: dotnet publish)
if (process.argv.includes('--dagit')) {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const dst = 'dist/oyun';
  fs.rmSync(dst, { recursive: true, force: true });
  fs.cpSync('public', dst, { recursive: true, filter: (src) => !src.endsWith('.map') });
  console.log('oyun kopyalandı →', path.resolve(dst));
}
