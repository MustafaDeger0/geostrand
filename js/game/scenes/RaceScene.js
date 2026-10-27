/**
 * ============================================================================
 *  GeoStrand — Çevrim İçi Yarış Sahnesi (RaceScene)
 * ============================================================================
 *  GameScene'den türer: aynı harita, aynı ipuçları, aynı Pad. Farkları:
 *
 *  • Bölgeyi SUNUCU seçer. Her tur bir konum + tohum (seed) gelir; harita bu
 *    tohumla kurulur → dünyadaki bütün yarışçılar birebir aynı haritadadır.
 *  • 3-2-1 geri sayım bitene kadar kimse yürüyemez.
 *  • Tahmin sunucuya gider; doğru mu, kaçıncı oldun, kaç puan aldın kararını
 *    sunucu verir. Yanlış tahmin telsizi 8 sn kilitler (rastgele denemeye karşı).
 *  • Diğer oyuncular haritada yürür (Ghosts); sağda canlı sıralama (RaceHUD).
 *  • Hayatta kalma barları, sandıklar ve gece yoktur: yarış hıza odaklıdır.
 *  • Menüdeki "Baştan başla" yerine "Yarıştan ayrıl".
 * ============================================================================
 */
(function (GS) {
  'use strict';

  class RaceScene extends GS.GameScene {
    constructor() {
      super('RaceScene');
    }

    /** Tek oyunculu bölge yüklemesi yerine: sunucudan gelen turu bekle */
    _begin() {
      const net = (this.net = GS.net);
      this.raceLocked = true;
      this.raceSolved = false;
      this._sentFound = -1;
      this._lastMove = 0;
      document.body.classList.add('race-mode');
      this.raceHud = new GS.RaceHUD(document, net);
      this.ghosts = new GS.Ghosts(this);
      this.menu.setRestartLabel('🚪 Yarıştan ayrıl');

      this._offs = [
        net.on('round:start', (r) => this._startRound(r)),
        net.on('room:state', (s) => {
          this.raceHud.renderBoard(s);
          this.ghosts.sync(s.players, net.playerId);
        }),
        net.on('player:moved', (m) => this.ghosts.move(m)),
        net.on('player:solved', (e) => {
          if (e.id === net.playerId) return;
          const s = Math.round(e.timeMs / 1000);
          this.hud.toast(`${['🥇', '🥈', '🥉'][e.rank - 1] || '✔'} ${e.name} bildi! (${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')})`, 'info');
        }),
        net.on('round:end', (e) => this._roundEnd(e)),
        net.on('game:over', (e) => this._gameOver(e)),
        net.on('disconnect', () => this.hud.toast('📡 Bağlantı koptu, yeniden bağlanılıyor…', 'danger')),
        net.on('connect', () => this.hud.toast('📡 Yeniden bağlandın', 'success')),
      ];

      if (net.state) {
        this.raceHud.renderBoard(net.state);
      }
      // Tur, sahne kurulmadan önce gelmiş olabilir
      if (net.lastRound) this._startRound(net.lastRound);
      else this.raceHud.showWaiting();
    }

    // ================================================================== //
    //  Tur
    // ================================================================== //
    _startRound(r) {
      const location = GS.LOCATIONS.find((l) => l.id === r.locationId);
      if (!location) return;
      const tiers = this.cfg.PROGRESSION.tiers;
      const tier = { ...tiers[r.tierIndex], index: r.tierIndex };
      const weather = GS.WEATHERS[r.weather] || GS.WEATHERS.clear;

      this.raceHud.hideOverlays();
      this.pad.close();
      this.raceSolved = false;
      this.raceLocked = true;
      this._sentFound = -1;
      this._buildLocation(location, tier, weather, {
        crates: 0, label: `Tur ${r.index}/${r.total}`, levelNumber: r.index, seed: r.seed,
      });
      this.dayNight.hour = 10;              // yarışta hep gündüz: herkes aynı ışıkta görsün
      this.ghosts.resetAll(this.spawn.x, this.spawn.y);
      if (this.ghosts && this.net.state) this.ghosts.sync(this.net.state.players, this.net.playerId);
      this.net.progress(0);

      const timing = this.net.roundTiming() || { countdownLeft: r.countdownMs, playLeft: r.playMs };
      this.raceHud.startRound(r, timing);
      window.clearTimeout(this._unlockTimer);
      this._unlockTimer = window.setTimeout(() => {
        if (!this.sys.isActive()) return;
        this.raceLocked = false;
        this.audio.sfx('bip');
      }, timing.countdownLeft);
    }

    _roundEnd(e) {
      this.raceLocked = true;
      this.pad.close();
      this.raceHud.showRoundEnd(e, this.net.playerId);
      this.audio.sfx(e.results.some((x) => x.id === this.net.playerId && x.solved) ? 'arrive' : 'click');
    }

    _gameOver(e) {
      this.raceLocked = true;
      this.pad.close();
      this.raceHud.showFinal(e.standings, this.net.playerId, this.net.isHost, e.isPublic);
      const first = e.standings[0];
      if (first && first.id === this.net.playerId) this.audio.sfx('correct');
    }

    // ================================================================== //
    //  Tahmin → sunucu
    // ================================================================== //
    async _handlePrediction(guess) {
      if (this.raceSolved || this.raceLocked || this._sending) return;
      const missing = this.evaluator.validate(guess, this.tier.fields);
      if (missing.length) {
        this.pad.showErrors(missing);
        return;
      }
      this._sending = true;
      this.pad.setSending(true);
      const res = await this.net.submitGuess(guess);
      this._sending = false;
      if (!this.sys.isActive()) return;
      this.pad.setSending(false);

      if (res.error) {
        this.hud.toast(res.error, 'danger');
        return;
      }
      if (res.missing) {
        this.pad.showErrors(res.missing);
        return;
      }
      if (res.locked) {
        this.pad.lockSubmit(res.lockMs);
        return;
      }
      if (res.correct) {
        this.raceSolved = true;
        this.pad.showRaceSolved(res);
        this.audio.sfx('correct');
        this._updateObjective();
        return;
      }
      this.pad.showRaceWrong(res.result, res.lockMs);
      this.audio.sfx('wrong');
      this.cameras.main.shake(200, 0.006);
    }

    // ================================================================== //
    //  GameScene kancaları
    // ================================================================== //
    _isHalted() {
      return false; // çevrim içi: kimse için zaman durmaz
    }

    _isBlocked() {
      return this.raceLocked || this.pad.isOpen || this.menu.isOpen || GS.guide.isOpen || GS.creator.isOpen
        || (GS.lobby && GS.lobby.isOpen);
    }

    /** Yarışta barlar düşmez */
    _currentEnvironment() {
      return { hydrationFactor: 0, tempFactor: 0 };
    }

    _restart() {
      GS.returnToMainMenu();
    }

    /** Yarışta çanta yok */
    _useItem() {}

    _updateObjective() {
      this.hud.setObjective({
        clueIds: this.tier.clues,
        found: this.found,
        solved: this.raceSolved,
        fields: this.tier.fields,
        solvedTitle: 'Bildin!',
        solvedHint: 'Diğer kâşifler bekleniyor; tur bitince konum açıklanacak',
      });
      if (this.net && this.found && this.found.size !== this._sentFound) {
        this._sentFound = this.found.size;
        this.net.progress(this.found.size);
      }
    }

    update(time, delta) {
      super.update(time, delta);
      if (!this.world) return;
      const dt = Math.min(delta / 1000, 0.1);
      this.dayNight.hour = 10;
      this.ghosts.update(dt);
      this.raceHud.tick(this.net.roundTiming());

      // Konumu paylaş (saniyede 10 kez, yalnız değiştiyse)
      const now = performance.now();
      if (now - this._lastMove >= this.cfg.RACE.moveRateMs) {
        const p = this.player;
        const moving = p.body.speed > 5;
        const key = `${Math.round(p.x)},${Math.round(p.y)},${p.facing},${moving}`;
        if (key !== this._lastMoveKey) {
          this.net.move(Math.round(p.x), Math.round(p.y), p.facing, moving);
          this._lastMoveKey = key;
        }
        this._lastMove = now;
      }
    }

    _teardown() {
      window.clearTimeout(this._unlockTimer);
      (this._offs || []).forEach((off) => off());
      if (this.ghosts) this.ghosts.destroy();
      if (this.raceHud) this.raceHud.destroy();
      document.body.classList.remove('race-mode');
      super._teardown();
    }
  }

  GS.RaceScene = RaceScene;
})(window.GS = window.GS || {});
