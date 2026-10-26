/**
 * ============================================================================
 *  GeoStrand — Etkileşim Sistemi (InteractionSystem)
 * ============================================================================
 *  Her karede:
 *   1) Oyuncuya en yakın, menzil içindeki nesneyi bulur.
 *   2) Üstünde "[E] Ağacı incele" gibi bir ipucu balonu gösterir.
 *   3) E tuşuna basılırsa INTERACT olayını yayar.
 *  Olayı kimin dinlediğini bilmez (GameScene dinler ve Pad'i açar).
 * ============================================================================
 */
(function (GS) {
  'use strict';

  class InteractionSystem {
    /**
     * @param {Phaser.Scene} scene
     * @param {GS.Player} player
     * @param {GS.EventBus} bus
     * @param {number} range Etkileşim mesafesi (px)
     */
    constructor(scene, player, bus, range) {
      this.scene = scene;
      this.player = player;
      this.bus = bus;
      this.range = range;
      this.targets = [];
      this.focused = null;

      this.key = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);

      this.promptText = scene.add
        .text(0, 0, '', {
          fontFamily: 'Atkinson Hyperlegible, Segoe UI, Arial, sans-serif',
          fontSize: '14px',
          color: '#ffffff',
          backgroundColor: 'rgba(15, 42, 46, 0.92)',
          padding: { x: 8, y: 4 },
        })
        .setOrigin(0.5, 1)
        .setDepth(4500)
        .setVisible(false);
    }

    /** Yeni konuma geçildiğinde hedef listesi değişir */
    setTargets(interactables) {
      this.targets = interactables;
      this._setFocus(null);
    }

    /** @param {boolean} enabled Pad açıksa false gelir */
    update(enabled) {
      if (!enabled) {
        this._setFocus(null);
        return;
      }

      // 1) En yakın nesne
      let nearest = null;
      let nearestDist = this.range;
      for (const obj of this.targets) {
        if (obj.type === 'crate' && obj.inspected) continue; // açılmış sandık artık etkileşimsiz
        // Mesafe nesnenin "taban" noktasından ölçülür (ağaç gövdesi gibi)
        const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, obj.x, obj.y + obj.displayHeight * 0.25);
        if (d <= nearestDist) {
          nearest = obj;
          nearestDist = d;
        }
      }
      this._setFocus(nearest);

      // 3) E tuşu
      if (nearest && Phaser.Input.Keyboard.JustDown(this.key)) {
        this.bus.emit(GS.EVENTS.INTERACT, nearest);
      }
    }

    _setFocus(obj) {
      if (this.focused && this.focused !== obj && this.focused.active) this.focused.setHighlighted(false);
      this.focused = obj;

      if (!obj) {
        this.promptText.setVisible(false);
        return;
      }
      // 2) İpucu balonu
      obj.setHighlighted(true);
      this.promptText
        .setText(`E · ${obj.prompt}`)
        .setPosition(obj.x, obj.y - obj.displayHeight / 2 - 30)
        .setVisible(true);
    }
  }

  GS.InteractionSystem = InteractionSystem;
})(window.GS = window.GS || {});
