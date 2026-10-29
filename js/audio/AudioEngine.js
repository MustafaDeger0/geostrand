/**
 * ============================================================================
 *  GeoStrand — Ses Motoru (AudioEngine)
 * ============================================================================
 *  Tüm seslerin ortak altyapısı. Ses dosyası yoktur; her şey Web Audio API
 *  ile kodla üretilir.
 *
 *  SES YOLU:
 *     MusicGenerator ─┐
 *     AmbientLayer  ──┼─▶ [kanal ses düzeyi] ─▶ master ─▶ kompresör ─▶ hoparlör
 *     Efektler (sfx) ─┘          │
 *                                └─▶ yankı (reverb) ─┘   (müzik ve efektlerde)
 *
 *  ÖNEMLİ DÜZELTMELER (önceki sürüme göre):
 *   • Her nota bittiğinde düğümleri ayrılır (disconnect). Eski sürümde
 *     binlerce düğüm birikip ses işlemcisini boğuyor, sadece uğultu kalıyordu.
 *   • Kahverengi gürültü kaldırıldı; döngü sınırında "güm" yapan bas sesi yok.
 *   • Kompresör: aynı anda çok ses çalınca patlama/cızırtı olmaz.
 *   • Üç ayrı kanal (müzik, ortam, efekt) + ana ses: ayarlar menüsünden değişir,
 *     tarayıcıda hatırlanır.
 * ============================================================================
 */
