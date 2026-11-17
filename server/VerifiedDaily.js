'use strict';

// v2 is isolated from legacy mobile submissions: only server-evaluated runs rank here.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { DailyBoard } = require('./DailyBoard.js');
const { CONFIG } = require('../js/core/Config.js');
const { LOCATIONS } = require('../js/data/locations.js');
const { CLIMATE_WEATHER } = require('../js/data/weather.js');
const { Progression, WeatherPicker, ScoreKeeper } = require('../js/logic/Progression.js');
const { Daily } = require('../js/logic/Daily.js');
const { PredictionEvaluator } = require('../js/logic/PredictionEvaluator.js');
const { safeName } = require('./nameFilter.js');

class VerifiedDaily {
  constructor({ now = () => new Date(), file = null } = {}) {
    this.now = now;
    this.file = file;
    this.runs = new Map();
    this.board = new DailyBoard({ now });
    this.evaluator = new PredictionEvaluator({ latitudeTolerance: 7, climates: {} });
    if (file && fs.existsSync(file)) {
      // Fail visibly on corrupt storage, rather than silently losing player results.
      const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (saved.version !== 1 || !Array.isArray(saved.runs) || !Array.isArray(saved.days)) throw new Error('Invalid daily store');
      this.runs = new Map(saved.runs);
      this.board.days = new Map(saved.days.map(([date, entries]) => [date, new Map(entries)]));
    }
    this.prune();
  }

  prune() {
    const keep = new Set(this.board.allowedDates());
    this.board._prune();
    for (const [key, run] of this.runs) if (!keep.has(run.date)) this.runs.delete(key);
  }

  save() {
    if (!this.file) return;
    this.prune();
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    const data = { version: 1, runs: [...this.runs], days: [...this.board.days].map(([d, entries]) => [d, [...entries]]) };
    const tmp = this.file + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(data), { mode: 0o600 });
    fs.renameSync(tmp, this.file);
  }

  plan(date) {
    return Daily.plan(date, { locations: LOCATIONS, tiers: CONFIG.PROGRESSION.tiers,
      climateWeather: CLIMATE_WEATHER, Progression, WeatherPicker });
  }

  handle(body) {
    const before = this.file ? JSON.stringify({ runs: [...this.runs],
      days: [...this.board.days].map(([d, rows]) => [d, [...rows]]) }) : null;
    try { return this._handle(body); }
    catch (err) {
      if (before) {
        const previous = JSON.parse(before);
        this.runs = new Map(previous.runs);
        this.board.days = new Map(previous.days.map(([d, rows]) => [d, new Map(rows)]));
      }
      throw err;
    }
  }

  _handle(body) {
    this.prune();
    if (!body || typeof body !== 'object') return { ok: false, error: 'bad' };
    const { action, date, pid } = body;
    if (!this.board.allowedDates().includes(date)) return { ok: false, error: 'date' };
    if (typeof pid !== 'string' || !/^[a-f0-9]{16,48}$/.test(pid)) return { ok: false, error: 'pid' };
    const key = date + ':' + pid;
    let run = this.runs.get(key);
    if (action === 'start') {
      if (date !== this.board.allowedDates()[0]) return { ok: false, error: 'date' };
      if (run) return { ok: true, available: false };
      if (this.runs.size >= 40000) return { ok: false, error: 'full' };
      const startedAt = this.now().getTime();
      run = { date, pid, name: safeName(String(body.name || 'Kâşif').slice(0, 14)),
        token: crypto.randomBytes(24).toString('hex'), startedAt, levelAt: startedAt,
        results: [], wrongs: 0, levelWrongs: 0, finished: false, score: 0 };
      this.runs.set(key, run);
      this.save();
      return { ok: true, available: true, token: run.token };
    }
    if (!run || typeof body.token !== 'string' || body.token !== run.token) return { ok: false, error: 'session' };
    if (action === 'finish') {
      if (!run.finished) {
        const result = this.board.submit({ date, pid, name: run.name, solved: run.results.length,
          score: run.score, wrongs: run.wrongs, timeMs: Math.min(21600000, Math.max(0, this.now().getTime() - run.startedAt)) });
        if (!result.ok) return result;
        run.finished = true;
        this.save();
      }
      return { ok: true, verified: true, ...this.board.board(date, pid) };
    }
    if (action !== 'guess') return { ok: false, error: 'action' };
    // An acknowledgement lost in transit must not count a wrong twice or solve the next region.
    if (typeof body.requestId !== 'string' || !/^[a-f0-9]{16,48}$/.test(body.requestId)) return { ok: false, error: 'request' };
    if (run.lastRequest === body.requestId) return run.lastResponse;
    if (run.finished || body.level !== run.results.length + 1 || body.level > Daily.REGIONS) return { ok: false, error: 'level' };
    const now = this.now().getTime();
    if (now < (run.lockUntil || 0)) return { ok: false, error: 'Telsiz kilitli. Biraz bekle.', lockMs: run.lockUntil - now };
    const p = this.plan(date)[body.level - 1];
    const location = LOCATIONS.find((l) => l.id === p.locationId);
    const tier = CONFIG.PROGRESSION.tiers[p.tierIndex];
    const guess = body.guess || {};
    const missing = this.evaluator.validate(guess, tier.fields);
    if (missing.length) return { ok: false, error: 'missing', missing };
    const result = this.evaluator.evaluate(guess, location, { fields: tier.fields, latitudeTolerance: tier.latitudeTolerance });
    let scored = null;
    if (result.isCorrect) {
      const score = new ScoreKeeper(CONFIG.SCORE);
      score.startLevel();
      score.seconds = Math.max(0, this.now().getTime() - run.levelAt) / 1000;
      score.wrong = run.levelWrongs;
      scored = score.finishLevel(body.level, p.tierIndex);
      run.results.push(scored);
      run.score += scored.points;
      run.levelWrongs = 0;
      run.levelAt = this.now().getTime();
    } else {
      run.levelWrongs += 1;
      run.wrongs += 1;
      run.lockUntil = this.now().getTime() + CONFIG.RACE.lockMs;
    }
    run.lastRequest = body.requestId;
    const publicResult = { isCorrect: result.isCorrect, correctCount: result.correctCount, total: result.total,
      feedback: result.feedback.map(({ field, label, ok, hint, direction }) => ({ field, label, ok, hint, direction })) };
    run.lastResponse = { ok: true, result: publicResult, scored, total: run.score, wrongs: run.wrongs,
      lockMs: result.isCorrect ? 0 : CONFIG.RACE.lockMs };
    this.save();
    return run.lastResponse;
  }
}

module.exports = { VerifiedDaily };
