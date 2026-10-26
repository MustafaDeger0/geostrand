/**
 * ============================================================================
 *  GeoStrand — HUD (Ekran Göstergeleri)
 * ============================================================================
 *  HTML/CSS ile çizilir (index.html → #hud). Oyun tuvalinin üstünde durur,
 *  gece karanlığından etkilenmez, her ekran boyutunda net kalır.
 *
 *  BÖLÜMLER:
 *    Sol üst   : Can / Su / Isı + yanlış tahmin cezası sayacı
 *    Üst orta  : Görev göstergesi ("şimdi ne yapmalıyım?")
 *    Sağ üst   : Saat, gün evresi, pusula
 *    Sol alt   : Çanta (1: su, 2: ısı) + kurtuluş sayısı
 *    Sağ alt   : Eylem çubuğu (Pad, ses, tam ekran, menü) — fareyle de kullanılır
 *    Kenarlar  : Susuzluk / soğuk / yaralanma uyarı renkleri
 *
 *  HUD oyun kuralı içermez: düğmeler EventBus'a olay yayar.
 * ============================================================================
 */
(function (GS) {
  'use strict';

  class HUD {
    /**
     * @param {Document} doc
     * @param {object} config GS.CONFIG
     * @param {GS.EventBus} bus
     */
    constructor(doc, config, bus) {
      this.doc = doc;
      this.cfg = config;
      this.bus = bus;
      const $ = (id) => doc.getElementById(id);

      this.el = {
        root: $('hud'),
        meters: {
          hp: { fill: $('bar-hp'), value: $('val-hp'), row: $('row-hp') },
          hydration: { fill: $('bar-water'), value: $('val-water'), row: $('row-water') },
          bodyTemp: { fill: $('bar-temp'), value: $('val-temp'), row: $('row-temp') },
        },
        penalty: $('hud-penalty'),
        penaltyTime: $('hud-penalty-time'),
        clock: $('hud-clock'),
        phase: $('hud-phase'),
        water: $('inv-water'),
        heat: $('inv-heat'),
        waterBtn: $('use-water'),
        heatBtn: $('use-heat'),
        escaped: $('hud-escaped'),
        location: $('hud-location'),
        objective: $('objective'),
        objTitle: $('obj-title'),
        objHint: $('obj-hint'),
        objItems: $('obj-items'),
        heroName: $('hud-hero-name'),
        heroPortrait: $('hud-portrait'),
        tier: $('hud-tier'),
        score: $('hud-score'),
        weather: $('hud-weather'),
        unlock: $('unlock'),
        muteBtn: $('act-mute'),
        muteIcon: $('mute-icon'),
        fullIcon: $('full-icon'),
        vignette: $('vignette'),
        toasts: $('toasts'),
        travel: $('travel'),
        gameOver: $('gameover'),
        gameOverStats: $('gameover-stats'),
      };

      this.el.root.classList.remove('hidden');
      this._last = {}; // gereksiz DOM yazımını önleyen önbellek

      // Düğmeler → olaylar (klavye kısayollarıyla aynı işi yapar)
      this._listeners = [];
      const E = GS.EVENTS;
      this._on($('act-pad'), () => bus.emit(E.UI_OPEN_PAD));
      this._on($('act-mute'), () => bus.emit(E.UI_TOGGLE_MUTE));
      this._on($('act-full'), () => bus.emit(E.UI_FULLSCREEN));
      this._on($('act-menu'), () => bus.emit(E.UI_MENU));
      this._on(this.el.waterBtn, () => bus.emit(E.UI_USE_ITEM, 'water'));
      this._on(this.el.heatBtn, () => bus.emit(E.UI_USE_ITEM, 'heat'));
      this._on($('btn-restart'), () => bus.emit(E.RESTART));
    }

    _on(el, fn) {
      const handler = (e) => {
        e.currentTarget.blur(); // odak düğmede kalmasın: Space/Enter tekrar tetiklemesin
        fn();
      };
      el.addEventListener('click', handler);
      this._listeners.push([el, handler]);
    }

    // ================================================================== //
    //  Her kare
    // ================================================================== //

    /** @param {object} view GameScene._hudView() */
    render(view) {
      const s = view.survival;
      const crit = this.cfg.SURVIVAL.criticalLevel;

      this._meter('hp', s.hp, `${Math.ceil(s.hp)}`, crit);
      this._meter('hydration', s.hydration, `${Math.ceil(s.hydration)}`, crit);
      this._meter('bodyTemp', s.bodyTemp, `${s.bodyTempCelsius.toFixed(1).replace('.', ',')}°`, crit);

      this._toggle(this.el.root, 'penalized', s.isPenalized);
      this._toggle(this.el.penalty, 'hidden', !s.isPenalized);
      this._text('penaltyTime', `${Math.ceil(s.penaltyRemaining)}`);

      this._text('clock', view.clock);
      this._text('phase', `${view.phase.icon} ${view.phase.label} · Gün ${view.day}`);
      this._text('water', String(view.inventory.water || 0));
      this._text('heat', String(view.inventory.heat || 0));
      this._toggle(this.el.waterBtn, 'empty', !view.inventory.water);
      this._toggle(this.el.heatBtn, 'empty', !view.inventory.heat);
      this._text('escaped', String(view.escaped));
      this._text('score', view.score.toLocaleString('tr-TR'));

      // Ekran kenarı uyarıları: 30'un altına inince belirmeye başlar
      const level = (v) => Math.max(0, Math.min(1, (30 - v) / 30)).toFixed(2);
      this._css('--cold', level(s.bodyTemp));
      this._css('--dry', level(s.hydration));
      this._css('--hurt', level(s.hp));
    }

    // ================================================================== //
    //  Durum değişiklikleri
    // ================================================================== //

    /**
     * Görev göstergesi: oyuncuya sıradaki adımı söyler. İpucu listesi kademeye
     * göre 3–5 madde olur.
     * @param {{clueIds:string[], found:Set<string>, solved:boolean, fields:string[]}} state
     */
    setObjective({ clueIds, found, solved, fields }) {
      const T = GS.ClueFactory.TYPES;
      const total = clueIds.length;
      const all = found.size >= total;
      this.el.objItems.innerHTML = clueIds.map((id) =>
        `<li class="${found.has(id) ? 'done' : ''}"><span class="tick"></span>${T[id].icon} ${T[id].title}</li>`).join('');
      this.el.objective.classList.toggle('ready', all && !solved);
      this.el.objective.classList.toggle('solved', solved);

      const NAMES = { hemisphere: 'yarım küre', climate: 'iklim', latitude: 'enlem', landform: 'yer şekli', continent: 'kıta' };
      if (solved) {
        this.el.objTitle.textContent = 'Kurtarma hazır';
        this.el.objHint.innerHTML = 'Pad\'de <b>Sonraki bölgeye uç</b> düğmesine bas';
      } else if (all) {
        this.el.objTitle.textContent = 'Koordinatı gönder';
        const list = fields.map((f) => NAMES[f]);
        const text = `${list.slice(0, -1).join(', ')} ve ${list[list.length - 1]}`;
        this.el.objHint.innerHTML = `<kbd>P</kbd> ile Pad'i aç: ${text} seç`;
      } else {
        this.el.objTitle.textContent = `Bölgeyi keşfet (${found.size}/${total})`;
        this.el.objHint.innerHTML = 'Sarı <b>?</b> işaretlerine yürü, <kbd>E</kbd> ile incele';
      }
    }

    /** Kâşif adı ve portresi (karakter oluşturucudan) */
    setHero(appearance) {
      this.el.heroName.textContent = appearance.name;
      GS.CharacterRenderer.drawPortrait(this.el.heroPortrait, appearance);
    }

    /** Bölge numarası + kademe unvanı */
    setRegion(levelNumber, tierName) {
      this.el.location.textContent = `Bölge ${levelNumber}`;
      this.el.tier.textContent = tierName;
    }

    /** Hava kartı: olay yoksa gizli */
    setWeather(weather) {
      const el = this.el.weather;
      if (!weather || weather.key === 'clear') {
        el.classList.add('hidden');
        return;
      }
      const fx = [];
      if (weather.hydration !== 1) fx.push(`💧 ×${String(weather.hydration).replace('.', ',')}`);
      if (weather.temp !== 1) fx.push(`🌡️ ×${String(weather.temp).replace('.', ',')}`);
      el.innerHTML = `<b>${weather.icon} ${weather.label}</b><span>${fx.join(' ') || 'görüş azaldı'}</span>`;
      el.title = weather.why;
      el.classList.remove('hidden');
    }

    /** Yeni kademe açıldığında ortada beliren afiş */
    showUnlock({ icon, title, text }) {
      const el = this.el.unlock;
      el.innerHTML = `<span class="unlock-icon">${icon}</span><div><b>${title}</b><p>${text}</p></div>`;
      el.classList.remove('hidden', 'leave');
      clearTimeout(this._unlockTimer);
      this._unlockTimer = setTimeout(() => el.classList.add('leave'), 4800);
      this._unlockTimer2 = setTimeout(() => el.classList.add('hidden'), 5400);
    }

    setMuted(muted) {
      this.el.muteIcon.textContent = muted ? '🔇' : '🔊';
      this.el.muteBtn.classList.toggle('off', muted);
    }

    setFullscreen(on) {
      this.el.fullIcon.textContent = on ? '🗗' : '⛶';
    }

    /** @param {'info'|'success'|'danger'} kind */
    toast(message, kind = 'info') {
      const t = this.doc.createElement('div');
      t.className = `toast toast-${kind}`;
      t.textContent = message;
      this.el.toasts.appendChild(t);
      while (this.el.toasts.children.length > 3) this.el.toasts.firstChild.remove();
      setTimeout(() => t.classList.add('fade'), 2800);
      setTimeout(() => t.remove(), 3400);
    }

    /** Bölgeler arası uçuş perdesi */
    showTravel() {
      const t = this.el.travel;
      t.classList.remove('hidden');
      // Animasyonu yeniden başlat
      const plane = t.querySelector('.travel-plane');
      plane.style.animation = 'none';
      void plane.offsetWidth;
      plane.style.animation = '';
    }

    hideTravel() {
      this.el.travel.classList.add('hidden');
    }

    showGameOver({ escaped, day, minutes, seconds, score, stars, best, newBest }) {
      this.el.gameOverStats.innerHTML =
        `<b>${escaped}</b> bölgeden kurtuldun, <b>${minutes} dk ${seconds} sn</b> hayatta kaldın (${day}. gün).<br>` +
        `Puan: <b>${score.toLocaleString('tr-TR')}</b> · ⭐ ${stars}<br>` +
        (newBest ? '<span class="new-best">Yeni rekor!</span>' : `En iyi puanın: ${best.toLocaleString('tr-TR')}`);
      this.el.gameOver.classList.remove('hidden');
      this.doc.getElementById('btn-restart').focus();
    }

    destroy() {
      this._listeners.forEach(([el, fn]) => el.removeEventListener('click', fn));
      this._listeners = [];
      this.el.gameOver.classList.add('hidden');
      this.el.travel.classList.add('hidden');
      this.el.unlock.classList.add('hidden');
      this.el.weather.classList.add('hidden');
      clearTimeout(this._unlockTimer);
      clearTimeout(this._unlockTimer2);
      this.el.toasts.innerHTML = '';
      this.el.root.classList.remove('penalized');
      ['--cold', '--dry', '--hurt'].forEach((v) => this.el.vignette.style.setProperty(v, 0));
    }

    // ------------------------------------------------------------------ //
    _meter(stat, value, label, critical) {
      const m = this.el.meters[stat];
      const width = `${value.toFixed(1)}%`;
      if (this._last[`${stat}w`] !== width) {
        m.fill.style.width = width;
        this._last[`${stat}w`] = width;
      }
      this._toggle(m.row, 'critical', value <= critical);
      if (this._last[stat] !== label) {
        m.value.textContent = label;
        this._last[stat] = label;
      }
    }

    _text(key, value) {
      if (this._last[key] === value) return;
      this.el[key].textContent = value;
      this._last[key] = value;
    }

    _toggle(el, cls, on) {
      if (el.classList.contains(cls) !== on) el.classList.toggle(cls, on);
    }

    _css(name, value) {
      if (this._last[name] === value) return;
      this.el.vignette.style.setProperty(name, value);
      this._last[name] = value;
    }
  }

  GS.HUD = HUD;
})(window.GS = window.GS || {});
