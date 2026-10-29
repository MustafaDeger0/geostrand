/**
 * ============================================================================
 *  GeoStrand — Rehber (Guide)
 * ============================================================================
 *  Sekmeli bilgi penceresi. İçeriğin tamamı veri dosyalarından üretilir, yani
 *  yeni bir iklim / yer şekli / kıta eklendiğinde rehber kendiliğinden güncellenir.
 *
 *  Sekmeler:
 *    📜 Hikâye         : 2080, Geo-Core, Dr. Geo'nun ışınlanma kazası
 *    🎮 Nasıl oynanır  : adımlar, kademeler, puan ve yıldızlar, tuşlar
 *    🌦️ İklimler       : climates.js → guide (konum, sıcaklık, yağış, bitki, toprak, örnek)
 *    ⛰️ Yer şekilleri  : landforms.js → guide
 *    🌍 Kıtalar        : landforms.js → CONTINENTS
 *    🌪️ Hava olayları  : weather.js → why
 *
 *  Başlık ekranından, duraklatma menüsünden ve Pad'den (📖) açılır.
 *  Esc yalnızca rehberi kapatır (yakalama aşamasında dinlenir).
 * ============================================================================
 */
(function (GS) {
  'use strict';

  const TABS = [
    { key: 'story', label: '📜 Hikâye' },
    { key: 'play', label: '🎮 Nasıl oynanır' },
    { key: 'climates', label: '🌦️ İklimler' },
    { key: 'landforms', label: '⛰️ Yer şekilleri' },
    { key: 'continents', label: '🌍 Kıtalar' },
    { key: 'weather', label: '🌪️ Hava olayları' },
    { key: 'about', label: 'ℹ️ Hakkında' },
  ];

  class Guide {
    constructor(doc) {
      this.doc = doc;
      this.isOpen = false;
      const $ = (id) => doc.getElementById(id);
      this.el = { root: $('guide'), tabs: $('guide-tabs'), body: $('guide-body'), close: $('guide-close') };

      this.el.tabs.innerHTML = TABS.map(
        (t) => `<button type="button" role="tab" class="tab" data-tab="${t.key}" aria-selected="false">${t.label}</button>`
      ).join('');
      this.el.tabs.addEventListener('click', (e) => {
        const btn = e.target.closest('.tab');
        if (btn) this.show(btn.dataset.tab);
      });
      this.el.close.addEventListener('click', () => this.close());
      this.el.root.addEventListener('mousedown', (e) => {
        if (e.target === this.el.root) this.close();
      });
      window.addEventListener('keydown', (e) => {
        if (!this.isOpen) return;
        e.stopPropagation(); // oyun ve Pad tuşları rehber açıkken çalışmasın
        if (e.key === 'Escape') {
          e.preventDefault();
          this.close();
        }
      }, true);
    }

    /** @param {string} tab @param {{onClose?:Function}} opts */
    open(tab = 'play', { onClose } = {}) {
      this.onClose = onClose;
      this.isOpen = true;
      this.el.root.classList.remove('hidden');
      this.show(tab);
      this.el.close.focus();
    }

    close() {
      if (!this.isOpen) return;
      this.isOpen = false;
      this.el.root.classList.add('hidden');
      if (this.onClose) this.onClose();
    }

    show(tab) {
      this.el.tabs.querySelectorAll('.tab').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === tab)));
      this.el.body.innerHTML = this[`_${tab}`]();
      this.el.body.scrollTop = 0;
    }

    // ------------------------------------------------------------------ //
    //  Sekme içerikleri
    // ------------------------------------------------------------------ //
    _about() {
      const v = GS.APP_VERSION || '1.0.0';
      // Uygulamada internetteki sayfa (telefonun tarayıcısında açılır), web'de yerel sayfa
      const privacy = GS.Native && GS.Native.isApp ? `${GS.CONFIG.NET.appServerUrl}/gizlilik.html` : 'gizlilik.html';
      return `
        <h3 style="margin-top:0">GeoStrand: Enlemden Kaçış</h3>
        <p class="lead-sm">Sürüm ${v} · Eğitsel coğrafya hayatta kalma oyunu</p>
        <p>Çevrendeki bitki örtüsünü, toprağı, güneşin gölgesini, yükseltiyi ve hayvan izlerini okuyarak yarım küreyi,
          iklimi, enlemi, yer şeklini ve kıtayı bul. 19 gerçek konum, 6 iklim, 3 yer şekli, 6 kıta.</p>
        <h3>Gizlilik</h3>
        <p>Hesap, reklam ya da izleme yok. Kâşifin, en iyi puanın ve ses ayarların yalnızca bu cihazda saklanır.
          Çevrim içi yarışta yalnızca seçtiğin takma ad ve kâşif görünümün, oda açıkken diğer oyunculara gösterilir.
          Başka bir oyuncunun adına dokunarak onu gizleyebilir ya da şikâyet edebilirsin.</p>
        <p><a href="${privacy}" target="_blank" rel="noopener">Gizlilik politikasının tamamı</a></p>
        <h3>Teşekkürler</h3>
        <p>Oyun motoru: Phaser (MIT) · Çevrim içi: Socket.IO (MIT) · Yazı tipleri: Atkinson Hyperlegible ve
          Bricolage Grotesque (SIL Open Font License) · Görseller, müzik ve sesler kodla üretilmiştir.</p>`;
    }

    _story() {
      return `
        <p class="lead-sm"><b>Yıl 2080.</b> Dünya genelinde ani iklim kaymaları ve olağandışı hava olayları baş göstermiştir.
          Küresel İklim Örgütü, gezegenin atmosfer dengesini anlık izlemek için <b>Geo-Core</b> adlı bir iklim uydusu ve
          bu uyduya bağlı <b>Geo-Teleporter</b> kuantum ışınlanma cihazını geliştirir.</p>
        <p>Projenin baş araştırmacısı <b>Dr. Geo</b>, iklim krizine karşı yerinde veri toplamakla görevlidir. Ancak ilk canlı
          ışınlanma testi sırasında beklenmedik bir güneş patlaması Geo-Core uydusunu vurur. Sistem aşırı yüklenir,
          koordinat verileri silinir ve Dr. Geo kendini dünyanın bilinmeyen bir noktasında, zorlu bir iklimin ortasında bulur.</p>
        <p>Telsiz çekmez, <b>Coğrafyacı Pad'i</b> sinyal bulamaz. Kurtarma helikopterine S.O.S gönderebilmek için çevredeki
          doğal ipuçlarını okuyup <b>yarım küreyi, iklimi ve enlemi</b> kendisi hesaplamalıdır. Yanlış hesap, helikopterin
          yanlış yere gitmesi ve Dr. Geo'nun o iklimin dondurucu soğuğunda ya da kavurucu sıcağında mahsur kalması demektir.</p>
        <p>Her kurtuluşta helikopter Dr. Geo'yu alır… ama bozuk Geo-Teleporter onu yine başka bir yere fırlatır.</p>`;
    }

    _play() {
      const tiers = GS.CONFIG.PROGRESSION.tiers;
      const fieldNames = { hemisphere: 'Yarım küre', climate: 'İklim', latitude: 'Enlem', landform: 'Yer şekli', continent: 'Kıta' };
      const icons = { tree: '🌳', soil: '🟫', sunstick: '📏', altimeter: '📡', fauna: '🐾' };
      const tierRows = tiers.map((t, i) => {
        const to = tiers[i + 1] ? `–${tiers[i + 1].fromLevel - 1}` : '+';
        return `<tr><th>Bölge ${t.fromLevel}${to}</th><td>${t.name}</td><td>${t.clues.map((c) => icons[c]).join(' ')}</td>
          <td>${t.fields.map((f) => fieldNames[f]).join(', ')}</td><td>±${t.latitudeTolerance}°</td></tr>`;
      }).join('');
      const s = GS.CONFIG.SCORE;
      return `
        <ol class="guide-steps">
          <li><b>İncele.</b> Haritadaki sarı <b>?</b> işaretli nesnelere yürü ve incele (<kbd>E</kbd> ya da telefonda nesneye dokun). Ekran dışındakileri kenardaki oklar gösterir.</li>
          <li><b>Tahmin et.</b> <kbd>P</kbd> ile Pad'i aç, soruları cevapla ve koordinatı gönder.</li>
          <li><b>Kurtul.</b> Doğruysa çantana su ve ısı eklenir, sonraki bölgeye uçarsın. Yanlışsa barlar 45 saniye 2 kat hızlı düşer.</li>
        </ol>
        <h3>Kademeler</h3>
        <p>Bölgeler ilerledikçe yeni ipuçları ve sorular açılır, enlem toleransı daralır.</p>
        <div class="table-wrap"><table class="guide-table">
          <thead><tr><th>Bölge</th><th>Unvan</th><th>İpuçları</th><th>Sorular</th><th>Enlem</th></tr></thead>
          <tbody>${tierRows}</tbody>
        </table></div>
        <h3>Puan ve yıldızlar</h3>
        <p>Her kurtuluş ${s.base} puan. Her yanlış tahmin −${s.wrongPenalty}. ${s.fastTime} saniyede çözersen +${s.fastBonus}.
          Zor kademeler ek puan verir. <b>⭐⭐⭐</b> hatasız ve hızlı, <b>⭐⭐</b> en fazla bir hata, <b>⭐</b> diğer.</p>
        <h3>Hayatta kalma</h3>
        <p>Su sıcak ve kurak yerlerde, vücut ısısı soğukta ve gece hızlı düşer. Biri biterse can azalır.
          Çantadaki su matarası (<kbd>1</kbd>) ve ısı paketi (<kbd>2</kbd>) +50 verir. Haritadaki 📦 yardım sandıklarını da ara.</p>
        <h3>Tuşlar</h3>
        <dl class="keys">
          <dt><kbd>WASD</kbd> <kbd>Oklar</kbd></dt><dd>Yürü</dd>
          <dt><kbd>E</kbd></dt><dd>İncele / sandığı aç</dd>
          <dt><kbd>P</kbd></dt><dd>Pad</dd>
          <dt><kbd>1</kbd> <kbd>2</kbd></dt><dd>Su / ısı kullan</dd>
          <dt><kbd>F</kbd> <kbd>M</kbd> <kbd>Esc</kbd></dt><dd>Tam ekran, ses, menü</dd>
        </dl>
        <h3>Telefon ve tablet</h3>
        <dl class="keys">
          <dt>👉 Kaydır</dt><dd>Parmağını ekranda kaydır: altında beliren joystick'le yürü (az kaydır = yavaş)</dd>
          <dt>👆 Dokun</dt><dd>Dokunduğun yere yürür. <b>?</b> nesnesine ya da 📦 sandığa dokunursan gider ve inceler</dd>
          <dt>👆 İncele</dt><dd>Yakında nesne varken sağ altta beliren büyük düğme</dd>
          <dt>💧 🔥 🧭 ☰</dt><dd>Su / ısı kullan, Pad, menü</dd>
        </dl>
        <h3>Ekran neden karardı?</h3>
        <dl class="keys">
          <dt>❤️ Kararma + nabız</dt><dd>Canın azalıyor. Su ve ısıyı yükselt; ikisi de 50'nin üstündeyken can yavaşça dolar</dd>
          <dt>🟠 Sıcak kenarlar</dt><dd>Susuz kalıyorsun: 💧 Su Matarası kullan</dd>
          <dt>🔵 Kırağı</dt><dd>Vücudun soğuyor: 🔥 Isı Paketi kullan</dd>
        </dl>`;
    }

    _climates() {
      const rows = [
        ['where', '📍 Nerede'], ['temp', '🌡️ Sıcaklık'], ['rain', '🌧️ Yağış'],
        ['plants', '🌳 Bitki örtüsü'], ['soil', '🟫 Toprak'], ['examples', '🗺️ Örnek'],
      ];
      return `<p class="lead-sm">Bitki örtüsü ve toprak, iklimin en güvenilir izleridir: bitkiler suya ve sıcaklığa uyum sağlar.</p>
        <div class="cards">${Object.values(GS.CLIMATES).map((c) => `
          <article class="info-card">
            <h3><span class="ic">${c.icon}</span>${c.label}</h3>
            <p>${c.summary}</p>
            <dl>${rows.map(([k, l]) => `<dt>${l}</dt><dd>${c.guide[k]}</dd>`).join('')}</dl>
          </article>`).join('')}</div>`;
    }

    _landforms() {
      return `<p class="lead-sm">Yükselti ölçer iki şey söyler: <b>ne kadar yüksektesin</b> ve <b>arazi ne kadar eğimli</b>. İkisini birlikte düşün.</p>
        <div class="compare">
          <div><b>Ova</b><span>alçak + düz</span></div>
          <div><b>Plato</b><span>yüksek + düz</span></div>
          <div><b>Dağ</b><span>yüksek + dik</span></div>
        </div>
        <div class="cards">${Object.values(GS.LANDFORMS).map((l) => `
          <article class="info-card">
            <h3><span class="ic">${l.icon}</span>${l.label}</h3>
            <p>${l.guide.short}</p>
            <ul>${l.guide.points.map((p) => `<li>${p}</li>`).join('')}</ul>
            <p class="ex">🗺️ ${l.guide.examples}</p>
          </article>`).join('')}</div>`;
    }

    _continents() {
      return `<p class="lead-sm">Hayvanlar kıtanın en güçlü ipucudur: kanguru yalnız Okyanusya'da, lama Güney Amerika'da yaşar.</p>
        <div class="cards">${Object.values(GS.CONTINENTS).map((c) => `
          <article class="info-card">
            <h3><span class="ic">${c.icon}</span>${c.label}</h3>
            <p>${c.guide}</p>
          </article>`).join('')}</div>`;
    }

    _weather() {
      const climateNames = (key) => Object.entries(GS.CLIMATE_WEATHER)
        .filter(([, list]) => list.includes(key))
        .map(([c]) => GS.CLIMATES[c].label).join(', ');
      return `<p class="lead-sm">Bölge 3'ten itibaren bazı bölgelerde hava olayı çıkar. Sağ üstteki hava kartı etkisini gösterir.</p>
        <div class="cards">${Object.values(GS.WEATHERS).filter((w) => w.key !== 'clear').map((w) => {
          const fx = [];
          if (w.hydration !== 1) fx.push(`💧 su kaybı ×${String(w.hydration).replace('.', ',')}`);
          if (w.temp !== 1) fx.push(`🌡️ ısı kaybı ×${String(w.temp).replace('.', ',')}`);
          return `<article class="info-card">
            <h3><span class="ic">${w.icon}</span>${w.label}</h3>
            <p>${w.why}</p>
            <p class="ex">${fx.join(' · ') || 'Görüşü azaltır'}</p>
            <p class="ex">Görülür: ${climateNames(w.key)}</p>
          </article>`;
        }).join('')}</div>`;
    }
  }

  GS.Guide = Guide;
})(window.GS = window.GS || {});
