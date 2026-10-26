/**
 * ============================================================================
 *  GeoStrand — İlerleme, Puan ve Hava Seçimi (Progression)
 * ============================================================================
 *  Oyunun "her bölge aynı" hissini kıran üç saf mantık parçası:
 *
 *  1) Progression.tierFor(level)  → Hangi kademedeyiz? (yeni soru/ipucu açılır)
 *  2) ScoreKeeper                 → Bölge puanı ve ⭐ yıldız hesabı
 *       puan  = taban − (yanlış × ceza) + hızlı bonus + kademe bonusu (en az: minimum)
 *       yıldız: 3 = hatasız ve hızlı · 2 = en fazla 1 hata · 1 = diğer
 *  3) WeatherPicker.pick()        → Bu bölgede hava olayı olacak mı, hangisi?
 *
 *  Phaser'ı tanımaz; Node.js testleriyle doğrulanır.
 * ============================================================================
 */
(function (GS) {
  'use strict';

  // ==================================================================== //
  //  1) Kademeler
  // ==================================================================== //
  const Progression = {
    /**
     * @param {number} level 1'den başlayan bölge numarası
     * @param {object[]} tiers CONFIG.PROGRESSION.tiers (fromLevel'a göre artan)
     * @returns {object} kademe + index
     */
    tierFor(level, tiers) {
      let index = 0;
      tiers.forEach((t, i) => {
        if (level >= t.fromLevel) index = i;
      });
      return { ...tiers[index], index };
    },

    /** Bu bölge yeni bir kademenin ilk bölgesi mi? (kilit açılma bildirimi için) */
    isUnlockLevel(level, tiers) {
      return level > 1 && tiers.some((t) => t.fromLevel === level);
    },
  };

  // ==================================================================== //
  //  2) Puan ve yıldızlar
  // ==================================================================== //
  class ScoreKeeper {
    /** @param {object} config CONFIG.SCORE */
    constructor(config) {
      this.cfg = config;
      this.total = 0;
      this.history = []; // {level, points, stars, wrong, seconds}
      this.startLevel();
    }

    startLevel() {
      this.wrong = 0;
      this.seconds = 0;
    }

    /** Oyun zamanı ilerledikçe çağrılır (Pad açıkken yavaşlayan zaman sayılır) */
    tick(dt) {
      this.seconds += dt;
    }

    recordWrong() {
      this.wrong += 1;
    }

    /**
     * Bölge çözüldü: puan ve yıldızı hesapla, toplama ekle.
     * @param {number} tierIndex 0, 1, 2...
     */
    finishLevel(level, tierIndex) {
      const c = this.cfg;
      const fast = this.seconds <= c.fastTime;
      let points = c.base - this.wrong * c.wrongPenalty;
      points = Math.max(c.minimum, points);
      if (fast) points += c.fastBonus;
      points += tierIndex * c.tierBonus;

      const stars = this.wrong === 0 && fast ? 3 : this.wrong <= 1 ? 2 : 1;
      const result = { level, points, stars, wrong: this.wrong, seconds: Math.round(this.seconds), fast };
      this.total += points;
      this.history.push(result);
      return result;
    }

    get totalStars() {
      return this.history.reduce((sum, h) => sum + h.stars, 0);
    }
  }

  // ==================================================================== //
  //  3) Hava olayı seçimi
  // ==================================================================== //
  const WeatherPicker = {
    /**
     * @param {string} climateKey
     * @param {number} chance 0–1 (kademeden gelir)
     * @param {object} climateWeather GS.CLIMATE_WEATHER
     * @param {() => number} rng
     * @returns {string} hava anahtarı ('clear' = olay yok)
     */
    pick(climateKey, chance, climateWeather, rng = Math.random) {
      const options = climateWeather[climateKey] || [];
      if (!options.length || rng() >= chance) return 'clear';
      return options[Math.floor(rng() * options.length)];
    },
  };

  GS.Progression = Progression;
  GS.ScoreKeeper = ScoreKeeper;
  GS.WeatherPicker = WeatherPicker;
})(typeof module !== 'undefined' && module.exports ? module.exports : (window.GS = window.GS || {}));
