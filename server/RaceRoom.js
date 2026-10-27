/**
 * ============================================================================
 *  GeoStrand — Yarış Odası (RaceRoom)
 * ============================================================================
 *  Bir yarışın tüm kuralları burada, SUNUCUDA işler. Oyuncunun tarayıcısı
 *  yalnızca tahminini gönderir; doğru mu, kaç saniyede bildi, kaç puan aldı
 *  kararını sunucu verir. Böylece saatini ileri alan ya da sahte "bildim"
 *  mesajı yollayan biri puan kazanamaz.
 *
 *  AŞAMALAR
 *    lobby → (geri sayım + tur) playing → roundEnd → playing → … → gameOver
 *
 *  ODA TÜRLERİ
 *    Özel oda   : 4 harfli kodla katılınır; kurucu ayarları seçer ve başlatır.
 *    Hızlı oda  : dünyanın her yerinden rastgele oyuncular (Matchmaker kurar).
 *                 2. oyuncu gelince 20 sn sonra kendiliğinden başlar; 8 kişi
 *                 olursa hemen. Tek başına 25 sn bekleyen "Yalnız başla" diyebilir.
 *
 *  Oyunla AYNI mantık dosyalarını kullanır (konumlar, değerlendirici, kademeler):
 *  "doğru cevap" kararı sunucuda ve oyunda hiçbir zaman farklılaşmaz.
 *
 *  Test edilebilirlik: saat (now/setTimeout) ve yayın (emit) dışarıdan verilir.
 * ============================================================================
 */
'use strict';

const { CONFIG } = require('../js/core/Config.js');
const { LOCATIONS } = require('../js/data/locations.js');
const { CLIMATES, HEMISPHERES } = require('../js/data/climates.js');
const { LANDFORMS, CONTINENTS } = require('../js/data/landforms.js');
const { CLIMATE_WEATHER } = require('../js/data/weather.js');
const { PredictionEvaluator } = require('../js/logic/PredictionEvaluator.js');
const { LocationManager } = require('../js/logic/LocationManager.js');
const { WeatherPicker } = require('../js/logic/Progression.js');

const R = CONFIG.RACE;
const TIERS = CONFIG.PROGRESSION.tiers;
const DIFFICULTY_TIER = { easy: 0, medium: 1, hard: 2 };

const defaultClock = {
  now: () => Date.now(),
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  clearTimeout: (id) => clearTimeout(id),
};

