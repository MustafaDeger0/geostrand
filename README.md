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


| İklim | Yer şekilleri |
|---|---|
| Ekvatoral | Nehir + ahşap köprü, göl ve sazlar, ağaçlı yeşil tepe |
| Çöl | Hurmalı vaha, kızıl mesa kayalıkları, kum tepeleri, büyük kayalar |
| Akdeniz | Göl, gri kireçtaşı dağlar, bol kaya, kır çiçekleri |
| Muson | Nehir + köprü, göl, su birikintileri, yeşil tepe |
| Sert Karasal | Donmuş göl, karlı dağlar, kar lekeleri |
| Tundra | 3 donmuş göl, karlı dağ, kayalar, yosun/liken |


| İklim | Tema | Dizi | Tempo | Ezgi enstrümanı |
|---|---|---|---|---|
| Ekvatoral | Yağmur Ormanı | Majör | 100 | Marimba + flüt, çalkalayıcı |
| Çöl | Kum Rüzgârı | Hicaz benzeri (frigyen dominant) | 84 | Ud + def, dem sesi |
| Akdeniz | Zeytinlik | Miksolidyen | 96 | Gitar + flüt |
| Muson | Muson Yağmuru | Doryen | 76 | Tel + flüt, yağmur tıkırtısı |
| Sert Karasal | Tayga | Doğal minör | 68 | Çan |
| Tundra | Kutup Işığı | Lidyen | 56 | Cam |

Gece olunca ezgi seyrekleşir ve akorların tınısı yumuşar. İklim değişince eski müzik 1 saniyede kısılır, yenisi 2 saniyede açılır.


| Ses | Nasıl üretilir | Ne zaman |
|---|---|---|
| 🌬️ Rüzgâr | Beyaz gürültü + bant geçiren filtre, rastgele esinti | Hep (çöl, tundrada güçlü; gece biraz artar) |
| 🌧️ Yağmur | Beyaz gürültü + yüksek geçiren filtre | Muson, Ekvatoral |
| 🌊 Su | Beyaz gürültü + bant geçiren, dalgalanan filtre | Göle/nehre yaklaştıkça artar (donmuş göl sessiz) |
| 🐦 Kuşlar | Hızlı frekans kaydırmalı osilatör, sağ-sol konumlu | Gündüz |
| 🦗 Cırcır böceği | Yüksek frekanslı kısa darbe dizisi | Gece, sıcak iklimler |
| 👣 Ayak sesi | Zemine göre filtrelenmiş gürültü (çimen/kum/kar/çamur) | Yürürken |
| Efektler | İncele bip, Pad "vın", doğru arpej, yanlış uğultu, eşya, ölüm, varış | Olaylarda |


  | Durum | Ekranda |
  |---|---|
  | ❤️ Can < 60 | Ekran giderek kararır, renkler solar, kenarlar koyu kırmızı; can < 35'te **kalp atışı** gibi nabız (can azaldıkça hızlanır) |
  | 💧 Su < 35 | Sıcak, kavruk turuncu kenarlar, görüntü sepyaya döner |
  | 🌡️ Isı < 35 | Buz mavisi kırağı kenarlar, soğuk renk tonu |

  Ortada ne yapılacağını söyleyen bir uyarı çıkar ("💧 Susuz kalıyorsun · Su Matarası kullan"); uyarıya dokununca/tıklayınca
  eşya kullanılır, çantadaki ilgili eşya da parlar.

### 8. Kademeler ve Çeşitlilik ("her bölge farklı")

| Bölge | Unvan | İpucu nesneleri | Sorular | Enlem toleransı | Ek |
|---|---|---|---|---|---|
| 1–2 | Çaylak kâşif | 🌳 🟫 📏 | Yarım küre, iklim, enlem | ±7° | 1 sandık |
| 3–4 | Saha araştırmacısı | + 📡 Yükselti ölçer | + **Yer şekli** | ±6° | Hava olayı %50, 2 sandık, kayıp ×1,1 |
| 5+ | Usta coğrafyacı | + 🐾 Hayvan izleri | + **Kıta** | ±5° | Hava olayı %65, kayıp ×1,2 |

Yeni kademe açıldığında ekranın ortasında bir afiş çıkar; görev göstergesi ve Pad yeni ipucu/soruya göre büyür.


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
