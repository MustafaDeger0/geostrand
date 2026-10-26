/**
 * ============================================================================
 *  GeoStrand — Üretken Müzik (MusicGenerator)
 * ============================================================================
 *  Her iklimin müziği, musicThemes.js'teki tarife göre GERÇEK ZAMANLI üretilir.
 *  Aynı tema her çalışta aynı ruhu taşır ama notalar her seferinde biraz farklıdır.
 *
 *  ZAMANLAMA ("ileriye bakan zamanlayıcı"):
 *    setInterval her 50 ms'de bir uyanır ve önümüzdeki 0,25 saniyeye düşen
 *    sekizlik notaları Web Audio saatine göre önceden planlar. Böylece oyun
 *    karesi takılsa bile müzik ritmi kaymaz.
 *
 *  BİR ADIMDA (sekizlik nota) NELER ÇALAR:
 *    • Akor başında   : pad (yumuşak akor) + drone (varsa)
 *    • Ölçü başlarında: hafif bas
 *    • Arpej          : akor notalarından desene göre (yoğunluk olasılığıyla)
 *    • Ezgi           : dizide rastgele yürüyüş (1–2 basamak), ara ara susar
 *    • Vurmalı        : 16 adımlık desen
 *  Gece: ezgi/arpej seyrekleşir, pad filtresi kapanır → daha sakin.
 *  İklim değişince eski müzik 1 sn'de kısılır, yenisi 2 sn'de açılır.
 * ============================================================================
 */
