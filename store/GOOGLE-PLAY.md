# GeoStrand — Google Play Yayın Rehberi (eksiksiz)

Bu dosya Play Console'da karşına çıkacak **her sayfayı sırayla** ve oraya yazacağın **cevapları** içerir.
Kopyala-yapıştır yapılacak metinler kod kutularındadır. Görseller `store/ekran-goruntuleri/` klasöründedir.

| Bilgi | Değer |
|---|---|
| Uygulama adı | `GeoStrand: Enlemden Kaçış` (25/30 karakter) |
| Paket adı | `com.geostrand.enlemdenkacis` (ilk yüklemeden sonra değişmez) |
| Varsayılan dil | Türkçe – tr-TR |
| Uygulama mı, oyun mu? | **Oyun** |
| Ücretli mi? | **Ücretsiz** (sonradan ücretliye çevrilemez) |
| Gizlilik politikası | `https://geostrand.onrender.com/gizlilik.html` |
| İletişim e-postası | `geoostrand@gmail.com` |
| Web sitesi | `https://geostrand.onrender.com` |
| Yüklenecek dosya | GitHub → Actions → son yeşil çalıştırma → Artifacts → `geostrand-android-aab` → `app-release.aab` |

---

## 0. Başlamadan önce

1. **Gizlilik politikasını güncelle:** Bu paketteki `gizlilik.html` dosyasını GitHub'a yükle. Yeni hâli günlük
   sıralamayı ve rozetleri de anlatıyor. Google, Veri güvenliği formundaki cevaplarla gizlilik politikasının birbirini
   tutmasını ister.
2. **Uygulamanın imzalı olduğundan emin ol:** GitHub → Actions → son çalıştırma → **"İmza anahtarını hazırla"** adımını aç.
   `İmza anahtarı bulundu … .aab imzalanacak` yazmalı. `ANDROID_KEYSTORE_BASE64 yok` yazıyorsa 4 GitHub Secret'ı
   (`GITHUB-SECRETS.txt`) eklemen gerekiyor; imzasız .aab'ı Google kabul etmez.
3. **Test kullanıcılarını şimdiden topla:** En az **12 kişi** gerekli, ben **15** öneririm (bırakan olursa diye).
   Her birinin **Gmail adresi** (Google hesabı) lazım ve **Android telefonu** olmalı.

## 1. Geliştirici hesabı

