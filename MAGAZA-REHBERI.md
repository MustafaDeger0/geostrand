# GeoStrand'i App Store ve Google Play'e Yükleme Rehberi

Proje artık hem web sitesi hem de **Android ve iOS uygulaması**. Uygulamalar, oyunun dosyalarını telefonun içinde
taşır (Capacitor): tek oyunculu mod internetsiz çalışır, çevrim içi yarış Render sunucuna bağlanır.

Bilgisayarında Android Studio ya da Mac **gerekmez**: derleme bulutta yapılır.
- **Android** → GitHub Actions (ücretsiz, GitHub'a her yüklemede kendiliğinden)
- **iOS** → Codemagic (Mac'i bulutta sağlar; ücretsiz kotası var)

## Hazır olanlar

| | Nerede |
|---|---|
| Android projesi | `android/` |
| iOS projesi | `ios/` |
| Uygulama simgeleri + açılış ekranı (tüm boyutlar) | `android/app/src/main/res/`, `ios/App/App/Assets.xcassets/` (kaynak: `assets/`) |
| Android bulut derlemesi | `.github/workflows/android.yml` |
| iOS (ve isteğe bağlı Android) bulut derlemesi | `codemagic.yaml` |
| Gizlilik politikası sayfası | `gizlilik.html` → `https://geostrand.onrender.com/gizlilik.html` |
| Mağaza metinleri + gizlilik/yaş soruları cevapları | `store/MAGAZA-METINLERI.md` |
| Ekran görüntüleri + Google Play öne çıkan görsel | `store/ekran-goruntuleri/` |
| Android imza anahtarı | **Ayrı gönderildi** (`geostrand-imza.zip`): projeye ve GitHub'a KOYMA |

**Uygulama kimliği (Bundle ID / Package name):** `com.geostrand.enlemdenkacis`. İlk yüklemeden sonra değiştirilemez.
Başka bir kimlik istersen ilk yüklemeden ÖNCE şu dosyalarda değiştir: `capacitor.config.json`,
`android/app/build.gradle` (namespace + applicationId), `android/app/src/main/res/values/strings.xml`,
`ios/App/App.xcodeproj/project.pbxproj` (PRODUCT_BUNDLE_IDENTIFIER), `codemagic.yaml`.

## 0. Önce iki küçük düzenleme

1. `gizlilik.html` dosyasında **[İLETİŞİM E-POSTANIZ]** ve **[YOUR CONTACT E-MAIL]** yazan iki yere iletişim e-postanı yaz.
   Mağazalar, politika sayfasında iletişim bilgisi ister.
2. Render adresin `https://geostrand.onrender.com` değilse `js/core/Config.js` → `NET.appServerUrl` satırını kendi
   adresinle değiştir (uygulama çevrim içi yarışta buraya bağlanır).

## 1. Projeyi GitHub'a yükle

Proje yaklaşık 350 dosya; GitHub'ın web sayfası bir seferde 100 dosya kabul ettiği için **GitHub Desktop** en kolayıdır:

1. [desktop.github.com](https://desktop.github.com) → indir, GitHub hesabınla giriş yap.
2. **File → Clone repository** → `geostrand` deposunu bilgisayarına indir.
3. Zip'ten çıkan `geostrand` klasörünün **içindekileri** indirilen klasörün içine kopyala (eskilerin üstüne yaz).
   `node_modules` klasörünü kopyalama (zaten zip'te yok).
4. GitHub Desktop'ta sol altta özet yaz (ör. "Mobil uygulama") → **Commit to main** → **Push origin**.

Render siteyi kendiliğinden günceller; GitHub Actions da Android uygulamasını derlemeye başlar.

## 2. Android → Google Play

### 2a. İmza anahtarını GitHub'a ekle (bir kez)
`geostrand-imza.zip` içindeki `GITHUB-SECRETS.txt` dosyasını aç. GitHub'da depon →
**Settings → Secrets and variables → Actions → New repository secret** ile dört gizli değer ekle:

| Ad | Değer |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | `keystore-base64.txt` dosyasının içeriğinin **tamamı** |
| `ANDROID_KEYSTORE_PASSWORD` | dosyadaki şifre |
| `ANDROID_KEY_ALIAS` | `geostrand` |
| `ANDROID_KEY_PASSWORD` | dosyadaki şifre |

> ⚠️ `geostrand-upload.jks` dosyasını ve şifreyi güvenli bir yerde **yedekle** (ör. USB + parola yöneticisi).
> Güncellemeleri bu anahtarla imzalarsın. Kaybolursa Google Play desteğinden yeni anahtar istemen gerekir.

### 2b. Derle
GitHub'da depon → **Actions → Android uygulaması → Run workflow** (ya da bir şey yükleyince kendiliğinden).
10-15 dakika sonra çalıştırmanın sayfasında **Artifacts**:
- `geostrand-android-apk` → zip'i aç, `app-debug.apk`'yı telefonuna gönder ve kur (bilinmeyen kaynaklara izin ver).
  **Önce bunu kendi telefonunda dene.**
- `geostrand-android-aab` → `app-release.aab`: Google Play'e yüklenecek dosya.

### 2c. Google Play Console
1. [play.google.com/console](https://play.google.com/console) → geliştirici hesabı aç (tek seferlik kayıt ücreti; kimlik doğrulaması ister).
2. **Uygulama oluştur** → ad: *GeoStrand: Enlemden Kaçış*, dil Türkçe, **Oyun**, **Ücretsiz**.
3. **Kontrol paneli**ndeki "Uygulamanızı ayarlayın" maddelerini doldur. Cevapların hepsi `store/MAGAZA-METINLERI.md`'de:
   gizlilik politikası adresi, uygulama erişimi, reklamlar (yok), içerik derecelendirmesi, hedef kitle, veri güvenliği,
   mağaza girişi (açıklamalar, simge `icons/icon-512.png`, öne çıkan görsel, telefon ekran görüntüleri).
4. **Test → Kapalı test** → yeni sürüm → `app-release.aab` yükle → test kullanıcılarını (e-posta listesi) ekle → yayınla.
   **Yeni kişisel hesaplarda zorunlu:** üretime (herkese açık) çıkmadan önce **en az 12 test kullanıcısı 14 gün
   boyunca** kapalı teste katılmış olmalı. Sınıf arkadaşlarını test kullanıcısı olarak ekleyebilirsin.
5. 14 gün sonra **Üretim erişimi için başvur** → onay gelince **Üretim** → aynı (ya da yeni) .aab ile yayınla.
   Google incelemesi genellikle birkaç gün sürer.

## 3. iOS → App Store

### 3a. Apple hesapları (bir kez)
1. [developer.apple.com/programs](https://developer.apple.com/programs) → **Apple Developer Program**'a katıl (yıllık ücretli; bireysel üyelik için Apple Kimliği ve kimlik doğrulama yeterli).
2. [appstoreconnect.apple.com](https://appstoreconnect.apple.com) → **Uygulamalar → + → Yeni Uygulama**:
   platform iOS, ad *GeoStrand: Enlemden Kaçış*, birincil dil Türkçe, Bundle ID **com.geostrand.enlemdenkacis**
   (listede yoksa önce developer.apple.com → Certificates, IDs & Profiles → Identifiers → + ile oluştur), SKU: `geostrand`.
3. App Store Connect → **Users and Access → Integrations → App Store Connect API → +** →
   ad `Codemagic`, erişim **App Manager** → oluştur → **.p8 dosyasını indir** (bir kez indirilebilir),
   **Issuer ID** ve **Key ID**'yi not al.

### 3b. Codemagic
1. [codemagic.io](https://codemagic.io) → GitHub ile giriş → **Add application** → `geostrand` deposu → **Capacitor** seç.
   `codemagic.yaml` kendiliğinden bulunur.
2. **Team settings → Integrations → Developer Portal → Connect** → ad olarak tam **`GeoStrand ASC`** yaz,
   Issuer ID, Key ID ve .p8 dosyasını gir.
3. Uygulamanın sayfasında **Start new build → ios-release**. İmza sertifikası ve profil Codemagic tarafından
   kendiliğinden oluşturulur. ~15-20 dakika sonra uygulama **TestFlight**'a yüklenir.
4. iPhone'una **TestFlight** uygulamasını kur → davet e-postasıyla oyunu dene.

### 3c. İncelemeye gönder
App Store Connect → uygulaman → **App Store** sekmesi:
- Ekran görüntüleri: `store/ekran-goruntuleri/iphone-6.7/` (iPhone) ve `ipad-12.9/` (iPad)
- Alt başlık, açıklama, anahtar kelimeler, destek/gizlilik adresleri: `store/MAGAZA-METINLERI.md`
- **App Privacy** → "Veri toplanmıyor" (gerekçe metinlerde) · **Yaş derecelendirmesi** anketi
- **Build** → TestFlight'taki sürümü seç
- **App Review notları** (öneri): *"Hesap gerekmez. Tek oyunculu mod çevrimdışı çalışır. Çevrim içi yarışı denemek
  için ana ekranda 'Çevrim içi yarış → Rakip bul' ve 25 sn sonra 'Yalnız başla'. Sunucu ilk açılışta 30-60 sn uyanabilir."*
- **İncelemeye Gönder**. Apple incelemesi genellikle 1-3 gün sürer.

## 4. Güncelleme yayınlamak

1. Oyunda değişiklik yap → GitHub Desktop ile **Commit + Push**.
2. Android: Actions yeni .aab üretir (sürüm kodu kendiliğinden artar) → Play Console'da yeni sürüm olarak yükle.
3. iOS: Codemagic'te **ios-release**'i yeniden çalıştır (derleme numarası kendiliğinden artar). Yeni bir **sürüm adı**
   (ör. 1.1.0) istiyorsan `ios/App/App.xcodeproj/project.pbxproj` içindeki `MARKETING_VERSION = 1.0.0;` değerlerini değiştir.
4. Web sitesi (Render) her yüklemede kendiliğinden güncellenir.

## 5. İsteğe bağlı: kendi bilgisayarında derlemek

```bash
npm install
npm run app:android    # Android Studio açılır (Android Studio Otter 2025.2.1+)
npm run app:ios        # Xcode açılır (yalnız Mac, Xcode 26+)
```
Oyun dosyalarını değiştirdikten sonra `npm run app:sync` uygulamaları günceller.
Simgeyi değiştirmek için `assets/` içindeki görselleri değiştirip `npm run app:assets`.
