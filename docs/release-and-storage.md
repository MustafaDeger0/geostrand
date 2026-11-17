# Web ve Google Play: güvenilirlik güncellemesi

## Yayın sırası
1. Sunucuyu önce yayınlayın. /api/daily ve Socket.IO'nun mevcut mesajları eski Android uygulamaları için korunmuştur.
2. Web'i aynı sürümden yayınlayın. Yeni günlük oyun /api/daily/v2 kullanır. Eski ve doğrulanan sonuçlar farklı tablolardadır.
3. npm run app:sync ile ortak web dosyalarını Android paketine alın; imzalı AAB'yi önce Google Play dahili test kanalında deneyin.
4. Üretime çıkışta güncellenmiş gizlilik sayfasını kullanın. Bu PR hiçbir mağaza yayını yapmaz.

## Kalıcı sonuçlar
npm start sunucu oturumlarını ve doğrulanmış sonuçları atomik olarak DAILY_DATA_DIR/daily-v2.json dosyasına yazar.
Değişken yoksa server/.data kullanılır. Bu, aynı disk üzerinde süreç yeniden başlatılınca kayıtları korur.
İsteklerde ve saatlik temizlikte bugün ve dün dışındaki kayıtlar silinir.

Render'ın geçici dosya sistemi dağıtım/yeniden oluşturma sırasında silinebilir. Gerçek kalıcılık için DAILY_DATA_DIR
kalıcı bir diskin bağlandığı dizine ayarlanmalıdır. Kalıcı disk veya harici veritabanı mevcut değilse bu PR tek başına
Render üzerinde dağıtımlar arası kalıcılık sağlayamaz. Barındırma planı bu PR'de değiştirilmez; ücretsiz plandan ücretliye otomatik geçilmez.
Dosya deposu tek Node süreci içindir; birden fazla örneğe geçmeden önce ortak işlemsel veritabanına taşınmalıdır.
Günlük veri dosyalarını web kökünün dışında veya sunulmayan server/ dizininde tutun; erişimi sınırlayın.

## Doğrulamanın sınırı
Sunucu artık istemcinin score, solved, wrongs veya timeMs iddialarını sıralama için kabul etmez.
Her cevap, bölge sırası, süre, tekrar gönderim ve yanlış bekleme süresi sunucuda denetlenir.
Giriş hesabı bulunmadığından cihaz kimliği silinmesi/farklı cihazlarla yeniden katılım kesin olarak engellenemez.
Konum verileri harita için istemciye gerektiğinden geliştirici araçlarıyla cevabı öğrenme de bütünüyle engellenmez.
Bunlar hesap/kimlik ve sunucuya özel içerik tasarımı gerektirir; bu değişiklik kusursuz hile engelleme iddiası taşımaz.

## Elle kontrol
- Web/Android: normal oyun, öğrenme modu, dokunmatik hareket, Pad, Rehber ve Android geri tuşu.
- Öğrenme: ipucunu incele; rehber adımı değişsin; yanlışta barlar değişmesin; çıkışta normal rekor/rozetler artmasın.
- Günlük: ilk hak, yanlış cevap kilidi, 5 bölge, ağ kesintisi, tekrar gönder, sayfa yenileme sonrası bekleyen sonuç.
- Yarış: çözmeden ve çözdükten sonra bağlantı kes/yeniden bağlan; ipuçları ve sonuç korunsun.
- Tur arası ve final ekranında yeniden bağlan; aynı özel odada ikinci yarışı bitir ve başarım sayacını kontrol et.
- Eski Android: yarış ve /api/daily çalışmaya devam etsin; yeni tabloya eski sonuç karışmasın.
