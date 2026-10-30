/**
 * GeoStrand — Mantık katmanı birim testleri
 * Çalıştırma:  node --test tests/
 * (Phaser gerekmez; logic/ klasörü saf JavaScript olduğu için doğrudan test edilir.)
 */
const test = require('node:test');
const assert = require('node:assert/strict');

const { EventBus, EVENTS } = require('../js/core/EventBus.js');
const { CONFIG } = require('../js/core/Config.js');
const { CLIMATES } = require('../js/data/climates.js');
const { LOCATIONS } = require('../js/data/locations.js');
const { SurvivalSystem } = require('../js/logic/SurvivalSystem.js');
const { DayNightCycle } = require('../js/logic/DayNightCycle.js');
const { PredictionEvaluator } = require('../js/logic/PredictionEvaluator.js');
const { ClueFactory } = require('../js/logic/ClueFactory.js');
const { Inventory } = require('../js/logic/Inventory.js');
const { LocationManager } = require('../js/logic/LocationManager.js');
const { MUSIC_THEMES } = require('../js/data/musicThemes.js');

const NEUTRAL_ENV = { hydrationFactor: 1, tempFactor: 1 };

// ---------------------------------------------------------------- Survival
test('Survival: barlar taban hızda düşer', () => {
  const s = new SurvivalSystem(CONFIG.SURVIVAL);
  s.update(10, NEUTRAL_ENV);
  assert.equal(s.hydration, 100 - 0.6 * 10);
  assert.equal(s.bodyTemp, 100 - 0.5 * 10);
});

test('Survival: yanlış tahmin cezası barları tam 2 kat hızlı düşürür', () => {
  const normal = new SurvivalSystem(CONFIG.SURVIVAL);
  const punished = new SurvivalSystem(CONFIG.SURVIVAL);
  punished.startPenalty(60);
  normal.update(10, NEUTRAL_ENV);
  punished.update(10, NEUTRAL_ENV);
  assert.equal(100 - punished.hydration, 2 * (100 - normal.hydration));
  assert.equal(100 - punished.bodyTemp, 2 * (100 - normal.bodyTemp));
});

test('Survival: ceza süresi dolunca biter ve olay yayar', () => {
  const bus = new EventBus();
  const seen = [];
  bus.on(EVENTS.PENALTY_START, () => seen.push('start'));
  bus.on(EVENTS.PENALTY_END, () => seen.push('end'));
  const s = new SurvivalSystem(CONFIG.SURVIVAL, bus, EVENTS);
  s.startPenalty(5);
  s.update(3, NEUTRAL_ENV);
  assert.equal(s.isPenalized, true);
  s.update(3, NEUTRAL_ENV);
  assert.equal(s.isPenalized, false);
  assert.deepEqual(seen, ['start', 'end']);
});

test('Survival: doğru tahmin cezayı anında kaldırır', () => {
  const s = new SurvivalSystem(CONFIG.SURVIVAL);
  s.startPenalty();
  s.clearPenalty();
  assert.equal(s.decayMultiplier, 1);
});

test('Survival: restore +50 ekler ve 100 ile sınırlanır', () => {
  const s = new SurvivalSystem(CONFIG.SURVIVAL);
  s.hydration = 30;
  assert.equal(s.restore('hydration', 50), 50);
  assert.equal(s.hydration, 80);
  assert.equal(s.restore('hydration', 50), 20); // sadece 20 sığdı
  assert.equal(s.hydration, 100);
});

test('Survival: su bitince HP düşer, HP 0 olunca ölüm olayı', () => {
  const bus = new EventBus();
  let died = false;
  bus.on(EVENTS.PLAYER_DIED, () => (died = true));
  const s = new SurvivalSystem(CONFIG.SURVIVAL, bus, EVENTS);
  s.hydration = 0;
  s.update(1, { hydrationFactor: 1, tempFactor: 0 });
  assert.equal(s.hp, 100 - 5);
  for (let i = 0; i < 30; i++) s.update(1, { hydrationFactor: 1, tempFactor: 0 });
  assert.equal(s.isDead, true);
  assert.equal(died, true);
});

