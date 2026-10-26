/**
 * ============================================================================
 *  GeoStrand — Gece/Gündüz Döngüsü (DayNightCycle)
 * ============================================================================
 *  Basit bir zamanlayıcı: oyun saati 0–24 arasında döner.
 *
 *  IŞIK SEVİYESİ FORMÜLÜ:
 *    güneşYüksekliği = cos( (saat − 12) / 24 × 2π )   // öğlen +1, gece yarısı −1
 *    ışık = smoothstep(−0.45, 0.3, güneşYüksekliği)  // 0 = zifiri karanlık, 1 = tam gün
 *    karanlık = (1 − ışık) × maxKaranlık
 *
 *  smoothstep sayesinde şafak ve gün batımı ani değil, yumuşak geçer.
 *  Ekrana çizim işi game/systems/LightingOverlay.js'tedir; bu sınıf sadece
 *  sayıları hesaplar (Phaser'dan bağımsız).
 * ============================================================================
 */
(function (GS) {
  'use strict';

  class DayNightCycle {
    /** @param {object} config CONFIG.DAY_NIGHT */
    constructor(config) {
      this.cfg = config;
      this.hour = config.startHour; // 0 ≤ hour < 24
      this.dayCount = 1;
    }

    /** @param {number} dt Geçen gerçek süre (saniye) */
    update(dt) {
      const hoursPerSecond = 24 / this.cfg.dayLengthSec;
      this.hour += dt * hoursPerSecond;
      while (this.hour >= 24) {
        this.hour -= 24;
        this.dayCount += 1;
      }
    }

    /** 0 (gece) – 1 (öğlen) arası ışık miktarı */
    get lightLevel() {
      const sunHeight = Math.cos(((this.hour - 12) / 24) * Math.PI * 2);
      return smoothstep(-0.45, 0.3, sunHeight);
    }

    /** Ekrana uygulanacak karanlık örtüsünün opaklığı */
    get darkness() {
      return (1 - this.lightLevel) * this.cfg.maxDarkness;
    }

    /** 0 = tam gündüz, 1 = tam gece. İklim ısı çarpanında kullanılır. */
    get nightness() {
      return 1 - this.lightLevel;
    }

    get isNight() {
      return this.lightLevel < 0.15;
    }

    /** HUD için evre adı ve simgesi */
    get phase() {
      const light = this.lightLevel;
      if (light < 0.15) return { label: 'Gece', icon: '🌙' };
      if (light >= 0.75) return { label: 'Gündüz', icon: '☀️' };
      return this.hour < 12 ? { label: 'Şafak', icon: '🌅' } : { label: 'Gün Batımı', icon: '🌇' };
    }

    /** "08:45" biçiminde saat (15 dakikalık adımlarla, titremesin diye) */
    formatClock() {
      const totalMinutes = Math.floor((this.hour * 60) / 15) * 15;
      const h = Math.floor(totalMinutes / 60) % 24;
      const m = totalMinutes % 60;
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }
  }

  /** 0–1 arası yumuşak geçiş fonksiyonu (Hermite eğrisi) */
  function smoothstep(edge0, edge1, x) {
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
  }

  GS.DayNightCycle = DayNightCycle;
})(typeof module !== 'undefined' && module.exports ? module.exports : (window.GS = window.GS || {}));
