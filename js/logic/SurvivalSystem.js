/**
 * ============================================================================
 *  GeoStrand — Hayatta Kalma Sistemi (SurvivalSystem)
 * ============================================================================
 *  Üç değişkeni yönetir (hepsi 0–100):
 *    hp        : Can
 *    hydration : Su
 *    bodyTemp  : Vücut ısısı (HUD'da °C olarak gösterilir)
 *
 *  ALGORİTMA (her karede, dt saniye için):
 *   1) cezaÇarpanı   = ceza aktifse 2, değilse 1
 *   2) su    -= tabanSu   × ortam.suÇarpanı   × cezaÇarpanı × dt
 *   3) ısı   -= tabanIsı  × ortam.ısıÇarpanı  × cezaÇarpanı × dt
 *   4) Su veya Isı 0'a indiyse: HP, tükenen her bar için hasar alır.
 *      İkisi de eşiğin (50) üstündeyse: HP yavaşça iyileşir.
 *   5) Ceza sayacı azalır; 0 olunca ceza biter.
 *   6) HP 0 olursa oyuncu ölür (PLAYER_DIED olayı).
 *
 *  Bu sınıf Phaser'ı TANIMAZ: saf JavaScript'tir ve Node.js'te test edilebilir.
 * ============================================================================
 */
(function (GS) {
  'use strict';

  const STATS = ['hp', 'hydration', 'bodyTemp'];

  class SurvivalSystem {
    /**
     * @param {object} config  CONFIG.SURVIVAL
     * @param {object} [bus]   EventBus (opsiyonel; testlerde verilmeyebilir)
     * @param {object} [events] Olay adları (GS.EVENTS)
     */
    constructor(config, bus = null, events = null) {
      this.cfg = config;
      this.bus = bus;
      this.events = events || {};
      this.reset();
    }

    /** Tüm barları doldurur, cezayı ve ölüm durumunu sıfırlar. */
    reset() {
      this.hp = this.cfg.max;
      this.hydration = this.cfg.max;
      this.bodyTemp = this.cfg.max;
      this.penaltyRemaining = 0; // saniye
      this.penaltyMult = this.cfg.penaltyMultiplier;
      this.isDead = false;
    }

    // ------------------------------------------------------------------ //
    //  Okunabilir durum sorguları
    // ------------------------------------------------------------------ //

    get isPenalized() {
      return this.penaltyRemaining > 0;
    }

    /** Yanlış tahmin cezası varken ceza katı (2, 3, 4…), yoksa 1. */
    get decayMultiplier() {
      return this.isPenalized ? this.penaltyMult : 1;
    }

    /** 0–100 ısı barını gerçekçi bir vücut sıcaklığına (°C) çevirir. */
    get bodyTempCelsius() {
      const { tempMinC, tempMaxC, max } = this.cfg;
      return tempMinC + (this.bodyTemp / max) * (tempMaxC - tempMinC);
    }

    // ------------------------------------------------------------------ //
    //  Ana döngü
    // ------------------------------------------------------------------ //

    /**
     * Her karede çağrılır.
     * @param {number} dt  Geçen süre (saniye)
     * @param {{hydrationFactor:number, tempFactor:number}} env
     *        Ortam çarpanları: iklim tipi + gece/gündüz durumundan hesaplanır.
     */
    update(dt, env) {
      if (this.isDead || dt <= 0) return;

      const m = this.decayMultiplier;

      // (2) ve (3): Su ve ısı kaybı
      this.hydration = this._clamp(
        this.hydration - this.cfg.baseHydrationDecay * env.hydrationFactor * m * dt
      );
      this.bodyTemp = this._clamp(
        this.bodyTemp - this.cfg.baseTempDecay * env.tempFactor * m * dt
      );

      // (4): Can (HP) hesabı
      const depletedCount = (this.hydration <= 0 ? 1 : 0) + (this.bodyTemp <= 0 ? 1 : 0);
      if (depletedCount > 0) {
        this.hp -= this.cfg.hpDamagePerDepletedStat * depletedCount * dt;
      } else if (
        this.hydration >= this.cfg.regenThreshold &&
        this.bodyTemp >= this.cfg.regenThreshold
      ) {
        this.hp += this.cfg.hpRegen * dt;
      }
      this.hp = this._clamp(this.hp);

      // (5): Ceza sayacı
      if (this.penaltyRemaining > 0) {
        this.penaltyRemaining = Math.max(0, this.penaltyRemaining - dt);
        if (this.penaltyRemaining === 0) this._emit(this.events.PENALTY_END);
      }

      // (6): Ölüm kontrolü
      if (this.hp <= 0) {
        this.isDead = true;
        this._emit(this.events.PLAYER_DIED, this.getState());
      }
    }

    // ------------------------------------------------------------------ //
    //  Tahmin sonucuna bağlı müdahaleler
    // ------------------------------------------------------------------ //

    /**
     * YANLIŞ tahmin: barlar `duration` saniye boyunca `multiplier` kat hızlı düşer.
     * Üst üste yanlışlarda süre yenilenir, kat sayısı yenisiyle değişir.
     */
    startPenalty(duration = this.cfg.penaltyDuration, multiplier = this.cfg.penaltyMultiplier) {
      const wasPenalized = this.isPenalized;
      this.penaltyRemaining = duration;
      this.penaltyMult = multiplier;
      if (!wasPenalized) this._emit(this.events.PENALTY_START, { duration, multiplier });
    }

    /**
     * Bir bardan anında düşür (yanlış tahmin darbesi). Can (hp) ayrıca etkilenmez;
     * barlar boşalınca can her saniye azalır.
     * @returns {number} gerçekte düşen miktar
     */
    drain(stat, amount) {
      if (!STATS.includes(stat)) throw new Error(`Bilinmeyen bar: ${stat}`);
      if (this.isDead) return 0;
      const before = this[stat];
      this[stat] = this._clamp(before - amount);
      return before - this[stat];
    }

    /** DOĞRU tahmin: aktif ceza anında kalkar. */
    clearPenalty() {
      if (!this.isPenalized) return;
      this.penaltyRemaining = 0;
      this._emit(this.events.PENALTY_END);
    }

    /**
     * Bir barı doldurur (ör. Su Matarası içmek).
     * @returns {number} Gerçekte eklenen miktar (bar dolu ise daha az olabilir).
     */
    restore(stat, amount) {
      if (!STATS.includes(stat)) throw new Error(`Bilinmeyen bar: ${stat}`);
      if (this.isDead) return 0;
      const before = this[stat];
      this[stat] = this._clamp(before + amount);
      return this[stat] - before;
    }

    /** Bar dolu mu? (1 puandan az eksik de dolu sayılır: eşya boşa harcanmasın) */
    isFull(stat) {
      return this[stat] > this.cfg.max - 1;
    }

    /** HUD'a ve testlere verilecek anlık görüntü (kopya). */
    getState() {
      return {
        hp: this.hp,
        hydration: this.hydration,
        bodyTemp: this.bodyTemp,
        bodyTempCelsius: this.bodyTempCelsius,
        penaltyRemaining: this.penaltyRemaining,
        isPenalized: this.isPenalized,
        decayMultiplier: this.decayMultiplier,
        isDead: this.isDead,
      };
    }

    // ------------------------------------------------------------------ //
    _clamp(v) {
      return Math.max(0, Math.min(this.cfg.max, v));
    }

    _emit(name, payload) {
      if (this.bus && name) this.bus.emit(name, payload);
    }
  }

  GS.SurvivalSystem = SurvivalSystem;
})(typeof module !== 'undefined' && module.exports ? module.exports : (window.GS = window.GS || {}));
