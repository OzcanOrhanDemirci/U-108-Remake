# U-108 · "Bir sonraki döngü" piyano parçası (2026).
#
# 2023 oyununun arka plan müziğinin (ArkaPlanSesi.mp3) kaynağı bilinmediği için yayın sürümünde onun yerine çalar.
# Aynı oda, aynı ton (Fa minör), aynı nefes (ölçü başına bir pedallı akor, ~3,3 sn), aynı biçim (seyrek giriş,
# ortada kırık akorlarla yükselen bölüm, sönerek dönüş) ve aynı ses düzeyi; melodi ve akor yürüyüşü yenidir.
# Çalgı: Salamander Grand Piano, Alexander Holm, CC BY 3.0 (Tone.js'in yayımladığı örnek seti).
#
#   python tools/muzik/beste.py            örnekleri indir (bir kez), denetle, çal, public/assets/audio'ya yaz
#   python tools/muzik/beste.py --denetle  yalnız partisyon denetimi
#
# Gerekenler: Python 3, numpy, scipy, ffmpeg (libvorbis ile). Çıktı belirlenimcidir: aynı tohum, aynı dosya.
import sys, os, subprocess, random, urllib.request
from fractions import Fraction
import numpy as np
from scipy import signal

KOK = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
ORNEK = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.ornekler')
CIKIS = os.environ.get('U108_MUZIK_CIKIS') or os.path.join(KOK, 'public', 'assets', 'audio')
ORNEK_URL = 'https://tonejs.github.io/audio/salamander/'
HEDEF_RMS_DB = -26.676838201798624   # 2023 kaydının ölçülen düzeyi: oyundaki bütün ses dengesi buna göre kurulu

SR = 44100
BAR = 10 / 3          # 72 vuruş/dk, 4/4: ölçü 3,333 sn (2023 parçasındaki akor aralığı)
BEAT = BAR / 4
T0 = 0.10
random.seed(108)

# ---------------------------------------------------------------- notalar
ADLAR = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}
def n(s):
    harf, kalan = s[0], s[1:]
    d = ADLAR[harf]
    while kalan and kalan[0] in 'b#':
        d += -1 if kalan[0] == 'b' else 1
        kalan = kalan[1:]
    return 12 * (int(kalan) + 1) + d

AKOR = {
    'Fm9':    ['F2', 'C3', 'Ab3', 'C4', 'Eb4'],
    'Fm':     ['F2', 'C3', 'F3', 'Ab3', 'C4'],
    'Fm/Eb':  ['Eb2', 'C3', 'F3', 'Ab3', 'C4'],
    'Dbmaj7': ['Db2', 'Ab2', 'F3', 'Ab3', 'C4'],
    'Dbadd9': ['Db2', 'Ab2', 'F3', 'Ab3', 'Eb4'],
    'Db':     ['Db2', 'Ab2', 'F3', 'Ab3', 'Db4'],
    'Bbm9':   ['Bb1', 'F2', 'Db3', 'F3', 'Ab3'],
    'Csus4':  ['C2', 'G2', 'F3', 'G3', 'C4'],
    'C':      ['C2', 'G2', 'E3', 'G3', 'C4'],
    'Ab/Eb':  ['Eb2', 'Eb3', 'Ab3', 'C4', 'Eb4'],
    'Ab':     ['Ab1', 'Ab2', 'Eb3', 'Ab3', 'C4'],
    'Abmaj7': ['Ab1', 'Ab2', 'Eb3', 'C4', 'Eb4'],
    'Eb':     ['Eb2', 'Bb2', 'G3', 'Bb3', 'Eb4'],
    'Ebadd9': ['Eb2', 'Bb2', 'G3', 'Bb3', 'F4'],
    'Cm7':    ['C2', 'G2', 'Eb3', 'G3', 'Bb3'],
    'Fson':   ['F1', 'F2', 'C3', 'Ab3', 'C4', 'G4'],
}

