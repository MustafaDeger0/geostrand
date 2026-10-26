/**
 * ============================================================================
 *  GeoStrand — Envanter (Inventory)
 * ============================================================================
 *  Doğru tahminlerin ödülü buraya eklenir:
 *    💧 Su Matarası  → kullanılınca +50 Su
 *    🔥 Isı Paketi   → kullanılınca +50 Vücut Isısı
 *  Eşyanın hangi barı ne kadar dolduracağı CONFIG.INVENTORY / REWARD'dadır;
 *  bu sınıf yalnızca adetleri tutar.
 * ============================================================================
 */
(function (GS) {
  'use strict';

  class Inventory {
    /** @param {Object<string, number>} starting Başlangıç adetleri, ör. {water:1, heat:1} */
    constructor(starting = {}) {
      this.items = { ...starting };
    }

    add(type, count = 1) {
      this.items[type] = (this.items[type] || 0) + count;
      return this.items[type];
    }

    has(type) {
      return (this.items[type] || 0) > 0;
    }

    /** Bir adet tüketir. @returns {boolean} Başarılı mı? */
    consume(type) {
      if (!this.has(type)) return false;
      this.items[type] -= 1;
      return true;
    }

    count(type) {
      return this.items[type] || 0;
    }

    getCounts() {
      return { ...this.items };
    }
  }

  GS.Inventory = Inventory;
})(typeof module !== 'undefined' && module.exports ? module.exports : (window.GS = window.GS || {}));
