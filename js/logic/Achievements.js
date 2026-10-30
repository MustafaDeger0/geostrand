/**
 * ============================================================================
 *  GeoStrand — Başarımlar / Rozetler (Achievements) — saf mantık
 * ============================================================================
 *  Oyun olayları (bölge çözüldü, sandık açıldı, yarış bitti…) buraya bildirilir;
 *  modül kalıcı istatistikleri günceller ve yeni kazanılan rozetleri döndürür.
 *
 *  ROZET TÜRLERİ
 *    • Kademeli (Bronz → Gümüş → Altın): bir sayaç hedeflere ulaştıkça yükselir
 *        ör. "Keskin Göz": ilk denemede doğru 5 / 20 / 50 kez
 *    • Tek seferlik: bir kez başarılır (ör. "Gece Kuşu": gece kurtul)
 *    • Gizli: kazanılana kadar adı görünmez, yalnızca ipucu
 *
 *  İSTATİSTİK TÜRLERİ
 *    • Ömür boyu sayaçlar (tüm oyunlar): kurtuluş, sandık, ilk deneme…
 *    • Kümeler: görülen iklimler, kıtalar, konumlar (tekrar sayılmaz)
 *    • Tek oyunda en iyiler: bir oyunda en çok kurtuluş, en yüksek puan…
 *
 *  Kalıcılık: storage (localStorage benzeri) verilirse kendisi kaydeder.
 *  Bu dosya Phaser'a bağlı değildir (Node testleri).
 * ============================================================================
 */
