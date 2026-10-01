// Karakter: 2023 takımının tasarımı (Karakter.png, KarakterYurume.png) koddan, iskeletli kukla olarak.
// Yerel birim: boy = 1 (saç tepesi y=-1, taban y=0), y aşağı pozitif. Kök ayak ortası.
// Ölçüler orijinal PNG'lerden piksel ölçümüyle alındı (docs/ORIJINAL.md).
import { clamp, lerp, TAU, mix, smooth } from '../core/math';

export const PAL = {
  ten: '#FDCBA4', yanak: '#FB8A62', allik: '#FBB89A',
  sac: '#3C2331', sacAcik: '#6A4553', sacKoyu: '#2B1824', sacTepe: '#5E3A47',
  sakal: '#C4AA90', dudak: '#FD6A48', burun: '#F88C6E', burunKoyu: '#D9573F',
  gozluk: '#2A1A16', goz: '#0B0606', kas: '#2A1820',
  kazak: '#A25F1B', kazakKoyu: '#7E4612', kazakDikis: '#7A4A12', uzakKol: '#4A2A14',
  yaka: '#35241B', yakaCizgi: '#2A1B14',
  kot: '#17508E', kotDikis: '#0A2A4D',
  ayakkabi: '#2E1E14', corap: '#A35F1B', dugme: '#6E3E10', dugmeIc: '#3A220C',
};

export interface Pose {
  // radyan; 0 = aşağı sarkık. Pozitif uyluk/omuz = ileri (yüz yönüne). Pozitif diz = baldır geriye; pozitif dirsek = ön kol ileri/yukarı.
  thighN: number; kneeN: number; thighF: number; kneeF: number;   // N: yakın (kameraya dönük) bacak, F: uzak
  shoulderN: number; elbowN: number; shoulderF: number; elbowF: number;
  lean: number; bob: number; headTilt: number; headLook: number; squash: number;
}

export const restPose = (): Pose => ({
  thighN: 0, kneeN: 0, thighF: 0, kneeF: 0, shoulderN: -0.04, elbowN: 0.1, shoulderF: -0.04, elbowF: 0.1,
  lean: 0, bob: 0, headTilt: 0, headLook: 0, squash: 1,
});

export interface Face {
  blink: number; browUp: number; browSad: number; mouthOpen: number; smile: number; eyeX: number; eyeY: number; tear: number;
}
export const restFace = (): Face => ({ blink: 0, browUp: 0, browSad: 0, mouthOpen: 0, smile: 0, eyeX: 0, eyeY: 0, tear: 0 });

const L = { thigh: 0.255, shin: 0.215, upper: 0.14, fore: 0.115, hipY: -0.5, shoulderY: -0.716, neckY: -0.789 };
type Ctx = CanvasRenderingContext2D;

/** Uçları yuvarlatılmış konik parça. */
function seg(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, w0: number, w1: number) {
  const dx = x1 - x0, dy = y1 - y0, l = Math.hypot(dx, dy) || 1e-6;
  const nx = -dy / l, ny = dx / l;
  // Gövde dörtgeni ve uç daireleri ayrı doldurulur: tek yolda sarım yönleri çakışınca delik açılıyordu.
  ctx.beginPath();
  ctx.moveTo(x0 + nx * w0 / 2, y0 + ny * w0 / 2);
  ctx.lineTo(x1 + nx * w1 / 2, y1 + ny * w1 / 2);
  ctx.lineTo(x1 - nx * w1 / 2, y1 - ny * w1 / 2);
  ctx.lineTo(x0 - nx * w0 / 2, y0 - ny * w0 / 2);
  ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.arc(x0, y0, w0 / 2, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(x1, y1, w1 / 2, 0, TAU); ctx.fill();
}

/** İki parçalı uzuv. a0: kök açısı (0 aşağı, + ileri=+x). a1: eklemde göreli dönüş. */
function limb(ctx: Ctx, x0: number, y0: number, a0: number, len0: number, a1: number, len1: number, w0: number, w1: number, w2: number, col: string) {
  const x1 = x0 + Math.sin(a0) * len0, y1 = y0 + Math.cos(a0) * len0;
  const ab = a0 + a1;
  const x2 = x1 + Math.sin(ab) * len1, y2 = y1 + Math.cos(ab) * len1;
  ctx.fillStyle = col;
  seg(ctx, x0, y0, x1, y1, w0, w1);
  seg(ctx, x1, y1, x2, y2, w1, w2);
  return { x1, y1, x2, y2, ab };
}

function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
}

/** Kapalı Catmull-Rom eğrisi. */
function smoothClosed(ctx: Ctx, pts: [number, number][]) {
  const n = pts.length;
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    ctx.bezierCurveTo(p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6, p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6, p2[0], p2[1]);
  }
  ctx.closePath();
}

