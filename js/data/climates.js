/**
 * ============================================================================
 *  GeoStrand — İklim Tipleri Veri Tablosu
 * ============================================================================
 *  Her iklim beş şeyi belirler:
 *   1) OYUN ETKİSİ : Su ve vücut ısısının ne hızla düştüğü (çarpanlar).
 *   2) ZEMİN       : Arka plan doku renkleri (ground / ground2 / patch).
 *   3) ARAZİ       : Haritada hangi yer şekillerinin çıkacağı (terrain).
 *   4) SES         : Ortam sesi karışımı (audio).
 *   5) REHBER      : Nasıl oynanır → İklimler sayfasındaki bilgi kartı (guide).
 *
 *  Çarpanlar 1.0 = taban hız. tempDay/tempNight arasında gece-gündüz
 *  oranına göre yumuşak geçiş (lerp) yapılır.
 *
 *  terrain alanları:
 *    river        : Haritayı kesen nehir (+ köprü) olsun mu?
 *    lakes        : Göl sayısı
 *    lakeStyle    : 'water' | 'oasis' | 'frozen'
 *    mountains    : Dağ kümesi sayısı
 *    mountainStyle: 'jungle' | 'mesa' | 'limestone' | 'snowy'
 *    boulders     : Büyük kaya (engel) sayısı
 *    dunes        : Kum tepesi (görsel) sayısı
 *
 *  audio alanları (0–1 arası yoğunluk):
 *    wind, rain, birds (gündüz), insects (gece), surface (ayak sesi zemini)
 * ============================================================================
 */