# Her ölçü: (akor, melodi [(vuruş, nota, uzunluk vuruş)], bölüm). 'Csus4>C' = üçüncü vuruşta sus4 çözülür.
A1 = [('Fm9', []), ('Dbmaj7', []), ('Bbm9', [(2, 'Db5', 1), (3, 'C5', 1)]), ('Csus4>C', [(0, 'C5', 4)])]
A2 = [('Fm9', [(0, 'Ab4', 2), (2, 'C5', 2)]), ('Ab/Eb', [(0, 'Eb5', 2), (2, 'C5', 2)]),
      ('Dbmaj7', [(0, 'F5', 2), (2, 'Eb5', 2)]), ('Ebadd9', [(0, 'Bb4', 2), (2, 'G4', 2)])]
A3 = [('Fm9', [(0, 'Ab4', 2), (2, 'G4', 2)]), ('Dbmaj7', [(0, 'F4', 2), (2, 'Ab4', 2)]),
      ('Bbm9', [(0, 'Db5', 1.5), (1.5, 'C5', 0.5), (2, 'Bb4', 2)]), ('Csus4>C', [(0, 'C5', 2), (2, 'E5', 2)])]
A4 = [('Fm9', [(0, 'F5', 4)]), ('Dbadd9', [(0, 'Eb5', 2), (2, 'Db5', 2)]),
      ('Ab/Eb', [(0, 'C5', 2), (2, 'Eb5', 2)]), ('Ebadd9', [(0, 'Bb4', 2), (2, 'G4', 2)])]
B = [('Dbmaj7', [(0, 'F5', 1.5), (1.5, 'Eb5', 0.5), (2, 'C5', 2)]),
     ('Eb', [(0, 'Bb4', 2), (2, 'C5', 1), (3, 'Bb4', 1)]),
     ('Cm7', [(0, 'G4', 1), (1, 'Bb4', 1), (2, 'Eb5', 2)]),
     ('Fm', [(0, 'C5', 3), (3, 'Ab4', 1)]),
     ('Bbm9', [(0, 'Db5', 1), (1, 'C5', 0.5), (1.5, 'Db5', 0.5), (2, 'F5', 2)]),
     ('Eb', [(0, 'Eb5', 2), (2, 'Bb4', 1), (3, 'G4', 1)]),
     ('Abmaj7', [(0, 'Ab4', 1), (1, 'C5', 1), (2, 'Eb5', 1), (3, 'G5', 1)]),
     ('Csus4>C', [(0, 'F5', 2), (2, 'E5', 2)]),
     ('Dbmaj7', [(0, 'F5', 1.5), (1.5, 'Eb5', 0.5), (2, 'F5', 1), (3, 'Ab5', 1)]),
     ('Eb', [(0, 'G5', 2), (2, 'F5', 1), (3, 'Eb5', 1)]),
     ('Fm', [(0, 'C5', 2), (2, 'Bb4', 1), (3, 'C5', 1)]),
     ('Fm', [(0, 'Ab4', 3), (3, 'G4', 1)])]
C = [('Db', [(0, 'Ab5', 2), (2, 'F5', 1), (3, 'Ab5', 1)]),
     ('Eb', [(0, 'Bb5', 2), (2, 'G5', 2)]),
     ('Cm7', [(0, 'G5', 1), (1, 'F5', 1), (2, 'Eb5', 2)]),
     ('Fm', [(0, 'F5', 3), (3, 'C5', 1)]),
     ('Db', [(0, 'Db5', 1), (1, 'F5', 1), (2, 'Ab5', 2)]),
     ('Eb', [(0, 'G5', 1.5), (1.5, 'Bb5', 0.5), (2, 'C6', 2)]),
     ('Ab', [(0, 'C6', 2), (2, 'Bb5', 1), (3, 'Ab5', 1)]),
     ('Csus4>C', [(0, 'G5', 2), (2, 'E5', 2)]),
     ('Db', [(0, 'F5', 2), (2, 'Ab5', 2)]),
     ('Eb', [(0, 'G5', 2), (2, 'Bb5', 1), (3, 'G5', 1)]),
     ('Fm', [(0, 'Ab5', 2), (2, 'G5', 1), (3, 'F5', 1)]),
     ('Fm/Eb', [(0, 'Eb5', 2), (2, 'C5', 2)]),
     ('Dbmaj7', [(0, 'F5', 2), (2, 'C5', 2)]),
     ('Csus4>C', [(0, 'C5', 4)])]
