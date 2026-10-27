/**
 * ============================================================================
 *  GeoStrand — Ana Oyun Sahnesi (GameScene)
 * ============================================================================
 *  "Orkestra şefi": Modülleri oluşturur, birbirine bağlar ve oyun döngüsünü
 *  yürütür. Kendi başına neredeyse hiç kural içermez; kurallar logic/
 *  klasöründeki sınıflardadır.
 *
 *  OYUN DÖNGÜSÜ:
 *    Bölgeye düş → ipucu nesnelerini incele (E) → Pad'de tahmin et →
 *      DOĞRU  : +50 Su / +50 Isı ödülü, puan + ⭐, ceza silinir, sonraki bölgeye uç
 *      YANLIŞ : 45 sn boyunca barlar 2 kat hızlı düşer, puan azalır, tekrar dene
 *    HP 0 → Oyun biter (R ile yeniden başla)
 *
 *  ÇEŞİTLİLİK (her bölge farklı):
 *    • Kademeler: Bölge 3'te yer şekli, Bölge 5'te kıta sorusu açılır
 *    • 19 konum, aynı iklim arka arkaya gelmez
 *    • Harita iklim + yer şekline göre kurulur (dağlık, plato kanyonu, ova tarlaları)
 *    • Hava olayları (Bölge 3+), yardım sandıkları
 *
 *  ZAMAN AKIŞI:
 *    normal oyun : 1×
 *    Pad açık    : 0,25× (okuma/düşünme süresi; gerilim sürer)
 *    Menü / Rehber / karakter oluşturucu / uçuş : 0× (tam duraklama)
 *    Açılış animasyonu (cinematic)              : 0× — IntroCutscene kamerayı
 *                                                 yönetir, bitince oyun başlar
 * ============================================================================
 */
