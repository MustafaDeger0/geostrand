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
 *  Sahne sırası: BootScene (dokular) → GameScene.
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
  GS.cutscene = new GS.IntroCutscene(document);

  const intro = document.getElementById('intro');

  // Başlık ekranında en iyi puanı göster
  const best = GS.readBestScore();
  if (best > 0) {
    document.getElementById('intro-best').innerHTML =
      `En iyi puanın: <b>${best.toLocaleString('tr-TR')}</b>.<span class="kb-only"> Enter ile başlayabilir, <kbd>M</kbd> ile sesi kapatabilirsin.</span>`;
  }

  /**
   * Phaser oyununu kur.
   * @param {boolean} [cinematic] true: açılış animasyonu sürüyor (kamera yakın, kâşif yerde, HUD gizli)
   */
  function launch(cinematic = false) {
    intro.classList.add('hidden');
    GS.audio.init();
    if (GS.game) return;
    GS.cinematicStart = cinematic;
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
      input: { activePointers: 3 },   // dokunmatik: joystick + düğmeler aynı anda
      scene: [GS.BootScene, GS.GameScene],
    });
  }

  /**
   * Ana menüye dön (Esc menüsü / oyun sonu). Oyunun tüm durumu temiz bir
   * şekilde sıfırlansın diye sayfa yeniden yüklenir; en iyi puan, kâşif ve
   * ses ayarları tarayıcıda saklandığı için kaybolmaz. Tam ekrandaysa
   * yeniden yükleme tam ekrandan çıkarır, bu yüzden önce çıkılır.
   */
  GS.returnToMainMenu = function returnToMainMenu() {
    const go = () => window.location.reload();
    if (document.fullscreenElement) document.exitFullscreen().then(go, go);
    else go();
  };
  document.getElementById('btn-home').addEventListener('click', () => GS.returnToMainMenu());

  /** Hikâye girişini oynat; patlama anında oyunu sinematik modda kurar */
  function playStory() {
    intro.classList.add('hidden');
    GS.cutscene.play({
      hero: GS.creator.current,
      launchGame: () => launch(true),
    });
  }

  /** "Göreve başla": kâşif yoksa önce oluşturucu, sonra açılış animasyonu */
  function start() {
    if (GS.game || GS.creator.isOpen || GS.cutscene.isPlaying) return;
    GS.audio.init(); // ilk tıklamada sesi hazırla
    if (GS.creator.hasSaved) {
      playStory();
    } else {
      GS.creator.open({ mode: 'start', onSave: () => playStory() });
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
    if (GS.creator.isOpen || GS.guide.isOpen || GS.cutscene.isPlaying) return;
    if (e.key === 'Enter' && e.target.tagName !== 'BUTTON') start();
    if (e.key === 'f' || e.key === 'F') GS.toggleFullscreen();
  });
})(window.GS = window.GS || {});
