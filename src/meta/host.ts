// Masaüstü kabuğu (WebView2) ile köprü. Tarayıcıda çalışırken yedek davranışlar devreye girer.
// Kabuk: host/U108.cs — JSON ileti: { id, op, ...args } → { id, ok, data }
export interface Env {
  user: string;            // Windows kullanıcı adı
  displayName: string;     // görünen ad (bulunabilirse)
  now: string;             // ISO
  originalExists: boolean; // Masaüstü\U-108\U-108_Build_1.1\Bootcamp Projesinden Kacis.exe
  originalPath: string;
  originalBuild: string;   // exe değişiklik zamanı ISO
  desktop: string;
  memoryPath: string;
  inHost: boolean;
}

const wv = (window as any).chrome?.webview;
let seq = 0;
const pending = new Map<number, (v: any) => void>();
if (wv) {
  wv.addEventListener('message', (e: any) => {
    const m = e.data;
    const f = pending.get(m.id);
    if (f) { pending.delete(m.id); f(m); }
  });
}

function call(op: string, args: Record<string, unknown> = {}): Promise<any> {
  if (!wv) return Promise.resolve(null);
  const id = ++seq;
  return new Promise(res => {
    pending.set(id, res);
    wv.postMessage({ id, op, ...args });
    setTimeout(() => { if (pending.has(id)) { pending.delete(id); res(null); } }, 4000);
  });
}

const qp = new URLSearchParams(location.search);

export const host = {
  inHost: !!wv,
  async env(): Promise<Env> {
    const r = await call('env');
    if (r?.ok) return { ...r.data, inHost: true };
    // tarayıcı yedeği (geliştirme): Özcan'ın makinesi varsayılır
    return {
      user: qp.get('kullanici') ?? 'ozcan', displayName: '', now: new Date().toISOString(),
      originalExists: qp.get('orijinal') !== '0', originalPath: 'C:\\Users\\ozcan\\Desktop\\U-108\\U-108_Build_1.1\\Bootcamp Projesinden Kacis.exe',
      originalBuild: '2023-07-18T03:50:16Z', desktop: 'C:\\Users\\ozcan\\Desktop', memoryPath: '%APPDATA%\\U-108\\hafiza.json', inHost: false,
    };
  },
  async readMemory(): Promise<string | null> {
    if (wv) { const r = await call('hafizaOku'); return r?.ok ? r.data : null; }
    try { return localStorage.getItem('u108.hafiza'); } catch { return null; }
  },
  async writeMemory(json: string) {
    if (wv) { await call('hafizaYaz', { data: json }); return; }
    try { localStorage.setItem('u108.hafiza', json); } catch { /* */ }
  },
  async writeLetter(name: string, text: string): Promise<string | null> {
    if (wv) { const r = await call('mektup', { name, text }); return r?.ok ? r.data : null; }
    console.log('[mektup]', name, '\n' + text);
    try { localStorage.setItem('u108.mektup', text); } catch { /* */ }
    return null;
  },
  setTitle(t: string) {
    document.title = t;
    call('baslik', { text: t });
  },
  quit() {
    if (wv) { call('kapat'); return; }
    // tarayıcıda: kapanmış gibi göster
    document.body.innerHTML = '';
    document.body.style.background = '#000';
    (window as any).__kapandi = true;
  },
  openOriginal() { return call('orijinaliAc'); },
  /** Claude'un kendi hafıza deposunda bu oyun hakkında not var mı? (C:\dev\claude_memory\hafiza\u108) */
  async claudeHafiza(): Promise<string | null> {
    if (wv) { const r = await call('claudeHafiza'); return r?.ok ? r.data : null; }
    return qp.get('claudenotu');
  },
  fullscreen(on: boolean) { return call('tamEkran', { on }); },
};
