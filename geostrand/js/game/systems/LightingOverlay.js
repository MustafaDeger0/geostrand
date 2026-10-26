/**
 * ============================================================================
 *  GeoStrand — Işıklandırma Örtüsü (LightingOverlay)
 * ============================================================================
 *  DayNightCycle'ın hesapladığı "karanlık" değerini ekrana uygular:
 *   - Kameranın gördüğü dünya alanını kaplayan lacivert bir RenderTexture,
 *     opaklığı = karanlık
 *   - Gece, oyuncunun etrafından yuvarlak bir "fener ışığı" silinir
 *     (yumuşak kenarlı radyal gradyan dokusu ile)
 *
 *  TAM EKRAN UYUMU: Örtü ekrana değil DÜNYAYA yerleştirilir ve her karede
 *  kameranın baktığı alana taşınır. Böylece kamera yakınlaştırması (zoom)
 *  ne olursa olsun hizası bozulmaz. Pencere boyutu değişince yeniden oluşturulur.
 * ============================================================================
 */
(function (GS) {
  'use strict';

  class LightingOverlay {
    /**
     * @param {Phaser.Scene} scene
     * @param {object} config CONFIG.DAY_NIGHT
     */
    constructor(scene, config) {
      this.scene = scene;
      this.cfg = config;
      this.lantern = scene.make.image({ key: 'light', add: false });
      this.lantern.setScale((config.lanternRadius * 2) / 256);
      this._create();
    }

    /** Kameranın gördüğü alan kadar bir doku oluştur (+ kenar payı) */
    _create() {
      if (this.rt) this.rt.destroy();
      const view = this.scene.cameras.main.worldView;
      const w = Math.ceil(view.width) + 8;
      const h = Math.ceil(view.height) + 8;
      this.rt = this.scene.add.renderTexture(0, 0, w, h).setOrigin(0).setDepth(3900);
      this.size = { w, h };
    }

    /** Pencere boyutu ya da zoom değişince çağrılır */
    resize() {
      this._create();
    }

    /**
     * @param {number} darkness 0–maxDarkness (DayNightCycle.darkness)
     * @param {{x:number, y:number}} player
     */
    update(darkness, player) {
      const view = this.scene.cameras.main.worldView;
      if (Math.ceil(view.width) + 8 !== this.size.w || Math.ceil(view.height) + 8 !== this.size.h) this._create();

      this.rt.clear();
      if (darkness < 0.01) {
        this.rt.setVisible(false);
        return;
      }
      this.rt.setVisible(true);
      this.rt.setPosition(view.x - 4, view.y - 4);
      this.rt.fill(this.cfg.nightColor, darkness);

      // Fener: karanlık arttıkça daha belirgin
      this.lantern.setPosition(player.x - this.rt.x, player.y - this.rt.y);
      this.lantern.setAlpha(Math.min(1, darkness / this.cfg.maxDarkness));
      this.rt.erase(this.lantern);
    }
  }

  GS.LightingOverlay = LightingOverlay;
})(window.GS = window.GS || {});