test('Survival: su ve ısı yüksekse HP iyileşir', () => {
  const s = new SurvivalSystem(CONFIG.SURVIVAL);
  s.hp = 50;
  s.update(2, { hydrationFactor: 0, tempFactor: 0 });
  assert.equal(s.hp, 53);
});

test('Survival: °C dönüşümü 100 → 37, 0 → 28', () => {
  const s = new SurvivalSystem(CONFIG.SURVIVAL);
  assert.equal(s.bodyTempCelsius, 37);
  s.bodyTemp = 0;
  assert.equal(s.bodyTempCelsius, 28);
});

// ---------------------------------------------------------------- DayNight
test('DayNight: öğlen aydınlık, gece yarısı karanlık', () => {
  const d = new DayNightCycle({ ...CONFIG.DAY_NIGHT, startHour: 12 });
  assert.equal(d.lightLevel, 1);
  assert.equal(d.phase.label, 'Gündüz');
  d.hour = 0;
  assert.equal(d.lightLevel, 0);
  assert.equal(d.isNight, true);
  assert.ok(Math.abs(d.darkness - CONFIG.DAY_NIGHT.maxDarkness) < 1e-9);
});

test('DayNight: 180 sn = 24 saat, gün sayısı artar', () => {
  const d = new DayNightCycle({ ...CONFIG.DAY_NIGHT, startHour: 9 });
  d.update(180);
  assert.ok(Math.abs(d.hour - 9) < 1e-9);
  assert.equal(d.dayCount, 2);
  assert.equal(d.formatClock(), '09:00');
});

// ---------------------------------------------------------------- Evaluator
const evaluator = new PredictionEvaluator({ latitudeTolerance: 7, climates: CLIMATES });
const antalya = LOCATIONS.find((l) => l.id === 'antalya');

test('Evaluator: üç alan doğruysa sonuç doğru', () => {
  const r = evaluator.evaluate({ hemisphere: 'KUZEY', climate: 'AKDENIZ', latitude: 40 }, antalya);
  assert.equal(r.isCorrect, true);
  assert.equal(r.correctCount, 3);
});

test('Evaluator: enlem tolerans dışında → yanlış ve yön ipucu verir', () => {
  const r = evaluator.evaluate({ hemisphere: 'KUZEY', climate: 'AKDENIZ', latitude: 50 }, antalya);
  assert.equal(r.isCorrect, false);
  assert.equal(r.latitudeOk, false);
  assert.equal(r.feedback[2].direction, 'lower');
  assert.match(r.feedback[2].hint, /küçük/);
  assert.equal(r.feedback[0].hint, null); // doğru alanda ipucu yok
});

test('Evaluator: yarım küre yanlış → yanlış', () => {
  const r = evaluator.evaluate({ hemisphere: 'GUNEY', climate: 'AKDENIZ', latitude: 37 }, antalya);
  assert.equal(r.isCorrect, false);
  assert.equal(r.correctCount, 2);
});

test('Evaluator: eksik form doğrulanır', () => {
  assert.equal(evaluator.validate({ latitude: 30 }).length, 2);
  assert.equal(evaluator.validate({ hemisphere: 'KUZEY', climate: 'COL', latitude: 95 }).length, 1);
  assert.equal(evaluator.validate({ hemisphere: 'KUZEY', climate: 'COL', latitude: 25 }).length, 0);
});

// ---------------------------------------------------------------- Clues
test('ClueFactory: gölge oranı tan formülüne uyar ve yön doğru', () => {
  assert.ok(Math.abs(ClueFactory.shadowRatio(45) - 1) < 1e-9); // 45°'de gölge = çubuk
  const clues = ClueFactory.build(antalya);
  assert.deepEqual(clues.sunstick.tags, ['0,75 m', '⬆ Kuzeye']); // 1/tan(53°) ≈ 0,75
  assert.equal(clues.sunstick.shadow.direction, 'N');
  const amazon = ClueFactory.build(LOCATIONS.find((l) => l.id === 'amazon'));
  assert.match(amazon.sunstick.text, /neredeyse yok/);
  assert.equal(amazon.sunstick.shadow.direction, 'S');
});

