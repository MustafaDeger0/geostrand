/**
 * ============================================================================
 *  GeoStrand — Açılış Animasyonu (IntroCutscene)
 * ============================================================================
 *  "Göreve başla"ya basınca oynayan 4 sahnelik hikâye girişi.
 *
 *  HİKÂYE (2080): Küresel İklim Örgütü'nün Geo-Core uydusu ve ona bağlı
 *  Geo-Teleporter cihazı, ilk canlı ışınlanma testinde bir güneş fırtınasına
 *  yakalanır. Dr. Geo'nun koordinat verileri silinir ve Dr. Geo dünyanın
 *  bilinmeyen bir noktasına düşer. Kurtarma helikopterini çağırmak için
 *  doğadaki ipuçlarından konumunu hesaplaması gerekir.
 *
 *  SAHNELER
 *    1. Laboratuvar ve uydu krizi   — pencerede Geo-Core, güneş patlaması
 *                                     uyduyu vurur, kırmızı alarm, cızırtı
 *    2. Kuantum sıçraması           — kapsülde Dr. Geo (oyuncunun kâşifi),
 *                                     koordinatlar çıldırır, HATA kodları,
 *                                     mavi-beyaz patlama + ekran sarsıntısı
 *    3. Uyanış                      — GERÇEK OYUN DÜNYASI: göz kapakları
 *                                     açılır, rüzgâr, Dr. Geo kalkar, üstünü
 *                                     silkeler, telsiz "SİNYAL YOK"
 *    4. Macera başlıyor             — kamera uzaklaşır, HUD parçaları tek tek
 *                                     gelir, "Oyuna başlamak için tıkla"
 *
 *  Patlamanın beyaz ışığı ekranı kaplarken oyun arka planda kurulur; böylece
 *  3. ve 4. sahne oyunun kendi haritasında, kâşifin kendisiyle oynar.
 *
 *  KONTROL
 *    Tıkla / dokun / Enter / Boşluk : yazı akıyorsa tamamla, akmışsa sonraki sahne
 *    "Geç ⏭" ya da Esc               : animasyonu atla, doğrudan oyuna geç
 *  Sahneler dokunulmazsa da kendiliğinden ilerler (son sahne tıklama bekler).
 * ============================================================================
 */
