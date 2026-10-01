import { G, params } from './game';
import { audio } from './core/audio';
import { music, dogusSwell } from './core/music';
import { loadAll } from './core/assets';
import { testKarakter } from './scenes/test_karakter';
import { ikon } from './scenes/ikon';
import { testKosu } from './scenes/test_kosu';
import { menu2023, diyalog2023, bolum2023 } from './scenes/eski2023';
import { orman } from './scenes/orman';
import { kirilma } from './scenes/kirilma';
import { karanlik } from './scenes/karanlik';
import { sonbahar } from './scenes/sonbahar';
import { laboratuvar } from './scenes/laboratuvar';
import { gunbatimi } from './scenes/gunbatimi';
import { ziyaret } from './scenes/ziyaret';
import { mem, markClosed } from './meta/save';
import { pauseInit } from './ui/duraklat';
import { World, Controller2023 } from './world/physics';
import { BOLUM1, BOLUM2, SIYAH_W, SIYAH_H } from './story/seviye2023';
import { loadMemory } from './meta/save';
import { host } from './meta/host';
import { setEnv } from './story/vars';

// test araçları için (planlayıcı, bot)
(window as any).__fizik = { World, Controller2023, BOLUM1, BOLUM2, SIYAH_W, SIYAH_H };
(window as any).__ses = { audio, music, dogusSwell };

async function boot() {
  G.init();
  audio.init();
  G.register('test-karakter', testKarakter);
  G.register('ikon', ikon);
  G.register('test-kosu', testKosu);
  G.register('menu2023', menu2023);
  G.register('diyalog2023', diyalog2023);
  G.register('bolum2023', bolum2023);
  G.register('orman', orman);
  G.register('kirilma', kirilma);
  G.register('karanlik', karanlik);
  G.register('sonbahar', sonbahar);
  G.register('laboratuvar', laboratuvar);
  G.register('gunbatimi', gunbatimi);
  G.register('ziyaret', ziyaret);
  await loadAll(audio.ctx);
  setEnv(await host.env());
  await loadMemory();
  (window as any).__hazir = true;
  window.addEventListener('beforeunload', () => markClosed());
  pauseInit();
  let s = params.get('sahne');
  let arg: any = undefined;
  if (params.get('arg')) arg = JSON.parse(params.get('arg')!);
  if (!s) {
    const yeni = ['orman', 'karanlik', 'sonbahar', 'laboratuvar', 'gunbatimi'];
    if (mem.bitti && mem.ilerleme !== 'menu2023') s = 'ziyaret';
    else if (yeni.includes(mem.ilerleme)) { s = mem.ilerleme; arg = { devam: true }; }
    else s = 'menu2023';
  }
  G.go(s, arg);
  G.start();
  if (location.hash === '#kabuktesti') kabukTesti();
}

/** Kabuk köprüsünü sınar ve sonucu kabuğa bildirir (yalnız U108_TEST kipinde). */
async function kabukTesti() {
  const env = await host.env();
  const once = await host.readMemory();
  await host.writeMemory(JSON.stringify({ test: 'yazildi', zaman: new Date().toISOString() }));
  const sonra = await host.readMemory();
  const mektup = await host.writeLetter('test-mektup.txt', 'Merhaba Özcan.\r\nTürkçe: ğüşıöç İĞÜŞÖÇ');
  const gl = !!document.createElement('canvas').getContext('webgl2');
  (window as any).chrome?.webview?.postMessage({ id: 0, op: 'testSonuc', data: { env, oncekiHafizaVar: !!once, yazOkuTamam: !!sonra && sonra.includes('yazildi'), mektup, webgl2: gl, fontlar: document.fonts.size, hazir: (window as any).__hazir === true, sahne: (window as any).__sahne } });
}

boot().catch(e => {
  console.error(e);
  document.body.style.color = '#fff';
  document.body.textContent = 'Hata: ' + e.message;
});
