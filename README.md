# GeoStrand: Enlemden Kaçış

**BTE 422 Eğitsel Oyun ve Oyunlaştırma** dersi için 2D top-down eğitsel coğrafya hayatta kalma oyunu.
Motor: **HTML5 + Phaser 3.80** (JavaScript). Kurulum gerektirmez, tarayıcıda çalışır.

**Hikâye (2080):** Küresel İklim Örgütü'nün Geo-Core uydusu ilk canlı ışınlanma testinde bir güneş fırtınasına yakalanır;
Geo-Teleporter'ın koordinat verileri silinir ve baş araştırmacı **Dr. Geo** dünyanın bilinmeyen bir noktasına düşer.
Kurtarma helikopterine S.O.S gönderebilmek için konumunu doğadaki ipuçlarından kendisi hesaplamalıdır.

Oyuncu haritadaki **ağacı**, **toprağı** ve **güneş çubuğunu** inceleyerek
**yarım küreyi**, **iklim tipini** ve **enlemi** tahmin eder. Bölge 3'ten itibaren **yer şekli** (dağ / ova / plato),
Bölge 5'ten itibaren **kıta** sorusu eklenir. Doğru tahmin kurtarma getirir, yanlış tahmin hayatta kalmayı zorlaştırır.

**İçerik:** 19 gerçek konum · 6 kıta · 6 iklim · 3 yer şekli · 5 hava olayı · kişiselleştirilebilir kâşif · rehber ·
**bilgisayar, tablet ve telefonda** oynanır (dokunmatik kontroller) · **🌍 çevrim içi yarış**: dünyanın her yerinden
oyuncularla "kim daha hızlı bilecek?" (hızlı eşleşme ya da oda koduyla).

---

## Çalıştırma

1. Klasörü açın, `index.html` dosyasına çift tıklayın (Chrome / Edge / Firefox).
2. **Göreve başla** düğmesine veya **Enter** tuşuna basın. İlk oyunda **Kâşifini hazırla** ekranı açılır
   (ad, ten rengi, saç modeli/rengi, şapka, ceket, çanta), ardından **açılış animasyonu** oynar (Esc / "Geç" ile atlanır).
   Oyun tüm pencereyi kaplar; **F** ile tam ekrana geçer. Esc menüsündeki **🏠 Ana menü** başlık ekranına döndürür.

> Oyun motoru (Phaser), yazı tipleri ve çevrim içi kütüphanesi projenin içindedir (`js/vendor/`, `fonts/`):
> tek oyunculu mod **internetsiz** çalışır.

## 📱 Mobil Uygulama (App Store · Google Play)

Proje aynı zamanda bir **Android ve iOS uygulaması**dır (Capacitor 8). Uygulama, oyunun dosyalarını telefonun içinde
taşır; çevrim içi yarışta `Config.js → NET.appServerUrl` adresindeki sunucuya (Render) bağlanır.

| Uygulamaya özel | |
|---|---|
| Android geri tuşu | Açık pencereyi kapatır → oyunda menüyü açar → başlık ekranında uygulamadan çıkar |
| Arka plana alınınca | Tek oyunculu oyun duraklar (menü açılır), ses susar; geri gelince ses açılır |
| Ekran | Durum çubuğu gizli, çentik/kenar güvenli alanları korunur, dikey ve yatay |
| Mağaza şartları | Gizlilik politikası (`gizlilik.html`), uygunsuz ad süzgeci, oyuncu gizle/şikâyet et |

Bilgisayarında Android Studio ya da Mac gerekmez: Android GitHub Actions'ta, iOS Codemagic'te bulutta derlenir.
**Adım adım yükleme: [MAGAZA-REHBERI.md](MAGAZA-REHBERI.md)** · mağaza metinleri ve ekran görüntüleri: `store/`.

## 🌍 Çevrim İçi Yarış

Başlık ekranında **🌍 Çevrim içi yarış** → üç yol:

| | Nasıl |
|---|---|
| ⚡ **Hızlı eşleşme** | "Rakip bul" → dünyanın her yerinden rastgele kâşiflerle aynı odaya düşersin. 2. kişi gelince **20 sn** sonra yarış kendiliğinden başlar (8 kişi olursa hemen). 25 sn kimse gelmezse **Yalnız başla** diyebilirsin. 5 tur, 2 dk, kademeli zorluk |
| 🏠 **Oda kur** | 4 harfli kod (ör. `KPZT`) ve paylaşılacak bağlantı alırsın (`…/?oda=KPZT` açılınca kod kendiliğinden yazılır; telefonda "Kopyala" paylaşma menüsünü açar). Tur sayısı (3/5/8/10), süre (1:30 / 2:30 / 4:00) ve zorluk (kademeli, kolay, orta, zor) senin elinde; en fazla 20 kişi |
| 🔑 **Odaya katıl** | Arkadaşının kodunu yaz |

**Yarış kuralları**

| | |
|---|---|
| Aynı harita | Sunucu her tur bir konum ve bir **tohum** (seed) sayısı gönderir; harita bu tohumla kurulur → dünyadaki bütün yarışçılarda birebir aynı |
| Başlangıç | 3-2-1 geri sayım; o zamana kadar kimse yürüyemez |
| Puan | 1. bilen 100, 2. 80, 3. 65, 4. 55, 5. 50, sonrakiler 40 · her yanlış −10 (bilene en az 20) · bilemeyen 0 |
| Yanlış tahmin | Telsiz **8 saniye** kilitlenir (rastgele denemeye karşı); yanlış sorular Pad'de işaretlenir |
| Tur sonu | Herkes bilince ya da süre dolunca. Gerçek konum açıklanır, tur sıralaması gösterilir |
| Rakipler | Haritada kendi kâşif görünümleriyle yürür; sağda canlı sıralama (🔍 kaç ipucu buldu, 🥇 kim bildi). Telefonda sıralamaya dokununca tamamı açılır |
| Bağlantı koparsa | Kendiliğinden yeniden bağlanır, puan korunur (sayfa yenilense bile aynı sekmede geri dönülür) |
| Oyun sonu | Kürsü (ilk üç) + tam sıralama. Özel odada kurucu "Yeniden yarış", hızlı eşleşmede "Yeni rakip ara" |

