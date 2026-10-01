# 2023 orijinalinden çıkarılan veriler

Kaynak: `C:\Users\ozcan\Desktop\U-108\U-108_Build_1.1` (Unity 2022.3.4f1, şirket "OUA U108", ürün "Bootcamp Projesinden Kacis").
Okuma: UnityPy + TypeTreeGeneratorAPI (yerel Managed DLL'lerle). Orijinal oyunu **Özcan bilgisayardayken açma**:
pencere öne gelmiyor, ekran yakalama onun ekranını alıyor ve müzik çalıyor.

- Build zamanı: exe değişiklik tarihi **2023-07-18 06:50:16 +03**.
- Sahneler: level0 menü · level1 diyalog · level2 bölüm 1 (Sahne2) · level3 diyalog · level4 bölüm 2 (Sahne3, kenar çarpıştırıcılı)
  · level5 diyalog · level6 laboratuvar (Sahne7, yürünebilir) · level7 jenerik.
- Metinler: `metin2023.json` / `metin2023.txt` (KlavyeEfekti.metin, birebir). Yazı: 0,1 sn/harf, '.' sonrası +1 sn.
- Arayüz: CanvasScaler Sabit Piksel. Diyalog metni Minecraftia 24 px, kutu (23.8, 19.5) 1654x1043; satır ~33,8 px.
  "Devam et" düğmesi merkez (1799, 994) 160x137, metin Early GameBoy 20 px rgb(50,50,50).
  Menü başlığı 04b 108 px beyaz ortalı üstten, üst kenar y=280.5; düğme 463.5x101.2 merkez (952, 685), "Oyuna \nBasla" 40 px.
- Fizik: KarakterKontrol `ziplamakuvveti`=5 (kodda 2), `hiz`=2 (kodda 1); Rigidbody2D g ölçek 1; kapsül 13.94x37.65 ölçek 0.04;
  `PlatformColliderBugFix` sürtünme 0. Kamera karakterin çocuğu, ofset (3.2, 2.0), ortografik 5.
- Animasyon: Idle = Karakter; Yürüme 4 kare 12 kare/sn (0,333 sn döngü); Zıplama = KarakterYurume_0.
- Bölüm geometrisi: `src/story/seviye2023.ts`.
- Müzik `ArkaPlanSesi.mp3`: Fa minör, ~52 BPM, ses 1,0–199,5 sn, sonu 16 sn sessiz.
- Tanıtım sesi (whisper zamanları): "Merhabalar…" 1.9–7.4 · "Hikayemizin temelinde yapay zeka var. Ana karakter bilinç sahibi
  olsaydı…" 13.9–23.8 · "İzlediğiniz ve dinlediğiniz için teşekkürler…" 54.4–58.5. Kimin sesi olduğu bilinmiyor; oyun söylemiyor.
