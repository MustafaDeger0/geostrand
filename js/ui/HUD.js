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
 *    Sağ alt   : Eylem çubuğu (Pad, ses, tam ekran, menü) — fareyle/dokunarak da kullanılır
 *                + telefonda büyük "İncele" düğmesi (yakında nesne varken)
 *    Tüm ekran : Hayati durum efektleri (değerler düştükçe güçlenir):
 *                  ❤️ Can düşük  → ekran kararır, renkler solar, kenarlar kızarır,
 *                                  kalp atışı gibi nabız (can azaldıkça hızlanır)
 *                  💧 Su düşük   → sıcak, kavruk sarı kenarlar, sepya ton
 *                  🌡️ Isı düşük  → buz mavisi kırağı kenarlar, soğuk ton
 *                + ortada ne yapılacağını söyleyen uyarı (dokununca eşyayı kullanır)
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
        penaltyX: $('hud-penalty-x'),
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
        alert: $('vital-alert'),
        interactBtn: $('act-interact'),
        interactLabel: $('act-interact-label'),
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
      this._on(this.el.interactBtn, () => bus.emit(E.UI_INTERACT));
      this._on(this.el.alert, () => {
        if (this._alertItem) bus.emit(E.UI_USE_ITEM, this._alertItem);
      });

      // Dokunmatik ↔ klavye geçişinde yönerge metinlerini yenile
      this._onDevice = () => {
        if (this._objective) this.setObjective(this._objective);
      };
      GS.Device.onChange(this._onDevice);
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
      this._text('penaltyX', String(s.decayMultiplier));

      this._text('clock', view.clock);
      this._text('phase', `${view.phase.icon} ${view.phase.label} · Gün ${view.day}`);
      this._text('water', String(view.inventory.water || 0));
      this._text('heat', String(view.inventory.heat || 0));
      this._toggle(this.el.waterBtn, 'empty', !view.inventory.water);
      this._toggle(this.el.heatBtn, 'empty', !view.inventory.heat);
      this._text('escaped', String(view.escaped));
      this._text('score', view.score.toLocaleString('tr-TR'));

      this._vitalFx(s, view.inventory);
    }

    /**
     * Hayati durum efektleri. Her biri 0 (yok) – 1 (en güçlü) arası bir değerdir
     * ve CSS değişkeni olarak sayfaya verilir; çizimi style.css yapar.
     *   Can 60'ın, su ve ısı 35'in altına inince efekt başlar.
     */
    _vitalFx(s, inv) {
      const level = (v, from) => Math.max(0, Math.min(1, (from - v) / from));
      const q = (x) => (Math.round(x * 20) / 20).toFixed(2); // 0,05 adım: gereksiz yeniden çizim olmasın
      const hurt = level(s.hp, 60);
      const dry = level(s.hydration, 35);
      const cold = level(s.bodyTemp, 35);
      this._css('--hurt', q(hurt));
      this._css('--dry', q(dry));
      this._css('--cold', q(cold));
      // Kalp atışı: can 35'in altında, azaldıkça hızlanır (1,2 sn → 0,5 sn)
      const beating = s.hp < 35 && s.hp > 0;
      this._toggle(this.el.vignette, 'beat', beating);
      if (beating) this._css('--beat', `${(0.5 + (s.hp / 35) * 0.7).toFixed(1)}s`);
      this._toggle(this.doc.body, 'fx-on', hurt > 0.02 || dry > 0.02 || cold > 0.02);

      // Çantadaki eşyayı öner (düğme parlar)
      this._toggle(this.el.waterBtn, 'suggest', s.hydration < 30 && inv.water > 0);
      this._toggle(this.el.heatBtn, 'suggest', s.bodyTemp < 30 && inv.heat > 0);

      // Ortadaki uyarı: en acil durum + ne yapmalı (dokununca önerilen eşya kullanılır)
      const say = (k, t) => GS.Device.say(k, t);
      const use = {
        water: say(' · Su Matarası kullan <kbd>1</kbd>', ' — dokun, su iç'),
        heat: say(' · Isı Paketi kullan <kbd>2</kbd>', ' — dokun, ısın'),
        none: ' · Doğru tahmin yap ya da 📦 sandık bul',
      };
      let msg = '';
      let item = null;
      let kind = '';
      if (s.hp > 0) {
        if (s.hydration <= 0 || s.bodyTemp <= 0) {
          kind = 'hurt';
          const both = s.hydration <= 0 && s.bodyTemp <= 0;
          msg = `❤️ ${both ? 'Su ve ısı bitti' : s.hydration <= 0 ? 'Su bitti' : 'Isı bitti'}, canın azalıyor!`;
          if (s.hydration <= 0 && inv.water) item = 'water';
          else if (s.bodyTemp <= 0 && inv.heat) item = 'heat';
        } else if (s.hydration < 25) {
          kind = 'dry';
          msg = '💧 Susuz kalıyorsun';
          if (inv.water) item = 'water';
        } else if (s.bodyTemp < 25) {
          kind = 'cold';
          msg = '🥶 Vücudun soğuyor';
          if (inv.heat) item = 'heat';
        } else if (s.hp < 35) {
          kind = 'hurt';
          msg = '❤️ Canın az · su ve ısı 50\'nin üstündeyken can yavaşça dolar';
        }
        if (kind && !(kind === 'hurt' && s.hydration > 0 && s.bodyTemp > 0)) msg += use[item || 'none'];
      }
      this._alertItem = item;
      if (this._last.alert !== msg) {
        this._last.alert = msg;
        this.el.alert.innerHTML = msg;
        this.el.alert.className = `vital-alert ${kind}${msg ? '' : ' hidden'}${item ? ' usable' : ''}`;
      }
    }

    // ================================================================== //
    //  Durum değişiklikleri
    // ================================================================== //

    /**
     * Görev göstergesi: oyuncuya sıradaki adımı söyler. İpucu listesi kademeye
     * göre 3–5 madde olur.
     * @param {{clueIds:string[], found:Set<string>, solved:boolean, fields:string[]}} state
     */
    setObjective(state) {
      this._objective = state;
      const { clueIds, found, solved, fields, solvedTitle, solvedHint } = state;
      const say = (k, t) => GS.Device.say(k, t);
      const T = GS.ClueFactory.TYPES;
      const total = clueIds.length;
      const all = found.size >= total;
      this.el.objItems.innerHTML = clueIds.map((id) =>
        `<li class="${found.has(id) ? 'done' : ''}"><span class="tick"></span>${T[id].icon} ${T[id].title}</li>`).join('');
      this.el.objective.classList.toggle('ready', all && !solved);
      this.el.objective.classList.toggle('solved', solved);

      const NAMES = { hemisphere: 'yarım küre', climate: 'iklim', latitude: 'enlem', landform: 'yer şekli', continent: 'kıta' };
      if (solved) {
        this.el.objTitle.textContent = solvedTitle || 'Kurtarma hazır';
        this.el.objHint.innerHTML = solvedHint || 'Pad\'de <b>Sonraki bölgeye uç</b> düğmesine bas';
      } else if (all) {
        this.el.objTitle.textContent = 'Koordinatı gönder';
        const list = fields.map((f) => NAMES[f]);
        const text = `${list.slice(0, -1).join(', ')} ve ${list[list.length - 1]}`;
        this.el.objHint.innerHTML = say(`<kbd>P</kbd> ile Pad'i aç: ${text} seç`, `🧭 Pad'e dokun: ${text} seç`);
      } else {
        this.el.objTitle.textContent = `Bölgeyi keşfet (${found.size}/${total})`;
        this.el.objHint.innerHTML = say(
          'Sarı <b>?</b> işaretlerine yürü, <kbd>E</kbd> ile incele',
          'Sarı <b>?</b> işaretine dokun ya da kaydırarak yürü');
      }
    }

    /**
     * Sandık ganimeti: ortada büyük kart (ne çıktı, ne işe yarar, nasıl kullanılır),
     * 1,9 sn sonra simge çantadaki yuvasına uçar ve yuva zıplar.
     * Art arda açılırsa sıraya girer.
     */
    showLoot(loot) {
      this._lootQueue = this._lootQueue || [];
      this._lootQueue.push(loot);
      if (!this._lootBusy) this._nextLoot();
    }

    _nextLoot() {
      const loot = this._lootQueue.shift();
      if (!loot) {
        this._lootBusy = false;
        return;
      }
      this._lootBusy = true;
      const $ = (id) => this.doc.getElementById(id);
      const root = $('loot');
      $('loot-icon').textContent = loot.icon;
      $('loot-name').textContent = loot.label;
      $('loot-effect').textContent = `${loot.effect} · çantada ${loot.count} adet`;
      $('loot-how').innerHTML = GS.Device.say(`Kullanmak için <kbd>${loot.key}</kbd>`, `Kullanmak için ${loot.icon} yuvasına dokun`);
      root.className = `loot-${loot.type}`;
      void root.offsetWidth; // animasyonu yeniden başlat

      const slot = loot.type === 'water' ? this.el.waterBtn : this.el.heatBtn;
      this._lootTimers = [
        setTimeout(() => {
          // Simge ortadan çantadaki yuvaya uçar
          const from = $('loot-icon').getBoundingClientRect();
          const to = slot.getBoundingClientRect();
          const fly = this.doc.createElement('div');
          fly.className = 'loot-fly';
          fly.textContent = loot.icon;
          fly.style.left = `${from.left + from.width / 2}px`;
          fly.style.top = `${from.top + from.height / 2}px`;
          this.doc.body.appendChild(fly);
          root.classList.add('leave');
          requestAnimationFrame(() => {
            fly.style.transform = `translate(${to.left + to.width / 2 - (from.left + from.width / 2)}px, ${to.top + to.height / 2 - (from.top + from.height / 2)}px) scale(0.45)`;
          });
          this._lootTimers.push(setTimeout(() => {
            fly.remove();
            slot.classList.remove('bump');
            void slot.offsetWidth;
            slot.classList.add('bump');
          }, 650));
        }, 1900),
        setTimeout(() => {
          root.className = 'hidden';
          this._nextLoot();
        }, 2700),
      ];
    }

    /** Telefonda büyük "İncele" düğmesi: yakında nesne varken görünür */
    setInteractTarget(obj) {
      this.el.interactBtn.classList.toggle('show', !!obj);
      if (obj) this.el.interactLabel.textContent = obj.prompt;
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

    /** Bölge etiketini özel metinle değiştir (ör. "📅 Günlük 2/5") */
    setRegionLabel(text) {
      this.el.location.textContent = text;
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

    /**
     * Bölgeler arası uçuş perdesi: kurtulunan yer dünya haritasına bayrak olarak dikilir.
     * @param {{route:Array, final?:boolean, daily?:boolean}} opts
     */
    showTravel({ route = [], final = false } = {}) {
      const t = this.el.travel;
      const $ = (id) => this.doc.getElementById(id);
      const last = route[route.length - 1];
      if (last) {
        const loc = last.loc;
        const c = GS.CLIMATES[loc.climate];
        $('travel-kicker').textContent = `🚁 ${route.length}. kurtuluş${last.stars ? ` · ${'⭐'.repeat(last.stars)}` : ''}`;
        $('travel-place').textContent = GS.RouteMap.shortName(loc.name);
        $('travel-meta').textContent = `${loc.latitude}° ${loc.hemisphere === 'GUNEY' ? 'Güney' : 'Kuzey'} · ${c.icon} ${c.label} · ${GS.CONTINENTS[loc.continent].label}`;
      }
      $('travel-map').innerHTML = GS.RouteMap.svg({ route, animateLast: true });
      $('travel-next').textContent = final ? '🏁 Günün son bölgesi! Sonuçların hazırlanıyor…' : '…ama Geo-Teleporter yine sıçradı!';
      t.classList.remove('hidden');
    }

    hideTravel() {
      this.el.travel.classList.add('hidden');
    }

    showGameOver({ escaped, day, minutes, seconds, score, stars, best, newBest, route = [] }) {
      this.doc.getElementById('gameover-route').innerHTML = route.length
        ? `<h3>🗺️ Kaçış rotan</h3>${GS.RouteMap.svg({ route, labels: false, className: 'compact' })}`
        : '';
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
      (this._lootTimers || []).forEach(clearTimeout);
      this._lootQueue = [];
      this._lootBusy = false;
      this.doc.getElementById('loot').className = 'hidden';
      this.doc.querySelectorAll('.loot-fly').forEach((n) => n.remove());
      this.el.root.classList.remove('penalized');
      ['--cold', '--dry', '--hurt'].forEach((v) => this.doc.body.style.setProperty(v, 0));
      this.el.vignette.classList.remove('beat');
      this.doc.body.classList.remove('fx-on');
      this.el.alert.classList.add('hidden');
      this.el.interactBtn.classList.remove('show');
      GS.Device.offChange(this._onDevice);
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
      this.doc.body.style.setProperty(name, value);
      this._last[name] = value;
    }
  }

  GS.HUD = HUD;
})(window.GS = window.GS || {});
