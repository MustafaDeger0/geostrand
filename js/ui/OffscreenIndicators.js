/**
 * ============================================================================
 *  GeoStrand — Ekran Dışı Göstergeler (OffscreenIndicators)
 * ============================================================================
 *  Henüz incelenmemiş bir ipucu nesnesi ekranın dışındaysa, ekranın kenarında
 *  o yöne bakan sarı bir ok ve nesnenin simgesi (🌳 / 🟫 / 📏) gösterir.
 *  Büyük haritada oyuncu "nereye gideceğim?" diye kaybolmaz.
 *  Yalnız ilk bölgelerde açıktır (CONFIG.GUIDE_ARROWS); sonra ve çevrim içi yarışta
 *  ipuçlarını oyuncu kendisi keşfeder.
 *
 *  Hesap: dünya koordinatı → ekran koordinatı
 *    ekranX = (nesne.x − kamera.görünürAlan.x) × zoom
 *  Ekran dışındaysa nokta, ekran merkezinden nesneye giden doğrunun kenarı
 *  kestiği yere kenetlenir; ok o doğrunun açısına döner.
 * ============================================================================
 */
(function (GS) {
  'use strict';

  const ICONS = { tree: '🌳', soil: '🟫', sunstick: '📏', altimeter: '📡', fauna: '🐾' };
  const MARGIN = 48;          // kenardan uzaklık (px)
  const TOP_RESERVED = 110;   // üst panellerin altında kalsın
  const BOTTOM_RESERVED = 96; // alt çubukların üstünde kalsın

  class OffscreenIndicators {
    constructor(doc) {
      this.doc = doc;
      this.root = doc.getElementById('indicators');
      this.items = new Map(); // nesne → DOM öğesi
    }

    /** Yeni bölgede eski okları temizle */
    clear() {
      this.items.forEach((el) => el.remove());
      this.items.clear();
    }

    /**
     * @param {Phaser.Cameras.Scene2D.Camera} cam
     * @param {object[]} targets interactables
     * @param {boolean} visible Pad/menü açıkken gizle
     */
    update(cam, targets, visible) {
      const w = cam.width;
      const h = cam.height;
      const view = cam.worldView;

      targets.forEach((obj) => {
        let el = this.items.get(obj);
        const sx = (obj.x - view.x) * cam.zoom;
        const sy = (obj.y - view.y) * cam.zoom;
        const onScreen = sx > 0 && sx < w && sy > 0 && sy < h;

        if (!visible || obj.inspected || onScreen || !obj.active) {
          if (el) el.style.display = 'none';
          return;
        }
        if (!el) {
          el = this.doc.createElement('div');
          el.className = 'indicator';
          el.innerHTML = `${ICONS[obj.type] || '?'}<i></i>`;
          this.root.appendChild(el);
          this.items.set(obj, el);
        }

        // Merkezden nesneye doğru → ekran kenarına kenetle
        const cx = w / 2;
        const cy = h / 2;
        const dx = sx - cx;
        const dy = sy - cy;
        const halfW = cx - MARGIN;
        const halfH = dy < 0 ? cy - TOP_RESERVED : h - cy - BOTTOM_RESERVED;
        const scale = Math.min(halfW / Math.abs(dx || 1e-6), halfH / Math.abs(dy || 1e-6));
        el.style.display = '';
        el.style.left = `${cx + dx * scale}px`;
        el.style.top = `${cy + dy * scale}px`;
        el.style.setProperty('--angle', `${Math.atan2(dy, dx)}rad`);
      });
    }

    destroy() {
      this.clear();
    }
  }

  GS.OffscreenIndicators = OffscreenIndicators;
})(window.GS = window.GS || {});