(function (GS) {
  'use strict';

  const BEST_KEY = 'geostrand-best';

  class GameScene extends Phaser.Scene {
    constructor() {
      super('GameScene');
    }

    // ================================================================== //
    //  KURULUM
    // ================================================================== //
    create() {
      const C = GS.CONFIG;
      this.cfg = C;

      // --- Mantık katmanı (Phaser'dan bağımsız) --------------------------
      this.bus = new GS.EventBus();
      this.survival = new GS.SurvivalSystem(C.SURVIVAL, this.bus, GS.EVENTS);
      this.dayNight = new GS.DayNightCycle(C.DAY_NIGHT);
      this.inventory = new GS.Inventory(C.INVENTORY.starting);
      this.evaluator = new GS.PredictionEvaluator({
        latitudeTolerance: C.PREDICTION.latitudeTolerance,
        climates: GS.CLIMATES,
      });
      this.locations = new GS.LocationManager(GS.LOCATIONS);
      this.score = new GS.ScoreKeeper(C.SCORE);

      // --- Dünya, oyuncu, kamera -----------------------------------------
      this.hero = GS.creator.current;
      this.spawn = { x: C.WORLD.width / 2, y: C.WORLD.height / 2 };
      this.physics.world.setBounds(0, 0, C.WORLD.width, C.WORLD.height);
      this.player = new GS.Player(this, this.spawn.x, this.spawn.y, C.PLAYER, this.hero);
      this.cameras.main.setBounds(0, 0, C.WORLD.width, C.WORLD.height);
      this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
      // Açılış animasyonu: oyun ilk kez kurulurken kamera kâşife çok yakın başlar,
      // kâşif yerde yatar; IntroCutscene sırayla cineWake/cineZoomOut/endCinematic çağırır.
      this.cinematic = !!GS.cinematicStart;
      GS.cinematicStart = false;
      this._zoomMul = this.cinematic ? 2.6 : 1;
      if (this.cinematic) {
        document.body.classList.add('cine');
        this.player.setAngle(-90);
      }
      this._applyZoom();
      this._onResize = () => this._applyZoom();
      this.scale.on('resize', this._onResize);

      // --- Oyun sistemleri (Phaser'a bağlı) ------------------------------
      this.worldBuilder = new GS.WorldBuilder(this, C.WORLD);
      this.interaction = new GS.InteractionSystem(this, this.player, this.bus, C.PLAYER.interactRange);
      // Telefon / tablet: kaydır (joystick) ya da dokunduğun yere yürü
      this.touch = new GS.TouchControls(this, this.player, {
        range: C.PLAYER.interactRange,
        getTargets: () => (this.world ? [...this.world.interactables, ...this.world.crates] : []),
        onInteract: (obj) => this.bus.emit(GS.EVENTS.INTERACT, obj),
      });
      this.lighting = new GS.LightingOverlay(this, C.DAY_NIGHT);
      this.weatherFX = new GS.WeatherFX(this, document);

      // --- Ses (main.js'te kullanıcı tıklamasıyla başlatılır; sahneler arası kalıcı)
      this.audio = GS.audio;

      // --- Arayüz (HTML/DOM) --------------------------------------------
      this.hud = new GS.HUD(document, C, this.bus);
      this.pad = new GS.GeographerPad({ bus: this.bus, climates: GS.CLIMATES, doc: document });
      this.menu = new GS.PauseMenu({ bus: this.bus, doc: document, audioSettings: this.audio.getSettings() });
      this.indicators = new GS.OffscreenIndicators(document);
      this.hud.setMuted(this.audio.muted);
      this.hud.setFullscreen(!!document.fullscreenElement);
      this.hud.setHero(this.hero);
      this.interaction.onFocusChange((obj) => this.hud.setInteractTarget(obj));

      // --- Bağlantılar ----------------------------------------------------
      this._bindEvents();
      this._bindKeys();
      this._onFullscreenChange = () => this.hud.setFullscreen(!!document.fullscreenElement);
      document.addEventListener('fullscreenchange', this._onFullscreenChange);
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this._teardown());

      this.elapsed = 0;
      this.traveling = false;
      this._loadNextLocation();
    }

    /** EventBus dinleyicileri: modüller arası tüm akış burada okunabilir. */
    _bindEvents() {
      const E = GS.EVENTS;
      const bus = this.bus;

      // E tuşu: ipucu nesnesi → deftere yaz, görevi güncelle, Pad'i aç | sandık → eşya
      bus.on(E.INTERACT, (obj) => {
        if (obj.type === 'crate') {
          this._openCrate(obj);
          return;
        }
        this.audio.sfx('interact');
        obj.markInspected();
        this.found.add(obj.type);
        this._updateObjective();
        this.pad.addNote(obj.clue);
        this.pad.open(obj.clue);
      });

      // Pad / menü açılınca Phaser klavyesini sustur (form alanları tuşları alabilsin)
      bus.on(E.PAD_OPENED, () => {
        this._setGameKeyboard(false);
        this.audio.sfx('padOpen');
      });
      bus.on(E.PAD_CLOSED, () => this._setGameKeyboard(true));
      bus.on(E.MENU_OPENED, () => this._setGameKeyboard(false));
      bus.on(E.MENU_CLOSED, () => this._setGameKeyboard(true));

      // Tahmin
      bus.on(E.PREDICTION_SUBMIT, (guess) => this._handlePrediction(guess));
      bus.on(E.LEVEL_NEXT, () => this._travelToNext());

      bus.on(E.PENALTY_END, () => {
        if (!this.levelSolved) this.hud.toast('Ceza bitti, barlar normal hızda', 'info');
      });

      // Ölüm
      bus.on(E.PLAYER_DIED, () => {
        this.pad.close();
        this.menu.close();
        this.player.setVelocity(0, 0);
        this.audio.sfx('death');
        const best = readBest();
        const newBest = this.score.total > best;
        if (newBest) writeBest(this.score.total);
        this.hud.showGameOver({
          escaped: this.locations.escapedCount,
          day: this.dayNight.dayCount,
          minutes: Math.floor(this.elapsed / 60),
          seconds: Math.floor(this.elapsed % 60),
          score: this.score.total,
          stars: this.score.totalStars,
          best: Math.max(best, this.score.total),
          newBest: newBest && this.score.total > 0,
        });
      });
      bus.on(E.RESTART, () => this._restart());

      // Arayüz düğmeleri
      bus.on(E.UI_OPEN_PAD, () => this._openPad());
      bus.on(E.UI_TOGGLE_MUTE, () => this._toggleMute());
      bus.on(E.UI_FULLSCREEN, () => GS.toggleFullscreen());
      bus.on(E.UI_MENU, () => this._openMenu());
      bus.on(E.UI_USE_ITEM, (type) => this._useItem(type));
      bus.on(E.UI_GUIDE, (tab) => this._openGuide(tab));
      bus.on(E.UI_EDIT_HERO, () => this._editHero());
      bus.on(E.UI_INTERACT, () => this.interaction.trigger());

      // Ses ayarları
      bus.on(E.VOLUME_CHANGED, ({ channel, value }) => {
        this.audio.setVolume(channel, value);
        this.hud.setMuted(this.audio.muted);
      });
    }

    _bindKeys() {
      const kb = this.input.keyboard;
      Object.entries(this.cfg.INVENTORY.items).forEach(([type, item]) => {
        kb.on(`keydown-${item.key}`, () => this._useItem(type)); // 1 / 2
      });
      kb.on('keydown-P', () => this._openPad());
      kb.on('keydown-M', () => this._toggleMute());
      kb.on('keydown-F', () => GS.toggleFullscreen());
      kb.on('keydown-ESC', () => this._openMenu());
      kb.on('keydown-R', () => {
        if (this.survival.isDead) this.bus.emit(GS.EVENTS.RESTART);
      });
    }

    // ================================================================== //
    //  OYUN DÖNGÜSÜ
    // ================================================================== //
    update(time, delta) {
      if (!this.world) return;
      const dt = Math.min(delta / 1000, 0.1); // sekme arka plandayken dev sıçramaları engelle
      const dead = this.survival.isDead;
      const halted = this._isHalted();                    // zaman durur
      const blocked = this._isBlocked() || dead;           // oyuncu hareket edemez

      if (!dead && !halted) {
        const gameDt = dt * (this.pad.isOpen ? this.cfg.PAD.timeScale : 1);
        this.elapsed += gameDt;
        if (!this.levelSolved) this.score.tick(gameDt);
        this.dayNight.update(gameDt);                                // 1) Zaman
        this.survival.update(gameDt, this._currentEnvironment());   // 2) Hayatta kalma
      }

      // 3) Oyuncu ve etkileşim (klavye + dokunmatik)
      this.touch.setEnabled(!blocked);
      if (this.player.keyboardActive) this.touch.cancelMove();
      this.player.tick(blocked, this.touch.update(dt));
      this.interaction.update(!blocked);

      // 4) Görsel güncellemeler
      this.world.update(this.dayNight.lightLevel);
      this.lighting.update(this.dayNight.darkness, this.player);
      this.weatherFX.update();
      this.hud.render(this._hudView());
      this.indicators.update(this.cameras.main, this.world.interactables, !blocked);

      // 5) Ses: ortam karışımı + ayak sesleri (müzik kendi zamanlayıcısıyla çalar)
      this.audio.update(dt, {
        light: this.dayNight.lightLevel,
        waterDistance: this.world.distanceToWater(this.player.x, this.player.y),
        moving: !blocked && this.player.body.speed > 5,
        paused: blocked,
      });
    }

    /** Zaman tamamen durur mu? (menü, rehber, karakter oluşturucu, uçuş) */
    _isHalted() {
      return this.cinematic || this.menu.isOpen || this.traveling || GS.guide.isOpen || GS.creator.isOpen;
    }

    /** Oyuncu hareket edemez mi? (duraklama ya da Pad açık) */
    _isBlocked() {
      return this._isHalted() || this.pad.isOpen;
    }

    /** Baştan başla (menü / oyun sonu) */
    _restart() {
      this.scene.restart();
    }

    /**
     * Ortam çarpanları = iklim (gece/gündüz karışımı) × hava olayı × kademe zorluğu.
     * Örn. Çöl gecesi + kum fırtınası + Bölge 5 → su ve ısı çok hızlı düşer.
     */
    _currentEnvironment() {
      const climate = GS.CLIMATES[this.world.location.climate];
      const w = this.weather;
      const k = this.tier.decayMultiplier;
      return {
        hydrationFactor: climate.hydrationFactor * w.hydration * k,
        tempFactor: Phaser.Math.Linear(climate.tempDayFactor, climate.tempNightFactor, this.dayNight.nightness) * w.temp * k,
      };
    }

    // ================================================================== //
    //  TAHMİN → ÖDÜL / CEZA
    // ================================================================== //
    _handlePrediction(guess) {
      if (this.levelSolved || this.survival.isDead) return;

      const errors = this.evaluator.validate(guess, this.tier.fields);
      if (errors.length) {
        this.pad.showErrors(errors);
        return;
      }
      const result = this.evaluator.evaluate(guess, this.world.location, {
        fields: this.tier.fields,
        latitudeTolerance: this.tier.latitudeTolerance,
      });
      if (result.isCorrect) this._rewardCorrect(result);
      else this._punishWrong(result);
    }

    /** DOĞRU: +50 Su ve +50 Isı (çantaya ya da doğrudan), puan + yıldız, ceza silinir */
    _rewardCorrect(result) {
      const { bonusAmount, autoApply } = this.cfg.REWARD;
      this.levelSolved = true;
      this.locations.markEscaped();
      this.survival.clearPenalty();
      const scored = this.score.finishLevel(this.locations.levelNumber, this.tier.index);

      if (autoApply) {
        this.survival.restore('hydration', bonusAmount);
        this.survival.restore('bodyTemp', bonusAmount);
      } else {
        this.inventory.add('water');
        this.inventory.add('heat');
      }
      this.hud.toast(`Doğru! ${'⭐'.repeat(scored.stars)} +${scored.points} puan, çantana su ve ısı eklendi`, 'success');

      this.audio.sfx('correct');
      this._updateObjective();
      const loc = this.world.location;
      const climate = GS.CLIMATES[loc.climate];
      const badges = [
        `📍 ${loc.latitude}° ${GS.HEMISPHERES[loc.hemisphere].label}`,
        `${climate.icon} ${climate.label}`,
      ];
      if (this.tier.fields.includes('landform')) {
        const lf = GS.LANDFORMS[loc.landform];
        badges.push(`${lf.icon} ${lf.label} · ${loc.elevation.toLocaleString('tr-TR')} m`);
      }
      if (this.tier.fields.includes('continent')) {
        const ct = GS.CONTINENTS[loc.continent];
        badges.push(`${ct.icon} ${ct.label}`);
      }
      this.pad.showResult(result, {
        name: loc.name,
        badges,
        summary: climate.summary,
        stars: scored.stars,
        points: scored.points,
        fast: scored.fast,
      });
    }

    /** YANLIŞ: barlar CONFIG.SURVIVAL.penaltyDuration saniye 2 kat hızlı düşer */
    _punishWrong(result) {
      const { penaltyDuration, penaltyMultiplier } = this.cfg.SURVIVAL;
      this.survival.startPenalty(penaltyDuration);
      this.score.recordWrong();
      this.pad.showResult(result, null);
      this.hud.toast(`Yanlış koordinat: ${penaltyDuration} sn boyunca barlar ${penaltyMultiplier} kat hızlı düşecek`, 'danger');
      this.audio.sfx('wrong');
      this.cameras.main.shake(200, 0.006);
    }

    /** Çantadan eşya kullan (1: Su Matarası, 2: Isı Paketi) */
    _useItem(type) {
      if (this.cinematic || this.survival.isDead || this.menu.isOpen) return;
      const item = this.cfg.INVENTORY.items[type];

      if (!this.inventory.has(type)) {
        this.hud.toast(`${item.label} kalmadı. Doğru tahminle ya da 📦 sandıklardan kazan.`, 'info');
        return;
      }
      if (this.survival.isFull(item.stat)) {
        this.hud.toast(`${item.label}: bar zaten dolu`, 'info');
        return;
      }
      this.inventory.consume(type);
      const gained = this.survival.restore(item.stat, this.cfg.REWARD.bonusAmount);
      this.hud.toast(`${item.icon} ${item.label} kullanıldı: +${Math.round(gained)}`, 'success');
      this.audio.sfx('item');
    }

    /**
     * Yardım sandığı: hangi bar daha düşükse ona yarayan eşya çıkar.
     * Görünür olsun diye: sandık zıplayıp açılır, parıltılar saçılır, eşyanın
     * simgesi sandıktan yükselir ve ekranın ortasında büyük bir "ganimet"
     * kartı çıkar; kart kapanırken simge çantadaki yuvasına uçar.
     */
    _openCrate(crate) {
      if (crate.inspected) return;
      crate.markInspected();
      const type = this.survival.hydration <= this.survival.bodyTemp ? 'water' : 'heat';
      this.inventory.add(type);
      const item = this.cfg.INVENTORY.items[type];

      // 1) Sandık: zıpla, kapak açılsın
      this.tweens.add({
        targets: crate, scaleX: 1.25, scaleY: 0.8, duration: 90, yoyo: true,
        onComplete: () => crate.setTexture('crate_open'),
      });
      // 2) Parıltı patlaması (eşyanın rengiyle)
      const color = type === 'water' ? [0x8fd8ff, 0xffffff, 0x4fb0d6] : [0xffb15c, 0xffffff, 0xff7a2f];
      const burst = this.add.particles(crate.x, crate.y - 10, 'p_spark', {
        speed: { min: 90, max: 220 }, angle: { min: 200, max: 340 }, gravityY: 260,
        lifespan: 900, scale: { start: 1.3, end: 0 }, rotate: { min: 0, max: 360 },
        tint: color, quantity: 26, emitting: false,
      }).setDepth(4600);
      burst.explode(26);
      this.time.delayedCall(1200, () => burst.destroy());
      // 3) Simge sandıktan yükselir
      const icon = this.add.text(crate.x, crate.y - 20, `${item.icon}+1`, {
        fontFamily: 'Atkinson Hyperlegible, Segoe UI, Arial, sans-serif', fontSize: '22px', fontStyle: 'bold',
        color: '#ffffff', stroke: '#0f2a2e', strokeThickness: 5,
      }).setOrigin(0.5).setDepth(4700);
      this.tweens.add({ targets: icon, y: crate.y - 78, alpha: { from: 1, to: 0 }, duration: 1400, ease: 'Cubic.Out', onComplete: () => icon.destroy() });
      this.cameras.main.shake(120, 0.003);

      // 4) Ekranın ortasında ganimet kartı → simge çantaya uçar
      this.hud.showLoot({
        type,
        icon: item.icon,
        label: item.label,
        effect: type === 'water' ? `+${this.cfg.REWARD.bonusAmount} su` : `+${this.cfg.REWARD.bonusAmount} vücut ısısı`,
        key: type === 'water' ? '1' : '2',
        count: this.inventory.getCounts()[type],
      });
      this.audio.sfx('loot');
    }

    // ================================================================== //
    //  BÖLGE YÖNETİMİ
    // ================================================================== //

    /** Uçuş perdesi → yeni bölge yüklenir → perde kalkar */
    _travelToNext() {
      if (this.traveling) return;
      this.traveling = true;
      this.pad.close();
      this.hud.showTravel();
      // Perde HTML'dir ve gerçek zamanla oynar; bu yüzden Phaser saati yerine
      // tarayıcı saati kullanılır (yavaş bilgisayarda kare hızı düşse de takılmaz).
      this._travelTimer = window.setTimeout(() => {
        if (!this.sys.isActive()) return;
        this._loadNextLocation();
        this.hud.hideTravel();
        this.traveling = false;
      }, 1400);
    }

    _loadNextLocation() {
      const location = this.locations.next();
      const n = this.locations.levelNumber;
      const tiers = this.cfg.PROGRESSION.tiers;
      const tier = GS.Progression.tierFor(n, tiers);
      const weather = GS.WEATHERS[GS.WeatherPicker.pick(location.climate, tier.weatherChance, GS.CLIMATE_WEATHER)];
      this._buildLocation(location, tier, weather, { crates: tier.crates, label: `Bölge ${n}`, levelNumber: n });

      if (GS.Progression.isUnlockLevel(n, tiers) && tier.unlock) {
        this.hud.showUnlock(tier.unlock);
      } else if (weather.key !== 'clear') {
        this.hud.toast(`${weather.icon} ${weather.label}: ${weather.why}`, 'info');
      }
    }

    /**
     * Bir konumu haritaya kur ve tüm sistemleri ona göre sıfırla.
     * @param {object} location
     * @param {object} tier   kademe (index dahil)
     * @param {object} weather GS.WEATHERS öğesi
     * @param {{crates:number, label:string, levelNumber:number}} opts
     */
    _buildLocation(location, tier, weather, { crates, label, levelNumber }) {
      if (this.world) {
        this.worldCollider.destroy();
        this.world.destroy();
      }
      this.indicators.clear();
      this.tier = tier;
      this.weather = weather;
      const clues = GS.ClueFactory.build(location, tier.clues, { landforms: GS.LANDFORMS });

      this.player.setPosition(this.spawn.x, this.spawn.y);
      this.player.body.reset(this.spawn.x, this.spawn.y);
      this.world = this.worldBuilder.build(location, clues, this.spawn, { crates });
      this.worldCollider = this.physics.add.collider(this.player, this.world.obstacles);
      this.interaction.setTargets([...this.world.interactables, ...this.world.crates]);
      this.levelSolved = false;
      this.found = new Set();
      this.score.startLevel();

      this.pad.resetForLocation(label, tier);
      this.hud.setRegion(levelNumber, tier.name);
      this._updateObjective();
      this.hud.setWeather(weather);
      this.weatherFX.set(weather);
      this.audio.setClimate(location.climate, weather);
      this.audio.sfx('arrive');
    }

    _updateObjective() {
      this.hud.setObjective({
        clueIds: this.tier.clues,
        found: this.found,
        solved: this.levelSolved,
        fields: this.tier.fields,
      });
    }

    // ================================================================== //
    //  YARDIMCILAR
    // ================================================================== //

    /**
     * Ekran boyutuna göre yakınlaştırma: her ekranda benzer ALANDA dünya görünür.
     * Alan esaslı olduğu için telefon dikey de tutulsa yatay da tutulsa aynı
     * miktarda harita görünür (dikeyde daha uzun, yatayda daha geniş).
     */
    _applyZoom() {
      const { width, height } = this.scale;
      const c = this.cfg.CAMERA;
      const byArea = Math.sqrt((width * height) / (c.viewWidth * c.viewHeight));
      const zoom = Phaser.Math.Clamp(byArea, c.minZoom, c.maxZoom);
      this.cameras.main.setZoom(zoom * (this._zoomMul || 1));
    }

    // ================================================================== //
    //  AÇILIŞ ANİMASYONU (IntroCutscene yönetir)
    // ================================================================== //

    /** Sahne 3: Dr. Geo yerde gözlerini açar, kalkar, üstünü silkeler */
    cineWake() {
      const p = this.player;
      this.tweens.add({
        targets: p, angle: 0, duration: 650, ease: 'Back.Out', delay: 200,
        onComplete: () => {
          // Üstünü silkele: sağa sola hızlı kıpırdama + toz
          this.tweens.add({ targets: p, x: p.x + 3, duration: 60, yoyo: true, repeat: 5 });
          const dust = this.add.particles(p.x, p.y - 14, 'p_dust', {
            speed: { min: 20, max: 60 }, angle: { min: 180, max: 360 }, lifespan: 700,
            alpha: { start: 0.8, end: 0 }, scale: { start: 0.8, end: 0.2 }, quantity: 10, emitting: false,
          }).setDepth(p.depth + 1);
          dust.explode(14);
          this.time.delayedCall(900, () => dust.destroy());
          // Sağa sola bak: neredeyim?
          ['left', 'right', 'down'].forEach((dir, i) => this.time.delayedCall(700 + i * 520, () => {
            p.facing = dir;
            p.setFrame(`${dir}-0`);
          }));
        },
      });
    }

    /** Sahne 4: kamera kâşiften uzaklaşır, çevre görünür */
    cineZoomOut(duration = 2400) {
      this.tweens.addCounter({
        from: this._zoomMul, to: 1, duration, ease: 'Cubic.InOut',
        onUpdate: (tw) => {
          this._zoomMul = tw.getValue();
          this._applyZoom();
        },
      });
    }

    /** Animasyon bitti ya da geçildi: oyun başlar */
    endCinematic() {
      if (!this.cinematic) return;
      this.cinematic = false;
      this.tweens.killTweensOf(this.player);
      this.player.setAngle(0);
      this._zoomMul = 1;
      this._applyZoom();
      document.body.classList.remove('cine', 'cine-hud');
      this._setGameKeyboard(true);
      this.audio.sfx('arrive');
    }

    _openPad() {
      if (this.cinematic || this.survival.isDead || this.menu.isOpen || this.traveling) return;
      this.pad.open(null);
    }

    _openMenu() {
      if (this.cinematic || this.survival.isDead || this.pad.isOpen || this.traveling) return;
      this.menu.open();
    }

    /** Rehber: Pad ya da menünün üstünde açılır; kapanınca altındaki pencereye dönülür */
    _openGuide(tab) {
      GS.guide.open(tab);
    }

    /** Karakter oluşturucu (menüden): kaydedilince karakter anında değişir */
    _editHero() {
      this.menu.close();
      this._setGameKeyboard(false);
      GS.creator.open({
        mode: 'edit',
        onSave: (appearance) => {
          this.hero = appearance;
          this.player.setAppearance(appearance);
          this.hud.setHero(appearance);
          this.hud.toast(`${appearance.name} hazır!`, 'success');
        },
        onClose: () => this._setGameKeyboard(true),
      });
    }

    _toggleMute() {
      const muted = this.audio.toggleMute();
      this.hud.setMuted(muted);
      this.hud.toast(muted ? '🔇 Ses kapalı' : '🔊 Ses açık', 'info');
    }

    /** Pad/menü açıkken Phaser klavyeyi bırakır ki form alanları tuşları alabilsin */
    _setGameKeyboard(enabled) {
      const kb = this.input.keyboard;
      kb.enabled = enabled;
      kb.resetKeys(); // basılı kalmış tuş hatasını önler
      if (enabled) kb.enableGlobalCapture();
      else kb.disableGlobalCapture();
    }

    /** HUD'ın ihtiyaç duyduğu tüm veriler tek nesnede */
    _hudView() {
      return {
        survival: this.survival.getState(),
        clock: this.dayNight.formatClock(),
        day: this.dayNight.dayCount,
        phase: this.dayNight.phase,
        inventory: this.inventory.getCounts(),
        escaped: this.locations.escapedCount,
        score: this.score.total,
      };
    }

    /** Sahne kapanırken DOM dinleyicilerini temizle (restart'ta çift kayıt olmasın) */
    _teardown() {
      window.clearTimeout(this._travelTimer);
      this.weatherFX.clear();
      this.pad.destroy();
      this.menu.destroy();
      this.hud.destroy();
      this.indicators.destroy();
      this.touch.destroy();
      this.bus.clear();
      this.scale.off('resize', this._onResize);
      document.removeEventListener('fullscreenchange', this._onFullscreenChange);
      this.input.keyboard.enabled = true;
      this.input.keyboard.enableGlobalCapture();
      this.world = null;
      document.body.classList.remove('cine', 'cine-hud');
    }
  }

  /** En iyi puan tarayıcıda saklanır */
  function readBest() {
    try {
      return Number(window.localStorage.getItem(BEST_KEY)) || 0;
    } catch (e) {
      return 0;
    }
  }

  function writeBest(value) {
    try {
      window.localStorage.setItem(BEST_KEY, String(value));
    } catch (e) {
      /* depolama kapalı */
    }
  }

  GS.GameScene = GameScene;
  GS.readBestScore = readBest;
})(window.GS = window.GS || {});
