// Çevrimdışı ses ölçümü: her müzik parçasını + ortamı 16 sn render eder, tepe ve RMS ölçer (duyamadığım için sayıyla).
export default async function ({ page }) {
  const res = await page.evaluate(async () => {
    const { audio, music } = window.__ses;
    const out = {};
    const olc = (buf) => {
      let peak = 0, sum = 0, n = 0;
      for (let ch = 0; ch < buf.numberOfChannels; ch++) { const d = buf.getChannelData(ch); for (let i = 0; i < d.length; i++) { const v = Math.abs(d[i]); if (v > peak) peak = v; sum += d[i] * d[i]; n++; } }
      return { tepe: +peak.toFixed(3), rms: +Math.sqrt(sum / n).toFixed(4), tepe_dB: +(20 * Math.log10(peak)).toFixed(1), rms_dB: +(20 * Math.log10(Math.sqrt(sum / n))).toFixed(1) };
    };
    const render = async (f, sec = 16) => {
      const off = new OfflineAudioContext(2, 48000 * sec, 48000);
      audio.init(off);
      f(off, sec);
      return olc(await off.startRendering());
    };
    for (const p of ['orman', 'karanlik', 'sonbahar', 'laboratuvar', 'ziyaret']) {
      out['muzik_' + p] = await render((off, sec) => { music.play(p, 0.1); music.scheduleUntil(sec); });
    }
    out['piyano2023_kayit'] = await render(() => { audio.play('piyano2023', { bus: 'music', gain: 0.9 }); });
    out['piyano_final'] = await render(() => { audio.play('piyano', { bus: 'music', gain: 0.75, reverb: 0.35, offset: 20 }); });
    out['ses_2023'] = await render(() => { audio.play('sesBilinc', { bus: 'voice', gain: 1.15, reverb: 0.15 }); }, 10);
    out['dogus'] = await render((off) => { const { dogusSwell } = window.__dogus || {}; }, 2);
    out['ruzgar+yaprak'] = await render(() => { audio.ambience('ruzgar', 0.5, 0.01); audio.ambience('yaprak', 0.25, 0.01); });
    out['ugultu'] = await render(() => { audio.ambience('ugultu', 0.35, 0.01); });
    out['bosluk'] = await render(() => { audio.ambience('bosluk', 0.35, 0.01); });
    out['yazi_ai_100harf'] = await render((off) => { for (let i = 0; i < 100; i++) { audio.lastBlip = -1; const t0 = 0.05 + i * 0.03; } }, 4);
    return out;
  });
  for (const [k, v] of Object.entries(res)) console.log(k.padEnd(20), JSON.stringify(v));
}
