// Metinlere gerçek dünyadan değerler: gün sayısı, tarih, saat, kullanıcı adı, karakterin adı.
import { BUILD_2023 } from './metin2023';
import { mem } from '../meta/save';
import type { Env } from '../meta/host';

const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const GUNLER = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

export let ENV: Env | null = null;
export function setEnv(e: Env) { ENV = e; }

export function trTarih(d: Date) { return `${d.getDate()} ${AYLAR[d.getMonth()]} ${d.getFullYear()}`; }
export function trSaat(d: Date) { return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; }
export function gunSayisi(now = new Date()) { return Math.floor((now.getTime() - BUILD_2023.getTime()) / 86400000); }

/** Kullanıcı Özcan mı? (Windows kullanıcı adından). Değilse "sen" denir. */
export function isOzcan() {
  const u = (ENV?.user ?? 'ozcan').toLowerCase();
  return u.startsWith('ozcan') || u.startsWith('özcan');
}
export function ozcan() { return isOzcan() ? 'Özcan' : 'sen'; }

export function adi() { return mem.ad && mem.ad.trim() ? mem.ad.trim() : 'U-108'; }

export function gunDilimi(d = new Date()) {
  const h = d.getHours();
  if (h < 5) return 'gece';
  if (h < 11) return 'sabah';
  if (h < 17) return 'gunduz';
  if (h < 21) return 'aksam';
  return 'gece';
}

export function fill(text: string): string {
  const now = new Date();
  return text
    .replace(/\{gun\}/g, String(gunSayisi(now)))
    .replace(/\{tarih\}/g, trTarih(now))
    .replace(/\{saat\}/g, trSaat(now))
    .replace(/\{gunadi\}/g, GUNLER[now.getDay()])
    .replace(/\{ozcan\}/g, ozcan())
    .replace(/\{Ozcan\}/g, isOzcan() ? 'Özcan' : 'Sen')
    .replace(/\{ad\}/g, adi())
    .replace(/\{cumle\}/g, mem.cumle ?? '');
}
