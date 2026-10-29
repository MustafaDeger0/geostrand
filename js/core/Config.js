/**
 * ============================================================================
 *  GeoStrand — Oyun Ayarları (Config)
 * ============================================================================
 *  Tüm "sihirli sayılar" burada. Oyun dengesini değiştirmek için
 *  kod içine girmeden yalnızca bu dosyayı düzenlemeniz yeterli.
 * ============================================================================
 */
(function (GS) {
  'use strict';

  GS.APP_VERSION = '1.0.0';

  GS.CONFIG = {
    /** Dünya (harita) boyutu, piksel */
    WORLD: {
      width: 2400,
      height: 1800,
      // climates.js'teki arazi sayıları 1600x1200'lük alan içindir;
      // büyük haritada alanla orantılı çoğaltılır (WorldBuilder).
      terrainBaseArea: 1600 * 1200,
      outerMargin: 1200,      // Harita dışında kameranın gösterebileceği koyu kenar alanı (kâşif hep ortada kalsın)
      decorCount: 320,        // Haritaya serpiştirilen süs nesnesi sayısı
      extraTreeCount: 16,     // İpucu taşımayan, sadece atmosfer için ağaçlar
      clueMinDistance: 170,   // İpucu nesneleri doğuş noktasına en az bu kadar uzak
      clueMaxDistance: 540,   // ...ve en fazla bu kadar uzak
    },

    /** Ekran kenarındaki sarı yön okları: bu bölgeye kadar (dahil) gösterilir. Çevrim içinde hiç yok. */
    GUIDE_ARROWS: {
      untilLevel: 2,
    },

    /**
     * Kamera (tam ekran): yakınlaştırma pencere boyutuna göre hesaplanır.
     * Hedef: hangi ekranda olursa olsun kabaca 1100x680 dünya pikseli görünsün.
     */
    CAMERA: {
      viewWidth: 1100,
      viewHeight: 680,
      minZoom: 0.6,                // telefonda biraz daha uzaktan bak
      maxZoom: 1.7,
    },

    /** Oyuncu */
    PLAYER: {
      speed: 190,             // piksel / saniye
      interactRange: 60,      // E tuşunun çalıştığı en büyük mesafe
    },

    /**
     * Hayatta Kalma Barları (0–100 arası)
     * Saniyelik kayıp formülü:
     *   kayıp = taban × iklimÇarpanı × cezaÇarpanı × dt
     */
    SURVIVAL: {
      max: 100,
      baseHydrationDecay: 0.6,   // Su: saniyede taban kayıp
      baseTempDecay: 0.5,        // Vücut ısısı: saniyede taban kayıp
      hpDamagePerDepletedStat: 5,// Su veya Isı 0 ise saniyede HP kaybı (her biri için)
      hpRegen: 1.5,              // Su ve Isı yeterliyse saniyede HP iyileşmesi
      regenThreshold: 50,        // İyileşme için Su ve Isı'nın en az bu değerde olması
      penaltyMultiplier: 2,      // YANLIŞ tahmin: barlar 2 KAT hızlı düşer
      penaltyDuration: 45,       // Cezanın süresi (oyun saniyesi). Doğru tahmin cezayı siler.
      tempMinC: 28,              // Isı barı 0 iken gösterilen vücut sıcaklığı (°C)
      tempMaxC: 37,              // Isı barı 100 iken gösterilen vücut sıcaklığı (°C)
      criticalLevel: 25,         // HUD'da barın kırmızı yanıp sönme eşiği
    },

    /** Tahmin Ödülü ve Envanter */
    REWARD: {
      bonusAmount: 50,           // DOĞRU tahmin: +50 Su ve +50 Isı
      // true  -> bonus doğrudan barlara eklenir
      // false -> bonus envantere eşya olarak eklenir, oyuncu 1/2 tuşlarıyla kullanır
      autoApply: false,
    },
    INVENTORY: {
      starting: { water: 1, heat: 1 }, // Oyuna başlarken eldeki eşyalar
      items: {
        water: { label: 'Su Matarası', icon: '💧', stat: 'hydration', key: 'ONE' },
        heat:  { label: 'Isı Paketi',  icon: '🔥', stat: 'bodyTemp',  key: 'TWO' },
      },
    },

    /**
     * KADEMELER: Bölge ilerledikçe yeni sorular ve ipuçları açılır, oyun zorlaşır.
     *   fields  : Pad'de cevaplanması gereken alanlar
     *   clues   : haritada bulunması gereken ipucu nesneleri
     *   latitudeTolerance : enlem tahmini için izin verilen hata (±°)
     *   decayMultiplier   : su/ısı kaybı çarpanı (zorluk)
     *   weatherChance     : bölgede hava olayı çıkma olasılığı (0–1)
     *   crates            : haritadaki yardım sandığı sayısı
     */
    PROGRESSION: {
      tiers: [
        {
          fromLevel: 1, name: 'Çaylak kâşif',
          fields: ['hemisphere', 'climate', 'latitude'],
          clues: ['tree', 'soil', 'sunstick'],
          latitudeTolerance: 7, decayMultiplier: 1, weatherChance: 0, crates: 1,
        },
        {
          fromLevel: 3, name: 'Saha araştırmacısı',
          fields: ['hemisphere', 'climate', 'latitude', 'landform'],
          clues: ['tree', 'soil', 'sunstick', 'altimeter'],
          latitudeTolerance: 6, decayMultiplier: 1.1, weatherChance: 0.5, crates: 2,
          unlock: { icon: '📡', title: 'Yeni görev: Yer şekli', text: 'Yükselti ölçeri bul. Burası dağ mı, ova mı, plato mu?' },
        },
        {
          fromLevel: 5, name: 'Usta coğrafyacı',
          fields: ['hemisphere', 'climate', 'latitude', 'landform', 'continent'],
          clues: ['tree', 'soil', 'sunstick', 'altimeter', 'fauna'],
          latitudeTolerance: 5, decayMultiplier: 1.2, weatherChance: 0.65, crates: 2,
          unlock: { icon: '🐾', title: 'Yeni görev: Kıta', text: 'Hayvan izlerini incele. Bu hayvanlar hangi kıtada yaşar?' },
        },
      ],
    },

    /** Puan ve yıldızlar (oyunlaştırma) */
    SCORE: {
      base: 100,            // her kurtuluş
      wrongPenalty: 25,     // her yanlış tahmin için düşülür
      minimum: 25,          // bir bölgeden en az bu kadar puan
      fastTime: 120,        // bu sürede (sn) çözülürse +fastBonus
      fastBonus: 50,
      tierBonus: 25,        // kademe başına ek puan (zor bölge daha çok kazandırır)
      // Yıldız: 3 = hatasız ve hızlı, 2 = en fazla 1 hata, 1 = diğer
    },

    /**
     * ÇEVRİM İÇİ YARIŞ ("kim daha hızlı bilecek")
     * Sunucu (server/) ve oyun aynı değerleri kullanır.
     */
    RACE: {
      countdownMs: 3000,        // tur başlamadan geri sayım
      betweenRoundsMs: 8000,    // tur sonucu ekranı süresi
      lockMs: 8000,             // yanlış tahminden sonra telsiz kilidi
      rankPoints: [100, 80, 65, 55, 50], // 1., 2., 3.… bilen; sonrakiler minPoints
      minPoints: 40,
      wrongPenalty: 10,         // her yanlış tahmin bu turun puanından düşer
      floorPoints: 20,          // bilen oyuncu en az bu kadar alır
      maxPlayers: 20,           // özel oda
      moveRateMs: 100,          // konum paylaşma aralığı (saniyede 10)
      defaults: { rounds: 5, roundTime: 150, difficulty: 'progressive' },
      options: {
        rounds: [3, 5, 8, 10],
        roundTime: [90, 150, 240],
        difficulty: [
          { key: 'progressive', label: 'Kademeli (kolaydan zora)' },
          { key: 'easy', label: 'Kolay: yarım küre, iklim, enlem' },
          { key: 'medium', label: 'Orta: + yer şekli' },
          { key: 'hard', label: 'Zor: + yer şekli + kıta' },
        ],
      },
      // Hızlı eşleşme: dünyanın her yerinden rastgele rakipler
      quick: {
        maxPlayers: 8,
        rounds: 5, roundTime: 120, difficulty: 'progressive',
        startAfterMs: 20000,    // 2. oyuncu gelince 20 sn sonra başlar (8 olursa hemen)
        aloneAfterMs: 25000,    // tek başına 25 sn bekleyen "Yalnız başla" diyebilir
      },
    },

    /**
     * Sunucu adresi. Boş = oyunun açıldığı adres (Render'da oyun ve sunucu aynı yerde).
     * Oyunu başka yerde (ör. GitHub Pages) yayınlarsanız buraya sunucu adresini yazın:
     *   serverUrl: 'https://geostrand.onrender.com'
     * Adres çubuğunda ?sunucu=https://... ile de geçici olarak değiştirilebilir.
     */
    NET: {
      serverUrl: 'https://geostrand.onrender.com',
      // Mobil uygulama (App Store / Google Play) ve dosyadan açılan oyun bu sunucuya bağlanır.
      // Render adresiniz farklıysa burayı değiştirin.
      appServerUrl: 'https://geostrand.onrender.com',
      connectTimeoutMs: 60000,  // ücretsiz sunucu uykudan uyanırken ~30-50 sn sürebilir
    },

    /** Tahmin değerlendirme */
    PREDICTION: {
      latitudeTolerance: 7,      // Enlem tahmini ±7° içindeyse doğru sayılır
    },

    /** Gece / Gündüz döngüsü */
    DAY_NIGHT: {
      dayLengthSec: 180,         // 24 oyun saati = 180 gerçek saniye
      startHour: 9,              // Oyun sabah 09:00'da başlar
      maxDarkness: 0.78,         // Gece ekranın en fazla ne kadar kararacağı (0–1)
      nightColor: 0x0a1030,      // Gece örtüsünün rengi (lacivert)
      lanternRadius: 150,        // Gece oyuncunun etrafındaki fener ışığı yarıçapı
    },

    /** Coğrafyacı Pad'i */
    PAD: {
      // Pad açıkken zaman yavaşlar (0 = durur, 1 = normal).
      // Öğrenciye okuma/düşünme süresi tanır ama gerilimi tamamen yok etmez.
      timeScale: 0.25,
    },
  };
})(typeof module !== 'undefined' && module.exports ? module.exports : (window.GS = window.GS || {}));
