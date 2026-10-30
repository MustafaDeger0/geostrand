/**
 * ============================================================================
 *  GeoStrand — Günlük Meydan Okuma (Daily) — saf mantık
 * ============================================================================
 *  Her gün dünyadaki herkese AYNI 5 bölge gelir: aynı konumlar, aynı sırada,
 *  aynı hava olayı ve birebir aynı harita. Herkes aynı sınava girer; gün sonunda
 *  sıralama adil olur.
 *
 *  NASIL? Tarih (Türkiye saatiyle "2026-10-30") bir sayıya çevrilir (FNV-1a
 *  özeti) ve tohumlu rastgele üretece verilir. Aynı tarih → aynı sayı dizisi →
 *  aynı plan. Sunucu da bu dosyayı kullanır; gelen puanın o günün planında
 *  mümkün olup olmadığını denetler.
 *
 *  Bölge 1-2 kolay, 3-4 yer şekli, 5 kıta sorusu içerir (normal oyundaki
 *  kademeler). Aynı iklim arka arkaya gelmez.
 *
 *  Bu dosya Phaser'a ve tarayıcıya bağlı değildir (Node testleri ve sunucu).
 * ============================================================================
 */
(function (GS) {
  'use strict';

  const REGIONS = 5;
  const TIME_ZONE = 'Europe/Istanbul';

  /** FNV-1a: metni 32 bit sayıya çevirir */
  function hash(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
  }

  /** mulberry32 (SeededRandom ile aynı üreteç; bağımsız olsun diye burada da var) */
  function rngFrom(seed) {
    let a = seed >>> 0;
    return function next() {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const Daily = {
    REGIONS,
    TIME_ZONE,
    hash,

    /**
     * Türkiye saatine göre bugünün anahtarı: "YYYY-MM-DD" (gün gece yarısı değişir)
     * @param {Date} [now]
     */
    dateKey(now = new Date()) {
      try {
        return new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
      } catch (e) {
        // Intl saat dilimi yoksa: UTC+3 elle
        const t = new Date(now.getTime() + 3 * 3600 * 1000);
        return t.toISOString().slice(0, 10);
      }
    },

    /** "2026-10-30" → bir gün önce/sonra */
    shiftKey(key, days) {
      const d = new Date(`${key}T12:00:00Z`);
      d.setUTCDate(d.getUTCDate() + days);
      return d.toISOString().slice(0, 10);
    },

    /** "2026-10-30" → "30 Ekim 2026" */
    label(key) {
      const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
      const [y, m, d] = key.split('-').map(Number);
      return `${d} ${months[m - 1]} ${y}`;
    },

    /**
     * Günün planı.
     * @param {string} key "YYYY-MM-DD"
     * @param {object} deps {locations, tiers, climateWeather, Progression, WeatherPicker}
     * @returns {Array<{level:number, locationId:string, weather:string, seed:number, tierIndex:number}>}
     */
    plan(key, deps) {
      const rng = rngFrom(hash(`geostrand-daily:${key}`));
      const pool = deps.locations.slice();
      const picked = [];
      let prevClimate = null;
      for (let level = 1; level <= REGIONS && pool.length; level++) {
        let candidates = pool.filter((l) => l.climate !== prevClimate);
        if (!candidates.length) candidates = pool;
        const loc = candidates[Math.floor(rng() * candidates.length)];
        pool.splice(pool.indexOf(loc), 1);
        prevClimate = loc.climate;
        const tier = deps.Progression.tierFor(level, deps.tiers);
        const weather = deps.WeatherPicker.pick(loc.climate, tier.weatherChance, deps.climateWeather, rng);
        picked.push({ level, locationId: loc.id, weather, seed: Math.floor(rng() * 4294967296), tierIndex: tier.index });
      }
      return picked;
    },

    /** Bu planla alınabilecek en yüksek puan (sunucu hileli puanı reddeder) */
    maxScore(planList, scoreCfg) {
      return planList.reduce((sum, p) => sum + scoreCfg.base + scoreCfg.fastBonus + p.tierIndex * scoreCfg.tierBonus, 0);
    },

    /**
     * Seri hesabı: oyuncunun katıldığı günlerden, bugüne (ya da düne) kadar kesintisiz kaç gün var?
     * @param {string[]} playedKeys katılınan günler
     * @param {string} today
     */
    streak(playedKeys, today) {
      const set = new Set(playedKeys);
      let day = set.has(today) ? today : Daily.shiftKey(today, -1);
      let n = 0;
      while (set.has(day)) {
        n += 1;
        day = Daily.shiftKey(day, -1);
      }
      return n;
    },

    /**
     * Paylaşılabilir sonuç metni (Wordle tarzı)
     * @param {{key:string, results:Array<{stars:number}|null>, solved:number, score:number, timeMs:number, streak:number}} r
     */
    shareText(r) {
      const cells = [];
      for (let i = 0; i < REGIONS; i++) {
        const x = r.results[i];
        cells.push(!x ? (i === r.solved ? '💀' : '⬛') : x.stars === 3 ? '🟩' : x.stars === 2 ? '🟨' : '🟧');
      }
      const s = Math.round(r.timeMs / 1000);
      return [
        `🌍 GeoStrand Günlük · ${Daily.label(r.key)}`,
        `${cells.join('')}  ${r.solved}/${REGIONS}`,
        `⭐ ${r.score.toLocaleString('tr-TR')} puan · ⏱️ ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}${r.streak > 1 ? ` · 🔥 ${r.streak} gün` : ''}`,
      ].join('\n');
    },
  };

  GS.Daily = Daily;
})(typeof module !== 'undefined' && module.exports ? module.exports : (window.GS = window.GS || {}));