D = [('Fm9', []), ('Dbmaj7', [(2, 'C5', 2)]), ('Bbm9', [(0, 'Db5', 2), (2, 'C5', 2)]), ('Csus4>C', [(0, 'C5', 4)]),
     ('Fm9', [(0, 'Ab4', 4)]), ('Ab/Eb', [(0, 'Eb5', 2), (2, 'C5', 2)]), ('Dbmaj7', [(0, 'C5', 4)]),
     ('Ebadd9', [(0, 'Bb4', 2), (2, 'G4', 2)]),
     ('Fm9', [(0, 'Ab4', 4)]), ('Dbmaj7', [(2, 'F4', 2)]), ('Bbm9', [(0, 'Db5', 2), (2, 'C5', 2)]),
     ('Csus4>C', [(0, 'C5', 4)]),
     ('Fm9', [(0, 'Ab4', 2), (2, 'C5', 2)]), ('Dbmaj7', [(0, 'F4', 2), (2, 'Ab4', 2)])]
SON = [('Fson', [(0.5, 'C5', 4)]), ('-', [(0.5, 'C6', 4)])]

PARCA = ([(a, m, 'A') for a, m in A1 + A2 + A3 + A4] + [(a, m, 'B') for a, m in B] +
         [(a, m, 'C') for a, m in C] + [(a, m, 'D') for a, m in D] + [(a, m, 'S') for a, m in SON])

# bölüm bölüm dinamik (0..1): akor, melodi
def dinamik(i, bolum, kac):
    k = i / max(1, kac - 1)
    if bolum == 'A': return 0.34 + 0.08 * k, 0.40 + 0.08 * k
    if bolum == 'B': return 0.40 + 0.06 * k, 0.48 + 0.08 * k
    if bolum == 'C':
        tepe = 1 - abs(k - 0.5) * 2          # ortada en yüksek
        return 0.42 + 0.12 * tepe, 0.56 + 0.16 * tepe
    if bolum == 'D': return 0.38 - 0.10 * k, 0.44 - 0.12 * k
    return 0.30, 0.30

# ---------------------------------------------------------------- olaylar
olaylar = []   # (başlangıç sn, midi, hız, bitiş sn)
melodi = []    # melodi olaylarının sırası
t = T0
uzat = {len(PARCA) - 4: 1.04, len(PARCA) - 3: 1.10, len(PARCA) - 2: 1.30, len(PARCA) - 1: 1.6}  # sona doğru yavaşla
sayac = {}
for i, (akor, mel, bolum) in enumerate(PARCA):
    sayac[bolum] = sayac.get(bolum, 0) + 1
kac = dict(sayac); sayac = {}
for i, (akor, mel, bolum) in enumerate(PARCA):
    j = sayac.get(bolum, 0); sayac[bolum] = j + 1
    bar = BAR * uzat.get(i, 1.0)
    beat = bar / 4
    va, vm = dinamik(j, bolum, kac[bolum])
    pedal = t + bar + 0.06                    # pedal ölçü sonunda değişir
    if i == len(PARCA) - 2: pedal = t + 18    # son akor: pedal bırakılmaz, kendi söner
    if i == len(PARCA) - 1: pedal = t + 16
    j_ = lambda s=0.010: random.gauss(0, s)
    if akor != '-':
        cozul = akor.endswith('>C')
        ad = akor.split('>')[0]
        ses = [n(x) for x in AKOR[ad]]
        if bolum == 'C':
            # sol el kırık akor (dörtlükler), sağ elin altında yumuşak
            sira = [ses[0], ses[2], ses[4], ses[3]]
            agirlik = [1.0, 0.66, 0.74, 0.6]
            for k, m in enumerate(sira):
                if cozul and k >= 2 and m == n('F3'): m = n('E3')
                v = va * agirlik[k] + random.uniform(-0.03, 0.03)
                olaylar.append((t + k * beat + j_(), m, v, pedal))
        else:
            for k, m in enumerate(ses):        # yuvarlanan akor: bastan yukarı
                v = va * (1.0 if k == 0 else 0.82) + random.uniform(-0.03, 0.03)
                bas = t + k * 0.028 + j_(0.006)
                son = pedal
                if cozul and m == n('F3'): son = t + 2 * beat + 0.05
                olaylar.append((bas, m, v, son))
            if cozul:
                olaylar.append((t + 2 * beat + j_(), n('E3'), va * 0.7, pedal))
            if bolum == 'B':                   # üçüncü vuruşta iç sesler hafifçe
                for m in ses[2:4]:
                    if cozul and m == n('F3'): continue      # sus4 çözülürken Fa yeniden basılmaz
                    olaylar.append((t + 2 * beat + j_(), m, va * 0.55, pedal))
            elif bolum in 'AD' and not mel and akor != 'Fson':
                olaylar.append((t + 2 * beat + j_(), ses[3], va * 0.5, pedal))
    for (b, nota, u) in mel:
        v = vm + random.uniform(-0.03, 0.03)
        melodi.append(len(olaylar))
        olaylar.append((t + b * beat + 0.015 + j_(0.008), n(nota), v, pedal))
    t += bar

