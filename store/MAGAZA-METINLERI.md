# GeoStrand — Mağaza Metinleri (kopyala-yapıştır)

## Ortak

| Alan | Değer |
|---|---|
| Uygulama adı | **GeoStrand: Enlemden Kaçış** (25 karakter) |
| Paket / Bundle ID | `com.geostrand.enlemdenkacis` |
| Kategori | App Store: **Eğitim** (ikincil: Oyunlar) · Google Play: **Oyun → Eğitici** |
| Dil | Türkçe |
| Fiyat | Ücretsiz, reklamsız, uygulama içi satın alma yok |
| Gizlilik politikası adresi | `https://geostrand.onrender.com/gizlilik.html` (Render adresin farklıysa onu yaz) |
| Destek adresi | `https://geostrand.onrender.com` ve iletişim e-postan |

## App Store

**Alt başlık** (en fazla 30 karakter):
```
Coğrafya ipuçlarıyla hayatta kal
```

**Anahtar kelimeler** (en fazla 100 karakter, virgülle):
```
coğrafya,iklim,enlem,harita,eğitim,ders,öğrenci,yarım küre,kıta,dünya,bilgi yarışması,keşif
```

**Tanıtım metni** (en fazla 170 karakter, istediğin zaman değişebilir):
```
Bir ışınlanma kazası seni dünyanın bilinmeyen bir köşesine fırlattı. Bitkiyi, toprağı ve gölgeyi oku; nerede olduğunu bul ve kurtul!
```

## Google Play

**Kısa açıklama** (en fazla 80 karakter):
```
Bitkiyi, toprağı ve gölgeyi oku: nerede olduğunu bul, hayatta kal!
```

## Açıklama (iki mağaza için de, en fazla 4000 karakter)

```
Yıl 2080. Geo-Core iklim uydusu bir güneş fırtınasına yakalandı ve Geo-Teleporter'ın koordinatları silindi. Baş araştırmacı Dr. Geo, dünyanın bilinmeyen bir köşesine fırlatıldı. Telsiz çekmiyor. Kurtarma helikopterini çağırmanın tek yolu: nerede olduğunu doğadaki ipuçlarından kendin hesaplamak.

GeoStrand: Enlemden Kaçış, coğrafyayı ezberleyerek değil gözlemleyerek öğreten bir hayatta kalma oyunu.

NASIL OYNANIR
• Çevreni incele: ağacın yapraklarına, toprağın rengine ve güneş çubuğunun gölgesine bak.
• Coğrafyacı Pad'ine tahminini yaz: yarım küre, iklim ve enlem.
• Doğruysa çantana su ve ısı eklenir, helikopter seni alır. Yanlışsa barların iki kat hızlı düşer!
• Hangi sorunun yanlış olduğunu ve neye bakman gerektiğini Pad hemen gösterir.

ÖĞRENDİKLERİN
• 6 iklim tipi: Ekvatoral, Çöl, Akdeniz, Muson, Sert Karasal, Tundra
• Gölge uzunluğundan enlem hesaplama (gerçek güneş açısı formülüyle)
• Gölgenin yönünden yarım küre bulma
• Yer şekilleri: dağ, ova, plato (yükselti ve eğimle)
• Kıtalar: hayvan izlerinden kıtayı tahmin etme
• 19 gerçek konum: Amazon'dan Sibirya'ya, Kahire'den Perth'e

ÇEŞİTLİLİK
• Her bölge farklı: iklime ve yer şekline göre kurulan haritalar, göller, nehirler, kanyonlar, karlı dağlar
• Kum fırtınası, tipi, sağanak, sis ve sıcak hava dalgası
• Gece-gündüz döngüsü: çölde geceleri üşürsün!
• İlerledikçe yeni sorular ve ipuçları açılır
• Kendi kâşifini tasarla

ÇEVRİM İÇİ YARIŞ
• Hızlı eşleşme: dünyanın her yerinden rakiplerle aynı haritada kim önce bilecek?
• Oda kodu ile arkadaşlarınla ya da sınıfça yarış
• Sohbet yok, hesap yok; yalnızca seçtiğin takma ad görünür

Telefon, tablet, dikey ve yatay ekranda oynanır. Kaydırarak ya da dokunarak yürü. Tek oyunculu mod internet olmadan da çalışır.

Reklam yok. Uygulama içi satın alma yok. Hesap ya da kişisel bilgi istenmez.
```

