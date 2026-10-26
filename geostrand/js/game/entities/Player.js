/**
 * ============================================================================
 *  GeoStrand — Oyuncu (Player)
 * ============================================================================
 *  2D top-down hareket + 4 yönlü yürüme animasyonu:
 *   - WASD veya ok tuşları
 *   - Çapraz harekette hız vektörü normalize edilir
 *     (aksi halde çaprazda √2 ≈ %41 daha hızlı gidilirdi)
 *   - Hangi eksende daha hızlı gidiliyorsa o yöne bakar (aşağı/yukarı/sol/sağ)
 *   - Hareket ederken yürüme animasyonu, dururken duruş karesi
 *   - Görünüm (ten, saç, şapka, ceket, çanta) CharacterRenderer ile çizilir;
 *     setAppearance() ile oyun sırasında değiştirilebilir
 *   - Konum noktası ayaklardadır → derinlik (depth) = y; ağaçların önünden/
 *     arkasından doğru geçer, etkileşim mesafesi ayaktan ölçülür
 * ============================================================================
 */
(function (GS) {
  'use strict';

  class Player extends Phaser.Physics.Arcade.Sprite {
    /**
     * @param {Phaser.Scene} scene
     * @param {number} x
     * @param {number} y
     * @param {object} config CONFIG.PLAYER
     * @param {object} appearance CharacterRenderer görünümü
     */
    constructor(scene, x, y, config, appearance) {
      const key = GS.CharacterRenderer.buildSpritesheet(scene, GS.CharacterRenderer.normalize(appearance));
      super(scene, x, y, key, 'down-0');
      this.cfg = config;
      this.sheetKey = key;
      this.facing = 'down';

      scene.add.existing(this);
      scene.physics.add.existing(this);

      this.setOrigin(0.5, 0.9);      // konum noktası = ayaklar
      this.setCollideWorldBounds(true);
      this.body.setSize(16, 9);       // çarpışma kutusu sadece ayak hizasında
      this.body.setOffset(10, 32);

      // Hem WASD hem ok tuşları
      this.keys = scene.input.keyboard.addKeys({
        up: 'W', down: 'S', left: 'A', right: 'D',
        up2: 'UP', down2: 'DOWN', left2: 'LEFT', right2: 'RIGHT',
      });
    }

    /** Karakter oluşturucuda değişiklik yapılınca yeni görünüme geç */
    setAppearance(appearance) {
      this.sheetKey = GS.CharacterRenderer.buildSpritesheet(this.scene, GS.CharacterRenderer.normalize(appearance));
      this.anims.stop();
      this.setTexture(this.sheetKey, `${this.facing}-0`);
    }

    /**
     * Her karede GameScene tarafından çağrılır.
     * @param {boolean} frozen Pad/menü açıksa veya oyuncu öldüyse true → hareket yok
     */
    tick(frozen) {
      let vx = 0;
      let vy = 0;
      if (!frozen) {
        const k = this.keys;
        vx = (k.right.isDown || k.right2.isDown ? 1 : 0) - (k.left.isDown || k.left2.isDown ? 1 : 0);
        vy = (k.down.isDown || k.down2.isDown ? 1 : 0) - (k.up.isDown || k.up2.isDown ? 1 : 0);
      }

      const length = Math.hypot(vx, vy);
      if (length > 0) {
        vx /= length; // normalize
        vy /= length;
        // Baskın eksene göre yön (çaprazda yatay öncelikli)
        this.facing = Math.abs(vx) >= Math.abs(vy) ? (vx > 0 ? 'right' : 'left') : (vy > 0 ? 'down' : 'up');
        this.anims.play(`${this.sheetKey}-walk-${this.facing}`, true);
      } else if (this.anims.isPlaying) {
        this.anims.stop();
        this.setFrame(`${this.facing}-0`);
      }

      this.setVelocity(vx * this.cfg.speed, vy * this.cfg.speed);
      this.setDepth(this.y);
    }
  }

  GS.Player = Player;
})(window.GS = window.GS || {});
