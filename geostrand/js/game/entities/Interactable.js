/**
 * ============================================================================
 *  GeoStrand — Etkileşimli Nesne (Interactable)
 * ============================================================================
 *  Haritada E tuşuyla incelenebilen nesneler: ağaç, toprak, güneş çubuğu.
 *  Her nesne bir ipucu (clue) taşır. Henüz incelenmemiş nesnelerin üstünde
 *  zıplayan sarı bir "?" işareti durur; incelenince yeşil "✓" olur.
 *
 *  Yeni bir nesne türü eklemek için: WorldBuilder'da yeni bir Interactable
 *  oluşturup ona `type`, `prompt` ve `clue` vermeniz yeterli.
 * ============================================================================
 */
(function (GS) {
  'use strict';

  class Interactable extends Phaser.GameObjects.Image {
    /**
     * @param {Phaser.Scene} scene
     * @param {number} x
     * @param {number} y
     * @param {{type:string, texture:string, prompt:string, clue:object|null, tint?:number,
     *          marker?:{text:string, color:string}}} options
     *   marker: üstteki işaretin metni/rengi (ipuçları "?" sarı, sandıklar "!" turuncu)
     */
    constructor(scene, x, y, { type, texture, prompt, clue, tint, marker }) {
      super(scene, x, y, texture);
      scene.add.existing(this);

      this.type = type;       // 'tree' | 'soil' | 'sunstick' | 'altimeter' | 'fauna' | 'crate'
      this.prompt = prompt;   // Yakınlaşınca gösterilecek eylem metni
      this.clue = clue;       // ClueFactory'den gelen {id, icon, title, text}
      this.inspected = false;

      if (tint !== undefined) this.setTint(tint);
      // Toprak ve izler yerde yatar: her şeyin altında çizilsin. Diğerleri y'ye göre sıralanır.
      this.setDepth(type === 'soil' || type === 'fauna' ? 1 : y);

      this._createMarker(scene, marker || { text: '?', color: '#ffd23f' });
    }

    /** Nesnenin üstünde zıplayan "?" işareti */
    _createMarker(scene, { text, color }) {
      this.marker = scene.add
        .text(this.x, this.y - this.displayHeight / 2 - 14, text, {
          fontFamily: 'Bricolage Grotesque, Arial Black, sans-serif',
          fontSize: '18px',
          color: '#1b1b1b',
          backgroundColor: color,
          padding: { x: 7, y: 1 },
        })
        .setOrigin(0.5)
        .setDepth(4000);

      this.markerTween = scene.tweens.add({
        targets: this.marker,
        y: this.marker.y - 6,
        duration: 600,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    /** Oyuncu yaklaştığında hafif parlama */
    setHighlighted(on) {
      if (this.type === 'soil') this.setAlpha(on ? 1 : 0.92);
      this.setScale(on ? 1.06 : 1);
    }

    /** İlk inceleme: işaret "✓" olur ve yavaşça kaybolur */
    markInspected() {
      if (this.inspected) return;
      this.inspected = true;
      this.markerTween.stop();
      this.marker.setText('✓').setBackgroundColor('#43c463');
      this.scene.tweens.add({ targets: this.marker, alpha: 0.35, duration: 800 });
    }

    /** Nesne silinirken işaretini de sil (bellek sızıntısı önlenir) */
    destroy(fromScene) {
      if (this.markerTween) {
        this.markerTween.remove();
        this.markerTween = null;
      }
      if (this.marker) {
        this.marker.destroy();
        this.marker = null;
      }
      super.destroy(fromScene);
    }
  }

  GS.Interactable = Interactable;
})(window.GS = window.GS || {});
