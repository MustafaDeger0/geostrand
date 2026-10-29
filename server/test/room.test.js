/**
 * Yarış odası kuralları — sahte saatle (gerçekte beklemeden) test edilir.
 *   node --test server/test/
 */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { RaceRoom, cleanName, sanitizeGuess } = require('../RaceRoom.js');
const { CONFIG } = require('../../js/core/Config.js');

const R = CONFIG.RACE;

/** Sahte saat: tick(ms) ile zaman ilerler, zamanı gelen işler çalışır */
function fakeClock() {
  let now = 1_000_000;
  let id = 0;
  const jobs = new Map();
  return {
    now: () => now,
    setTimeout(fn, ms) { jobs.set(++id, { at: now + ms, fn }); return id; },
    clearTimeout(i) { jobs.delete(i); },
    tick(ms) {
      const end = now + ms;
      for (;;) {
        const due = [...jobs.entries()].filter(([, j]) => j.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
        if (!due) break;
        jobs.delete(due[0]);
        now = due[1].at;
        due[1].fn();
      }
      now = end;
    },
  };
}

function makeRoom(opts = {}) {
  const clock = fakeClock();
  const events = [];
  const room = new RaceRoom({ code: 'TEST', clock, emit: (e, p) => events.push([e, p]), rng: seq(), ...opts });
  return { room, clock, events, last: (name) => [...events].reverse().find(([e]) => e === name)?.[1] };
}

/** Tekrarlanabilir rastgele dizi */
function seq() {
  let x = 7;
  return () => ((x = (x * 16807) % 2147483647) / 2147483647);
}

function answer(room) {
  const loc = room.round.location;
  return { hemisphere: loc.hemisphere, climate: loc.climate, latitude: loc.latitude, landform: loc.landform, continent: loc.continent };
}

test('özel oda: kurucu başlatır, diğerleri başlatamaz; ayarları yalnız kurucu değiştirir', () => {
  const { room } = makeRoom();
  const a = room.addPlayer({ name: 'Ayşe' }).player;
  const b = room.addPlayer({ name: 'Mert' }).player;
  assert.equal(room.hostId, a.id);
  assert.ok(room.updateSettings(b.id, { rounds: 3 }).error);
  assert.ok(room.updateSettings(a.id, { rounds: 3, roundTime: 90, difficulty: 'hard' }).ok);
  assert.deepEqual(room.settings, { rounds: 3, roundTime: 90, difficulty: 'hard' });
  assert.ok(room.updateSettings(a.id, { rounds: 999 }).ok);           // geçersiz değer yok sayılır
  assert.equal(room.settings.rounds, 3);
  assert.ok(room.start(b.id).error);
  assert.ok(room.start(a.id).ok);
  assert.equal(room.phase, 'playing');
});

test('tahmin: geri sayımda reddedilir; doğru cevap sıra + süre + puan; yanlış kilitler ve puanı azaltır', () => {
  const { room, clock, last } = makeRoom();
  const a = room.addPlayer({ name: 'Ayşe' }).player;
  const b = room.addPlayer({ name: 'Mert' }).player;
  room.start(a.id);
  assert.ok(room.submitGuess(a.id, answer(room)).error, 'geri sayımda tahmin yok');
  clock.tick(R.countdownMs + 5000);

  // Mert yanlış yapar → kilit
  const wrong = { ...answer(room), hemisphere: room.round.location.hemisphere === 'KUZEY' ? 'GUNEY' : 'KUZEY' };
  const w = room.submitGuess(b.id, wrong);
  assert.equal(w.correct, false);
  assert.equal(w.lockMs, R.lockMs);
  assert.ok(w.result.feedback.some((f) => f.field === 'hemisphere' && !f.ok));
  assert.equal(JSON.stringify(w.result).includes(room.round.location.id), false, 'yanlışta cevap sızmaz');
  assert.ok(room.submitGuess(b.id, answer(room)).locked, 'kilitliyken tahmin yok');

  // Ayşe doğru → 1.
  const ok = room.submitGuess(a.id, answer(room));
  assert.equal(ok.correct, true);
  assert.equal(ok.rank, 1);
  assert.equal(ok.timeMs, 5000);
  assert.equal(ok.points, R.rankPoints[0]);
  assert.ok(room.submitGuess(a.id, answer(room)).error, 'aynı turu iki kez bilemez');

  clock.tick(R.lockMs);
  const ok2 = room.submitGuess(b.id, answer(room));
  assert.equal(ok2.rank, 2);
  assert.equal(ok2.points, R.rankPoints[1] - R.wrongPenalty);

  // Herkes bildi → tur erken biter
  clock.tick(2000);
  assert.equal(room.phase, 'roundEnd');
  const end = last('round:end');
  assert.equal(end.reason, 'all-solved');
  assert.equal(end.results[0].name, 'Ayşe');
  assert.ok(end.reveal.name && end.reveal.climate);
});

test('eksik alan: değerlendirmez, eksikleri söyler, kilitlemez', () => {
  const { room, clock } = makeRoom();
  const a = room.addPlayer({ name: 'A' }).player;
  room.start(a.id);
  clock.tick(R.countdownMs);
  const r = room.submitGuess(a.id, { latitude: 10 });
  assert.ok(r.missing.length >= 2);
  assert.equal(room.players.get(a.id).wrongs, 0);
});

test('süre dolunca tur biter; son turdan sonra oyun biter ve sıralama doğru', () => {
  const { room, clock, last } = makeRoom();
  const a = room.addPlayer({ name: 'A' }).player;
  const b = room.addPlayer({ name: 'B' }).player;
  room.updateSettings(a.id, { rounds: 3, roundTime: 90 });
  room.start(a.id);
  for (let i = 0; i < 3; i++) {
    clock.tick(R.countdownMs + 1000);
    room.submitGuess(b.id, answer(room));       // yalnız B bilir
    clock.tick(89000);                           // süre tam dolar
    assert.equal(room.phase, 'roundEnd');
    clock.tick(i < 2 ? R.betweenRoundsMs : 2500);
  }
  assert.equal(room.phase, 'gameOver');
  const over = last('game:over');
  assert.equal(over.standings[0].name, 'B');
  assert.equal(over.standings[0].score, 300);
  assert.equal(over.standings[1].score, 0);
});

test('kademeli zorluk: ilk turlar kolay, sonra yer şekli ve kıta eklenir; konumlar tekrar etmez', () => {
  const { room, clock } = makeRoom();
  const a = room.addPlayer({ name: 'A' }).player;
  room.updateSettings(a.id, { rounds: 5 });
  room.start(a.id);
  const tiers = [];
  const ids = [];
  for (let i = 0; i < 5; i++) {
    tiers.push(room.round.tierIndex);
    ids.push(room.round.location.id);
    clock.tick(R.countdownMs + 150000);
    clock.tick(R.betweenRoundsMs);
  }
  assert.deepEqual(tiers, [0, 0, 1, 1, 2]);
  assert.equal(new Set(ids).size, 5);
});

test('kurucu ayrılınca kuruculuk devredilir; herkes kopunca oda 60 sn sonra kapanır', () => {
  let closed = false;
  const { room, clock } = makeRoom({ onClosed: () => { closed = true; } });
  const a = room.addPlayer({ name: 'A' }).player;
  const b = room.addPlayer({ name: 'B' }).player;
  room.leave(a.id);
  assert.equal(room.hostId, b.id);
  room.disconnect(b.id);
  clock.tick(59000);
  assert.equal(closed, false);
  clock.tick(2000);
  assert.equal(closed, true);
});

test('yarışta kopan oyuncu belirteçle geri döner, puanı korunur', () => {
  const { room, clock } = makeRoom();
  const a = room.addPlayer({ name: 'A' }).player;
  const b = room.addPlayer({ name: 'B' }).player;
  room.start(a.id);
  clock.tick(R.countdownMs);
  room.submitGuess(b.id, answer(room));
  room.disconnect(b.id);
  const back = room.rejoin(b.token);
  assert.equal(back.id, b.id);
  assert.equal(back.score, R.rankPoints[0]);
  assert.equal(room.rejoin('yanlis-belirtec'), null);
});

test('hızlı oda: 2. oyuncu gelince 20 sn sonra kendiliğinden başlar', () => {
  const { room, clock } = makeRoom({ isPublic: true });
  room.addPlayer({ name: 'A' });
  clock.tick(60000);
  assert.equal(room.phase, 'lobby', 'tek kişiyle kendiliğinden başlamaz');
  room.addPlayer({ name: 'B' });
  assert.ok(room.state().autoStartInMs > 19000);
  clock.tick(R.quick.startAfterMs - 1);
  assert.equal(room.phase, 'lobby');
  clock.tick(2);
  assert.equal(room.phase, 'playing');
  assert.equal(room.settings.rounds, R.quick.rounds);
});

test('hızlı oda: dolunca hemen başlar; yalnız bekleyen 25 sn sonra başlatabilir', () => {
  const full = makeRoom({ isPublic: true });
  for (let i = 0; i < R.quick.maxPlayers; i++) full.room.addPlayer({ name: `P${i}` });
  assert.equal(full.room.phase, 'playing');
  assert.equal(full.room.acceptsQuickPlayers, false);

  const solo = makeRoom({ isPublic: true });
  const a = solo.room.addPlayer({ name: 'Yalnız' }).player;
  assert.ok(solo.room.start(a.id).error);
  assert.ok(solo.room.updateSettings(a.id, { rounds: 3 }).error, 'hızlı odada ayar yok');
  solo.clock.tick(R.quick.aloneAfterMs);
  assert.ok(solo.room.start(a.id).ok);
});

test('güvenlik: ad temizlenir, aynı ad numaralanır, tahmin alanları süzülür', () => {
  assert.equal(cleanName('  <b>Ali</b>\u0000  '), 'bAli/b');
  assert.equal(cleanName(''), 'Kâşif');
  assert.equal(cleanName('x'.repeat(40)).length, 14);
  const { room } = makeRoom();
  room.addPlayer({ name: 'Deniz' });
  assert.equal(room.addPlayer({ name: 'deniz' }).player.name, 'deniz 2');
  const g = sanitizeGuess({ hemisphere: 'KUZEY', climate: { evil: 1 }, latitude: '45', extra: 'x'.repeat(1e4) });
  assert.deepEqual(Object.keys(g).sort(), ['climate', 'continent', 'hemisphere', 'landform', 'latitude']);
  assert.equal(g.climate, undefined);
  assert.equal(g.latitude, 45);
});

test('uygunsuz ad süzülür; iki şikâyetle ad değişir', () => {
  const { room } = makeRoom();
  assert.match(room.addPlayer({ name: 's1kt1r' }).player.name, /^Kâşif \d+/);
  assert.equal(room.addPlayer({ name: 'Işık' }).player.name, 'Işık');
  const bad = room.addPlayer({ name: 'Rahatsız' }).player;
  const ids = [...room.players.keys()];
  assert.equal(room.report(ids[0], bad.id).renamed, false, 'tek şikâyet yetmez (3 kişilik oda)');
  assert.ok(room.report(ids[0], ids[0]).error, 'kendini şikâyet edemez');
  assert.equal(room.report(ids[1], bad.id).renamed, true);
  assert.match(room.players.get(bad.id).name, /^Kâşif \d+/);
});