test('Veri: her konumun iklimi tanımlı ve ipuçları dolu', () => {
  for (const loc of LOCATIONS) {
    assert.ok(CLIMATES[loc.climate], loc.id);
    assert.ok(['KUZEY', 'GUNEY'].includes(loc.hemisphere), loc.id);
    for (const k of ['tree', 'soil']) {
      const c = loc.clues[k];
      assert.equal(c.tags.length, 3, `${loc.id}.${k} 3 etiket`);
      assert.ok(c.text.split(' ').length <= 6, `${loc.id}.${k} kısa metin`);
    }
  }
  for (const c of Object.values(CLIMATES)) {
    assert.ok(c.terrain && c.audio, `${c.key} arazi/ses profili`);
  }
  // Her iklim tipi en az bir konumda kullanılıyor mu?
  for (const key of Object.keys(CLIMATES)) {
    assert.ok(LOCATIONS.some((l) => l.climate === key), key);
  }
});

test('Survival: neredeyse dolu bar "dolu" sayılır (eşya boşa gitmez)', () => {
  const s = new SurvivalSystem(CONFIG.SURVIVAL);
  s.hydration = 99.6;
  assert.equal(s.isFull('hydration'), true);
  s.hydration = 98;
  assert.equal(s.isFull('hydration'), false);
});

test('Müzik: her iklimin geçerli bir teması var', () => {
  const modes = ['ionian', 'dorian', 'phrygianDominant', 'lydian', 'mixolydian', 'aeolian'];
  for (const key of Object.keys(CLIMATES)) {
    const t = MUSIC_THEMES[key];
    assert.ok(t, `${key} teması yok`);
    assert.ok(modes.includes(t.mode), `${key} modu`);
    assert.ok(t.bpm >= 40 && t.bpm <= 140, `${key} tempo`);
    assert.ok(t.root >= 48 && t.root <= 72, `${key} kök nota (çok alçak = uğultu)`);
    assert.ok(t.progression.every((d) => d >= 0 && d < 7), `${key} akorlar`);
  }
});

// ---------------------------------------------------------------- Inventory & Locations
test('Inventory: ekle / tüket', () => {
  const inv = new Inventory({ water: 1 });
  assert.equal(inv.consume('water'), true);
  assert.equal(inv.consume('water'), false);
  inv.add('heat');
  assert.deepEqual(inv.getCounts(), { water: 0, heat: 1 });
});

test('LocationManager: bir turda tüm konumlar tekrarsız gelir', () => {
  const lm = new LocationManager(LOCATIONS);
  const ids = new Set();
  for (let i = 0; i < LOCATIONS.length; i++) ids.add(lm.next().id);
  assert.equal(ids.size, LOCATIONS.length);
  const last = lm.current.id;
  assert.notEqual(lm.next().id, last); // yeni tur aynı konumla başlamaz
});

// ======================================================================
//  Kademeler, yer şekli, kıta, puan, hava (v4)
// ======================================================================
const { LANDFORMS, CONTINENTS } = require('../js/data/landforms.js');
const { WEATHERS, CLIMATE_WEATHER } = require('../js/data/weather.js');
const { Progression, ScoreKeeper, WeatherPicker } = require('../js/logic/Progression.js');
const TIERS = CONFIG.PROGRESSION.tiers;

