/**
 * ============================================================================
 *  GeoStrand — Günlük Meydan Okuma Sıralaması (sunucu)
 * ============================================================================
 *  HTTP uç noktaları (server.js yönlendirir):
 *    GET  /api/daily?date=YYYY-MM-DD&pid=…   → o günün ilk 20'si (+ senin yerin)
 *    POST /api/daily  {date, pid, name, score, solved, timeMs, wrongs, stars}
 *
 *  KURALLAR
 *    • Yalnızca bugün ve dün (Türkiye saati) kabul edilir
 *    • Her cihaz (pid) her gün YALNIZCA bir kez girer: ilk gönderim sayılır
 *    • Puan, o günün planında alınabilecek en yüksek puanı aşamaz (hile koruması)
 *    • Ad süzgeçten geçer (nameFilter), metin olarak saklanır
 *    • Sıralama: bitirilen bölge ↓, puan ↓, süre ↑
 *
 *  NOT: Kayıtlar bellekte tutulur. Ücretsiz sunucu uyuyup yeniden başlarsa
 *  o günün tablosu sıfırlanır (oyuncunun kendi sonucu cihazında kalır).
 * ============================================================================
 */
'use strict';

const { CONFIG } = require('../js/core/Config.js');
const { LOCATIONS } = require('../js/data/locations.js');
const { CLIMATE_WEATHER } = require('../js/data/weather.js');
const { Progression, WeatherPicker } = require('../js/logic/Progression.js');
const { Daily } = require('../js/logic/Daily.js');
const { safeName } = require('./nameFilter.js');

const TOP_N = 20;
const MAX_PER_DAY = 20000;
const PID_RE = /^[a-f0-9]{16,48}$/;

class DailyBoard {
  /** @param {{now?: () => Date}} [opts] testte saat sabitlenebilir */
  constructor({ now = () => new Date() } = {}) {
    this.now = now;
    this.days = new Map();      // tarih → Map(pid → kayıt)
    this.maxCache = new Map();  // tarih → en yüksek puan
  }

  /** Kabul edilen günler: bugün ve dün */
  allowedDates() {
    const today = Daily.dateKey(this.now());
    return [today, Daily.shiftKey(today, -1)];
  }

  maxScore(date) {
    if (!this.maxCache.has(date)) {
      const plan = Daily.plan(date, {
        locations: LOCATIONS, tiers: CONFIG.PROGRESSION.tiers, climateWeather: CLIMATE_WEATHER, Progression, WeatherPicker,
      });
      this.maxCache.set(date, Daily.maxScore(plan, CONFIG.SCORE));
      if (this.maxCache.size > 10) this.maxCache.delete(this.maxCache.keys().next().value);
    }
    return this.maxCache.get(date);
  }

  /**
   * @returns {{ok:true, ...board}|{ok:false, error:string}}
   */
  submit(body) {
    if (!body || typeof body !== 'object') return { ok: false, error: 'bad' };
    const { date, pid } = body;
    if (typeof date !== 'string' || !this.allowedDates().includes(date)) return { ok: false, error: 'date' };
    if (typeof pid !== 'string' || !PID_RE.test(pid)) return { ok: false, error: 'pid' };
    const solved = int(body.solved, 0, Daily.REGIONS);
    const score = int(body.score, 0, this.maxScore(date));
    const timeMs = int(body.timeMs, 0, 6 * 3600 * 1000);
    const wrongs = int(body.wrongs, 0, 999);
    if ([solved, score, timeMs, wrongs].includes(null)) return { ok: false, error: 'value' };

    this._prune();
    if (!this.days.has(date)) this.days.set(date, new Map());
    const day = this.days.get(date);
    if (!day.has(pid)) {
      if (day.size >= MAX_PER_DAY) return { ok: false, error: 'full' };
      day.set(pid, { pid, name: safeName(String(body.name || '')), score, solved, timeMs, wrongs, at: Date.now() });
    }
    return { ok: true, ...this.board(date, pid) };
  }

  /** Bir günün tablosu (ilk 20 + istenirse oyuncunun kendi satırı) */
  board(date, pid) {
    const day = this.days.get(date);
    const list = day ? [...day.values()].sort(compare) : [];
    const view = (e, i) => ({ rank: i + 1, name: e.name, score: e.score, solved: e.solved, timeMs: e.timeMs, me: e.pid === pid });
    const top = list.slice(0, TOP_N).map(view);
    const idx = pid ? list.findIndex((e) => e.pid === pid) : -1;
    return { date, count: list.length, top, me: idx >= 0 ? view(list[idx], idx) : null };
  }

  /** İki günden eski tabloları sil */
  _prune() {
    const keep = new Set(this.allowedDates());
    [...this.days.keys()].forEach((k) => {
      if (!keep.has(k)) this.days.delete(k);
    });
  }
}

function compare(a, b) {
  return b.solved - a.solved || b.score - a.score || a.timeMs - b.timeMs || a.at - b.at;
}

/** Tamsayı ve aralık denetimi; uymazsa null */
function int(v, min, max) {
  if (typeof v !== 'number' || !Number.isFinite(v)) return null;
  const n = Math.round(v);
  return n < min || n > max ? null : n;
}

module.exports = { DailyBoard };