/** Oyuncu adını temizle: kontrol karakterleri yok, en fazla 14 harf */
function cleanName(name) {
  const s = String(name || '').replace(/[\u0000-\u001f\u007f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 14);
  return s || 'Kâşif';
}

/** Görünüm: yalnızca bilinen alanlar, kısa metinler (karakter çizicisi gerisini düzeltir) */
function cleanAppearance(a) {
  const out = {};
  if (a && typeof a === 'object') {
    ['skin', 'hairStyle', 'hairColor', 'hat', 'jacket', 'pack'].forEach((k) => {
      if (typeof a[k] === 'string' && a[k].length <= 20 && /^[#\w-]+$/.test(a[k])) out[k] = a[k];
    });
  }
  return out;
}

class RaceRoom {
  /**
   * @param {{code:string, isPublic?:boolean, emit:Function, clock?:object, rng?:Function, onClosed?:Function}} opts
   *   emit(event, payload, toPlayerId?) — toPlayerId yoksa odadaki herkese
   */
  constructor({ code, isPublic = false, emit, clock = defaultClock, rng = Math.random, onClosed }) {
    this.code = code;
    this.isPublic = isPublic;
    this.emit = emit;
    this.clock = clock;
    this.rng = rng;
    this.onClosed = onClosed;
    this.players = new Map();     // id → oyuncu
    this.hostId = null;
    this.phase = 'lobby';
    this.round = null;
    this.timers = {};
    this.closed = false;
    this._nextId = 1;
    this.createdAt = clock.now();
    this.evaluator = new PredictionEvaluator({ latitudeTolerance: CONFIG.PREDICTION.latitudeTolerance, climates: CLIMATES });
    this.settings = isPublic
      ? { rounds: R.quick.rounds, roundTime: R.quick.roundTime, difficulty: R.quick.difficulty }
      : { ...R.defaults };
  }

  get maxPlayers() {
    return this.isPublic ? R.quick.maxPlayers : R.maxPlayers;
  }

  get connectedCount() {
    let n = 0;
    this.players.forEach((p) => { if (p.connected) n += 1; });
    return n;
  }

  /** Hızlı eşleşme bu odaya yeni oyuncu koyabilir mi? */
  get acceptsQuickPlayers() {
    return this.isPublic && !this.closed && this.phase === 'lobby' && this.players.size < this.maxPlayers;
  }

  // ================================================================== //
  //  Oyuncular
  // ================================================================== //

  /** @returns {{player?:object, error?:string}} */
  addPlayer({ name, appearance }) {
    if (this.closed) return { error: 'Bu oda kapandı.' };
    if (this.players.size >= this.maxPlayers) return { error: 'Oda dolu.' };
    if (this.phase !== 'lobby' && this.phase !== 'gameOver') return { error: 'Bu odada yarış sürüyor. Bitince tekrar dene.' };
    const id = `p${this._nextId++}`;
    const player = {
      id,
      token: randomToken(),
      name: this._uniqueName(cleanName(name)),
      appearance: cleanAppearance(appearance),
      connected: true,
      score: 0,
      joinedAt: this.clock.now(),
      ...emptyRoundState(),
    };
    this.players.set(id, player);
    if (!this.hostId) this.hostId = id;
    this._afterMembershipChange();
    return { player };
  }

  /** Aynı oturumla geri dönen oyuncu (sayfa yenilendi / bağlantı koptu) */
  rejoin(token) {
    const p = [...this.players.values()].find((x) => x.token === token);
    if (!p || this.closed) return null;
    p.connected = true;
    this._clearTimer(`drop:${p.id}`);
    this._cancelCleanup();
    if (this.isPublic && this.phase === 'lobby') this._updateAutoStart();
    if (!this.players.get(this.hostId) || !this.players.get(this.hostId).connected) this.hostId = p.id;
    this.broadcastState();
    return p;
  }

  disconnect(id) {
    const p = this.players.get(id);
    if (!p) return;
    p.connected = false;
    // Lobideyken kopan oyuncuya 15 sn tanınır (sayfayı yenileyen geri dönebilir), sonra çıkarılır.
    // Yarıştaysa puanı korunur, oda kapanana kadar geri dönebilir.
    if (this.phase === 'lobby') {
      this._setTimer(`drop:${id}`, 15000, () => {
        const q = this.players.get(id);
        if (q && !q.connected && this.phase === 'lobby') this.leave(id);
      });
    }
    this._afterMembershipChange();
    if (this.phase === 'playing') this._maybeEndEarly();
  }

  leave(id) {
    if (!this.players.has(id)) return;
    this.players.delete(id);
    this._afterMembershipChange();
    if (this.phase === 'playing') this._maybeEndEarly();
  }

  _afterMembershipChange() {
    // Kurucu ayrıldıysa bağlı ilk oyuncu kurucu olur
    const host = this.players.get(this.hostId);
    if (!host || !host.connected) {
      const next = [...this.players.values()].find((p) => p.connected);
      this.hostId = next ? next.id : null;
    }
    if (this.connectedCount === 0) {
      this._scheduleCleanup();
      this._clearTimer('autoStart');
      return;
    }
    this._cancelCleanup();
    if (this.isPublic && this.phase === 'lobby') this._updateAutoStart();
    this.broadcastState();
  }

  /** Kimse kalmadıysa (60 sn içinde dönen olmazsa) oda kapanır */
  _scheduleCleanup() {
    if (this.timers.cleanup) return;
    this._setTimer('cleanup', 60000, () => this.close());
  }

  _cancelCleanup() {
    this._clearTimer('cleanup');
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    Object.keys(this.timers).forEach((k) => this._clearTimer(k));
    if (this.onClosed) this.onClosed(this);
  }

  _uniqueName(name) {
    const taken = new Set([...this.players.values()].map((p) => p.name.toLocaleLowerCase('tr')));
    if (!taken.has(name.toLocaleLowerCase('tr'))) return name;
    for (let i = 2; i < 100; i++) {
      const candidate = `${name.slice(0, 11)} ${i}`;
      if (!taken.has(candidate.toLocaleLowerCase('tr'))) return candidate;
    }
    return `${name.slice(0, 8)} ${randomToken().slice(0, 4)}`;
  }

  // ================================================================== //
  //  Ayarlar ve başlatma
  // ================================================================== //

  updateSettings(id, s) {
    if (this.isPublic) return { error: 'Hızlı eşleşmede ayarlar sabittir.' };
    if (id !== this.hostId) return { error: 'Ayarları yalnızca kurucu değiştirebilir.' };
    if (this.phase !== 'lobby' && this.phase !== 'gameOver') return { error: 'Yarış sürerken ayar değişmez.' };
    const O = R.options;
    const next = { ...this.settings };
    if (s && O.rounds.includes(Number(s.rounds))) next.rounds = Number(s.rounds);
    if (s && O.roundTime.includes(Number(s.roundTime))) next.roundTime = Number(s.roundTime);
    if (s && O.difficulty.some((d) => d.key === s.difficulty)) next.difficulty = s.difficulty;
    this.settings = next;
    this.broadcastState();
    return { ok: true };
  }

  /** @returns {{ok?:boolean, error?:string}} */
  start(id) {
    if (this.phase !== 'lobby' && this.phase !== 'gameOver') return { error: 'Yarış zaten başladı.' };
    if (this.connectedCount === 0) return { error: 'Odada kimse yok.' };
    if (this.isPublic) {
      // Hızlı odada kendiliğinden başlar; yalnız bekleyen biri sabrı tükenince başlatabilir
      if (!this._canStartAlone()) return { error: 'Rakipler aranıyor, biraz bekle.' };
    } else if (id !== this.hostId) {
      return { error: 'Yarışı yalnızca kurucu başlatabilir.' };
    }
    this._startGame();
    return { ok: true };
  }

  _canStartAlone() {
    return this.isPublic && this.connectedCount === 1 && this.clock.now() - this._aloneSince() >= R.quick.aloneAfterMs;
  }

  _aloneSince() {
    let t = 0;
    this.players.forEach((p) => { if (p.connected) t = Math.max(t, p.joinedAt); });
    return t;
  }

  /** Hızlı oda: 2+ kişi → 20 sn sonra başla; dolunca hemen */
  _updateAutoStart() {
    const n = this.connectedCount;
    if (n >= this.maxPlayers) {
      this._clearTimer('autoStart');
      this._startGame();
      return;
    }
    if (n >= 2 && !this.timers.autoStart) {
      this.autoStartAt = this.clock.now() + R.quick.startAfterMs;
      this._setTimer('autoStart', R.quick.startAfterMs, () => {
        if (this.phase === 'lobby' && this.connectedCount >= 1) this._startGame();
      });
    } else if (n < 2) {
      this._clearTimer('autoStart');
      this.autoStartAt = null;
    }
  }

  _startGame() {
    this._clearTimer('autoStart');
    this.autoStartAt = null;
    this.players.forEach((p) => {
      p.score = 0;
      Object.assign(p, emptyRoundState());
    });
    // Ayrılmış (bağlantısı kopmuş) oyuncuları yeni yarışa taşıma
    [...this.players.values()].filter((p) => !p.connected).forEach((p) => this.players.delete(p.id));
    this.locations = new LocationManager(LOCATIONS, this.rng);
    this.roundIndex = 0;
    this.emit('game:starting', { code: this.code });
    this._nextRound();
  }

  // ================================================================== //
  //  Turlar
  // ================================================================== //

  _tierFor(index) {
    const d = this.settings.difficulty;
    if (d in DIFFICULTY_TIER) return DIFFICULTY_TIER[d];
    // Kademeli: 1–2. tur çaylak, 3–4. tur araştırmacı, 5+ usta (kısa yarışlarda daha erken)
    const total = this.settings.rounds;
    if (total <= 3) return Math.min(2, index - 1);
    return index <= 2 ? 0 : index <= 4 ? 1 : 2;
  }

  _nextRound() {
    this.roundIndex += 1;
    const location = this.locations.next();
    const tierIndex = this._tierFor(this.roundIndex);
    const tier = TIERS[tierIndex];
    const weather = WeatherPicker.pick(location.climate, tier.weatherChance, CLIMATE_WEATHER, this.rng);
    const now = this.clock.now();
    const durationMs = this.settings.roundTime * 1000;
    this.round = {
      index: this.roundIndex,
      total: this.settings.rounds,
      location,
      tierIndex,
      weather,
      seed: Math.floor(this.rng() * 0xffffffff) >>> 0,
      startAt: now + R.countdownMs,
      endAt: now + R.countdownMs + durationMs,
      durationMs,
      solvedCount: 0,
    };
    this.players.forEach((p) => Object.assign(p, emptyRoundState()));
    this.phase = 'playing';
    this.emit('round:start', this.roundPayload());
    this.broadcastState();
    this._setTimer('roundEnd', R.countdownMs + durationMs, () => this._endRound('time'));
  }

  /** Tur bilgisi (sonradan katılana/yeniden bağlanana da gönderilir) */
  roundPayload() {
    const r = this.round;
    const now = this.clock.now();
    return {
      index: r.index,
      total: r.total,
      locationId: r.location.id,
      tierIndex: r.tierIndex,
      weather: r.weather,
      seed: r.seed,
      countdownMs: Math.max(0, r.startAt - now),      // mutlak saat değil SÜRE: herkesin saati farklı olabilir
      playMs: Math.max(0, r.endAt - Math.max(now, r.startAt)),
      durationMs: r.durationMs,
    };
  }

  /**
   * Tahmin. Kararı sunucu verir.
   * @returns {object} ack: {ok, correct?, result?, rank?, timeMs?, points?, lockMs?, missing?, error?}
   */
  submitGuess(id, guess) {
    const p = this.players.get(id);
    const r = this.round;
    if (!p || this.phase !== 'playing' || !r) return { error: 'Şu an tahmin yapılamaz.' };
    const now = this.clock.now();
    if (now < r.startAt) return { error: 'Tur henüz başlamadı.' };
    if (p.solved) return { error: 'Bu turu zaten bildin.' };
    if (now < p.lockUntil) return { ok: true, locked: true, lockMs: p.lockUntil - now };

    const tier = TIERS[r.tierIndex];
    const g = sanitizeGuess(guess);
    const missing = this.evaluator.validate(g, tier.fields);
    if (missing.length) return { ok: true, missing };

    const result = this.evaluator.evaluate(g, r.location, { fields: tier.fields, latitudeTolerance: tier.latitudeTolerance });
    if (!result.isCorrect) {
      p.wrongs += 1;
      p.lockUntil = now + R.lockMs;
      this.broadcastState();
      return { ok: true, correct: false, result: publicResult(result), lockMs: R.lockMs };
    }

    r.solvedCount += 1;
    p.solved = true;
    p.rank = r.solvedCount;
    p.timeMs = now - r.startAt;
    p.points = this.pointsFor(p.rank, p.wrongs);
    p.score += p.points;
    this.emit('player:solved', { id: p.id, name: p.name, rank: p.rank, timeMs: p.timeMs });
    this.broadcastState();
    this._maybeEndEarly();
    return { ok: true, correct: true, rank: p.rank, timeMs: p.timeMs, points: p.points };
  }

  pointsFor(rank, wrongs) {
    const base = R.rankPoints[rank - 1] ?? R.minPoints;
    return Math.max(R.floorPoints, base - wrongs * R.wrongPenalty);
  }

  /** Kaç ipucu buldu (sıralama tablosunda 🔍 2/4 olarak görünür) */
  progress(id, found) {
    const p = this.players.get(id);
    if (!p || this.phase !== 'playing') return;
    const n = Math.max(0, Math.min(5, Math.floor(Number(found) || 0)));
    if (n === p.found) return;
    p.found = n;
    this.broadcastState();
  }

  /** Bağlı herkes bildiyse turu bitir (kısa bir nefes payıyla) */
  _maybeEndEarly() {
    if (this.phase !== 'playing') return;
    const active = [...this.players.values()].filter((p) => p.connected);
    if (active.length && active.every((p) => p.solved)) {
      this._setTimer('roundEnd', 1500, () => this._endRound('all-solved'));
    } else if (!active.length) {
      this._setTimer('roundEnd', 1000, () => this._endRound('empty'));
    }
  }

  _endRound(reason) {
    if (this.phase !== 'playing') return;
    this._clearTimer('roundEnd');
    this.phase = 'roundEnd';
    const r = this.round;
    const loc = r.location;
    const last = r.index >= r.total;
    const results = [...this.players.values()]
      .map((p) => ({ id: p.id, name: p.name, solved: p.solved, rank: p.rank, timeMs: p.timeMs, wrongs: p.wrongs, points: p.points }))
      .sort((a, b) => (a.solved === b.solved ? (a.rank || 99) - (b.rank || 99) : a.solved ? -1 : 1));
    this.emit('round:end', {
      index: r.index,
      total: r.total,
      reason,
      last,
      nextInMs: last ? 2500 : R.betweenRoundsMs,
      reveal: {
        name: loc.name,
        latitude: loc.latitude,
        hemisphere: loc.hemisphere,
        hemisphereLabel: HEMISPHERES[loc.hemisphere].label,
        climate: CLIMATES[loc.climate].label,
        climateIcon: CLIMATES[loc.climate].icon,
        landform: LANDFORMS[loc.landform].label,
        elevation: loc.elevation,
        continent: CONTINENTS[loc.continent].label,
      },
      results,
      standings: this.standings(),
    });
    this.broadcastState();
    this._setTimer('next', last ? 2500 : R.betweenRoundsMs, () => (last ? this._gameOver() : this._nextRound()));
  }

  _gameOver() {
    this.phase = 'gameOver';
    this.round = null;
    this.emit('game:over', { standings: this.standings(), isPublic: this.isPublic });
    this.broadcastState();
    // Hızlı odalar tekrar kullanılmaz: oyuncular yeni eşleşme arar
    if (this.isPublic) this._setTimer('cleanup', 120000, () => this.close());
  }

  standings() {
    return [...this.players.values()]
      .map((p) => ({ id: p.id, name: p.name, score: p.score, appearance: p.appearance, connected: p.connected }))
      .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, 'tr'));
  }

  // ================================================================== //
  //  Durum yayını
  // ================================================================== //
  state() {
    const now = this.clock.now();
    return {
      code: this.code,
      isPublic: this.isPublic,
      phase: this.phase,
      hostId: this.hostId,
      settings: this.settings,
      maxPlayers: this.maxPlayers,
      round: this.round ? { index: this.round.index, total: this.round.total, tierIndex: this.round.tierIndex } : null,
      autoStartInMs: this.autoStartAt ? Math.max(0, this.autoStartAt - now) : null,
      aloneInMs: this.isPublic && this.connectedCount === 1
        ? Math.max(0, R.quick.aloneAfterMs - (now - this._aloneSince())) : null,
      players: [...this.players.values()].map((p) => ({
        id: p.id, name: p.name, appearance: p.appearance, connected: p.connected, score: p.score,
        solved: p.solved, rank: p.rank, found: p.found, wrongs: p.wrongs,
      })),
    };
  }

  broadcastState() {
    if (!this.closed) this.emit('room:state', this.state());
  }

  // ------------------------------------------------------------------ //
  _setTimer(name, ms, fn) {
    this._clearTimer(name);
    if (this.closed) return;           // kapanmış oda yeni iş kurmaz
    this.timers[name] = this.clock.setTimeout(() => {
      delete this.timers[name];
      fn();
    }, ms);
  }

  _clearTimer(name) {
    if (this.timers[name]) {
      this.clock.clearTimeout(this.timers[name]);
      delete this.timers[name];
    }
  }
}

function emptyRoundState() {
  return { solved: false, rank: null, timeMs: null, wrongs: 0, found: 0, lockUntil: 0, points: 0 };
}

/** Tarayıcıdan gelen tahmini yalnızca beklenen alanlar ve türlerle al */
function sanitizeGuess(g) {
  const s = (v) => (typeof v === 'string' && v.length <= 24 ? v : undefined);
  const lat = Number(g && g.latitude);
  return {
    hemisphere: s(g && g.hemisphere),
    climate: s(g && g.climate),
    latitude: Number.isFinite(lat) ? lat : undefined,
    landform: s(g && g.landform),
    continent: s(g && g.continent),
  };
}

/** Yanlış tahminde gönderilen geri bildirim: doğru cevabı ele vermez */
function publicResult(result) {
  return {
    correctCount: result.correctCount,
    total: result.total,
    isCorrect: false,
    feedback: result.feedback.map((f) => ({ field: f.field, label: f.label, ok: f.ok, hint: f.hint, direction: f.direction })),
  };
}

function randomToken() {
  return require('crypto').randomBytes(12).toString('hex');
}

module.exports = { RaceRoom, cleanName, cleanAppearance, sanitizeGuess };
