/**
 * ============================================================================
 *  GeoStrand — Tahmin Değerlendirici (PredictionEvaluator)
 * ============================================================================
 *  Oyuncunun Coğrafyacı Pad'inde yaptığı tahmini gerçek konumla karşılaştırır.
 *  Hangi alanların sorulacağı KADEMEYE göre değişir (Config → PROGRESSION):
 *    Bölge 1–2 : yarım küre, iklim, enlem
 *    Bölge 3–4 : + yer şekli (ova / plato / dağ)
 *    Bölge 5+  : + kıta
 *
 *  KARAR MANTIĞI:
 *    yarımKüre / iklim / yerŞekli / kıta : birebir eşleşmeli
 *    enlem : |tahmin − gerçek| ≤ tolerans (kademe ilerledikçe daralır: 7° → 5°)
 *    SONUÇ DOĞRU = sorulan alanların HEPSİ doğruysa
 *
 *  Yanlışta cevabı vermez; her alan için nereye bakılacağını söyleyen
 *  kısa bir ipucu üretir.
 * ============================================================================
 */
(function (GS) {
  'use strict';

  const DEFAULT_FIELDS = ['hemisphere', 'climate', 'latitude'];

  /** Alan tanımları: etiket, eksik form mesajı, doğruluk kontrolü, ipucu */
  const FIELDS = {
    hemisphere: {
      label: 'Yarım Küre',
      missing: 'Yarım küre seç',
      check: (g, loc) => g.hemisphere === loc.hemisphere,
      hint: () => 'Gölge hangi yöne düşüyor? Gölge kutba bakar.',
    },
    climate: {
      label: 'İklim',
      missing: 'İklim seç',
      check: (g, loc) => g.climate === loc.climate,
      hint: () => 'Bitki ve toprak etiketlerine tekrar bak.',
    },
    latitude: {
      label: 'Enlem',
      missing: 'Enlem 0°–90° olmalı',
      // enlem için ayrıca tolerans ve yön hesaplanır (aşağıda)
    },
    landform: {
      label: 'Yer şekli',
      missing: 'Yer şekli seç',
      check: (g, loc) => g.landform === loc.landform,
      hint: () => 'Yükselti ölçere bak: yükseklik ve eğim birlikte yer şeklini söyler.',
    },
    continent: {
      label: 'Kıta',
      missing: 'Kıta seç',
      check: (g, loc) => g.continent === loc.continent,
      hint: () => 'Hayvan izlerine bak: bu hayvanlar hangi kıtada yaşar?',
    },
  };

  class PredictionEvaluator {
    /**
     * @param {{latitudeTolerance:number, climates:object}} options
     */
    constructor({ latitudeTolerance, climates }) {
      this.tolerance = latitudeTolerance;
      this.climates = climates;
    }

    /**
     * Form eksik mi? Değerlendirmeden önce çağrılır.
     * @param {object} guess
     * @param {string[]} [fields] sorulan alanlar
     * @returns {string[]} Hata mesajları (boşsa form geçerli)
     */
    validate(guess, fields = DEFAULT_FIELDS) {
      const g = guess || {};
      const errors = [];
      fields.forEach((f) => {
        if (f === 'latitude') {
          const lat = Number(g.latitude);
          if (!Number.isFinite(lat) || lat < 0 || lat > 90) errors.push(FIELDS.latitude.missing);
        } else if (!g[f]) {
          errors.push(FIELDS[f].missing);
        }
      });
      return errors;
    }

    /**
     * @param {object} guess  {hemisphere, climate, latitude, landform?, continent?}
     * @param {object} location GS.LOCATIONS öğesi
     * @param {{fields?:string[], latitudeTolerance?:number}} [options]
     */
    evaluate(guess, location, { fields = DEFAULT_FIELDS, latitudeTolerance = this.tolerance } = {}) {
      const feedback = fields.map((f) => {
        if (f === 'latitude') return this._latitude(guess, location, latitudeTolerance);
        const def = FIELDS[f];
        const ok = def.check(guess, location);
        return { field: f, label: def.label, ok, hint: ok ? null : def.hint(guess, location) };
      });

      const byField = Object.fromEntries(feedback.map((f) => [f.field, f.ok]));
      const lat = feedback.find((f) => f.field === 'latitude');
      return {
        isCorrect: feedback.every((f) => f.ok),
        correctCount: feedback.filter((f) => f.ok).length,
        total: feedback.length,
        hemisphereOk: byField.hemisphere,
        climateOk: byField.climate,
        latitudeOk: byField.latitude,
        landformOk: byField.landform,
        continentOk: byField.continent,
        latitudeError: lat ? lat.error : undefined,
        feedback,
      };
    }

    /** Enlem: tolerans içinde mi? Değilse YÖN söyle, değeri verme. */
    _latitude(guess, location, tolerance) {
      const latitude = Number(guess.latitude);
      const error = Math.abs(latitude - location.latitude);
      const ok = error <= tolerance;
      const direction = ok ? null : latitude > location.latitude ? 'lower' : 'higher';
      return {
        field: 'latitude',
        label: 'Enlem',
        ok,
        error,
        tolerance,
        direction,
        hint: ok
          ? null
          : direction === 'lower'
            ? 'Daha küçük bir enlem dene (ekvatora yakın).'
            : 'Daha büyük bir enlem dene (kutba yakın).',
      };
    }
  }

  GS.PredictionEvaluator = PredictionEvaluator;
  GS.PREDICTION_FIELDS = FIELDS;
})(typeof module !== 'undefined' && module.exports ? module.exports : (window.GS = window.GS || {}));