test('Kademe: 1–2 temel, 3–4 yer şekli, 5+ kıta', () => {
  assert.equal(Progression.tierFor(1, TIERS).index, 0);
  assert.equal(Progression.tierFor(2, TIERS).index, 0);
  assert.equal(Progression.tierFor(3, TIERS).index, 1);
  assert.ok(Progression.tierFor(3, TIERS).fields.includes('landform'));
  assert.ok(!Progression.tierFor(4, TIERS).fields.includes('continent'));
  assert.ok(Progression.tierFor(5, TIERS).fields.includes('continent'));
  assert.equal(Progression.tierFor(40, TIERS).index, 2);
  assert.equal(Progression.isUnlockLevel(3, TIERS), true);
  assert.equal(Progression.isUnlockLevel(4, TIERS), false);
  assert.equal(Progression.isUnlockLevel(1, TIERS), false);
});

test('Kademe: zorluk artar (tolerans daralır, kayıp hızlanır)', () => {
  for (let i = 1; i < TIERS.length; i++) {
    assert.ok(TIERS[i].latitudeTolerance <= TIERS[i - 1].latitudeTolerance);
    assert.ok(TIERS[i].decayMultiplier >= TIERS[i - 1].decayMultiplier);
    assert.equal(TIERS[i].fields.length, TIERS[i - 1].fields.length + 1);
  }
});

test('Evaluator: yer şekli ve kıta alanları', () => {
  const pune = LOCATIONS.find((l) => l.id === 'pune');
  const fields = TIERS[2].fields;
  const right = { hemisphere: 'KUZEY', climate: 'MUSON', latitude: 18, landform: 'PLATO', continent: 'ASYA' };
  assert.equal(evaluator.evaluate(right, pune, { fields }).isCorrect, true);
  const r = evaluator.evaluate({ ...right, landform: 'OVA' }, pune, { fields });
  assert.equal(r.isCorrect, false);
  assert.equal(r.landformOk, false);
  assert.equal(r.total, 5);
  assert.match(r.feedback.find((f) => f.field === 'landform').hint, /Yükselti/);
  // Temel kademede yer şekli sorulmaz: yanlış olsa da sonuç doğru
  assert.equal(evaluator.evaluate({ ...right, landform: 'OVA' }, pune).isCorrect, true);
});

test('Evaluator: kademe toleransı uygulanır', () => {
  const r = evaluator.evaluate({ hemisphere: 'KUZEY', climate: 'AKDENIZ', latitude: 43 }, antalya, { latitudeTolerance: 5 });
  assert.equal(r.latitudeOk, false); // 6° fark, tolerans 5
  assert.equal(evaluator.evaluate({ hemisphere: 'KUZEY', climate: 'AKDENIZ', latitude: 43 }, antalya).latitudeOk, true);
});

test('Evaluator: eksik yer şekli/kıta doğrulanır', () => {
  const errs = evaluator.validate({ hemisphere: 'KUZEY', climate: 'COL', latitude: 25 }, TIERS[2].fields);
  assert.deepEqual(errs, ['Yer şekli seç', 'Kıta seç']);
});

test('ClueFactory: yükselti ölçer ve hayvan izleri', () => {
  const atacama = LOCATIONS.find((l) => l.id === 'atacama');
  const c = ClueFactory.build(atacama, TIERS[2].clues, { landforms: LANDFORMS });
  assert.deepEqual(Object.keys(c), TIERS[2].clues);
  assert.match(c.altimeter.tags[0], /2.260 m/);
  assert.ok(c.altimeter.tags.includes('Yüksek'));
  assert.ok(c.fauna.tags.includes('Vikunya'));
});

