/**
 * ============================================================================
 *  GeoStrand — Coğrafyacı Pad'i (UI Pop-up)
 * ============================================================================
 *  Oyuncu bir nesneye E ile bastığında (ya da P ile) açılan saha defteri.
 *  AZ YAZI, ÇOK GÖRSEL ilkesiyle tasarlandı. Kademeye göre büyür:
 *
 *  SOL — Gözlemler: bu bölgedeki ipucu kartları (3–5 adet)
 *    • Bulunmamış kart soluk ve kesik çizgili → neyin eksik olduğu bir bakışta görülür
 *    • Bulunan kart: renkli etiketler + tek kısa cümle
 *    • Gölge kartında pusula şeması (gölgenin yönü ve uzunluğu)
 *    • Açılır "gölgeden enlem" cetveli
 *  SAĞ — Tahmin: ① Yarım küre ② İklim ③ Enlem (+ ④ Yer şekli, ⑤ Kıta)
 *  SONUÇ — iki yerde birden, kaydırmadan görülür:
 *    • Alt şerit (hep görünür): "✘ 2/3 doğru · kırmızı alanları düzelt" ya da
 *      doğruysa ⭐ yıldız, gerçek konum ve "Sonraki bölgeye uç"
 *    • Her sorunun kendisinde: yeşil ✔ / kırmızı ✘ çerçeve + o soru için ipucu
 *      ("Daha büyük bir enlem dene ↑"). İlk yanlış soru ekrana kaydırılır.
 *      Öğrenci yanlış soruyu değiştirince işaret kalkar.
 *
 *  Pad oyun kuralı içermez: formu gönderince PREDICTION_SUBMIT olayını yayar,
 *  sonucu GameScene'den showResult() ile alır.
 *  Kapatma: ✕, Esc ya da arka plana tıklama. 📖 düğmesi Rehber'i açar.
 * ============================================================================
 */
