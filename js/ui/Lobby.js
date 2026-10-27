/**
 * ============================================================================
 *  GeoStrand — Çevrim İçi Lobi (Lobby)
 * ============================================================================
 *  Üç görünüm:
 *    1) Seç   : ⚡ Hızlı eşleşme · 🏠 Oda kur · 🔑 Odaya katıl
 *               + "🌍 Şu an X kâşif çevrim içi"
 *    2) Eşleşme: dünyanın her yerinden rakipler aranır; gelenler portreleriyle
 *               listelenir. 2. kişi gelince 20 sn geri sayım, 8 kişi olunca hemen.
 *               Tek başına 25 sn bekleyen "Yalnız başla" diyebilir.
 *    3) Oda   : büyük oda kodu + paylaşılabilir bağlantı, oyuncular, kurucu için
 *               ayarlar (tur sayısı, süre, zorluk) ve "Yarışı başlat"
 *
 *  Paylaşılan bağlantı (…/?oda=KPZT) açılınca kod kendiliğinden yazılır.
 *  Sunucu "game:starting" yollayınca onStart çağrılır (main.js yarışı açar).
 *  Oyuncu adları her zaman metin olarak yazılır (HTML olarak değil).
 * ============================================================================
 */
(function (GS) {
  'use strict';

  class Lobby {
    /** @param {Document} doc @param {{onStart:Function}} opts */
    constructor(doc, { onStart }) {
      this.doc = doc;
      this.onStart = onStart;
      this.isOpen = false;
      const $ = (id) => doc.getElementById(id);
      this.el = {
        root: $('lobby'),
        close: $('lobby-close'),
        status: $('lobby-status'),
        error: $('lobby-error'),
        choose: $('lobby-choose'),
        quick: $('lobby-quick'),
        room: $('lobby-room'),
        heroCanvas: $('lobby-hero'),
        heroName: $('lobby-hero-name'),
        heroEdit: $('lobby-hero-edit'),
        online: $('lobby-online'),
        quickBtn: $('lobby-quick-btn'),
        create: $('lobby-create'),
        joinCode: $('lobby-code'),
        join: $('lobby-join'),
        // hızlı eşleşme
        quickTitle: $('quick-title'),
        quickInfo: $('quick-info'),
        quickPlayers: $('quick-players'),
        quickAlone: $('quick-alone'),
        quickCancel: $('quick-cancel'),
        // oda
        code: $('lobby-room-code'),
        link: $('lobby-link'),
        copy: $('lobby-copy'),
        players: $('lobby-players'),
        count: $('lobby-count'),
        settings: $('lobby-settings'),
        rounds: $('set-rounds'),
        time: $('set-time'),
        difficulty: $('set-difficulty'),
        start: $('lobby-start'),
        wait: $('lobby-wait'),
        leave: $('lobby-leave'),
      };
      this._buildSettings();
      this._bind();

      // Bağlantıyla gelindiyse kodu doldur
      const code = new URLSearchParams(window.location.search).get('oda');
      if (code) this.el.joinCode.value = code.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);
    }

    get pendingCode() {
      return this.el.joinCode.value.trim().length === 4;
    }

    /** Ağ hazırlandıktan sonra bir kez çağrılır */
    attach(net) {
      this.net = net;
      net.on('room:state', (s) => this._renderState(s));
      net.on('game:starting', () => {
        this.close();
        this.onStart();
      });
      net.on('disconnect', () => this._status('📡 Bağlantı koptu, yeniden bağlanılıyor…', 'warn'));
      net.on('connect', () => this._status(''));
    }

    /** Lobiyi aç: bağlan, varsa eski oturuma dön, yoksa seçim ekranı */
    async open({ quickMatch = false } = {}) {
      this.isOpen = true;
      this.el.root.classList.remove('hidden');
      this._renderHero();
      this._error('');
      this._view('choose');
      this._setBusy(true);
      if (!this.net.connected) {
        this._status('Sunucuya bağlanılıyor…');
        const slow = setTimeout(() => this._status('Sunucu uyanıyor… Ücretsiz sunucuda ilk açılış 30-50 sn sürebilir.', 'warn'), 4000);
        try {
          await this.net.whenConnected();
        } catch (e) {
          clearTimeout(slow);
          this._status('');
          this._error('Sunucuya ulaşılamadı. İnternet bağlantını kontrol edip tekrar dene.');
          this._setBusy(false);
          return;
        }
        clearTimeout(slow);
        this._status('');
      }
      this._setBusy(false);
      this._refreshStats();
      // Sayfa yenilendiyse aynı odaya dön
      if (this.net.session) {
        const res = await this.net.rejoin();
        if (res.ok) {
          this._view(res.isPublic ? 'quick' : 'room');
          return;
        }
      }
      if (quickMatch) this._quick();
    }

    /** Oyun sonundan "Lobi ve ayarlar" */
    showRoom() {
      this.isOpen = true;
      this.el.root.classList.remove('hidden');
      this._view('room');
      if (this.net.state) this._renderState(this.net.state);
    }

    close() {
      this.isOpen = false;
      this.el.root.classList.add('hidden');
      clearInterval(this._countTimer);
      clearInterval(this._statsTimer);
    }

    toast(text) {
      this._error(text);
    }

    // ------------------------------------------------------------------ //
    _view(name) {
      this.view = name;
      ['choose', 'quick', 'room'].forEach((v) => this.el[v].classList.toggle('hidden', v !== name));
      this.el.close.classList.toggle('hidden', name !== 'choose');
      clearInterval(this._statsTimer);
      if (name === 'choose') {
        (this.pendingCode ? this.el.join : this.el.quickBtn).focus();
        this._statsTimer = setInterval(() => this._refreshStats(), 10000);
      }
    }

    _status(text, kind = '') {
      this.el.status.textContent = text;
      this.el.status.className = `lobby-status ${kind}${text ? '' : ' hidden'}`;
    }

    _error(text) {
      this.el.error.textContent = text;
      this.el.error.classList.toggle('hidden', !text);
    }

    _setBusy(busy) {
      [this.el.quickBtn, this.el.create, this.el.join].forEach((b) => (b.disabled = busy));
    }

    async _refreshStats() {
      if (!this.net || !this.net.connected) return;
      const s = await this.net.call('server:stats');
      if (s && typeof s.online === 'number') {
        this.el.online.textContent = `🌍 Şu an ${s.online} kâşif çevrim içi${s.racing ? ` · ${s.racing} yarışta` : ''}${s.waiting ? ` · ${s.waiting} rakip bekliyor` : ''}`;
      }
    }

    _renderHero() {
      const hero = GS.creator.current;
      GS.CharacterRenderer.drawPortrait(this.el.heroCanvas, hero);
      this.el.heroName.textContent = hero.name;
    }

    _buildSettings() {
      const O = GS.CONFIG.RACE.options;
      const opt = (value, label) => {
        const o = this.doc.createElement('option');
        o.value = value;
        o.textContent = label;
        return o;
      };
      O.rounds.forEach((n) => this.el.rounds.appendChild(opt(n, `${n} tur`)));
      O.roundTime.forEach((s) => this.el.time.appendChild(opt(s, `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')} dk`)));
      O.difficulty.forEach((d) => this.el.difficulty.appendChild(opt(d.key, d.label)));
    }

    _bind() {
      this.el.close.addEventListener('click', () => this.close());
      this.el.heroEdit.addEventListener('click', () => {
        GS.creator.open({ mode: 'edit', onSave: () => this._renderHero() });
      });
      this.el.quickBtn.addEventListener('click', () => this._quick());
      this.el.create.addEventListener('click', () => this._enter(() => this.net.createRoom(GS.creator.current), 'room'));
      this.el.join.addEventListener('click', () => {
        const code = this.el.joinCode.value.trim().toUpperCase();
        if (code.length !== 4) {
          this._error('Oda kodu 4 harf olmalı.');
          this.el.joinCode.focus();
          return;
        }
        this._enter(() => this.net.joinRoom(code, GS.creator.current), 'room');
      });
      this.el.joinCode.addEventListener('input', () => {
        this.el.joinCode.value = this.el.joinCode.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);
      });
      this.el.joinCode.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') this.el.join.click();
      });
      this.el.copy.addEventListener('click', () => {
        const text = this.el.link.value;
        const done = () => {
          this.el.copy.textContent = 'Kopyalandı ✓';
          setTimeout(() => { this.el.copy.textContent = 'Kopyala'; }, 1800);
        };
        if (navigator.share && GS.Device.touch) {
          navigator.share({ title: 'GeoStrand yarışı', text: `GeoStrand yarışına katıl! Oda kodu: ${this.net.code}`, url: text }).catch(() => {});
          return;
        }
        (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject())
          .then(done)
          .catch(() => {
            this.el.link.select();
            document.execCommand('copy');
            done();
          });
      });
      ['rounds', 'time', 'difficulty'].forEach((k) => {
        this.el[k].addEventListener('change', () => {
          this.net.setSettings({
            rounds: Number(this.el.rounds.value),
            roundTime: Number(this.el.time.value),
            difficulty: this.el.difficulty.value,
          });
        });
      });
      this.el.start.addEventListener('click', async () => {
        this.el.start.disabled = true;
        const res = await this.net.start();
        this.el.start.disabled = false;
        if (res.error) this._error(res.error);
      });
      this.el.quickAlone.addEventListener('click', async () => {
        const res = await this.net.start();
        if (res.error) this._error(res.error);
      });
      const leave = () => {
        this.net.leave();
        clearInterval(this._countTimer);
        this._view('choose');
        this._refreshStats();
      };
      this.el.leave.addEventListener('click', leave);
      this.el.quickCancel.addEventListener('click', leave);
    }

    _quick() {
      this._enter(() => this.net.quickJoin(GS.creator.current), 'quick');
    }

    async _enter(fn, view) {
      this._error('');
      this._setBusy(true);
      try {
        const res = await fn();
        if (!res.ok) {
          this._error(res.error || 'Odaya girilemedi.');
          return;
        }
        this._view(view);
        if (this.net.state) this._renderState(this.net.state);
      } finally {
        this._setBusy(false);
      }
    }

    // ------------------------------------------------------------------ //
    //  Durum
    // ------------------------------------------------------------------ //
    _renderState(s) {
      if (!this.net || !s || !this.isOpen) return;
      if (s.isPublic) this._renderQuick(s);
      else this._renderRoom(s);
    }

    _playerList(ul, s) {
      ul.textContent = '';
      s.players.forEach((p) => {
        const li = this.doc.createElement('li');
        if (p.id === this.net.playerId) li.classList.add('me');
        if (!p.connected) li.classList.add('off');
        const c = this.doc.createElement('canvas');
        c.width = c.height = 48;
        GS.CharacterRenderer.drawPortrait(c, GS.CharacterRenderer.normalize(p.appearance));
        const name = this.doc.createElement('span');
        name.textContent = p.name;
        if (p.id === s.hostId && !s.isPublic) {
          const crown = this.doc.createElement('i');
          crown.title = 'Kurucu';
          crown.textContent = ' 👑';
          name.appendChild(crown);
        }
        li.append(c, name);
        ul.appendChild(li);
      });
    }

    /** Hızlı eşleşme bekleme ekranı */
    _renderQuick(s) {
      if (this.view !== 'quick') this._view('quick');
      this._playerList(this.el.quickPlayers, s);
      const n = s.players.filter((p) => p.connected).length;
      const received = performance.now();
      clearInterval(this._countTimer);
      const tick = () => {
        const passed = performance.now() - received;
        if (s.autoStartInMs != null) {
          const left = Math.max(0, Math.ceil((s.autoStartInMs - passed) / 1000));
          this.el.quickTitle.textContent = 'Rakipler bulundu!';
          this.el.quickInfo.textContent = `${n}/${s.maxPlayers} kâşif · yarış ${left} sn sonra başlıyor`;
          this.el.quickAlone.classList.add('hidden');
        } else {
          this.el.quickTitle.textContent = 'Rakip aranıyor…';
          const aloneLeft = s.aloneInMs == null ? null : Math.max(0, Math.ceil((s.aloneInMs - passed) / 1000));
          this.el.quickInfo.textContent = aloneLeft
            ? `Dünyanın dört bir yanından kâşif bekleniyor… (${aloneLeft} sn sonra yalnız da başlayabilirsin)`
            : 'Henüz kimse gelmedi. Biraz daha bekleyebilir ya da yalnız başlayabilirsin.';
          this.el.quickAlone.classList.toggle('hidden', aloneLeft !== 0);
        }
      };
      tick();
      this._countTimer = setInterval(tick, 250);
    }

    /** Özel oda görünümü: kod, bağlantı, oyuncular, ayarlar */
    _renderRoom(s) {
      if (this.view !== 'room') return;
      const isHost = s.hostId === this.net.playerId;
      this.el.code.textContent = s.code;
      const url = new URL(window.location.href);
      url.search = '';
      url.searchParams.set('oda', s.code);
      const server = new URLSearchParams(window.location.search).get('sunucu');
      if (server) url.searchParams.set('sunucu', server);
      this.el.link.value = url.toString();
      this.el.count.textContent = `${s.players.filter((p) => p.connected).length}/${s.maxPlayers} kâşif`;
      this._playerList(this.el.players, s);
      this.el.rounds.value = String(s.settings.rounds);
      this.el.time.value = String(s.settings.roundTime);
      this.el.difficulty.value = s.settings.difficulty;
      this.el.settings.querySelectorAll('select').forEach((sel) => (sel.disabled = !isHost));
      const canStart = isHost && (s.phase === 'lobby' || s.phase === 'gameOver');
      this.el.start.classList.toggle('hidden', !isHost);
      this.el.start.disabled = !canStart;
      this.el.start.textContent = s.phase === 'gameOver' ? 'Yeniden yarış' : 'Yarışı başlat';
      this.el.wait.classList.toggle('hidden', isHost);
      this.el.wait.textContent = s.phase === 'lobby' || s.phase === 'gameOver'
        ? 'Kurucunun yarışı başlatması bekleniyor…'
        : 'Yarış sürüyor.';
    }
  }

  GS.Lobby = Lobby;
})(window.GS = window.GS || {});