test('Veri: yer şekilleri yükseltiyle tutarlı, kıtalar ve iklimler geçerli', () => {
  for (const loc of LOCATIONS) {
    assert.ok(LANDFORMS[loc.landform], `${loc.id} yer şekli`);
    assert.ok(CONTINENTS[loc.continent], `${loc.id} kıta`);
    if (loc.landform === 'OVA') assert.ok(loc.elevation <= 300, `${loc.id}: ova alçak olmalı`);
    if (loc.landform === 'PLATO') assert.ok(loc.elevation >= 500, `${loc.id}: plato yüksek olmalı`);
    if (loc.landform === 'DAG') assert.ok(loc.elevation >= 1000, `${loc.id}: dağ yüksek olmalı`);
    if (loc.climate === 'SERT_KARASAL') assert.equal(loc.hemisphere, 'KUZEY', 'sert karasal yalnız kuzeyde');
    assert.equal(loc.clues.fauna.tags.length, 3, `${loc.id} fauna`);
  }
  // Her yer şekli ve her kıta en az bir kez kullanılmalı
  for (const k of Object.keys(LANDFORMS)) assert.ok(LOCATIONS.some((l) => l.landform === k), k);
  for (const k of Object.keys(CONTINENTS)) assert.ok(LOCATIONS.some((l) => l.continent === k), k);
  assert.ok(LOCATIONS.length >= 18);
});

test('LocationManager: aynı iklim arka arkaya gelmez (3 tur)', () => {
  let seed = 7;
  const rng = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const lm = new LocationManager(LOCATIONS, rng);
  let prev = null;
  for (let i = 0; i < LOCATIONS.length * 3; i++) {
    const loc = lm.next();
    if (prev) assert.notEqual(loc.climate, prev.climate, `bölge ${i + 1}`);
    prev = loc;
  }
});

test('ScoreKeeper: hatasız ve hızlı → 3 yıldız; hatalar puanı düşürür', () => {
  const sk = new ScoreKeeper(CONFIG.SCORE);
  sk.tick(60);
  const a = sk.finishLevel(1, 0);
  assert.equal(a.stars, 3);
  assert.equal(a.points, 100 + 50);
  sk.startLevel();
  sk.tick(200);
  sk.recordWrong();
  const b = sk.finishLevel(2, 1);
  assert.equal(b.stars, 2);
  assert.equal(b.points, 100 - 25 + 25);
  sk.startLevel();
  for (let i = 0; i < 6; i++) sk.recordWrong();
  sk.tick(300);
  const c = sk.finishLevel(3, 2);
  assert.equal(c.stars, 1);
  assert.equal(c.points, 25 + 50); // en az 25 + kademe bonusu
  assert.equal(sk.total, a.points + b.points + c.points);
  assert.equal(sk.totalStars, 6);
});

test('WeatherPicker: olasılık 0 ise hep açık, 1 ise iklime uygun olay', () => {
  for (let i = 0; i < 20; i++) assert.equal(WeatherPicker.pick('COL', 0, CLIMATE_WEATHER), 'clear');
  for (let i = 0; i < 20; i++) {
    const w = WeatherPicker.pick('TUNDRA', 1, CLIMATE_WEATHER);
    assert.ok(CLIMATE_WEATHER.TUNDRA.includes(w));
    assert.ok(WEATHERS[w]);
  }
  for (const k of Object.keys(CLIMATES)) assert.ok(CLIMATE_WEATHER[k], `${k} hava listesi`);
});

// ======================================================================
//  Çevrim içi: tohumlu rastgele (aynı tohum = aynı harita)
// ======================================================================
const { SeededRandom } = require('../js/core/SeededRandom.js');

test('SeededRandom: aynı tohum aynı diziyi verir, Math.random geri yüklenir', () => {
  const original = Math.random;
  const a = SeededRandom.run(12345, () => Array.from({ length: 5 }, () => Math.random()));
  const b = SeededRandom.run(12345, () => Array.from({ length: 5 }, () => Math.random()));
  const c = SeededRandom.run(54321, () => Array.from({ length: 5 }, () => Math.random()));
  assert.deepEqual(a, b);
  assert.notDeepEqual(a, c);
  assert.ok(a.every((x) => x >= 0 && x < 1));
  assert.equal(Math.random, original);
  // Hata olsa bile geri yüklenir
  assert.throws(() => SeededRandom.run(1, () => { throw new Error('x'); }));
  assert.equal(Math.random, original);
});

