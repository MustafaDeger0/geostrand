/** Region residents describe everyday environmental problems, without naming the answer. */
(function (root) {
  'use strict';
  const LINES = {
    EKVATORAL: [
      'Çamaşırlarımız bu nemde bir türlü kurumuyor. Neredeyse her gün yağmur yağıyor; evin çevresindeki su kanallarını açık tutmaya çalışıyoruz.',
      'Sık ağaçların arasında yol açmak zor. Yağmur toprağı sürüklemesin diye ağaçları kesmek yerine patikaları onarıyoruz.',
    ],
    COL: [
      'Öğle sıcağında dışarıda çalışmak çok zor. Suyumuzu dikkatli kullanıp işlerimizi sabahın serinliğinde bitiriyoruz.',
      'Rüzgâr kumları kapının önüne yığıyor. Gündüz çok sıcak olsa da gece için kalın giysimi hep hazır tutuyorum.',
    ],
    AKDENIZ: [
      'Yazın yağmur azalınca bahçemiz susuz kalıyor. Suyu boşa harcamamak için akşamları sulama yapıyoruz.',
      'Kuruyan otlar yüzünden yaz aylarında yangından korkuyoruz. Kış yağmurları gelince biraz rahatlıyoruz.',
    ],
    MUSON: [
      'Yağışlı mevsimde yollarımız su altında kalabiliyor. Evimizin önündeki drenajı sürekli temizlememiz gerekiyor.',
      'Yağmurlar birden bastırınca tarlaya ulaşmak zorlaşıyor. Ürünleri ve eşyalarımızı kuru, yüksek bir yerde saklıyoruz.',
    ],
    SERT_KARASAL: [
      'Kışın uzun süren donlar yollarımızı kapatıyor. Soğuk başlamadan yakacak ve yiyecek biriktirmemiz gerekiyor.',
      'Yazla kış arasındaki sıcaklık farkı bizi zorluyor. Ekim zamanını kaçırmamak için havayı dikkatle izliyoruz.',
    ],
    TUNDRA: [
      'Toprağın uzun süre donmuş kalması bahçe kurmayı zorlaştırıyor. Kısa sıcak dönemi iyi değerlendirmek zorundayız.',
      'Soğuk rüzgâr yüzünden dışarıda uzun kalamıyoruz. Ağaç yetiştirmek de kolay değil; yakacak bulmak zor oluyor.',
    ],
  };
  function dialogue(location, index = 0) {
    const lines = LINES[location.climate] || ['Buradaki hava ve arazi günlük işlerimizi etkiliyor. Çevredeki bitkileri ve toprağı gözlemlemek sana yardımcı olabilir.'];
    const terrain = location.landform === 'PLATO'
      ? 'Kanyonun karşısına geçerken geçidi kullanıyoruz; kenarlar tehlikeli.'
      : location.landform === 'OVA'
        ? 'Karşı kıyıya geçmek için köprüyü kullan. Gideceğin yere dokununca kâşif yolu bulur.'
        : 'Engebeli yerlerde açık patikalardan yürümek daha güvenli.';
    return { name: index ? 'Deniz' : 'Ada', text: lines[index % lines.length], tip: terrain };
  }
  root.Residents = { dialogue };
})(typeof module !== 'undefined' && module.exports ? module.exports : (window.GS = window.GS || {}));