(function (GS) {
  'use strict';

  const SETTINGS_KEY = 'geostrand-audio-v2';
  const DEFAULTS = { master: 0.85, music: 0.55, ambience: 0.45, sfx: 0.7, muted: false };

  class AudioEngine {
    constructor() {
      this.ctx = null;
      this.settings = loadSettings();
      this.activeVoices = 0; // çalan nota sayısı (test ve hata ayıklama için)
    }

    // ================================================================== //
    //  Kurulum
    // ================================================================== //

    /** Kullanıcı etkileşimi (tıklama / tuş) sırasında bir kez çağrılmalı. */
    init(existingContext) {
      if (this.ctx) return;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!existingContext && !AC) return; // ses desteklenmiyor → oyun sessiz çalışır
      const ctx = (this.ctx = existingContext || new AC());

      // Son aşama: kompresör (ani tepe seslerini yumuşatır)
      this.limiter = ctx.createDynamicsCompressor();
      this.limiter.threshold.value = -16;
      this.limiter.knee.value = 12;
      this.limiter.ratio.value = 4;
      this.limiter.connect(ctx.destination);

      this.master = this._gain(this.limiter);
      this.buses = {
        music: this._gain(this.master),
        ambience: this._gain(this.master),
        sfx: this._gain(this.master),
      };

      // Yankı: üretilmiş bir "oda yanıtı" ile
      this.reverb = ctx.createConvolver();
      this.reverb.buffer = makeImpulse(ctx, 2.6);
      this.reverbReturn = this._gain(this.master, 0.32);
      this.reverb.connect(this.reverbReturn);
      this.buses.music.connect(this.reverb);

      this.white = makeWhiteNoise(ctx, 2);

      this.music = new GS.MusicGenerator(this);
      this.ambience = new GS.AmbientLayer(this);
      this._applyVolumes(0.01);
    }

    get ready() {
      return !!this.ctx;
    }

    get muted() {
      return this.settings.muted;
    }

    // ================================================================== //
    //  Oyunun kullandığı arayüz
    // ================================================================== //

    /** Yeni bölge: ortam sesi profili + iklim müziği */
    setClimate(climateKey, weather = null) {
      if (!this.ready) return;
      this.ambience.setProfile(GS.CLIMATES[climateKey].audio);
      this.ambience.setWeather(weather);
      this.music.setTheme(GS.MUSIC_THEMES[climateKey]);
    }

    /**
     * Her kare.
     * @param {number} dt
     * @param {{light:number, waterDistance:number, moving:boolean, paused:boolean}} state
     */
    update(dt, state) {
      if (!this.ready) return;
      // Sekme/uygulama geri gelince ses bağlamını uyandır (çevrimdışı bağlamda resume yoktur)
      // (iOS'ta telefon çalınca bağlam "interrupted" olur: o da uyandırılır)
      const asleep = this.ctx.state === 'suspended' || this.ctx.state === 'interrupted';
      if (!this.paused && asleep && !(window.OfflineAudioContext && this.ctx instanceof OfflineAudioContext)) {
        const now = performance.now();
        if (!this._lastResume || now - this._lastResume > 1000) { // saniyede en fazla bir deneme
          this._lastResume = now;
          this.ctx.resume().catch(() => {});
        }
      }
      this.ambience.update(dt, state);
      this.music.setMood(state.light);
    }

    /** Uygulama arka plana alındı: tüm sesler sussun (pil ve kullanıcı için) */
    pause() {
      this.paused = true;
      if (this.ready && this.ctx.state === 'running' && this.ctx.suspend) this.ctx.suspend().catch(() => {});
    }

    /** Uygulama ön plana döndü */
    resume() {
      this.paused = false;
      if (this.ready && this.ctx.state !== 'running' && this.ctx.state !== 'closed') this.ctx.resume().catch(() => {});
    }

    toggleMute() {
      this.settings.muted = !this.settings.muted;
      this._save();
      return this.settings.muted;
    }

    /** @param {'master'|'music'|'ambience'|'sfx'} channel @param {number} value 0–1 */
    setVolume(channel, value) {
      this.settings[channel] = Math.max(0, Math.min(1, value));
      if (value > 0 && this.settings.muted) this.settings.muted = false; // kaydırıcıyı açmak sesi de açar
      this._save();
    }

    getSettings() {
      return { ...this.settings };
    }

    // ================================================================== //
    //  Efektler
    // ================================================================== //

    /**
     * @param {string} name 'interact'|'padOpen'|'correct'|'wrong'|'item'|'loot'|'death'|'arrive'|'click'
     *   açılış animasyonu: 'alarm'|'static'|'charge'|'blast'|'thud'|'radio'|'focus'|'bip'|'type'
     */
    sfx(name) {
      if (!this.ready) return;
      const t = this.ctx.currentTime + 0.01;
      const out = this.buses.sfx;
      switch (name) {
        case 'click':
          this.tone(out, 'sine', 880, 880, t, 0.05, 0.05);
          break;
        case 'interact':
          this.tone(out, 'triangle', 660, 660, t, 0.08, 0.09);
          this.tone(out, 'triangle', 990, 990, t + 0.07, 0.1, 0.08);
          break;
        case 'padOpen': // kâğıt hışırtısı
          this.noiseBurst(out, t, 0.18, 'bandpass', 2600, 0.05, 1.5);
          break;
        case 'correct': // parlak, yükselen arpej
          [72, 76, 79, 84].forEach((m, i) => this.tone(out, 'triangle', mtof(m), mtof(m), t + i * 0.09, 0.35, 0.1));
          this.tone(this.reverb, 'sine', mtof(84), mtof(84), t + 0.3, 0.8, 0.06);
          break;
        case 'wrong': // iki inen nota (sert değil, uyarıcı)
          this.tone(out, 'square', mtof(64), mtof(64), t, 0.16, 0.035, 1400);
          this.tone(out, 'square', mtof(59), mtof(57), t + 0.16, 0.35, 0.035, 1200);
          break;
        case 'item':
          this.tone(out, 'sine', 420, 760, t, 0.14, 0.09);
          break;
        case 'loot': // sandık: tahta "tak" + parlak, yükselen çan arpeji
          this.noiseBurst(out, t, 0.08, 'lowpass', 900, 0.12);
          [79, 83, 86, 91].forEach((m, i) => this.tone(out, 'sine', mtof(m), mtof(m), t + 0.05 + i * 0.06, 0.4, 0.07));
          this.tone(this.reverb, 'triangle', mtof(91), mtof(91), t + 0.3, 0.9, 0.04);
          break;
        case 'death':
          [67, 64, 60, 55].forEach((m, i) => this.tone(out, 'triangle', mtof(m), mtof(m), t + i * 0.28, 0.5, 0.08));
          break;
        // ---- Açılış animasyonu sesleri ----
        case 'alarm': // iki tonlu laboratuvar sireni (yumuşatılmış kare dalga)
          this.tone(out, 'square', 740, 740, t, 0.42, 0.045, 1800, 0.02);
          this.tone(out, 'square', 587, 587, t + 0.45, 0.42, 0.045, 1800, 0.02);
          break;
        case 'static': // telsiz/ekran cızırtısı
          this.noiseBurst(out, t, 0.32, 'bandpass', 3200, 0.09, 0.8);
          this.noiseBurst(out, t + 0.12, 0.18, 'highpass', 5000, 0.05);
          break;
        case 'charge': // ışınlanma kapsülü dolarken yükselen uğultu (2,8 sn)
          this.tone(out, 'sawtooth', 110, 880, t, 2.8, 0.035, 2200, 0.6);
          this.tone(out, 'sine', 220, 1760, t, 2.8, 0.05, null, 0.8);
          this.tone(this.reverb, 'sine', 440, 3520, t + 1.6, 1.2, 0.025, null, 0.4);
          break;
        case 'blast': // kuantum sıçraması: parlak patlama + derin gümbürtü
          this.noiseBurst(out, t, 1.1, 'lowpass', 2400, 0.3, 0.7);
          this.noiseBurst(out, t, 0.35, 'highpass', 3000, 0.12);
          this.tone(out, 'sine', 90, 28, t, 1.2, 0.3, null, 0.005);
          this.tone(this.reverb, 'triangle', 2400, 180, t, 0.9, 0.06, null, 0.005);
          break;
        case 'thud': // yere düşüş
          this.noiseBurst(out, t, 0.25, 'lowpass', 500, 0.2);
          this.tone(out, 'sine', 80, 40, t, 0.3, 0.2, null, 0.005);
          break;
        case 'radio': // bozuk telsiz: cızırtı kesikleri + sinyal yok bip'i
          [0, 0.16, 0.3, 0.52].forEach((d, i) => this.noiseBurst(out, t + d, 0.1 + (i % 2) * 0.06, 'bandpass', 1700 + i * 300, 0.08, 2));
          this.tone(out, 'square', 1250, 1250, t + 0.75, 0.12, 0.025, 2500);
          this.tone(out, 'square', 940, 940, t + 0.9, 0.18, 0.025, 2500);
          break;
        case 'focus': // odaklanma: yumuşak yükselen nefes
          this.noiseBurst(out, t, 0.8, 'bandpass', 900, 0.05, 0.6);
          this.tone(out, 'sine', 330, 990, t, 0.7, 0.05, null, 0.2);
          break;
        case 'bip': // bilgi bip'i (HUD parçaları gelirken)
          this.tone(out, 'sine', 1320, 1320, t, 0.09, 0.05);
          break;
        case 'type': // altyazı daktilo tıkırtısı (çok kısık)
          this.noiseBurst(out, t, 0.025, 'highpass', 4500, 0.025);
          break;
        case 'arrive':
          this.tone(out, 'sine', mtof(67), mtof(67), t, 0.4, 0.05);
          this.tone(out, 'sine', mtof(74), mtof(74), t + 0.2, 0.6, 0.05);
          break;
        default:
          break;
      }
    }

    // ================================================================== //
    //  Ortak ses üreticileri (MusicGenerator ve AmbientLayer de kullanır)
    // ================================================================== //

    /**
     * Tek nota: frekans f1 → f2 kayar; yumuşak açılış/kapanış.
     * Nota bitince tüm düğümleri otomatik ayrılır.
     */
    tone(dest, type, f1, f2, start, dur, vol, lowpass, attack = 0.01) {
      const ctx = this.ctx;
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.setValueAtTime(f1, start);
      if (f2 !== f1) osc.frequency.exponentialRampToValueAtTime(f2, start + dur);
      const g = this.envelope(start, dur, vol, attack);
      const nodes = [osc, g];
      osc.connect(g);
      if (lowpass) {
        const f = ctx.createBiquadFilter();
        f.type = 'lowpass';
        f.frequency.value = lowpass;
        g.connect(f).connect(dest);
        nodes.push(f);
      } else {
        g.connect(dest);
      }
      this.play(osc, start, dur, nodes);
    }

    /** Kısa, filtrelenmiş gürültü patlaması (ayak sesi, hışırtı, çalkalayıcı) */
    noiseBurst(dest, start, dur, filterType, freq, vol, q = 1) {
      const src = this.ctx.createBufferSource();
      src.buffer = this.white;
      const f = this.ctx.createBiquadFilter();
      f.type = filterType;
      f.frequency.value = freq;
      f.Q.value = q;
      const g = this.envelope(start, dur, vol, 0.004);
      src.connect(f).connect(g).connect(dest);
      this.play(src, start, dur, [src, f, g], Math.random() * 1.5);
    }

    /** Üstel açılış/kapanışlı ses düzeyi zarfı */
    envelope(start, dur, vol, attack = 0.01) {
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.0001, start);
      g.gain.exponentialRampToValueAtTime(Math.max(vol, 0.0002), start + attack);
      g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
      return g;
    }

    /** Kaynağı başlat/durdur ve bitince düğümleri temizle (sızıntı önleme) */
    play(source, start, dur, nodes, offset = 0) {
      this.activeVoices++;
      source.onended = () => {
        nodes.forEach((n) => n.disconnect());
        this.activeVoices--;
      };
      if (offset) source.start(start, offset);
      else source.start(start);
      source.stop(start + dur + 0.05);
    }

    // ================================================================== //
    //  İç yardımcılar
    // ================================================================== //

    _gain(dest, value = 1) {
      const g = this.ctx.createGain();
      g.gain.value = value;
      g.connect(dest);
      return g;
    }

    /** Ayarları düğümlere yumuşakça uygula */
    _applyVolumes(timeConstant = 0.08) {
      if (!this.ready) return;
      const s = this.settings;
      const now = this.ctx.currentTime;
      this.master.gain.setTargetAtTime(s.muted ? 0 : s.master, now, timeConstant);
      ['music', 'ambience', 'sfx'].forEach((k) => this.buses[k].gain.setTargetAtTime(s[k], now, timeConstant));
    }

    _save() {
      this._applyVolumes();
      try {
        window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
      } catch (e) {
        /* depolama kapalıysa ayarlar yalnızca bu oturumda geçerli */
      }
    }
  }

  // ==================================================================== //
  //  Yardımcılar
  // ==================================================================== //

  /** MIDI nota numarası → frekans (Hz). 69 = La4 = 440 Hz */
  function mtof(m) {
    return 440 * Math.pow(2, (m - 69) / 12);
  }

  function makeWhiteNoise(ctx, seconds) {
    const buffer = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  /** Yankı için sönümlenen gürültü (stereo, sol/sağ farklı → genişlik hissi) */
  function makeImpulse(ctx, seconds) {
    const length = Math.floor(ctx.sampleRate * seconds);
    const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch);
      for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 3);
    }
    return buffer;
  }

  function loadSettings() {
    try {
      const saved = JSON.parse(window.localStorage.getItem(SETTINGS_KEY) || '{}');
      return { ...DEFAULTS, ...saved };
    } catch (e) {
      return { ...DEFAULTS };
    }
  }

  GS.AudioEngine = AudioEngine;
  GS.mtof = mtof;
})(window.GS = window.GS || {});
