/**
 * Gerçek ağ üzerinden uçtan uca: sunucu açılır, 3 "bot" oyuncu bağlanır.
 *   • Özel oda: kur → katıl → başlat → tahmin → sonuç → oyun sonu
 *   • Hızlı eşleşme: iki yabancı aynı odaya düşer ve yarış kendiliğinden başlar
 *   • Statik dosyalar: oyun açılır, gizli dosyalar sunulmaz
 * Süreler testte kısaltılır.
 */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const { io: connect } = require('socket.io-client');
const { CONFIG } = require('../../js/core/Config.js');
const { LOCATIONS } = require('../../js/data/locations.js');

// Testte süreleri kısalt
Object.assign(CONFIG.RACE, { countdownMs: 50, betweenRoundsMs: 100, lockMs: 200 });
Object.assign(CONFIG.RACE.quick, { startAfterMs: 300, aloneAfterMs: 300 });
const { createServer } = require('../server.js');

const byId = Object.fromEntries(LOCATIONS.map((l) => [l.id, l]));
const answerFor = (round) => {
  const l = byId[round.locationId];
  return { hemisphere: l.hemisphere, climate: l.climate, latitude: l.latitude, landform: l.landform, continent: l.continent };
};

function client(url) {
  const s = connect(url, { transports: ['websocket'], forceNew: true, reconnection: false });
  s.call = (ev, payload) => new Promise((res) => s.emit(ev, payload, res));
  s.next = (ev) => new Promise((res) => s.once(ev, res));
  return s;
}

function get(url) {
  return new Promise((res, rej) => http.get(url, (r) => {
    let body = '';
    r.on('data', (d) => (body += d));
    r.on('end', () => res({ status: r.statusCode, body }));
  }).on('error', rej));
}

test('çevrim içi: özel oda, hızlı eşleşme ve statik dosyalar', async (t) => {
  const app = createServer({ log: () => {} });
  const port = await app.listen(0, '127.0.0.1');
  const url = `http://127.0.0.1:${port}`;
  t.after(() => app.close());

  await t.test('statik: oyun sunulur, sunucu kodu ve gizli dosyalar sunulmaz', async () => {
    const home = await get(`${url}/`);
    assert.equal(home.status, 200);
    assert.match(home.body, /GeoStrand/);
    assert.equal((await get(`${url}/js/core/Config.js`)).status, 200);
    assert.equal((await get(`${url}/server/RaceRoom.js`)).status, 403);
    assert.equal((await get(`${url}/package.json`)).status, 403);
    assert.equal((await get(`${url}/node_modules/socket.io/package.json`)).status, 403);
    assert.notEqual((await get(`${url}/..%2f..%2fetc/passwd`)).status, 200);
    assert.equal((await get(`${url}/healthz`)).body, 'ok');
    assert.equal((await get(`${url}/socket.io/socket.io.js`)).status, 200);
  });

  await t.test('özel oda: 3 oyuncu, 2 tur, puan ve sıralama', async () => {
    const [ayse, mert, zeynep] = [client(url), client(url), client(url)];
    t.after(() => [ayse, mert, zeynep].forEach((s) => s.close()));

    const created = await ayse.call('room:create', { name: 'Ayşe', appearance: { hat: 'cap' } });
    assert.ok(created.ok && /^[A-Z]{4}$/.test(created.code));
    assert.equal((await mert.call('room:join', { code: created.code.toLowerCase(), name: 'Mert' })).ok, true);
    assert.equal((await zeynep.call('room:join', { code: created.code, name: 'Zeynep' })).ok, true);
    assert.ok((await mert.call('game:start')).error, 'yalnız kurucu başlatır');
    assert.ok((await ayse.call('room:settings', { rounds: 3 })).ok);

    // Zeynep, Mert'in konumunu görür (aynı odadakilere aktarılır)
    const roundP = zeynep.next('round:start');
    assert.ok((await ayse.call('game:start')).ok);
    let round = await roundP;
    assert.equal(round.index, 1);
    assert.equal(typeof round.seed, 'number');
    await new Promise((r) => setTimeout(r, 80));

    const moved = zeynep.next('player:moved');
    mert.emit('player:move', { x: 1234.6, y: 777, f: 'left', m: true });
    const mv = await moved;
    assert.equal(mv.x, 1235);
    assert.equal(mv.f, 'left');

    for (let i = 1; i <= 3; i++) {
      if (i > 1) {
        round = await zeynep.next('round:start');
        await new Promise((r) => setTimeout(r, 80));
      }
      const ans = answerFor(round);
      const solvedEvent = zeynep.next('player:solved');
      const first = await mert.call('guess:submit', { guess: ans });
      assert.equal(first.correct, true);
      assert.equal(first.rank, 1);
      assert.equal((await solvedEvent).name, 'Mert');
      const wrong = await ayse.call('guess:submit', { guess: { ...ans, latitude: ans.latitude > 45 ? 0 : 89 } });
      assert.equal(wrong.correct, false);
      const end = zeynep.next('round:end');
      assert.equal((await zeynep.call('guess:submit', { guess: ans })).rank, 2);
      await new Promise((r) => setTimeout(r, 220));
      assert.equal((await ayse.call('guess:submit', { guess: ans })).rank, 3);
      const e = await end;
      assert.equal(e.reason, 'all-solved');
      assert.equal(e.results.map((r) => r.name).join(','), 'Mert,Zeynep,Ayşe');
    }
    const over = await zeynep.next('game:over');
    assert.equal(over.standings[0].name, 'Mert');
    assert.equal(over.standings[0].score, 300);
  });

  await t.test('hızlı eşleşme: iki yabancı aynı odaya düşer, yarış kendiliğinden başlar', async () => {
    const [x, y] = [client(url), client(url)];
    t.after(() => [x, y].forEach((s) => s.close()));
    const jx = await x.call('quick:join', { name: 'Tokyo' });
    const startX = x.next('round:start');
    const jy = await y.call('quick:join', { name: 'Lima' });
    assert.ok(jx.ok && jy.ok && jx.isPublic);
    assert.equal(jx.code, jy.code);
    assert.ok((await x.call('room:settings', { rounds: 10 })).error, 'hızlı odada ayar yok');
    const r = await startX;
    assert.equal(r.index, 1);
    assert.equal(r.total, CONFIG.RACE.quick.rounds);
  });

  await t.test('yeniden bağlanma: belirteçle aynı oyuncu olarak döner', async () => {
    const a = client(url);
    const created = await a.call('room:create', { name: 'Dönen' });
    a.close();
    const b = client(url);
    t.after(() => b.close());
    const back = await b.call('room:rejoin', { code: created.code, token: created.token });
    assert.equal(back.playerId, created.playerId);
    assert.ok((await b.call('room:rejoin', { code: created.code, token: 'sahte' })).error);
  });

  await t.test('hız sınırı: sel gibi mesaj gönderen yavaşlatılır', async () => {
    const s = client(url);
    t.after(() => s.close());
    const replies = await Promise.all(Array.from({ length: 20 }, () => s.call('room:create', { name: 'Sel' })));
    assert.ok(replies.some((r) => r.error && /yavaş/.test(r.error)));
  });
});
