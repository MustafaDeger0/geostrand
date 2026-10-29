/**
 * ============================================================================
 *  GeoStrand — Etkileşim Sistemi (InteractionSystem)
 * ============================================================================
 *  Her karede:
 *   1) Oyuncuya en yakın, menzil içindeki nesneyi bulur.
 *   2) Üstünde "[E] Ağacı incele" gibi bir ipucu balonu gösterir.
 *   3) E tuşuna basılırsa (ya da telefonda "İncele" düğmesine / nesneye
 *      dokunulursa: trigger()) INTERACT olayını yayar.
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

      // E tuşu OLAYLA dinlenir: kare beklenmez. (Kare başına "az önce basıldı mı?" bakmak,
      // yavaş cihazda basma ve bırakma aynı kareye düşünce tuşu kaçırıyordu.)
      this.enabled = false;
      scene.input.keyboard.on('keydown-E', () => {
        if (this.enabled) this.trigger();
      });

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
      this.enabled = enabled;
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
      // 3) E tuşu: yukarıdaki olay dinleyicisi trigger() çağırır
    }

    /** Dokunmatik "İncele" düğmesi: odaktaki nesneyi incele */
    trigger() {
      if (this.focused) this.bus.emit(GS.EVENTS.INTERACT, this.focused);
    }

    /** Odak değişince haber ver (HUD'daki İncele düğmesi için) */
    onFocusChange(fn) {
      this._focusListener = fn;
    }

    _setFocus(obj) {
      if (obj !== this.focused && this._focusListener) this._focusListener(obj);
      if (this.focused && this.focused !== obj && this.focused.active) this.focused.setHighlighted(false);
      this.focused = obj;

      if (!obj) {
        this.promptText.setVisible(false);
        return;
      }
      // 2) İpucu balonu
      obj.setHighlighted(true);
      this.promptText
        .setText(GS.Device.touch ? `👆 ${obj.prompt}` : `E · ${obj.prompt}`)
        .setPosition(obj.x, obj.y - obj.displayHeight / 2 - 30)
        .setVisible(true);
    }
  }

  GS.InteractionSystem = InteractionSystem;
})(window.GS = window.GS || {});
