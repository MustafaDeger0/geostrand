/**
 * ============================================================================
 *  GeoStrand — Cihaz Algılama (Device)
 * ============================================================================
 *  Telefon / tablet mi, masaüstü mü? Dokunmatik ekranda:
 *    • <body> "touch" sınıfı alır → CSS klavye kısayollarını gizler,
 *      dokunmatik düğmeleri (İncele, joystick) gösterir, hedefleri büyütür
 *    • Metinler "E ile incele" yerine "dokun" der (GS.Device.say)
 *  Dokunmatik dizüstü bilgisayarlarda ilk dokunuşta da touch moduna geçilir;
 *  klavyeyle oynamaya dönülürse metinler yine klavyeyi anlatır.
 * ============================================================================
 */
(function (GS) {
  'use strict';

  const coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  const listeners = [];

  const Device = {
    touch: !!coarse,

    /** Mod değişince haber al (HUD metinlerini yenilemek için) */
    onChange(fn) {
      listeners.push(fn);
    },

    offChange(fn) {
      const i = listeners.indexOf(fn);
      if (i >= 0) listeners.splice(i, 1);
    },

    /** Dokunmatik / klavye için iki ayrı metinden uygun olanı seç */
    say(keyboardText, touchText) {
      return this.touch ? touchText : keyboardText;
    },

    /** Tam ekran API'si var mı? (iPhone Safari'de yok → düğme gizlenir) */
    get canFullscreen() {
      return !!(document.fullscreenEnabled || document.webkitFullscreenEnabled);
    },

    _set(touch) {
      if (this.touch === touch) return;
      this.touch = touch;
      document.body.classList.toggle('touch', touch);
      listeners.forEach((fn) => fn(touch));
    },
  };

  document.body.classList.toggle('touch', Device.touch);
  document.body.classList.toggle('no-fullscreen', !Device.canFullscreen);

  // Dokunuş gelirse dokunmatik moda, yön tuşlarına basılırsa klavye moduna geç
  window.addEventListener('touchstart', () => Device._set(true), { passive: true, capture: true });
  window.addEventListener('keydown', (e) => {
    if (/^(Key[WASDEP]|Arrow)/.test(e.code)) Device._set(false);
  }, { capture: true });

  // Telefonda çift dokunuşla yakınlaştırma ve iki parmakla sayfa büyütme oyunu bozmasın
  document.addEventListener('gesturestart', (e) => e.preventDefault());
  document.addEventListener('dblclick', (e) => {
    if (e.target.closest('#game-container')) e.preventDefault();
  });

  GS.Device = Device;
})(window.GS = window.GS || {});
