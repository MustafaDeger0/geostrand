/**
 * ============================================================================
 *  GeoStrand — Duraklatma Menüsü (PauseMenu)
 * ============================================================================
 *  Esc (Pad kapalıyken) ya da ☰ düğmesiyle açılır; oyun tamamen durur.
 *    • Devam et
 *    • Ses: Müzik / Doğa sesleri / Efektler / Ana ses kaydırıcıları
 *      (değerler tarayıcıda hatırlanır)
 *    • Rehber (nasıl oynanır, iklimler, yer şekilleri, kıtalar, hava olayları)
 *    • Kâşifi düzenle (karakter oluşturucu)
 *    • Tam ekran · Baştan başla (yanlışlıkla basılmasın diye iki kez onay ister)
 *
 *  Oyun kuralı içermez: seçimler EventBus olayı olarak yayılır.
 * ============================================================================
 */
(function (GS) {
  'use strict';

  class PauseMenu {
    /**
     * @param {{bus: GS.EventBus, doc: Document, audioSettings: object}} deps
     */
    constructor({ bus, doc, audioSettings }) {
      this.bus = bus;
      this.doc = doc;
      this.isOpen = false;
      const $ = (id) => doc.getElementById(id);
      this.el = {
        root: $('menu'),
        resume: $('menu-resume'),
        full: $('menu-full'),
        guide: $('menu-guide'),
        hero: $('menu-hero'),
        restart: $('menu-restart'),
        sliders: [...doc.querySelectorAll('#menu .slider input')],
      };

      this._listeners = [];
      const on = (target, type, fn) => {
        target.addEventListener(type, fn);
        this._listeners.push([target, type, fn]);
      };
      const E = GS.EVENTS;

      on(this.el.resume, 'click', () => this.close());
      on(this.el.full, 'click', () => bus.emit(E.UI_FULLSCREEN));
      on(this.el.guide, 'click', () => bus.emit(E.UI_GUIDE, 'play'));
      on(this.el.hero, 'click', () => bus.emit(E.UI_EDIT_HERO));
      on(this.el.restart, 'click', () => this._confirmRestart());
      on(this.el.root, 'mousedown', (e) => {
        if (e.target === this.el.root) this.close();
      });
      on(doc, 'keydown', (e) => {
        if (this.isOpen && e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation(); // Phaser aynı tuşla menüyü yeniden açmasın
          this.close();
        }
      });

      // Ses kaydırıcıları
      this.el.sliders.forEach((input) => {
        const channel = input.dataset.channel;
        input.value = Math.round((audioSettings[channel] ?? 0.5) * 100);
        this._showValue(input);
        on(input, 'input', () => {
          this._showValue(input);
          bus.emit(E.VOLUME_CHANGED, { channel, value: input.value / 100 });
        });
      });
    }

    open() {
      if (this.isOpen) return;
      this.isOpen = true;
      this._resetRestart();
      this.el.root.classList.remove('hidden');
      this.el.resume.focus();
      this.bus.emit(GS.EVENTS.MENU_OPENED);
    }

    close() {
      if (!this.isOpen) return;
      this.isOpen = false;
      this.el.root.classList.add('hidden');
      if (this.doc.activeElement) this.doc.activeElement.blur();
      this.bus.emit(GS.EVENTS.MENU_CLOSED);
    }

    destroy() {
      this._listeners.forEach(([t, type, fn]) => t.removeEventListener(type, fn));
      this._listeners = [];
      this.isOpen = false;
      this.el.root.classList.add('hidden');
    }

    // ------------------------------------------------------------------ //
    _showValue(input) {
      input.nextElementSibling.textContent = input.value;
    }

    /** İlk tıklamada onay ister, ikincisinde baştan başlatır */
    _confirmRestart() {
      const btn = this.el.restart;
      if (btn.classList.contains('confirm')) {
        this.close();
        this.bus.emit(GS.EVENTS.RESTART);
        return;
      }
      btn.classList.add('confirm');
      btn.textContent = 'Emin misin? Tekrar bas';
      this._restartTimer = setTimeout(() => this._resetRestart(), 3000);
    }

    _resetRestart() {
      clearTimeout(this._restartTimer);
      this.el.restart.classList.remove('confirm');
      this.el.restart.textContent = '↺ Baştan başla';
    }
  }

  GS.PauseMenu = PauseMenu;
})(window.GS = window.GS || {});
