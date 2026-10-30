/**
 * ============================================================================
 *  GeoStrand — Konum (Seviye) Veri Tablosu — 19 gerçek konum, 6 kıta
 * ============================================================================
 *  Oyuncu her seviyede bu konumlardan birine "düşer". Haritadaki nesneler
 *  ipucu verir; bazıları ancak ileri kademelerde açılır (Config → PROGRESSION):
 *    🌳 Ağaç          → bitki örtüsü         (iklim)
 *    🟫 Toprak        → toprak tipi          (iklim)
 *    📏 Güneş çubuğu  → öğle gölgesi         (yarım küre + enlem; otomatik hesap)
 *    📡 Yükselti ölçer→ yükselti + eğim      (yer şekli; Bölge 3'ten itibaren)
 *    🐾 Hayvan izleri → yaban hayatı         (kıta; Bölge 5'ten itibaren)
 *
 *  ALANLAR:
 *    hemisphere : 'KUZEY' | 'GUNEY'
 *    latitude   : mutlak enlem (0–90)
 *    lon        : boylam (doğu +, batı −) — yalnızca kurtuluş haritasında işaret için
 *    climate    : climates.js anahtarı
 *    landform   : 'OVA' | 'PLATO' | 'DAG'  (harita da buna göre çizilir)
 *    elevation  : yükselti (m)
 *    continent  : continents.js anahtarı
 *    treeStyle  : 'broadleaf' | 'palm' | 'cactus' | 'olive' | 'conifer' | 'shrub' | 'acacia'
 *    clues      : tree / soil / fauna → {tags: 3 anahtar kelime, text: en fazla 6 kelime}
 *
 *  Bilinçli eşleştirmeler (öğretici karşılaştırma için):
 *    • Mumbai (ova) ↔ Pune (Dekkan Platosu): aynı iklim, aynı enlem, farklı yer şekli
 *    • Kahire (çölde ova: Nil'in alüvyonu) ↔ Tassili (çölde plato)
 *    • Amazon 3° G ↔ Kuala Lumpur 3° K: gölge çok kısa, yönü farklı
 *    • Akdeniz iklimi 4 kıtada: Antalya, Madrid, Cape Town, Perth (+ Atlas dağları)
 * ============================================================================
 */
