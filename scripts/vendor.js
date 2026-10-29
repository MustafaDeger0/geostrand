/**
 * Dış kütüphaneleri projeye kopyalar (internet olmadan da çalışsın diye).
 *   node scripts/vendor.js   (npm install'dan sonra; çıktılar depoya eklenir)
 *
 *   js/vendor/phaser.min.js      ← phaser (oyun motoru)
 *   js/vendor/socket.io.min.js   ← socket.io-client (çevrim içi yarış)
 *   fonts/*.woff2 + css/fonts.css ← Atkinson Hyperlegible, Bricolage Grotesque
 *                                   (latin + latin-ext: Türkçe harfler dahil)
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const NM = path.join(ROOT, 'node_modules');
const copy = (from, to) => {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
  console.log('  ✓', path.relative(ROOT, to));
};

copy(path.join(NM, 'phaser/dist/phaser.min.js'), path.join(ROOT, 'js/vendor/phaser.min.js'));
copy(path.join(NM, 'socket.io-client/dist/socket.io.min.js'), path.join(ROOT, 'js/vendor/socket.io.min.js'));

const FONTS = [
  { pkg: '@fontsource/atkinson-hyperlegible', family: 'Atkinson Hyperlegible', file: 'atkinson-hyperlegible', weights: [400, 700] },
  { pkg: '@fontsource/bricolage-grotesque', family: 'Bricolage Grotesque', file: 'bricolage-grotesque', weights: [600, 800] },
];
const RANGES = {
  latin: 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD',
  'latin-ext': 'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF',
};
let css = '/* Yerel yazı tipleri (scripts/vendor.js üretir). Lisans: SIL Open Font License 1.1 */\n';
FONTS.forEach((f) => f.weights.forEach((w) => Object.keys(RANGES).forEach((sub) => {
  const name = `${f.file}-${sub}-${w}-normal.woff2`;
  copy(path.join(NM, f.pkg, 'files', name), path.join(ROOT, 'fonts', name));
  css += `@font-face {\n  font-family: '${f.family}';\n  font-style: normal;\n  font-weight: ${w};\n  font-display: swap;\n  src: url('../fonts/${name}') format('woff2');\n  unicode-range: ${RANGES[sub]};\n}\n`;
})));
fs.writeFileSync(path.join(ROOT, 'css/fonts.css'), css);
console.log('  ✓ css/fonts.css');
