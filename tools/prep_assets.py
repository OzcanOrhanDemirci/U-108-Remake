"""Orijinal 2023 klasöründen (yalnız okunur) oyunun kullandığı varlıkları üretir.
Kaynak: C:/Users/ozcan/Desktop/U-108 (dokunulmaz). Çıktı: public/assets/2023 ve public/assets/audio.
2023 arka plan müziğinin (ArkaPlanSesi.mp3) kaynağı bilinmiyor; depoya ve yayın paketine girmez. Yalnız gitignore'lu
yerel/assets/audio klasörüne yazılır ve tools/paketle.mjs onu yalnız bu bilgisayardaki kişisel pakete koyar.
Depodaki piyano.ogg ve piyano_2023.ogg, yerine yazılan yeni parçadır: tools/muzik."""
import os, subprocess
from PIL import Image
import numpy as np

SRC = r"C:/Users/ozcan/Desktop/U-108"
OUT = os.path.join(os.path.dirname(__file__), "..", "public", "assets")
O23 = os.path.join(OUT, "2023"); OAU = os.path.join(OUT, "audio")
YEREL = os.path.join(os.path.dirname(__file__), "..", "yerel", "assets", "audio")
os.makedirs(YEREL, exist_ok=True)
os.makedirs(O23, exist_ok=True); os.makedirs(OAU, exist_ok=True)
A = os.path.join(SRC, "Assets")

# Sahne görselleri birebir
for n in ["Sahne0", "Sahne2", "Sahne3", "Sahne7"]:
    Image.open(os.path.join(A, n + ".png")).convert("RGB").save(os.path.join(O23, n.lower() + ".png"), optimize=True)

# Karakter: 8000x4500 tuval, Unity'de pivot merkez. Aynı tuvali 1/5 ölçekle koru (pivot korunur).
SC = 5
k = Image.open(os.path.join(A, "Karakter.png")).convert("RGBA")
k.resize((k.width // SC, k.height // SC), Image.LANCZOS).save(os.path.join(O23, "karakter.png"), optimize=True)
y = Image.open(os.path.join(A, "KarakterYurume.png")).convert("RGBA")
ya = np.array(y)[..., 3] > 128
cols = np.where(ya.any(0))[0]
gaps = np.where(np.diff(cols) > 40)[0]
starts = [cols[0]] + [cols[g + 1] for g in gaps]; ends = [cols[g] for g in gaps] + [cols[-1]]
# Unity'deki gibi: her kare sıkı kırpılır, pivot kırpının ortası (sharedassets2: KarakterYurume_0..3, pivot 0.5)
for i, (s, e) in enumerate(zip(starts, ends)):
    rows = np.where(ya[:, s:e + 1].any(1))[0]
    crop = y.crop((s, rows.min(), e + 1, rows.max() + 1))
    crop.resize((max(1, crop.width // SC), max(1, crop.height // SC)), Image.LANCZOS).save(os.path.join(O23, f"yurume_{i}.png"), optimize=True)

# 2023 eskizi (U108Animation.jpg): sol üstteki ayakta duran figür
sk = Image.open(os.path.join(A, "U108Animation.jpg")).convert("L")
w, h = sk.size
fig = sk.crop((0, 0, int(w * 0.16), int(h * 0.54)))
arr = np.array(fig).astype(np.float32)
alpha = np.clip((235 - arr) / 200, 0, 1)  # kâğıt beyazı saydam, çizgi opak
rgba = np.zeros(arr.shape + (4,), np.uint8); rgba[..., 0:3] = 30; rgba[..., 3] = (alpha * 255).astype(np.uint8)
Image.fromarray(rgba).save(os.path.join(O23, "eskiz.png"), optimize=True)
sk.save(os.path.join(O23, "eskiz_tam.png"))

# Butonlar
for n in ["DevamEtButonu", "OyunaBaslamaButonu"]:
    Image.open(os.path.join(A, n + ".png")).save(os.path.join(O23, n.lower() + ".png"))

def ff(*args):
    subprocess.run(["ffmpeg", "-v", "error", "-y", *args], check=True)

pia = os.path.join(A, "ArkaPlanSesi.mp3")
ff("-i", pia, "-c:a", "libvorbis", "-q:a", "6", os.path.join(YEREL, "piyano_2023.ogg"))
ff("-ss", "0.9", "-to", "201.0", "-i", pia, "-af", "afade=t=out:st=197.5:d=2.6", "-c:a", "libvorbis", "-q:a", "7", os.path.join(YEREL, "piyano.ogg"))
ses = os.path.join(SRC, "U-108 Oyun Tanıtımı - Ses.m4a")
for name, a, b in [("ses_merhaba", 1.55, 7.45), ("ses_proje", 8.30, 13.20), ("ses_bilinc", 13.70, 23.95),
                   ("ses_piyano", 24.40, 32.50), ("ses_tasarim", 45.05, 54.40), ("ses_tesekkur", 54.30, 58.75)]:
    ff("-ss", str(a), "-to", str(b), "-i", ses, "-ac", "1", "-af", "afade=t=in:d=0.04,afade=t=out:st=%.2f:d=0.12" % (b - a - 0.12),
       "-c:a", "libvorbis", "-q:a", "6", os.path.join(OAU, name + ".ogg"))
print("tamam")