/** Bir dış hattı yay uzunluğuna göre N noktaya örnekler (biçim dönüşümü için). */
function resample(pts: [number, number][], N: number): [number, number][] {
  const segs: number[] = []; let tot = 0;
  for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; const l = Math.hypot(b[0] - a[0], b[1] - a[1]); segs.push(l); tot += l; }
  const out: [number, number][] = [];
  for (let k = 0; k < N; k++) {
    let d = (k / N) * tot, i = 0;
    while (d > segs[i]) { d -= segs[i]; i++; }
    const a = pts[i], b = pts[(i + 1) % pts.length], t = d / (segs[i] || 1);
    out.push([lerp(a[0], b[0], t), lerp(a[1], b[1], t)]);
  }
  return out;
}

// Saç dış hatları (baş yereli: x yüz ortasına, y yakaya göre; birim = boy). Arka-alt noktadan saat yönünde.
const HAIR_FRONT = resample([
  [-0.049, -0.117], [-0.059, -0.139], [-0.061, -0.160], [-0.049, -0.184], [-0.031, -0.196], [-0.022, -0.208], [-0.0085, -0.211],
  [0.0075, -0.206], [0.021, -0.192], [0.029, -0.186], [0.039, -0.184], [0.050, -0.176], [0.056, -0.163], [0.054, -0.149],
  [0.059, -0.128], [0.050, -0.124], [0.039, -0.139], [0.034, -0.152], [0.023, -0.168], [0.015, -0.171], [-0.003, -0.175],
  [-0.0125, -0.170], [-0.022, -0.152], [-0.030, -0.131], [-0.038, -0.120],
], 64);
const HAIR_SIDE = resample([
  [-0.079, -0.119], [-0.077, -0.140], [-0.069, -0.161], [-0.0475, -0.193], [-0.016, -0.209], [0.016, -0.211], [0.050, -0.201],
  [0.061, -0.180], [0.071, -0.164], [0.084, -0.148], [0.100, -0.143], [0.098, -0.127], [0.077, -0.111], [0.053, -0.121],
  [0.042, -0.135], [0.032, -0.143], [0.021, -0.145], [0.013, -0.143], [-0.005, -0.148], [-0.026, -0.140], [-0.037, -0.124],
  [-0.040, -0.108], [-0.053, -0.103], [-0.063, -0.106], [-0.072, -0.112],
], 64);

// Yüz öğeleri: karşıdan / 3-4 yandan (x, y)
const FEAT = {
  front: { fw: 0.083, fx: 0, faceTop: -0.176, eye1: [-0.0195, -0.106], eye2: [0.0195, -0.106], lens1: [-0.031, -0.1015], lens2: [0.031, -0.1015], lr: 0.0266,
    brow1: [-0.024, -0.1255], brow2: [0.024, -0.1255], nose: [0, -0.108, -0.073], must: -0.069, mouth: [0, -0.0545], earL: [-0.05, -0.083], earR: [0.05, -0.083] },
  side: { fw: 0.086, fx: 0, faceTop: -0.15, eye1: [-0.0177, -0.093], eye2: [0.0325, -0.093], lens1: [-0.021, -0.092], lens2: [0.034, -0.092], lr: 0.0238,
    brow1: [-0.021, -0.124], brow2: [0.034, -0.124], nose: [0.006, -0.091, -0.061], must: -0.06, mouth: [0.005, -0.039], earL: [-0.05, -0.075], earR: [0.05, -0.075] },
};
const LP = (a: number[], b: number[], t: number) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2] ?? 0, b[2] ?? 0, t)];

export interface DrawOpts {
  facing: number;     // 1 sağ, -1 sol
  turn: number;       // gövde: 0 karşıdan, 1 yan (3/4)
  headTurn: number;   // baş: 0 karşıdan, ±1 yan (işaret yön)
  pose: Pose;
  face: Face;
  shade?: number;     // 0..1 genel kararma
  shadeColor?: string;
}