1. [play.google.com/console](https://play.google.com/console) → **Kişisel hesap** (Personal) seç.
2. Tek seferlik kayıt ücretini öde (yaklaşık 25 dolar).
3. **Kimlik doğrulaması:** Nüfus cüzdanı ya da pasaport istenir; adın ve adresin resmi belgedeki gibi olmalı.
4. **Android cihaz doğrulaması:** Play Console mobil uygulamasını telefonuna kurup giriş yapman istenebilir.
5. **Geliştirici adı:** Mağazada görünecek ad. Öneri: `GeoStrand` (gerçek adını göstermek istemiyorsan).

Doğrulamalar birkaç gün sürebilir. Onay gelince devam et.

## 2. Uygulama oluştur

**Tüm uygulamalar → Uygulama oluştur**

| Alan | Cevap |
|---|---|
| Uygulama adı | `GeoStrand: Enlemden Kaçış` |
| Varsayılan dil | Türkçe – tr-TR |
| Uygulama veya oyun | Oyun |
| Ücretsiz veya ücretli | Ücretsiz |
| Beyanlar | İki kutuyu da işaretle (Geliştirici Program Politikaları, ABD ihracat yasaları) |

## 3. Uygulamanızı ayarlayın (Kontrol paneli görevleri)

Kontrol panelinde **"Uygulamanızı ayarlayın"** altındaki her maddeyi sırayla doldur:

### 3.1 Gizlilik politikası
```
https://geostrand.onrender.com/gizlilik.html
```

### 3.2 Uygulama erişimi
- **"Tüm işlevler özel erişim gerektirmeden kullanılabilir"** seç.
  (Oyunda giriş, hesap ya da şifre yok.)

### 3.3 Reklamlar
- **"Hayır, uygulamamda reklam yok"**

### 3.4 İçerik derecelendirmesi (IARC anketi)
- E-posta: `geoostrand@gmail.com` (derecelendirme sertifikası buraya gelir)
- Kategori: **Oyun**

| Soru (özet) | Cevap |
|---|---|
| Şiddet (gerçekçi, çizgi film, kan vb.) | Hayır |
| Korku / korkutucu içerik | Hayır |
| Cinsellik, çıplaklık | Hayır |
| Kumar ya da kumar benzeri (gerçek/sanal para) | Hayır |
| Küfür, kaba dil | Hayır |
| Uyuşturucu, alkol, tütün | Hayır |
| Ayrımcı içerik / kaba mizah | Hayır |
| **Kullanıcılar birbiriyle etkileşim kurabilir ya da içerik paylaşabilir mi?** | **Evet** (çevrim içi yarışta oyuncular birbirinin takma adını görür) |
| Kullanıcılar birbiriyle mesajlaşabilir / sohbet edebilir mi? | Hayır |
| Kullanıcının gerçek konumu paylaşılıyor mu? | Hayır (oyun haritasındaki konum gerçek konum değildir) |
| Dijital ürün satın alma | Hayır |
| Uygulama web tarayıcısı ya da arama motoru mu? | Hayır |

Beklenen sonuç: **PEGI 3 / Herkes**, "Kullanıcılar etkileşim kurar" notuyla.

### 3.5 Hedef kitle ve içerik
- **Hedef yaş grupları:** `13-15`, `16-17`, `18 ve üzeri`
  - 13 yaş altını seçme: o zaman uygulama Google Play **Aileler politikasına** tabi olur ve çevrim içi oyuncu
    etkileşimi, veri işleme gibi konularda ek şartlar ve uzun inceleme gelir.
- **"Uygulamanız çocukların ilgisini çekebilir mi?"** sorusu gelirse → **Evet** de. Karakterler çizgi film tarzında,
  bunu dürüstçe belirtmek daha güvenli. Uygulamada reklam, satın alma ve sohbet olmadığı için bu bir sorun yaratmaz;
  Google yalnızca mağaza girişinin çocuklar için uygun olup olmadığına bakar.

### 3.6 Haber uygulaması
- **Hayır**

### 3.7 Veri güvenliği
Bu bölüm en önemlisi. Oyun takma adı, günlük sıralama puanını ve rastgele bir cihaz kimliğini sunucuya gönderir
(sıralamada 2 güne kadar tutulur), bu yüzden **"veri toplanmıyor" denemez.**

**Genel bakış sayfası:**

| Soru | Cevap |
|---|---|
| Uygulamanız gerekli kullanıcı verisi türlerinden herhangi birini topluyor veya paylaşıyor mu? | **Evet** |
| Uygulamanızın topladığı tüm kullanıcı verileri aktarım sırasında şifreleniyor mu? | **Evet** (HTTPS / WSS) |
| Kullanıcılar hangi yöntemlerle hesap oluşturabilir? | **Uygulamam hesap oluşturmaya izin vermiyor** |
| Kullanıcıların verilerinin silinmesini istemesi için bir yol sunuyor musunuz? | **Evet** (e-posta ile; ayrıca veriler en geç 2 günde kendiliğinden silinir) |

**Veri türleri:** Yalnızca şu dördünü işaretle:

| Kategori → Veri türü | Ne gönderiliyor |
|---|---|
| Kişisel bilgiler → **Ad** | Oyuncunun seçtiği kâşif adı (takma ad) |
| Uygulama etkinliği → **Uygulama etkileşimleri** | Puan, süre, bitirilen bölge, yanlış sayısı, yarıştaki tahminler ve harita konumu |
| Uygulama etkinliği → **Kullanıcı tarafından oluşturulan diğer içerikler** | Kâşifin görünümü (şapka, renk vb.); yalnızca yarışta |
| Cihaz veya diğer kimlikler → **Cihaz veya diğer kimlikler** | Uygulamanın kendi ürettiği rastgele kimlik (donanım kimliği değil) |

**Her veri türü için sorular:**

| Soru | Ad | Uygulama etkileşimleri | Diğer içerik (görünüm) | Cihaz kimliği |
|---|---|---|---|---|
| Toplanıyor mu / paylaşılıyor mu? | Toplanıyor | Toplanıyor | Toplanıyor | Toplanıyor |
| Paylaşılıyor mu (üçüncü taraf)? | Hayır | Hayır | Hayır | Hayır |
| Geçici olarak mı işleniyor? | Hayır | Hayır | **Evet** | Hayır |
| Zorunlu mu, isteğe bağlı mı? | **İsteğe bağlı** (kullanıcılar seçebilir) | İsteğe bağlı | İsteğe bağlı | İsteğe bağlı |
| Toplama amacı | Uygulama işlevselliği | Uygulama işlevselliği | Uygulama işlevselliği | Uygulama işlevselliği |

Notlar (Google sorarsa ya da açıklama alanı olursa):
- *İsteğe bağlı* olmasının nedeni: Bu veriler yalnızca oyuncu **Çevrim içi yarış** ya da **Günlük meydan okuma**'yı
  oynarsa gönderilir. Tek oyunculu mod hiçbir şey göndermez.
- *Paylaşılmıyor* olmasının nedeni: Diğer oyuncuların takma adı ve puanı görmesi, kullanıcının kendi başlattığı ve
  beklediği bir şeydir. Google bunu "paylaşım" saymaz. Veriler üçüncü taraf şirketlere verilmez.
- Konum, kişiler, fotoğraf, e-posta, telefon, finans, sağlık: **hiçbiri toplanmaz**.
- Reklam kimliği kullanılmaz.

### 3.8 Devlet uygulamaları
- **Hayır**

### 3.9 Finansal özellikler
- **"Uygulamam herhangi bir finansal özellik sunmuyor"**

### 3.10 Sağlık
- **"Uygulamamda sağlık özellikleri yok"**

### 3.11 Reklam kimliği (Advertising ID)
- **"Uygulamanız reklam kimliği kullanıyor mu?" → Hayır**
  (Uygulamanın tek izni İnternet; `AD_ID` izni yok.)

### 3.12 Uygulama kategorisi ve iletişim bilgileri (Mağaza ayarları)
| Alan | Cevap |
|---|---|
| Uygulama veya oyun | Oyun |
| Kategori | **Eğitici** (Educational) |
| Etiketler (en fazla 5) | Eğitici, Bilgi yarışması (Trivia), Macera, Simülasyon, Tek oyunculu. Listede birebir yoksa en yakınlarını seç. |
| E-posta | `geoostrand@gmail.com` |
| Telefon | Boş bırak (isteğe bağlı) |
| Web sitesi | `https://geostrand.onrender.com` |
| Pazarlama e-postaları | İstediğin gibi |

### 3.13 Ana mağaza girişi
**Mağazada büyüme → Mağaza girişi → Ana mağaza girişi**

**Uygulama adı:**
```
GeoStrand: Enlemden Kaçış
```

**Kısa açıklama** (68/80 karakter):
```
Doğadaki ipuçlarından dünyanın neresinde olduğunu bul ve hayatta kal
```

**Tam açıklama** (2596/4000 karakter):
```
Yıl 2080. Geo-Core iklim uydusu bir güneş fırtınasına yakalandı ve Geo-Teleporter'ın koordinatları silindi. Baş araştırmacı Dr. Geo, dünyanın bilinmeyen bir köşesine fırlatıldı. Telsiz çekmiyor. Kurtarma helikopterini çağırmanın tek yolu var: nerede olduğunu doğadaki ipuçlarından kendin bulmak.

GeoStrand: Enlemden Kaçış, coğrafyayı ezberleyerek değil gözlemleyerek öğreten bir hayatta kalma oyunu.

NASIL OYNANIR
• Çevreni incele: ağacın yapraklarına, toprağın rengine ve güneş çubuğunun gölgesine bak.
• Coğrafyacı Pad'ine tahminini yaz: yarım küre, iklim ve enlem. İlerledikçe yer şekli ve kıta soruları da açılır.
• Doğruysa helikopter seni alır, çantana su ve ısı eklenir.
• Yanlışsa su ve vücut ısın hızla düşer. Aynı bölgedeki her yanlış bir öncekinden ağırdır: rastgele tahminle hayatta kalamazsın.
• Pad, hangi sorunun yanlış olduğunu ve neye bakman gerektiğini hemen gösterir.

ÖĞRENDİKLERİN
• 6 iklim tipi: Ekvatoral, Çöl, Akdeniz, Muson, Sert Karasal, Tundra
• Gölge uzunluğundan enlem hesaplama (gerçek güneş açısıyla)
• Gölgenin yönünden yarım küreyi bulma
• Yer şekilleri: dağ, ova ve plato
• Hayvan izlerinden kıtayı tahmin etme
• 19 gerçek konum: Amazon'dan Sibirya'ya, Kahire'den Perth'e

KURTULUŞ HARİTASI
Kurtulduğun her yer gerçek bir dünya haritasına numaralı bayrak olarak dikilir. Haritada ekvator, dönenceler ve kutup dairesi çizilidir; enlemin dünyadaki yerini kendi gözünle görürsün.

GÜNLÜK MEYDAN OKUMA
Her gün dünyadaki herkese aynı 5 bölge gelir: aynı konumlar, aynı hava, aynı harita. Günün ilk denemesi ortak sıralamaya girer. Üst üste günlerde katılarak serini büyüt, sonucunu arkadaşlarınla paylaş.

ROZETLER
Keşif, ustalık, hayatta kalma, günlük meydan okuma ve çevrim içi yarışta 26 rozet. Çoğunun bronz, gümüş ve altın kademesi var; bazıları gizli.

ÇEŞİTLİLİK
• İklime ve yer şekline göre kurulan haritalar: göller, nehirler, kanyonlar, karlı dağlar
• Kum fırtınası, tipi, sağanak, sis ve sıcak hava dalgası
• Gece-gündüz döngüsü: çölde geceleri üşürsün
• Yardım sandıkları, su matarası ve ısı paketi
• Kendi kâşifini tasarla
• Açılış hikâyesi ve bölgeye özgü müzikler

ÇEVRİM İÇİ YARIŞ
• Hızlı eşleşme: dünyanın her yerinden rakiplerle aynı haritada, kim önce bilecek?
• Oda kodu ile arkadaşlarınla ya da sınıfça yarış
• Sohbet yok, hesap yok; yalnızca seçtiğin takma ad görünür. Uygunsuz adlar süzülür, istediğin oyuncuyu gizleyebilir ya da şikâyet edebilirsin.

Telefon ve tablette, dikey ya da yatay oynanır. Kaydırarak ya da dokunarak yürü. Tek oyunculu mod internet olmadan da çalışır.

Reklam yok. Uygulama içi satın alma yok. Hesap açmak gerekmez.
```

**Grafikler:**

| Alan | Dosya |
|---|---|
| Uygulama simgesi (512×512) | `icons/icon-512.png` |
| Öne çıkan görsel (1024×500) | `store/ekran-goruntuleri/google-play/one-cikan-gorsel-1024x500.png` |
| Telefon ekran görüntüleri (8 adet, 1080×1920) | `store/ekran-goruntuleri/google-play-telefon/` (1'den 8'e sırayla) |
| 7 inç tablet ekran görüntüleri (8 adet, 1920×1080) | `store/ekran-goruntuleri/google-play-tablet/` |
| 10 inç tablet ekran görüntüleri | Aynı tablet görselleri |
| Tanıtım videosu | Boş bırak (isteğe bağlı) |

Öne çıkan görsel alternatif metni:
```
GeoStrand Enlemden Kaçış: dünya haritası üzerinde kurtuluş rotası ve bayraklar
```

**Ekran görüntüsü alternatif metinleri** (her görselin "alternatif metin" alanına; görme engelliler için):

| Dosya | Alternatif metin |
|---|---|
| `1-baslangic.png` | GeoStrand başlangıç ekranı: göreve başla, çevrim içi yarış ve günlük meydan okuma seçenekleri |
| `2-hikaye.png` | Açılış hikâyesi: Geo-Teleporter arızalanıyor, Dr. Geo bilinmeyen bir koordinata ışınlanıyor |
| `3-kesif.png` | Dağlık bir bölgede kâşif, sarı soru işaretli ipucu nesnelerini inceliyor |
| `4-pad.png` | Coğrafyacı Pad'i: yarım küre, iklim, enlem ve yer şekli soruları, yanlış cevap için ipucu |
| `5-harita.png` | Kurtuluş haritası: kurtulunan beş yer dünya haritasında numaralı bayraklarla |
| `6-gunluk.png` | Günlük meydan okuma sonucu: beş bölgenin yıldızları, puan, süre ve rota haritası |
| `7-rozetler.png` | Rozet vitrini: bronz, gümüş ve altın kademeli rozetler ve ilerleme çubukları |
| `8-yaris.png` | Çevrim içi yarış: iki kâşif aynı haritada, sağda canlı sıralama ve süre |

## 4. Kapalı test (zorunlu: 12+ kişi, 14 gün)

### 4.1 Kapalı test kanalı oluştur
1. **Test et ve yayınla → Test → Kapalı test** → varsayılan **"Closed testing - Alpha"** kanalını aç
   (ya da **Kanal oluştur**).
2. **Ülkeler/bölgeler:** **Türkiye** (test kullanıcıların başka ülkedeyse onları da ekle).
3. **Test kullanıcıları → E-posta listesi oluştur:**
   - Liste adı: `GeoStrand Test`
   - Test kullanıcılarının Gmail adreslerini virgülle ayırarak yapıştır. **Kendi Gmail'ini de ekle.**
   - **Geri bildirim URL'si ya da e-posta adresi:** `geoostrand@gmail.com`
4. Kaydet. Sayfadaki **"Web'den katıl"** bağlantısını kopyala; test kullanıcılarına bu bağlantıyı göndereceksin.

### 4.2 İlk sürümü oluştur
1. **Yeni sürüm oluştur**
2. **Play Uygulama İmzalama:** Sorulursa **"Google tarafından oluşturulan anahtarı kullan"** (önerilen) ile devam et.
   Senin anahtarın (`geostrand-upload.jks`) yalnızca "yükleme anahtarı" olur; kaybolursa Google'dan sıfırlatılabilir.
3. **App bundle'lar:** `app-release.aab` dosyasını sürükle.
4. **Sürüm adı:** Otomatik dolar (ör. `1.0.12`), dokunma.
5. **Sürüm notları:**
```
<tr-TR>
GeoStrand'in ilk sürümü:
• 19 gerçek konum, 6 iklim, yer şekli ve kıta soruları
• Kurtuluş haritası: kurtulduğun her yer dünya haritasında
• Günlük meydan okuma ve ortak sıralama
• 26 rozet (bronz, gümüş, altın)
• Çevrim içi yarış: hızlı eşleşme ve oda kodu
</tr-TR>
```
6. **Sonraki → Sürümü kaydet → İncelemeye gönder.** İlk inceleme birkaç saat ile birkaç gün sürebilir.

### 4.3 Test kullanıcılarına gönderilecek mesaj
İnceleme bitip sürüm yayına çıkınca bu mesajı WhatsApp ya da e-postayla gönder (bağlantıyı 4.1'den kopyala):
```
Merhaba! Hazırladığım coğrafya oyunu GeoStrand'i Google Play'e yüklüyorum. Google, yayından önce 12 kişinin 14 gün test etmesini istiyor. Bana yardım eder misin? 🙏

1) Bu bağlantıyı telefonundaki Gmail hesabınla aç ve "Test kullanıcısı ol"a bas:
[BAĞLANTI]
2) Aynı sayfadaki "Google Play'den indir" bağlantısıyla oyunu yükle.
3) Oyunu en az 14 gün SİLME ve test programından ÇIKMA (yoksa sayılmıyor).
4) Arada birkaç kez oyna: bir iki bölge, bir günlük meydan okuma, mümkünse bir çevrim içi yarış.
5) Bir hata görürsen ya da önerin olursa bana yaz ya da Play Store'daki "Geliştiriciye özel geri bildirim" kısmından gönder.

Teşekkürler! 🌍
```

### 4.4 14 gün boyunca
- Play Console → **Kapalı test → Test kullanıcıları** sekmesinde **"katılan" (opted-in)** sayısının **en az 12**
  olduğundan emin ol. 12'nin altına düşerse süre boşa gider.
- Test kullanıcıları programdan çıkıp geri girerse 14 gün sıfırdan başlar.
- Bu sürede **güncelleme yükleyebilirsin** (GitHub'a her yüklemede yeni .aab oluşur). Hatta Google, test sırasında
  gelen geri bildirime göre güncelleme yapılmasını olumlu karşılıyor.
- Gelen geri bildirimleri bir yere not et; üretim başvurusunda sorulacak.

## 5. Üretime erişim başvurusu (14 gün dolunca)

**Kontrol paneli → "Üretime erişim için başvur"**. Sorular ve önerdiğim cevaplar (kendi deneyimine göre düzenle):

**1. Kapalı testiniz hakkında**

*Test kullanıcılarını bulmak ne kadar kolaydı?*
```
Kolaydı. Test kullanıcıları sınıf arkadaşlarım ve ailemdi; oyun bir eğitim teknolojileri dersi (BTE 422) projesi olduğu için ilgiyle katıldılar.
```

*Test kullanıcıları uygulamanın tüm özelliklerini kullandı mı?*
```
Evet. Tek oyunculu modda bölgeleri keşfedip Pad ile tahmin yaptılar, günlük meydan okumayı oynadılar, rozet kazandılar ve çevrim içi yarışta hızlı eşleşme ile oda kodunu denediler.
```

*Kullanım, üretimde beklediğiniz kullanımla aynı mıydı? Fark varsa ne?*
```
Büyük ölçüde aynıydı. Oyuncular kısa oturumlarla (5-15 dakika) birkaç bölge oynadı ve günlük meydan okumaya düzenli döndü. Beklenenden farklı olarak çevrim içi yarış daha çok aynı sınıftaki arkadaşlarla oda koduyla oynandı.
```

*Test kullanıcılarından geri bildirimi nasıl topladınız, özetleyin:*
```
Geri bildirimi WhatsApp grubu, yüz yüze görüşmeler ve Google Play'deki test geri bildirimi aracılığıyla topladım. [BURAYA GELEN ASIL GERİ BİLDİRİMLERİ YAZ, örn: zorluk, kontrol, hata bildirimleri]
```

**2. Uygulamanız hakkında**

*Hedef kitle:*
```
13 yaş ve üzeri ortaokul, lise ve üniversite öğrencileri, coğrafya öğretmenleri ve coğrafyaya ilgi duyan herkes. Oyun Türkçedir ve coğrafya derslerindeki iklim, enlem, yarım küre, yer şekli ve kıta konularını destekler.
```

*Oyununuzu benzersiz kılan nedir?*
```
GeoStrand coğrafyayı ezber yerine gözlemle öğretir: oyuncu bitki örtüsüne, toprağa, gölgenin uzunluğuna ve yönüne bakarak yarım küreyi, iklimi ve enlemi kendisi çıkarır. Gerçek güneş açısı hesabı, 19 gerçek konum, kurtulunan yerleri gösteren dünya haritası, herkese aynı bölgelerin geldiği günlük meydan okuma ve arkadaşlarla çevrim içi yarış var. Reklam, satın alma ve hesap gerektirmez.
```

*İlk yıl için tahmini yükleme sayısı:* **1.000'den az** ya da **1.000-10.000** (gerçekçi olanı seç; öğrenci projesi için ilki uygun).

**3. Üretime hazırlık**

*Kapalı testte öğrendiklerinize göre ne değiştirdiniz?*
```
[TEST SIRASINDA YAPTIĞIN DEĞİŞİKLİKLERİ YAZ.] Örneğin: zorluk dengesi ayarlandı, telefon ekranında arayüz düzenlendi, performans iyileştirildi ve test kullanıcılarının bildirdiği hatalar düzeltildi.
```

*Uygulamanın üretime hazır olduğuna nasıl karar verdiniz?*
```
14 günlük kapalı testte çökme ya da engelleyici hata bildirilmedi, Play Console ön yayın raporu temizdi, uygulama farklı telefon ve tabletlerde denendi ve test kullanıcılarının bildirdiği sorunlar giderildi.
```

İnceleme genellikle 7 gün ya da daha kısa sürer.

## 6. Üretim (herkese açık) yayını

1. **Test et ve yayınla → Üretim → Ülkeler/bölgeler:** **Türkiye** ekle. Oyun yalnızca Türkçe olduğu için Türkiye'yle
   başlamak mantıklı; istersen Türkçe konuşan kullanıcıların çok olduğu ülkeleri de ekleyebilirsin
   (Almanya, Hollanda, Avusturya, Belçika, Azerbaycan, Kıbrıs).
2. **Yeni sürüm oluştur → "Kitaplıktan ekle"** ile kapalı testteki .aab'ı seç (yeniden yüklemen gerekmez).
3. Sürüm notlarını yapıştır (4.2'dekiyle aynı) → **İncelemeye gönder**.
4. Onay gelince oyun Play Store'da herkese açılır. 🎉

## 7. Sonradan güncelleme yayınlamak
1. Oyunda değişiklik yap → GitHub'a yükle → Actions yeni `app-release.aab` üretir (sürüm kodu kendiliğinden artar).
2. Play Console → Üretim → **Yeni sürüm oluştur** → yeni .aab'ı yükle → kısa bir sürüm notu yaz → incelemeye gönder.

## 8. Son kontrol listesi
- [ ] Yeni `gizlilik.html` GitHub'da ve `https://geostrand.onrender.com/gizlilik.html` adresinde açılıyor
- [ ] .aab imzalı (Actions günlüğünde "İmza anahtarı bulundu")
- [ ] `geostrand-upload.jks` ve şifresi güvenli bir yerde yedekli
- [ ] Kontrol panelindeki tüm "Uygulamanızı ayarlayın" maddeleri ✔
- [ ] Mağaza girişi: ad, kısa ve tam açıklama, simge, öne çıkan görsel, 8 telefon ve 8 tablet görseli
- [ ] Kapalı test: en az 12 katılan test kullanıcısı, 14 gün kesintisiz
- [ ] Üretime erişim başvurusu gönderildi

### Sık karşılaşılan ret nedenleri (ve bizdeki durumu)
| Neden | GeoStrand |
|---|---|
| Veri güvenliği formu gizlilik politikasıyla çelişiyor | Bu rehberdeki cevaplar `gizlilik.html` ile birebir uyumlu |
| Gizlilik politikası adresi açılmıyor | Render uykudaysa ilk açılış ~1 dakika sürebilir; incelemeden önce bir kez açıp uyandır |
| Mağaza metninde "en iyi", "1 numara", "hemen indir" gibi ifadeler | Yok |
| Ekran görüntüleri gerçek oyunu göstermiyor | Hepsi oyunun kendisinden alındı |
| 13 yaş altı seçilip Aileler politikası karşılanmıyor | 13 yaş ve üzeri seçiyoruz |
