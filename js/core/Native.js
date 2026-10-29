/**
 * ============================================================================
 *  GeoStrand — Mobil Uygulama Köprüsü (Native)
 * ============================================================================
 *  Oyun App Store / Google Play uygulaması olarak (Capacitor) çalışırken:
 *    • Durum çubuğu gizlenir (tam ekran oyun), açılış ekranı oyun hazır olunca kalkar
 *    • Android GERİ tuşu: açık pencereyi kapatır → oyunda menüyü açar →
 *      başlık ekranında uygulamadan çıkar (GS.handleBack, main.js)
 *    • Uygulama arka plana alınınca (telefon çaldı, ana ekran tuşu…) oyun
 *      duraklar ve ses susar; geri gelince ses açılır, menü açık bekler
 *  Tarayıcıda da sekme gizlenince aynı duraklama çalışır.
 *  Capacitor yoksa (tarayıcı) hiçbir şey bozulmaz: isApp = false.
 * ============================================================================
 */
(function (GS) {
  'use strict';

  const cap = window.Capacitor;
  const isApp = !!(cap && typeof cap.isNativePlatform === 'function' && cap.isNativePlatform());

  /** Yerel eklenti (App, StatusBar, SplashScreen) — yoksa null */
  function plugin(name) {
    if (!isApp) return null;
    try {
      if (typeof cap.registerPlugin === 'function') return cap.registerPlugin(name);
      return (cap.Plugins && cap.Plugins[name]) || null;
    } catch (e) {
      return null;
    }
  }

  const Native = {
    isApp,
    platform: isApp && cap.getPlatform ? cap.getPlatform() : 'web',

    init() {
      // Arka plan / ön plan (tarayıcı sekmesi ve uygulama için ortak)
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) callSafe(GS.onAppPause);
        else callSafe(GS.onAppResume);
      });
      if (!isApp) return;

      document.body.classList.add('native', `native-${this.platform}`, 'no-fullscreen');
      const StatusBar = plugin('StatusBar');
      if (StatusBar) StatusBar.hide().catch(() => {});
      const App = plugin('App');
      if (App) {
        App.addListener('backButton', () => callSafe(GS.handleBack));
        App.addListener('appStateChange', ({ isActive }) => callSafe(isActive ? GS.onAppResume : GS.onAppPause));
      }
    },

    /** Başlık ekranı hazır: açılış ekranını (splash) kaldır */
    ready() {
      const Splash = plugin('SplashScreen');
      if (Splash) Splash.hide({ fadeOutDuration: 250 }).catch(() => {});
    },

    /** Android: uygulamadan çık */
    exit() {
      const App = plugin('App');
      if (App && this.platform === 'android') App.exitApp();
    },
  };

  function callSafe(fn) {
    try {
      if (typeof fn === 'function') fn();
    } catch (e) {
      console.error(e);
    }
  }

  GS.Native = Native;
  Native.init();
})(window.GS = window.GS || {});