/** Kuklayı (0,0) taban ortası olacak şekilde, boy=1 biriminde çizer. */
export function drawCharacter(ctx: Ctx, o: DrawOpts) {
  const P = o.pose, F = o.face;
  const turn = clamp(o.turn, 0, 1);
  const sh = o.shade ?? 0, shc = o.shadeColor ?? '#0a0614';
  const C = (c: string) => (sh > 0 ? mix(c, shc, sh) : c);
  ctx.save();
  ctx.scale(o.facing, 1);
  const sq = P.squash;
  ctx.scale(1 / Math.sqrt(sq), sq);
  ctx.lineJoin = 'round';

  const hipY = L.hipY + P.bob;
  const spread = 0.03 * (1 - turn);
  // Gövde kalça etrafında P.lean kadar döner: üstteki bir nokta İLERİ kayar. (1.0.0'da işaret tersti: baş geride kalıyordu.)
  const leanX = (y: number) => Math.sin(P.lean) * (hipY - y);
  const shY = L.shoulderY + P.bob;
  // omuzlar: 3/4'te yakın omuz arkada (x<0), uzak omuz önde (x>0)
  const nearShX = lerp(-0.074, -0.04, turn) + leanX(shY), farShX = lerp(0.074, 0.05, turn) + leanX(shY);

  // uzak kol (gövdenin arkasında, gölgede)
  const farCol = mix(C(PAL.kazak), C(PAL.uzakKol), turn * 0.85);
  drawArm(ctx, farShX, shY + 0.008, P.shoulderF, P.elbowF, farCol, mix(C(PAL.ten), '#7a4a3a', turn * 0.35), mix(C(PAL.kazakDikis), '#2a160a', turn * 0.5), turn < 0.5);
  // uzak bacak
  drawLeg(ctx, spread + 0.012 * turn, hipY, P.thighF, P.kneeF, mix(C(PAL.kot), '#0a1e38', 0.3 * turn), C(PAL.kotDikis), C(PAL.ayakkabi), mix(C(PAL.corap), '#3a2008', 0.3));
  // leğen
  ctx.save();
  ctx.translate(0, hipY);
  const pw = lerp(0.124, 0.104, turn);
  ctx.fillStyle = C(PAL.kot);
  ctx.beginPath();
  ctx.moveTo(-pw / 2, -0.02); ctx.lineTo(pw / 2, -0.02); ctx.lineTo(pw / 2 - 0.004, 0.07);
  ctx.quadraticCurveTo(0, 0.125, -pw / 2 + 0.004, 0.07); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = C(PAL.kotDikis); ctx.lineWidth = 0.0032;
  ctx.beginPath(); ctx.moveTo(-pw / 2, 0.05); ctx.quadraticCurveTo(-pw * 0.18, 0.1, 0, 0.11); ctx.quadraticCurveTo(pw * 0.18, 0.1, pw / 2, 0.05); ctx.stroke();
  ctx.restore();
  // yakın bacak
  drawLeg(ctx, -spread - 0.006 * turn, hipY, P.thighN, P.kneeN, C(PAL.kot), C(PAL.kotDikis), C(PAL.ayakkabi), C(PAL.corap));
  // gövde
  ctx.save();
  ctx.translate(0, hipY);
  ctx.rotate(P.lean);
  drawTorso(ctx, turn, C);
  ctx.restore();
  // baş
  const neckY = hipY + (L.neckY - L.hipY) * Math.cos(P.lean);
  ctx.save();
  ctx.translate(leanX(L.neckY + P.bob) + 0.004 * turn, neckY);
  ctx.rotate(P.headTilt + P.lean * 0.3);
  drawHead(ctx, clamp(o.headTurn, -1, 1), F, C, P.headLook);
  ctx.restore();
  // yakın kol (en önde)
  drawArm(ctx, nearShX, shY + 0.004, P.shoulderN, P.elbowN, C(PAL.kazak), C(PAL.ten), C(PAL.kazakDikis), false);
  ctx.restore();
}

