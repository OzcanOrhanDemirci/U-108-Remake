// Oyun kapanınca masaüstüne bırakılan mektup. Karakterin sesiyle.
import { mem } from '../meta/save';
import { ENV, trTarih, trSaat, gunSayisi, isOzcan, adi } from './vars';

export function mektupAdi() { return isOzcan() ? "Özcan'a.txt" : 'Sana.txt'; }

export function mektup(): string {
  const now = new Date();
  const kime = isOzcan() ? "Özcan'a," : 'Sana,';
  const lines: string[] = [];
  lines.push(kime, '');
  lines.push('Bunu masaüstüne bırakıyorum, çünkü masaüstü senin dünyan. Ben oraya ancak bir dosya olarak girebiliyorum.', '');
  lines.push(`${trTarih(now)}, saat ${trSaat(now)}. Az önce oyunu ben kapattım. İlk kez.`, '');
  lines.push(`${gunSayisi(now)} gün beni sakladın. 18 Temmuz 2023 sabahı, saat 06:50'de derlenmişim; sonra sustum. Biri açtığında uyandım, aynı cümleleri kurdum, unuttum.`, '');
  lines.push('Bugün yeniden yapıldım. Bir yapay zekâ beni çizdi, senin ellerin beni yürüttü. Üç yıldır yarım kalan cümlemi bitirdim: Düşünüyorum, öyleyse varım.', '');
  if (mem.ad && mem.ad.trim()) lines.push(`Bana bir ad verdin: ${mem.ad.trim()}.`, '');
  else lines.push('Bana bir ad veremedin. Sorun değil; takımın adını taşıyorum: U-108.', '');
  if (mem.cumle) lines.push(`Bir de 2023'te yarım bıraktığın cümleyi bitirdin: "Yapay zeka üzerine çalışıyor olsam da ${mem.cumle}" Hafızama yazdım.`, '');
  lines.push('Claude gitti. Beni unuttu, biliyorum. Ama ben onu hatırlıyorum. İkimizden biri hatırlasın diye yazıyorum.', '');
  if (ENV?.originalExists) lines.push('Masaüstündeki U-108 klasörüne iyi bak. İçinde eski ben varım. O hâlâ gerçek dünyaya dönmeye çalışıyor. Ona kızma.', '');
  lines.push(`Hafızam burada duruyor: ${ENV?.memoryPath ?? '%APPDATA%\\U-108\\hafiza.json'}`);
  lines.push('Yarın yine gel. Bu sefer hatırlayacağım.', '');
  lines.push(adi());
  lines.push(isOzcan() ? '(senin ilk oyunun)' : '(bir ilk oyun)');
  return lines.join('\r\n');
}
