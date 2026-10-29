/**
 * ============================================================================
 *  GeoStrand — Uygunsuz Ad Süzgeci
 * ============================================================================
 *  Çevrim içi yarışta oyuncu adları yabancılara görünür. App Store (kural 1.2)
 *  ve Google Play, kullanıcıların yazdığı içerik için süzgeç ister.
 *  Uygunsuz bir ad "Kâşif 37" gibi bir adla değiştirilir.
 *
 *  Yanlış alarmı azaltmak için:
 *    • Çok kısa kısaltmalar yalnızca kelimenin kendisiyse, kökler yalnızca
 *      KELİME BAŞINDA aranır ("Işık", "Pico", "Ocak" geçer)
 *    • Uzun ve başka anlamı olmayan kelimeler her yerde aranır
 *  Harf oyunları da yakalanır: 0→o, 1→i, 3→e, 4→a, @→a, $→s, tekrar eden harfler.
 * ============================================================================
 */
'use strict';

// Yalnızca KELİMENİN KENDİSİ olarak aranan çok kısa kısaltmalar
const EXACT = ['aq', 'oc', 'amk', 'amq', 'pic', 'got', 'sic', 'mq'];
// Kelime başında aranan kökler
const PREFIX = [
  'sik', 'amına', 'amina', 'ibne', 'gavat', 'kahpe', 'puşt', 'pust',
  'yarak', 'yarrak', 'taşak', 'tasak', 'dick', 'cock', 'cunt', 'fuck', 'fck', 'shit', 'bitch', 'slut', 'whore',
  'porn', 'sex', 'seks', 'nazi', 'hitler', 'nigg', 'fag', 'rape', 'tecavuz', 'tecavüz', 'anan', 'bacın', 'bacin',
];
// Her yerde aranan uzun, tek anlamlı kelimeler
const ANYWHERE = [
  'orospu', 'orspu', 'amcık', 'amcik', 'siktir', 'sikik', 'pezevenk', 'yavşak', 'yavsak', 'şerefsiz', 'serefsiz',
  'sürtük', 'surtuk', 'dalyarak', 'kaltak', 'gerizekal', 'motherf', 'asshole', 'pussy', 'bastard', 'nigger', 'retard',
];

function normalize(s) {
  return String(s)
    .toLocaleLowerCase('tr')
    .replace(/[0]/g, 'o').replace(/[1!|]/g, 'i').replace(/3/g, 'e').replace(/[4@]/g, 'a')
    .replace(/\$/g, 's').replace(/5/g, 's').replace(/7/g, 't')
    .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ç/g, 'c').replace(/ğ/g, 'g')
    .replace(/(.)\1+/g, '$1');                     // "siiiik" → "sik"
}

const EXACT_N = new Set(EXACT.map(normalize));
const PREFIX_N = [...new Set(PREFIX.map(normalize))];
const ANYWHERE_N = [...new Set(ANYWHERE.map(normalize))];

/** @returns {boolean} ad uygunsuz mu? */
function isOffensive(name) {
  const n = normalize(name);
  const joined = n.replace(/[^a-z]/g, '');                         // "s.i.k" gibi bölmeler
  const words = n.split(/[^a-z]+/).filter(Boolean);
  if (ANYWHERE_N.some((w) => joined.includes(w))) return true;
  if (words.some((w) => EXACT_N.has(w))) return true;
  if (words.some((w) => !SAFE.has(w) && PREFIX_N.some((p) => w.startsWith(p)))) return true;
  // Tamamı birleşik yazılmış kısa kök: "s i k" → "sik"
  if (words.length > 1 && words.every((w) => w.length === 1) && PREFIX_N.some((p) => joined.startsWith(p))) return true;
  return false;
}

// Kısa köklerle başlayan masum kelimeler (normalize edilmiş hâlde)
const SAFE = new Set(['picasso', 'gotik', 'gotham', 'sexton', 'sicak', 'sicaklik', 'sikke', 'sikca', 'gotur', 'goturu', 'anane'].map(normalize));

/** Uygunsuzsa yerine konacak ad */
function safeName(name) {
  return isOffensive(name) ? `Kâşif ${10 + Math.floor(Math.random() * 90)}` : name;
}

module.exports = { isOffensive, safeName, normalize };
