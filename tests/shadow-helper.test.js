'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const GS = {};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../js/ui/GeographerPad.js'), 'utf8'), { window: { GS } });
const Pad = GS.GeographerPad;

test('shadow helper accepts Turkish and decimal-point measurements including zero', () => {
  assert.equal(Pad.latitudeFromShadow('0,58'), 30);
  assert.equal(Pad.latitudeFromShadow(' 0.58 '), 30);
  assert.equal(Pad.latitudeFromShadow('1'), 45);
  assert.equal(Pad.latitudeFromShadow('0'), 0);
  assert.equal(Pad.latitudeFromShadow('2,75'), 70);
  assert.equal(Pad.latitudeFromShadow('.58'), 30);
});

test('shadow helper rejects missing, negative, non-finite and non-decimal measurements', () => {
  for (const value of ['', ' ', '-1', 'Infinity', 'NaN', 'abc', '0,5,8', '0x10', '1e3']) {
    assert.equal(Pad.latitudeFromShadow(value), null, String(value));
  }
});

function helper() {
  const elements = {
    'shadow-length': { value: '' },
    'shadow-answer': { textContent: '' },
    'shadow-load': { disabled: true },
  };
  const pad = Object.create(Pad.prototype);
  pad.doc = { getElementById: (id) => elements[id] };
  pad.notes = new Map();
  pad.clueIds = ['tree', 'soil', 'sunstick'];
  pad.el = { count: { textContent: '' } };
  pad._renderSlot = () => {};
  return { pad, elements };
}

test('inspecting the sun stick automatically fills its measurement and explains the estimate', () => {
  const { pad, elements } = helper();
  pad.addNote({ id: 'sunstick', shadow: { length: Math.tan(Math.PI / 6), direction: 'N' } });
  assert.equal(elements['shadow-length'].value, '0,58');
  assert.equal(elements['shadow-load'].disabled, false);
  assert.match(elements['shadow-answer'].textContent, /30°/);
  assert.match(elements['shadow-answer'].textContent, /Tahmin/);
  assert.equal(pad.el.count.textContent, '1/3');
});

test('manual calculation and restoring the observed measurement do not change the prediction', () => {
  const { pad, elements } = helper();
  const prediction = { latitude: 45 };
  pad.el.latInput = prediction;
  pad.addNote({ id: 'sunstick', shadow: { length: 1, direction: 'S' } });
  elements['shadow-length'].value = '0.58';
  pad._syncShadowCalculation();
  assert.match(elements['shadow-answer'].textContent, /30°/);
  assert.equal(prediction.latitude, 45);
  pad._useShadowMeasurement();
  assert.equal(elements['shadow-length'].value, '1,00');
  assert.match(elements['shadow-answer'].textContent, /45°/);
  elements['shadow-length'].value = 'yanlış';
  pad._syncShadowCalculation();
  assert.match(elements['shadow-answer'].textContent, /0,58/);
});
