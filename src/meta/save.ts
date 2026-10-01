// Karakterin hafızası: %APPDATA%\U-108\hafiza.json (kabukta) ya da localStorage (tarayıcıda).
// Hikâyede "hafıza hediyesi" verilene kadar karakter hatırlamaz; oyun yalnız kaldığı yeri tutar.
import { host } from './host';

export interface Not { t: string; m: string }
export interface Memory {
  surum: 1;
  ilkAcilis: string | null;
  acilislar: number;
  sonAcilis: string | null;
  oncekiAcilis: string | null;
  ilerleme: string;          // kaldığı sahne
  bitti: boolean;
  bitisSayisi: number;
  ad: string | null;
  cumle: string | null;
  hafizaVerildi: boolean;
  notlar: Not[];
  ziyaretSirasi: number;
  olumler: number;
  yarida: boolean;           // sahne ortasında kapatıldı mı
  oyunda: boolean;           // şu an oyunun içinde mi (kapanış tespiti için)
  orijinalVardi: boolean;
  ziyaretSayisi: number;
}

const empty = (): Memory => ({
  surum: 1, ilkAcilis: null, acilislar: 0, sonAcilis: null, oncekiAcilis: null, ilerleme: 'menu2023', bitti: false, bitisSayisi: 0,
  ad: null, cumle: null, hafizaVerildi: false, notlar: [], ziyaretSirasi: 0, olumler: 0, yarida: false, oyunda: false, orijinalVardi: false, ziyaretSayisi: 0,
});

export const mem: Memory = empty();

export async function loadMemory() {
  const qp = new URLSearchParams(location.search);
  if (qp.has('sifirla')) { await host.writeMemory(JSON.stringify(empty())); }
  const raw = await host.readMemory();
  if (raw) {
    try { Object.assign(mem, empty(), JSON.parse(raw)); } catch { /* bozuk dosya: baştan */ }
  }
  // test kipleri
  if (qp.has('bitmis')) { mem.bitti = true; mem.hafizaVerildi = true; mem.ad = mem.ad ?? 'Yüzsekiz'; }
  mem.yarida = mem.oyunda && !mem.bitti; // önceki oturum oyunun ortasında kapandı
  mem.oncekiAcilis = mem.sonAcilis;
  const now = new Date().toISOString();
  mem.ilkAcilis = mem.ilkAcilis ?? now;
  mem.sonAcilis = now;
  mem.acilislar++;
  await saveMemory();
}

/** Hemen yazar: kabuk iletileri sırayla işler, böylece ardından gelen 'kapat' yazmayı kesmez. */
export function saveMemory() {
  return host.writeMemory(JSON.stringify(mem, null, 1));
}

export function note(m: string) {
  mem.notlar.push({ t: new Date().toISOString(), m });
  saveMemory();
}

export function checkpoint(scene: string) {
  mem.ilerleme = scene;
  mem.oyunda = true;
  saveMemory();
}

/** Kabuk kapanmadan önce çağrılır (beforeunload). */
export function markClosed() {
  try { host.writeMemory(JSON.stringify(mem, null, 1)); } catch { /* */ }
}
