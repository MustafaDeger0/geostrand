/**
 * ============================================================================
 *  GeoStrand — Rakip Kâşifler (Ghosts)
 * ============================================================================
 *  Çevrim içi yarışta diğer oyuncular haritada kendi kâşif görünümleriyle
 *  yürür. Konumları saniyede ~10 kez gelir; aradaki kareler yumuşak geçişle
 *  (lerp) doldurulur, böylece internet yavaş olsa da akıcı görünürler.
 *
 *  • Yarı saydamdırlar (kendi kâşifinle karışmasın) ve çarpışmazlar
 *  • Başlarının üstünde adları yazar; bilenin adının yanında madalya çıkar
 *  • Bağlantısı kopan oyuncu soluklaşır
 * ============================================================================
 */
(function (GS) {
  'use strict';

  const LERP = 12; // saniyede yakınsama hızı (büyük = daha çabuk yetişir)

  class Ghosts {
    constructor(scene) {
      this.scene = scene;
      this.items = new Map(); // oyuncu id → {sprite, label, tx, ty, facing, moving, key}
    }

    /** Oda durumu geldi: yeni oyuncuları ekle, ayrılanları kaldır, etiketleri güncelle */
    sync(players, selfId) {
      const seen = new Set();
      players.forEach((p) => {
        if (p.id === selfId) return;
        seen.add(p.id);
        let g = this.items.get(p.id);
        if (!g) g = this._create(p);
        const medal = p.solved ? ` ${['🥇', '🥈', '🥉'][p.rank - 1] || '✔'}` : '';
        const text = `${p.name}${medal}`;
        if (g.label.text !== text) g.label.setText(text);
        g.sprite.setAlpha(p.connected ? 0.78 : 0.3);
        g.label.setAlpha(p.connected ? 1 : 0.4);
      });
      [...this.items.keys()].forEach((id) => {
        if (!seen.has(id)) this._remove(id);
      });
    }

    /** Sunucudan konum geldi */
    move({ id, x, y, f, m }) {
      const g = this.items.get(id);
      if (!g) return;
      g.tx = x;
      g.ty = y;
      g.facing = f;
      g.moving = m;
      g.lastSeen = performance.now();
    }

    /** Yeni tur: herkes doğuş noktasında */
    resetAll(x, y) {
      this.items.forEach((g) => {
        g.sprite.setPosition(x, y);
        g.tx = x;
        g.ty = y;
        g.moving = false;
      });
    }

    update(dt) {
      const k = Math.min(1, dt * LERP);
      const now = performance.now();
      this.items.forEach((g) => {
        const s = g.sprite;
        s.x += (g.tx - s.x) * k;
        s.y += (g.ty - s.y) * k;
        s.setDepth(s.y);
        g.label.setPosition(s.x, s.y - 46).setDepth(4300);
        // 0,5 sn konum gelmezse durmuş say (ayak sallamasın)
        const moving = g.moving && now - (g.lastSeen || 0) < 500;
        if (moving) s.anims.play(`${g.key}-walk-${g.facing}`, true);
        else if (s.anims.isPlaying) {
          s.anims.stop();
          s.setFrame(`${g.facing}-0`);
        }
      });
    }

    destroy() {
      [...this.items.keys()].forEach((id) => this._remove(id));
    }

    _create(p) {
      const CR = GS.CharacterRenderer;
      const key = CR.buildSpritesheet(this.scene, CR.normalize({ ...p.appearance, name: p.name }));
      const { x, y } = this.scene.spawn;
      const sprite = this.scene.add.sprite(x, y, key, 'down-0').setOrigin(0.5, 0.9).setAlpha(0.78);
      const label = this.scene.add.text(x, y - 46, p.name, {
        fontFamily: 'Atkinson Hyperlegible, Segoe UI, Arial, sans-serif',
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#ffffff',
        backgroundColor: 'rgba(15, 42, 46, 0.75)',
        padding: { x: 5, y: 2 },
      }).setOrigin(0.5, 1);
      const g = { sprite, label, key, tx: x, ty: y, facing: 'down', moving: false, lastSeen: 0 };
      this.items.set(p.id, g);
      return g;
    }

    _remove(id) {
      const g = this.items.get(id);
      if (!g) return;
      g.sprite.destroy();
      g.label.destroy();
      this.items.delete(id);
    }
  }

  GS.Ghosts = Ghosts;
})(window.GS = window.GS || {});
