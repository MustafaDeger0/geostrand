/**
 * ============================================================================
 *  GeoStrand — Hava Efektleri (WeatherFX)
 * ============================================================================
 *  weather.js'teki hava olayını ekrana çizer:
 *    • Yağış / savrulma: BootScene'de bir kez çizilen, kenarları birleşen
 *      256x256 hazır dokular (yağmur çizgileri, kar taneleri, kum tozları)
 *      ekranı kaplayan iki yüzeyde (TileSprite) kaydırılır — tıpkı bir GIF gibi.
 *      Ön katman iri ve hızlı, arka katman ince ve yavaş → derinlik hissi.
 *
 *      NEDEN BÖYLE? Eskiden her damla ayrı bir parçacıktı (ekranda aynı anda
 *      600-850 nesne). Her karede hepsinin konumu hesaplanıp çiziliyordu; zayıf
 *      bilgisayar ve telefonlarda oyun kasıyordu. Şimdi her kare yalnızca
 *      2 dörtgen çizilir, damla sayısı performansı hiç etkilemez.
 *
 *    • Pus (HTML): ekranı kaplayan yarı saydam renk → görüş azalır
 *  Oyun kuralı içermez; barlara etkisi GameScene'de hesaplanır.
 * ============================================================================
 */
(function (GS) {
  'use strict';

  const TILE = 256;
  const PAD = 96; // görünen alanın dışına taşsın: kamera hızlı kaysa ya da sarsılsa da kenar açılmasın

  /**
   * Katman ayarları: doku, hız (dünya px/sn), saydamlık.
   * sway: kar tanelerinin sağa sola salınımı (px)
   */
  const PRESETS = {
    rain: [
      { texture: 'wx_rain2', vx: -45, vy: 560, alpha: 0.6 },
      { texture: 'wx_rain', vx: -70, vy: 820, alpha: 0.85 },
    ],
    snow: [
      { texture: 'wx_snow2', vx: 120, vy: 140, alpha: 0.7, sway: 14 },
      { texture: 'wx_snow', vx: 190, vy: 210, alpha: 0.95, sway: 22 },
    ],
    dust: [
      { texture: 'wx_dust2', vx: 450, vy: 12, alpha: 0.6 },
      { texture: 'wx_dust', vx: 700, vy: 24, alpha: 0.85 },
    ],
  };

  class WeatherFX {
    /** @param {Phaser.Scene} scene */
    constructor(scene, doc) {
      this.scene = scene;
      this.haze = doc.getElementById('weather-haze');
      this.layers = [];
      this.time = 0;
    }

    /** @param {object} weather GS.WEATHERS öğesi */
    set(weather) {
      this.clear();
      this.haze.style.background = weather.haze || 'transparent';
      this.haze.classList.toggle('on', !!weather.haze);
      const preset = weather.particles && PRESETS[weather.particles];
      if (!preset) return;
      this.layers = preset.map((p, i) => ({
        ...p,
        sprite: this.scene.add.tileSprite(0, 0, TILE, TILE, p.texture)
          .setOrigin(0).setAlpha(p.alpha).setDepth(3950 + i),
        ox: Math.random() * TILE,
        oy: Math.random() * TILE,
      }));
      this.update(0);
    }

    /**
     * Her kare: yüzeyler kameranın gördüğü alanı kaplar, doku akar.
     * Doku dünyaya sabitlenir (kamera kayınca damlalar da yerinde kalır),
     * üstüne rüzgâr/yerçekimi akışı eklenir.
     * @param {number} dt saniye
     */
    update(dt = 0) {
      if (!this.layers.length) return;
      this.time += dt;
      const v = this.scene.cameras.main.worldView;
      const x = Math.floor(v.x) - PAD;
      const y = Math.floor(v.y) - PAD;
      const w = Math.ceil(v.width) + PAD * 2;
      const h = Math.ceil(v.height) + PAD * 2;
      for (const L of this.layers) {
        const s = L.sprite;
        if (s.width !== w || s.height !== h) s.setSize(w, h);
        s.setPosition(x, y);
        L.ox = (L.ox - L.vx * dt) % TILE;
        L.oy = (L.oy - L.vy * dt) % TILE;
        const sway = L.sway ? Math.sin(this.time * 0.9) * L.sway : 0;
        s.tilePositionX = x + L.ox + sway;
        s.tilePositionY = y + L.oy;
      }
    }

    clear() {
      this.layers.forEach((L) => L.sprite.destroy());
      this.layers = [];
      this.haze.classList.remove('on');
    }
  }

  GS.WeatherFX = WeatherFX;
})(window.GS = window.GS || {});