(function (GS) {
  'use strict';

  const TYPE_MS = 28;          // daktilo hızı (harf başına)
  const HOLD_MS = 2600;        // yazı bitince sahnenin beklediği süre

  const SCENES = [
    {
      key: 'lab',
      chip: 'Laboratuvar · 2080',
      speaker: '',
      text: '2080… Geo-Core uydusu yörüngede ağır bir güneş fırtınasına yakalandı. Sistem çöküyor!',
    },
    {
      key: 'tele',
      chip: 'Geo-Teleporter',
      speaker: '',
      text: 'HATA: Koordinat verileri silindi! Kuantum sıçraması bilinmeyen bir lokasyona gerçekleşiyor…',
    },
    {
      key: 'wake',
      chip: 'Bilinmeyen konum',
      speaker: 'Dr. Geo',
      text: 'Neredeyim ben?… Telsiz sinyal alamıyor. Cihazın S.O.S modunu çalıştırabilmek için nerede olduğumu bulmam lazım.',
    },
    {
      key: 'start',
      chip: 'Görev',
      speaker: '',
      text: 'Güneşin konumuna, toprağa ve bitkilere bak… İpuçlarını topla, iklimi doğru tahmin et ve hayatta kal!',
    },
  ];

  class IntroCutscene {
    constructor(doc) {
      this.doc = doc;
      this.isPlaying = false;
      const $ = (id) => doc.getElementById(id);
      this.el = {
        root: $('cutscene'),
        stage: $('cs-stage'),
        chip: $('cs-chip'),
        speaker: $('cs-speaker'),
        text: $('cs-text'),
        sub: $('cs-sub'),
        skip: $('cs-skip'),
        next: $('cs-next'),
        start: $('cs-start'),
        statics: $('cs-static'),
      };
      this.el.statics.style.backgroundImage = `url(${noiseDataUrl()})`;

      // Tıklama/dokunma: ilerle (Geç düğmesi hariç)
      this.el.root.addEventListener('click', (e) => {
        if (!this.isPlaying) return;
        if (e.target.closest('#cs-skip')) return;
        this._advance();
      });
      this.el.skip.addEventListener('click', (e) => {
        e.stopPropagation();
        this.skip();
      });
      // Klavye: oyun (Phaser) bu tuşları görmesin diye yakalama aşamasında
      doc.addEventListener('keydown', (e) => {
        if (!this.isPlaying) return;
        if (['Enter', ' ', 'Spacebar', 'ArrowRight'].includes(e.key)) {
          e.preventDefault();
          e.stopPropagation();
          this._advance();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          this.skip();
        } else {
          e.stopPropagation();
        }
      }, true);
    }

    /**
     * @param {{hero:object, launchGame:Function, onFinish:Function}} opts
     *   launchGame: Phaser oyununu "sinematik" modda kurar (patlama anında çağrılır)
     */
    play({ hero, launchGame, onFinish }) {
      this.hero = hero;
      this.launchGame = launchGame;
      this.onFinish = onFinish;
      this.isPlaying = true;
      this.index = -1;
      this.timers = [];
      this.intervals = [];
      this.el.root.className = 'cutscene';
      this.audio = GS.audio;
      this._goto(0);
    }

    /** Animasyonu atla: oyun kurulu değilse kur, hazır olunca başlat */
    skip() {
      if (!this.isPlaying || this._skipping) return;
      this._skipping = true;
      this._clearTimers();
      this.el.root.classList.add('fade-out');
      this._ensureGame(() => this._finish());
    }

    // ------------------------------------------------------------------ //
    //  Sahne akışı
    // ------------------------------------------------------------------ //
    _goto(i) {
      this._clearTimers();
      this.index = i;
      const sc = SCENES[i];
      this.el.root.dataset.scene = sc.key;
      this.el.chip.textContent = `${i + 1}/4 · ${sc.chip}`;
      this.el.next.classList.remove('show');
      this.el.start.classList.add('hidden');
      this.textStarted = false;
      this.el.sub.classList.remove('show');
      this[`_scene_${sc.key}`]();
      // Altyazı sahne görseli oturunca başlar
      this._later(i === 2 ? 1600 : 500, () => this._type(sc));
    }

    _advance() {
      if (this._skipping) return;
      // Sahnenin görseli otururken (altyazı başlamadan) gelen tıklamalar yok sayılır:
      // art arda basınca sahneler görülmeden atlanmasın
      if (!this.textStarted) return;
      if (this.typing) {
        this._finishTyping();
        return;
      }
      const key = SCENES[this.index].key;
      if (key === 'tele') this._teleClimax();      // sahne 2 patlamayla biter
      else if (key === 'start') this._finish();
      else this._goto(this.index + 1);
    }

    /** Yazı bitti: kısa bekle, sonra kendiliğinden ilerle (son sahne bekler) */
    _afterText() {
      const key = SCENES[this.index].key;
      if (key === 'start') {
        this.el.start.classList.remove('hidden');
        this.audio.sfx('bip');
        return;
      }
      this.el.next.classList.add('show');
      this._later(HOLD_MS, () => this._advance());
    }

    // ------------------------------------------------------------------ //
    //  Altyazı (daktilo efekti)
    // ------------------------------------------------------------------ //
    _type(sc) {
      this.el.speaker.textContent = sc.speaker;
      this.el.speaker.classList.toggle('hidden', !sc.speaker);
      this.el.sub.classList.toggle('error', sc.key === 'tele');
      this.el.sub.classList.add('show');
      this.fullText = sc.text;
      this.textStarted = true;
      this.typed = 0;
      this.typing = true;
      this.el.text.textContent = '';
      // Harf sayısı geçen süreden hesaplanır: yavaş cihazda kare atlasa da hız aynı kalır
      const t0 = performance.now();
      const tick = () => {
        const n = Math.min(this.fullText.length, Math.floor((performance.now() - t0) / TYPE_MS));
        if (n === this.typed) return;
        if (Math.floor(n / 3) > Math.floor(this.typed / 3)) this.audio.sfx('type');
        this.typed = n;
        this.el.text.textContent = this.fullText.slice(0, n);
        if (n >= this.fullText.length) this._finishTyping();
      };
      this._every(TYPE_MS, tick, 'type');
    }

    _finishTyping() {
      if (!this.typing) return;
      this.typing = false;
      this._stopInterval('type');
      this.el.text.textContent = this.fullText;
      this._afterText();
    }

    // ================================================================== //
    //  SAHNE 1: Laboratuvar ve uydu krizi
    // ================================================================== //
    _scene_lab() {
      this.el.stage.innerHTML = `
        <div class="cs-lab">
          <div class="lab-wall"></div>
          <div class="lab-window">
            <div class="space">
              <i class="stars"></i>
              <div class="sun"></div>
              <i class="flare f1"></i><i class="flare f2"></i><i class="flare f3"></i>
              <div class="earth"></div>
              <div class="sat">${satelliteSvg()}<span class="sat-label">GEO-CORE</span><i class="sparks"></i></div>
            </div>
            <div class="window-frame"></div>
          </div>
          <div class="lab-consoles">
            <div class="mon"><b>GEO-CORE SİNYALİ</b><svg viewBox="0 0 120 40" preserveAspectRatio="none"><polyline class="graph" points="0,10 15,12 30,9 45,14 60,11 70,26 80,30 90,36 105,38 120,39"/></svg><span class="val bad blink">%12 ↓</span></div>
            <div class="mon"><b>GÜNEŞ FIRTINASI</b><span class="big blink">X9.3</span><span class="val">sınıf · aşırı</span></div>
            <div class="mon"><b>IŞINLANMA SİSTEMİ</b><span class="val bad">AŞIRI YÜK</span><span class="bar"><i></i></span></div>
          </div>
          <i class="beacon l"></i><i class="beacon r"></i>
          <div class="alarm-wash"></div>
        </div>`;
      this.audio.sfx('alarm');
      this._every(1000, () => this.audio.sfx('alarm'), 'alarm');
      this._later(1500, () => {
        this.el.stage.querySelector('.cs-lab').classList.add('hit');
        this._staticBurst();
      });
      this._later(3600, () => this._staticBurst());
    }

    // ================================================================== //
    //  SAHNE 2: Kuantum sıçraması (ışınlanma kazası)
    // ================================================================== //
    _scene_tele() {
      this.el.stage.innerHTML = `
        <div class="cs-tele">
          <div class="tele-bg"></div>
          <div class="tele-wrap">
            <div class="capsule">
              <i class="cap-glow"></i>
              <canvas class="cap-hero" width="36" height="44" aria-label="Dr. Geo"></canvas>
              <i class="ring r1"></i><i class="ring r2"></i><i class="ring r3"></i>
              <i class="cap-glass"></i>
              <i class="cap-top"></i><i class="cap-base"></i>
            </div>
            <div class="coords">
              <div class="lcd-title">GEO-TELEPORTER · HEDEF KOORDİNAT</div>
              <div class="lcd" data-c="lat">00°00′N</div>
              <div class="lcd" data-c="lon">00°00′E</div>
              <ul class="lcd-log"><li>› Uydu bağlantısı: <b class="bad">ZAYIF</b></li></ul>
            </div>
          </div>
          <div class="flash"></div>
        </div>`;
      // Kapsüldeki Dr. Geo = oyuncunun kâşifi
      const canvas = this.el.stage.querySelector('.cap-hero');
      GS.CharacterRenderer.drawFrame(canvas.getContext('2d'), GS.CharacterRenderer.normalize(this.hero), 'down', 0, 0, 0);

      // Koordinatlar rastgele çıldırır
      const lat = this.el.stage.querySelector('[data-c="lat"]');
      const lon = this.el.stage.querySelector('[data-c="lon"]');
      const r = (n) => String(Math.floor(Math.random() * n)).padStart(2, '0');
      this._every(55, () => {
        lat.textContent = `${r(90)}°${r(60)}′${Math.random() < 0.5 ? 'N' : 'S'}`;
        lon.textContent = `${r(180)}°${r(60)}′${Math.random() < 0.5 ? 'E' : 'W'}`;
      }, 'coords');
      const log = this.el.stage.querySelector('.lcd-log');
      const lines = [
        [700, '› Güneş patlaması algılandı'],
        [1400, '› <b class="bad">ERR 0x3F</b> koordinat tamponu bozuk'],
        [2100, '› <b class="bad">ERR 0x7A</b> hedef: BİLİNMİYOR'],
        [2800, '› <b class="bad">KRİTİK</b> sıçrama durdurulamıyor'],
      ];
      lines.forEach(([ms, html]) => this._later(ms, () => {
        log.insertAdjacentHTML('beforeend', `<li>${html}</li>`);
        this.audio.sfx('static');
      }));
      this._later(300, () => this.audio.sfx('charge'));
      this._later(1800, () => this.el.stage.querySelector('.cs-tele').classList.add('overload'));
    }

    /** Sahne 2'nin sonu: beyaz-mavi patlama; oyun bu ışığın arkasında kurulur */
    _teleClimax() {
      if (this._climax) return;
      this._climax = true;
      this._clearTimers();
      this.typing = false;
      this.el.next.classList.remove('show');
      const tele = this.el.stage.querySelector('.cs-tele');
      tele.classList.add('overload', 'boom');
      this.el.root.classList.add('shake');
      this.el.sub.classList.remove('show');
      this.audio.sfx('blast');
      const t0 = performance.now();
      this._later(250, () => {
        this._ensureGame(() => {
          // Işık en az 1,1 sn sürsün (oyun hemen hazır olsa bile)
          const wait = Math.max(0, 1100 - (performance.now() - t0));
          this._later(wait, () => {
            this.el.root.classList.remove('shake');
            this._goto(2);
          });
        });
      });
    }

    // ================================================================== //
    //  SAHNE 3: Uyanış (gerçek oyun dünyası)
    // ================================================================== //
    _scene_wake() {
      this.el.stage.innerHTML = `
        <div class="cs-wake">
          <div class="wind">${'<i></i>'.repeat(14)}</div>
          <div class="lid top"></div><div class="lid bottom"></div>
          <div class="radio-chip"><span class="radio-ico">📻</span><b>SİNYAL YOK</b><span class="radio-bars"><i></i><i></i><i></i><i></i></span></div>
        </div>`;
      this.el.root.classList.add('see-through');
      this.doc.body.classList.add('cine-blur');
      this.audio.sfx('thud');
      // Göz kırpma: biraz açılır, kapanır, sonra tamamen açılır; bulanıklık azalır
      this._later(1500, () => this.doc.body.classList.remove('cine-blur'));
      this._later(1700, () => this._scene().cineWake());
      this._later(2600, () => this.audio.sfx('radio'));
      this._later(6200, () => this.audio.sfx('radio'));
    }

    // ================================================================== //
    //  SAHNE 4: Maceranın başlangıcı (kamera uzaklaşır, HUD gelir)
    // ================================================================== //
    _scene_start() {
      this.el.stage.innerHTML = '';
      this.el.root.classList.add('see-through', 'open-bars');
      const scene = this._scene();
      this.audio.sfx('focus');
      scene.cineZoomOut(2400);
      // HUD parçaları sırayla gelir (CSS geçişleri), her biri bip
      this._later(1500, () => this.doc.body.classList.add('cine-hud'));
      [1500, 1800, 2100, 2400, 2700].forEach((ms) => this._later(ms, () => this.audio.sfx('bip')));
    }

    // ------------------------------------------------------------------ //
    //  Bitiş
    // ------------------------------------------------------------------ //
    _finish() {
      if (!this.isPlaying) return;
      this.isPlaying = false;
      this._clearTimers();
      const scene = this._scene();
      if (scene) scene.endCinematic();
      this.doc.body.classList.remove('cine-blur');
      this.el.root.classList.add('fade-out');
      setTimeout(() => {
        this.el.root.className = 'cutscene hidden';
        this.el.stage.innerHTML = '';
        this.el.sub.classList.remove('show');
        this._skipping = false;
        this._climax = false;
      }, 450);
      if (this.onFinish) this.onFinish();
    }

    /** Oyun kurulu değilse kur; GameScene haritası hazır olunca cb */
    _ensureGame(cb) {
      if (!GS.game) this.launchGame();
      const poll = () => {
        const s = this._scene();
        if (s && s.world) cb();
        else this._pollTimer = setTimeout(poll, 50);
      };
      poll();
    }

    _scene() {
      return GS.game && GS.game.scene.getScene('GameScene');
    }

    _staticBurst() {
      const s = this.el.statics;
      s.classList.remove('burst');
      void s.offsetWidth;
      s.classList.add('burst');
      this.audio.sfx('static');
    }

    // ------------------------------------------------------------------ //
    //  Zamanlayıcılar (sahne değişince hepsi temizlenir)
    // ------------------------------------------------------------------ //
    _later(ms, fn) {
      this.timers.push(setTimeout(fn, ms));
    }

    _every(ms, fn, name) {
      this.intervals.push([name, setInterval(fn, ms)]);
    }

    _stopInterval(name) {
      this.intervals = this.intervals.filter(([n, id]) => {
        if (n === name) clearInterval(id);
        return n !== name;
      });
    }

    _clearTimers() {
      (this.timers || []).forEach(clearTimeout);
      (this.intervals || []).forEach(([, id]) => clearInterval(id));
      clearTimeout(this._pollTimer);
      this.timers = [];
      this.intervals = [];
    }
  }

  /** Geo-Core uydusu (SVG) */
  function satelliteSvg() {
    const panel = (x) => `
      <g transform="translate(${x} 34)">
        <rect width="64" height="32" rx="2" class="panel"/>
        ${[16, 32, 48].map((v) => `<line x1="${v}" y1="0" x2="${v}" y2="32" class="grid"/>`).join('')}
        <line x1="0" y1="16" x2="64" y2="16" class="grid"/>
      </g>`;
    return `
      <svg viewBox="0 0 200 100" aria-hidden="true">
        ${panel(0)}${panel(136)}
        <rect x="64" y="47" width="14" height="6" class="strut"/><rect x="122" y="47" width="14" height="6" class="strut"/>
        <rect x="78" y="30" width="44" height="40" rx="4" class="body"/>
        <rect x="84" y="36" width="32" height="10" rx="2" class="body-band"/>
        <circle cx="100" cy="58" r="5" class="lamp"/>
        <path d="M100 30 L100 14" class="ant"/><circle cx="100" cy="12" r="3" class="lamp"/>
        <path d="M86 70 Q100 90 114 70 Z" class="dish"/>
      </svg>`;
  }

  /** Statik cızırtı dokusu (bir kez üretilir) */
  function noiseDataUrl() {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(128, 128);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.random() * 255;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    return c.toDataURL();
  }

  GS.IntroCutscene = IntroCutscene;
})(window.GS = window.GS || {});