(function (GS) {
  'use strict';

  GS.LOCATIONS = [
    // ------------------------------------------------------------ EKVATORAL
    {
      id: 'amazon', name: 'Amazon Havzası (Manaus), Brezilya',
      hemisphere: 'GUNEY', latitude: 3, lon: -60.0, climate: 'EKVATORAL', landform: 'OVA', elevation: 90, continent: 'GUNEY_AMERIKA',
      treeStyle: 'broadleaf', soilColor: 0xb5562e,
      clues: {
        tree: { tags: ['Hep yeşil', 'Çok katlı', 'Sarmaşıklı'], text: 'Sık, geniş yapraklı orman.' },
        soil: { tags: ['Kırmızı', 'Killi', 'Islak'], text: 'Yağmur besinleri yıkamış.' },
        fauna: { tags: ['Pembe yunus', 'Tukan', 'Jaguar'], text: 'Nehirde pembe bir yunus.' },
      },
    },
    {
      id: 'kualalumpur', name: 'Kuala Lumpur (Klang Vadisi), Malezya',
      hemisphere: 'KUZEY', latitude: 3, lon: 101.7, climate: 'EKVATORAL', landform: 'OVA', elevation: 60, continent: 'ASYA',
      treeStyle: 'broadleaf', soilColor: 0xa9502d,
      clues: {
        tree: { tags: ['Hep yeşil', 'Yağ palmiyesi', 'Sık orman'], text: 'Orman ve palmiye bahçeleri.' },
        soil: { tags: ['Kırmızı', 'Killi', 'Islak'], text: 'Her gün sağanak yağıyor.' },
        fauna: { tags: ['Malaya tapiri', 'Gergedan kuşu', 'Makak'], text: 'Siyah-beyaz tapir izleri.' },
      },
    },

    // ------------------------------------------------------------ ÇÖL
    {
      id: 'tassili', name: "Tassili n'Ajjer Platosu, Cezayir",
      hemisphere: 'KUZEY', latitude: 25, lon: 8.5, climate: 'COL', landform: 'PLATO', elevation: 1500, continent: 'AFRIKA',
      treeStyle: 'acacia', soilColor: 0xd9a868,
      clues: {
        tree: { tags: ['Akasya', 'Sahra servisi', 'Çok seyrek'], text: 'Kayalar arasında tek tük ağaç.' },
        soil: { tags: ['Kum', 'Kaya', 'Kupkuru'], text: 'Rüzgâr kayaları oymuş.' },
        fauna: { tags: ['Fennek tilkisi', 'Deve', 'Kertenkele'], text: 'Büyük kulaklı tilki izi.' },
      },
    },
    {
      id: 'kahire', name: 'Kahire (Nil Deltası), Mısır',
      hemisphere: 'KUZEY', latitude: 30, lon: 31.2, climate: 'COL', landform: 'OVA', elevation: 23, continent: 'AFRIKA',
      treeStyle: 'palm', soilColor: 0x4d3c2c,
      clues: {
        tree: { tags: ['Hurma', 'Nehir kıyısı', 'Tarla'], text: 'Nehir boyunca yeşil şerit.' },
        soil: { tags: ['Alüvyon', 'Koyu', 'Verimli'], text: 'Nehrin getirdiği kara mil.' },
        fauna: { tags: ['Deve', 'İbis kuşu', 'Manda'], text: 'Tarlada çalışan mandalar.' },
      },
    },
    {
      id: 'atacama', name: 'Atacama Çölü (Calama), Şili',
      hemisphere: 'GUNEY', latitude: 22, lon: -68.9, climate: 'COL', landform: 'PLATO', elevation: 2260, continent: 'GUNEY_AMERIKA',
      treeStyle: 'cactus', soilColor: 0xc9a98a,
      clues: {
        tree: { tags: ['Kaktüs', 'Dikenli', 'Seyrek'], text: 'Yaprak yerine diken var.' },
        soil: { tags: ['Çakıl', 'Tuz kabuğu', 'Kupkuru'], text: 'Yıllardır yağmur yağmamış.' },
        fauna: { tags: ['Vikunya', 'Lama', 'Flamingo'], text: 'Tuz gölünde pembe flamingolar.' },
      },
    },

    // ------------------------------------------------------------ AKDENİZ
    {
      id: 'antalya', name: 'Antalya Ovası, Türkiye',
      hemisphere: 'KUZEY', latitude: 37, lon: 30.7, climate: 'AKDENIZ', landform: 'OVA', elevation: 40, continent: 'ASYA',
      treeStyle: 'olive', soilColor: 0xa8432a,
      clues: {
        tree: { tags: ['Zeytin', 'Kızılçam', 'Maki'], text: 'Sert, parlak yapraklı çalılar.' },
        soil: { tags: ['Kırmızı', 'Kireçli', 'Yazın kuru'], text: 'Terra rossa toprağı.' },
        fauna: { tags: ['Caretta caretta', 'Keklik', 'Yaban keçisi'], text: 'Kumsalda kaplumbağa izleri.' },
      },
    },
    {
      id: 'madrid', name: 'Madrid (İber Meseta Platosu), İspanya',
      hemisphere: 'KUZEY', latitude: 40, lon: -3.7, climate: 'AKDENIZ', landform: 'PLATO', elevation: 650, continent: 'AVRUPA',
      treeStyle: 'olive', soilColor: 0x9a6a44,
      clues: {
        tree: { tags: ['Pırnal meşesi', 'Zeytin', 'Kuru ot'], text: 'Seyrek meşeler, sarı otlar.' },
        soil: { tags: ['Kahverengi', 'Kireçli', 'Yazın kuru'], text: 'Yazın çatlamış toprak.' },
        fauna: { tags: ['İber vaşağı', 'Toy kuşu', 'Yaban domuzu'], text: 'Püsküllü kulaklı kedi izi.' },
      },
    },
    {
      id: 'capetown', name: 'Cape Town (Cape Flats), Güney Afrika',
      hemisphere: 'GUNEY', latitude: 34, lon: 18.4, climate: 'AKDENIZ', landform: 'OVA', elevation: 30, continent: 'AFRIKA',
      treeStyle: 'shrub', soilColor: 0xb8a07a,
      clues: {
        tree: { tags: ['Fynbos', 'Sert yaprak', 'Kokulu'], text: 'Makiye benzeyen çalılık.' },
        soil: { tags: ['Kumlu', 'Fakir', 'Yazın kuru'], text: 'Yağmur kışın geliyor.' },
        fauna: { tags: ['Afrika pengueni', 'Babun', 'Fok'], text: 'Kıyıda penguenler var!' },
      },
    },
    {
      id: 'atlas', name: 'Atlas Dağları (Ifrane), Fas',
      hemisphere: 'KUZEY', latitude: 33, lon: -5.1, climate: 'AKDENIZ', landform: 'DAG', elevation: 1650, continent: 'AFRIKA',
      treeStyle: 'conifer', soilColor: 0x7d5a3c,
      clues: {
        tree: { tags: ['Atlas sediri', 'Pırnal meşesi', 'Yamaç'], text: 'Dağ yamacında sedir ormanı.' },
        soil: { tags: ['Kahverengi', 'Taşlı', 'İnce'], text: 'Yamaçta ince, taşlı toprak.' },
        fauna: { tags: ['Berberi maymunu', 'Kartal', 'Yaban domuzu'], text: 'Ağaçta kuyruksuz maymunlar.' },
      },
    },
    {
      id: 'perth', name: 'Perth (Swan Kıyı Ovası), Avustralya',
      hemisphere: 'GUNEY', latitude: 32, lon: 115.9, climate: 'AKDENIZ', landform: 'OVA', elevation: 20, continent: 'OKYANUSYA',
      treeStyle: 'olive', soilColor: 0xc9ab7d,
      clues: {
        tree: { tags: ['Okaliptüs', 'Banksia', 'Sert yaprak'], text: 'Kokulu, sert yapraklı ağaçlar.' },
        soil: { tags: ['Kumlu', 'Fakir', 'Yazın kuru'], text: 'Kış yağmurlarıyla yeşeriyor.' },
        fauna: { tags: ['Kanguru', 'Emu', 'Kara kuğu'], text: 'Gölde siyah kuğular.' },
      },
    },

    // ------------------------------------------------------------ MUSON
    {
      id: 'mumbai', name: 'Mumbai (Kıyı Ovası), Hindistan',
      hemisphere: 'KUZEY', latitude: 19, lon: 72.9, climate: 'MUSON', landform: 'OVA', elevation: 14, continent: 'ASYA',
      treeStyle: 'broadleaf', soilColor: 0x4a3b30,
      clues: {
        tree: { tags: ['Tik', 'Bambu', 'Yaprak döken'], text: 'Kurak mevsimde yaprak döker.' },
        soil: { tags: ['Koyu', 'Killi', 'Çeltik'], text: 'Yağmurda çamura dönüyor.' },
        fauna: { tags: ['Langur', 'Tavus kuşu', 'Manda'], text: 'Yolda tavus kuşu dolaşıyor.' },
      },
    },
    {
      id: 'pune', name: 'Pune (Dekkan Platosu), Hindistan',
      hemisphere: 'KUZEY', latitude: 18, lon: 73.9, climate: 'MUSON', landform: 'PLATO', elevation: 560, continent: 'ASYA',
      treeStyle: 'broadleaf', soilColor: 0x2f2a26,
      clues: {
        tree: { tags: ['Tik', 'Yaprak döken', 'Seyrek'], text: 'Kurakta çıplak kalan ağaçlar.' },
        soil: { tags: ['Kara toprak', 'Bazalt', 'Pamuk'], text: 'Lavdan oluşmuş kara toprak.' },
        fauna: { tags: ['Hint antilobu', 'Tavus kuşu', 'Kobra'], text: 'Bozkırda antilop sürüsü.' },
      },
    },
    {
      id: 'darjeeling', name: 'Darjeeling (Himalayalar), Hindistan',
      hemisphere: 'KUZEY', latitude: 27, lon: 88.3, climate: 'MUSON', landform: 'DAG', elevation: 2040, continent: 'ASYA',
      treeStyle: 'broadleaf', soilColor: 0x5a4632,
      clues: {
        tree: { tags: ['Çay bahçesi', 'Ormangülü', 'Bulut ormanı'], text: 'Yamaçta basamaklı çay bahçeleri.' },
        soil: { tags: ['Kahverengi', 'Asidik', 'Basamaklı'], text: 'Toprak setlerle tutulmuş.' },
        fauna: { tags: ['Kızıl panda', 'Yak', 'Kartal'], text: 'Ağaçta kızıl bir panda!' },
      },
    },
    {
      id: 'darwin', name: 'Darwin (Kıyı Ovası), Avustralya',
      hemisphere: 'GUNEY', latitude: 12, lon: 130.8, climate: 'MUSON', landform: 'OVA', elevation: 30, continent: 'OKYANUSYA',
      treeStyle: 'broadleaf', soilColor: 0xa14a2a,
      clues: {
        tree: { tags: ['Okaliptüs', 'Mangrov', 'Palmiye'], text: 'Kıyıda mangrov ormanı.' },
        soil: { tags: ['Kırmızı', 'Laterit', 'Su basmış'], text: 'Yağmur mevsiminde göllenmiş.' },
        fauna: { tags: ['Kanguru', 'Timsah', 'Kakadu'], text: 'Zıplayan bir hayvanın izleri.' },
      },
    },

    // ------------------------------------------------------------ SERT KARASAL
    {
      id: 'yakutsk', name: 'Yakutsk (Lena Ovası), Rusya',
      hemisphere: 'KUZEY', latitude: 62, lon: 129.7, climate: 'SERT_KARASAL', landform: 'OVA', elevation: 100, continent: 'ASYA',
      treeStyle: 'conifer', soilColor: 0x8c8a86,
      clues: {
        tree: { tags: ['İğne yaprak', 'Karaçam', 'Tayga'], text: 'Koni biçimli, karlı ağaçlar.' },
        soil: { tags: ['Gri', 'Asidik', 'Altı donmuş'], text: 'Podzol; derinde permafrost.' },
        fauna: { tags: ['Yakut atı', 'Ren geyiği', 'Samur'], text: 'Kalın tüylü küçük atlar.' },
      },
    },
    {
      id: 'altay', name: 'Altay Dağları, Rusya',
      hemisphere: 'KUZEY', latitude: 50, lon: 87.0, climate: 'SERT_KARASAL', landform: 'DAG', elevation: 2000, continent: 'ASYA',
      treeStyle: 'conifer', soilColor: 0x6e6a62,
      clues: {
        tree: { tags: ['Sibirya sediri', 'Karaçam', 'Kayalık'], text: 'Dik yamaçta iğne yapraklılar.' },
        soil: { tags: ['Taşlı', 'İnce', 'Donmuş'], text: 'Kayalar arasında ince toprak.' },
        fauna: { tags: ['Kar leoparı', 'Dağ keçisi', 'Kartal'], text: 'Karda iri pençe izleri.' },
      },
    },
    {
      id: 'tura', name: 'Orta Sibirya Platosu (Tura), Rusya',
      hemisphere: 'KUZEY', latitude: 64, lon: 100.2, climate: 'SERT_KARASAL', landform: 'PLATO', elevation: 600, continent: 'ASYA',
      treeStyle: 'conifer', soilColor: 0x7f7c76,
      clues: {
        tree: { tags: ['Karaçam', 'Tayga', 'Seyrek'], text: 'Uçsuz bucaksız karaçam ormanı.' },
        soil: { tags: ['Podzol', 'Gri', 'Permafrost'], text: 'Altı donmuş, gri toprak.' },
        fauna: { tags: ['Ren geyiği', 'Boz ayı', 'Samur'], text: 'Kocaman ayı pençesi izi.' },
      },
    },

    // ------------------------------------------------------------ TUNDRA
    {
      id: 'kanada', name: 'Baker Lake (Kıyı Ovası), Kanada',
      hemisphere: 'KUZEY', latitude: 64, lon: -96.0, climate: 'TUNDRA', landform: 'OVA', elevation: 20, continent: 'KUZEY_AMERIKA',
      treeStyle: 'shrub', soilColor: 0x5b5246,
      clues: {
        tree: { tags: ['Ağaç yok', 'Yosun', 'Liken'], text: 'Bitkiler yere yapışık.' },
        soil: { tags: ['Bataklık', 'Sığ', 'Permafrost'], text: 'Hemen altı donmuş.' },
        fauna: { tags: ['Misk öküzü', 'Karibu', 'Kutup tilkisi'], text: 'Uzun tüylü, boynuzlu sürü.' },
      },
    },
    {
      id: 'brooks', name: 'Brooks Sıradağları, Alaska (ABD)',
      hemisphere: 'KUZEY', latitude: 68, lon: -152.0, climate: 'TUNDRA', landform: 'DAG', elevation: 1400, continent: 'KUZEY_AMERIKA',
      treeStyle: 'shrub', soilColor: 0x6a6258,
      clues: {
        tree: { tags: ['Ağaç yok', 'Liken', 'Cüce söğüt'], text: 'Yamaçta yalnız alçak bitkiler.' },
        soil: { tags: ['Taşlı', 'Sığ', 'Permafrost'], text: 'Çakıllı, donmuş yamaç.' },
        fauna: { tags: ['Dall koyunu', 'Boz ayı', 'Kar tavşanı'], text: 'Kayalıkta beyaz dağ koyunları.' },
      },
    },
  ];
})(typeof module !== 'undefined' && module.exports ? module.exports : (window.GS = window.GS || {}));
