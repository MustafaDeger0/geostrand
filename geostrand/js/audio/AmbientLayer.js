/**
 * ============================================================================
 *  GeoStrand — Ortam Sesleri (AmbientLayer)
 * ============================================================================
 *  Müziğin altında çalan doğa sesleri. Her iklimin karışımı climates.js → audio.
 *
 *  SÜREKLİ KATMANLAR (beyaz gürültü + filtre):
 *    🌬️ Rüzgâr : yüksek geçiren (alt frekanslar kesik: uğultu yok) + gezinen bant filtre
 *    🌧️ Yağmur : 2–7 kHz arası hışırtı
 *    🌊 Su     : 400–1200 Hz arası, dalgalanan şıpırtı; suya yaklaştıkça artar
 *  ARALIKLI SESLER:
 *    🐦 Kuş (gündüz) · 🦗 Cırcır böceği (gece) · 👣 Ayak sesi (zemine göre)
 *
 *  Not: Önceki sürümdeki "kahverengi gürültü" kaldırıldı; döngü sınırında
 *  oluşan bas gümlemesinin kaynağı oydu.
 * ============================================================================
 */
(function (GS) {
  'use strict';

  /** Ayak sesi: zemine göre filtre ve süre */
  const SURFACES = {
    grass: { type: 'bandpass', freq: 1400, dur: 0.06, vol: 0.05, q: 0.8 },
    sand:  { type: 'bandpass', freq: 2600, dur: 0.08, vol: 0.035, q: 0.6 },
    snow:  { type: 'highpass', freq: 3000, dur: 0.1, vol: 0.05, q: 0.7 },
    mud:   { type: 'bandpass', freq: 800, dur: 0.08, vol: 0.06, q: 1.2 },
  };

  class AmbientLayer {
    /** @param {GS.AudioEngine} engine */
    constructor(engine) {
      this.engine = engine;
      this.ctx = engine.ctx;
      this.out = engine.buses.ambience;
      this.profile = { wind: 0, rain: 0, birds: 0, insects: 0, surface: 'grass' };

      this.wind = this._loop([['highpass', 280, 0.7], ['bandpass', 700, 0.6]]);
      this.rain = this._loop([['highpass', 2000, 0.7], ['lowpass', 7000, 0.7]]);
      this.water = this._loop([['bandpass', 700, 0.9]]);

      this.gust = 0.5;
      this.waterPhase = 0;
      this.birdTimer = 1;
      this.insectTimer = 1;
      this.stepTimer = 0;
    }

    /** Gürültü kaynağı → filtre zinciri → ses düzeyi (sürekli çalar) */
    _loop(filters) {
      const src = this.ctx.createBufferSource();
      src.buffer = this.engine.white;
      src.loop = true;
      let node = src;
      const created = filters.map(([type, freq, q]) => {
        const f = this.ctx.createBiquadFilter();
        f.type = type;
        f.frequency.value = freq;
        f.Q.value = q;
        node.connect(f);
        node = f;
        return f;
      });
      const gain = this.ctx.createGain();
      gain.gain.value = 0;
      node.connect(gain).connect(this.out);
      src.start();
      return { src, filters: created, gain };
    }

    /** Hava olayı: rüzgâr ve yağmur katmanlarına ek yoğunluk (fırtına, sağanak) */
    setWeather(weather) {
      this.weather = { wind: (weather && weather.wind) || 0, rain: (weather && weather.rain) || 0 };
    }

    setProfile(profile) {
      this.profile = { ...this.profile, ...profile };
      this.birdTimer = 0.8;
      this.insectTimer = 0.8;
    }

    /**
     * @param {number} dt
     * @param {{light:number, waterDistance:number, moving:boolean, paused:boolean}} s
     */
    update(dt, { light, waterDistance, moving, paused }) {
      const p = this.profile;
      const now = this.ctx.currentTime;
      const night = 1 - light;

      // Rüzgâr: yavaşça değişen esinti
      this.gust = Phaser.Math.Clamp(this.gust + (Math.random() - 0.5) * dt * 1.2, 0, 1);
      const w = this.weather || { wind: 0, rain: 0 };
      const wind = Math.min(1.4, p.wind + w.wind);
      this.wind.gain.gain.setTargetAtTime(wind * (0.04 + this.gust * 0.07) * (1 + night * 0.25), now, 0.5);
      this.wind.filters[1].frequency.setTargetAtTime(500 + this.gust * 900, now, 0.5);

      // Yağmur
      this.rain.gain.gain.setTargetAtTime(Math.min(1.2, p.rain + w.rain) * 0.045, now, 0.6);

      // Su: yakınlığa göre + yavaş dalgalanma (şıpırtı hissi)
      this.waterPhase += dt * 1.3;
      const near = Phaser.Math.Clamp(1 - waterDistance / 260, 0, 1);
      const lap = 0.75 + 0.25 * Math.sin(this.waterPhase) * Math.sin(this.waterPhase * 0.37);
      this.water.gain.gain.setTargetAtTime(near * near * 0.12 * lap, now, 0.2);
      this.water.filters[0].frequency.setTargetAtTime(600 + 300 * Math.sin(this.waterPhase * 0.7), now, 0.3);

      if (paused) return;

      if (p.birds > 0 && light > 0.55) {
        this.birdTimer -= dt;
        if (this.birdTimer <= 0) {
          this._chirp();
          this.birdTimer = (1.2 + Math.random() * 3) / p.birds;
        }
      }
      if (p.insects > 0 && light < 0.35) {
        this.insectTimer -= dt;
        if (this.insectTimer <= 0) {
          this._cricket();
          this.insectTimer = (0.5 + Math.random() * 1.2) / p.insects;
        }
      }
      if (moving) {
        this.stepTimer -= dt;
        if (this.stepTimer <= 0) {
          const s = SURFACES[p.surface] || SURFACES.grass;
          this.engine.noiseBurst(this.out, this.ctx.currentTime + 0.01, s.dur, s.type, s.freq * (0.85 + Math.random() * 0.3), s.vol, s.q);
          this.stepTimer = 0.34;
        }
      } else {
        this.stepTimer = 0;
      }
    }

    /** Kuş: 2–5 kısa, kayan nota; sağ-sol rastgele */
    _chirp() {
      const t = this.ctx.currentTime + 0.02;
      const base = 2400 + Math.random() * 1800;
      const notes = 2 + Math.floor(Math.random() * 4);
      const pan = this._panner(Math.random() * 1.6 - 0.8, notes * 0.12 + 0.3);
      for (let i = 0; i < notes; i++) {
        const s = t + i * (0.08 + Math.random() * 0.05);
        const up = Math.random() < 0.5;
        this.engine.tone(pan, 'sine', base * (up ? 0.85 : 1.15), base * (up ? 1.2 : 0.8), s, 0.07, 0.025, null, 0.008);
      }
    }

    /** Cırcır böceği: aynı perdede 3–6 çok kısa darbe */
    _cricket() {
      const t = this.ctx.currentTime + 0.02;
      const f = 4300 + Math.random() * 600;
      const pulses = 3 + Math.floor(Math.random() * 4);
      const pan = this._panner(Math.random() * 1.6 - 0.8, pulses * 0.05 + 0.3);
      for (let i = 0; i < pulses; i++) {
        this.engine.tone(pan, 'sine', f, f, t + i * 0.05, 0.03, 0.01, null, 0.004);
      }
    }

    /** Geçici sağ-sol konumlandırıcı; işi bitince kendini ayırır */
    _panner(value, lifetime) {
      if (!this.ctx.createStereoPanner) return this.out;
      const p = this.ctx.createStereoPanner();
      p.pan.value = value;
      p.connect(this.out);
      setTimeout(() => p.disconnect(), (lifetime + 0.5) * 1000);
      return p;
    }
  }

  GS.AmbientLayer = AmbientLayer;
})(window.GS = window.GS || {});
