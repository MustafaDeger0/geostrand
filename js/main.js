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
 *  • Çevrim içi yarış: "🌍 Çevrim içi yarış" → lobi (hızlı eşleşme / oda) →
 *    yarış başlayınca RaceScene. Oyun bir sunucudan açılmalıdır (README).
 *  Sahne sırası: BootScene (dokular) → GameScene (tek oyunculu) ya da RaceScene (yarış).
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
   * @param {string} [sceneKey] 'GameScene' (tek oyunculu) | 'RaceScene' (çevrim içi yarış)
   */
  function launch(cinematic = false, sceneKey = 'GameScene') {
    intro.classList.add('hidden');
    GS.audio.init();
    if (GS.game) {
      // Oyun zaten kurulu (ör. özel odada yeni yarış): sahne çalışmıyorsa başlat
      if (!GS.game.scene.isActive(sceneKey)) GS.game.scene.start(sceneKey);
      return;
    }
    GS.cinematicStart = cinematic;
    GS.startScene = sceneKey;
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
      scene: [GS.BootScene, GS.GameScene, GS.RaceScene],
    });
  }

  /**
   * Ana menüye dön (Esc menüsü / oyun sonu). Oyunun tüm durumu temiz bir
   * şekilde sıfırlansın diye sayfa yeniden yüklenir; en iyi puan, kâşif ve
   * ses ayarları tarayıcıda saklandığı için kaybolmaz. Tam ekrandaysa
   * yeniden yükleme tam ekrandan çıkarır, bu yüzden önce çıkılır.
   */
  GS.returnToMainMenu = function returnToMainMenu({ quickMatch = false } = {}) {
    const go = () => {
      try {
        // "Yeni rakip ara": sayfa yenilenince hızlı eşleşme kendiliğinden başlar
        if (quickMatch) sessionStorage.setItem(AUTO_QUICK, '1');
      } catch (e) { /* depolama kapalı */ }
      window.location.reload();
    };
    // Çevrim içi yarıştaysak odadan düzgünce çık (yoksa 60 sn "bağlantısı koptu" görünürdü)
    if (GS.net && GS.net.session) {
      GS.net.leave();
      setTimeout(() => (document.fullscreenElement ? document.exitFullscreen().then(go, go) : go()), 150);
      return;
    }
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
    if (GS.game || GS.creator.isOpen || GS.cutscene.isPlaying || GS.lobby.isOpen) return;
    GS.audio.init(); // ilk tıklamada sesi hazırla
    if (GS.creator.hasSaved) {
      playStory();
    } else {
      GS.creator.open({ mode: 'start', onSave: () => playStory() });
    }
  }

  // ------------------------------------------------------------------ //
  //  Çevrim içi yarış
  // ------------------------------------------------------------------ //
  const AUTO_QUICK = 'geostrand-auto-quick';
  GS.lobby = new GS.Lobby(document, { onStart: () => launch(false, 'RaceScene') });
  const netMsg = document.getElementById('intro-net-msg');

  function showNetError(kind) {
    netMsg.innerHTML = kind === 'file'
      ? 'Çevrim içi yarış için oyunu internet adresinden aç (ör. <b>…onrender.com</b>). Dosyayı çift tıklayarak açınca yalnızca tek oyunculu mod çalışır. Kurulum: README → "Çevrim içi yayın".'
      : 'Çevrim içi sunucuya ulaşılamadı. İnternet bağlantını kontrol edip tekrar dene.';
    netMsg.classList.remove('hidden');
  }

  async function startRace({ quickMatch = false } = {}) {
    if (GS.game || GS.creator.isOpen || GS.cutscene.isPlaying || GS.lobby.isOpen) return;
    GS.audio.init();
    if (!GS.creator.hasSaved) {
      GS.creator.open({ mode: 'start', onSave: () => startRace({ quickMatch }) });
      return;
    }
    const btn = document.getElementById('btn-race');
    btn.disabled = true;
    try {
      await GS.NetClient.load();
    } catch (e) {
      showNetError(e.message);
      return;
    } finally {
      btn.disabled = false;
    }
    netMsg.classList.add('hidden');
    if (!GS.net) {
      GS.net = new GS.NetClient();
      GS.lobby.attach(GS.net);
    }
    GS.lobby.open({ quickMatch });
  }

  document.getElementById('btn-race').addEventListener('click', () => startRace());
  // Paylaşılan bağlantıyla gelindiyse (…?oda=KPZT) ya da "Yeni rakip ara"dan dönüldüyse
  let autoQuick = false;
  try {
    autoQuick = sessionStorage.getItem(AUTO_QUICK) === '1';
    sessionStorage.removeItem(AUTO_QUICK);
  } catch (e) { /* depolama kapalı */ }
  if (autoQuick) startRace({ quickMatch: true });
  else if (GS.lobby.pendingCode || GS.NetClient.hasSession()) document.getElementById('btn-race').classList.add('pulse');

  document.getElementById('btn-start').addEventListener('click', start);
  document.getElementById('btn-full').addEventListener('click', () => GS.toggleFullscreen());
  document.getElementById('btn-guide').addEventListener('click', () => GS.guide.open('play'));
  document.getElementById('btn-hero').addEventListener('click', () => GS.creator.open({ mode: 'edit' }));
  document.addEventListener('keydown', function onIntroKey(e) {
    if (GS.game) {
      document.removeEventListener('keydown', onIntroKey);
      return;
    }
    if (GS.creator.isOpen || GS.guide.isOpen || GS.cutscene.isPlaying || GS.lobby.isOpen) return;
    if (e.key === 'Enter' && e.target.tagName !== 'BUTTON') start();
    if (e.key === 'f' || e.key === 'F') GS.toggleFullscreen();
  });
})(window.GS = window.GS || {});
