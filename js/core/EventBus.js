/**
 * ============================================================================
 *  GeoStrand: Enlemden Kaçış — EventBus (Olay Yolu)
 * ============================================================================
 *  Modüllerin birbirini doğrudan tanımadan haberleşmesini sağlar.
 *  Örn: SurvivalSystem "oyuncu öldü" olayını yayar, HUD ve GameScene dinler.
 *  Böylece mantık katmanı (logic/) arayüzden (ui/) tamamen bağımsız kalır.
 *
 *  Tüm dosyalarda kullanılan sarmalayıcı (wrapper) kalıbı:
 *    - Tarayıcıda: sınıflar global `window.GS` isim alanına eklenir.
 *    - Node.js'te (birim testleri): `module.exports` üzerinden dışa aktarılır.
 * ============================================================================
 */
(function (GS) {
  'use strict';

  /** Oyundaki tüm olay adları tek yerde: yazım hatalarını önler. */
  const EVENTS = Object.freeze({
    INTERACT: 'interact',                 // Oyuncu bir nesneyle etkileşti (E)
    PAD_OPENED: 'pad:opened',             // Coğrafyacı Pad'i açıldı
    PAD_CLOSED: 'pad:closed',             // Coğrafyacı Pad'i kapandı
    PREDICTION_SUBMIT: 'prediction:submit', // Oyuncu tahmin formunu gönderdi
    PENALTY_START: 'survival:penaltyStart', // 2x hızlı düşüş cezası başladı
    PENALTY_END: 'survival:penaltyEnd',     // Ceza bitti
    PLAYER_DIED: 'survival:died',         // Can (HP) sıfırlandı
    LEVEL_NEXT: 'level:next',             // Oyuncu sonraki konuma geçmek istiyor
    RESTART: 'game:restart',              // Oyunu baştan başlat
    MENU_OPENED: 'menu:opened',           // Duraklatma menüsü açıldı (oyun durur)
    MENU_CLOSED: 'menu:closed',
    VOLUME_CHANGED: 'settings:volume',    // {channel, value} ses kaydırıcısı
    // Arayüz düğmeleri (klavye kısayollarıyla aynı işi yapar)
    UI_OPEN_PAD: 'ui:openPad',
    UI_TOGGLE_MUTE: 'ui:toggleMute',
    UI_FULLSCREEN: 'ui:fullscreen',
    UI_MENU: 'ui:menu',
    UI_USE_ITEM: 'ui:useItem',            // 'water' | 'heat'
    UI_GUIDE: 'ui:guide',                 // Rehber'i aç (sekme adı)
    UI_EDIT_HERO: 'ui:editHero',          // Karakter oluşturucuyu aç
    UI_INTERACT: 'ui:interact',           // Dokunmatik "İncele" düğmesi
  });

  class EventBus {
    constructor() {
      /** @type {Map<string, Set<Function>>} olay adı -> dinleyiciler */
      this._handlers = new Map();
    }

    /**
     * Bir olaya dinleyici ekler.
     * @returns {Function} Çağrıldığında dinleyiciyi kaldıran fonksiyon.
     */
    on(eventName, handler) {
      if (!this._handlers.has(eventName)) this._handlers.set(eventName, new Set());
      this._handlers.get(eventName).add(handler);
      return () => this.off(eventName, handler);
    }

    off(eventName, handler) {
      const set = this._handlers.get(eventName);
      if (set) set.delete(handler);
    }

    /** Olayı, kayıtlı tüm dinleyicilere veri (payload) ile iletir. */
    emit(eventName, payload) {
      const set = this._handlers.get(eventName);
      if (!set) return;
      // Kopya üzerinde dön: dinleyici kendini kaldırırsa döngü bozulmasın.
      [...set].forEach((handler) => handler(payload));
    }

    /** Sahne yeniden başlarken tüm dinleyicileri temizler (bellek sızıntısı önlenir). */
    clear() {
      this._handlers.clear();
    }
  }

  GS.EventBus = EventBus;
  GS.EVENTS = EVENTS;
})(typeof module !== 'undefined' && module.exports ? module.exports : (window.GS = window.GS || {}));
