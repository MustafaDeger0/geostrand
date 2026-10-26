/**
 * ============================================================================
 *  GeoStrand — İpucu Üretici (ClueFactory)
 * ============================================================================
 *  Bir konum verisinden, haritadaki nesnelerin göstereceği ipuçlarını üretir.
 *  Her ipucu kısa ve taranabilirdir:
 *    { id, icon, title, tags: [anahtar kelimeler], text: 'tek kısa cümle' }
 *
 *  İPUCU TÜRLERİ (hangileri açık olduğu kademeye bağlıdır):
 *    tree      🌳 Bitki          → konum verisinden
 *    soil      🟫 Toprak         → konum verisinden
 *    sunstick  📏 Gölge          → enlemden HESAPLANIR (aşağıda)
 *    altimeter 📡 Yükselti       → yükselti + yer şeklinin eğim etiketleri
 *    fauna     🐾 Hayvan izleri  → konum verisinden (kıta ipucu)
 *
 *  GÜNEŞ ÇUBUĞU (GNOMON) HESABI — oyunun matematik/coğrafya bağlantısı:
 *    Ekinoks günü öğlen: güneşYükseklikAçısı = 90° − enlem
 *                        gölge / çubuk       = 1 / tan(yükseklikAçısı)
 *    Kuzey Yarım Küre'de gölge KUZEYE, Güney Yarım Küre'de GÜNEYE düşer.
 * ============================================================================
 */
(function (GS) {
  'use strict';

  const STICK_LENGTH_M = 1;
  const DEFAULT_CLUES = ['tree', 'soil', 'sunstick'];

  const ClueFactory = {
    /** Haritadaki nesne türleri: simge, başlık, oyunda görünen eylem */
    TYPES: {
      tree: { icon: '🌳', title: 'Bitki', prompt: 'Ağaç' },
      soil: { icon: '🟫', title: 'Toprak', prompt: 'Toprak' },
      sunstick: { icon: '📏', title: 'Gölge', prompt: 'Gölge ölç' },
      altimeter: { icon: '📡', title: 'Yükselti', prompt: 'Yükselti ölç' },
      fauna: { icon: '🐾', title: 'Hayvan izleri', prompt: 'İzleri incele' },
    },

    /**
     * @param {object} location GS.LOCATIONS içinden bir konum
     * @param {string[]} [clueIds] bu kademede açık ipuçları
     * @param {{landforms?: object}} [deps] yer şekli tablosu (GS.LANDFORMS)
     * @returns {Object<string, object>} id → ipucu
     */
    build(location, clueIds = DEFAULT_CLUES, deps = {}) {
      const out = {};
      clueIds.forEach((id) => {
        out[id] = this._clue(id, location, deps);
      });
      return out;
    },

    _clue(id, location, deps) {
      const base = { id, icon: this.TYPES[id].icon, title: this.TYPES[id].title };
      switch (id) {
        case 'tree':
        case 'soil':
          return { ...base, ...location.clues[id] };
        case 'fauna':
          return { ...base, ...location.clues.fauna };
        case 'sunstick':
          return { ...base, ...this.sunStickClue(location) };
        case 'altimeter': {
          const landforms = deps.landforms || (typeof GS.LANDFORMS !== 'undefined' ? GS.LANDFORMS : {});
          const lf = landforms[location.landform];
          return {
            ...base,
            tags: [`${location.elevation.toLocaleString('tr-TR')} m`, ...lf.altimeter.tags],
            text: lf.altimeter.text,
            elevation: location.elevation,
          };
        }
        default:
          throw new Error(`Bilinmeyen ipucu: ${id}`);
      }
    },

    /** Gölge/çubuk oranı (ekinoks öğleni varsayımıyla) */
    shadowRatio(latitude) {
      const elevationRad = ((90 - latitude) * Math.PI) / 180;
      return 1 / Math.tan(elevationRad);
    },

    /** Gölge hangi yöne düşer? 'N' = kuzeye, 'S' = güneye */
    shadowDirection(hemisphere) {
      return hemisphere === 'KUZEY' ? 'N' : 'S';
    },

    sunStickClue(location) {
      const length = this.shadowRatio(location.latitude) * STICK_LENGTH_M;
      const direction = this.shadowDirection(location.hemisphere);
      return {
        id: 'sunstick',
        icon: '📏',
        title: 'Gölge',
        tags: [`${formatTr(length, 2)} m`, direction === 'N' ? '⬆ Kuzeye' : '⬇ Güneye'],
        text: length < 0.1 ? 'Ekinoks öğleni · 1 m çubuk · gölge neredeyse yok' : 'Ekinoks öğleni · 1 m çubuk',
        shadow: { length, direction }, // Pad'deki şema için ham veri
      };
    },
  };

  /** Türkçe ondalık biçim: 0.47 → "0,47" */
  function formatTr(n, digits) {
    return n.toFixed(digits).replace('.', ',');
  }

  GS.ClueFactory = ClueFactory;
})(typeof module !== 'undefined' && module.exports ? module.exports : (window.GS = window.GS || {}));
