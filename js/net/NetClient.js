/**
 * ============================================================================
 *  GeoStrand — Çevrim İçi Bağlantı (NetClient)
 * ============================================================================
 *  Oyunun sunucuyla konuştuğu tek yer. Socket.IO kullanır (WebSocket; olmazsa
 *  uzun yoklama). Oyun kuralı içermez: istekleri gönderir, sunucudan gelenleri
 *  dinleyenlere (Lobby, RaceScene, RaceHUD) dağıtır.
 *
 *  SUNUCU ADRESİ
 *    Varsayılan: oyunun açıldığı adres (Render'da oyun ve sunucu aynı yerde).
 *    Config.js → NET.serverUrl ya da adres çubuğunda ?sunucu=https://...
 *
 *  OTURUM: Oda kodu + gizli belirteç sekmede saklanır (sessionStorage).
 *  Bağlantı koparsa ya da sayfa yenilenirse aynı oyuncu olarak geri dönülür.
 *
 *  SAAT: Sunucu mutlak saat değil SÜRE gönderir ("tur 3 sn sonra başlıyor,
 *  120 sn sürecek"). Süreler mesajın geldiği anla birlikte saklanır; böylece
 *  oyuncuların bilgisayar saatleri farklı olsa da herkes aynı geri sayımı görür.
 * ============================================================================
 */
