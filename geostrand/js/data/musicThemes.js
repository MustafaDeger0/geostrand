/**
 * ============================================================================
 *  GeoStrand — Müzik Temaları (her iklime bir tane)
 * ============================================================================
 *  Müzik, MusicGenerator tarafından bu tarife göre CANLI üretilir; her
 *  çalışta aynı karakterde ama farklı notalarla çalar (tekrar etmez, sıkmaz).
 *
 *  Alanlar:
 *    root        : Ana nota (MIDI numarası; 60 = Do4). Pad bu oktavda çalar.
 *    mode        : Dizi (makam/mod) adı → MusicGenerator.MODES
 *    bpm         : Tempo (sekizlik notalarla ilerler)
 *    progression : Akor dizisi (dizinin kaçıncı derecesi; 0 = birinci derece)
 *                  Her akor 2 ölçü çalar.
 *    pad         : Arka plan akor sesi {wave, cutoff (filtre Hz)}
 *    bass        : Yumuşak bas notası (bilinçli olarak hafif tutuldu)
 *    drone       : Sürekli kök + beşli sesi (çöl müziği hissi)
 *    arp         : Arpej {instrument, pattern (akor notası sırası, null = sus), density 0–1}
 *    melody      : Ezgi {instrument, scale (dizi dereceleri), density 0–1}
 *    perc        : Hafif vurmalı {kind, pattern (16 adım, 0–1 şiddet)}
 *
 *  Enstrümanlar: marimba, guitar, oud, flute, bell, glass, pluck
 *  Gece olunca ezgi ve arpej seyrekleşir, filtre kapanır (daha sakin).
 * ============================================================================
 */
(function (GS) {
  'use strict';

  GS.MUSIC_THEMES = {
    EKVATORAL: {
      title: 'Yağmur Ormanı',
      root: 62, mode: 'ionian', bpm: 100,
      progression: [0, 5, 3, 4],
      pad: { wave: 'triangle', cutoff: 1500 },
      bass: true,
      arp: { instrument: 'marimba', pattern: [0, 2, 1, 2, 0, 2, 1, 3], density: 0.7 },
      melody: { instrument: 'flute', scale: [0, 1, 2, 4, 5], density: 0.22 },
      perc: { kind: 'shaker', pattern: [0, 0, 0.6, 0, 0, 0, 0.6, 0.3, 0, 0, 0.6, 0, 0, 0.4, 0.6, 0] },
    },
    COL: {
      title: 'Kum Rüzgârı',
      root: 62, mode: 'phrygianDominant', bpm: 84,
      progression: [0, 1, 0, 6],
      pad: { wave: 'sawtooth', cutoff: 800 },
      drone: true,
      arp: { instrument: 'oud', pattern: [0, null, 1, 2, null, 1, 0, null], density: 0.75 },
      melody: { instrument: 'oud', scale: [0, 1, 2, 3, 4, 5, 6], density: 0.28 },
      perc: { kind: 'drum', pattern: [1, 0, 0, 0.5, 0, 0, 0.7, 0, 1, 0, 0, 0.5, 0, 0.4, 0.7, 0] },
    },
    AKDENIZ: {
      title: 'Zeytinlik',
      root: 55, mode: 'mixolydian', bpm: 96,
      progression: [0, 6, 3, 0],
      pad: { wave: 'triangle', cutoff: 1400 },
      bass: true,
      arp: { instrument: 'guitar', pattern: [0, 1, 2, 1, 3, 1, 2, 1], density: 0.8 },
      melody: { instrument: 'flute', scale: [0, 1, 2, 4, 5], density: 0.24 },
      perc: { kind: 'shaker', pattern: [0, 0, 0.4, 0, 0, 0, 0.4, 0, 0, 0, 0.4, 0, 0, 0, 0.4, 0] },
    },
    MUSON: {
      title: 'Muson Yağmuru',
      root: 57, mode: 'dorian', bpm: 76,
      progression: [0, 3, 6, 2],
      pad: { wave: 'triangle', cutoff: 1100 },
      bass: true,
      arp: { instrument: 'pluck', pattern: [0, null, 2, 1, null, 2, 0, 1], density: 0.5 },
      melody: { instrument: 'flute', scale: [0, 2, 3, 4, 6], density: 0.32 },
      perc: { kind: 'rain', pattern: [0.3, 0.2, 0.4, 0.2, 0.3, 0.2, 0.4, 0.2, 0.3, 0.2, 0.4, 0.2, 0.3, 0.2, 0.4, 0.2] },
    },
    SERT_KARASAL: {
      title: 'Tayga',
      root: 52, mode: 'aeolian', bpm: 68,
      progression: [0, 5, 2, 6],
      pad: { wave: 'sawtooth', cutoff: 750 },
      arp: { instrument: 'bell', pattern: [0, null, 1, 2, null, null, 1, null], density: 0.55 },
      melody: { instrument: 'bell', scale: [0, 2, 3, 4, 6], density: 0.2 },
      perc: null,
    },
    TUNDRA: {
      title: 'Kutup Işığı',
      root: 53, mode: 'lydian', bpm: 56,
      progression: [0, 1, 4, 0],
      pad: { wave: 'sine', cutoff: 900 },
      arp: { instrument: 'glass', pattern: [0, null, 2, null, 1, null, 2, null], density: 0.5 },
      melody: { instrument: 'glass', scale: [0, 1, 2, 4, 5], density: 0.18 },
      perc: null,
    },
  };
})(typeof module !== 'undefined' && module.exports ? module.exports : (window.GS = window.GS || {}));
