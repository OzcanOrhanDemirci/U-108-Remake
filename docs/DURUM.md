# U-108 · bir sonraki döngü · DURUM

> Tek kaynak. Oturum açılınca önce bu dosya. Tasarım ve hikâye: `TASARIM.md`. 2023 verileri: `ORIJINAL.md`.

## Ne
Özcan'ın 2023 Oyun ve Uygulama Akademisi Bootcamp'inde (4 kişilik U-108 takımı, Unity) yaptığı ilk oyunun
("Bootcamp Projesinden Kaçış") 2026 yeniden yapımı. Kendi kodumuz: TypeScript + WebGL2 (motor yok) + .NET 10 WebView2 kabuğu.
Orijinal klasör `C:\Users\ozcan\Desktop\U-108` **yalnız okunur**. GitHub'a gitmez.

## Çalıştırma
- Oyuncu: masaüstündeki **`U-108 (2026)`** kısayolu → `dist\U-108.exe` (tam ekran; F11 pencere, Esc duraklat).
- Paket: `node tools/paketle.mjs` (oyunu derler, `dist/oyun`'a kopyalar, kabuğu yayınlar).
- Geliştirme: `node tools/build.mjs --watch` → http://localhost:8108 (`?sahne=orman&x=45&sessiz=1`, `?sifirla=1`, `?bitmis=1`).
- Ekran görüntüsü / senaryo: `node tools/shot.mjs --url "?sahne=..." --out shots/a.png [--script tools/senaryolar/x.mjs]`.
- Uçtan uca bot: `node tools/shot.mjs --url "?sahne=menu2023&sifirla=1" --script tools/senaryolar/bot.mjs --out shots/tam/b.png`.
- Kabuk testi (görünmez, sessiz, odak almaz): `U108_TEST=1` (+ `U108_SAHNE`, `U108_BEKLE`) → `%TEMP%\u108_test\`.
- Hafıza dosyası: `%APPDATA%\U-108\hafiza.json` (silinirse oyun baştan, 2023 menüsüyle açılır).

## Durum (2026-10-01, ilk tam sürüm)
Tamam ve doğrulandı:
- 2023 açılışı birebir: menü, diyaloglar, 1. bölüm. Geometri, fizik (hız 2, zıplama 5, g 9,81, 50 Hz), yazı hızı
  (0,1 sn/harf, noktada +1 sn), düğme ve yazı yerleşimleri build'den UnityPy ile okundu.
- 2023 bölümlerinin bu taklitte bitirilebilirliği arama ile kanıtlandı (`plan2023.mjs`: 1. bölüm 13,2 sn, 2. bölüm 16,8 sn).
- Kırılma, yeniden doğuş, Orman, Karanlık, Sonbahar, Laboratuvar, Gün Batımı, Ziyaret, 2023 müzesi, duraklatma.
- **Bot oyunu menüden finale hiç ölmeden bitirdi** (~10,5 dk bot süresi; insan okuyarak ~20-25 dk), oyun kendini kapattı,
  mektup ve hafıza doğru yazıldı ("Yüzsekiz", Türkçe harfler).
- Kabuk köprüsü: ortam, hafıza oku/yaz, mektup, orijinal build'i bulma (06:50:16) görünmez testte geçti.
- Performans (1440p, gerçek GPU senkronu): kare başına ortanca 2-4,6 ms; ilk kare dışında sıçrama yok.
- Ses seviyeleri çevrimdışı render ile ölçüldü: müzik ~-28..-32 dB RMS (2023 kaydı -27,9), kırpma yok.

Doğrulanmadı (Özcan'da):
- **Ses ve müziğin kulağa nasıl geldiği** (Claude duyamaz; yalnız seviye ölçüldü).
- **Oynanış hissi** (zıplama, hız, zorluk). Dere 2,0 birim, dikenler 1,6 birim; kelime basamakları üst üste biniyor.
- Gerçek ekranda (2560x1440, gerçek WebView2 tam ekran) görüntü: yalnız başsız Chromium ve görünmez kabuk görüntüsü alındı.
- Gerçek Türkçe Q klavyeyle isim yazma (gizli `<input>` ile; test yolu sentetik).
- Oyun bittikten sonraki ziyaretlerin uzun vadeli akışı (12 sıralı söz + döngü).

## Açık / sonraki
- Özcan oynayınca: his, ses, metin tonu geri bildirimi → düzeltme turu.
- İstenirse: 2023 diyaloglarının hızlı geçiş tuşu; daha fazla ziyaret sözü; sahne başına sanat cilası.
