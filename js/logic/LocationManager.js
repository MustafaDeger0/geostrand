/**
 * ============================================================================
 *  GeoStrand — Konum Yöneticisi (LocationManager)
 * ============================================================================
 *  Seviyeleri karıştırılmış bir sırayla verir. Tüm konumlar bitince listeyi
 *  yeniden karıştırır.
 *
 *  ÇEŞİTLİLİK KURALLARI ("hep aynı" hissini önler):
 *    • Aynı konum, tüm liste bitmeden tekrar gelmez.
 *    • Aynı İKLİM arka arkaya iki kez gelmez (mümkünse).
 * ============================================================================
 */
(function (GS) {
  'use strict';

  class LocationManager {
    /**
     * @param {object[]} locations GS.LOCATIONS
     * @param {() => number} [rng] Rastgele sayı üreteci (testte sabitlenebilir)
     */
    constructor(locations, rng = Math.random) {
      if (!locations || locations.length === 0) throw new Error('En az bir konum gerekli.');
      this.pool = locations;
      this.rng = rng;
      this.queue = [];
      this.current = null;
      this.levelNumber = 0;   // Kaçıncı bölgedeyiz (1'den başlar)
      this.escapedCount = 0;  // Doğru tahminle kaçılan bölge sayısı
    }

    /** Sıradaki konuma geçer ve onu döndürür. */
    next() {
      if (this.queue.length === 0) this.queue = this._shuffledPool();
      this.current = this.queue.shift();
      this.levelNumber += 1;
      return this.current;
    }

    markEscaped() {
      this.escapedCount += 1;
    }

    /**
     * Yeni tur sırası. Her adımda, bir önceki iklimden FARKLI bir iklim seçilir;
     * seçim o iklimde kalan konum sayısıyla ağırlıklıdır (kalabalık iklimler
     * sona yığılmasın diye). Nadiren yine de çakışma kalırsa yeniden denenir.
     */
    _shuffledPool() {
      let best = null;
      for (let attempt = 0; attempt < 30; attempt++) {
        const order = this._buildOrder();
        const clashes = this._countClashes(order);
        if (!best || clashes < best.clashes) best = { order, clashes };
        if (clashes === 0) break;
      }
      return best.order;
    }

    _buildOrder() {
      // İklime göre grupla, grup içini karıştır
      const groups = new Map();
      this.pool.forEach((loc) => {
        if (!groups.has(loc.climate)) groups.set(loc.climate, []);
        groups.get(loc.climate).push(loc);
      });
      groups.forEach((list) => shuffle(list, this.rng));

      const order = [];
      let prev = this.current;
      while (order.length < this.pool.length) {
        let candidates = [...groups.entries()].filter(([c, list]) => list.length && (!prev || c !== prev.climate));
        if (!candidates.length) candidates = [...groups.entries()].filter(([, list]) => list.length);
        // Ağırlık = kalan sayının karesi
        const total = candidates.reduce((s, [, list]) => s + list.length * list.length, 0);
        let r = this.rng() * total;
        let chosen = candidates[candidates.length - 1];
        for (const cand of candidates) {
          r -= cand[1].length * cand[1].length;
          if (r <= 0) { chosen = cand; break; }
        }
        let loc = chosen[1].pop();
        // Yeni turun ilk konumu, son oynanan konumla aynı olmasın
        if (prev && loc.id === prev.id && chosen[1].length) {
          chosen[1].unshift(loc);
          loc = chosen[1].pop();
        }
        order.push(loc);
        prev = loc;
      }
      return order;
    }

    _countClashes(order) {
      let n = 0;
      let prev = this.current;
      order.forEach((loc) => {
        if (prev && prev.climate === loc.climate) n++;
        prev = loc;
      });
      return n;
    }
  }

  /** Fisher–Yates karıştırma */
  function shuffle(arr, rng) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }


  GS.LocationManager = LocationManager;
})(typeof module !== 'undefined' && module.exports ? module.exports : (window.GS = window.GS || {}));