(function (GS) {
  'use strict';

  const SESSION_KEY = 'geostrand-net';
  const SERVER_EVENTS = ['room:state', 'game:starting', 'round:start', 'player:moved', 'player:solved', 'round:end', 'game:over', 'server:stats'];

  /**
   * Sunucu adresi ('' = oyunun açıldığı adres).
   * Mobil uygulamada ve dosyadan açılınca (sunucu aynı yerde olmadığı için) NET.appServerUrl.
   */
  function serverUrl() {
    const N = GS.CONFIG.NET;
    const param = new URLSearchParams(window.location.search).get('sunucu');
    let url = (param || N.serverUrl || '').trim();
    if (!url && (GS.Native && GS.Native.isApp || window.location.protocol === 'file:')) url = N.appServerUrl || '';
    url = url.replace(/\/+$/, '');
    return /^https?:\/\//.test(url) ? url : '';
  }

  class NetClient {
    /**
     * Socket.IO istemci betiğini sunucudan yükle.
     * @returns {Promise<void>} hata: Error('file') dosyadan açıldı | Error('server') sunucuya ulaşılamadı
     */
    static load() {
      if (window.io) return Promise.resolve();
      if (!serverUrl() && window.location.protocol === 'file:') return Promise.reject(new Error('file'));
      // İstemci kütüphanesi oyunun içinde (js/vendor): sunucu uyurken bile hemen yüklenir
      return new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'js/vendor/socket.io.min.js';
        s.onload = () => (window.io ? resolve() : reject(new Error('server')));
        s.onerror = () => {
          s.remove();
          reject(new Error('server'));
        };
        document.head.appendChild(s);
      });
    }

    constructor() {
      this.handlers = new Map();
      this.state = null;          // son oda durumu
      this.lastRound = null;      // son tur (+ geliş anı)
      this.session = loadSession();
      this.socket = window.io(serverUrl() || undefined, {
        transports: ['websocket', 'polling'],
        timeout: GS.CONFIG.NET.connectTimeoutMs,
        reconnectionDelay: 800,
        reconnectionDelayMax: 5000,
      });

      SERVER_EVENTS.forEach((ev) => this.socket.on(ev, (payload) => {
        if (ev === 'room:state') this.state = payload;
        if (ev === 'round:start') this.lastRound = { ...payload, receivedAt: performance.now() };
        if (ev === 'game:over' || ev === 'round:end') this.lastRound = ev === 'round:end' ? this.lastRound : null;
        this._emit(ev, payload);
      }));
      this.socket.on('connect', () => {
        this._emit('connect');
        // Kopup geri gelince aynı odaya aynı oyuncu olarak dön
        if (this.session && this._wasConnected) this.rejoin().catch(() => {});
        this._wasConnected = true;
      });
      this.socket.on('disconnect', () => this._emit('disconnect'));
      this.socket.on('connect_error', () => this._emit('connect_error'));
    }

    get connected() {
      return this.socket.connected;
    }

    get code() {
      return this.session ? this.session.code : null;
    }

    get playerId() {
      return this.session ? this.session.playerId : null;
    }

    get isPublic() {
      return !!(this.session && this.session.isPublic);
    }

    get isHost() {
      return !!(this.state && this.state.hostId === this.playerId);
    }

    /** Bağlantı kurulana kadar bekle (uyuyan ücretsiz sunucu 30-50 sn sürebilir) */
    whenConnected() {
      if (this.connected) return Promise.resolve();
      return new Promise((resolve, reject) => {
        const t = setTimeout(() => {
          off();
          reject(new Error('timeout'));
        }, GS.CONFIG.NET.connectTimeoutMs);
        const off = this.on('connect', () => {
          clearTimeout(t);
          off();
          resolve();
        });
      });
    }

    // ------------------------------------------------------------------ //
    //  Olay aboneliği
    // ------------------------------------------------------------------ //
    /** @returns {Function} aboneliği kaldıran fonksiyon */
    on(event, fn) {
      if (!this.handlers.has(event)) this.handlers.set(event, new Set());
      this.handlers.get(event).add(fn);
      return () => this.handlers.get(event).delete(fn);
    }

    _emit(event, payload) {
      (this.handlers.get(event) || []).forEach((fn) => {
        try {
          fn(payload);
        } catch (e) {
          console.error(e); // bir dinleyicinin hatası diğerlerini durdurmasın
        }
      });
    }

    /** Cevaplı istek (10 sn içinde cevap gelmezse hata) */
    call(event, payload = {}) {
      return new Promise((resolve) => {
        this.socket.timeout(10000).emit(event, payload, (err, res) => {
          resolve(err ? { error: 'Sunucu cevap vermedi. Bağlantını kontrol et.' } : res || { error: 'Boş cevap.' });
        });
      });
    }

    // ------------------------------------------------------------------ //
    //  Oda
    // ------------------------------------------------------------------ //
    quickJoin(hero) {
      return this._enter('quick:join', { name: hero.name, appearance: strip(hero) });
    }

    createRoom(hero) {
      return this._enter('room:create', { name: hero.name, appearance: strip(hero) });
    }

    joinRoom(code, hero) {
      return this._enter('room:join', { code, name: hero.name, appearance: strip(hero) });
    }

    /** Kayıtlı oturumla geri dön */
    async rejoin() {
      if (!this.session) return { error: 'Oturum yok.' };
      const res = await this.call('room:rejoin', { code: this.session.code, token: this.session.token });
      if (res.error) this._setSession(null);
      return res;
    }

    async _enter(event, payload) {
      // Eski oda bilgisi temizlenir. (Sunucu yeni odanın durumunu cevaptan ÖNCE gönderir,
      // bu yüzden temizlik isteği göndermeden önce yapılmalı.)
      this.state = null;
      this.lastRound = null;
      const res = await this.call(event, payload);
      if (res.ok) {
        this._setSession({ code: res.code, token: res.token, playerId: res.playerId, isPublic: res.isPublic });
      }
      return res;
    }

    setSettings(settings) {
      return this.call('room:settings', settings);
    }

    start() {
      return this.call('game:start');
    }

    leave() {
      this._setSession(null);
      this.state = null;
      this.lastRound = null;
      return this.call('room:leave');
    }

    // ------------------------------------------------------------------ //
    //  Yarış
    // ------------------------------------------------------------------ //
    submitGuess(guess) {
      return this.call('guess:submit', { guess });
    }

    /** Konum paylaş (kaybolabilir mesaj: geç kalan konum zaten eskimiştir) */
    move(x, y, f, m) {
      if (this.connected) this.socket.volatile.emit('player:move', { x, y, f, m });
    }

    progress(found) {
      if (this.connected) this.socket.emit('player:progress', { found });
    }

    /** Şu anki turun kalan süreleri (ms) */
    roundTiming() {
      const r = this.lastRound;
      if (!r) return null;
      const elapsed = performance.now() - r.receivedAt;
      return {
        countdownLeft: Math.max(0, r.countdownMs - elapsed),
        playLeft: Math.max(0, r.playMs - Math.max(0, elapsed - r.countdownMs)),
      };
    }

    _setSession(s) {
      this.session = s;
      try {
        if (s) sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
        else sessionStorage.removeItem(SESSION_KEY);
      } catch (e) {
        /* depolama kapalı: yalnızca bu sayfa açıkken hatırlanır */
      }
    }
  }

  function loadSession() {
    try {
      const s = JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null');
      return s && s.code && s.token ? s : null;
    } catch (e) {
      return null;
    }
  }

  /** Sunucuya yalnızca görünüm alanları gider */
  function strip(hero) {
    const { skin, hairStyle, hairColor, hat, jacket, pack } = hero || {};
    return { skin, hairStyle, hairColor, hat, jacket, pack };
  }

  NetClient.hasSession = () => !!loadSession();
  /** Sunucu adresi ('' = oyunun açıldığı adres). Günlük sıralama (HTTP) da bunu kullanır. */
  NetClient.serverUrl = serverUrl;
  GS.NetClient = NetClient;
})(window.GS = window.GS || {});
