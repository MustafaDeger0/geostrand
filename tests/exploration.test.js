'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { Navigation } = require('../js/logic/Navigation.js');
const { Residents } = require('../js/data/residents.js');
const { LOCATIONS } = require('../js/data/locations.js');
function load(relative, GS = {}) {
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', relative), 'utf8'), { window: { GS } });
  return GS;
}
function grid(cols, rows, blocked = []) {
  const map = { C: 16, cols, rows, blocked: new Uint8Array(cols * rows) };
  blocked.forEach(([x, y]) => { map.blocked[y * cols + x] = 1; });
  return map;
}
function clearSegments(map, route) {
  route.forEach((p, k) => {
    assert.equal(map.blocked[Math.floor(p.y / map.C) * map.cols + Math.floor(p.x / map.C)], 0);
    if (!k) return;
    const a = route[k - 1], dx = Math.sign(p.x - a.x), dy = Math.sign(p.y - a.y);
    assert.ok(dx === 0 || dy === 0, 'no diagonal corner cutting');
    for (let x = a.x, y = a.y; x !== p.x || y !== p.y; x += dx * map.C, y += dy * map.C) {
      assert.equal(map.blocked[Math.floor(y / map.C) * map.cols + Math.floor(x / map.C)], 0);
    }
  });
}
test('tap across a river follows its only bridge rather than crossing water', () => {
  const blocked = [];
  for (let y = 0; y < 20; y++) if (y !== 15) blocked.push([10, y]);
  const map = grid(24, 20, blocked);
  const route = Navigation.findPath(map, { x: 40, y: 40 }, { x: 344, y: 40 });
  assert.ok(route.length > 3);
  assert.ok(route.some((p) => p.y === 248), 'detours to bridge row');
  clearSegments(map, route);
  assert.equal(route[route.length - 1].x, 344);
});
test('unreachable bank and distant out-of-map targets do not create a direct unsafe route', () => {
  const map = grid(10, 10, Array.from({ length: 10 }, (_, y) => [5, y]));
  assert.deepEqual(Navigation.findPath(map, { x: 24, y: 24 }, { x: 136, y: 24 }, 16), []);
  assert.deepEqual(Navigation.findPath(map, { x: 24, y: 24 }, { x: 5000, y: 5000 }), []);
  assert.deepEqual(Navigation.findPath(map, { x: 24, y: 24 }, { x: NaN, y: 24 }), []);
});
test('an obstacle target ends at a reachable approach cell within interaction distance', () => {
  const map = grid(12, 12, [[8, 8], [8, 7], [7, 8]]);
  const goal = { x: 136, y: 136 };
  const route = Navigation.findPath(map, { x: 24, y: 24 }, goal, 45);
  assert.ok(route.length);
  const end = route[route.length - 1];
  assert.ok(Math.hypot(end.x - goal.x, end.y - goal.y) <= 45);
  clearSegments(map, route);
});
test('mandatory clue placement keeps clues apart and approaches reachable across 100 seeds', () => {
  const { WorldBuilder } = load('js/game/systems/WorldBuilder.js');
  for (let seed = 1; seed <= 100; seed++) {
    let state = seed;
    const rng = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
    const builder = Object.create(WorldBuilder.prototype);
    Object.assign(builder, { cfg: { width: 2400, height: 1800 }, spawn: { x: 1200, y: 900 },
      cluePoints: [], blockers: [], _isReachable: (x, y) => x > 80 && y > 80 && x < 2320 && y < 1720 });
    builder._findSpot = (r, ring) => {
      const a = rng() * Math.PI * 2, d = ring.minFromSpawn + rng() * (ring.maxFromSpawn - ring.minFromSpawn);
      const p = { x: builder.spawn.x + Math.cos(a) * d, y: builder.spawn.y + Math.sin(a) * d };
      return builder._insideAny(builder.blockers, p.x, p.y, r) ? null : p;
    };
    for (let i = 0; i < 5; i++) builder._reserveClue(45, { minFromSpawn: 260, maxFromSpawn: 760 });
    for (let i = 0; i < 5; i++) for (let j = i + 1; j < 5; j++) {
      const a = builder.cluePoints[i], b = builder.cluePoints[j];
      assert.ok(Math.hypot(a.x - b.x, a.y - b.y) >= 300);
    }
  }
});
test('crowded-ring fallback still refuses unreachable clue positions', () => {
  const { WorldBuilder } = load('js/game/systems/WorldBuilder.js');
  const builder = Object.create(WorldBuilder.prototype);
  Object.assign(builder, { cfg: { width: 1200, height: 1000 }, spawn: { x: 600, y: 500 },
    cluePoints: [], blockers: [], _findSpot: () => null,
    _isReachable: (x, y) => x < 400 && y < 400 });
  const p = builder._reserveClue(40, { minFromSpawn: 260, maxFromSpawn: 760 });
  assert.ok(p.x < 400 && p.y + 10 < 400);
});
test('old saved explorers get a valid hat color and color changes produce distinct sprites', () => {
  const { CharacterRenderer: renderer } = load('js/render/CharacterRenderer.js');
  const old = renderer.normalize({ name: 'Ada', hat: 'safari' });
  assert.equal(old.hatColor, '#c9a35a');
  assert.equal(renderer.normalize({ hatColor: 'invalid' }).hatColor, old.hatColor);
  assert.notEqual(renderer.hash(old), renderer.hash({ ...old, hatColor: '#2f6fd6' }));
  for (const hat of ['safari', 'beanie', 'cap']) {
    const colors = [];
    const ctx = new Proxy({}, { get: (target, key) => target[key] || (() => {}), set: (target, key, value) => {
      if (key === 'fillStyle') colors.push(value); target[key] = value; return true;
    } });
    renderer.drawFrame(ctx, renderer.normalize({ hat, hatColor: '#2f6fd6' }), 'down', 0);
    assert.ok(colors.includes('#2f6fd6'), hat + ' uses selected color');
  }
});
test('every playable climate has contextual resident dialogue and travel advice', () => {
  const climates = new Set(LOCATIONS.map((location) => location.climate));
  assert.ok(climates.size >= 6);
  for (const location of LOCATIONS) for (const i of [0, 1]) {
    const speech = Residents.dialogue(location, i);
    assert.ok(speech.name && speech.text.length > 50 && speech.tip.length > 20);
    assert.ok(!speech.text.includes(location.name));
  }
});
