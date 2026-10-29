/**
 * ============================================================================
 *  GeoStrand — Işıklandırma Örtüsü (LightingOverlay)
 * ============================================================================
 *  DayNightCycle'ın hesapladığı "karanlık" değerini ekrana uygular:
 *   - Kameranın gördüğü alanı kaplayan lacivert bir örtü, opaklığı = karanlık
 *   - Gece, oyuncunun etrafında yuvarlak bir "fener ışığı" (yumuşak kenarlı)
 *
 *  NASIL ÇİZİLİR? (performans için)
 *  Eskiden her karede ekran boyunda bir RenderTexture temizlenip boyanıyor ve
 *  fener oradan siliniyordu: her kare ekstra bir tam ekran çizim geçişi demekti,
 *  akşam ve gece zayıf cihazlarda kasma yapıyordu. Şimdi örtü 6 basit parçadır:
 *
 *     ┌───────── üst ─────────┐
 *     │ sol │  ( fener ) │ sağ│   "fener": ortası saydam, kenarı opak doku
 *     └───────── alt ─────────┘   + altında tüm alanı kaplayan ince bir taban
 *
 *  Taban (b) ve fener katmanı (c) üst üste binince fenerin dışında toplam
 *  opaklık tam "karanlık" kadar olur:  1 − (1 − b)(1 − c) = karanlık
 *  Fener alacakaranlıkta hafif, tam gecede belirgindir (eski davranışla aynı).
 *
 *  Örtü DÜNYAYA yerleştirilir ve her karede kameranın baktığı alana taşınır;
 *  kamera yakınlaştırması ne olursa olsun hizası bozulmaz.
 * ============================================================================
 */
(function (GS) {
  'use strict';

  const DEPTH = 3900;
  const PAD = 96; // kamera hızlı kaysa da kenarda aydınlık şerit açılmasın

  class LightingOverlay {
    /**
     * @param {Phaser.Scene} scene
     * @param {object} config CONFIG.DAY_NIGHT
     */
    constructor(scene, config) {
      this.scene = scene;
      this.cfg = config;
      this.radius = config.lanternRadius;
      const color = config.nightColor;
      const rect = () => scene.add.rectangle(0, 0, 1, 1, color, 1).setOrigin(0).setDepth(DEPTH);
      this.base = rect();
      this.sides = [rect(), rect(), rect(), rect()]; // üst, alt, sol, sağ
      this.hole = scene.add.image(0, 0, 'lantern_hole').setOrigin(0).setTint(color).setDepth(DEPTH)
        .setDisplaySize(this.radius * 2, this.radius * 2);
      this.parts = [this.base, ...this.sides, this.hole];
      this._setVisible(false);
    }

    /** Eski API ile uyum (pencere boyutu değişince ayrıca bir şey gerekmez) */
    resize() {}

    _setVisible(v) {
      if (this.visible === v) return;
      this.visible = v;
      this.parts.forEach((p) => p.setVisible(v));
    }

    /**
     * @param {number} darkness 0–maxDarkness (DayNightCycle.darkness)
     * @param {{x:number, y:number}} player
     */
    update(darkness, player) {
      if (darkness < 0.01) {
        this._setVisible(false);
        return;
      }
      this._setVisible(true);

      const view = this.scene.cameras.main.worldView;
      const x = Math.floor(view.x) - PAD;
      const y = Math.floor(view.y) - PAD;
      const w = Math.ceil(view.width) + PAD * 2;
      const h = Math.ceil(view.height) + PAD * 2;

      // Opaklıklar: fener gücü k (alacakaranlıkta az, gecede tam)
      const k = Math.min(1, darkness / this.cfg.maxDarkness);
      const b = darkness * (1 - k);
      const c = 1 - (1 - darkness) / (1 - b);

      this.base.setPosition(x, y).setSize(w, h).setFillStyle(this.cfg.nightColor, b);
      this.base.setVisible(b > 0.002);

      // Fener karesi (oyuncunun ortasında) + çevresindeki dört dikdörtgen
      const D = this.radius * 2;
      const hx = Math.round(player.x - this.radius);
      const hy = Math.round(player.y - this.radius);
      this.hole.setPosition(hx, hy).setAlpha(c);
      const [top, bottom, left, right] = this.sides;
      const clampW = (v) => Math.max(0, v);
      top.setPosition(x, y).setSize(w, clampW(hy - y));
      bottom.setPosition(x, hy + D).setSize(w, clampW(y + h - (hy + D)));
      left.setPosition(x, hy).setSize(clampW(hx - x), D);
      right.setPosition(hx + D, hy).setSize(clampW(x + w - (hx + D)), D);
      this.sides.forEach((r) => r.setFillStyle(this.cfg.nightColor, c));
    }

    destroy() {
      this.parts.forEach((p) => p.destroy());
    }
  }

  GS.LightingOverlay = LightingOverlay;
})(window.GS = window.GS || {});
