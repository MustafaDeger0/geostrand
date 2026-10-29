/**
 * Mobil uygulamanın içine konacak oyun dosyalarını www/ klasörüne toplar.
 *   npm run build:www     (sonra: npx cap sync)
 * Sunucu kodu, testler ve geliştirme dosyaları uygulamaya girmez.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'www');
const INCLUDE = ['index.html', 'gizlilik.html', 'favicon.ico', 'site.webmanifest', 'css', 'js', 'fonts', 'icons'];

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT);
let files = 0;
function copy(rel) {
  const from = path.join(ROOT, rel);
  if (!fs.existsSync(from)) return;
  const st = fs.statSync(from);
  if (st.isDirectory()) {
    fs.readdirSync(from).forEach((n) => copy(path.join(rel, n)));
    return;
  }
  const to = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
  files += 1;
}
INCLUDE.forEach(copy);
console.log(`www/ hazır: ${files} dosya`);
