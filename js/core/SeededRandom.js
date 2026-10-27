/**
 * ============================================================================
 *  GeoStrand — Tohumlu Rastgele Sayı (SeededRandom)
 * ============================================================================
 *  Çevrim içi yarışta herkes AYNI haritayı görmelidir. Harita kurulurken
 *  dağların, göllerin ve ipucu nesnelerinin yeri Math.random() ile seçilir.
 *  Sunucu her tur için bir "tohum" (seed) sayısı gönderir; harita kurulurken
 *  Math.random geçici olarak bu tohumla başlayan bir üreteçle değiştirilir.
 *  Aynı tohum → aynı sayı dizisi → aynı harita (her tarayıcıda, her ülkede).
 *
 *  Üreteç: mulberry32 (küçük, hızlı, iyi dağılımlı 32 bit üreteç)
 * ============================================================================
 */
(function (GS) {
  'use strict';

  /** @param {number} seed 32 bit tamsayı @returns {() => number} 0 ≤ x < 1 */
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function next() {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const SeededRandom = {
    create: mulberry32,

    /**
     * fn çalışırken Math.random tohumlu üreteç olur; bitince (hata olsa bile) eski hâline döner.
     * @template T @param {number} seed @param {() => T} fn @returns {T}
     */
    run(seed, fn) {
      const original = Math.random;
      Math.random = mulberry32(seed);
      try {
        return fn();
      } finally {
        Math.random = original;
      }
    },
  };

  GS.SeededRandom = SeededRandom;
})(typeof module !== 'undefined' && module.exports ? module.exports : (window.GS = window.GS || {}));
