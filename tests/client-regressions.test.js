'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { CONFIG } = require('../js/core/Config.js');
const { LOCATIONS } = require('../js/data/locations.js');
const { WEATHERS } = require('../js/data/weather.js');
const { ClueFactory } = require('../js/logic/ClueFactory.js');
const { LANDFORMS } = require('../js/data/landforms.js');

function load(relative, GS, extra = {}) {
  const window = { GS, clearTimeout() {}, setTimeout() { return 1; } };
  const context = { window, console, setTimeout: window.setTimeout, clearTimeout() {}, ...extra };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', relative), 'utf8'), context, { filename: relative });
  return GS;
}

function race() {
  let counted = 0;
  const GS = { GameScene: class {}, CONFIG, LOCATIONS, WEATHERS, ClueFactory, LANDFORMS,
    trophies: { report() {} }, achievements: { raceFinished() { counted++; return []; }, raceSolved() { return []; } } };
  load('js/game/scenes/RaceScene.js', GS);
  const scene = new GS.RaceScene();
  const sent = [];
  Object.assign(scene, {
    cfg: CONFIG, dayNight: {}, spawn: { x: 10, y: 10 },
    raceHud: { hideOverlays() {}, startRound() {}, showFinal() {}, showRoundEnd() {} },
    pad: { close() {}, addNote() {}, showRaceSolved() {}, lockSubmit(ms) { this.lock = ms; }, setSending() {} },
    ghosts: { resetAll() {}, sync() {} }, audio: { sfx() {} },
    net: { playerId: 'p1', state: null, progress(n, ids) { sent.push({ n, ids }); }, roundTiming() { return { countdownLeft: 0, playLeft: 1000 }; } },
    hud: { setObjective() {}, toast() {} }, sys: { isActive: () => true },
    evaluator: { validate: () => [] },
    _buildLocation() { this.found = new Set(); this.world = { interactables: [] }; this.tier = CONFIG.PROGRESSION.tiers[0]; },
  });
  const round = (matchId = 'one') => ({ matchId, locationId: LOCATIONS[0].id, tierIndex: 0, weather: 'clear', index: 1, total: 3, seed: 1 });
  return { GS, scene, round, sent, count: () => counted };
}

test('client reconnect restores clues, solved state and cooldown', () => {
  const { scene, round, sent } = race();
  scene._startRound({ ...round(), playerState: { clues: ['tree', 'soil'], solved: true, rank: 1, points: 100, timeMs: 2000 } });
  assert.equal(scene.raceSolved, true);
  assert.equal(scene.found.has('tree'), true);
  assert.equal(sent.at(-1).n, 2);
  scene._startRound({ ...round(), playerState: { clues: ['soil'], solved: false, lockMs: 4000 } });
  assert.equal(scene.raceSolved, false);
  assert.equal(scene.pad.lock, 4000);
});

test('each rematch counts once, including reconnecting to the same first round', () => {
  const { scene, round, count } = race();
  const end = { standings: [{ id: 'p1' }], isPublic: false };
  scene._startRound(round('one'));
  scene._gameOver(end);
  scene._gameOver(end);
  assert.equal(count(), 1);
  scene._startRound(round('two'));
  scene._gameOver(end);
  scene._gameOver(end);
  assert.equal(count(), 2);
});

test('late guess acknowledgement cannot mark the next round as solved', async () => {
  const { scene, round } = race();
  scene._startRound(round());
  scene.raceLocked = false;
  let resolve;
  scene.net.submitGuess = () => new Promise((done) => { resolve = done; });
  const sending = scene._handlePrediction({});
  scene._startRound({ ...round(), index: 2 });
  resolve({ correct: true, rank: 1, points: 100, timeMs: 1000 });
  await sending;
  assert.equal(scene.raceSolved, false);
});

test('learning mode has no survival decay or wrong-answer drain', () => {
  const GS = { CONFIG };
  load('js/game/scenes/GameScene.js', GS, { Phaser: { Scene: class {} } });
  const scene = new GS.GameScene();
  scene.learning = true;
  scene.cfg = CONFIG;
  scene.locations = { levelNumber: 1 };
  scene.levelWrongs = 0;
  scene.wrongsTotal = 0;
  scene.score = { recordWrong() {} };
  scene.pad = { showResult() {} };
  scene.audio = { sfx() {} };
  scene.survival = { drain() { throw new Error('Practice must not drain stats'); } };
  const environment = scene._currentEnvironment();
  assert.equal(environment.hydrationFactor, 0);
  assert.equal(environment.tempFactor, 0);
  scene._punishWrong({ feedback: [] });
  assert.equal(scene.wrongsTotal, 1);
});

test('walkthrough advances only when the player inspects and solves', () => {
  const GS = load('js/ui/LearningCoach.js', {});
  const clues = ['tree', 'soil', 'sunstick'];
  assert.match(GS.LearningCoach.step(new Set(), clues, false).title, /1\/4/);
  assert.match(GS.LearningCoach.step(new Set(['tree']), clues, false).title, /2\/4/);
  assert.match(GS.LearningCoach.step(new Set(clues), clues, false).title, /3\/4/);
  assert.match(GS.LearningCoach.step(new Set(clues), clues, true).title, /4\/4/);
});

function daily() {
  const { Daily } = require('../js/logic/Daily.js');
  const GS = { Daily, creator: { current: { name: 'Test' } } };
  const root = { className: '', setAttribute() {} };
  const doc = { createElement: () => root, body: { appendChild() {} } };
  const storage = { value: null, getItem() { return this.value; }, setItem(key, value) { this.value = value; } };
  load('js/ui/DailyChallenge.js', GS, {
    localStorage: storage, Uint8Array,
  });
  // Constructor's storage accesses use window, so isolate state explicitly after construction.
  const instance = Object.create(GS.DailyChallenge.prototype);
  instance.doc = doc;
  instance.data = { pid: 'ab'.repeat(12), played: {}, started: {}, pending: {}, sessions: {} };
  return { GS, instance, storage };
}

test('daily: offline start becomes practice and does not claim the ranked attempt', async () => {
  const { instance } = daily();
  instance.retryPending = async () => {};
  instance.createRun = () => ({ key: '2026-11-17', ranked: true });
  instance._post = async () => { throw new Error('offline'); };
  const run = await instance.prepareRun();
  assert.equal(run.ranked, false);
  assert.equal(instance.claim(run), false);
  assert.equal(Object.keys(instance.data.started).length, 0);
});

test('daily: pending finish is retained on failure and removed only after acknowledgement', async () => {
  const { instance } = daily();
  instance.data.pending['2026-11-17'] = { action: 'finish', token: 'test' };
  instance._post = async () => { throw new Error('offline'); };
  await instance.retryPending();
  assert.equal(Object.keys(instance.data.pending).length, 1);
  instance._post = async () => ({ ok: true });
  await instance.retryPending();
  assert.equal(Object.keys(instance.data.pending).length, 0);
});
