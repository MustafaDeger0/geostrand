/**
 * ============================================================================
 *  GeoStrand — Hava Olayları
 * ============================================================================
 *  Bölge 3'ten itibaren bazı bölgelerde iklime uygun bir hava olayı çıkar.
 *  Her olay barların düşüş hızını değiştirir ve ekranda görünür (WeatherFX).
 *
 *    hydration / temp : su ve ısı kaybı çarpanı (1 = etkisiz)
 *    particles        : 'rain' | 'snow' | 'dust' | null
 *    haze             : ekranı kaplayan renk (görüşü azaltır)
 *    wind / rain      : ortam sesi katmanlarına eklenen yoğunluk
 *    why              : neden olur? (Rehber ve bildirimde öğretici kısa not)
 * ============================================================================
 */
(function (GS) {
  'use strict';

  GS.WEATHERS = {
    clear: { key: 'clear', label: 'Açık hava', icon: '🌤️', hydration: 1, temp: 1, particles: null, haze: null, wind: 0, rain: 0 },
    sandstorm: {
      key: 'sandstorm', label: 'Kum fırtınası', icon: '🌪️', hydration: 1.4, temp: 1,
      particles: 'dust', haze: 'rgba(205, 160, 90, 0.38)', wind: 0.9, rain: 0,
      why: 'Bitki örtüsü olmadığı için rüzgâr kumu kolayca kaldırır.',
    },
    heatwave: {
      key: 'heatwave', label: 'Sıcak hava dalgası', icon: '🥵', hydration: 1.6, temp: 0.5,
      particles: null, haze: 'rgba(255, 150, 60, 0.14)', wind: 0, rain: 0,
      why: 'Günlerce bulutsuz gökyüzü ve tepeden gelen güneş ışınları.',
    },
    rainstorm: {
      key: 'rainstorm', label: 'Sağanak', icon: '⛈️', hydration: 0.7, temp: 1.3,
      particles: 'rain', haze: 'rgba(25, 40, 70, 0.32)', wind: 0.3, rain: 1,
      why: 'Sıcak ve nemli hava hızla yükselince bol yağış bırakır.',
    },
    blizzard: {
      key: 'blizzard', label: 'Tipi', icon: '🌨️', hydration: 1, temp: 1.6,
      particles: 'snow', haze: 'rgba(225, 235, 245, 0.4)', wind: 1, rain: 0,
      why: 'Kuvvetli rüzgâr karı savurur; vücut ısısı hızla kaybolur.',
    },
    fog: {
      key: 'fog', label: 'Sis', icon: '🌫️', hydration: 1, temp: 1.15,
      particles: null, haze: 'rgba(215, 222, 222, 0.5)', wind: 0, rain: 0,
      why: 'Nemli hava soğuyunca su buharı yere yakın yoğunlaşır.',
    },
  };

  /** Her iklimde görülebilecek hava olayları */
  GS.CLIMATE_WEATHER = {
    EKVATORAL: ['rainstorm', 'fog'],
    COL: ['sandstorm', 'heatwave'],
    AKDENIZ: ['heatwave', 'rainstorm'],
    MUSON: ['rainstorm', 'fog'],
    SERT_KARASAL: ['blizzard', 'fog'],
    TUNDRA: ['blizzard', 'fog'],
  };
})(typeof module !== 'undefined' && module.exports ? module.exports : (window.GS = window.GS || {}));