# yarım pedal: melodi adım adım ilerlerken (iki yarım sese kadar) önceki nota yenisinin altında tınlamasın
for a, b in zip(melodi, melodi[1:]):
    t1, m1, v1, s1 = olaylar[a]
    t2, m2 = olaylar[b][0], olaylar[b][1]
    if abs(m2 - m1) <= 2 and t2 < s1:
        olaylar[a] = (t1, m1, v1, t2 + 0.07)


# ---------------------------------------------------------------- partisyon denetimi
# Aynı anda basılan ya da üstüne basılırken hâlâ tınlayan notalar arasında küçük ikili / küçük dokuzlu olmasın
# (Do3 altı bas hariç; kısa legato örtüşmesi sayılmaz).
def denetle():
    sirali = sorted(olaylar)
    ad = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']
    isim = lambda m: f'{ad[m % 12]}{m // 12 - 1}'
    bulgu = []
    for i, (t1, m, v, son) in enumerate(sirali):
        if m < 48: continue
        for (t2, m2, v2, son2) in sirali[:i]:
            if m2 < 48 or son2 <= t1 + 0.12 or t1 - t2 > 0.9: continue
            if abs(m - m2) in (1, 13):
                bulgu.append(f'{t1:.2f} sn: {isim(m2)} ile {isim(m)}')
    return bulgu

sorun = denetle()
print(f'partisyon: {len(olaylar)} nota, sürtünme {len(sorun)}')
for s in sorun: print('  ', s)
if sorun: sys.exit(1)
if '--denetle' in sys.argv: sys.exit(0)

# ---------------------------------------------------------------- örnekler
os.makedirs(ORNEK, exist_ok=True)
for o in range(8):
    for p in ['A', 'C', 'Ds', 'Fs']:
        f = f'{p}{o}.mp3'
        if o == 0 and p != 'A': continue
        yol = os.path.join(ORNEK, f)
        if not os.path.exists(yol):
            urllib.request.urlretrieve(ORNEK_URL + f, yol)
if not os.path.exists(os.path.join(ORNEK, 'C8.mp3')):
    urllib.request.urlretrieve(ORNEK_URL + 'C8.mp3', os.path.join(ORNEK, 'C8.mp3'))

# ---------------------------------------------------------------- örnekleyici
def coz(yol):
    ham = subprocess.run(['ffmpeg', '-v', 'quiet', '-i', yol, '-f', 'f32le', '-ac', '2', '-ar', str(SR), '-'],
                         capture_output=True, check=True).stdout
    x = np.frombuffer(ham, dtype=np.float32).reshape(-1, 2).copy()
    i = int(np.argmax(np.abs(x).max(axis=1) > 2e-3))
    return x[max(0, i - int(0.004 * SR)):]

klasor = ORNEK
ornek = {}
for f in os.listdir(klasor):
    if f.endswith('.mp3'):
        ad = f[:-4].replace('s', '#')
        ornek[n(ad)] = coz(os.path.join(klasor, f))
anahtar = np.array(sorted(ornek))
onbellek = {}
def ses_al(m):
    s = int(anahtar[np.argmin(np.abs(anahtar - m))])
    d = m - s
    if (s, d) not in onbellek:
        x = ornek[s]
        if d:
            r = Fraction(2 ** (d / 12)).limit_denominator(400)   # perde = hız: örnekleyicinin yaptığı gibi
            x = signal.resample_poly(x, r.denominator, r.numerator, axis=0)
        onbellek[(s, d)] = x.astype(np.float32)
    return onbellek[(s, d)]

