/**
 * ============================================================================
 *  GeoStrand — Yer Şekilleri ve Kıtalar
 * ============================================================================
 *  LANDFORMS: Pad'deki "Yer şekli" sorusu (Bölge 3'ten itibaren) + haritanın
 *  nasıl çizileceği (terrain) + Rehber'deki açıklama (guide).
 *
 *  terrain alanları (iklimin arazi ayarlarının ÜSTÜNE uygulanır):
 *    mountainsMul / mountainsAdd : dağ kümesi sayısını çarp / ekle
 *    river        : true → nehir kesin olur, false → hiç olmaz, undefined → iklime bırak
 *    canyon       : platoyu yaran derin akarsu vadisi (kanyon) + tek bir geçit
 *    fields       : tarla şeritleri (ovada tarım)
 *    bouldersMul  : kaya sayısı çarpanı
 *    lakesAdd     : ek göl
 *
 *  CONTINENTS: Pad'deki "Kıta" sorusu (Bölge 5'ten itibaren) + Rehber bilgisi.
 * ============================================================================
 */
(function (GS) {
  'use strict';

  GS.LANDFORMS = {
    OVA: {
      key: 'OVA',
      label: 'Ova',
      icon: '🌾',
      terrain: { mountainsMul: 0, river: true, fields: true, lakesAdd: 0, bouldersMul: 0.5 },
      altimeter: { tags: ['Düz', 'Alçak'], text: 'Akarsu çevresinde düz arazi.' },
      guide: {
        short: 'Çevresine göre alçakta kalan, düz ya da az eğimli geniş arazi.',
        points: [
          'Akarsuların taşıyıp biriktirdiği alüvyonla oluşur.',
          'Toprağı verimlidir: tarım ve yerleşim yoğundur.',
          'Kıyı ovaları deniz seviyesine yakındır.',
        ],
        examples: 'Çukurova, Nil Deltası, Amazon Ovası',
      },
    },
    PLATO: {
      key: 'PLATO',
      label: 'Plato',
      icon: '🏞️',
      terrain: { mountainsMul: 0.3, river: false, canyon: true, bouldersMul: 1 },
      altimeter: { tags: ['Düz', 'Yüksek', 'Kenarı yar'], text: 'Düzlüğü derin bir kanyon yarmış.' },
      guide: {
        short: 'Yüksekte kalmış, akarsularla derin yarılmış geniş düzlük.',
        points: [
          'Üstü düzdür ama deniz seviyesinden yüksektir.',
          'Akarsular platoyu yararak derin vadiler (kanyonlar) açar.',
          'Kenarları genellikle dik yamaçlarla (yarlarla) biter.',
        ],
        examples: 'Dekkan Platosu, İber Meseta, Tibet Platosu',
      },
    },
    DAG: {
      key: 'DAG',
      label: 'Dağ',
      icon: '⛰️',
      terrain: { mountainsMul: 1, mountainsAdd: 5, river: false, bouldersMul: 1.6 },
      altimeter: { tags: ['Dik yamaç', 'Engebeli', 'Zirveler'], text: 'Her yönde dik yamaçlar.' },
      guide: {
        short: 'Çevresinden çok yüksek, eğimi fazla, engebeli yer şekli.',
        points: [
          'Yükseldikçe hava soğur: her 200 metrede yaklaşık 1 °C.',
          'Yamaçlarda toprak incedir; tarım için basamak (set) yapılır.',
          'Yüksek zirvelerde yaz kış kar bulunabilir.',
        ],
        examples: 'Toroslar, Himalayalar, Atlas Dağları, And Dağları',
      },
    },
  };

  GS.CONTINENTS = {
    AFRIKA: {
      key: 'AFRIKA', label: 'Afrika', icon: '🌍',
      guide: 'Ekvator tam ortasından geçer; Sahra en büyük sıcak çöldür. Hayvanlar: fil, zürafa, fennek tilkisi, Berberi maymunu, Afrika pengueni.',
    },
    ASYA: {
      key: 'ASYA', label: 'Asya', icon: '🌏',
      guide: 'En büyük kıta; Himalayalar, Sibirya taygası ve muson toprakları buradadır. Anadolu da Asya\'dadır. Hayvanlar: kızıl panda, kaplan, ren geyiği, tavus kuşu.',
    },
    AVRUPA: {
      key: 'AVRUPA', label: 'Avrupa', icon: '🏰',
      guide: 'Güneyi Akdeniz iklimidir; İber Yarımadası\'nın ortası yüksek bir platodur. Hayvanlar: İber vaşağı, yaban domuzu, geyik.',
    },
    KUZEY_AMERIKA: {
      key: 'KUZEY_AMERIKA', label: 'Kuzey Amerika', icon: '🦬',
      guide: 'Kuzeyi tundra, içleri geniş ovalar ve Rocky Dağları. Hayvanlar: karibu, misk öküzü, bizon, boz ayı.',
    },
    GUNEY_AMERIKA: {
      key: 'GUNEY_AMERIKA', label: 'Güney Amerika', icon: '🦙',
      guide: 'Amazon yağmur ormanı ve batıdaki And Dağları. Atacama dünyanın en kurak çölüdür. Hayvanlar: lama, vikunya, jaguar, tukan.',
    },
    OKYANUSYA: {
      key: 'OKYANUSYA', label: 'Okyanusya', icon: '🦘',
      guide: 'Avustralya ve Pasifik adaları. Tamamı Güney Yarım Küre\'dedir (bazı adalar hariç). Hayvanlar: kanguru, koala, emu, kara kuğu.',
    },
  };
})(typeof module !== 'undefined' && module.exports ? module.exports : (window.GS = window.GS || {}));
