/**
 * ============================================================================
 *  GeoStrand — Hava Efektleri (WeatherFX)
 * ============================================================================
 *  weather.js'teki hava olayını ekrana çizer:
 *    • Parçacıklar (Phaser): yağmur damlası, kar tanesi, savrulan kum
 *      Yayıcı (emitter) her karede kameranın gördüğü alanın üstüne taşınır.
 *    • Pus (HTML): ekranı kaplayan yarı saydam renk → görüş azalır
 *  Oyun kuralı içermez; barlara etkisi GameScene'de hesaplanır.
 * ============================================================================
 */
(function (GS) {
  'use strict';

  const SPAN = 1800; // yayıcının kapsadığı genişlik (en geniş görüş alanından büyük)

  /** Parçacık ayarları: hava türüne göre */
  const PRESETS = {
    rain: {
      texture: 'p_rain',
      anchor: 'top',
      config: {
        x: { min: 0, max: SPAN }, y: 0,
        lifespan: 1100, speedY: { min: 650, max: 850 }, speedX: { min: -90, max: -60 },
        rotate: 6, alpha: { start: 0.85, end: 0.4 }, quantity: 8, frequency: 16,
      },
    },
    snow: {
      texture: 'p_snow',
      anchor: 'top',
      config: {
        x: { min: 0, max: SPAN }, y: 0,
        lifespan: 4200, speedY: { min: 160, max: 260 }, speedX: { min: 120, max: 260 },
        scale: { min: 0.5, max: 1.2 }, alpha: { start: 0.95, end: 0.5 }, quantity: 4, frequency: 20,
      },
    },
    dust: {
      texture: 'p_dust',
      anchor: 'left',
      config: {
        x: 0, y: { min: 0, max: SPAN },
        lifespan: 2600, speedX: { min: 520, max: 780 }, speedY: { min: -30, max: 40 },
        scale: { min: 0.6, max: 1.4 }, alpha: { start: 0.8, end: 0 }, quantity: 4, frequency: 18,
      },
    },
  };

  class WeatherFX {
    /** @param {Phaser.Scene} scene */
    constructor(scene, doc) {
      this.scene = scene;
      this.haze = doc.getElementById('weather-haze');
      this.emitter = null;
      this.preset = null;
    }

    /** @param {object} weather GS.WEATHERS öğesi */
    set(weather) {
      this.clear();
      this.haze.style.background = weather.haze || 'transparent';
      this.haze.classList.toggle('on', !!weather.haze);
      if (!weather.particles) return;
      this.preset = PRESETS[weather.particles];
      this.emitter = this.scene.add.particles(0, 0, this.preset.texture, this.preset.config).setDepth(3950);
    }

    /** Yayıcıyı kameranın görünen alanının üst (ya da sol) kenarına taşı */
    update() {
      if (!this.emitter) return;
      const v = this.scene.cameras.main.worldView;
      if (this.preset.anchor === 'top') this.emitter.setPosition(v.x - 200, v.y - 30);
      else this.emitter.setPosition(v.x - 60, v.y - 200);
    }

    clear() {
      if (this.emitter) this.emitter.destroy();
      this.emitter = null;
      this.preset = null;
      this.haze.classList.remove('on');
    }
  }

  GS.WeatherFX = WeatherFX;
})(window.GS = window.GS || {});