(function (GS) {
  'use strict';

  GS.CLIMATES = {
    EKVATORAL: {
      key: 'EKVATORAL',
      label: 'Ekvatoral',
      icon: '🌴',
      hydrationFactor: 1.3,   // Bunaltıcı nem, bol terleme
      tempDayFactor: 0.15,    // Yıl boyu sıcak: ısı neredeyse hiç düşmez
      tempNightFactor: 0.4,
      groundColor: 0x2c5a28,
      groundColor2: 0x3b7031,
      patchColor: 0x24491f,
      decor: ['grass', 'bush', 'fern', 'flower'],
      terrain: { river: true, lakes: 1, lakeStyle: 'water', mountains: 1, mountainStyle: 'jungle', boulders: 3, dunes: 0 },
      audio: { wind: 0.12, rain: 0.35, birds: 1.0, insects: 0.9, surface: 'grass' },
      summary: 'Yıl boyu sıcak ve yağışlı; hep yeşil yağmur ormanı.',
      guide: {
        where: 'Ekvator çevresi, yaklaşık 0°–10°',
        temp: 'Yıl boyu 25–28 °C; mevsim farkı yok denecek kadar az',
        rain: 'Her mevsim bol (yılda 2000 mm üstü), öğleden sonra sağanak',
        plants: 'Çok katlı, hep yeşil yağmur ormanları',
        soil: 'Yağmurla yıkanmış kırmızı laterit',
        examples: 'Amazon, Kongo Havzası, Malezya, Endonezya',
      },
    },
    COL: {
      key: 'COL',
      label: 'Çöl',
      icon: '🏜️',
      hydrationFactor: 2.2,   // Kavurucu güneş, kuru hava: su çok hızlı biter
      tempDayFactor: 0.1,
      tempNightFactor: 1.6,   // Bulut yok, ısı geceleri hızla kaybolur
      groundColor: 0xd3a95f,
      groundColor2: 0xe4c27e,
      patchColor: 0xc39553,
      decor: ['pebble', 'dryshrub', 'rock'],
      terrain: { river: false, lakes: 1, lakeStyle: 'oasis', mountains: 2, mountainStyle: 'mesa', boulders: 5, dunes: 12 },
      audio: { wind: 0.8, rain: 0, birds: 0.05, insects: 0.25, surface: 'sand' },
      summary: 'Yağış çok az; gece ile gündüz arasında sıcaklık farkı büyük.',
      guide: {
        where: 'Dönenceler çevresi, yaklaşık 15°–30°; kıta içleri ve batı kıyıları',
        temp: 'Gündüz çok sıcak, gece soğuk: günlük fark 30 °C’yi bulabilir',
        rain: 'Çok az (yılda 250 mm altı)',
        plants: 'Seyrek: kaktüs, akasya, kurakçıl çalılar; vahalarda hurma',
        soil: 'Kum, çakıl, tuz kabuğu; organik madde çok az',
        examples: 'Sahra, Arabistan, Atacama, Orta Avustralya',
      },
    },
    AKDENIZ: {
      key: 'AKDENIZ',
      label: 'Akdeniz',
      icon: '🫒',
      hydrationFactor: 1.0,
      tempDayFactor: 0.4,
      tempNightFactor: 0.9,
      groundColor: 0x7d8c47,
      groundColor2: 0x94a156,
      patchColor: 0xa8875a,  // kuru, kızıl toprak lekeleri
      decor: ['grass', 'rock', 'flower', 'dryshrub'],
      terrain: { river: false, lakes: 1, lakeStyle: 'water', mountains: 2, mountainStyle: 'limestone', boulders: 7, dunes: 0 },
      audio: { wind: 0.3, rain: 0, birds: 0.6, insects: 0.8, surface: 'grass' }, // ağustos böcekleri
      summary: 'Yazı sıcak ve kurak, kışı ılık ve yağışlı; maki bitki örtüsü.',
      guide: {
        where: 'Yaklaşık 30°–45°, kıtaların batı kıyıları',
        temp: 'Yaz sıcak, kış ılık',
        rain: 'Yağış kışın; yaz kurak geçer',
        plants: 'Maki, zeytin, kızılçam, pırnal meşesi',
        soil: 'Kireçtaşı üzerinde kırmızı terra rossa',
        examples: 'Akdeniz kıyıları, Kaliforniya, Orta Şili, Cape Town, Perth',
      },
    },
    MUSON: {
      key: 'MUSON',
      label: 'Muson',
      icon: '🌧️',
      hydrationFactor: 0.9,
      tempDayFactor: 0.3,
      tempNightFactor: 0.7,
      groundColor: 0x46702f,
      groundColor2: 0x58843a,
      patchColor: 0x5d6b3a,
      decor: ['grass', 'puddle', 'bush', 'reed'],
      terrain: { river: true, lakes: 1, lakeStyle: 'water', mountains: 1, mountainStyle: 'jungle', boulders: 2, dunes: 0 },
      audio: { wind: 0.2, rain: 0.75, birds: 0.6, insects: 0.6, surface: 'mud' },
      summary: 'Yaz yağmurları çok güçlü, kışlar kurak geçer.',
      guide: {
        where: 'Güney ve Güneydoğu Asya, Kuzey Avustralya; yaklaşık 10°–30°',
        temp: 'Yıl boyu sıcak',
        rain: 'Yazın okyanustan esen muson rüzgârlarıyla çok yağışlı, kışın kurak',
        plants: 'Kurakta yaprak döken muson ormanları, bambu; çeltik tarımı',
        soil: 'Koyu, killi; platolarda bazalttan kara toprak',
        examples: 'Hindistan, Bangladeş, Vietnam, Kuzey Avustralya',
      },
    },
    SERT_KARASAL: {
      key: 'SERT_KARASAL',
      label: 'Sert Karasal',
      icon: '🌲',
      hydrationFactor: 0.8,
      tempDayFactor: 1.4,     // Gündüz bile soğuk
      tempNightFactor: 2.2,
      groundColor: 0x5c6c50,
      groundColor2: 0x6c7b5c,
      patchColor: 0xe6edef,  // kar lekeleri
      decor: ['snow', 'grass', 'rock'],
      terrain: { river: false, lakes: 1, lakeStyle: 'frozen', mountains: 2, mountainStyle: 'snowy', boulders: 4, dunes: 0 },
      audio: { wind: 0.6, rain: 0, birds: 0.15, insects: 0, surface: 'snow' },
      summary: 'Kışı çok uzun ve dondurucu; iğne yapraklı tayga ormanı.',
      guide: {
        where: 'Yaklaşık 50°–70° Kuzey, kıta içleri (yalnızca Kuzey Yarım Küre)',
        temp: 'Kış çok uzun ve sert (−40 °C’ye iner), yaz kısa ve ılık',
        rain: 'Az; çoğu yaz aylarında',
        plants: 'Tayga: iğne yapraklı karaçam, çam, ladin',
        soil: 'Gri, asidik podzol; derinde donmuş toprak',
        examples: 'Sibirya, Kanada içleri, İskandinavya içleri',
      },
    },
    TUNDRA: {
      key: 'TUNDRA',
      label: 'Tundra',
      icon: '❄️',
      hydrationFactor: 0.7,
      tempDayFactor: 1.8,
      tempNightFactor: 2.6,   // En hızlı ısı kaybı
      groundColor: 0x87917f,
      groundColor2: 0x9aa392,
      patchColor: 0xeef3f5,
      decor: ['snow', 'rock', 'moss'],
      terrain: { river: false, lakes: 3, lakeStyle: 'frozen', mountains: 1, mountainStyle: 'snowy', boulders: 7, dunes: 0 },
      audio: { wind: 1.0, rain: 0, birds: 0.05, insects: 0, surface: 'snow' },
      summary: 'Ağaç yetişmez; yosun, liken ve donmuş toprak (permafrost).',
      guide: {
        where: 'Kutup çevresi, yaklaşık 60°–75°',
        temp: 'En sıcak ay bile 10 °C’nin altında',
        rain: 'Çok az; çoğu kar',
        plants: 'Ağaç yetişmez: yosun, liken, cüce söğüt',
        soil: 'Sığ, bataklık; altı kalıcı donmuş (permafrost)',
        examples: 'Kuzey Kanada, Alaska, Sibirya kıyıları, Grönland kıyıları',
      },
    },
  };

  /** Yarım küre seçenekleri (form için) */
  GS.HEMISPHERES = {
    KUZEY: { key: 'KUZEY', label: 'Kuzey', short: 'K' },
    GUNEY: { key: 'GUNEY', label: 'Güney', short: 'G' },
  };
})(typeof module !== 'undefined' && module.exports ? module.exports : (window.GS = window.GS || {}));
