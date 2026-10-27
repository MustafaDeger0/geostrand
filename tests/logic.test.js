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
