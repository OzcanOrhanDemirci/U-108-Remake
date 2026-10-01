// Oyunun sürümü. Karakter hafızasındaki sürümle karşılaştırır: değiştiyse dünyasının değiştiğini fark eder.
export const SURUM = '1.0.2';

/** a, b'den eski mi? ('1.0.1' < '1.0.2'; null en eski) */
export function eski(a: string | null, b: string) {
  if (!a) return true;
  const x = a.split('.').map(Number), y = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) { if ((x[i] ?? 0) !== (y[i] ?? 0)) return (x[i] ?? 0) < (y[i] ?? 0); }
  return false;
}
