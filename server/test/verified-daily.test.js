'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { VerifiedDaily } = require('../VerifiedDaily.js');
const { LOCATIONS } = require('../../js/data/locations.js');

const date = '2026-11-17', pid = 'aa'.repeat(12);
function setup(file = null) {
  let time = Date.parse(date + 'T10:00:00Z');
  const server = new VerifiedDaily({ now: () => new Date(time), file });
  const started = server.handle({ action: 'start', date, pid, name: 'Test' });
  const request = (body) => server.handle({ date, pid, token: started.token, ...body });
  const answer = (level) => {
    const loc = LOCATIONS.find((l) => l.id === server.plan(date)[level - 1].locationId);
    return { hemisphere: loc.hemisphere, latitude: loc.latitude, climate: loc.climate, landform: loc.landform, continent: loc.continent };
  };
  return { server, request, answer, advance: (ms) => { time += ms; } };
}

test('verified daily: ignores client score and counts only evaluated regions', () => {
  const { request, answer, server } = setup();
  assert.equal(request({ action: 'guess', level: 5, requestId: '01'.repeat(12), guess: answer(5) }).error, 'level');
  const solved = request({ action: 'guess', level: 1, requestId: '02'.repeat(12), guess: answer(1), score: 999999 });
  assert.equal(solved.scored.points, 150);
  const result = request({ action: 'finish', solved: 5, score: 99999, timeMs: 0 });
  assert.equal(result.me.solved, 1);
  assert.equal(result.me.score, 150);
  assert.equal(server.handle({ action: 'start', date, pid }).available, false);
});

test('verified daily: wrong retry is idempotent, time and penalties are authoritative', () => {
  const { request, answer, advance } = setup();
  const wrong = { action: 'guess', level: 1, requestId: '03'.repeat(12), guess: { ...answer(1), climate: 'WRONG' } };
  assert.equal(request(wrong).wrongs, 1);
  assert.equal(request(wrong).wrongs, 1);
  advance(121000);
  const right = { action: 'guess', level: 1, requestId: '04'.repeat(12), guess: answer(1) };
  const result = request(right);
  assert.equal(result.scored.points, 75);
  assert.equal(result.scored.seconds, 121);
  assert.deepEqual(request(right), result);
  const board = request({ action: 'finish' });
  assert.equal(board.me.timeMs, 121000);
  assert.deepEqual(request({ action: 'finish' }), board);
});

test('verified daily: rejects invalid session, missing latitude and request replay on next level', () => {
  const { request, answer } = setup();
  assert.equal(request({ action: 'guess', token: 'bad', level: 1 }).error, 'session');
  assert.equal(request({ action: 'guess', level: 1, requestId: '05'.repeat(12), guess: { ...answer(1), latitude: null } }).error, 'missing');
  assert.equal(request({ action: 'guess', level: 1, requestId: '06'.repeat(12), guess: answer(1) }).ok, true);
  assert.equal(request({ action: 'guess', level: 1, requestId: '07'.repeat(12), guess: answer(1) }).error, 'level');
});

test('verified daily: sessions and results survive process recreation; expired days are pruned', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'geostrand-daily-'));
  try {
    const file = path.join(dir, 'daily.json');
    const { request, answer } = setup(file);
    request({ action: 'guess', level: 1, requestId: '08'.repeat(12), guess: answer(1) });
    request({ action: 'finish' });
    const recreated = new VerifiedDaily({ file, now: () => new Date(date + 'T12:00:00Z') });
    assert.equal(recreated.board.board(date, pid).me.solved, 1);
    assert.equal(recreated.handle({ action: 'start', date, pid }).available, false);
    const expired = new VerifiedDaily({ file, now: () => new Date('2026-11-20T12:00:00Z') });
    assert.equal(expired.runs.size, 0);
    assert.equal(expired.board.days.size, 0);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('verified daily: all five regions use progressive scoring and accept a retry after restart', () => {
  const { request, answer } = setup();
  for (let level = 1; level <= 5; level++) {
    const result = request({ action: 'guess', level, requestId: String(level).padStart(24, '0'), guess: answer(level) });
    assert.equal(result.result.isCorrect, true);
  }
  const result = request({ action: 'finish' });
  assert.equal(result.me.solved, 5);
  assert.equal(result.me.score, 850);
});

test('verified daily: incorrect responses never expose exact latitude error; rapid guesses are locked', () => {
  const { request, answer } = setup();
  const result = request({ action: 'guess', level: 1, requestId: '09'.repeat(12), guess: { ...answer(1), latitude: 90 } });
  assert.equal(result.result.latitudeError, undefined);
  assert.equal(result.result.feedback.some((f) => 'error' in f), false);
  assert.ok(request({ action: 'guess', level: 1, requestId: '10'.repeat(12), guess: answer(1) }).lockMs > 0);
});

test('verified daily: a failed disk write rolls back the attempt so it can be retried', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'geostrand-write-'));
  try {
    const { server, request, answer } = setup(path.join(dir, 'daily.json'));
    const save = server.save.bind(server);
    server.save = () => { throw new Error('disk full'); };
    const guess = { action: 'guess', level: 1, requestId: '11'.repeat(12), guess: answer(1) };
    assert.throws(() => request(guess), /disk full/);
    server.save = save;
    assert.equal(request(guess).scored.points, 150);
    assert.equal(request({ action: 'finish' }).me.solved, 1);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