(function (GS) {
  'use strict';

  /** Diziler (yarım ses aralıkları) */
  const MODES = {
    ionian: [0, 2, 4, 5, 7, 9, 11],           // majör: neşeli
    dorian: [0, 2, 3, 5, 7, 9, 10],           // minör ama umutlu
    phrygianDominant: [0, 1, 4, 5, 7, 8, 10], // Hicaz benzeri: çöl/Orta Doğu rengi
    lydian: [0, 2, 4, 6, 7, 9, 11],           // havada asılı, gizemli
    mixolydian: [0, 2, 4, 5, 7, 9, 10],       // güneşli, halk müziği rengi
    aeolian: [0, 2, 3, 5, 7, 8, 10],          // doğal minör: soğuk, düşünceli
  };

  const STEPS_PER_CHORD = 16; // 2 ölçü × 8 sekizlik
  const LOOKAHEAD = 0.25;     // saniye
  const TICK_MS = 50;

  class MusicGenerator {
    /** @param {GS.AudioEngine} engine */
    constructor(engine) {
      this.engine = engine;
      this.ctx = engine.ctx;

      // Tema geçişi için kendi ses düzeyi düğümü
      this.out = this.ctx.createGain();
      this.out.gain.value = 0;
      this.out.connect(engine.buses.music);

      // Hafif eko (arpej ve ezgi için): noktalı sekizlik gecikme
      this.delay = this.ctx.createDelay(1.5);
      this.delayFeedback = this.ctx.createGain();
      this.delayFeedback.gain.value = 0.28;
      this.delayWet = this.ctx.createGain();
      this.delayWet.gain.value = 0.22;
      this.delay.connect(this.delayFeedback).connect(this.delay);
      this.delay.connect(this.delayWet).connect(this.out);

      this.theme = null;
      this.mood = 1;          // 1 = gündüz, 0 = gece
      this.step = 0;
      this.nextTime = 0;
      this.melodyPos = 2;
      this.timer = null;
    }

    // ================================================================== //
    //  Kontrol
    // ================================================================== //

    setTheme(theme) {
      if (!theme || theme === this.theme) return;
      const now = this.ctx.currentTime;
      const switchNow = () => {
        this.theme = theme;
        this.step = 0;
        this.melodyPos = 2;
        this.nextTime = this.ctx.currentTime + 0.1;
        const beat = 60 / theme.bpm;
        this.delay.delayTime.setValueAtTime(beat * 0.75, this.ctx.currentTime);
        this.out.gain.cancelScheduledValues(this.ctx.currentTime);
        this.out.gain.setValueAtTime(0.0001, this.ctx.currentTime);
        this.out.gain.exponentialRampToValueAtTime(1, this.ctx.currentTime + 2);
      };

      if (this.theme) {
        // Eski temayı kıs, sonra değiştir
        this.out.gain.cancelScheduledValues(now);
        this.out.gain.setTargetAtTime(0.0001, now, 0.25);
        this.theme = null; // geçişte yeni nota planlanmasın
        setTimeout(switchNow, 1000);
      } else {
        switchNow();
      }
      this.start();
    }

    /** @param {number} light 0 (gece) – 1 (gündüz) */
    setMood(light) {
      this.mood = light;
    }

    start() {
      if (this.timer) return;
      this.timer = setInterval(() => this.scheduleUntil(this.ctx.currentTime + LOOKAHEAD), TICK_MS);
    }

    stop() {
      clearInterval(this.timer);
      this.timer = null;
    }

    /** Verilen zamana kadar olan tüm adımları planla (testlerde doğrudan çağrılabilir) */
    scheduleUntil(untilTime) {
      if (!this.theme) return;
      const stepDur = 60 / this.theme.bpm / 2; // sekizlik nota süresi
      // Sekme arka plandayken zamanlayıcı geride kaldıysa geçmişi çalma, şimdiden devam et
      if (this.nextTime < this.ctx.currentTime - 0.5) this.nextTime = this.ctx.currentTime + 0.05;
      while (this.nextTime < untilTime) {
        this._scheduleStep(this.step, this.nextTime, stepDur);
        this.nextTime += stepDur;
        this.step++;
      }
    }

    // ================================================================== //
    //  Bir adımın bestesi
    // ================================================================== //

    _scheduleStep(step, time, stepDur) {
      const th = this.theme;
      const night = 1 - this.mood;
      const chordIndex = Math.floor(step / STEPS_PER_CHORD) % th.progression.length;
      const inChord = step % STEPS_PER_CHORD;
      const chord = this._chordTones(th.progression[chordIndex]);

      // 1) Pad akoru (her akorun başında, 2 ölçü boyunca)
      if (inChord === 0) {
        const cutoff = th.pad.cutoff * (0.55 + 0.45 * this.mood);
        // Pad akorları en az Fa4 (65) civarında: alçakta sürekli akor "uğultu" gibi algılanır
        const shift = chord[0] < 62 ? 12 : 0;
        chord.forEach((m) => this._pad(m + shift, time, stepDur * STEPS_PER_CHORD, th.pad.wave, cutoff));
        if (th.drone) {
          this._pad(th.root, time, stepDur * STEPS_PER_CHORD, 'sawtooth', 700);
          this._pad(th.root + 7, time, stepDur * STEPS_PER_CHORD, 'sawtooth', 700);
        }
      }

      // 2) Bas: ölçü başlarında, hafif
      if (th.bass && inChord % 8 === 0) {
        this.engine.tone(this.out, 'triangle', GS.mtof(chord[0] - 12), GS.mtof(chord[0] - 12), time, stepDur * 5, 0.07, 700, 0.02);
      }

      // 3) Arpej
      if (th.arp) {
        const idx = th.arp.pattern[inChord % th.arp.pattern.length];
        const density = th.arp.density * (1 - night * 0.45);
        if (idx !== null && Math.random() < density) {
          const note = chord[idx % chord.length] + 12 + (idx >= chord.length ? 12 : 0);
          this._lead(th.arp.instrument, note, time, stepDur * 1.6, 0.55);
        }
      }

      // 4) Ezgi: çift adımlarda, dizide küçük adımlarla gezinir
      if (th.melody && inChord % 2 === 0 && Math.random() < th.melody.density * (1 - night * 0.6)) {
        const scale = this._melodyScale();
        this.melodyPos = Phaser.Math.Clamp(this.melodyPos + Phaser.Math.Between(-2, 2), 0, scale.length - 1);
        const long = Math.random() < 0.35;
        this._lead(th.melody.instrument, scale[this.melodyPos], time, stepDur * (long ? 4 : 2), 0.7);
      }

      // 5) Vurmalı
      if (th.perc) {
        const vel = th.perc.pattern[step % th.perc.pattern.length] * (1 - night * 0.5);
        if (vel > 0) this._perc(th.perc.kind, time, vel);
      }
    }

    /** Dizinin `degree`. derecesi üzerine üçlü akor (MIDI notaları) */
    _chordTones(degree) {
      return [0, 2, 4].map((k) => this.theme.root + this._modeNote(degree + k));
    }

    _modeNote(i) {
      const mode = MODES[this.theme.mode];
      return mode[((i % 7) + 7) % 7] + 12 * Math.floor(i / 7);
    }

    /** Ezginin kullanacağı notalar: 2 oktav, tema dizisinin seçili dereceleri */
    _melodyScale() {
      const th = this.theme;
      const notes = [];
      for (let oct = 0; oct < 2; oct++) {
        th.melody.scale.forEach((d) => notes.push(th.root + 12 + this._modeNote(d) + oct * 12));
      }
      return notes;
    }

    // ================================================================== //
    //  Enstrümanlar
    // ================================================================== //

    /** Pad: iki hafif akortsuz osilatör → alçak geçiren filtre → yavaş açılış */
    _pad(midi, time, dur, wave, cutoff) {
      const ctx = this.ctx;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = cutoff;
      const g = ctx.createGain();
      const vol = wave === 'sawtooth' ? 0.016 : 0.026;
      g.gain.setValueAtTime(0.0001, time);
      g.gain.exponentialRampToValueAtTime(vol, time + Math.min(1.2, dur * 0.3));
      g.gain.setValueAtTime(vol, time + dur * 0.75);
      g.gain.exponentialRampToValueAtTime(0.0001, time + dur + 0.6);
      filter.connect(g).connect(this.out);

      [-6, 6].forEach((cents, i) => {
        const osc = ctx.createOscillator();
        osc.type = wave;
        osc.frequency.value = GS.mtof(midi);
        osc.detune.value = cents;
        osc.connect(filter);
        // İlk osilatör bitince ortak filtre ve ses düğümünü de ayır
        this.engine.play(osc, time, dur + 0.6, i === 0 ? [osc, filter, g] : [osc]);
      });
    }

    /** Arpej/ezgi enstrümanları */
    _lead(instrument, midi, time, dur, vel) {
      const e = this.engine;
      const f = GS.mtof(midi);
      const dest = this.out;
      const echo = this.delay;
      switch (instrument) {
        case 'marimba': // tahta tokmak: temel + 4. harmonik, çabuk söner
          e.tone(dest, 'sine', f, f, time, 0.45, 0.09 * vel, null, 0.004);
          e.tone(dest, 'sine', f * 4, f * 4, time, 0.08, 0.02 * vel, null, 0.002);
          e.tone(echo, 'sine', f, f, time, 0.3, 0.04 * vel, null, 0.004);
          break;
        case 'guitar': // tel çekme: üçgen dalga + kapanan filtre
          e.tone(dest, 'triangle', f, f, time, 0.7, 0.08 * vel, 2200, 0.003);
          e.tone(echo, 'triangle', f, f, time, 0.4, 0.04 * vel, 1800, 0.003);
          break;
        case 'oud': // ud: testere dişi, koyu filtre, hafif akortsuz çift tel
          e.tone(dest, 'sawtooth', f, f, time, 0.55, 0.05 * vel, 2200, 0.003);
          e.tone(dest, 'sawtooth', f * 1.004, f * 1.004, time, 0.5, 0.035 * vel, 1900, 0.003);
          e.tone(echo, 'sawtooth', f, f, time, 0.35, 0.02 * vel, 1200, 0.003);
          break;
        case 'flute': // flüt: yumuşak açılan sinüs + vibrato
          this._flute(f, time, dur, vel);
          break;
        case 'bell': // çan: temel + uyumsuz kısmi ses (2,76×), uzun söner
          e.tone(dest, 'sine', f, f, time, 2.2, 0.09 * vel, null, 0.003);
          e.tone(dest, 'sine', f * 2.76, f * 2.76, time, 0.9, 0.02 * vel, null, 0.003);
          e.tone(echo, 'sine', f, f, time, 1.2, 0.03 * vel, null, 0.003);
          break;
        case 'glass': // cam: temel + 3. harmonik, yavaş açılır
          e.tone(dest, 'sine', f, f, time, 3, 0.085 * vel, null, 0.03);
          e.tone(dest, 'sine', f * 3, f * 3, time, 1.6, 0.012 * vel, null, 0.03);
          e.tone(echo, 'sine', f, f, time, 1.5, 0.025 * vel, null, 0.03);
          break;
        default: // 'pluck'
          e.tone(dest, 'triangle', f, f, time, 0.5, 0.07 * vel, 1600, 0.003);
          e.tone(echo, 'triangle', f, f, time, 0.3, 0.03 * vel, 1600, 0.003);
          break;
      }
    }

    _flute(freq, time, dur, vel) {
      const ctx = this.ctx;
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 5;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = freq * 0.006; // ±%0,6 vibrato
      lfo.connect(lfoGain).connect(osc.frequency);
      const g = ctx.createGain();
      const vol = 0.06 * vel;
      g.gain.setValueAtTime(0.0001, time);
      g.gain.exponentialRampToValueAtTime(vol, time + 0.08);
      g.gain.setValueAtTime(vol, time + dur * 0.6);
      g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
      osc.connect(g);
      g.connect(this.out);
      g.connect(this.delay);
      this.engine.play(osc, time, dur, [osc, g, lfoGain]);
      lfo.start(time);
      lfo.stop(time + dur + 0.05);
      lfo.onended = () => lfo.disconnect();
    }

    /** Hafif vurmalılar */
    _perc(kind, time, vel) {
      const e = this.engine;
      if (kind === 'shaker') {
        e.noiseBurst(this.out, time, 0.05, 'highpass', 7000, 0.035 * vel);
      } else if (kind === 'rain') {
        e.noiseBurst(this.out, time + Math.random() * 0.03, 0.03, 'bandpass', 5000, 0.025 * vel, 2);
      } else if (kind === 'drum') {
        // Def: kısa, tok ama boğuk olmayan vuruş (alçak frekans bilinçli olarak sınırlı)
        e.tone(this.out, 'sine', 210, 120, time, 0.18, 0.09 * vel, null, 0.002);
        e.noiseBurst(this.out, time, 0.03, 'bandpass', 1800, 0.03 * vel, 1);
      }
    }
  }

  GS.MusicGenerator = MusicGenerator;
  GS.MUSIC_MODES = MODES;
})(window.GS = window.GS || {});