function drawLeg(ctx: Ctx, x: number, y: number, thigh: number, knee: number, col: string, seam: string, shoe: string, sock: string) {
  const r = limb(ctx, x, y, thigh, L.thigh, -knee, L.shin, 0.052, 0.04, 0.029, col);
  ctx.strokeStyle = seam; ctx.lineWidth = 0.0022;
  const nx = Math.cos(thigh), ny = -Math.sin(thigh);
  ctx.beginPath(); ctx.moveTo(r.x1 - nx * 0.02, r.y1 - ny * 0.02); ctx.quadraticCurveTo(r.x1 + 0.002, r.y1 + 0.008, r.x1 + nx * 0.02, r.y1 + ny * 0.02); ctx.stroke();
  // ayak: ayak bileğinde; taban yere paralel kalmaya çalışır
  ctx.save();
  ctx.translate(r.x2, r.y2);
  ctx.rotate(clamp(-r.ab * 0.25, -0.6, 0.6));
  ctx.fillStyle = sock; ctx.fillRect(-0.0145, -0.012, 0.029, 0.012);
  ctx.fillStyle = shoe;
  ctx.beginPath();
  ctx.moveTo(-0.017, -0.003); ctx.lineTo(0.026, -0.003);
  ctx.quadraticCurveTo(0.056, -0.001, 0.058, 0.015);
  ctx.quadraticCurveTo(0.058, 0.03, 0.044, 0.03);
  ctx.lineTo(-0.019, 0.03); ctx.quadraticCurveTo(-0.026, 0.03, -0.026, 0.02); ctx.lineTo(-0.023, 0.0);
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

function drawArm(ctx: Ctx, x: number, y: number, shoulder: number, elbow: number, col: string, skin: string, seam: string, mirrorHand: boolean) {
  const r = limb(ctx, x, y, shoulder, L.upper, elbow, L.fore, 0.05, 0.043, 0.039, col);
  ctx.strokeStyle = seam; ctx.lineWidth = 0.0038; ctx.lineCap = 'round';
  // kolun iç dikişi (orijinaldeki koyu çizgi)
  ctx.beginPath();
  ctx.moveTo(x + Math.sin(shoulder) * 0.025 + Math.cos(shoulder) * 0.012, y + Math.cos(shoulder) * 0.025 - Math.sin(shoulder) * 0.012);
  ctx.lineTo(r.x1 + Math.cos(shoulder) * 0.01, r.y1 - Math.sin(shoulder) * 0.01);
  ctx.lineTo(r.x2 - Math.sin(r.ab) * 0.012 + Math.cos(r.ab) * 0.01, r.y2 - Math.cos(r.ab) * 0.012 - Math.sin(r.ab) * 0.01);
  ctx.stroke();
  // el
  ctx.save();
  ctx.translate(r.x2, r.y2);
  ctx.rotate(-r.ab);
  if (mirrorHand) ctx.scale(-1, 1);
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.moveTo(-0.015, -0.006); ctx.lineTo(0.016, -0.006);
  ctx.quadraticCurveTo(0.02, 0.045, 0.006, 0.074);
  ctx.quadraticCurveTo(-0.002, 0.082, -0.008, 0.068);
  ctx.quadraticCurveTo(-0.019, 0.04, -0.015, -0.006);
  ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(0.011, 0.01); ctx.quadraticCurveTo(0.03, 0.028, 0.024, 0.05); ctx.quadraticCurveTo(0.016, 0.042, 0.009, 0.03); ctx.closePath(); ctx.fill();
  ctx.restore();
}

function drawTorso(ctx: Ctx, turn: number, C: (c: string) => string) {
  const top = L.shoulderY - L.hipY - 0.012;
  const hem = 0.014;
  const wHem = lerp(0.108, 0.1, turn), wSh = lerp(0.21, 0.15, turn), wChest = lerp(0.2, 0.152, turn);
  const off = 0.006 * turn;
  // balıkçı yaka
  const yw = lerp(0.094, 0.086, turn);
  ctx.fillStyle = C(PAL.yaka);
  roundRect(ctx, -yw / 2 + off, top - 0.062, yw, 0.085, 0.007); ctx.fill();
  ctx.strokeStyle = C(PAL.yakaCizgi); ctx.lineWidth = 0.0042;
  for (const yy of [top - 0.051, top - 0.041, top - 0.031]) { ctx.beginPath(); ctx.moveTo(-yw / 2 + off + 0.002, yy); ctx.lineTo(yw / 2 + off - 0.002, yy); ctx.stroke(); }
  // kazak
  ctx.fillStyle = C(PAL.kazak);
  ctx.beginPath();
  ctx.moveTo(-wHem / 2 + off, hem);
  ctx.quadraticCurveTo(-wChest / 2 - 0.006 + off, -0.085, -wSh / 2 + off, top + 0.034);
  ctx.quadraticCurveTo(-wSh / 2 + 0.008 + off, top + 0.002, -wSh / 2 + 0.046 + off, top - 0.006);
  ctx.lineTo(wSh / 2 - 0.046 + off, top - 0.006);
  ctx.quadraticCurveTo(wSh / 2 - 0.008 + off, top + 0.002, wSh / 2 + off, top + 0.034);
  ctx.quadraticCurveTo(wChest / 2 + 0.006 + off, -0.085, wHem / 2 + off, hem);
  ctx.closePath(); ctx.fill();
  // V yaka (karşıdan belirgin, yandan kaybolur)
  const vA = 1 - smooth(turn / 0.8);
  if (vA > 0.01) {
    ctx.globalAlpha = vA;
    ctx.fillStyle = C(PAL.yaka);
    ctx.beginPath();
    ctx.moveTo(-0.052, top - 0.006); ctx.lineTo(0.052, top - 0.006);
    ctx.lineTo(0.006, top + 0.092); ctx.quadraticCurveTo(0, top + 0.1, -0.006, top + 0.092);
    ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1;
  }
  // düğmeler: karşıdan V'nin altında, yandan ön kenara yakın
  const bx = lerp(0, wChest / 2 - 0.028, turn) + off, by0 = lerp(top + 0.108, top + 0.1, turn);
  for (let i = 0; i < 3; i++) {
    const by = by0 + i * 0.0175;
    ctx.fillStyle = C(PAL.dugme); ctx.beginPath(); ctx.arc(bx - i * 0.0015 * turn, by, 0.0072, 0, TAU); ctx.fill();
    ctx.fillStyle = C(PAL.dugmeIc); ctx.beginPath(); ctx.arc(bx - i * 0.0015 * turn, by, 0.0028, 0, TAU); ctx.fill();
  }
  // yan dikişler
  ctx.strokeStyle = C(PAL.kazakDikis); ctx.lineWidth = 0.0034;
  ctx.globalAlpha = 1 - turn * 0.6;
  ctx.beginPath(); ctx.moveTo(-wSh / 2 + 0.042 + off, top + 0.012); ctx.quadraticCurveTo(-wChest / 2 + 0.03 + off, -0.13, -wHem / 2 + 0.02 + off, -0.035); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(wSh / 2 - 0.042 + off, top + 0.012); ctx.quadraticCurveTo(wChest / 2 - 0.03 + off, -0.13, wHem / 2 - 0.02 + off, -0.035); ctx.stroke();
  ctx.globalAlpha = 1;
  // yandan: uzak omuzda balıkçı yakanın koyu devamı (yürüme karelerindeki bant)
  if (turn > 0.2) {
    ctx.globalAlpha = smooth((turn - 0.2) / 0.6);
    ctx.fillStyle = C(PAL.yaka);
    ctx.beginPath();
    ctx.moveTo(yw / 2 + off - 0.004, top - 0.004);
    ctx.quadraticCurveTo(wSh / 2 + off + 0.006, top + 0.004, wSh / 2 + off + 0.002, top + 0.05);
    ctx.lineTo(wSh / 2 + off - 0.014, top + 0.068);
    ctx.quadraticCurveTo(wSh / 2 + off - 0.01, top + 0.03, yw / 2 + off - 0.016, top + 0.012);
    ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1;
  }
}

function drawHead(ctx: Ctx, headTurn: number, Fc: Face, C: (c: string) => string, look: number) {
  const t = Math.abs(headTurn);
  ctx.save();
  if (headTurn < 0) ctx.scale(-1, 1);
  const A = FEAT.front, B = FEAT.side;
  const fw = lerp(A.fw, B.fw, t);
  const ly = look * 0.006;
  const lr = lerp(A.lr, B.lr, t);
  const e1 = LP(A.eye1, B.eye1, t), e2 = LP(A.eye2, B.eye2, t);
  const l1 = LP(A.lens1, B.lens1, t), l2 = LP(A.lens2, B.lens2, t);
  const b1 = LP(A.brow1, B.brow1, t), b2 = LP(A.brow2, B.brow2, t);
  const no = LP(A.nose, B.nose, t), mo = LP(A.mouth, B.mouth, t);
  const must = lerp(A.must, B.must, t);
  const hair = HAIR_FRONT.map((a, i) => [lerp(a[0], HAIR_SIDE[i][0], t), lerp(a[1], HAIR_SIDE[i][1], t)] as [number, number]);

  // kulaklar (yanakla aynı somon). Karşıdan ikisi; yandan yalnız arka kulak.
  ctx.fillStyle = C(PAL.yanak);
  const earW = 0.012, earH = 0.026;
  const drawEar = (x: number, y: number, s: number) => {
    ctx.beginPath();
    ctx.moveTo(x, y - earH); ctx.quadraticCurveTo(x + s * earW * 1.6, y - earH * 0.9, x + s * earW * 1.2, y - earH * 0.3);
    ctx.lineTo(x + s * earW * 0.2, y + earH * 0.9); ctx.quadraticCurveTo(x - s * 0.002, y + earH, x - s * 0.004, y + earH * 0.6);
    ctx.closePath(); ctx.fill();
  };
  drawEar(lerp(-fw / 2, -fw / 2 + 0.006, t), lerp(-0.088, -0.078, t) + ly, -1);
  if (t < 0.7) { ctx.globalAlpha = 1 - t / 0.7; drawEar(fw / 2, -0.088 + ly, 1); ctx.globalAlpha = 1; }
  // yüz
  ctx.fillStyle = C(PAL.ten);
  roundRect(ctx, -fw / 2, -0.172, fw, 0.178, 0.018); ctx.fill();
  // çene sakal çizgileri
  ctx.strokeStyle = C(PAL.sakal); ctx.lineCap = 'round'; ctx.lineWidth = 0.0058;
  const cx = mo[0];
  ctx.beginPath();
  ctx.moveTo(-fw / 2 + 0.003, must + 0.006 + ly); ctx.lineTo(cx - 0.019, 0.003);
  ctx.moveTo(fw / 2 - 0.003, must + 0.006 + ly); ctx.lineTo(cx + 0.019, 0.003);
  ctx.stroke();
  // bıyık: kulaktan kulağa kalın bant
  ctx.lineWidth = 0.0105;
  ctx.beginPath();
  ctx.moveTo(-fw / 2 - 0.004, must - 0.004 + ly);
  ctx.quadraticCurveTo(-fw * 0.25 + cx, must + 0.012 + ly, cx, must + 0.009 + ly);
  ctx.quadraticCurveTo(fw * 0.25 + cx, must + 0.012 + ly, fw / 2 + 0.004, must - 0.004 + ly);
  ctx.stroke();
  // ağız
  const mOpen = Fc.mouthOpen, sm = Fc.smile, my = mo[1] + ly;
  if (Math.abs(sm) > 0.25 && mOpen < 0.3) {
    ctx.strokeStyle = C(PAL.dudak); ctx.lineWidth = 0.0055;
    ctx.beginPath(); ctx.moveTo(cx - 0.011, my - sm * 0.003); ctx.quadraticCurveTo(cx, my + sm * 0.009, cx + 0.011, my - sm * 0.003); ctx.stroke();
  } else {
    ctx.fillStyle = C(PAL.dudak);
    ctx.beginPath(); ctx.ellipse(cx, my + mOpen * 0.003, 0.0112 - mOpen * 0.002, 0.0037 + mOpen * 0.0075, 0, 0, TAU); ctx.fill();
    if (mOpen > 0.2) { ctx.fillStyle = C('#5a1a14'); ctx.beginPath(); ctx.ellipse(cx, my + mOpen * 0.004, 0.0065, 0.0015 + mOpen * 0.005, 0, 0, TAU); ctx.fill(); }
  }
  // allık
  ctx.fillStyle = C(PAL.allik);
  ctx.beginPath(); ctx.ellipse(e1[0], e1[1] + 0.0075 + ly, 0.0075, 0.0028, 0, 0, TAU); ctx.ellipse(e2[0], e2[1] + 0.0075 + ly, 0.0075, 0.0028, 0, 0, TAU); ctx.fill();
  // burun
  const nx = no[0], nTop = no[1] + ly, nBot = no[2] + ly;
  const ng = ctx.createLinearGradient(0, nTop, 0, nBot);
  ng.addColorStop(0, C(PAL.burunKoyu)); ng.addColorStop(0.55, C(PAL.burun)); ng.addColorStop(1, C('#FBA085'));
  ctx.fillStyle = ng;
  const nw = 0.0045, nb = 0.0155;
  ctx.beginPath();
  ctx.moveTo(nx - nw, nTop); ctx.lineTo(nx + nw, nTop);
  ctx.quadraticCurveTo(nx + nw, nBot - 0.012, nx + nb, nBot - 0.004);
  ctx.quadraticCurveTo(nx + nb + 0.001, nBot, nx + nb - 0.004, nBot);
  ctx.lineTo(nx - nb + 0.004, nBot);
  ctx.quadraticCurveTo(nx - nb - 0.001, nBot, nx - nb, nBot - 0.004);
  ctx.quadraticCurveTo(nx - nw, nBot - 0.012, nx - nw, nTop);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = C('#9a4a3a');
  ctx.beginPath(); ctx.ellipse(nx - 0.0055, nBot - 0.0028, 0.0021, 0.0032, 0, 0, TAU); ctx.ellipse(nx + 0.0055, nBot - 0.0028, 0.0021, 0.0032, 0, 0, TAU); ctx.fill();
  // gözler
  const blink = clamp(Fc.blink, 0, 1);
  const ex = Fc.eyeX * 0.0035, eyy = Fc.eyeY * 0.003 + ly;
  for (const e of [e1, e2]) {
    if (blink > 0.65) {
      ctx.strokeStyle = C(PAL.goz); ctx.lineWidth = 0.0026;
      ctx.beginPath(); ctx.moveTo(e[0] - 0.0045, e[1] + eyy); ctx.quadraticCurveTo(e[0], e[1] + eyy + 0.003, e[0] + 0.0045, e[1] + eyy); ctx.stroke();
    } else {
      ctx.fillStyle = C(PAL.goz);
      ctx.beginPath(); ctx.ellipse(e[0] + ex, e[1] + eyy, 0.0042, 0.0052 * (1 - blink * 0.9), 0, 0, TAU); ctx.fill();
      if (Fc.tear > 0) {
        ctx.fillStyle = `rgba(255,255,255,${0.9 * Fc.tear})`;
        ctx.beginPath(); ctx.arc(e[0] + ex + 0.0013, e[1] + eyy - 0.0018, 0.0015, 0, TAU); ctx.fill();
      }
    }
  }
  // saç
  const hg = ctx.createLinearGradient(-0.07, 0, 0.1, 0);
  hg.addColorStop(0, C(PAL.sacKoyu)); hg.addColorStop(0.35, C(PAL.sac)); hg.addColorStop(0.75, C(PAL.sac)); hg.addColorStop(1, C(PAL.sacAcik));
  ctx.fillStyle = hg;
  smoothClosed(ctx, hair); ctx.fill();
  // saç tepesinde açık bant (yandan belirgin)
  ctx.save();
  smoothClosed(ctx, hair); ctx.clip();
  ctx.strokeStyle = C(PAL.sacTepe); ctx.lineWidth = 0.012 * t + 0.004;
  ctx.globalAlpha = 0.55 + 0.3 * t;
  ctx.beginPath(); ctx.moveTo(-0.05, -0.205); ctx.quadraticCurveTo(0.01, -0.226, 0.07, -0.198); ctx.stroke();
  ctx.restore();
  // kaşlar (gözlüğün üst çerçevesine oturur)
  ctx.strokeStyle = C(PAL.kas); ctx.lineWidth = 0.0082; ctx.lineCap = 'round';
  for (const [b, s] of [[b1, -1], [b2, 1]] as [number[], number][]) {
    const y = b[1] - Fc.browUp * 0.006 + ly;
    const inner = b[0] - s * 0.012, outer = b[0] + s * 0.013;
    const iy = y - Fc.browSad * 0.007 + (Fc.browUp < 0 ? 0.004 * -Fc.browUp : 0);
    ctx.beginPath(); ctx.moveTo(inner, iy); ctx.quadraticCurveTo(b[0], y - 0.004, outer, y + 0.002 + Fc.browSad * 0.002); ctx.stroke();
  }
  // gözlük
  ctx.strokeStyle = C(PAL.gozluk); ctx.lineWidth = 0.0021;
  ctx.beginPath(); ctx.arc(l1[0], l1[1] + ly, lr, 0, TAU); ctx.stroke();
  ctx.beginPath(); ctx.arc(l2[0], l2[1] + ly, lr, 0, TAU); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(l1[0] + lr, l1[1] + ly - 0.002); ctx.quadraticCurveTo((l1[0] + l2[0]) / 2, l1[1] + ly - 0.006, l2[0] - lr, l2[1] + ly - 0.002); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.32)'; ctx.lineWidth = 0.0018;
  ctx.beginPath(); ctx.arc(l1[0], l1[1] + ly, lr * 0.74, -2.5, -1.75); ctx.stroke();
  ctx.beginPath(); ctx.arc(l2[0], l2[1] + ly, lr * 0.74, -2.5, -1.75); ctx.stroke();
  ctx.restore();
}