// ---------------------------------------------------------------------------
//  Yanlış tahmin cezası: her yanlışta ve her bölgede ağırlaşır
// ---------------------------------------------------------------------------
test('Ceza: aynı bölgede her yanlış bir öncekinden ağır', () => {
  const W = CONFIG.WRONG_GUESS;
  const a = Progression.wrongPenalty(W, 1, 1);
  const b = Progression.wrongPenalty(W, 2, 1);
  const c = Progression.wrongPenalty(W, 3, 1);
  const d = Progression.wrongPenalty(W, 7, 1);
  assert.ok(a.drain < b.drain && b.drain < c.drain);
  assert.ok(a.multiplier < b.multiplier && b.multiplier < c.multiplier);
  assert.deepEqual(d, c); // 3'ten sonrası en ağır seviyede kalır
});

test('Ceza: bölge ilerledikçe ağırlaşır, üst sınırla', () => {
  const W = CONFIG.WRONG_GUESS;
  assert.ok(Progression.wrongPenalty(W, 2, 8).drain > Progression.wrongPenalty(W, 2, 1).drain);
  const huge = Progression.wrongPenalty(W, 3, 500).drain;
  assert.equal(huge, Math.round(W.drain[2] * W.drainMaxScale));
});

test('Ceza: ileri bölgede 3 yanlış eşyasız kâşifin su ve ısısını bitirir', () => {
  const W = CONFIG.WRONG_GUESS;
  const total = [1, 2, 3].reduce((sum, n) => sum + Progression.wrongPenalty(W, n, 8).drain, 0);
  assert.ok(total >= 100, `toplam ${total}`);
});

test('Survival: drain anında düşürür, 0 ile sınırlar; ceza katı değişebilir', () => {
  const s = new SurvivalSystem(CONFIG.SURVIVAL);
  assert.equal(s.drain('hydration', 30), 30);
  assert.equal(s.hydration, 70);
  assert.equal(s.drain('hydration', 500), 70);
  assert.equal(s.hydration, 0);
  s.startPenalty(10, 4);
  assert.equal(s.decayMultiplier, 4);
});

// ---------------------------------------------------------------------------
//  Günlük meydan okuma planı
// ---------------------------------------------------------------------------
const { Daily } = require('../js/logic/Daily.js');

const DAILY_DEPS = { locations: LOCATIONS, tiers: CONFIG.PROGRESSION.tiers, climateWeather: CLIMATE_WEATHER, Progression, WeatherPicker };

test('Günlük: aynı tarih → birebir aynı plan; farklı tarih → farklı plan', () => {
  const a = Daily.plan('2026-10-30', DAILY_DEPS);
  const b = Daily.plan('2026-10-30', DAILY_DEPS);
  const c = Daily.plan('2026-10-31', DAILY_DEPS);
  assert.deepEqual(a, b);
  assert.notDeepEqual(a.map((p) => p.locationId), c.map((p) => p.locationId));
});

test('Günlük: 5 farklı konum, aynı iklim arka arkaya gelmez, kademeler 1-2 / 3-4 / 5', () => {
  for (let d = 0; d < 60; d++) {
    const key = Daily.shiftKey('2026-01-01', d);
    const plan = Daily.plan(key, DAILY_DEPS);
    assert.equal(plan.length, 5);
    assert.equal(new Set(plan.map((p) => p.locationId)).size, 5);
    const locs = plan.map((p) => LOCATIONS.find((l) => l.id === p.locationId));
    for (let i = 1; i < 5; i++) assert.notEqual(locs[i].climate, locs[i - 1].climate, key);
    assert.deepEqual(plan.map((p) => p.tierIndex), [0, 0, 1, 1, 2]);
    plan.forEach((p) => assert.ok(Number.isInteger(p.seed) && p.seed >= 0));
  }
});

test('Günlük: tarih anahtarı Türkiye saatine göre (UTC 22:30 → ertesi gün)', () => {
  assert.equal(Daily.dateKey(new Date('2026-10-30T20:30:00Z')), '2026-10-30');
  assert.equal(Daily.dateKey(new Date('2026-10-30T21:30:00Z')), '2026-10-31');
});