## İçerik ve gizlilik soruları (önerilen cevaplar)

### App Store Connect → App Privacy (Uygulama Gizliliği)
- **"Do you or your third-party partners collect data from this app?" → No (Veri Toplanmıyor)**
  Gerekçe: Takma ad ve kâşif görünümü yalnızca çevrim içi yarışı o an yürütmek için gönderilir, sunucunun
  belleğinde oda açıkken tutulur ve oda kapanınca silinir; hiçbir yere kaydedilmez, kimlikle ilişkilendirilmez.
  Apple, yalnızca isteği o an karşılamak için işlenip saklanmayan veriyi "toplanan veri" saymaz.

### App Store → Yaş derecelendirmesi
- Tüm şiddet/korku/kumar/cinsellik soruları: **Yok**
- "Unrestricted Web Access": **Hayır**
- "User-Generated Content" / kullanıcılar arası etkileşim: **Evet, sınırlı** (yalnızca takma adlar; süzgeç, gizleme ve şikâyet var)
- Beklenen sonuç: **4+** (ya da 9+). "Kids" kategorisini **seçme** (çevrim içi yarış yüzünden ek şartlar gerekir).

### Google Play Console → Veri güvenliği (Data safety)
- "Uygulamanız gerekli kullanıcı verisi türlerinden herhangi birini topluyor ya da paylaşıyor mu?" → **Hayır**
  (Veri yalnızca geçici olarak, isteği gerçek zamanlı karşılamak için bellekte işlenir: Play bunu "geçici işleme" sayar.)
- "Veriler aktarım sırasında şifreleniyor mu?" → **Evet** (https / wss)
- "Kullanıcılar veri silinmesini isteyebilir mi?" → Saklanan veri olmadığı için gerekmez; gizlilik politikasında iletişim var.

### Google Play → İçerik derecelendirmesi (IARC anketi)
- Kategori: **Oyun**
- Şiddet, korku, cinsellik, kumar, uyuşturucu, küfür: **Hayır**
- "Kullanıcılar birbiriyle etkileşim kurabilir mi / içerik paylaşabilir mi?" → **Evet** (çevrim içi yarışta takma adlar görünür; sohbet yok)
- "Kullanıcının konumunu paylaşıyor mu?" → **Hayır** (oyun içi harita konumu gerçek konum değildir)
- Beklenen sonuç: **Herkes / PEGI 3**

### Google Play → Hedef kitle
- Önerilen: **13–15, 16–17, 18+** yaş grupları.
  13 yaş altını da seçersen uygulama Google Play "Aileler" politikasına tabi olur; çocuklara yönelik ek
  kurallar ve çevrim içi etkileşim için ek inceleme gelir. Sınıf/üniversite projesi için 13+ en kolay yoldur.
- "Reklam içeriyor mu?" → **Hayır**

### Google Play → Uygulama erişimi
- "Tüm işlevler özel erişim olmadan kullanılabilir" (giriş/hesap yok).

## Ekran görüntüleri

`store/ekran-goruntuleri/` klasöründe hazır:

| Klasör | Boyut | Nereye |
|---|---|---|
| `google-play-telefon/` | 1080 × 1920 | Google Play → Telefon ekran görüntüleri (en az 2) |
| `google-play/one-cikan-gorsel-1024x500.png` | 1024 × 500 | Google Play → Öne çıkan görsel (zorunlu) |
| `iphone-6.7/` | 1290 × 2796 | App Store → iPhone 6.9" / 6.7" ekran görüntüleri |
| `ipad-12.9/` | 2048 × 2732 | App Store → iPad 13" / 12.9" ekran görüntüleri |

Google Play uygulama simgesi (512 × 512): `icons/icon-512.png`
