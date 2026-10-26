/**
 * ============================================================================
 *  GeoStrand: Enlemden Kaçış — Giriş Noktası
 * ============================================================================
 *  • İlk açılışta "Göreve başla" → önce "Kâşifini hazırla" ekranı, sonra oyun.
 *    Kâşif kayıtlıysa doğrudan oyuna geçilir ("Kâşifi düzenle" ile değiştirilebilir).
 *  • Oyun tuvali TÜM PENCEREYİ kaplar (Phaser.Scale.RESIZE).
 *  • Tam ekran: F tuşu ya da ⛶ düğmesi (HTML arayüzü de tam ekranda kalır).
 *  • Ses tarayıcı kuralı gereği ancak kullanıcı etkileşiminde başlatılabilir.
 *  • Rehber ve karakter oluşturucu oyundan önce de kullanılabildiği için
 *    burada, sahneden bağımsız olarak bir kez oluşturulur (GS.guide, GS.creator).
 *  Sahne sırası: BootScene (dokular) → GameScene (oyun).
 * ============================================================================
 */
(function (GS) {
  'use strict';

  /** Tam ekranı aç/kapat (desteklenmiyorsa sessizce geçer) */
  GS.toggleFullscreen = function toggleFullscreen() {
    const doc = document;
    if (doc.fullscreenElement) {
      doc.exitFullscreen().catch(() => {});
    } else if (doc.documentElement.requestFullscreen) {
      doc.documentElement.requestFullscreen().catch(() => {});
    }
  };

  // Sahneden bağımsız parçalar
  GS.audio = new GS.AudioEngine();          // ayarlar okunur, çalma ilk tıklamada başlar
  GS.creator = new GS.CharacterCreator(document);
  GS.guide = new GS.Guide(document);

  const intro = document.getElementById('intro');

  // Başlık ekranında en iyi puanı göster
  const best = GS.readBestScore();
  if (best > 0) {
    document.getElementById('intro-best').innerHTML =
      `En iyi puanın: <b>${best.toLocaleString('tr-TR')}</b>. Enter ile başlayabilir, <kbd>M</kbd> ile sesi kapatabilirsin.`;
  }

  function launch() {
    if (GS.game) return;
    intro.classList.add('hidden');
    GS.audio.init();

    GS.game = new Phaser.Game({
      type: Phaser.AUTO,              // WebGL varsa onu, yoksa Canvas kullan
      parent: 'game-container',
      backgroundColor: '#08181b',
      physics: {
        default: 'arcade',
        arcade: { debug: false },     // true yaparsanız çarpışma kutuları görünür
      },
      scale: {
        mode: Phaser.Scale.RESIZE,    // tuval her zaman pencere kadar
        width: window.innerWidth,
        height: window.innerHeight,
      },
      scene: [GS.BootScene, GS.GameScene],
    });
  }

  /** "Göreve başla": kâşif yoksa önce oluşturucu */
  function start() {
    if (GS.game || GS.creator.isOpen) return;
    GS.audio.init(); // ilk tıklamada sesi hazırla
    if (GS.creator.hasSaved) {
      launch();
    } else {
      GS.creator.open({ mode: 'start', onSave: () => launch() });
    }
  }

  document.getElementById('btn-start').addEventListener('click', start);
  document.getElementById('btn-full').addEventListener('click', () => GS.toggleFullscreen());
  document.getElementById('btn-guide').addEventListener('click', () => GS.guide.open('play'));
  document.getElementById('btn-hero').addEventListener('click', () => GS.creator.open({ mode: 'edit' }));
  document.addEventListener('keydown', function onIntroKey(e) {
    if (GS.game) {
      document.removeEventListener('keydown', onIntroKey);
      return;
    }
    if (GS.creator.isOpen || GS.guide.isOpen) return;
    if (e.key === 'Enter' && e.target.tagName !== 'BUTTON') start();
    if (e.key === 'f' || e.key === 'F') GS.toggleFullscreen();
  });
})(window.GS = window.GS || {});