Yarışta hayatta kalma barları, sandıklar ve gece yoktur (hıza odaklı). Esc menüsündeki **🚪 Yarıştan ayrıl** ya da
**🏠 Ana menü** odadan çıkarır.

**Adil oyun ve güvenlik (internete açık olduğu için):** Cevabı, süreyi ve puanı **sunucu** hesaplar; tarayıcının saati ya da
gönderdiği "bildim" mesajı önemsizdir. Yanlış tahminde sunucu doğru cevabı söylemez. Mesajlar boyut, tür ve hız olarak
denetlenir (sel/spam koruması), oyuncu adları temizlenir ve sayfaya HTML olarak değil metin olarak yazılır, sunucu yalnızca
oyun dosyalarını sunar (sunucu kodu ve ayar dosyaları kapalıdır). Not: Haritayı çizebilmek için konum bilgisi tarayıcıya da
gönderilir; tarayıcının geliştirici araçlarını bilen biri cevabı görebilir. Sınıf/arkadaş yarışı için bu kabul edilebilir bir
sınırdır; puanı yine de sunucu verir.

## 🚀 Çevrim İçi Yayın (Render.com, ücretsiz)

Oyunun internetteki adresi hem oyunu hem çevrim içi sunucuyu taşır; herkes yalnızca bu adresi açar.