test('Günlük: seri hesabı ve paylaşım metni', () => {
  assert.equal(Daily.streak(['2026-10-28', '2026-10-29', '2026-10-30'], '2026-10-30'), 3);
  assert.equal(Daily.streak(['2026-10-28', '2026-10-29'], '2026-10-30'), 2); // bugün henüz oynanmadı: seri sürüyor
  assert.equal(Daily.streak(['2026-10-27'], '2026-10-30'), 0);
  const t = Daily.shareText({ key: '2026-10-30', results: [{ stars: 3 }, { stars: 2 }], solved: 2, score: 450, timeMs: 125000, streak: 4 });
  assert.match(t, /30 Ekim 2026/);
  assert.match(t, /🟩🟨💀⬛⬛  2\/5/);
  assert.match(t, /2:05/);
  assert.match(t, /🔥 4 gün/);
});

// ---------------------------------------------------------------------------
//  Rozetler
// ---------------------------------------------------------------------------
const { Achievements } = require('../js/logic/Achievements.js');
const loc = (id) => LOCATIONS.find((l) => l.id === id);
const solved = (id, extra = {}) => ({ loc: loc(id), stars: 2, wrongs: 1, seconds: 90, hp: 100, night: false, weather: 'clear', level: 1, runScore: 100, ...extra });

test('Rozet: ilk kurtuluş tek seferlik, kademeli rozet bronz → gümüş', () => {
  const a = new Achievements();
  const first = a.levelSolved(solved('amazon'));
  assert.ok(first.some((u) => u.def.id === 'first_escape'));
  assert.equal(a.levelSolved(solved('amazon')).some((u) => u.def.id === 'first_escape'), false);
  let ups = [];
  for (let i = 0; i < 25; i++) ups = ups.concat(a.levelSolved(solved('perth', { wrongs: 0 })));
  const sharp = ups.filter((u) => u.def.id === 'first_try').map((u) => u.tierName);
  assert.deepEqual(sharp, ['Bronz', 'Gümüş']);
});

test('Rozet: iklim ve kıta kümeleri tekrarı saymaz; iki yarım küre aynı oyunda', () => {
  const a = new Achievements();
  a.levelSolved(solved('antalya'));
  a.levelSolved(solved('madrid'));
  assert.equal(a.value('climates'), 1);
  assert.equal(a.value('continents'), 2);
  a.runStart();
  a.levelSolved(solved('antalya'));
  assert.equal(a.value('flag_hemispheres'), 0);
  const u = a.levelSolved(solved('perth'));
  assert.ok(u.some((x) => x.def.id === 'hemispheres'));
});

test('Rozet: eşya kullanınca tasarruf serisi sıfırlanır; gizli rozetler', () => {
  const a = new Achievements();
  a.runStart();
  a.levelSolved(solved('amazon'));
  a.levelSolved(solved('kahire'));
  a.itemUsed();
  a.levelSolved(solved('madrid'));
  assert.equal(a.value('bestNoItemStreak'), 2);
  const u = a.levelSolved(solved('darwin', { wrongs: 3, hp: 10 }));
  assert.ok(u.some((x) => x.def.id === 'clutch'));
  assert.ok(u.some((x) => x.def.id === 'last_breath'));
});

test('Rozet: kalıcı kayıt (storage) okunur ve yazılır', () => {
  const mem = new Map();
  const storage = { getItem: (k) => mem.get(k) || null, setItem: (k, v) => mem.set(k, v) };
  const a = new Achievements(storage);
  a.crateOpened();
  a.levelSolved(solved('yakutsk', { night: true }));
  const b = new Achievements(storage);
  assert.equal(b.value('crates'), 1);
  assert.equal(b.value('nightEscapes'), 1);
  assert.equal(b.list().find((x) => x.def.id === 'night').tier, 1);
  assert.ok(b.summary().got >= 2);
});
