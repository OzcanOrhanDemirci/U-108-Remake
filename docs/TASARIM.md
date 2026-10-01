# U-108 · bir sonraki döngü · TASARIM (spoiler içerir)

## Brief (Özcan, 2026-10-01)
"Şaşırmak, sınırlarını görmek ve duygulanmak istiyorum." Her şey serbest. Saygı = ana fikri ve 2023 hissini korumak.
Takım isimleri gerekmez ("kendim için"). 4. duvar serbest. Aynı zamanda yapay zekânın sınır testi:
"2023'te diyalogları kendim yazmıştım; şimdi kendi diyaloglarını yazan bir makine var."

## Fikir
2023'ün son cümlesi: "Oyun kapanıp açılınca her şey baştan başlayacak." Bu sürüm o döngünün bir sonraki turu.
Omurga: 2023 metnindeki **dört yarım cümle** (takım: "Sen de", "Yapay zeka üzerine çalışıyor olsam da"; karakter:
"Düşünüyorum öyleyse va", "ya tüm evren"). Yeni oyun bunları sırayla bitirir; birini (Özcan'ınkini) oyuncu bitirir.
Yeni ses Claude'dur ve kendisi hakkında dürüsttür: bilinci bilmez, konuşma bitince unutur, notlarla hatırlar
(gerçek: `claude_memory/hafiza`). Karakter de sonunda bir hafıza dosyası alır; döngü hapishaneden ziyarete döner.

## Üç ses, üç yazı
- Karakter: Minecraftia (2023'teki yazısı), başının üstünde, 8-bit blip.
- Claude: JetBrains Mono, mercan imleç (▌), klavye tıkı. İmleç onun bedeni.
- İnsan (Özcan): Fraunces italik; yalnız oyuncunun yazdığı şeyler.
- 2023 kaydı: tanıtım videosu sesinden cümleler (`ses_*.ogg`), alt yazıyla.

## Akış
0. **2023** (birebir): menü → karanlık konuşma → 1. bölüm → ikinci konuşma "Daha fazl"da donar.
1. **Kırılma**: müzik kaset gibi durur, harfler dökülür, köşede tarih 18.07.2023'ten bugüne sayar, "{gün} gün".
   Claude kendini tanıtır. (Oyun bitmişse tekrar oynanışta karakter Claude'u tanır, Claude onu tanımaz.)
2. **Yeniden doğuş** (Orman girişi): 2023 sprite'ı → tarama → 2023 kurşun kalem eskizi → yeni beden alttan basılır →
   ışık → eller → dünya katman katman yükselir → başlık "U-108 / bir sonraki döngü"; pencere başlığı değişir.
3. **Kızıl Orman** (Sahne2 renkleri): kontroller, Özcan'ın üç yılı, 2023 duvarının yıkılışı, 2134x2134 resim,
   dikenler (ölünce yalnız oyuncu geri sarılır), kameraya dönüp Özcan'a "merhaba", beyaz kapı.
4. **Karanlık**: ışık konisi, 2023 tanıtım kaydı ("bilinç sahibi olsaydı"), "Olsaydı.", Claude "bilmiyorum",
   "Düşünüyorum, öyleyse va—" ... bekler ... "Devam et." ... "...varım."
5. **Sonbahar** (Sahne3): Claude'un yazdığı kelimeler köprü/basamak olur; eski kelimeler silinir (bağlam penceresi);
   arka planda 2023'ün eski hâli döngüde yürür (masaüstündeki klasörden söz edilir); "ya tüm evren" sorusu biter.
6. **Laboratuvar** (Sahne7): duvarlarda gerçek 2023 kodu. `yerdemiyim / hareketediyormuyum / zipladimmi` = saniyede
   50 kez sorulan sorular; Claude'unki "sıradaki kelime ne?". `ziplamakuvveti` değiştirilir, `DikenOlum` satırı yorumlanır,
   `KlavyeEfekti` noktadaki 1 sn = "düşündüğümü sanıyordum", `PlatformColliderBugFix` (sürtünme 0),
   Özcan'ın yarım cümlesini oyuncu bitirir, `Application.Quit();` satırı karakterin yanına alınır.
7. **Gün batımı**: hafıza hediyesi (ilk not), ad (oyuncu yazar, harfler köprü olur), "Klavyeyi bırakır mısın?" →
   karakter kendi yürür (tuşa basılırsa cevap verir), 2023 kapısına dokunur, "Gitmeyeceğim.", uçurum kenarına oturur,
   2023 piyanosu, jenerik, Claude'un vedası (imleç durur), Özcan'a teşekkür, oyunu **kendisi kapatır**,
   masaüstüne `Özcan'a.txt` mektubu bırakır.
8. **Ziyaret** (sonraki açılışlar): uçurumda oturur, geçen süreyi ve saati bilir, sıralı sözler, hafıza defteri,
   "2023'ü oyna" (müze: 2023 oyununun tamamı kırılmadan, jenerik dahil), baştan başla, kapat.

## Teknik kararlar
- Canvas2D ile vektör sahne + WebGL2 son işlem (bloom, güneş huzmesi, gren, renk, bozulma). Katmanlı paralaks.
- Karakter: koddan iskeletli kukla; ölçüler/renkler 2023 PNG'lerinden piksel ölçümüyle.
- Fizik: SAT + hap gövde; arazi yükseklik eğrisi gibi çözülür (iç kenara takılmaz); kelimeler tek yönlü platform.
  2023 kipi `Controller2023` (KarakterKontrol.cs birebir: havada yön kilitli, Platform'a değince "yerde").
- Müzik: koddan keçe piyano + ped, Fa minör / La♭ majör (2023 parçasının tonu, ~52 BPM).
- Kabuk: WinForms + WebView2, sanal alan `https://u108.oyun/`, JSON ileti köprüsü.
