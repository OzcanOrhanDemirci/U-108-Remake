export default async function ({ page }) {
  const res = await page.evaluate(async () => {
    const { audio, dogusSwell } = window.__ses;
    const olc = (buf, from = 0, to = 1) => { let peak = 0, sum = 0, n = 0; for (let ch = 0; ch < 2; ch++) { const d = buf.getChannelData(ch); for (let i = Math.floor(d.length * from); i < d.length * to; i++) { const v = Math.abs(d[i]); if (v > peak) peak = v; sum += d[i] * d[i]; n++; } } return { tepe: +peak.toFixed(3), rms_dB: +(20 * Math.log10(Math.sqrt(sum / n))).toFixed(1) }; };
    const off = new OfflineAudioContext(2, 48000 * 22, 48000);
    audio.init(off);
    const d = dogusSwell(0.05);
    const buf = await off.startRendering();
    const off2 = new OfflineAudioContext(2, 48000 * 4, 48000);
    audio.init(off2);
    for (let i = 0; i < 100; i++) { audio.lastBlip = -1; audio.noise(0.018, { gain: 0.07, type: 'bandpass', freq: 3600, q: 3, bus: 'voice', when: 0.05 + i * 0.03 }); audio.tone(2000, 0.02, { type: 'sine', gain: 0.012, bus: 'voice', when: 0.05 + i * 0.03 }); }
    const b2 = await off2.startRendering();
    const off3 = new OfflineAudioContext(2, 48000 * 4, 48000);
    audio.init(off3);
    for (let i = 0; i < 60; i++) audio.tone(330, 0.07, { type: 'square', gain: 0.035, bus: 'voice', cutoff: 1800, when: 0.05 + i * 0.05 });
    const b3 = await off3.startRendering();
    return { dogus_sure: d.toFixed(2), dogus_kabarma: olc(buf, 0, d / 22), dogus_cozulme: olc(buf, d / 22, 1), yazi_ai: olc(b2), yazi_karakter: olc(b3) };
  });
  console.log(JSON.stringify(res, null, 1));
}