// ---------------- Canlandırma ----------------
export type CharState = 'idle' | 'walk' | 'run' | 'jump' | 'fall' | 'sit' | 'still';

export class Animator {
  pose = restPose();
  face = restFace();
  phase = 0;
  t = Math.random() * 10;
  blinkT = 2; blinkV = 0;
  talkT = 0; talking = false;
  landT = 0; landS = 1;
  emotion: 'normal' | 'saskin' | 'uzgun' | 'mutlu' | 'kizgin' | 'dusunceli' | 'gozkapali' = 'normal';
  lookUp = 0;       // 0..1 başını kaldır
  handsLook = 0;    // 0..1 ellere bak
  reach = 0;        // 0..1 kolu öne uzat (kapıya dokunma)
  wave = 0;         // 0..1 el sallama
  breathe = 1;
  tear = 0;

  update(dt: number, s: { state: CharState; speed: number; vy: number; dist: number }) {
    this.t += dt;
    const T = restPose();
    const sp = Math.abs(s.speed);
    const br = Math.sin(this.t * 1.65) * this.breathe;
    T.bob = 0.0025 * br; T.squash = 1 + 0.004 * br;
    T.shoulderN = -0.04 + 0.012 * br; T.shoulderF = -0.03 + 0.012 * br;
    T.headTilt = Math.sin(this.t * 0.55) * 0.015;
    if (s.state === 'walk' || s.state === 'run') {
      const run = s.state === 'run' ? 1 : clamp((sp - 2.6) / 1.8, 0, 1);
      const stride = lerp(1.2, 1.75, run);
      this.phase = s.dist * (TAU / stride);
      const p = this.phase;
      const A = lerp(0.4, 0.68, run);
      T.thighN = A * Math.sin(p); T.thighF = A * Math.sin(p + Math.PI);
      const kb = lerp(0.6, 1.3, run);
      T.kneeN = kb * Math.max(0, Math.sin(p + 0.9)) * 0.9 + 0.05;
      T.kneeF = kb * Math.max(0, Math.sin(p + Math.PI + 0.9)) * 0.9 + 0.05;
      const Aa = lerp(0.36, 0.7, run);
      T.shoulderN = -Aa * Math.sin(p); T.shoulderF = -Aa * Math.sin(p + Math.PI);
      T.elbowN = 0.15 + lerp(0.12, 1.0, run) * Math.max(0, Math.sin(-p));
      T.elbowF = 0.15 + lerp(0.12, 1.0, run) * Math.max(0, Math.sin(-p + Math.PI));
      T.bob = lerp(0.012, 0.024, run) * (Math.abs(Math.sin(p)) - 0.5);
      T.lean = lerp(0.035, 0.14, run);
      T.headTilt = -T.lean * 0.35 + Math.sin(p * 2) * 0.008;
    } else if (s.state === 'jump' || s.state === 'fall') {
      const up = clamp(-s.vy / 5, -1, 1);
      T.thighN = 0.7 - up * 0.15; T.kneeN = 1.1 - up * 0.3;
      T.thighF = -0.12 + up * 0.15; T.kneeF = 0.55;
      if (up > 0) { T.shoulderN = 0.9 + up * 0.5; T.elbowN = 0.5; T.shoulderF = -0.5; T.elbowF = 0.3; }
      else { T.shoulderN = 1.3; T.elbowN = 0.3; T.shoulderF = 1.0; T.elbowF = 0.35; }
      T.lean = 0.05; T.squash = 1 + clamp(up, 0, 1) * 0.035;
      T.headTilt = -up * 0.06;
    } else if (s.state === 'sit') {
      T.thighN = 1.5; T.kneeN = 1.42; T.thighF = 1.46; T.kneeF = 1.25;
      T.bob = 0.5; T.lean = -0.06; T.squash = 1;
      T.shoulderN = -0.55; T.elbowN = -0.12; T.shoulderF = -0.62; T.elbowF = -0.12;
      T.headTilt = Math.sin(this.t * 0.4) * 0.02;
    } else if (s.state === 'still') {
      T.bob = 0; T.headTilt = 0; T.squash = 1;
    }
    if (this.handsLook > 0) {
      const h = smooth(this.handsLook);
      T.shoulderN = lerp(T.shoulderN, 0.55, h); T.elbowN = lerp(T.elbowN, 1.9, h);
      T.shoulderF = lerp(T.shoulderF, 0.4, h); T.elbowF = lerp(T.elbowF, 2.0, h);
      T.headLook = lerp(T.headLook, 1, h); T.headTilt = lerp(T.headTilt, 0.14, h);
    }
    if (this.reach > 0) { const h = smooth(this.reach); T.shoulderN = lerp(T.shoulderN, 1.35, h); T.elbowN = lerp(T.elbowN, 0.15, h); }
    if (this.wave > 0) {
      const h = smooth(this.wave);
      T.shoulderN = lerp(T.shoulderN, 2.5, h); T.elbowN = lerp(T.elbowN, 0.5 + Math.sin(this.t * 9) * 0.45, h);
    }
    if (this.lookUp > 0) { T.headTilt -= 0.2 * smooth(this.lookUp); T.headLook -= this.lookUp; }
    if (this.landT > 0) {
      this.landT -= dt;
      const k = Math.sin(clamp(this.landT / 0.2, 0, 1) * Math.PI) * this.landS;
      T.squash -= 0.07 * k; T.bob += 0.035 * k; T.kneeN += 0.45 * k; T.kneeF += 0.45 * k; T.thighN += 0.22 * k; T.thighF += 0.22 * k; T.lean += 0.06 * k;
    }
    const kk = s.state === 'walk' || s.state === 'run' ? 28 : 11;
    const a = 1 - Math.exp(-kk * dt);
    for (const key of Object.keys(T) as (keyof Pose)[]) this.pose[key] = lerp(this.pose[key], T[key], a);

    // yüz
    this.blinkT -= dt;
    if (this.blinkT <= 0) { this.blinkV = 1; this.blinkT = 2.2 + Math.random() * 3.6; if (Math.random() < 0.18) this.blinkT = 0.25; }
    this.blinkV = Math.max(0, this.blinkV - dt * 7.5);
    const Ft = restFace();
    Ft.blink = this.blinkV > 0 ? Math.sin(this.blinkV * Math.PI) : 0;
    const em = this.emotion;
    if (em === 'saskin') { Ft.browUp = 1; Ft.mouthOpen = 0.32; }
    if (em === 'uzgun') { Ft.browSad = 1; Ft.smile = -0.35; Ft.eyeY = 0.5; }
    if (em === 'mutlu') { Ft.smile = 0.8; Ft.browUp = 0.35; }
    if (em === 'kizgin') { Ft.browUp = -1; Ft.smile = -0.3; }
    if (em === 'dusunceli') { Ft.eyeX = 0.6; Ft.eyeY = -0.6; Ft.browUp = 0.2; }
    if (em === 'gozkapali') { Ft.blink = 1; Ft.smile = 0.3; }
    if (this.talking) { this.talkT += dt; Ft.mouthOpen = Math.max(Ft.mouthOpen, 0.22 + 0.4 * Math.abs(Math.sin(this.talkT * 14))); }
    const fa = 1 - Math.exp(-14 * dt);
    for (const key of Object.keys(Ft) as (keyof Face)[]) {
      if (key === 'blink') this.face.blink = Ft.blink;
      else if (key === 'tear') this.face.tear = lerp(this.face.tear, this.tear, fa);
      else this.face[key] = lerp(this.face[key], Ft[key], fa);
    }
  }

  landed(strength: number) { this.landT = 0.2; this.landS = clamp(strength, 0.25, 1.2); }
}
