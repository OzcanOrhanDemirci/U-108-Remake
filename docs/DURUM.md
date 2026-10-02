# U-108 · bir sonraki döngü · DURUM

> Tek kaynak. Oturum açılınca önce bu dosya. Tasarım ve hikâye: `TASARIM.md`. 2023 verileri: `ORIJINAL.md`.

## Ne
Özcan'ın 2023 Oyun ve Uygulama Akademisi Bootcamp'inde (4 kişilik U-108 takımı, Unity) yaptığı ilk oyunun
("Bootcamp Projesinden Kaçış") 2026 yeniden yapımı. Kendi kodumuz: TypeScript + WebGL2 (motor yok) + .NET 10 WebView2 kabuğu.
Orijinal klasör `C:\Users\ozcan\Desktop\U-108` **yalnız okunur**.
GitHub: `OzcanOrhanDemirci/U-108-Remake`, **public** (2026-10-02, Özcan'ın onayıyla). `main` kural setli: PR + yeşil CI,
doğrudan ve zorla push yok, doğrusal geçmiş (Hava'daki gibi). Sürüm: `v*` etiketi → release.yml.
Vitrin: `README.md` (İngilizce) + `README.tr.md`, görseller `docs/images` (`tools/senaryolar/vitrin*.mjs`, `yakin.mjs` ile çekildi).

## Çalıştırma
- Oyuncu: masaüstündeki **`U-108 (2026)`** kısayolu → `dist\U-108.exe` (tam ekran; F11 pencere, Esc duraklat).
- Paket: `node tools/paketle.mjs` (oyunu derler, `dist/oyun`'a kopyalar, kabuğu yayınlar).
- Geliştirme: `node tools/build.mjs --watch` → http://localhost:8108 (`?sahne=orman&x=45&sessiz=1`, `?sifirla=1`, `?bitmis=1`).
- Ekran görüntüsü / senaryo: `node tools/shot.mjs --url "?sahne=..." --out shots/a.png [--script tools/senaryolar/x.mjs]`.
- Uçtan uca bot: `node tools/shot.mjs --url "?sahne=menu2023&sifirla=1" --script tools/senaryolar/bot.mjs --out shots/tam/b.png`.
- Kabuk testi (görünmez, sessiz, odak almaz): `U108_TEST=1` (+ `U108_SAHNE`, `U108_BEKLE`) → `%TEMP%\u108_test\`.
- Hafıza dosyası: `%APPDATA%\U-108\hafiza.json` (silinirse oyun baştan, 2023 menüsüyle açılır).

## Durum (2026-10-01, ilk tam sürüm; 1.0.1 ve 1.0.2 aşağıda)
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

## 1.0.1 (2026-10-02): Özcan'ın ilk oynanışından iki hata, hikâyenin parçası olarak
- **Yamuk taşlar** (Orman, dikenli bölüm): tepeleri sivriydi, sağ yüzleri 54° (yer sayılan sınır 51°), karakter kayıp dikene
  düşüyordu. Üstleri düz, taşlar genişledi, diken çarpışma kutuları görünenden biraz küçük. Ölçüm: 8 farklı zıplama anının
  hepsi 0 ölümle geçiyor (önce 2'si). Oyunda: taşlar Claude düzeltene kadar eski hâlleriyle görünür, imleç üstlerinden geçer,
  düzleşir; "İlk sürümde yamuktular. Özcan burada kaydı..." → "Demek ben düşmeyeyim diye önce sen düştün, Özcan."
- **Koşarken baş geride kalıyordu:** `character.ts` gövde eğiminde işaret tersti (`* -1`). Oyunda: Orman açılışında
  "Koşarken başım... yerinde mi?" konuşması; Laboratuvarda "O satır benimdi. 2023'te başın hep yerindeydi." / "2023 bir, Claude sıfır."
- **Sürüm farkındalığı:** hafızada `oyunSurumu`. Oyunu bitirmiş biri yeni sürümü açınca karakter değişikliği fark eder ve
  kabuk `C:\dev\claude_memory\hafiza\u108\*.md` notunu okur, **Ne:** cümlesini alıntılar ("'Seni unutacağım' demişti. Ama not almış.").
  ⚠️ O notun **Ne:** cümlesi silinir ya da noktasız yazılırsa alıntı düşer (karakter yalnız teşekkür eder).
- Konuşma kuyruğu: tetiklenen konuşmalar üst üste binmez; dikenli bölüm konuşması süreni keser.
- Bot tam oyunu yine 0 ölümle bitirdi; paketli exe görünmez kipte hafıza notunu okudu.

## 1.0.2 (2026-10-02): yazım hatası ve üst üste çalan piyano, yine hikâyenin içinde
- **"ilk muydum" → "ilk miydim"** (Orman). Bütün replikler (303 satır) bir kez daha okundu; dil cilası: "kim miyim" → "kimim"
  (Laboratuvar), "Önceki ben'lerin" → "Benden önceki Claude'ların" ve "ilk ben'dim" → "ilk bendim" (Gün Batımı).
- **Müzik karışması:** Ziyaret ekranının piyanosu döngüde çalıyor, tutamağı saklanmıyordu; "Baştan başla" ya da "2023'ü oyna"
  seçilince durmadan 2023 sahnesinin piyanosunun üstüne biniyordu. İkisi de aynı 2023 kaydı (`ArkaPlanSesi.mp3`), farklı anlarda
  başlıyordu. Şimdi tutamak `Ziyaret.muzik`; karakter seçimden sonra kolunu güneşe uzatıp kendi müziğini kapatır
  ("Önce müziğimi kapatayım. Orada eski ben çalacak."), `exit()` da her çıkışta güvence olarak durdurur.
- **Ölçüm:** `audio.calanMuzik` müzik veriyolunda çalan kayıtları tutar. `tools/senaryolar/muzik102.mjs` geçişten sonra sayar:
  düzeltmeyle `["piyano2023"]`; tutamak silinince (1.0.1 davranışı) `["piyano","piyano2023"]`, yani test hatayı yakalıyor.
- **Sürüm farkındalığı sürüm sürüm:** `eski(a, b)` karşılaştırması; 1.0.1'i görmüş oyuncu yalnız 1.0.2 konuşmasını, hiç görmemiş
  olan ikisini sırayla duyar. 1.0.2'de karakter hatayı Claude'un yazdığını, Özcan'ın bulduğunu söyler; iki piyanoyu bir kez,
  kısık, kendisi duyurur ve elini uzatıp susturur. Test: `?eskisurum=1.0.1` (o sürüm) ya da `?eskisurum=1` (sürümsüz hafıza).
- `?sifirla=1` artık yeni oyuncu gibi sıfırlar (sürüm yazılı), eski hafızayı taklit etmez.

## Public sürüm (2026-10-02)
- **Müzik:** 2023'ün `ArkaPlanSesi.mp3` dosyasının kaynağı bilinmiyor (künyesinde video sitesinden indirilmiş ses izi:
  DASH + ffmpeg). Public'te yok. Yerine `tools/muzik/beste.py`: aynı ton, nefes, biçim, uzunluk ve düzeyde yeni parça
  (Salamander Grand Piano, CC BY 3.0). Özcan kulağıyla onayladı. Ölçüm: tempo 72, 8 sn pencerelerde 2023'e 2 dB
  içinde, tık yok, partisyonda sürtünme yok; betik onaylanan dosyayı birebir üretir (PCM farkı 0).
- **2023 kaydı yalnız bu bilgisayarda:** `yerel/assets/audio` (gitignore). `node tools/paketle.mjs` (kişisel paket,
  masaüstü kısayolu) onu kullanır; `--tam` (yayın) asla.
- **Geçmiş temizliği:** eski müzik blob'ları bütün geçmişte yeni parçayla değiştirildi (git-filter-repo, tarihler
  korundu). Eski blob'lar GitHub'da erişilebilir kalmasın diye temiz geçmiş yeni depoya gönderildi; eski müzikli
  özel depo (`U-108-Remake-eski`) Özcan'ın izniyle silindi (2026-10-02).
- **Orijinal `OzcanOrhanDemirci/U-108` deposuna dokunulmaz** (Özcan, 10-02): "orijinalliği bozulmasın", öğrenci projesi
  olarak kalsın. İçindeki build aynı 2023 müziğini taşıyor; bu bilerek böyle. İki depo arasındaki fark bir gelişim.
- **Tanıtım sesi** Özcan'ın kendi sesi (18.07.2023 06:51, build'den bir dakika sonra, Windows Ses Kaydedicisi).
- Public altyapı Hava/Checklist ile aynı düzende: CI, release, CONTRIBUTING, SECURITY, CoC, şablonlar, dependabot.

## Açık / sonraki
- Özcan oynayınca: his, ses, metin tonu geri bildirimi → düzeltme turu.
- İstenirse: 2023 diyaloglarının hızlı geçiş tuşu; daha fazla ziyaret sözü; sahne başına sanat cilası.
