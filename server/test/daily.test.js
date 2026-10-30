/**
 * Günlük meydan okuma sıralaması: kurallar (DailyBoard) + HTTP uç noktası (/api/daily)
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { DailyBoard } = require('../DailyBoard.js');
const { createServer } = require('../server.js');

const NOW = () => new Date('2026-10-30T10:00:00Z');
const pid = (n) => String(n).padStart(2, '0').repeat(12);
const entry = (o = {}) => ({ date: '2026-10-30', pid: pid(1), name: 'Deniz', score: 400, solved: 3, timeMs: 200000, wrongs: 1, ...o });

test('DailyBoard: sıralama bölge ↓, puan ↓, süre ↑', () => {
  const b = new DailyBoard({ now: NOW });
  b.submit(entry({ pid: pid(1), score: 500, solved: 3 }));
  b.submit(entry({ pid: pid(2), score: 300, solved: 5, name: 'Ayşe' }));
  b.submit(entry({ pid: pid(3), score: 500, solved: 3, timeMs: 100000, name: 'Ali' }));
  const r = b.board('2026-10-30', pid(1));
  assert.deepEqual(r.top.map((p) => p.name), ['Ayşe', 'Ali', 'Deniz']);
  assert.equal(r.me.rank, 3);
  assert.equal(r.count, 3);
});

test('DailyBoard: her cihaz günde bir kez (ilk gönderim sayılır)', () => {
  const b = new DailyBoard({ now: NOW });
  b.submit(entry({ score: 100 }));
  const r = b.submit(entry({ score: 700 }));
  assert.equal(r.count, 1);
  assert.equal(r.top[0].score, 100);
});

test('DailyBoard: geçersiz tarih, kimlik, imkânsız puan reddedilir', () => {
  const b = new DailyBoard({ now: NOW });
  assert.equal(b.submit(entry({ date: '2026-10-20' })).error, 'date');
  assert.equal(b.submit(entry({ pid: 'abc' })).error, 'pid');
  assert.equal(b.submit(entry({ score: b.maxScore('2026-10-30') + 1 })).error, 'value');
  assert.equal(b.submit(entry({ solved: 6 })).error, 'value');
  assert.equal(b.submit(entry({ score: 'çok' })).error, 'value');
  assert.equal(b.submit(entry({ date: '2026-10-29' })).ok, true); // dün kabul
});

test('DailyBoard: kaba ad süzülür', () => {
  const b = new DailyBoard({ now: NOW });
  const r = b.submit(entry({ name: 'amk' }));
  assert.notEqual(r.top[0].name, 'amk');
});

test('HTTP /api/daily: gönder, oku, CORS', async () => {
  const app = createServer({ log: () => {}, dailyNow: NOW });
  const port = await app.listen(0, '127.0.0.1');
  const base = `http://127.0.0.1:${port}/api/daily`;
  try {
    const pre = await fetch(base, { method: 'OPTIONS' });
    assert.equal(pre.status, 204);
    assert.equal(pre.headers.get('access-control-allow-origin'), '*');
    const post = await fetch(base, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(entry()) });
    assert.equal(post.status, 200);
    const p = await post.json();
    assert.equal(p.me.rank, 1);
    const get = await (await fetch(`${base}?date=2026-10-30&pid=${pid(9)}`)).json();
    assert.equal(get.count, 1);
    assert.equal(get.me, null);
    assert.equal((await fetch(`${base}?date=2020-01-01`)).status, 400);
    assert.equal((await fetch(base, { method: 'POST', body: '{bozuk' })).status, 400);
  } finally {
    await app.close();
  }
});