(function (GS) {
  'use strict';

  const STORE_KEY = 'geostrand-achievements';
  const TIER_NAMES = ['Bronz', 'Gümüş', 'Altın'];

  /** Kategoriler (vitrindeki sıra) */
  const CATEGORIES = [
    { key: 'explore', label: 'Keşif', icon: '🧭' },
    { key: 'mastery', label: 'Ustalık', icon: '🎯' },
    { key: 'survive', label: 'Hayatta kalma', icon: '🔥' },
    { key: 'daily', label: 'Günlük meydan okuma', icon: '📅' },
    { key: 'online', label: 'Çevrim içi', icon: '🌍' },
  ];

  /**
   * Rozetler.
   *   stat  : değeri okunacak istatistik (sayı ya da kümenin boyutu)
   *   goals : kademeli rozet hedefleri [bronz, gümüş, altın]; tek seferlikte [1]
   *   secret: kazanılana kadar adı gizli
   */
  const DEFS = [
    // ---------------------------------------------------------- Keşif
    { id: 'first_escape', cat: 'explore', icon: '🚁', name: 'İlk Kurtuluş', desc: 'İlk bölgenden kurtul', stat: 'escapes', goals: [1] },
    { id: 'escapes', cat: 'explore', icon: '🗺️', name: 'Kaçış Ustası', desc: 'Toplam kurtuluş sayısı', stat: 'escapes', goals: [10, 30, 75] },
    { id: 'climates', cat: 'explore', icon: '🌦️', name: 'İklim Avcısı', desc: 'Farklı iklimlerden kurtul', stat: 'climates', goals: [3, 5, 6] },
    { id: 'continents', cat: 'explore', icon: '🌐', name: 'Kıta Gezgini', desc: 'Farklı kıtalardan kurtul', stat: 'continents', goals: [2, 4, 6] },
    { id: 'world_tour', cat: 'explore', icon: '🏆', name: 'Dünya Turu', desc: '19 konumun hepsinden kurtul', stat: 'locations', goals: [19] },
    { id: 'hemispheres', cat: 'explore', icon: '🌓', name: 'İki Yarım Küre', desc: 'Aynı oyunda hem kuzey hem güney yarım küreden kurtul', stat: 'flag_hemispheres', goals: [1] },
    { id: 'equator_pole', cat: 'explore', icon: '🧊', name: 'Ekvatordan Kutba', desc: 'Aynı oyunda 10°\'nin altında ve 60°\'nin üstünde bir enlemden kurtul', stat: 'flag_equator_pole', goals: [1] },

    // ---------------------------------------------------------- Ustalık
    { id: 'first_try', cat: 'mastery', icon: '🎯', name: 'Keskin Göz', desc: 'Hiç yanlış yapmadan, ilk denemede bil', stat: 'firstTry', goals: [5, 20, 50] },
    { id: 'three_stars', cat: 'mastery', icon: '⭐', name: 'Üç Yıldız', desc: 'Bir bölgeyi 3 yıldızla bitir', stat: 'threeStars', goals: [3, 12, 30] },
    { id: 'perfect_streak', cat: 'mastery', icon: '💎', name: 'Kusursuz Seri', desc: 'Tek oyunda üst üste ilk denemede bil', stat: 'bestPerfectStreak', goals: [3, 5, 8] },
    { id: 'speed', cat: 'mastery', icon: '⚡', name: 'Hızlı Coğrafyacı', desc: 'Bir bölgeyi 60 saniyenin altında çöz', stat: 'flag_speed', goals: [1] },
    { id: 'run_escapes', cat: 'mastery', icon: '🧗', name: 'Uzun Yolculuk', desc: 'Tek oyunda kurtulduğun bölge sayısı', stat: 'bestRunEscapes', goals: [5, 10, 15] },
    { id: 'run_score', cat: 'mastery', icon: '💯', name: 'Puan Avcısı', desc: 'Tek oyunda toplanan puan', stat: 'bestRunScore', goals: [600, 1500, 3000] },
    { id: 'master', cat: 'mastery', icon: '🎓', name: 'Usta Coğrafyacı', desc: 'Kıta sorusunun açıldığı Bölge 5\'e ulaş', stat: 'maxLevel', goals: [5] },

    // ---------------------------------------------------------- Hayatta kalma
    { id: 'night', cat: 'survive', icon: '🌙', name: 'Gece Kuşu', desc: 'Gece karanlığında kurtul', stat: 'nightEscapes', goals: [1, 5, 15] },
    { id: 'storm', cat: 'survive', icon: '⛈️', name: 'Fırtına Yürüyüşçüsü', desc: 'Kum fırtınası, sağanak, tipi ya da siste kurtul', stat: 'weatherEscapes', goals: [1, 8, 20] },
    { id: 'crates', cat: 'survive', icon: '📦', name: 'Sandık Avcısı', desc: 'Yardım sandığı aç', stat: 'crates', goals: [5, 20, 50] },
    { id: 'frugal', cat: 'survive', icon: '🎒', name: 'Tasarruflu', desc: 'Tek oyunda hiç eşya kullanmadan üst üste kurtul', stat: 'bestNoItemStreak', goals: [3, 5, 8] },
    { id: 'clutch', cat: 'survive', icon: '❤️‍🩹', name: 'Kıl Payı', desc: 'Canın 20\'nin altındayken kurtul', stat: 'flag_clutch', goals: [1], secret: true, hint: 'Ölümün eşiğinden dön…' },
    { id: 'last_breath', cat: 'survive', icon: '🫁', name: 'Son Nefes', desc: 'Aynı bölgede 3 yanlıştan sonra yine de kurtul', stat: 'flag_last_breath', goals: [1], secret: true, hint: 'Her şey ters gitse de pes etme…' },

    // ---------------------------------------------------------- Günlük
    { id: 'daily_done', cat: 'daily', icon: '📅', name: 'Günün Kâşifi', desc: 'Günlük meydan okumanın 5 bölgesini de bitir', stat: 'dailyCleared', goals: [1, 5, 15] },
    { id: 'daily_streak', cat: 'daily', icon: '🔥', name: 'Alev Serisi', desc: 'Üst üste günlerde meydan okumaya katıl', stat: 'bestDailyStreak', goals: [3, 7, 14] },
    { id: 'daily_perfect', cat: 'daily', icon: '🌟', name: 'Kusursuz Gün', desc: 'Günlük meydan okumayı hiç yanlış yapmadan bitir', stat: 'flag_daily_perfect', goals: [1] },

    // ---------------------------------------------------------- Çevrim içi
    { id: 'race_done', cat: 'online', icon: '🏁', name: 'Yarışçı', desc: 'Çevrim içi yarışları sonuna kadar oyna', stat: 'racesFinished', goals: [1, 5, 15] },
    { id: 'race_win', cat: 'online', icon: '🥇', name: 'Şampiyon', desc: 'Bir çevrim içi yarışı 1. bitir', stat: 'raceWins', goals: [1, 3, 10] },
    { id: 'race_first', cat: 'online', icon: '⚡', name: 'Şimşek', desc: 'Bir turda konumu herkesten önce bil', stat: 'raceFirstSolves', goals: [1, 10, 30] },
  ];

  const SETS = ['climates', 'continents', 'locations'];
  const NIGHT_WEATHER_FREE = 'clear';

  function emptyStats() {
    return {
      escapes: 0, firstTry: 0, threeStars: 0, crates: 0, nightEscapes: 0, weatherEscapes: 0,
      bestPerfectStreak: 0, bestRunEscapes: 0, bestRunScore: 0, bestNoItemStreak: 0, maxLevel: 0,
      dailyCleared: 0, bestDailyStreak: 0, racesFinished: 0, raceWins: 0, raceFirstSolves: 0,
      climates: [], continents: [], locations: [],
    };
  }

  class Achievements {
    /** @param {{getItem:Function, setItem:Function}} [storage] */
    constructor(storage) {
      this.storage = storage || null;
      this.data = { stats: emptyStats(), tiers: {}, dates: {} };
      this._load();
      this._resetRun();
    }

    static get DEFS() { return DEFS; }
    static get CATEGORIES() { return CATEGORIES; }
    static get TIER_NAMES() { return TIER_NAMES; }

    // ------------------------------------------------------------------ //
    //  Olaylar
    // ------------------------------------------------------------------ //

    /** Yeni oyun (tek oyunculu ya da günlük) başladı */
    runStart() {
      this._resetRun();
    }

    /**
     * Bölge doğru bilindi.
     * @param {{loc:object, stars:number, wrongs:number, seconds:number, hp:number,
     *          night:boolean, weather:string, level:number, runScore:number}} e
     */
    levelSolved(e) {
      const s = this.data.stats;
      const r = this.run;
      s.escapes += 1;
      r.escapes += 1;
      addToSet(s.climates, e.loc.climate);
      addToSet(s.continents, e.loc.continent);
      addToSet(s.locations, e.loc.id);
      if (e.wrongs === 0) {
        s.firstTry += 1;
        r.perfectStreak += 1;
      } else {
        r.perfectStreak = 0;
      }
      if (e.stars === 3) s.threeStars += 1;
      if (e.night) s.nightEscapes += 1;
      if (e.weather && e.weather !== NIGHT_WEATHER_FREE) s.weatherEscapes += 1;
      r.noItemStreak = r.usedItem ? 0 : r.noItemStreak + 1;
      r.usedItem = false;
      r.hemi.add(e.loc.hemisphere);
      if (e.loc.latitude < 10) r.lowLat = true;
      if (e.loc.latitude > 60) r.highLat = true;

      s.bestPerfectStreak = Math.max(s.bestPerfectStreak, r.perfectStreak);
      s.bestNoItemStreak = Math.max(s.bestNoItemStreak, r.noItemStreak);
      s.bestRunEscapes = Math.max(s.bestRunEscapes, r.escapes);
      s.bestRunScore = Math.max(s.bestRunScore, e.runScore || 0);
      s.maxLevel = Math.max(s.maxLevel, e.level || 0);

      if (r.hemi.size === 2) s.flag_hemispheres = 1;
      if (r.lowLat && r.highLat) s.flag_equator_pole = 1;
      if (e.seconds < 60) s.flag_speed = 1;
      if (e.hp < 20) s.flag_clutch = 1;
      if (e.wrongs >= 3) s.flag_last_breath = 1;
      return this._commit();
    }

    /** Yeni bölgeye varıldı (ulaşılan en ileri bölge) */
    levelReached(level) {
      this.data.stats.maxLevel = Math.max(this.data.stats.maxLevel, level);
      return this._commit();
    }

    itemUsed() {
      this.run.usedItem = true;
      this.run.noItemStreak = 0;
    }

    crateOpened() {
      this.data.stats.crates += 1;
      return this._commit();
    }

    /** @param {{cleared:boolean, perfect:boolean, streak:number}} e */
    dailyFinished(e) {
      const s = this.data.stats;
      if (e.cleared) s.dailyCleared += 1;
      if (e.cleared && e.perfect) s.flag_daily_perfect = 1;
      s.bestDailyStreak = Math.max(s.bestDailyStreak, e.streak || 0);
      return this._commit();
    }

    /** Bir yarış turunda doğru bildin. @param {number} rank kaçıncı bilen */
    raceSolved(rank) {
      if (rank === 1) this.data.stats.raceFirstSolves += 1;
      return this._commit();
    }

    /** Yarış bitti. @param {number} place genel sıralamadaki yerin */
    raceFinished(place) {
      const s = this.data.stats;
      s.racesFinished += 1;
      if (place === 1) s.raceWins += 1;
      return this._commit();
    }

    // ------------------------------------------------------------------ //
    //  Okuma (vitrin)
    // ------------------------------------------------------------------ //

    /** Bir istatistiğin sayısal değeri */
    value(stat) {
      const v = this.data.stats[stat];
      if (Array.isArray(v)) return v.length;
      return v || 0;
    }

    /**
     * Vitrin için tüm rozetlerin durumu.
     * @returns {Array<{def, tier:number, maxTier:number, value:number, next:number|null, unlockedAt:string|null}>}
     */
    list() {
      return DEFS.map((def) => {
        const tier = this.data.tiers[def.id] || 0;
        const value = this.value(def.stat);
        return {
          def,
          tier,
          maxTier: def.goals.length,
          value,
          next: tier < def.goals.length ? def.goals[tier] : null,
          unlockedAt: this.data.dates[def.id] || null,
        };
      });
    }

    /** Toplam kazanılan / kazanılabilir kademe sayısı */
    summary() {
      let got = 0;
      let total = 0;
      DEFS.forEach((d) => {
        total += d.goals.length;
        got += this.data.tiers[d.id] || 0;
      });
      return { got, total, badges: DEFS.filter((d) => this.data.tiers[d.id]).length, badgeTotal: DEFS.length };
    }

    // ------------------------------------------------------------------ //
    //  İç işler
    // ------------------------------------------------------------------ //

    _resetRun() {
      this.run = { escapes: 0, perfectStreak: 0, noItemStreak: 0, usedItem: false, hemi: new Set(), lowLat: false, highLat: false };
    }

    /** Hedefleri kontrol et; yeni kademeleri kaydet ve döndür */
    _commit() {
      const unlocked = [];
      DEFS.forEach((def) => {
        const value = this.value(def.stat);
        let tier = this.data.tiers[def.id] || 0;
        while (tier < def.goals.length && value >= def.goals[tier]) {
          tier += 1;
          unlocked.push({ def, tier, tierName: def.goals.length > 1 ? TIER_NAMES[tier - 1] : null });
        }
        if (tier !== (this.data.tiers[def.id] || 0)) {
          this.data.tiers[def.id] = tier;
          this.data.dates[def.id] = new Date().toISOString().slice(0, 10);
        }
      });
      this._save();
      return unlocked;
    }

    _load() {
      if (!this.storage) return;
      try {
        const raw = JSON.parse(this.storage.getItem(STORE_KEY) || 'null');
        if (raw && raw.stats) {
          this.data = {
            stats: { ...emptyStats(), ...raw.stats },
            tiers: raw.tiers || {},
            dates: raw.dates || {},
          };
          SETS.forEach((k) => {
            if (!Array.isArray(this.data.stats[k])) this.data.stats[k] = [];
          });
        }
      } catch (e) { /* bozuk kayıt: sıfırdan başla */ }
    }

    _save() {
      if (!this.storage) return;
      try {
        this.storage.setItem(STORE_KEY, JSON.stringify(this.data));
      } catch (e) { /* depolama kapalı */ }
    }
  }

  function addToSet(arr, v) {
    if (v && !arr.includes(v)) arr.push(v);
  }

  GS.Achievements = Achievements;
})(typeof module !== 'undefined' && module.exports ? module.exports : (window.GS = window.GS || {}));