(function (GS) {
  'use strict';

  const OPTIONAL_FIELDS = ['landform', 'continent'];

  class GeographerPad {
    /**
     * @param {{bus: GS.EventBus, climates: object, doc: Document}} deps
     */
    constructor({ bus, climates, doc }) {
      this.bus = bus;
      this.climates = climates;
      this.doc = doc;
      this.isOpen = false;
      this.notes = new Map();      // clue.id -> clue
      this.clueIds = [];
      this.fields = [];

      const $ = (id) => doc.getElementById(id);
      this.el = {
        root: $('pad'),
        close: $('pad-close'),
        guide: $('pad-guide'),
        location: $('pad-location'),
        count: $('pad-count'),
        slots: $('pad-slots'),
        form: $('pad-form'),
        climateGrid: $('pad-climates'),
        landformGrid: $('pad-landforms'),
        continentGrid: $('pad-continents'),
        latInput: $('pad-lat'),
        latOutput: $('pad-lat-out'),
        result: $('pad-result'),
        submit: $('pad-submit'),
        body: doc.querySelector('#pad .pad-body'),
      };

      this._buildOptions();
      this._bindDomEvents();
    }

    // ================================================================== //
    //  Açma / Kapama
    // ================================================================== //

    /** @param {object|null} clue Az önce incelenen ipucu (P ile açılırsa null) */
    open(clue) {
      this._highlight(clue ? clue.id : null);
      if (this.isOpen) return;
      this.isOpen = true;
      this.el.root.classList.remove('hidden');
      this.bus.emit(GS.EVENTS.PAD_OPENED);
    }

    close() {
      if (!this.isOpen) return;
      this.isOpen = false;
      this.el.root.classList.add('hidden');
      if (this.doc.activeElement) this.doc.activeElement.blur();
      this.bus.emit(GS.EVENTS.PAD_CLOSED);
    }

    // ================================================================== //
    //  Bölge değişimi
    // ================================================================== //

    /**
     * Yeni bölge: kartları ve soruları kademeye göre kur, formu sıfırla.
     * @param {string} label  "Bölge 3"
     * @param {{clues:string[], fields:string[], latitudeTolerance:number}} tier
     */
    resetForLocation(label, tier) {
      this.clueIds = tier.clues;
      this.fields = tier.fields;
      this.notes.clear();
      this.el.location.textContent = label;

      // Kademeye göre sorular: açık olmayanlar gizlenir
      OPTIONAL_FIELDS.forEach((f) => {
        this.el.form.querySelector(`[data-field="${f}"]`).classList.toggle('hidden', !this.fields.includes(f));
      });
      this.el.form.reset();
      this._syncLatitude();
      clearInterval(this._lockTimer);
      this._lockTimer = null;
      this.el.submit.textContent = '📡 Koordinatı gönder';
      this._setFormLocked(false);
      this._clearMarks();
      this.el.result.className = 'pad-result hidden';
      this.el.result.innerHTML = '';
      this.el.root.classList.remove('solved');
      this.el.body.scrollTop = 0;
      this._buildSlots();
      this._highlight(null);
    }

    addNote(clue) {
      if (!clue || this.notes.has(clue.id)) return;
      this.notes.set(clue.id, clue);
      this._renderSlot(clue.id);
      this.el.count.textContent = `${this.notes.size}/${this.clueIds.length}`;
    }

    // ================================================================== //
    //  Sonuç gösterimi (GameScene çağırır)
    // ================================================================== //

    /** Eksik soru(lar): ilgili sorular turuncu çerçeveyle işaretlenir */
    showErrors(errors) {
      this._clearMarks();
      const data = new FormData(this.el.form);
      const missing = this.fields.filter((f) => f !== 'latitude' && !data.get(f));
      missing.forEach((f) => this._mark(f, 'missing', 'Bunu seçmedin'));
      this.el.result.className = 'pad-result warn';
      this.el.result.innerHTML = `<div class="res-head">✋ ${missing.length > 1 ? `${missing.length} soru boş` : 'Bir soru boş'}</div>
        <p class="res-hint">${errors.map(escapeHtml).join(' · ')}</p>`;
      this._reveal(missing[0]);
    }

    /**
     * @param {object} result PredictionEvaluator.evaluate() çıktısı
     * @param {object|null} reveal Doğruysa gerçek konum bilgisi + puan
     */
    /**
     * @param {object} [penalty] yanlışta: {text} ceza özeti (tek oyunculu)
     */
    showResult(result, reveal, penalty) {
      this._clearMarks();
      // Her soruyu kendi yerinde işaretle: ✔ yeşil, ✘ kırmızı + ipucu
      result.feedback.forEach((f) => {
        const arrow = f.direction === 'lower' ? ' ↓' : f.direction === 'higher' ? ' ↑' : '';
        this._mark(f.field, f.ok ? 'ok' : 'bad', f.ok ? '' : `${f.hint}${arrow}`);
      });

      if (result.isCorrect) {
        this._setFormLocked(true);
        this.el.root.classList.add('solved');
        const stars = '★'.repeat(reveal.stars) + '☆'.repeat(3 - reveal.stars);
        const badges = reveal.badges.map((b) => `<span class="badge ok">${escapeHtml(b)}</span>`).join('');
        this.el.result.className = 'pad-result success';
        this.el.result.innerHTML = `
          <div class="res-main">
            <div class="res-head">✔ Kurtarıldın! <span class="stars" aria-label="${reveal.stars} yıldız">${stars}</span></div>
            <p class="reveal">${escapeHtml(reveal.name)}</p>
            <div class="badges">${badges}</div>
            <p class="summary">${escapeHtml(reveal.summary)}</p>
            <p class="points">+${reveal.points} puan${reveal.fast ? ' · hızlı çözüm bonusu' : ''}</p>
          </div>
          <button type="button" class="btn-signal" id="pad-next">${reveal.nextLabel || '🛩️ Sonraki bölgeye uç'}</button>`;
        this.doc.getElementById('pad-next').addEventListener('click', () => this.bus.emit(GS.EVENTS.LEVEL_NEXT));
        return;
      }

      // Yanlış: alt şeritte kısa özet (hangi sorular yanlış), ayrıntı soruların yanında
      const wrong = result.feedback.filter((f) => !f.ok);
      const names = wrong.map((f) => {
        const arrow = f.direction === 'lower' ? ' ↓' : f.direction === 'higher' ? ' ↑' : '';
        return `<span class="badge bad">✘ ${escapeHtml(f.label)}${arrow}</span>`;
      }).join('');
      this.el.result.className = 'pad-result fail';
      this.el.result.innerHTML = `
        <div class="res-head">✘ ${result.correctCount}/${result.total} doğru <small>⚠️ ${escapeHtml(penalty && penalty.text ? penalty.text : 'Barlar bir süre hızlı düşecek')}</small></div>
        <div class="badges">${names}<span class="res-tip">Kırmızı soruları düzelt, tekrar gönder</span></div>`;
      this._reveal(wrong[0] && wrong[0].field);
      // Sonuç her denemede yeniden "sallanır": aynı sonuç gelse de fark edilsin
      this.el.result.classList.remove('shake');
      void this.el.result.offsetWidth;
      this.el.result.classList.add('shake');
    }

    // ================================================================== //
    //  Çevrim içi yarış (cevabı sunucu değerlendirir)
    // ================================================================== //

    /** Yanlış: sorular işaretlenir + telsiz kilidi geri sayımı */
    showRaceWrong(result, lockMs) {
      this.showResult(result, null);
      const sub = this.el.result.querySelector('.res-head small');
      if (sub) sub.textContent = `📡 Telsiz ${Math.round(lockMs / 1000)} sn kilitlendi · her yanlış −${GS.CONFIG.RACE.wrongPenalty} puan`;
      this.lockSubmit(lockMs);
    }

    /** Doğru: sıralama, süre, puan. Sonraki turu sunucu başlatır. */
    showRaceSolved({ rank, timeMs, points }) {
      this._clearMarks();
      this.fields.forEach((f) => this._mark(f, 'ok', ''));
      this._setFormLocked(true);
      this.el.root.classList.add('solved');
      const medal = ['🥇', '🥈', '🥉'][rank - 1] || '🏁';
      const s = Math.round(timeMs / 1000);
      this.el.result.className = 'pad-result success';
      this.el.result.innerHTML = `
        <div class="res-main">
          <div class="res-head">${medal} ${rank}. sırada bildin!</div>
          <p class="reveal">${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')} · +${points} puan</p>
          <p class="summary">Diğer kâşifler bekleniyor. Tur bitince gerçek konum açıklanacak.</p>
        </div>`;
    }

    /** Gönder düğmesini kilitle ve geri say (yanlış tahmin cezası) */
    lockSubmit(ms) {
      const btn = this.el.submit;
      clearInterval(this._lockTimer);
      const until = performance.now() + ms;
      const tick = () => {
        const left = until - performance.now();
        if (left <= 0) {
          clearInterval(this._lockTimer);
          this._lockTimer = null;
          btn.disabled = false;
          btn.textContent = '📡 Koordinatı gönder';
          return;
        }
        btn.disabled = true;
        btn.textContent = `📡 Telsiz kilitli: ${Math.ceil(left / 1000)} sn`;
      };
      tick();
      this._lockTimer = setInterval(tick, 200);
    }

    /** Sunucuya gönderilirken düğme beklesin */
    setSending(on) {
      const btn = this.el.submit;
      if (on) {
        btn.disabled = true;
        btn.textContent = '📡 Gönderiliyor…';
      } else if (!this._lockTimer) {
        btn.disabled = false;
        btn.textContent = '📡 Koordinatı gönder';
      }
    }

    // ------------------------------------------------------------------ //
    //  Soru işaretleri
    // ------------------------------------------------------------------ //
    _fieldset(field) {
      return this.el.form.querySelector(`fieldset[data-field="${field}"]`);
    }

    /** @param {'ok'|'bad'|'missing'} state */
    _mark(field, state, note) {
      const fs = this._fieldset(field);
      if (!fs) return;
      fs.classList.add(`is-${state}`);
      const legend = fs.querySelector('legend');
      legend.insertAdjacentHTML('beforeend',
        `<span class="field-mark">${state === 'ok' ? '✔ Doğru' : state === 'bad' ? '✘ Yanlış' : '✋ Boş'}</span>`);
      if (note) legend.insertAdjacentHTML('afterend', `<p class="field-note">💡 ${escapeHtml(note)}</p>`);
    }

    _unmark(fs) {
      fs.classList.remove('is-ok', 'is-bad', 'is-missing');
      fs.querySelectorAll('.field-mark, .field-note').forEach((n) => n.remove());
    }

    _clearMarks() {
      this.el.form.querySelectorAll('fieldset').forEach((fs) => this._unmark(fs));
    }

    /** İlk yanlış/boş soruyu görünür yap (telefonda sorular aşağıda kalabilir) */
    _reveal(field) {
      const fs = field && this._fieldset(field);
      if (!fs) return;
      const body = this.el.body;
      const top = fs.getBoundingClientRect().top - body.getBoundingClientRect().top;
      const visible = top >= 0 && top + 60 <= body.clientHeight;
      if (!visible) body.scrollTo({ top: body.scrollTop + top - 12, behavior: 'smooth' });
    }

    /** Sahne kapanırken tüm DOM dinleyicilerini kaldır */
    destroy() {
      clearInterval(this._lockTimer);
      this._listeners.forEach(([target, type, fn]) => target.removeEventListener(type, fn));
      this._listeners = [];
      this.isOpen = false;
      this.el.root.classList.add('hidden');
    }

    // ================================================================== //
    //  İç yardımcılar
    // ================================================================== //

    /** Seçenekleri veri tablolarından üret: yeni iklim/yer şekli/kıta = sadece veri eklemek */
    _buildOptions() {
      const card = (name, key, icon, label) => `
        <label class="climate-option">
          <input type="radio" name="${name}" value="${key}">
          <span><i>${icon}</i>${escapeHtml(label)}</span>
        </label>`;
      this.el.climateGrid.innerHTML = Object.values(this.climates).map((c) => card('climate', c.key, c.icon, c.label)).join('');
      this.el.landformGrid.innerHTML = Object.values(GS.LANDFORMS).map((l) => card('landform', l.key, l.icon, l.label)).join('');
      this.el.continentGrid.innerHTML = Object.values(GS.CONTINENTS).map((c) => card('continent', c.key, c.icon, c.label)).join('');
    }

    _bindDomEvents() {
      this._listeners = [];
      const on = (target, type, fn) => {
        target.addEventListener(type, fn);
        this._listeners.push([target, type, fn]);
      };

      on(this.el.close, 'click', () => this.close());
      on(this.el.guide, 'click', () => this.bus.emit(GS.EVENTS.UI_GUIDE, 'climates'));
      on(this.el.root, 'mousedown', (e) => {
        if (e.target === this.el.root) this.close(); // karartılmış arka plana tıklama
      });
      on(this.doc, 'keydown', (e) => {
        if (this.isOpen && e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation(); // Phaser aynı Esc ile duraklatma menüsünü açmasın
          this.close();
        }
      });
      on(this.el.latInput, 'input', () => this._syncLatitude());
      // Öğrenci bir soruyu değiştirince o sorunun ✔/✘ işareti kalkar
      on(this.el.form, 'change', (e) => {
        const fs = e.target.closest('fieldset');
        if (fs && !this.el.root.classList.contains('solved')) this._unmark(fs);
      });

      on(this.el.form, 'submit', (e) => {
        e.preventDefault(); // sayfa yenilenmesin
        const data = new FormData(this.el.form);
        this.bus.emit(GS.EVENTS.PREDICTION_SUBMIT, {
          hemisphere: data.get('hemisphere'),
          climate: data.get('climate'),
          latitude: Number(data.get('latitude')),
          landform: data.get('landform'),
          continent: data.get('continent'),
        });
      });
    }

    _syncLatitude() {
      this.el.latOutput.textContent = `${this.el.latInput.value}°`;
    }

    _setFormLocked(locked) {
      this.el.form.querySelectorAll('input, button').forEach((n) => (n.disabled = locked));
      this.el.submit.disabled = locked;
      this.el.submit.classList.toggle('hidden', locked);
    }

    /** Az önce incelenen kartı vurgula */
    _highlight(id) {
      this.el.slots.querySelectorAll('.slot').forEach((s) => s.classList.toggle('fresh', s.dataset.slot === id));
    }

    /** Bu kademenin ipucu kartlarını boş olarak kur */
    _buildSlots() {
      const T = GS.ClueFactory.TYPES;
      this.el.slots.innerHTML = this.clueIds.map((id) => `
        <article class="slot empty" data-slot="${id}">
          <div class="slot-icon">${T[id].icon}</div>
          <div class="slot-body"><div class="slot-title">${T[id].title}</div>
            <div class="slot-content"><span class="slot-missing">? · haritada bul</span></div></div>
          ${id === 'sunstick' ? '<div class="slot-diagram" aria-hidden="true"></div>' : ''}
        </article>`).join('');
      this.el.count.textContent = `0/${this.clueIds.length}`;
    }

    /** Bulunan ipucunu kartına yaz */
    _renderSlot(id) {
      const slot = this.el.slots.querySelector(`.slot[data-slot="${id}"]`);
      const clue = this.notes.get(id);
      if (!slot || !clue) return;
      slot.classList.remove('empty');
      slot.querySelector('.slot-content').innerHTML = `
        <div class="tags">${clue.tags.map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join('')}</div>
        <p class="slot-text">${escapeHtml(clue.text)}</p>`;
      if (id === 'sunstick') slot.querySelector('.slot-diagram').innerHTML = shadowDiagram(clue.shadow);
    }
  }

  /**
   * Gölge şeması (SVG): üstten bakış, ortada çubuk, gölge yönü ve uzunluğu.
   * Pusula harfleriyle birlikte "gölge kuzeye mi güneye mi?" bir bakışta anlaşılır.
   */
  function shadowDiagram({ length, direction }) {
    const c = 40;
    // Her zaman görünsün diye 5 px taban + 1 m ≈ 12 px (en fazla 24 px, pusula harflerine değmesin)
    const px = Math.min(24, 5 + length * 12);
    const dir = direction === 'N' ? -1 : 1;
    const endY = c + dir * px;
    const head = dir * 5;
    return `
      <svg viewBox="0 0 80 80" width="80" height="80">
        <circle cx="${c}" cy="${c}" r="34" class="d-ring"/>
        <text x="${c}" y="11" class="d-n">K</text>
        <text x="${c}" y="76" class="d-s">G</text>
        <line x1="${c}" y1="${c}" x2="${c}" y2="${endY}" class="d-shadow"/>
        <polygon points="${c - 4},${endY - head} ${c + 4},${endY - head} ${c},${endY + (dir > 0 ? 2 : -2)}" class="d-head"/>
        <circle cx="${c}" cy="${c}" r="4" class="d-stick"/>
      </svg>`;
  }

  /** Metni HTML'e güvenle yazmak için (XSS koruması, iyi alışkanlık) */
  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  }

  GS.GeographerPad = GeographerPad;
})(window.GS = window.GS || {});
