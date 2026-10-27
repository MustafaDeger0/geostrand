/**
 * ============================================================================
 *  GeoStrand — Karakter Oluşturucu (CharacterCreator)
 * ============================================================================
 *  "Kâşifini hazırla" ekranı. Oyuncu kâşifinin adını, ten rengini, saç modelini
 *  ve rengini, şapkasını, ceket ve çanta rengini seçer; solda canlı önizleme
 *  yürür ve döner (← → ile oyuncu da çevirebilir).
 *
 *  Kullanım:
 *    • İlk oyunda "Göreve başla"dan önce açılır (mode: 'start')
 *    • Başlık ekranındaki "Kâşifi düzenle" ve duraklatma menüsünden (mode: 'edit')
 *  Seçimler tarayıcıda saklanır (HeroStore). Oyun içinde kaydedilince karakter
 *  anında yeni görünüme geçer.
 *
 *  Esc tuşu en üstte açık olan pencereyi kapatır: bu yüzden klavye dinleyicisi
 *  "yakalama" (capture) aşamasında çalışır ve olayın Pad/menüye ulaşmasını engeller.
 * ============================================================================
 */
(function (GS) {
  'use strict';

  const STORE_KEY = 'geostrand-hero';

  /** Kâşif görünümünü tarayıcıda sakla / oku */
  const HeroStore = {
    load() {
      try {
        const raw = window.localStorage.getItem(STORE_KEY);
        return raw ? GS.CharacterRenderer.normalize(JSON.parse(raw)) : null;
      } catch (e) {
        return null;
      }
    },
    save(appearance) {
      try {
        window.localStorage.setItem(STORE_KEY, JSON.stringify(appearance));
      } catch (e) {
        /* depolama kapalı: yalnızca bu oturumda geçerli */
      }
    },
  };

  const DIR_CYCLE = ['down', 'right', 'up', 'left'];

  /** Seçenek satırları: [görünüm alanı, başlık, tür] */
  const ROWS = [
    ['skin', 'Ten rengi', 'swatch'],
    ['hairStyle', 'Saç modeli', 'chip'],
    ['hairColor', 'Saç rengi', 'swatch'],
    ['hat', 'Şapka', 'chip'],
    ['jacket', 'Ceket', 'swatch'],
    ['pack', 'Sırt çantası', 'swatch'],
  ];

  class CharacterCreator {
    constructor(doc) {
      this.doc = doc;
      this.isOpen = false;
      const $ = (id) => doc.getElementById(id);
      this.el = {
        root: $('creator'),
        title: $('creator-title'),
        canvas: $('creator-preview'),
        name: $('creator-name'),
        options: $('creator-options'),
        random: $('creator-random'),
        save: $('creator-save'),
        cancel: $('creator-cancel'),
        rotL: $('creator-rot-left'),
        rotR: $('creator-rot-right'),
      };
      this.appearance = HeroStore.load() || GS.CharacterRenderer.normalize();
      this._buildOptions();
      this._bind();
    }

    /** Kayıtlı (ya da varsayılan) görünüm */
    get current() {
      return HeroStore.load() || GS.CharacterRenderer.normalize();
    }

    get hasSaved() {
      return !!HeroStore.load();
    }

    /**
     * @param {{mode:'start'|'edit', onSave?:Function, onClose?:Function}} opts
     */
    open({ mode = 'edit', onSave, onClose } = {}) {
      this.mode = mode;
      this.onSave = onSave;
      this.onClose = onClose;
      this.appearance = { ...this.current };
      this.el.title.textContent = mode === 'start' ? 'Kâşifini hazırla' : 'Kâşifini düzenle';
      this.el.save.textContent = mode === 'start' ? 'Göreve çık' : 'Kaydet';
      this.el.cancel.textContent = mode === 'start' ? 'Geri' : 'Vazgeç';
      this._syncControls();
      this.el.root.classList.remove('hidden');
      this.isOpen = true;
      this.dirIndex = 0;
      this.manualDir = false;
      this._startPreview();
      this.el.name.focus();
    }

    close(saved = false) {
      if (!this.isOpen) return;
      this.isOpen = false;
      this.el.root.classList.add('hidden');
      cancelAnimationFrame(this.raf);
      if (saved && this.onSave) this.onSave(this.appearance);
      if (this.onClose) this.onClose(saved);
    }

    // ------------------------------------------------------------------ //
    //  Seçenekler
    // ------------------------------------------------------------------ //
    _buildOptions() {
      const O = GS.CharacterRenderer.OPTIONS;
      this.el.options.innerHTML = ROWS.map(([field, label, kind]) => {
        const items = O[field].map((opt, i) => {
          const value = typeof opt === 'string' ? opt : opt.key;
          const text = typeof opt === 'string' ? '' : opt.label;
          const id = `hero-${field}-${i}`;
          const inner = kind === 'swatch'
            ? `<span class="swatch" style="--c:${value}"></span>`
            : `<span class="chip">${text}</span>`;
          const aria = kind === 'swatch' ? ` aria-label="${label} ${i + 1}"` : '';
          return `<label class="opt" for="${id}"><input type="radio" id="${id}" name="hero-${field}" value="${value}"${aria}>${inner}</label>`;
        }).join('');
        return `<fieldset class="opt-row"><legend>${label}</legend><div class="opt-list ${kind}s">${items}</div></fieldset>`;
      }).join('');
    }

    _syncControls() {
      const a = this.appearance;
      this.el.name.value = a.name;
      ROWS.forEach(([field]) => {
        const input = this.el.options.querySelector(`input[name="hero-${field}"][value="${a[field]}"]`);
        if (input) input.checked = true;
      });
    }

    _bind() {
      this.el.options.addEventListener('change', (e) => {
        const field = e.target.name.replace('hero-', '');
        this.appearance[field] = e.target.value;
      });
      this.el.name.addEventListener('input', () => {
        this.appearance.name = this.el.name.value.trim().slice(0, 14) || 'Dr. Geo';
      });
      this.el.random.addEventListener('click', () => {
        this.appearance = { ...GS.CharacterRenderer.randomAppearance(), name: this.appearance.name };
        this._syncControls();
      });
      this.el.save.addEventListener('click', () => {
        HeroStore.save(this.appearance);
        this.close(true);
      });
      this.el.cancel.addEventListener('click', () => this.close(false));
      this.el.rotL.addEventListener('click', () => this._rotate(-1));
      this.el.rotR.addEventListener('click', () => this._rotate(1));
      // Yakalama aşaması: Esc yalnızca bu pencereyi kapatsın
      window.addEventListener('keydown', (e) => {
        if (!this.isOpen) return;
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          this.close(false);
        } else if (e.key === 'Enter' && e.target.tagName !== 'BUTTON') {
          e.preventDefault();
          e.stopPropagation();
          this.el.save.click();
        } else {
          e.stopPropagation(); // oyun tuşları (WASD, P, M…) burada çalışmasın
        }
      }, true);
    }

    _rotate(delta) {
      this.manualDir = true;
      this.dirIndex = (this.dirIndex + delta + DIR_CYCLE.length) % DIR_CYCLE.length;
    }

    // ------------------------------------------------------------------ //
    //  Canlı önizleme: yürür, 2,4 sn'de bir döner (elle çevrilmediyse)
    // ------------------------------------------------------------------ //
    _startPreview() {
      const ctx = this.el.canvas.getContext('2d');
      const R = GS.CharacterRenderer;
      const scale = this.el.canvas.width / R.W;
      const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      let last = performance.now();
      let frameTime = 0;
      let turnTime = 0;
      let frame = 0;

      const loop = (now) => {
        const dt = (now - last) / 1000;
        last = now;
        frameTime += dt;
        turnTime += dt;
        if (!reduceMotion && frameTime > 0.14) {
          frame = (frame + 1) % R.FRAMES;
          frameTime = 0;
        }
        if (!this.manualDir && !reduceMotion && turnTime > 2.4) {
          this.dirIndex = (this.dirIndex + 1) % DIR_CYCLE.length;
          turnTime = 0;
        }
        ctx.clearRect(0, 0, this.el.canvas.width, this.el.canvas.height);
        ctx.save();
        ctx.scale(scale, scale);
        R.drawFrame(ctx, R.normalize(this.appearance), DIR_CYCLE[this.dirIndex], frame, 0, 0);
        ctx.restore();
        if (this.isOpen) this.raf = requestAnimationFrame(loop);
      };
      this.raf = requestAnimationFrame(loop);
    }
  }

  GS.CharacterCreator = CharacterCreator;
  GS.HeroStore = HeroStore;
})(window.GS = window.GS || {});