**1. Kodu GitHub'a koy** (bir kez)
1. [github.com](https://github.com) → ücretsiz hesap → sağ üstte **+ → New repository** → ad: `geostrand` → **Create repository**.
2. Açılan sayfada **uploading an existing file** bağlantısına tıkla.
3. Zip'ten çıkan `geostrand` klasörünün **içindekileri** (index.html, package.json, render.yaml, css/, js/, server/, tests/…)
   sürükleyip bırak → **Commit changes**. (`node_modules` klasörü varsa yükleme; Render kendisi kurar.)

**2. Render'da yayınla** (bir kez)
1. [render.com](https://render.com) → **Get Started** → GitHub hesabınla giriş yap.
2. **New + → Blueprint** → `geostrand` deposunu seç → **Apply**. (`render.yaml` her ayarı hazır getirir.)
   *Elle kurmak istersen:* **New + → Web Service** → depo → Runtime **Node**, Build Command `npm install --omit=dev`,
   Start Command `npm start`, Instance Type **Free** → **Create Web Service**.
3. 2-3 dakika sonra adresin hazır: `https://geostrand-xxxx.onrender.com`. Bu adresi herkesle paylaş.

**Bilmen gerekenler**
- **Ücretsiz sunucu uyur:** 15 dakika kimse oynamazsa uykuya geçer; sonraki ilk açılış **30-60 sn** sürer (lobi
  "Sunucu uyanıyor…" yazar). Ders/sunum öncesinde adresi bir kez açıp uyandırman yeterli.
- **Güncelleme:** GitHub'daki dosyaları değiştirince Render kendiliğinden yeniden yayınlar.
- **Sunucu tek bölgede** çalışır (Render'da kurarken seçilir; Türkiye için **Frankfurt** önerilir). Başka kıtadan
  oynayanlar biraz daha gecikme yaşar ama sırayı ve süreyi sunucu ölçtüğü için yarış adil kalır.
- **Kendi bilgisayarında denemek:** Node.js 18+ kur → klasörde `npm install` → `npm start` → `http://localhost:3000`
  (aynı Wi-Fi'daki cihazlar ekranda yazan `http://192.168.x.x:3000` adresini açar).
- **Oyunu başka yerde (ör. GitHub Pages) yayınlarsan:** `js/core/Config.js` → `NET.serverUrl` alanına Render adresini yaz
  ya da oyunu `…/index.html?sunucu=https://geostrand-xxxx.onrender.com` ile aç.
- `index.html` dosyasını çift tıklayarak açınca yalnızca tek oyunculu mod çalışır (çevrim içi için sunucu gerekir).

## Telefon ve Tablet

Oyun telefonda ve tablette de tarayıcıdan oynanır; ekran **dikey de yatay da** kullanılabilir.
Dosyaları bir web sunucusuna (ör. GitHub Pages, Netlify, okulun sunucusu) koyup bağlantıyı açmak yeterlidir.

| Dokunuş | İşlev |
|---|---|
| 👉 **Kaydır** | Parmağını ekranda kaydır: altında joystick belirir, o yöne yürürsün (az kaydırınca yavaş yürür) |
| 👆 **Dokun** | Dokunduğun yere yürür. Sarı **?** nesnesine ya da 📦 sandığa dokunursan yanına gidip kendiliğinden inceler |
| 👆 **İncele düğmesi** | Yakında bir nesne varken sağ altta beliren büyük turuncu düğme |
| 💧 🔥 | Su / ısı kullan · 🧭 **Pad** · ☰ **Menü** (ses ve tam ekran telefonda menüdedir) |

- Arayüz ekran boyutuna göre düzenlenir: telefonda göstergeler küçülür, Pad ve menüler tam ekran açılır.
- Kamera yakınlaştırması ekran **alanına** göre hesaplanır; dikey ya da yatay tutulduğunda benzer miktarda harita görünür.
- Çentikli ekranlarda (iPhone) düğmeler güvenli alanın içinde kalır. iPhone Safari tam ekran API'sini desteklemediği için
  orada tam ekran düğmesi gizlenir; "Ana Ekrana Ekle" ile açılırsa oyun tam ekran çalışır.

---

| Tuş | İşlev |
|---|---|
| `WASD` / Ok tuşları | Hareket |
| `E` | Yakındaki nesneyi incele → Coğrafyacı Pad'i açılır · 📦 sandığı aç |
| `P` | Pad'i doğrudan aç (tahmin yapmak için) |
| `Esc` | Pad'i kapat · Pad kapalıyken duraklatma menüsünü aç |
| `1` / `2` | Su Matarası (+50 Su) / Isı Paketi (+50 Isı) kullan (çanta kutularına tıklamak da olur) |
| `F` | Tam ekran aç/kapat |
| `M` | Sesi aç/kapat |

| `R` | Oyun bitince yeniden başla |

Sağ alttaki eylem çubuğu (Pad, ses, tam ekran, menü) fareyle de kullanılır. Fareyle haritaya tıklamak da o noktaya yürütür.

---

## Klasör Yapısı ve Mimari

Kod iki katmana ayrılmıştır. **Mantık katmanı Phaser'ı hiç tanımaz**; bu yüzden oyun kuralları
tarayıcı açmadan Node.js ile test edilebilir ve başka bir motora (Unity, Godot) taşınabilir.
Çevrim içi sunucu da **aynı mantık dosyalarını** (konumlar, değerlendirici, kademeler) kullanır: oyunun ve sunucunun
"doğru cevap" kararı hiçbir zaman farklılaşmaz.

```
geostrand/
├── index.html                  HTML iskeleti: oyun tuvali, HUD, Pad, menü, ekranlar
├── css/style.css               Tüm arayüz stilleri (renkler :root değişkenlerinde)
├── js/
│   ├── core/
│   │   ├── Device.js           Dokunmatik mi klavye mi? (metinler ve düğmeler buna göre)
│   │   ├── SeededRandom.js     Tohumlu rastgele sayı: aynı tohum = aynı harita (çevrim içi)
│   │   ├── Native.js           Mobil uygulama köprüsü: geri tuşu, arka plan, durum çubuğu
│   │   ├── EventBus.js         Modüller arası olay sistemi + olay adları (EVENTS)
│   │   └── Config.js           TÜM denge sayıları (hızlar, bonus, ceza, gün uzunluğu)
│   ├── data/
│   │   ├── climates.js         6 iklim: oyun çarpanları + zemin + arazi + ortam sesi
│   │   ├── locations.js        19 gerçek konum: iklim, yer şekli, yükselti, kıta, ipuçları
│   │   ├── landforms.js        Yer şekilleri (ova/plato/dağ) + kıtalar: harita etkisi + rehber
│   │   ├── weather.js          5 hava olayı: bar etkisi, görsel, "neden olur?"
│   │   └── musicThemes.js      Her iklimin müzik tarifi (dizi, tempo, akorlar, enstrüman)
│   ├── logic/                  ◀ SAF MANTIK (Phaser yok, test edilebilir)
│   │   ├── SurvivalSystem.js   Can / Su / Vücut Isısı algoritması
│   │   ├── DayNightCycle.js    Saat ve ışık seviyesi hesabı
│   │   ├── PredictionEvaluator.js  Tahmin doğru mu? + öğretici geri bildirim
│   │   ├── ClueFactory.js      İpucu metinleri + güneş çubuğu gölge hesabı
│   │   ├── Inventory.js        Eşya adetleri
│   │   ├── LocationManager.js  Seviye sırası (karıştırılmış, aynı iklim arka arkaya gelmez)
│   │   └── Progression.js      Kademeler, puan/yıldız (ScoreKeeper), hava seçimi
│   ├── render/
│   │   └── CharacterRenderer.js  Kâşif çizimi: 4 yön × 4 kare yürüme (oyun + önizleme ortak)
│   ├── game/                   ◀ PHASER KATMANI (çizim, fizik, girdi)
│   │   ├── entities/Player.js        Top-down hareket
│   │   ├── entities/Interactable.js  Ağaç / toprak / güneş çubuğu
│   │   ├── systems/InteractionSystem.js  En yakın nesne + E tuşu / İncele düğmesi
│   │   ├── systems/TouchControls.js  Dokunmatik: kaydır (joystick) ya da dokunduğun yere yürü
│   │   ├── systems/Ghosts.js         Çevrim içi rakiplerin kâşifleri (yumuşak hareket, ad, madalya)
│   │   ├── scenes/RaceScene.js       Çevrim içi yarış (GameScene'den türer)
│   │   ├── systems/TerrainPainter.js Zemin dokusu, dağ, göl, nehir, köprü, kum tepesi çizer
│   │   ├── systems/WorldBuilder.js   Konumdan harita kurar / yıkar (yerleşim + çarpışma)
│   │   ├── systems/LightingOverlay.js Gece karartması + fener ışığı
│   │   ├── systems/WeatherFX.js      Yağmur / kar / kum parçacıkları + pus
│   │   ├── scenes/BootScene.js       Görselleri kodla üretir (resim dosyası yok)
│   │   ├── scenes/GameScene.js       Orkestra şefi: modülleri bağlar, oyun döngüsü
│   ├── audio/                  ◀ SES (Web Audio, dosyasız)
│   │   ├── AudioEngine.js      Kanallar, kompresör, yankı, efektler, ayarlar
│   │   ├── MusicGenerator.js   İklime göre canlı üretilen arka plan müziği
│   │   └── AmbientLayer.js     Rüzgâr, yağmur, su, kuş, böcek, ayak sesi
│   ├── ui/                     ◀ HTML/DOM ARAYÜZÜ
│   │   ├── HUD.js              Barlar, görev, saat, çanta, eylem çubuğu, hayati durum efektleri
│   │   ├── GeographerPad.js    Pop-up form + sonuç şeridi, soruların yanında ✔/✘
│   │   ├── PauseMenu.js        Duraklatma, ses ayarları, nasıl oynanır
│   │   ├── OffscreenIndicators.js  Ekran dışındaki ipuçlarını gösteren kenar okları
│   │   ├── CharacterCreator.js "Kâşifini hazırla" ekranı (canlı önizlemeli)
│   │   ├── IntroCutscene.js    4 sahnelik hikâye girişi (altyazı, ses, geç düğmesi)
│   │   ├── Lobby.js            Çevrim içi: hızlı eşleşme, oda kur / katıl, oyuncular, ayarlar
│   │   ├── RaceHUD.js          Süre, canlı sıralama, geri sayım, tur sonucu, kürsü
│   │   ├── Moderation.js       Oyuncuyu gizle / uygunsuz adı şikâyet et
│   │   └── Guide.js            Rehber: nasıl oynanır, iklimler, yer şekilleri, kıtalar, hava
│   ├── net/
│   │   └── NetClient.js        Sunucuyla konuşma (Socket.IO), otomatik yeniden bağlanma
│   └── main.js                 Oyunu başlatır (tek oyunculu ya da çevrim içi yarış)
├── server/                     ◀ ÇEVRİM İÇİ SUNUCU (Node.js + Socket.IO)
│   ├── server.js               Oyun dosyalarını sunar + odalar, hızlı eşleşme, hız sınırı
│   ├── RaceRoom.js             Yarış kuralları: turlar, sunucu tarafı cevap/süre/puan, şikâyet
│   ├── nameFilter.js           Uygunsuz ad süzgeci (Türkçe + İngilizce, harf oyunlarına dayanıklı)
│   └── test/                   Oda kuralları + gerçek ağ üzerinden botlarla uçtan uca test
├── android/  ios/              ◀ MOBİL UYGULAMA projeleri (Capacitor; simgeler ve açılış ekranı dahil)
├── assets/                     Uygulama simgesi ve açılış ekranının kaynak görselleri
├── store/                      Mağaza metinleri, ekran görüntüleri, öne çıkan görsel
├── scripts/                    vendor.js (kütüphaneleri kopyalar) · build-www.js (uygulama dosyaları)
├── js/vendor/  fonts/          Phaser, Socket.IO istemcisi, yazı tipleri (internetsiz çalışma)
├── gizlilik.html               Gizlilik politikası (mağazalar için)
├── capacitor.config.json       Uygulama kimliği, adı, açılış ekranı ayarları
├── .github/workflows/android.yml  Android'i bulutta derler (.aab + .apk)
├── codemagic.yaml              iOS'u (ve isteğe bağlı Android'i) bulutta derler
├── MAGAZA-REHBERI.md           App Store ve Google Play'e yükleme rehberi
├── package.json                npm start (sunucu) · npm test (tüm testler) · npm run app:sync (uygulama)
├── render.yaml                 Render.com tek tık kurulum ayarı
└── tests/logic.test.js         30 birim testi →  node --test tests/logic.test.js
```

### Modüller nasıl haberleşir? (EventBus)

Modüller birbirini doğrudan çağırmaz; olay yayar ve dinler. `GameScene._bindEvents()` tüm akışı tek yerde gösterir:

```
[E tuşu] InteractionSystem ──INTERACT──▶ GameScene ──▶ Pad.open(ipucu)
Pad formu ──PREDICTION_SUBMIT──▶ GameScene ──▶ PredictionEvaluator.evaluate()
                                     ├─ doğru ▶ Inventory.add() + Survival.clearPenalty()
                                     └─ yanlış ▶ Survival.startPenalty()
SurvivalSystem ──PLAYER_DIED──▶ GameScene ──▶ HUD.showGameOver()
```

---

## Sistemler ve Algoritmalar

### 1. Karakter Hareketi ve Etkileşim
- `Player.tick()`: Tuşlardan yön vektörü oluşur, **normalize edilir** (çaprazda %41 hızlanma olmaz), karakter yöne döner.
  Derinlik = y koordinatı, böylece oyuncu ağacın önünden/arkasından doğru geçer.
- `InteractionSystem.update()`: Menzil içindeki (60 px) **en yakın** nesneyi bulur, üstünde `[E] ...` balonu gösterir,
  E'ye basılınca `INTERACT` olayını yayar. İncelenen nesnenin `?` işareti `✓` olur.

### 2. Coğrafyacı Pad'i ("az yazı, çok görsel")
- Sol: **3 sabit gözlem kartı** (Bitki · Toprak · Gölge). Bulunmayan kart soluk ve kesik çizgili kalır, öğrenci neyin eksik olduğunu bir bakışta görür.
  Bulunan kart **3 renkli etiket + tek kısa cümle** gösterir. Gölge kartında, gölgenin **yönünü ve uzunluğunu çizen küçük bir pusula şeması** vardır.
- Açılır **"Gölgeden enlem bul"** cetveli: gölge uzunluğu ↔ enlem karşılığı tek satırda.
- Sağ: ① **Yarım Küre** ② **İklim** (6 seçenek, `climates.js`'ten otomatik üretilir) ③ **Enlem** (0°–90° kaydırıcı).
- Sonuç **kaydırmadan** görülür:
  - Pad'in altındaki şerit hep görünür: "✘ 2/3 doğru" + yanlış soruların adları, doğruysa ⭐ yıldız, gerçek konum ve "Sonraki bölgeye uç".
  - **Her soru kendi yerinde** yeşil ✔ / kırmızı ✘ çerçeve alır, yanlış sorunun hemen altında o soruya özel ipucu yazar
    (enlem için ↑/↓ yön oku). İlk yanlış soru görünmüyorsa Pad oraya kendiliğinden kayar. Boş bırakılan sorular turuncu işaretlenir.
  - Öğrenci yanlış soruyu değiştirince o sorunun işareti kalkar.
- Pad açıkken zaman **¼ hızda** akar (`CONFIG.PAD.timeScale`), oyuncu durur, Phaser klavyesi susturulur.

### 3. Hayatta Kalma Bar Algoritması (`SurvivalSystem.update`)

Her karede, `dt` saniye için:

```
cezaÇarpanı  = ceza aktifse 2, değilse 1
ısıÇarpanı   = lerp(iklim.gündüzIsı, iklim.geceIsı, gecelikOranı)

Su   -= 0.6 × iklim.suÇarpanı × cezaÇarpanı × dt
Isı  -= 0.5 × ısıÇarpanı      × cezaÇarpanı × dt

Su veya Isı = 0   →  HP -= 5 × (tükenen bar sayısı) × dt
Su ≥ 50 ve Isı ≥ 50 →  HP += 1.5 × dt
HP = 0            →  Oyun biter
```

| Tahmin | Sonuç |
|---|---|
| ✅ **Doğru** (3 alan da doğru) | Envantere **💧 Su Matarası (+50)** ve **🔥 Isı Paketi (+50)** eklenir, aktif ceza anında silinir, sonraki konuma geçilir |
| ❌ **Yanlış** | **45 saniye** boyunca Su ve Isı **2 kat hızlı** düşer (HUD'da kırmızı çizgili bar + sayaç). Tekrar denenebilir |

> Bonusun envantere değil doğrudan barlara eklenmesini isterseniz: `Config.js` → `REWARD.autoApply: true`.

**İklim çarpanları** (oyuncu tahmin yapmadan önce bile ortamı hisseder):

| İklim | Su kaybı | Gündüz ısı kaybı | Gece ısı kaybı |
|---|---|---|---|
| Ekvatoral | 1.3× | 0.15× | 0.4× |
| Çöl | **2.2×** | 0.1× | **1.6×** |
| Akdeniz | 1.0× | 0.4× | 0.9× |
| Muson | 0.9× | 0.3× | 0.7× |
| Sert Karasal | 0.8× | 1.4× | 2.2× |
| Tundra | 0.7× | 1.8× | **2.6×** |

Doğru sayılma: yarım küre ve iklim birebir, **enlem ±7°** içinde (`CONFIG.PREDICTION.latitudeTolerance`).
Yanlışta oyun cevabı söylemez; hangi ipucuna bakılacağını ve enlemin "daha yüksek/düşük" olması gerektiğini söyler.

### 4. Gece/Gündüz Döngüsü (`DayNightCycle`)
- 24 oyun saati = **180 gerçek saniye**; oyun 09:00'da başlar.
- `ışık = smoothstep(−0.45, 0.3, cos((saat − 12)/24 × 2π))` → öğlen 1, gece 0; şafak ve gün batımı yumuşak geçer.
- `LightingOverlay` ekranı lacivert bir örtüyle `(1 − ışık) × 0.78` opaklıkta karartır, gece oyuncunun etrafında fener ışığı açar.
- Gece, iklimin **gece ısı çarpanını** devreye sokar: çölde ve tundrada geceleri hızla üşürsün.
- Güneş çubuğunun gölgesi gündüz görünür, gece kaybolur.

---

### 5. Arazi ve Arka Plan (`TerrainPainter` + `WorldBuilder`)
- **Zemin:** Her iklim için kodla üretilen, kenarları dikişsiz birleşen gürültü dokusu (iki katman "value noise" + tanecik),
  üstüne yumuşak kenarlı büyük renk bölgeleri (kar örtüsü, kuru toprak, koyu çimen) ve harita kenarında sis.
- **Yer şekilleri** iklime göre değişir ve hepsi **geçilmez engeldir**:

| İklim | Yer şekilleri |
|---|---|
| Ekvatoral | Nehir + ahşap köprü, göl ve sazlar, ağaçlı yeşil tepe |
| Çöl | Hurmalı vaha, kızıl mesa kayalıkları, kum tepeleri, büyük kayalar |
| Akdeniz | Göl, gri kireçtaşı dağlar, bol kaya, kır çiçekleri |
| Muson | Nehir + köprü, göl, su birikintileri, yeşil tepe |
| Sert Karasal | Donmuş göl, karlı dağlar, kar lekeleri |
| Tundra | 3 donmuş göl, karlı dağ, kayalar, yosun/liken |

- **Yerleştirme sırası:** büyükten küçüğe (nehir → dağ → göl → kaya → ipucu nesneleri → süs). Dolu alanlar daire listesinde
  tutulduğu için ipucu nesneleri hiçbir zaman gölün ya da dağın içine düşmez. Doğuş noktası çevresi hep boş kalır.
- Yeni yer şekli eklemek: `TerrainPainter`'a bir `drawX` fonksiyonu, `WorldBuilder`'a bir `_buildX` fonksiyonu, `climates.js` → `terrain`'e bir alan.

### 6. Ses: Müzik + Ortam (`AudioEngine`, `MusicGenerator`, `AmbientLayer`)
Tüm sesler **Web Audio API ile kodla üretilir**; ses dosyası yoktur.

**Ses yolu:** müzik / ortam / efekt kanalı → ana ses → **kompresör** (patlama ve cızırtı olmaz) → hoparlör.
Müzik ayrıca hafif bir **yankıdan** geçer. Dört kanalın düzeyi duraklatma menüsünden ayarlanır ve tarayıcıda hatırlanır.

**Müzik** (`musicThemes.js`): her iklimin kendi dizisi, temposu ve enstrümanı vardır; notalar her çalışta yeniden üretilir, tekrar etmez.

| İklim | Tema | Dizi | Tempo | Ezgi enstrümanı |
|---|---|---|---|---|
| Ekvatoral | Yağmur Ormanı | Majör | 100 | Marimba + flüt, çalkalayıcı |
| Çöl | Kum Rüzgârı | Hicaz benzeri (frigyen dominant) | 84 | Ud + def, dem sesi |
| Akdeniz | Zeytinlik | Miksolidyen | 96 | Gitar + flüt |
| Muson | Muson Yağmuru | Doryen | 76 | Tel + flüt, yağmur tıkırtısı |
| Sert Karasal | Tayga | Doğal minör | 68 | Çan |
| Tundra | Kutup Işığı | Lidyen | 56 | Cam |

Gece olunca ezgi seyrekleşir ve akorların tınısı yumuşar. İklim değişince eski müzik 1 saniyede kısılır, yenisi 2 saniyede açılır.
Notalar Web Audio saatine göre 0,25 saniye önceden planlanır; oyun karesi takılsa bile ritim kaymaz.

> **Önceki sürümdeki "sadece bas uğultu" hatası neden oluyordu?** Her kuş/böcek sesi için yaratılan ses düğümleri hiç
> ayrılmıyordu; zamanla binlercesi birikip ses işlemcisini boğuyordu. Ayrıca 2 saniyelik "kahverengi gürültü" döngüsü
> her turda bas bir "güm" üretiyordu. Artık her nota bitince düğümleri ayrılıyor (`AudioEngine.play`), kahverengi gürültü
> kaldırıldı ve akorlar alçak oktavda çalınmıyor. 60 saniyelik testte aynı anda çalan nota sayısı 7–21 arasında sabit kalıyor.

**Ortam sesleri:** iklimin karışımı `climates.js` → `audio` alanındadır.

| Ses | Nasıl üretilir | Ne zaman |
|---|---|---|
| 🌬️ Rüzgâr | Beyaz gürültü + bant geçiren filtre, rastgele esinti | Hep (çöl, tundrada güçlü; gece biraz artar) |
| 🌧️ Yağmur | Beyaz gürültü + yüksek geçiren filtre | Muson, Ekvatoral |
| 🌊 Su | Beyaz gürültü + bant geçiren, dalgalanan filtre | Göle/nehre yaklaştıkça artar (donmuş göl sessiz) |
| 🐦 Kuşlar | Hızlı frekans kaydırmalı osilatör, sağ-sol konumlu | Gündüz |
| 🦗 Cırcır böceği | Yüksek frekanslı kısa darbe dizisi | Gece, sıcak iklimler |
| 👣 Ayak sesi | Zemine göre filtrelenmiş gürültü (çimen/kum/kar/çamur) | Yürürken |
| Efektler | İncele bip, Pad "vın", doğru arpej, yanlış uğultu, eşya, ölüm, varış | Olaylarda |

Tarayıcılar sesi ancak kullanıcı etkileşiminden sonra başlatır; ses bu yüzden "Göreve başla" tıklamasında açılır.

### 7. Tam Ekran ve Arayüz / Kullanıcı Deneyimi
- **Tam ekran:** Oyun tuvali her zaman pencere kadardır (`Phaser.Scale.RESIZE`). Kamera yakınlaştırması ekran boyutuna göre
  hesaplanır (`CONFIG.CAMERA`), böylece küçük dizüstünde de büyük monitörde de benzer miktarda dünya görünür.
  Dünya 2400×1800'e büyütüldü; arazi sayıları alanla orantılı artar. **F** tuşu tüm sayfayı tam ekrana alır (HUD dahil).
- **Görsel dil:** "Saha keşif çantası". Koyu harita mürekkebi paneller, açık renkli saha defteri (Pad), topoğrafik eş yükselti
  çizgileri, yalnızca ana eylemlerde kurtarma fişeği turuncusu. Başlıklar *Bricolage Grotesque*, metinler okunabilirlik
  için tasarlanmış *Atkinson Hyperlegible*.
- **Görev göstergesi (üst orta):** Oyuncuya her an sıradaki adımı söyler: *Bölgeyi keşfet (1/3)* → *Koordinatı gönder* → *Kurtarma hazır*.
- **Ekran dışı okları:** İncelenmemiş ipucu nesnesi ekranda değilse kenarda yönünü gösteren sarı ok ve simgesi belirir.
- **Eylem çubuğu ve çanta:** Pad, ses, tam ekran, menü ve eşyalar fareyle de kullanılabilir; her düğmede klavye kısayolu yazar.
- **Duraklatma menüsü (Esc):** Oyun tamamen durur. Müzik / doğa sesleri / efekt / ana ses kaydırıcıları, nasıl oynanır, tam ekran,
  baştan başla (yanlışlıkla basılmasın diye iki kez onay ister).
- **Uçuş perdesi:** Doğru tahminden sonra bölgeler arası kısa bir geçiş.
- **Hayati durum efektleri:** Barlar düştükçe ekran da değişir, öğrenci HUD'a bakmadan durumu hisseder:

  | Durum | Ekranda |
  |---|---|
  | ❤️ Can < 60 | Ekran giderek kararır, renkler solar, kenarlar koyu kırmızı; can < 35'te **kalp atışı** gibi nabız (can azaldıkça hızlanır) |
  | 💧 Su < 35 | Sıcak, kavruk turuncu kenarlar, görüntü sepyaya döner |
  | 🌡️ Isı < 35 | Buz mavisi kırağı kenarlar, soğuk renk tonu |

  Ortada ne yapılacağını söyleyen bir uyarı çıkar ("💧 Susuz kalıyorsun · Su Matarası kullan"); uyarıya dokununca/tıklayınca
  eşya kullanılır, çantadaki ilgili eşya da parlar.
- **Erişilebilirlik:** Klavye odağı görünür, `prefers-reduced-motion` açıksa animasyonlar kapanır, dar ekranda düzen sadeleşir.

### 8. Kademeler ve Çeşitlilik ("her bölge farklı")

| Bölge | Unvan | İpucu nesneleri | Sorular | Enlem toleransı | Ek |
|---|---|---|---|---|---|
| 1–2 | Çaylak kâşif | 🌳 🟫 📏 | Yarım küre, iklim, enlem | ±7° | 1 sandık |
| 3–4 | Saha araştırmacısı | + 📡 Yükselti ölçer | + **Yer şekli** | ±6° | Hava olayı %50, 2 sandık, kayıp ×1,1 |
| 5+ | Usta coğrafyacı | + 🐾 Hayvan izleri | + **Kıta** | ±5° | Hava olayı %65, kayıp ×1,2 |

Yeni kademe açıldığında ekranın ortasında bir afiş çıkar; görev göstergesi ve Pad yeni ipucu/soruya göre büyür.
Ayarlar: `Config.js → PROGRESSION`.

- **Yer şekli haritayı değiştirir** (`landforms.js → terrain`):
  - *Ova:* dağ yok; nehir ve kıyısında tarlalar (çölde buğday, Akdeniz'de meyve bahçesi, musonda çeltik).
  - *Plato:* yüksek düzlüğü derin bir **kanyon** yarar; karşıya yalnızca bir patikadan geçilir.
  - *Dağ:* her yanda zirveler; 2000 m üstünde karlı dağlar.
- **Yükselti ölçer** yükseklik ve eğim etiketleri verir: ova = alçak + düz, plato = yüksek + düz, dağ = yüksek + dik.
- **Hayvan izleri** kıtayı ele verir (kanguru → Okyanusya, lama → Güney Amerika, kızıl panda → Asya...).
- **Hava olayları:** kum fırtınası, sıcak hava dalgası, sağanak, tipi, sis. Barların düşüş hızını değiştirir, ekranda görünür,
  ortam sesini güçlendirir; sağ üstte etki kartı çıkar.
- **Yardım sandıkları (📦):** haritada uzakta; açınca hangi bar daha düşükse ona yarayan eşya çıkar.
- **Puan ve yıldız:** her kurtuluş 100 puan, yanlış başına −25, 120 saniyede çözersen +50, kademe başına +25.
  ⭐⭐⭐ hatasız ve hızlı, ⭐⭐ en fazla bir hata, ⭐ diğer. En iyi puan tarayıcıda saklanır.
- **Sıralama:** 19 konum karıştırılır, aynı iklim arka arkaya gelmez (300 oyunluk denemede 0 çakışma).

**Bilinçli eşleştirmeler:** Mumbai (ova) ile Pune (Dekkan Platosu) aynı iklim ve enlemde ama yer şekli farklı;
Kahire çölde bir ova (Nil'in alüvyonu); Amazon 3° G ile Kuala Lumpur 3° K'de gölge çok kısa ama yönü farklı;
Akdeniz iklimi dört kıtada (Antalya, Madrid, Cape Town, Perth).

### 9. Kâşif (karakter)
- `CharacterRenderer` kâşifi Canvas ile çizer: büyük kafalı 3/4 bakış, 4 yön, 4 karelik yürüme (bacak/kol salınımı, adımda hafif zıplama).
- **Kâşifini hazırla** ekranı: ad, 5 ten rengi, 5 saç modeli, 6 saç rengi, 4 şapka, 6 ceket rengi, 4 çanta rengi, 🎲 rastgele.
  Canlı önizleme yürür ve döner (↺ ↻). Seçim tarayıcıda saklanır; HUD'da kâşifin adı ve portresi görünür.
- Oyun sırasında **Esc → Kâşifi düzenle** ile değiştirilir; karakter anında yeni görünüme geçer.

### 10. Açılış Animasyonu (`IntroCutscene.js`)

"Göreve başla"ya basınca 4 sahnelik hikâye girişi oynar. Görseller kodla (HTML/CSS/SVG) çizilir, sesler Web Audio ile üretilir;
resim, video ya da ses dosyası yoktur. Altyazılar daktilo efektiyle akar.

| Sahne | Görsel | Ses | Altyazı |
|---|---|---|---|
| 1. Laboratuvar ve uydu krizi | Pencerede Geo-Core uydusu, güneşten yayılan patlama halkaları uyduyu vurur; kırmızı döner alarm ışıkları, çöken sinyal grafikleri, ekran cızırtısı | İki tonlu siren, statik cızırtı | "2080… Geo-Core uydusu yörüngede ağır bir güneş fırtınasına yakalandı. Sistem çöküyor!" |
| 2. Kuantum sıçraması | Işınlanma kapsülünde **oyuncunun kendi kâşifi**; koordinatlar (00°00′N…) hızla rastgele değişir, ERR kodları düşer, halkalar hızlanır; mavi-beyaz patlama ve ekran sarsıntısı | Yükselen enerji uğultusu, patlama + gümbürtü | "HATA: Koordinat verileri silindi!…" |
| 3. Düşüş ve bilinmezlik | Ekran kararır, **göz kapakları** kırparak açılır, bulanıklık geçer: **gerçek oyun haritası**. Rüzgâr çizgileri, Dr. Geo yerden kalkar, üstünü silkeler, etrafına bakar; "📻 SİNYAL YOK" | Düşüş sesi, cızırtılı telsiz, iklimin rüzgârı | "Neredeyim ben?… Telsiz sinyal alamıyor…" |
| 4. Maceranın başlangıcı | Kamera kâşiften uzaklaşır (zoom-out), sinema şeritleri açılır; Can/Su/Isı barları, saat, görev, çanta ve **Pad** düğmesi sırayla ekrana kayar | Odaklanma sesi, her parça için bilgi bip'i | "Güneşin konumuna, toprağa ve bitkilere bak…" **[ OYUNA BAŞLAMAK İÇİN TIKLA ]** |

- Tıklama / dokunma / Enter: yazı akıyorsa tamamlar, akmışsa sonraki sahneye geçer. Sahneler kendiliğinden de ilerler; son sahne tıklama bekler.
- **Geç ⏭** ya da Esc: animasyonu atlayıp doğrudan oyuna geçer.
- 2. sahnedeki patlamanın beyaz ışığı ekranı kaplarken oyun arka planda kurulur; 3. ve 4. sahne oyunun kendi haritasında,
  oyuncunun kâşifiyle oynar (`GameScene` → `cineWake`, `cineZoomOut`, `endCinematic`). Animasyon sürerken zaman akmaz.
- Telefon dikey/yatay ve tablette sahne düzenleri ekrana göre yeniden yerleşir.

**Rapor için (Oynanış → Tema/Hikâye):** Oyun, oyuncuyu doğrudan anlatının içine çekmek ve motivasyonu (eğitsel stresi) artırmak
amacıyla 4 sahneli bir açılış animasyonu (Intro Cutscene) ile başlar. Bu animasyon, Dr. Geo'nun deneysel bir kaza sonucu
koordinatlarını kaybetmesini ve hayatta kalabilmek için coğrafi ipuçlarını çözmek zorunda kalışını görselleştirir. Oyuncu
böylece ders içeriğini bir zorunluluk olarak değil, karakteri kurtarmak için gerekli bir "hayatta kalma aracı" olarak algılar.

### 11. Yardım Sandıkları (📦)
Sandık açılınca: sandık zıplayıp kapağı açılır, eşyanın renginde parıltılar saçılır, simge sandıktan yükselir ve ekranın
ortasında büyük bir **ganimet kartı** çıkar (ne çıktı, ne işe yarar, çantada kaç tane var, nasıl kullanılır). Kart kapanırken
simge çantadaki yuvasına uçar ve yuva zıplar. Art arda açılan sandıklar sıraya girer.

### 12. Rehber
Başlık ekranından, menüden ve Pad'deki **📖 Rehber** düğmesinden açılır. İçerik veri dosyalarından üretilir:
- **Hikâye:** 2080, Geo-Core, Geo-Teleporter ve Dr. Geo'nun kazası
- **Nasıl oynanır:** adımlar, kademe tablosu, puan/yıldız, hayatta kalma, tuşlar
- **İklimler:** her iklim için nerede, sıcaklık, yağış, bitki örtüsü, toprak, örnek yerler
- **Yer şekilleri:** ova / plato / dağ karşılaştırması, oluşum, örnekler
- **Kıtalar:** kısa tanım ve tanıtıcı hayvanlar
- **Hava olayları:** neden olur, barlara etkisi, hangi iklimlerde görülür

## Eğitsel Tasarım: Güneş Çubuğu (Gnomon)

Ekinoks günü öğlen **güneşin yükseklik açısı = 90° − enlem**, **gölge / çubuk = 1 / tan(yükseklik açısı)**.
Oyun, gölge uzunluğunu konumun gerçek enleminden hesaplar (`ClueFactory.sunStickClue`); öğrenci tersini yaparak enlemi bulur.
Kuzey Yarım Küre'de gölge kuzeye (ekranda yukarı), Güney'de güneye düşer. HUD'daki pusula kuzeyin yukarıda olduğunu gösterir.

| Konum | Yarım küre | İklim | Enlem | Yer şekli | Kıta | Öğle gölgesi (1 m çubuk) |
|---|---|---|---|---|---|---|
| Amazon Havzası (Manaus), Brezilya | Güney | Ekvatoral | 3° | Ova (90 m) | Güney Amerika | 0,05 m → güneye |
| Kuala Lumpur (Klang Vadisi), Malezya | Kuzey | Ekvatoral | 3° | Ova (60 m) | Asya | 0,05 m → kuzeye |
| Darwin (Kıyı Ovası), Avustralya | Güney | Muson | 12° | Ova (30 m) | Okyanusya | 0,21 m → güneye |
| Pune (Dekkan Platosu), Hindistan | Kuzey | Muson | 18° | Plato (560 m) | Asya | 0,32 m → kuzeye |
| Mumbai (Kıyı Ovası), Hindistan | Kuzey | Muson | 19° | Ova (14 m) | Asya | 0,34 m → kuzeye |
| Atacama Çölü (Calama), Şili | Güney | Çöl | 22° | Plato (2.260 m) | Güney Amerika | 0,40 m → güneye |
| Tassili n'Ajjer Platosu, Cezayir | Kuzey | Çöl | 25° | Plato (1.500 m) | Afrika | 0,47 m → kuzeye |
| Darjeeling (Himalayalar), Hindistan | Kuzey | Muson | 27° | Dağ (2.040 m) | Asya | 0,51 m → kuzeye |
| Kahire (Nil Deltası), Mısır | Kuzey | Çöl | 30° | Ova (23 m) | Afrika | 0,58 m → kuzeye |
| Perth (Swan Kıyı Ovası), Avustralya | Güney | Akdeniz | 32° | Ova (20 m) | Okyanusya | 0,62 m → güneye |
| Atlas Dağları (Ifrane), Fas | Kuzey | Akdeniz | 33° | Dağ (1.650 m) | Afrika | 0,65 m → kuzeye |
| Cape Town (Cape Flats), Güney Afrika | Güney | Akdeniz | 34° | Ova (30 m) | Afrika | 0,67 m → güneye |
| Antalya Ovası, Türkiye | Kuzey | Akdeniz | 37° | Ova (40 m) | Asya | 0,75 m → kuzeye |
| Madrid (İber Meseta Platosu), İspanya | Kuzey | Akdeniz | 40° | Plato (650 m) | Avrupa | 0,84 m → kuzeye |
| Altay Dağları, Rusya | Kuzey | Sert Karasal | 50° | Dağ (2.000 m) | Asya | 1,19 m → kuzeye |
| Yakutsk (Lena Ovası), Rusya | Kuzey | Sert Karasal | 62° | Ova (100 m) | Asya | 1,88 m → kuzeye |
| Orta Sibirya Platosu (Tura), Rusya | Kuzey | Sert Karasal | 64° | Plato (600 m) | Asya | 2,05 m → kuzeye |
| Baker Lake (Kıyı Ovası), Kanada | Kuzey | Tundra | 64° | Ova (20 m) | Kuzey Amerika | 2,05 m → kuzeye |
| Brooks Sıradağları, Alaska (ABD) | Kuzey | Tundra | 68° | Dağ (1.400 m) | Kuzey Amerika | 2,48 m → kuzeye |

Aynı iklimin farklı yarım küre ve kıtalarda görülmesi bilinçlidir: öğrenci "iklim aynı olsa da yarım küre ve kıta farklı olabilir" fikrini deneyimler.

---

## Genişletme Rehberi

- **Yeni konum (seviye):** `js/data/locations.js` dizisine bir nesne ekleyin (iklim, yer şekli, yükselti, kıta, ağaç/toprak/hayvan ipuçları:
  her biri 3 etiket + en fazla 6 kelimelik cümle). Testler yer şekli–yükselti tutarlılığını da denetler (ova ≤ 300 m, plato ≥ 500 m, dağ ≥ 1000 m).
- **Yeni kademe:** `Config.js → PROGRESSION.tiers` dizisine ekleyin (hangi bölgeden itibaren, hangi sorular, hangi ipuçları, zorluk).
- **Yeni iklim tipi:** `js/data/climates.js`'e ekleyin (oyun çarpanları, zemin renkleri, `terrain`, `audio`); Pad'deki seçenek kendiliğinden belirir.
- **Oyun dengesi:** Yalnızca `js/core/Config.js` (bonus miktarı, ceza çarpanı/süresi, gün uzunluğu, hızlar, kamera).
- **Müziği değiştirmek:** `js/data/musicThemes.js` → tempo, dizi, akorlar, enstrüman ve yoğunluklar. Kod değişikliği gerekmez.
- **Kendi çizimleriniz:** `BootScene` içinde `this.load.image('player', 'assets/player.png')` kullanın; anahtar adları aynı kalırsa başka değişiklik gerekmez.
- **Çarpışma kutularını görmek:** `main.js` → `arcade: { debug: true }`.

## Testler

```bash
npm install     # bir kez (sunucu testleri için)
npm test        # tüm testler
```
**Oyun mantığı** (`tests/logic.test.js`): hayatta kalma formülü (2× ceza dahil), +50 bonusun 100'de sınırlanması, ölüm olayı, gece/gündüz ışığı,
tahmin değerlendirme (yer şekli ve kıta dahil), kademeler, puan/yıldız, hava seçimi, aynı iklimin arka arkaya gelmemesi,
gölge hesabı, coğrafi veri tutarlılığı ve tohumlu rastgele sayı (aynı tohum = aynı harita).

**Sunucu** (`server/test/`): sahte saatle oda kuralları (kurucu yetkisi, geri sayımda tahmin yok, sıra/süre/puan,
yanlış tahmin kilidi, yanlışta cevap sızmaması, süre dolması, kademeli zorluk, kuruculuk devri, yeniden bağlanma,
hızlı odanın kendiliğinden başlaması, ad/tahmin temizliği) ve gerçek ağ üzerinden botlarla uçtan uca: özel oda,
hızlı eşleşme, yeniden bağlanma, hız sınırı, gizli dosyaların sunulmaması.