uzunluk = int((max(e[3] for e in olaylar) + 6) * SR)
cikis = np.zeros((uzunluk, 2), dtype=np.float64)
for (bas, m, v, son) in olaylar:
    v = float(np.clip(v, 0.05, 1.0))
    x = ses_al(m)
    tau = 0.10 + 0.25 * max(0, (60 - m) / 36)    # bas teller daha geç susar
    L = min(len(x), int((son - bas + 6 * tau) * SR))
    y = x[:L].astype(np.float64) * (0.06 + 0.94 * v ** 1.8)
    y[-int(0.02 * SR):] *= np.linspace(1, 0, int(0.02 * SR))[:, None]   # kuyruk sıfıra insin: tık yok
    fc = 1300 + 10000 * v ** 2.0                    # yumuşak basış daha koyu
    sos = signal.butter(1, fc, 'low', fs=SR, output='sos')
    y = signal.sosfilt(sos, y, axis=0) * 0.6 + y * 0.4 * (v ** 1.5)
    rel = int((son - bas) * SR)                   # pedal kalkınca keçe susturur
    if rel < L:
        k = np.arange(L - rel) / SR
        y[rel:] *= np.exp(-k / tau)[:, None]
    a = int(max(0, bas) * SR)
    cikis[a:a + L] += y[:max(0, min(L, uzunluk - a))]

# oda: kısa, koyu bir yankı
ir_L = int(2.8 * SR)
ir = np.random.default_rng(108).standard_normal((ir_L, 2)) * np.exp(-np.arange(ir_L) / SR / 0.42)[:, None]
ir = signal.sosfilt(signal.butter(2, 3200, 'low', fs=SR, output='sos'), ir, axis=0)
ir[: int(0.018 * SR)] = 0
ir /= np.sqrt((ir ** 2).sum(axis=0))
islak = np.stack([signal.fftconvolve(cikis[:, c], ir[:, c])[:uzunluk] for c in range(2)], axis=1)
karisim = cikis + islak * 0.32

# 2023 kaydının sıcaklığı: tepe frekansları biraz yumuşat
karisim = signal.sosfilt(signal.butter(1, 9000, 'low', fs=SR, output='sos'), karisim, axis=0)
karisim /= np.abs(karisim).max() / 0.89

# ---------------------------------------------------------------- oyunun iki dosyası
# Düzey 2023 kaydına eşlenir. piyano.ogg: 200,1 sn, 197,5'ten sönüş (2023'ün kırpılmış hâli gibi).
# piyano_2023.ogg: başta 0,9 sn fazladan sessizlik, sonda 216,71 sn'ye kadar sessizlik (2023 dosyası 16 sn susup döner).
def rms_db(y):
    m = y.mean(axis=1)
    idx = np.where(np.abs(m) > 1e-3)[0]
    m = m[idx[0]:idx[-1]]
    return 20 * np.log10(np.sqrt(np.mean(m ** 2)))

x = karisim.astype(np.float32).astype(np.float64)
x *= 10 ** ((HEDEF_RMS_DB - rms_db(x)) / 20)
tepe = 20 * np.log10(np.abs(x).max())
assert tepe < -1.0, f'tepe çok yüksek: {tepe:.1f} dBFS'
L = int(200.1 * SR)
a = np.zeros((L, 2)); a[:min(L, len(x))] = x[:L]
s0 = int(197.5 * SR)
a[s0:L] *= np.linspace(1, 0, L - s0)[:, None]
L2 = int(216.71 * SR)
b = np.zeros((L2, 2)); k = int(0.9 * SR); b[k:k + L] = a

for ad, veri, q in [('piyano.ogg', a, '7'), ('piyano_2023.ogg', b, '6')]:
    yol = os.path.join(CIKIS, ad)
    subprocess.run(['ffmpeg', '-v', 'quiet', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-',
                    '-c:a', 'libvorbis', '-q:a', q, yol], input=veri.astype(np.float32).tobytes(), check=True)
    print(f'{ad}: {os.path.getsize(yol) // 1024} KB')
print(f'düzey {HEDEF_RMS_DB:.1f} dB RMS, tepe {tepe:.1f} dBFS')
