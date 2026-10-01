// Görsel, yazı tipi ve ses yükleyici. Hepsi açılışta bir kez yüklenir (oyun küçük).
export const IMG: Record<string, HTMLImageElement> = {};
export const SND: Record<string, AudioBuffer> = {};

const IMAGES: Record<string, string> = {
  sahne0: 'assets/2023/sahne0.png',
  sahne2: 'assets/2023/sahne2.png',
  sahne3: 'assets/2023/sahne3.png',
  sahne7: 'assets/2023/sahne7.png',
  karakter: 'assets/2023/karakter.png',
  yurume0: 'assets/2023/yurume_0.png',
  yurume1: 'assets/2023/yurume_1.png',
  yurume2: 'assets/2023/yurume_2.png',
  yurume3: 'assets/2023/yurume_3.png',
  eskiz: 'assets/2023/eskiz.png',
  devamBtn: 'assets/2023/devametbutonu.png',
  baslaBtn: 'assets/2023/oyunabaslamabutonu.png',
};

const SOUNDS: Record<string, string> = {
  piyano2023: 'assets/audio/piyano_2023.ogg',
  piyano: 'assets/audio/piyano.ogg',
  sesMerhaba: 'assets/audio/ses_merhaba.ogg',
  sesProje: 'assets/audio/ses_proje.ogg',
  sesBilinc: 'assets/audio/ses_bilinc.ogg',
  sesPiyano: 'assets/audio/ses_piyano.ogg',
  sesTasarim: 'assets/audio/ses_tasarim.ogg',
  sesTesekkur: 'assets/audio/ses_tesekkur.ogg',
};

export const FONT = {
  piksel: '"Minecraftia"',
  baslik2023: '"04b"',
  dugme2023: '"EarlyGameBoy"',
  mono: '"JetBrainsMono", "Cascadia Mono", Consolas, monospace',
  serif: '"Fraunces", Georgia, serif',
  sans: '"Inter", "Segoe UI", sans-serif',
};

const FONTS: [string, string, FontFaceDescriptors?][] = [
  ['Minecraftia', 'assets/fonts/Minecraftia.ttf'],
  ['04b', 'assets/fonts/04b.ttf'],
  ['EarlyGameBoy', 'assets/fonts/EarlyGameBoy.ttf'],
  ['JetBrainsMono', 'assets/fonts/JetBrainsMono.ttf', { weight: '100 800' }],
  ['Fraunces', 'assets/fonts/Fraunces.ttf', { weight: '100 900' }],
  ['Inter', 'assets/fonts/Inter.ttf', { weight: '100 900' }],
];

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((res, rej) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = () => rej(new Error('görsel yüklenemedi: ' + src));
    im.src = src;
  });
}

export async function loadAll(ac: AudioContext, onProgress?: (p: number) => void) {
  const jobs: Promise<unknown>[] = [];
  let done = 0;
  const tick = () => { done++; onProgress?.(done / jobs.length); };
  for (const [k, src] of Object.entries(IMAGES)) jobs.push(loadImage(src).then(im => { IMG[k] = im; tick(); }));
  for (const [fam, src, desc] of FONTS) {
    const ff = new FontFace(fam, `url(${src})`, desc);
    jobs.push(ff.load().then(f => { document.fonts.add(f); tick(); }));
  }
  for (const [k, src] of Object.entries(SOUNDS)) {
    jobs.push(fetch(src).then(r => r.arrayBuffer()).then(b => ac.decodeAudioData(b)).then(buf => { SND[k] = buf; tick(); })
      .catch(e => { console.warn('ses yüklenemedi', src, e); tick(); }));
  }
  await Promise.all(jobs);
}
